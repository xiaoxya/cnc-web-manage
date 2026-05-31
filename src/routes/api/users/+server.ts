import { getTokenFromCookies, verifyToken, hashPassword } from "$lib/server/auth";
import { prisma } from "$lib/server/db";
import { isAdmin } from "$lib/server/permissions";
import { validateBody, apiError, apiSuccess } from "$lib/server/validation";
import { userSchema } from "$lib/schemas";
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
  } catch (e) {
    console.error("GET users error:", e);
    return json([]);
  }
};

export const POST: RequestHandler = async ({ request }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return apiError("未登录", 401);
  try {
    const payload = verifyToken(token);
    if (!isAdmin(payload.role)) return apiError("权限不足", 403);

    const body = await request.json();
    const parsed = validateBody(userSchema, body);
    if (!parsed.success) return apiError(parsed.error, 400);

    const user = await prisma.user.create({
      data: {
        username: parsed.data.username,
        passwordHash: await hashPassword(parsed.data.password || ""),
        displayName: parsed.data.displayName,
        role: parsed.data.role,
        active: parsed.data.active,
      },
      select: { id: true, username: true, displayName: true, role: true, active: true, createdAt: true },
    });
    return apiSuccess({ user: user as unknown as Record<string, unknown> });
  } catch (e) {
    const err = e as { code?: string };
    if (err.code === "P2002") return apiError("用户名已存在", 400);
    console.error("POST users error:", e);
    return apiError("创建失败");
  }
};

export const PUT: RequestHandler = async ({ request }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return apiError("未登录", 401);
  try {
    const payload = verifyToken(token);
    if (!isAdmin(payload.role)) return apiError("权限不足", 403);

    const body = await request.json();
    const data: Record<string, unknown> = { displayName: body.displayName, role: body.role, active: body.active };
    if (body.password) data.passwordHash = await hashPassword(body.password);

    const user = await prisma.user.update({
      where: { id: body.id },
      data,
      select: { id: true, username: true, displayName: true, role: true, active: true, createdAt: true },
    });
    return apiSuccess({ user: user as unknown as Record<string, unknown> });
  } catch (e) {
    console.error("PUT users error:", e);
    return apiError("更新失败");
  }
};

export const DELETE: RequestHandler = async ({ request, url }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return apiError("未登录", 401);
  try {
    const payload = verifyToken(token);
    if (!isAdmin(payload.role)) return apiError("权限不足", 403);

    const id = parseInt(url.searchParams.get("id") || "0");
    if (!id) return apiError("无效ID", 400);
    await prisma.user.delete({ where: { id } });
    return apiSuccess({});
  } catch (e) {
    console.error("DELETE users error:", e);
    return apiError("删除失败");
  }
};