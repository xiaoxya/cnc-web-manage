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

    // 统计所有非报废刀具的总数量（合计库存）
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

    // 统计各工厂当前在用刀具数量（只统计状态为IN_USE的刀具）
    // 通过查询最新的OUT交易来确定刀具当前所在工厂
    const factories = await prisma.factory.findMany({ orderBy: { code: "asc" } });

    const latestOutTxs: Array<{toolId: number; factoryId: number}> = await prisma.$queryRawUnsafe(
      `SELECT t1.toolId, t1.factoryId
       FROM tool_transactions t1
       INNER JOIN (
         SELECT toolId, MAX(createdAt) as maxCreatedAt
         FROM tool_transactions
         WHERE type = 'OUT' AND factoryId IS NOT NULL
         GROUP BY toolId
       ) t2 ON t1.toolId = t2.toolId AND t1.createdAt = t2.maxCreatedAt
       WHERE t1.type = 'OUT' AND t1.factoryId IS NOT NULL`
    );

    // 取得当前在用中的刀具（状态IN_USE且最新出库记录确定工厂）
    const inUseToolIds = latestOutTxs.map(t => t.toolId);
    const inUseTools = await prisma.tool.findMany({
      where: { id: { in: inUseToolIds }, status: "IN_USE" },
      select: { id: true },
    });
    const inUseIdSet = new Set(inUseTools.map(t => t.id));

    // 统计每个工厂的当前在用刀具数
    const factoryCounts = new Map<number, number>();
    for (const tx of latestOutTxs) {
      if (inUseIdSet.has(tx.toolId)) {
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
