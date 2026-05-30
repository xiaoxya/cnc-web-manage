import { getTokenFromCookies, verifyToken } from "$lib/server/auth";
import { prisma } from "$lib/server/db";
import { isAdmin } from "$lib/server/permissions";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ request, url }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return json([], { status: 401 });
  try {
    verifyToken(token);
    const categoryId = url.searchParams.get("categoryId");
    const where = categoryId ? { categoryId: parseInt(categoryId) } : {};
    const specs = await prisma.spec.findMany({
      where,
      include: { category: { select: { name: true, code: true } } },
      orderBy: { name: "asc" },
    });
    return json(specs);
  } catch { return json([]); }
};

export const POST: RequestHandler = async ({ request }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return json({ success: false }, { status: 401 });
  try {
    const payload = verifyToken(token);
    if (!isAdmin(payload.role)) return json({ success: false, message: "权限不足" }, { status: 403 });
    const body = await request.json();
    const spec = await prisma.spec.create({
      data: { name: body.name, categoryId: body.categoryId || null },
    });
    return json({ success: true, spec });
  } catch { return json({ success: false, message: "创建失败" }, { status: 500 }); }
};

export const PUT: RequestHandler = async ({ request }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return json({ success: false }, { status: 401 });
  try {
    const payload = verifyToken(token);
    if (!isAdmin(payload.role)) return json({ success: false, message: "权限不足" }, { status: 403 });
    const body = await request.json();
    const spec = await prisma.spec.update({
      where: { id: body.id },
      data: { name: body.name, categoryId: body.categoryId || null },
    });
    return json({ success: true, spec });
  } catch { return json({ success: false, message: "更新失败" }, { status: 500 }); }
};

export const DELETE: RequestHandler = async ({ request, url }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return json({ success: false }, { status: 401 });
  try {
    const payload = verifyToken(token);
    if (!isAdmin(payload.role)) return json({ success: false, message: "权限不足" }, { status: 403 });
    const id = parseInt(url.searchParams.get("id") || "0");
    await prisma.spec.delete({ where: { id } });
    return json({ success: true });
  } catch { return json({ success: false, message: "删除失败" }, { status: 500 }); }
};
