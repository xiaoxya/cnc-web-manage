import { getTokenFromCookies, verifyToken } from "$lib/server/auth";
import { prisma } from "$lib/server/db";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ request }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return json({ totalTools: 0, lowStockCount: 0, maintenanceCount: 0, recentTransactions: [], recentMaintenance: [] }, { status: 401 });

  try {
    verifyToken(token);

    const [totalTools, lowStockCount, maintenanceCount, recentTransactions, recentMaintenance] = await Promise.all([
      prisma.tool.count({ where: { status: { not: "SCRAPPED" } } }),
      prisma.tool.count({ where: { quantity: { lte: prisma.tool.fields.minQuantity }, status: { not: "SCRAPPED" } } }),
      prisma.tool.count({ where: { status: "MAINTENANCE" } }),
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

    return json({ totalTools, lowStockCount, maintenanceCount, recentTransactions, recentMaintenance });
  } catch {
    return json({ totalTools: 0, lowStockCount: 0, maintenanceCount: 0, recentTransactions: [], recentMaintenance: [] }, { status: 401 });
  }
};
