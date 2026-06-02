import { getTokenFromCookies, verifyToken } from "$lib/server/auth";
import { prisma } from "$lib/server/db";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ request, params }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return json(null, { status: 401 });
  try {
    verifyToken(token);
    const stocktaking = await prisma.stocktaking.findUnique({
      where: { id: parseInt(params.id ?? "0") },
      include: {
        operator: { select: { displayName: true } },
        factory: true,
        items: {
          include: {
            tool: { select: { toolCode: true, name: true, specification: true, quantity: true, status: true } },
          },
          orderBy: { id: "asc" },
        },
      },
    });
    return json(stocktaking);
  } catch { return json(null); }
};

export const PUT: RequestHandler = async ({ request, params, cookies }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return json({ success: false, message: "未登录" }, { status: 401 });
  try {
    const payload = verifyToken(token);
    const id = parseInt(params.id ?? "0");
    const body = await request.json();

    await prisma.stocktakingItem.update({
      where: { id: body.itemId },
      data: {
        actualQuantity: body.actualQuantity,
        difference: body.actualQuantity - body.expectedQuantity,
        notes: body.notes || null,
      },
    });

    return json({ success: true });
  } catch { return json({ success: false, message: "更新失败" }, { status: 500 }); }
};

export const DELETE: RequestHandler = async ({ request, params, url }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return json({ success: false, message: "未登录" }, { status: 401 });
  try {
    const payload = verifyToken(token);
    const id = parseInt(params.id ?? "0");

    const complete = url.searchParams.get("complete") === "true";

    if (complete) {
      // Complete stocktaking - any user can complete
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

      return json({ success: true });
    } else {
      // Delete stocktaking - admin only
      if (payload.role !== "ADMIN") {
        return json({ success: false, message: "权限不足，仅管理员可删除" }, { status: 403 });
      }
      // Delete items first to avoid foreign key constraint
      await prisma.stocktakingItem.deleteMany({ where: { stocktakingId: id } });
      await prisma.stocktaking.delete({ where: { id } });
      return json({ success: true });
    }
  } catch { return json({ success: false, message: "操作失败" }, { status: 500 }); }
};