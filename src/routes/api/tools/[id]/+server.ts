import { getTokenFromCookies, verifyToken } from "$lib/server/auth";
import { prisma } from "$lib/server/db";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ request, params }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return json(null, { status: 401 });
  try {
    verifyToken(token);
    const id = parseInt(params.id);
    const tool = await prisma.tool.findUnique({
      where: { id },
      include: { category: true, location: true,
        transactions: { orderBy: { createdAt: "desc" }, take: 50, include: { operator: { select: { displayName: true } } } },
        maintenance: { orderBy: { createdAt: "desc" }, include: { reporter: { select: { displayName: true } } } },
      },
    });
    return json(tool);
  } catch { return json(null, { status: 401 }); }
};

export const PUT: RequestHandler = async ({ request, params }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return json({ success: false, message: "未登录" }, { status: 401 });
  try {
    const payload = verifyToken(token);
    const id = parseInt(params.id);
    const body = await request.json();
    const tool = await prisma.tool.update({
      where: { id },
      data: { name: body.name, specification: body.specification || null, material: body.material || null, brand: body.brand || null, categoryId: body.categoryId, locationId: body.locationId || null, quantity: typeof body.quantity === "number" ? body.quantity : undefined, minQuantity: body.minQuantity || 1, unit: body.unit || "把", price: body.price ? parseFloat(body.price) : null, notes: body.notes || null, status: body.status || undefined },
      include: { category: true, location: true },
    });
    return json({ success: true, tool });
  } catch { return json({ success: false, message: "更新失败" }, { status: 500 }); }
};

export const DELETE: RequestHandler = async ({ request, params }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return json({ success: false, message: "未登录" }, { status: 401 });
  try {
    const payload = verifyToken(token);
    if (payload.role !== "ADMIN") return json({ success: false, message: "权限不足" }, { status: 403 });
    await prisma.tool.update({ where: { id: parseInt(params.id) }, data: { status: "SCRAPPED" } });
    return json({ success: true });
  } catch { return json({ success: false, message: "删除失败" }, { status: 500 }); }
};
