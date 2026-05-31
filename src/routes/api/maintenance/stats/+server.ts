import { getTokenFromCookies, verifyToken } from "$lib/server/auth";
import { prisma } from "$lib/server/db";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ request, url }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return json({});
  try {
    verifyToken(token);

    const vendor = url.searchParams.get("vendor") || "";
    const month = url.searchParams.get("month") || "";
    const year = url.searchParams.get("year") || "";

    // Build where clause for maintenance records
    const where: any = {};
    if (vendor) where.repairVendor = vendor;
    if (month && year) {
      const y = parseInt(year);
      const m = parseInt(month);
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0, 23, 59, 59);
      where.createdAt = { gte: start, lte: end };
    } else if (year) {
      const y = parseInt(year);
      where.createdAt = {
        gte: new Date(y, 0, 1),
        lte: new Date(y, 11, 31, 23, 59, 59),
      };
    }

    // Stats by vendor
    const vendorStats = await prisma.maintenanceRecord.groupBy({
      by: ["repairVendor"],
      _count: { id: true },
      _sum: { cost: true },
      where: { ...where, repairVendor: { not: null } },
      orderBy: { _count: { id: "desc" } },
    });

    // Stats by month (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const monthStats = await prisma.maintenanceRecord.groupBy({
      by: ["createdAt"],
      _count: { id: true },
      _sum: { cost: true },
      where: { createdAt: { gte: twelveMonthsAgo } },
      orderBy: { createdAt: "desc" },
    });

    // Aggregate month stats into month labels
    const monthMap: Record<string, { count: number; cost: number }> = {};
    for (const r of monthStats) {
      const key = `${r.createdAt.getFullYear()}-${String(r.createdAt.getMonth() + 1).padStart(2, "0")}`;
      if (!monthMap[key]) monthMap[key] = { count: 0, cost: 0 };
      monthMap[key].count += r._count.id;
      monthMap[key].cost += Number(r._sum.cost || 0);
    }
    const monthStatsAggregated = Object.entries(monthMap)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Tools with highest maintenance count
    const topTools = await prisma.tool.findMany({
      where: { maintenanceCount: { gt: 0 } },
      select: { id: true, toolCode: true, name: true, maintenanceCount: true },
      orderBy: { maintenanceCount: "desc" },
      take: 20,
    });

    // Total counts
    const totalRecords = await prisma.maintenanceRecord.count({ where });
    const totalCost = vendorStats.reduce((sum, v) => sum + Number(v._sum.cost || 0), 0);
    const inMaintenance = await prisma.maintenanceRecord.count({ where: { ...where, status: "IN_MAINTENANCE" } });

    return json({
      vendorStats: vendorStats.map((v) => ({
        vendor: v.repairVendor,
        count: v._count.id,
        cost: Number(v._sum.cost || 0),
      })),
      monthStats: monthStatsAggregated,
      topTools,
      totalRecords,
      totalCost,
      inMaintenance,
    });
  } catch {
    return json({});
  }
};
