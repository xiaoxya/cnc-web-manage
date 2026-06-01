import { getTokenFromCookies, verifyToken } from "$lib/server/auth";
import { prisma } from "$lib/server/db";
import { apiError, apiSuccess } from "$lib/server/validation";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, url }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return apiError("未登录", 401);

  try {
    const payload = verifyToken(token);
    if (payload.role !== "ADMIN") return apiError("权限不足", 403);

    const type = url.searchParams.get("type") || "IN";

    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) return apiError("请上传文件", 400);

    const arrayBuffer = await file.arrayBuffer();
    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.default.Workbook();
    await workbook.xlsx.load(arrayBuffer);
    const worksheet = workbook.worksheets[0];

    if (!worksheet) return apiError("无效的Excel文件", 400);

    interface ImportRow {
      toolCode: string;
      quantity: number;
      notes: string;
      _row: number;
    }
    const tools: ImportRow[] = [];
    let headerFound = false;

    worksheet.eachRow((row: any, rowNumber: number) => {
      const values = row.values as string[];
      const code = String(values[1] || "").trim();
      const qty = parseInt(values[2] as string) || 1;
      const notes = String(values[3] || "").trim();

      if (rowNumber === 1) {
        if (code.toLowerCase().includes("code") || code.includes("编码")) {
          headerFound = true;
        }
        return;
      }

      if (code) {
        tools.push({ toolCode: code, quantity: qty, notes, _row: rowNumber });
      }
    });

    interface ResolvedRow {
      id: number;
      toolCode: string;
      name: string;
      quantity: number;
      notes: string;
    }
    const resolved: ResolvedRow[] = [];
    for (const t of tools) {
      const tool = await prisma.tool.findUnique({ where: { toolCode: t.toolCode } });
      if (tool) {
        resolved.push({ id: tool.id, toolCode: tool.toolCode, name: tool.name, quantity: t.quantity, notes: t.notes });
      }
    }

    return apiSuccess({ items: resolved });
  } catch (e) {
    console.error("Import error:", e);
    return apiError("导入失败");
  }
};
