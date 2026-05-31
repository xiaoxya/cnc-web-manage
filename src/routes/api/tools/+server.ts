import { getTokenFromCookies, verifyToken } from "$lib/server/auth";
import { prisma } from "$lib/server/db";
import { generateToolCode } from "$lib/utils/toolCode";
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

    const where: any = {};

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

    return json({ tools, total, page, pageSize });
  } catch {
    return json({ tools: [], total: 0 }, { status: 401 });
  }
};

export const POST: RequestHandler = async ({ request, cookies }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return json({ success: false, message: "未登录" }, { status: 401 });

  try {
    const payload = verifyToken(token);
    if (payload.role !== "ADMIN") return json({ success: false, message: "权限不足" }, { status: 403 });
    const body = await request.json();

    const toolCode = await generateToolCode(body.categoryId);

    const count = Math.max(1, body.quantity || 1);
    const tools = await prisma.$transaction(async (tx) => {
      const created = [];
      for (let i = 0; i < count; i++) {
        const code = await generateToolCode(body.categoryId, tx);
        const tool = await tx.tool.create({
          data: {
            toolCode: code,
            name: body.name,
            specification: body.specification || null,
            specId: body.specId || null,
            material: body.material || null,
            brand: body.brand || null,
            categoryId: body.categoryId,
            locationId: body.locationId || null,
            quantity: 1,
            minQuantity: body.minQuantity || 1,
            unit: body.unit || "把",
            price: body.price ? parseFloat(body.price) : null,
            notes: body.notes || null,
          },
          include: { category: true, location: true },
        });
        created.push(tool);
      }
      if (count > 0) {
        await tx.toolTransaction.create({
          data: { toolId: created[0].id, type: "IN", quantity: count, operatorId: payload.userId, notes: "初始入库" },
        });
      }
      return created;
    });

    return json({ success: true, tools, tool: tools[0], count });
  } catch (e) {
    console.error("Create tool error:", e);
    return json({ success: false, message: "创建失败" }, { status: 500 });
  }
};
