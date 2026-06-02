import { getTokenFromCookies, verifyToken } from "$lib/server/auth";
import { prisma } from "$lib/server/db";
import { validateBody, apiError, apiSuccess } from "$lib/server/validation";
import { maintenanceSchema } from "$lib/schemas";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ request, url }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return json([], { status: 401 });
  try {
    verifyToken(token);
    const status = url.searchParams.get("status");
    const search = url.searchParams.get("search") || "";
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (search) where.tool = { OR: [{ toolCode: { contains: search } }, { name: { contains: search } }] };

    const records = await prisma.maintenanceRecord.findMany({
      where,
      include: { tool: { select: { toolCode: true, name: true } }, reporter: { select: { displayName: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return json(records);
  } catch (e) {
    console.error("GET maintenance error:", e);
    return json([]);
  }
};

export const POST: RequestHandler = async ({ request, cookies }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return apiError("not logged in", 401);
  try {
    const payload = verifyToken(token);
    const body = await request.json();

    const parsed = validateBody(maintenanceSchema, body);
    if (!parsed.success) return apiError(parsed.error, 400);

    const tool = await prisma.tool.findUnique({ where: { id: parsed.data.toolId } });
    if (!tool) return apiError("Tool not found", 404);
    if (tool.status !== "IN_STOCK" && tool.status !== "IN_USE") {
      return apiError("Tool status is " + tool.status + ", cannot report maintenance (only IN_STOCK or IN_USE)", 400);
    }

    // Determine pre-maintenance status info
    let previousStatus = tool.status;
    let previousFactoryInfo = "";

    if (tool.status === "IN_USE") {
      // Look up the factory from the latest OUT transaction
      try {
        const latestTxs: Array<{ factoryId: number; factoryCode: string; factoryName: string }> = await prisma.$queryRawUnsafe(
          `SELECT t.factoryId, f.code as factoryCode, f.name as factoryName
           FROM tool_transactions t
           LEFT JOIN factories f ON f.id = t.factoryId
           WHERE t.toolId = ${tool.id} AND t.type = 'OUT'
           ORDER BY t.createdAt DESC
           LIMIT 1`
        );
        if (latestTxs.length > 0) {
          previousFactoryInfo = latestTxs[0].factoryCode + " " + latestTxs[0].factoryName;
        }
      } catch {}
    }

    const record = await prisma.$transaction(async (tx) => {
      await tx.tool.update({
        where: { id: parsed.data.toolId },
        data: { status: "MAINTENANCE", maintenanceCount: { increment: 1 } },
      });
      return tx.maintenanceRecord.create({
        data: {
          toolId: parsed.data.toolId,
          description: parsed.data.description,
          reporterId: payload.userId,
          notes: parsed.data.notes ?? null,
          repairVendor: (body as Record<string, unknown>).repairVendor as string ?? null,
          previousStatus,
          previousFactoryInfo: previousFactoryInfo || null,
        },
        include: { tool: { select: { toolCode: true, name: true } }, reporter: { select: { displayName: true } } },
      });
    });

    return apiSuccess({ record: record as unknown as Record<string, unknown> });
  } catch (e) {
    console.error("POST maintenance error:", e);
    return apiError("report failed");
  }
};
