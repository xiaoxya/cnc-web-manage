import { getTokenFromCookies, verifyToken } from "$lib/server/auth";
import { prisma } from "$lib/server/db";
import { generateReferenceNo } from "$lib/utils";
import { validateBody, apiError, apiSuccess } from "$lib/server/validation";
import { batchTransactionSchema } from "$lib/schemas";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, cookies }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return apiError("not logged in", 401);

  try {
    const payload = verifyToken(token);
    if (payload.role !== "ADMIN") return apiError("permission denied", 403);
    const body = await request.json();

    const parsed = validateBody(batchTransactionSchema, body);
    if (!parsed.success) return apiError(parsed.error, 400);

    const { type, items, referenceNo, factoryId } = body as Record<string, unknown> & { type: "IN" | "OUT"; items: { toolId: number; quantity: number; notes?: string | null }[]; referenceNo?: string | null; factoryId?: number | null };

    // For OUT transactions, check that no scrapped tools are included
    if (type === "OUT") {
      const toolIds = items.map(i => i.toolId);
      const tools = await prisma.tool.findMany({ where: { id: { in: toolIds } }, select: { id: true, toolCode: true, status: true } });
      const scrappedTools = tools.filter(t => t.status === "SCRAPPED");
      if (scrappedTools.length > 0) {
        return apiError("Cannot outbound scrapped tools: " + scrappedTools.map(t => t.toolCode).join(", "), 400);
      }
    }

    const refNo = referenceNo || generateReferenceNo(type);
    let count = 0;

    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const tool = await tx.tool.findUnique({ where: { id: item.toolId } });
        if (!tool) continue;

        const qty = type === "IN" ? item.quantity : -item.quantity;
        const newQty = tool.quantity + qty;
        if (newQty < 0) throw new Error(`Insufficient stock for ${tool.toolCode}`);

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
    return apiError(err.message || "operation failed");
  }
};