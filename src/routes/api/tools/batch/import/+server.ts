import { getTokenFromCookies, verifyToken } from "$lib/server/auth";
import { prisma } from "$lib/server/db";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, url }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return json({ success: false, message: "未登录" }, { status: 401 });

  try {
    verifyToken(token);
    const type = url.searchParams.get("type") || "IN";

    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) return json({ success: false, message: "请上传文件" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.default.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.worksheets[0];

    if (!worksheet) return json({ success: false, message: "无效的Excel文件" }, { status: 400 });

    const tools: any[] = [];
    let headerFound = false;

    worksheet.eachRow((row: any, rowNumber: number) => {
      const values = row.values as any[];
      const code = String(values[1] || "").trim();
      const qty = parseInt(values[2]) || 1;
      const notes = String(values[3] || "").trim();

      if (rowNumber === 1) {
        if (code.toLowerCase().includes("编码") || code.toLowerCase().includes("code")) {
          headerFound = true;
        }
        return;
      }

      if (code) {
        tools.push({ toolCode: code, quantity: qty, notes, _row: rowNumber });
      }
    });

    // Resolve tool codes to IDs
    const resolved: any[] = [];
    for (const t of tools) {
      const tool = await prisma.tool.findUnique({ where: { toolCode: t.toolCode } });
      if (tool) {
        resolved.push({ id: tool.id, toolCode: tool.toolCode, name: tool.name, quantity: t.quantity, notes: t.notes });
      }
    }

    return json({ success: true, items: resolved });
  } catch (e) {
    console.error("Import error:", e);
    return json({ success: false, message: "导入失败" }, { status: 500 });
  }
};
