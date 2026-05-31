import { getTokenFromCookies, verifyToken } from "$lib/server/auth";
import { prisma } from "$lib/server/db";
import { validateBody, apiError, apiSuccess } from "$lib/server/validation";
import { z } from "zod";
import type { RequestHandler } from "./$types";

const returnSchema = z.object({
  toolId: z.number().int().positive(),
  factoryId: z.number().int().positive().optional().nullable(),
});

export const POST: RequestHandler = async ({ request }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return apiError("未登录", 401);
  try {
    const payload = verifyToken(token);
    const body = await request.json();

    const parsed = validateBody(returnSchema, body);
    if (!parsed.success) return apiError(parsed.error, 400);

    const tool = await prisma.tool.findUnique({ where: { id: parsed.data.toolId } });
    if (!tool || tool.status !== "IN_USE") {
      return apiError("该刀具不在使用中", 400);
    }

    // Restore quantity to at least minQuantity when returning
    const restoredQty = tool.quantity > 0 ? tool.quantity : Math.max(1, tool.minQuantity);

    await prisma.$transaction(async (tx) => {
      await tx.tool.update({
        where: { id: parsed.data.toolId },
        data: {
          status: "IN_STOCK",
          quantity: restoredQty,
        },
      });

      await tx.toolTransaction.create({
        data: {
          toolId: parsed.data.toolId,
          type: "IN",
          quantity: restoredQty,
          operatorId: payload.userId,
          notes: `从工厂退回 (factoryId: ${parsed.data.factoryId ?? "N/A"})`,
          factoryId: parsed.data.factoryId ?? null,
        },
      });
    });

    return apiSuccess({});
  } catch (e) {
    console.error("Return tool error:", e);
    return apiError("退回失败");
  }
};