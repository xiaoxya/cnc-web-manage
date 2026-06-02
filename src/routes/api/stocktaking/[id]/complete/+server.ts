import { getTokenFromCookies, verifyToken } from "$lib/server/auth";
import { prisma } from "$lib/server/db";
import { apiError, apiSuccess } from "$lib/server/validation";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, params }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return apiError("未登录", 401);
  try {
    verifyToken(token);
    const id = parseInt(params.id);
    const body = await request.json();
    const items = (body.items || []) as Array<{ toolId: number; actualQuantity: number; notes?: string | null }>;

    if (items.length > 0) {
      // Save individual items without completing
      for (const item of items) {
        const existing = await prisma.stocktakingItem.findUnique({
          where: { stocktakingId_toolId: { stocktakingId: id, toolId: item.toolId } },
        });
        if (existing) {
          await prisma.stocktakingItem.update({
            where: { id: existing.id },
            data: {
              actualQuantity: item.actualQuantity,
              difference: item.actualQuantity - existing.expectedQuantity,
              notes: item.notes ?? null,
            },
          });
        } else {
          await prisma.stocktakingItem.create({
            data: {
              stocktakingId: id,
              toolId: item.toolId,
              expectedQuantity: 0,
              actualQuantity: item.actualQuantity,
              difference: item.actualQuantity,
              notes: item.notes ?? null,
            },
          });
        }
      }
      return apiSuccess({});
    } else {
      // Complete the stocktaking
      const stocktaking = await prisma.stocktaking.update({
        where: { id },
        data: { status: "COMPLETED", completedAt: new Date() },
        include: {
          items: {
            include: { tool: { select: { id: true } } },
          },
        },
      });

      for (const item of stocktaking.items) {
        if (item.actualQuantity !== item.expectedQuantity) {
          await prisma.tool.update({
            where: { id: item.toolId },
            data: { quantity: item.actualQuantity },
          });
        }
      }

      return apiSuccess({});
    }
  } catch (e) {
    console.error("Stocktaking operation error:", e);
    return apiError("操作失败");
  }
};