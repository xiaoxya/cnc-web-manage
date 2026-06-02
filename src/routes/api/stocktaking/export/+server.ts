import { getTokenFromCookies, verifyToken } from "$lib/server/auth";
import { prisma } from "$lib/server/db";
import type { RequestHandler } from "./$types";
import ExcelJS from "exceljs";

export const GET: RequestHandler = async ({ request, url }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return new Response("未登录", { status: 401 });
  try {
    verifyToken(token);

    const idsParam = url.searchParams.get("ids");
    const where: Record<string, unknown> = {};
    if (idsParam) {
      const ids = idsParam.split(",").map(Number).filter((n) => n > 0);
      if (ids.length > 0) where.id = { in: ids };
    }

    const stocktakings = await prisma.stocktaking.findMany({
      where,
      include: {
        operator: { select: { displayName: true } },
        factory: { select: { code: true, name: true } },
        items: {
          include: { tool: { select: { toolCode: true, name: true, specification: true } } },
          orderBy: { id: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const wb = new ExcelJS.Workbook();
    wb.creator = "CNC刀具管理系统";
    wb.created = new Date();

    const ws = wb.addWorksheet("盘点数据");

    // Title row
    ws.mergeCells("A1:M1");
    const titleCell = ws.getCell("A1");
    titleCell.value = "盘点数据报表";
    titleCell.font = { name: "微软雅黑", size: 16, bold: true };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(1).height = 36;

    // Header row
    const headers = ["盘点单号", "工厂", "状态", "盘点人",
      "刀具编码", "刀具名称", "规格",
      "账面数量", "实盘数量", "差异",
      "备注", "创建时间", "完成时间"];

    const headerRow = ws.addRow(headers);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.font = { name: "微软雅黑", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin" }, bottom: { style: "thin" },
        left: { style: "thin" }, right: { style: "thin" },
      };
    });

    // Data rows
    for (const st of stocktakings) {
      const factoryName = st.factory ? `${st.factory.code} ${st.factory.name}` : "";
      const status = st.status === "IN_PROGRESS" ? "进行中" : "已完成";
      const operator = st.operator?.displayName || "";
      const createdAt = st.createdAt ? new Date(st.createdAt).toLocaleString("zh-CN") : "";
      const completedAt = st.completedAt ? new Date(st.completedAt).toLocaleString("zh-CN") : "";

      if (st.items.length === 0) {
        const row = ws.addRow([st.stocktakingNo, factoryName, status, operator, "", "", "", "", "", "", "", createdAt, completedAt]);
        styleRow(row);
      } else {
        for (const item of st.items) {
          const diff = item.actualQuantity - item.expectedQuantity;
          const row = ws.addRow([
            st.stocktakingNo, factoryName, status, operator,
            item.tool?.toolCode || "", item.tool?.name || "", item.tool?.specification || "",
            item.expectedQuantity, item.actualQuantity, diff,
            item.notes || "", createdAt, completedAt,
          ]);
          styleRow(row);
          if (diff !== 0) {
            row.getCell(10).font = { color: { argb: "FFDC2626" }, bold: true };
          }
        }
      }
    }

    ws.columns = [
      { width: 20 }, { width: 16 }, { width: 10 }, { width: 12 },
      { width: 16 }, { width: 18 }, { width: 16 },
      { width: 10 }, { width: 10 }, { width: 8 },
      { width: 14 }, { width: 18 }, { width: 18 },
    ];

    const suffix = idsParam ? "_selected" : "_all";
    const filename = `stocktaking${suffix}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    const buf = await wb.xlsx.writeBuffer();

    return new Response(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    console.error("Export error:", e);
    return new Response("导出失败", { status: 500 });
  }
};

function styleRow(row: any) {
  row.height = 22;
  row.eachCell((cell: any) => {
    cell.font = { name: "微软雅黑", size: 10 };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin" }, bottom: { style: "thin" },
      left: { style: "thin" }, right: { style: "thin" },
    };
  });
}
