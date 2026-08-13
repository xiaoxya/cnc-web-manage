import { getTokenFromCookies, verifyToken } from "$lib/server/auth";
import { prisma } from "$lib/server/db";
import { statusLabels } from "$lib/utils";
import type { Prisma } from "@prisma/client";
import ExcelJS from "exceljs";
import type { RequestHandler } from "./$types";

const STATUS_VALUES = new Set(["IN_STOCK", "IN_USE", "MAINTENANCE", "SCRAPPED"]);

function positiveInteger(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export const GET: RequestHandler = async ({ request, url }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return new Response("未登录", { status: 401 });

  try {
    verifyToken(token);

    const search = url.searchParams.get("search")?.trim() || "";
    const categoryId = positiveInteger(url.searchParams.get("categoryId"));
    const locationId = positiveInteger(url.searchParams.get("locationId"));
    const statusParam = url.searchParams.get("status") || "";
    const status = STATUS_VALUES.has(statusParam) ? statusParam : undefined;

    const where: Prisma.ToolWhereInput = {};
    if (search) {
      where.OR = [
        { toolCode: { contains: search } },
        { name: { contains: search } },
        { specification: { contains: search } },
      ];
    }
    if (categoryId) where.categoryId = categoryId;
    if (locationId) where.locationId = locationId;
    if (status) where.status = status;

    const tools = await prisma.tool.findMany({
      where,
      include: { category: true, location: true },
      orderBy: [{ toolCode: "asc" }, { createdAt: "asc" }],
    });

    const inUseToolIds = tools.filter((tool) => tool.status === "IN_USE").map((tool) => tool.id);
    const factoryByToolId = new Map<number, string>();

    if (inUseToolIds.length > 0) {
      const outboundTransactions = await prisma.toolTransaction.findMany({
        where: {
          toolId: { in: inUseToolIds },
          type: "OUT",
          factoryId: { not: null },
        },
        select: {
          toolId: true,
          createdAt: true,
          factory: { select: { code: true, name: true } },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      });

      for (const transaction of outboundTransactions) {
        if (!factoryByToolId.has(transaction.toolId) && transaction.factory) {
          factoryByToolId.set(
            transaction.toolId,
            `${transaction.factory.code} - ${transaction.factory.name}`,
          );
        }
      }
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "CNC刀具管理系统";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("刀具台账", {
      views: [{ state: "frozen", ySplit: 3 }],
      pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });

    const headers = [
      "序号", "刀具编码", "刀具名称", "分类", "规格型号", "材质", "品牌", "库位",
      "库存数量", "最低库存", "单位", "单价", "状态", "所在工厂", "维修次数",
      "备注", "建档时间", "更新时间",
    ];

    worksheet.mergeCells(1, 1, 1, headers.length);
    const titleCell = worksheet.getCell(1, 1);
    titleCell.value = "刀具台账";
    titleCell.font = { name: "微软雅黑", size: 16, bold: true };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    worksheet.getRow(1).height = 34;

    worksheet.mergeCells(2, 1, 2, headers.length);
    const summaryCell = worksheet.getCell(2, 1);
    summaryCell.value = `导出时间：${formatDate(new Date())}    共 ${tools.length} 条`;
    summaryCell.font = { name: "微软雅黑", size: 10, color: { argb: "FF475569" } };
    summaryCell.alignment = { horizontal: "right", vertical: "middle" };
    worksheet.getRow(2).height = 22;

    const headerRow = worksheet.addRow(headers);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.font = { name: "微软雅黑", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin", color: { argb: "FFCBD5E1" } },
        bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
        left: { style: "thin", color: { argb: "FFCBD5E1" } },
        right: { style: "thin", color: { argb: "FFCBD5E1" } },
      };
    });

    for (const [index, tool] of tools.entries()) {
      const price = tool.price === null || tool.price === "" ? "" : Number(tool.price);
      const row = worksheet.addRow([
        index + 1,
        tool.toolCode,
        tool.name,
        tool.category?.name || "",
        tool.specification || "",
        tool.material || "",
        tool.brand || "",
        tool.location ? `${tool.location.code} - ${tool.location.name}` : "",
        tool.status === "SCRAPPED" ? 0 : tool.quantity,
        tool.minQuantity,
        tool.unit,
        Number.isFinite(price) ? price : tool.price || "",
        statusLabels[tool.status] || tool.status,
        tool.status === "IN_USE" ? factoryByToolId.get(tool.id) || "" : "",
        tool.maintenanceCount,
        tool.notes || "",
        formatDate(tool.createdAt),
        formatDate(tool.updatedAt),
      ]);

      row.height = 22;
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.font = { name: "微软雅黑", size: 10 };
        cell.alignment = { vertical: "middle", wrapText: true };
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
      });
      row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(9).alignment = { horizontal: "right", vertical: "middle" };
      row.getCell(10).alignment = { horizontal: "right", vertical: "middle" };
      row.getCell(12).numFmt = "¥#,##0.00";
      row.getCell(15).alignment = { horizontal: "right", vertical: "middle" };
      if (index % 2 === 1) {
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
        });
      }
      if (tool.quantity <= tool.minQuantity && tool.status !== "SCRAPPED") {
        row.getCell(9).font = { name: "微软雅黑", size: 10, bold: true, color: { argb: "FFDC2626" } };
      }
    }

    worksheet.columns = [
      { width: 8 }, { width: 16 }, { width: 20 }, { width: 14 }, { width: 18 }, { width: 14 },
      { width: 14 }, { width: 20 }, { width: 12 }, { width: 12 }, { width: 9 }, { width: 12 },
      { width: 12 }, { width: 22 }, { width: 12 }, { width: 28 }, { width: 20 }, { width: 20 },
    ];
    worksheet.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: headers.length } };

    const buffer = await workbook.xlsx.writeBuffer();
    const date = new Date().toISOString().slice(0, 10);
    const filename = `刀具台账_${date}.xlsx`;

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="tool-ledger_${date}.xlsx"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Export tool ledger error:", error);
    return new Response("导出刀具台账失败", { status: 500 });
  }
};
