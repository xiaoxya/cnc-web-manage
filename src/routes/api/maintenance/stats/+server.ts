import { getTokenFromCookies, verifyToken } from "$lib/server/auth";
import { prisma } from "$lib/server/db";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ request, url }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return json({ vendorStats: [], monthStats: [], topTools: [], totalRecords: 0, totalCost: 0, inMaintenance: 0 });
  try {
    verifyToken(token);

    const vendor = url.searchParams.get("vendor") || "";
    const month = url.searchParams.get("month") || "";
    const year = url.searchParams.get("year") || "";

    // Build where clause
    const where: any = {};
    if (vendor) where.repairVendor = vendor;
    if (month && year) {
      const y = parseInt(year);
      const m = parseInt(month);
      where.createdAt = { gte: new Date(y, m - 1, 1), lte: new Date(y, m, 0, 23, 59, 59) };
    } else if (year) {
      const y = parseInt(year);
      where.createdAt = { gte: new Date(y, 0, 1), lte: new Date(y, 11, 31, 23, 59, 59) };
    }

    // Get all records for stats to avoid groupBy limitations on Date/String fields
    const allRecords = await prisma.maintenanceRecord.findMany({
      where,
      select: { id: true, repairVendor: true, cost: true, status: true, createdAt: true },
    });

    // Vendor stats
    const vendorMap: Record<string, { count: number; cost: number }> = {};
    for (const r of allRecords) {
      const v = r.repairVendor || "未指定";
      if (!vendorMap[v]) vendorMap[v] = { count: 0, cost: 0 };
      vendorMap[v].count++;
      vendorMap[v].cost += Number(r.cost) || 0;
    }
    const vendorStats = Object.entries(vendorMap)
      .map(([vendor, data]) => ({ vendor, count: data.count, cost: data.cost }))
      .sort((a, b) => b.count - a.count);

    // Month stats (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const recentRecords = allRecords.filter(r => r.createdAt >= twelveMonthsAgo);
    const monthMap: Record<string, { count: number; cost: number }> = {};
    for (const r of recentRecords) {
      const key = `${r.createdAt.getFullYear()}-${String(r.createdAt.getMonth() + 1).padStart(2, "0")}`;
      if (!monthMap[key]) monthMap[key] = { count: 0, cost: 0 };
      monthMap[key].count++;
      monthMap[key].cost += Number(r.cost) || 0;
    }
    const monthStats = Object.entries(monthMap)
      .map(([m, data]) => ({ month: m, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Top tools by maintenance count
    const topTools = await prisma.tool.findMany({
      where: { maintenanceCount: { gt: 0 } },
      select: { id: true, toolCode: true, name: true, maintenanceCount: true },
      orderBy: { maintenanceCount: "desc" },
      take: 20,
    });

    const totalRecords = allRecords.length;
    const totalCost = Object.values(vendorMap).reduce((sum, v) => sum + v.cost, 0);
    const inMaintenance = allRecords.filter(r => r.status === "IN_MAINTENANCE").length;

    return json({ vendorStats, monthStats, topTools, totalRecords, totalCost, inMaintenance });
  } catch (e) {
    console.error("Stats error:", e);
    return json({ vendorStats: [], monthStats: [], topTools: [], totalRecords: 0, totalCost: 0, inMaintenance: 0 });
  }
};
