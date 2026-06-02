import { getTokenFromCookies, verifyToken } from "$lib/server/auth";
import { prisma } from "$lib/server/db";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ request }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return json({ totalTools: 0, lowStockCount: 0, maintenanceCount: 0, scrappedToolCount: 0, recentTransactions: [], recentMaintenance: [], recentScrapped: [], factoryStats: [] }, { status: 401 });
  const minQtyThreshold = 5;

  try {
    verifyToken(token);

    const toolsAgg = await prisma.tool.aggregate({
      where: { status: { not: "SCRAPPED" } },
      _sum: { quantity: true },
    });
    const stockQty = toolsAgg._sum.quantity || 0;

    const [lowStockCount, maintenanceCount, scrappedToolCount, recentTransactions, recentMaintenance, recentScrapped] = await Promise.all([
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
      prisma.tool.findMany({
        where: { status: "SCRAPPED" },
        take: 10,
        orderBy: { updatedAt: "desc" },
        select: { id: true, toolCode: true, name: true, updatedAt: true },
      }),
    ]);

    const factories = await prisma.factory.findMany({ orderBy: { code: "asc" } });

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

    const factoryCounts = new Map<number, number>();
    for (const tx of toolFactoryStatus) {
      if (tx.latestType === "OUT" && inUseIdSet.has(tx.toolId)) {
        factoryCounts.set(tx.factoryId, (factoryCounts.get(tx.factoryId) || 0) + 1);
      }
    }

        const totalInUse = Array.from(factoryCounts.values()).reduce((a, b) => a + b, 0);
    const totalTools = stockQty + totalInUse;
const factoryStatsData = factories.map(f => ({
      factoryId: f.id,
      factoryCode: f.code,
      factoryName: f.name,
      count: factoryCounts.get(f.id) || 0,
    }));

    return json({ totalTools, lowStockCount: 0, maintenanceCount, scrappedToolCount, recentTransactions, recentMaintenance, recentScrapped, factoryStats: factoryStatsData });
  } catch (e) {
    console.error("Stats API error:", e);
    return json({ totalTools: 0, lowStockCount: 0, maintenanceCount: 0, scrappedToolCount: 0, recentTransactions: [], recentMaintenance: [], recentScrapped: [], factoryStats: [] }, { status: 500 });
  }
};