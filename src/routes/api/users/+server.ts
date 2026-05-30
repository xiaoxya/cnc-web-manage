import { getTokenFromCookies, verifyToken, hashPassword } from "$lib/server/auth";
import { prisma } from "$lib/server/db";
import { isAdmin } from "$lib/server/permissions";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ request }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return json([], { status: 401 });
  try {
    const payload = verifyToken(token);
    if (!isAdmin(payload.role)) return json([], { status: 403 });
    const users = await prisma.user.findMany({
      select: { id: true, username: true, displayName: true, role: true, active: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    return json(users);
  } catch { return json([]); }
};

export const POST: RequestHandler = async ({ request }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return json({ success: false }, { status: 401 });
  try {
    const payload = verifyToken(token);
    if (!isAdmin(payload.role)) return json({ success: false, message: "权限不足" }, { status: 403 });
    const body = await request.json();
    if (!body.password || body.password.length < 6) return json({ success: false, message: "密码至少6位" }, { status: 400 });
    const user = await prisma.user.create({
      data: { username: body.username, passwordHash: await hashPassword(body.password), displayName: body.displayName, role: body.role || "OPERATOR", active: body.active !== false },
      select: { id: true, username: true, displayName: true, role: true, active: true, createdAt: true },
    });
    return json({ success: true, user });
  } catch (e: any) {
    if (e.code === "P2002") return json({ success: false, message: "用户名已存在" }, { status: 400 });
    return json({ success: false, message: "创建失败" }, { status: 500 });
  }
};

export const PUT: RequestHandler = async ({ request }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return json({ success: false }, { status: 401 });
  try {
    const payload = verifyToken(token);
    if (!isAdmin(payload.role)) return json({ success: false, message: "权限不足" }, { status: 403 });
    const body = await request.json();
    const data: any = { displayName: body.displayName, role: body.role, active: body.active };
    if (body.password) data.passwordHash = await hashPassword(body.password);
    const user = await prisma.user.update({
      where: { id: body.id },
      data,
      select: { id: true, username: true, displayName: true, role: true, active: true, createdAt: true },
    });
    return json({ success: true, user });
  } catch { return json({ success: false, message: "更新失败" }, { status: 500 }); }
};

export const DELETE: RequestHandler = async ({ request, url }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return json({ success: false }, { status: 401 });
  try {
    const payload = verifyToken(token);
    if (!isAdmin(payload.role)) return json({ success: false, message: "权限不足" }, { status: 403 });
    const id = parseInt(url.searchParams.get("id") || "0");
    await prisma.user.delete({ where: { id } });
    return json({ success: true });
  } catch { return json({ success: false, message: "删除失败" }, { status: 500 }); }
};
