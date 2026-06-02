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
        factory: true,
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

async function getInUseToolsForFactory(factoryId: number): Promise<any[]> {
  const latestTxs: Array<{toolId: number; factoryId: number; latestType: string}> = await prisma.$queryRawUnsafe(
    `SELECT t.toolId, t.factoryId, t.type as latestType
     FROM tool_transactions t
     INNER JOIN (
       SELECT toolId, MAX(createdAt) as maxCreatedAt
       FROM tool_transactions
       WHERE factoryId = ${factoryId}
       GROUP BY toolId
     ) latest ON t.toolId = latest.toolId AND t.createdAt = latest.maxCreatedAt
     WHERE t.factoryId = ${factoryId}`
  );

  const outTools = latestTxs.filter(tx => tx.latestType === 'OUT');
  if (outTools.length === 0) return [];

  const toolIds = outTools.map(t => t.toolId);
  const tools = await prisma.tool.findMany({
    where: { id: { in: toolIds }, status: { not: "SCRAPPED" } },
    select: { id: true, toolCode: true, name: true, specification: true, quantity: true, categoryId: true, status: true },
  });

  // Filter out tools that are back IN_STOCK (returned to warehouse)
  return tools.filter(t => t.status !== 'IN_STOCK');
}

export const POST: RequestHandler = async ({ request, cookies }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return apiError("not logged in", 401);
  try {
    const payload = verifyToken(token);
    const body = await request.json();

    const parsed = validateBody(stocktakingSchema, body);
    if (!parsed.success) return apiError(parsed.error, 400);

    const stocktakingNo = generateStocktakingNo();
    const factoryId = parsed.data.factoryId ?? null;

    // Only create items for tools that are in use at the selected factory
    let tools: any[] = [];
    if (factoryId) {
      tools = await getInUseToolsForFactory(factoryId);
    } else {
      tools = await prisma.tool.findMany({
        where: { status: { not: "SCRAPPED" } },
        select: { id: true, toolCode: true, name: true, specification: true, quantity: true, categoryId: true },
      });
    }

    const stocktaking = await prisma.stocktaking.create({
      data: {
        stocktakingNo,
        factoryId,
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
        factory: true,
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
    return apiError("create failed: " + (e instanceof Error ? e.message : String(e)));
  }
};