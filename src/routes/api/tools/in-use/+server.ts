import { getTokenFromCookies, verifyToken } from "$lib/server/auth";
import { prisma } from "$lib/server/db";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ request, url }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return json({ items: [], factorySummary: [] }, { status: 401 });

  try {
    verifyToken(token);

    const search = url.searchParams.get("search") || "";
    const filterFactoryId = url.searchParams.get("factoryId");

    const factories = await prisma.factory.findMany({ orderBy: { code: "asc" } });

    // Find latest transaction per tool where factoryId IS NOT NULL, include createdAt
    interface LatestTx {
      toolId: number; factoryId: number; latestType: string; latestCreatedAt: Date;
    }
    let latestTxs: LatestTx[] = await prisma.$queryRawUnsafe(
      `SELECT t.toolId, t.factoryId, t.type as latestType, t.createdAt as latestCreatedAt
       FROM tool_transactions t
       INNER JOIN (
         SELECT toolId, MAX(createdAt) as maxCreatedAt
         FROM tool_transactions
         WHERE factoryId IS NOT NULL
         GROUP BY toolId
       ) latest ON t.toolId = latest.toolId AND t.createdAt = latest.maxCreatedAt
       WHERE t.factoryId IS NOT NULL`
    );

    // Only keep OUT transactions
    latestTxs = latestTxs.filter(tx => tx.latestType === "OUT");

    if (filterFactoryId) {
      const fId = parseInt(filterFactoryId);
      latestTxs = latestTxs.filter(tx => tx.factoryId === fId);
    }

    if (latestTxs.length === 0) {
      const factorySummary = factories.map(f => ({ factoryId: f.id, factoryCode: f.code, factoryName: f.name, toolCount: 0 }));
      return json({ items: [], factorySummary });
    }

    const toolIds = latestTxs.map(t => t.toolId);
    const tools = await prisma.tool.findMany({
      where: { id: { in: toolIds } },
      include: { category: true, location: true },
    });
    const toolMap = new Map(tools.map(t => [t.id, t]));

    const items: unknown[] = [];
    const factoryCounts = new Map<number, number>();

    for (const tx of latestTxs) {
      const tool = toolMap.get(tx.toolId);
      if (!tool || tool.status === "SCRAPPED" || tool.status === "IN_STOCK") continue;
      const factory = factories.find(f => f.id === tx.factoryId);
      if (!factory) continue;

      if (search) {
        const q = search.toLowerCase();
        const matchesCode = tool.toolCode.toLowerCase().includes(q);
        const matchesName = tool.name.toLowerCase().includes(q);
        const matchesSpec = (tool.specification || "").toLowerCase().includes(q);
        if (!matchesCode && !matchesName && !matchesSpec) continue;
      }

      items.push({
        id: tool.id,
        toolCode: tool.toolCode,
        name: tool.name,
        specification: tool.specification,
        quantity: tool.quantity,
        unit: tool.unit,
        category: tool.category,
        location: tool.location,
        factoryId: factory.id,
        factoryCode: factory.code,
        factoryName: factory.name,
        lastOutTime: tx.latestCreatedAt,
      });

      factoryCounts.set(factory.id, (factoryCounts.get(factory.id) || 0) + 1);
    }

    const factorySummary = factories.map(f => ({
      factoryId: f.id,
      factoryCode: f.code,
      factoryName: f.name,
      toolCount: factoryCounts.get(f.id) || 0,
    }));

    return json({ items, factorySummary });
  } catch (e) {
    console.error("In-use API error:", e);
    return json({ items: [], factorySummary: [] }, { status: 500 });
  }
};