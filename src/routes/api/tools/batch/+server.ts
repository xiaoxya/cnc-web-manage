import { getTokenFromCookies, verifyToken } from "$lib/server/auth";
import { prisma } from "$lib/server/db";
import { generateReferenceNo } from "$lib/utils";
import { validateBody, apiError, apiSuccess } from "$lib/server/validation";
import { batchTransactionSchema } from "$lib/schemas";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, cookies }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return apiError("未登录", 401);

  try {
    const payload = verifyToken(token);
    if (payload.role !== "ADMIN") return apiError("权限不足", 403);
    const body = await request.json();

    const parsed = validateBody(batchTransactionSchema, body);
    if (!parsed.success) return apiError(parsed.error, 400);

    const { type, items, referenceNo, factoryId } = body as Record<string, unknown> & { type: "IN" | "OUT"; items: { toolId: number; quantity: number; notes?: string | null }[]; referenceNo?: string | null; factoryId?: number | null };

    const refNo = referenceNo || generateReferenceNo(type);
    let count = 0;

    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const tool = await tx.tool.findUnique({ where: { id: item.toolId } });
        if (!tool) continue;

        const qty = type === "IN" ? item.quantity : -item.quantity;
        const newQty = tool.quantity + qty;
        if (newQty < 0) throw new Error(`刀具 ${tool.toolCode} 库存不足`);

        await tx.tool.update({
          where: { id: item.toolId },
          data: {
            quantity: newQty,
            status: newQty === 0 ? "IN_USE" : "IN_STOCK",
          },
        });

        await tx.toolTransaction.create({
          data: {
            toolId: item.toolId,
            type,
            quantity: item.quantity,
            operatorId: payload.userId,
            referenceNo: refNo,
            notes: item.notes || null,
            factoryId: type === "OUT" ? (factoryId || null) : null,
          },
        });
        count++;
      }
    });

    return apiSuccess({ count, referenceNo: refNo });
  } catch (e) {
    const err = e as Error;
    console.error("Batch transaction error:", err.message || e);
    return apiError(err.message || "操作失败");
  }
};