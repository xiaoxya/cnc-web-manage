import { getTokenFromCookies, verifyToken } from "$lib/server/auth";
import { prisma } from "$lib/server/db";
import { generateStocktakingNo } from "$lib/utils";
import { validateBody, apiError, apiSuccess } from "$lib/server/validation";
import { stocktakingSchema } from "$lib/schemas";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ request }) => {
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
  } catch (e) {
    console.error("GET stocktaking error:", e);
    return json([]);
  }
};

export const POST: RequestHandler = async ({ request, cookies }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return apiError("未登录", 401);
  try {
    const payload = verifyToken(token);
    const body = await request.json();

    const parsed = validateBody(stocktakingSchema, body);
    if (!parsed.success) return apiError(parsed.error, 400);

    const stocktakingNo = generateStocktakingNo();

    const tools = await prisma.tool.findMany({
      where: { status: { not: "SCRAPPED" } },
      select: { id: true, toolCode: true, name: true, specification: true, quantity: true, categoryId: true },
    });

    const stocktaking = await prisma.stocktaking.create({
      data: {
        stocktakingNo,
        operatorId: payload.userId,
        notes: parsed.data.notes ?? null,
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

    return apiSuccess({ stocktaking: stocktaking as unknown as Record<string, unknown> });
  } catch (e) {
    console.error("POST stocktaking error:", e);
    return apiError("创建失败");
  }
};