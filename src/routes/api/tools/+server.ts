import { getTokenFromCookies, verifyToken } from "$lib/server/auth";
import { prisma } from "$lib/server/db";
import { generateToolCode } from "$lib/utils/toolCode";
import { validateBody, apiError, apiSuccess } from "$lib/server/validation";
import { toolSchema } from "$lib/schemas";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ request, url }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return json({ tools: [], total: 0 }, { status: 401 });

  try {
    verifyToken(token);

    const page = parseInt(url.searchParams.get("page") || "1");
    const pageSize = parseInt(url.searchParams.get("pageSize") || "20");
    const search = url.searchParams.get("search") || "";
    const categoryId = url.searchParams.get("categoryId");
    const locationId = url.searchParams.get("locationId");
    const status = url.searchParams.get("status");

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { toolCode: { contains: search } },
        { name: { contains: search } },
        { specification: { contains: search } },
      ];
    }
    if (categoryId) where.categoryId = parseInt(categoryId);
    if (locationId) where.locationId = parseInt(locationId);
    if (status) where.status = status;

    const [tools, total] = await Promise.all([
      prisma.tool.findMany({
        where,
        include: { category: true, location: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.tool.count({ where }),
    ]);

    // For IN_USE tools, look up the factory from the latest OUT transaction
    const inUseToolIds = tools.filter(t => t.status === "IN_USE").map(t => t.id);
    const factoryMap = new Map<number, { code: string; name: string }>();

    if (inUseToolIds.length > 0) {
      const latestTxs: Array<{ toolId: number; factoryId: number }> = await prisma.$queryRawUnsafe(
        `SELECT t.toolId, t.factoryId
         FROM tool_transactions t
         INNER JOIN (
           SELECT toolId, MAX(createdAt) as maxCreatedAt
           FROM tool_transactions
           WHERE factoryId IS NOT NULL
           GROUP BY toolId
         ) latest ON t.toolId = latest.toolId AND t.createdAt = latest.maxCreatedAt
         WHERE t.factoryId IS NOT NULL AND t.type = 'OUT' AND t.toolId IN (${inUseToolIds.join(",")})`
      );

      if (latestTxs.length > 0) {
        const factoryIds = [...new Set(latestTxs.map(t => t.factoryId))];
        const factories = await prisma.factory.findMany({
          where: { id: { in: factoryIds } },
          select: { id: true, code: true, name: true },
        });
        const fMap = new Map(factories.map(f => [f.id, f]));
        for (const tx of latestTxs) {
          const f = fMap.get(tx.factoryId);
          if (f) factoryMap.set(tx.toolId, { code: f.code, name: f.name });
        }
      }
    }

    const enrichedTools = tools.map(t => {
      const enriched = { ...t, factoryCode: undefined, factoryName: undefined };
      if (t.status === "IN_USE") {
        const f = factoryMap.get(t.id);
        if (f) {
          enriched.factoryCode = f.code;
          enriched.factoryName = f.name;
        }
      }
      return enriched;
    });

    return json({ tools: enrichedTools, total, page, pageSize });
  } catch (e) {
    console.error("GET tools error:", e);
    return json({ tools: [], total: 0 }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request, cookies }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return apiError("未登录", 401);

  try {
    const payload = verifyToken(token);
    if (payload.role !== "ADMIN") return apiError("权限不足", 403);
    const body = await request.json();

    const parsed = validateBody(toolSchema, body);
    if (!parsed.success) return apiError(parsed.error, 400);

    const count = Math.max(1, parsed.data.quantity || 1);
    const tools = await prisma.$transaction(async (tx) => {
      const created: unknown[] = [];
      for (let i = 0; i < count; i++) {
        const code = await generateToolCode(parsed.data.categoryId, tx);
        const tool = await tx.tool.create({
          data: {
            toolCode: code,
            name: parsed.data.name,
            specification: parsed.data.specification,
            specId: (body as Record<string, unknown>).specId as number ?? null,
            material: parsed.data.material ?? null,
            brand: parsed.data.brand ?? null,
            categoryId: parsed.data.categoryId,
            locationId: parsed.data.locationId ?? null,
            quantity: 1,
            minQuantity: parsed.data.minQuantity,
            unit: parsed.data.unit,
            price: parsed.data.price ? String(parsed.data.price) : null,
            notes: parsed.data.notes ?? null,
          },
          include: { category: true, location: true },
        });
        created.push(tool);
      }
      if (count > 0) {
        const first = created[0] as { id: number };
        await tx.toolTransaction.create({
          data: {
            toolId: first.id,
            type: "IN",
            quantity: count,
            operatorId: payload.userId,
            notes: "初始入库",
          },
        });
      }
      return created;
    });

    const firstTool = tools[0] as Record<string, unknown>;
    return apiSuccess({ tools: tools as unknown as Record<string, unknown>, tool: firstTool, count });
  } catch (e) {
    console.error("Create tool error:", e);
    return apiError("创建失败");
  }
};
