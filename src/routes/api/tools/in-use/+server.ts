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

    let latestOutTxs: Array<{toolId: number; factoryId: number; maxCreatedAt: Date}> = await prisma.$queryRawUnsafe(
      `SELECT t1.toolId, t1.factoryId, t1.createdAt as maxCreatedAt
       FROM tool_transactions t1
       INNER JOIN (
         SELECT toolId, MAX(createdAt) as maxCreatedAt
         FROM tool_transactions
         WHERE type = 'OUT' AND factoryId IS NOT NULL
         GROUP BY toolId
       ) t2 ON t1.toolId = t2.toolId AND t1.createdAt = t2.maxCreatedAt
       WHERE t1.type = 'OUT' AND t1.factoryId IS NOT NULL`
    );

    // Apply factory filter at raw level
    if (filterFactoryId) {
      const fId = parseInt(filterFactoryId);
      latestOutTxs = latestOutTxs.filter(tx => tx.factoryId === fId);
    }

    if (latestOutTxs.length === 0) {
      const factorySummary = factories.map(f => ({ factoryId: f.id, factoryCode: f.code, factoryName: f.name, toolCount: 0 }));
      return json({ items: [], factorySummary });
    }

    const toolIds = latestOutTxs.map(t => t.toolId);
    const tools = await prisma.tool.findMany({
      where: { id: { in: toolIds } },
      include: { category: true, location: true },
    });
    const toolMap = new Map(tools.map(t => [t.id, t]));

    const items: Array<any> = [];
    const factoryCounts = new Map<number, number>();

    for (const tx of latestOutTxs) {
      const tool = toolMap.get(tx.toolId);
      if (!tool || tool.status === "SCRAPPED" || tool.status === "IN_STOCK") continue;
      const factory = factories.find(f => f.id === tx.factoryId);
      if (!factory) continue;

      // Apply search filter
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
        specification: tool.specification || "",
        categoryName: tool.category?.name || "",
        quantity: 1,
        factoryId: factory.id,
        factoryCode: factory.code,
        factoryName: factory.name,
        lastOutTime: tx.maxCreatedAt,
      });
      factoryCounts.set(factory.id, (factoryCounts.get(factory.id) || 0) + 1);
    }

    // Recalculate factory summary for filtered results
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
