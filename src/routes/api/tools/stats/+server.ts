import { getTokenFromCookies, verifyToken } from "$lib/server/auth";
import { prisma } from "$lib/server/db";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ request }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return json({ totalTools: 0, lowStockCount: 0, maintenanceCount: 0, scrappedToolCount: 0, recentTransactions: [], recentMaintenance: [], factoryStats: [] }, { status: 401 });
  const minQtyThreshold = 5;

  try {
    verifyToken(token);

    const toolsAgg = await prisma.tool.aggregate({
      where: { status: { not: "SCRAPPED" } },
      _sum: { quantity: true },
    });
    const totalTools = toolsAgg._sum.quantity || 0;

    const [lowStockCount, maintenanceCount, scrappedToolCount, recentTransactions, recentMaintenance] = await Promise.all([
      prisma.tool.count({ where: { quantity: { lte: minQtyThreshold }, status: { not: "SCRAPPED" } } }),
      prisma.tool.count({ where: { status: "MAINTENANCE" } }),
      prisma.tool.count({ where: { status: "SCRAPPED" } }),
      prisma.toolTransaction.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: { tool: { select: { toolCode: true, name: true } } },
      }),
      prisma.maintenanceRecord.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: { tool: { select: { toolCode: true, name: true } } },
      }),
    ]);

    // Get factories
    const factories = await prisma.factory.findMany({ orderBy: { code: "asc" } });

    // For each tool that has ever been sent to a factory, find its latest transaction.
    // If latest transaction is OUT, tool is still at factory. If IN (return), it's not.
    const toolFactoryStatus: Array<{toolId: number; factoryId: number; latestType: string}> = await prisma.$queryRawUnsafe(
      `SELECT t.toolId, t.factoryId, t.type as latestType
       FROM tool_transactions t
       INNER JOIN (
         SELECT toolId, MAX(createdAt) as maxCreatedAt
         FROM tool_transactions
         WHERE factoryId IS NOT NULL
         GROUP BY toolId
       ) latest ON t.toolId = latest.toolId AND t.createdAt = latest.maxCreatedAt
       WHERE t.factoryId IS NOT NULL`
    );

    // Only count tools where status is IN_USE AND latest transaction is OUT (not returned)
    const outToolIds = toolFactoryStatus
      .filter(tx => tx.latestType === "OUT")
      .map(tx => tx.toolId);

    const inUseTools = outToolIds.length > 0
      ? await prisma.tool.findMany({
          where: { id: { in: outToolIds }, status: "IN_USE" },
          select: { id: true },
        })
      : [];
    const inUseIdSet = new Set(inUseTools.map(t => t.id));

    // Count per factory
    const factoryCounts = new Map<number, number>();
    for (const tx of toolFactoryStatus) {
      if (tx.latestType === "OUT" && inUseIdSet.has(tx.toolId)) {
        factoryCounts.set(tx.factoryId, (factoryCounts.get(tx.factoryId) || 0) + 1);
      }
    }

    const factoryStatsData = factories.map(f => ({
      factoryId: f.id,
      factoryCode: f.code,
      factoryName: f.name,
      count: factoryCounts.get(f.id) || 0,
    }));

    return json({ totalTools, lowStockCount, maintenanceCount, scrappedToolCount, recentTransactions, recentMaintenance, factoryStats: factoryStatsData });
  } catch (e) {
    console.error("Stats API error:", e);
    return json({ totalTools: 0, lowStockCount: 0, maintenanceCount: 0, scrappedToolCount: 0, recentTransactions: [], recentMaintenance: [], factoryStats: [] }, { status: 500 });
  }
};