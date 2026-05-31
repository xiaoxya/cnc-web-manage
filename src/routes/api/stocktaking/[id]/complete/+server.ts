import { getTokenFromCookies, verifyToken } from "$lib/server/auth";
import { prisma } from "$lib/server/db";
import { apiError, apiSuccess } from "$lib/server/validation";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "../$types";

export const POST: RequestHandler = async ({ request, params }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return apiError("未登录", 401);
  try {
    verifyToken(token);
    const id = parseInt(params.id);

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
  } catch (e) {
    console.error("Complete stocktaking error:", e);
    return apiError("操作失败");
  }
};
