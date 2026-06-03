import { getTokenFromCookies, verifyToken } from "$lib/server/auth";
import { prisma } from "$lib/server/db";
import { isAdmin } from "$lib/server/permissions";
import { validateBody, apiError, apiSuccess } from "$lib/server/validation";
import { categorySchema } from "$lib/schemas";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ request }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return json([], { status: 401 });
  try {
    verifyToken(token);
    const categories = await prisma.toolCategory.findMany({
      orderBy: [{ code: "asc" }, { name: "asc" }],
    });
    return json(categories);
  } catch (e) {
    console.error("GET categories error:", e);
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
    const parsed = validateBody(categorySchema, body);
    if (!parsed.success) return apiError(parsed.error, 400);

    const cat = await prisma.toolCategory.create({ data: parsed.data });
    return apiSuccess({ category: cat as unknown as Record<string, unknown> });
  } catch (e) {
    console.error("POST categories error:", e);
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
    if (!body.id) return apiError("缺少ID", 400);
    const parsed = validateBody(categorySchema, body);
    if (!parsed.success) return apiError(parsed.error, 400);

    const cat = await prisma.toolCategory.update({
      where: { id: body.id },
      data: parsed.data,
    });
    return apiSuccess({ category: cat as unknown as Record<string, unknown> });
  } catch (e) {
    console.error("PUT categories error:", e);
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
    await prisma.toolCategory.delete({ where: { id } });
    return apiSuccess({});
  } catch (e) {
    console.error("DELETE categories error:", e);
    return apiError("删除失败");
  }
};
