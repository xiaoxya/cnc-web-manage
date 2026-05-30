import { getTokenFromCookies, verifyToken } from "$lib/server/auth";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ request, url }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return json({ success: false, message: "未登录" }, { status: 401 });

  try {
    verifyToken(token);
    const type = url.searchParams.get("type") || "IN";
    const label = type === "IN" ? "批量入库模板" : "批量出库模板";

    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.default.Workbook();
    const sheet = workbook.addWorksheet(label);

    sheet.columns = [
      { header: "刀具编码", key: "toolCode", width: 18 },
      { header: "数量", key: "quantity", width: 12 },
      { header: "备注", key: "notes", width: 25 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, size: 12 };
    headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
    headerRow.alignment = { horizontal: "center" };

    sheet.addRow({ toolCode: "LAT-0001", quantity: 5, notes: "示例数据（请删除）" });

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=" + encodeURIComponent(label) + ".xlsx",
      },
    });
  } catch (e: any) {
    console.error("Template error:", e?.message || e);
    return json({ success: false, message: e?.message || "生成模板失败" }, { status: 500 });
  }
};