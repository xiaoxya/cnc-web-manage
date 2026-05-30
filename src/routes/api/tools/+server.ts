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

    const where: any = { status: { not: "SCRAPPED" } };

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
    const body = await request.json();

    const toolCode = await generateToolCode(body.categoryId);

    const tool = await prisma.tool.create({
      data: {
        toolCode,
        name: body.name,
        specification: body.specification || null,
        material: body.material || null,
        brand: body.brand || null,
        categoryId: body.categoryId,
        locationId: body.locationId || null,
        quantity: body.quantity || 0,
        minQuantity: body.minQuantity || 1,
        unit: body.unit || "把",
        price: body.price ? parseFloat(body.price) : null,
        notes: body.notes || null,
      },
      include: { category: true, location: true },
    });

    return json({ success: true, tool });
  } catch (e) {
    console.error("Create tool error:", e);
    return json({ success: false, message: "创建失败" }, { status: 500 });
  }
};
