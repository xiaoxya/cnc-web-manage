import { getTokenFromCookies, verifyToken } from "$lib/server/auth";
import { prisma } from "$lib/server/db";
import { isAdmin } from "$lib/server/permissions";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ request }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return json([], { status: 401 });
  try {
    verifyToken(token);
    const locations = await prisma.location.findMany({ orderBy: { code: "asc" } });
    return json(locations);
  } catch { return json([]); }
};

export const POST: RequestHandler = async ({ request }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return json({ success: false }, { status: 401 });
  try {
    const payload = verifyToken(token);
    if (!isAdmin(payload.role)) return json({ success: false, message: "权限不足" }, { status: 403 });
    const body = await request.json();
    const loc = await prisma.location.create({ data: { code: body.code, name: body.name, description: body.description || null } });
    return json({ success: true, location: loc });
  } catch { return json({ success: false, message: "创建失败" }, { status: 500 }); }
};

export const PUT: RequestHandler = async ({ request }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return json({ success: false }, { status: 401 });
  try {
    const payload = verifyToken(token);
    if (!isAdmin(payload.role)) return json({ success: false, message: "权限不足" }, { status: 403 });
    const body = await request.json();
    const loc = await prisma.location.update({ where: { id: body.id }, data: { code: body.code, name: body.name, description: body.description || null } });
    return json({ success: true, location: loc });
  } catch { return json({ success: false, message: "更新失败" }, { status: 500 }); }
};

export const DELETE: RequestHandler = async ({ request, url }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return json({ success: false }, { status: 401 });
  try {
    const payload = verifyToken(token);
    if (!isAdmin(payload.role)) return json({ success: false, message: "权限不足" }, { status: 403 });
    const id = parseInt(url.searchParams.get("id") || "0");
    await prisma.location.delete({ where: { id } });
    return json({ success: true });
  } catch { return json({ success: false, message: "删除失败" }, { status: 500 }); }
};
