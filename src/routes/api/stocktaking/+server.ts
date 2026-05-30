import { getTokenFromCookies, verifyToken } from "$lib/server/auth";
import { prisma } from "$lib/server/db";
import { generateStocktakingNo } from "$lib/utils";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ request, url }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return json([], { status: 401 });
  try {
    verifyToken(token);
    const stocktakings = await prisma.stocktaking.findMany({
      include: {
        operator: { select: { displayName: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return json(stocktakings);
  } catch { return json([]); }
};

export const POST: RequestHandler = async ({ request, cookies }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return json({ success: false, message: "未登录" }, { status: 401 });
  try {
    const payload = verifyToken(token);
    const body = await request.json();
    const stocktakingNo = generateStocktakingNo();

    // Find all active tools
    const tools = await prisma.tool.findMany({
      where: { status: { not: "SCRAPPED" } },
      select: { id: true, toolCode: true, name: true, specification: true, quantity: true, categoryId: true },
    });

    const stocktaking = await prisma.stocktaking.create({
      data: {
        stocktakingNo,
        operatorId: payload.userId,
        notes: body.notes || null,
        items: {
          create: tools.map((t) => ({
            toolId: t.id,
            expectedQuantity: t.quantity,
            actualQuantity: t.quantity,
            difference: 0,
          })),
        },
      },
      include: {
        items: {
          include: {
            tool: { select: { toolCode: true, name: true, specification: true, quantity: true } },
          },
        },
      },
    });

    return json({ success: true, stocktaking });
  } catch { return json({ success: false, message: "创建失败" }, { status: 500 }); }
};
