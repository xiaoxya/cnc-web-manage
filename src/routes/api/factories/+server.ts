import { getTokenFromCookies, verifyToken } from "$lib/server/auth";
import { prisma } from "$lib/server/db";
import { validateBody, apiError, apiSuccess } from "$lib/server/validation";
import { z } from "zod";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

const factorySchema = z.object({
  code: z.string().min(1, "编码不能为空").max(50),
  name: z.string().min(1, "名称不能为空").max(200),
  description: z.string().optional().nullable(),
});

export const GET: RequestHandler = async ({ request }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return json([]);
  try {
    verifyToken(token);
    const factories = await prisma.factory.findMany({ orderBy: { code: "asc" } });
    return json(factories);
  } catch (e) {
    console.error("GET factories error:", e);
    return json([]);
  }
};

export const POST: RequestHandler = async ({ request }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return apiError("未登录", 401);
  try {
    const payload = verifyToken(token);
    if (payload.role !== "ADMIN") return apiError("权限不足", 403);

    const body = await request.json();
    const parsed = validateBody(factorySchema, body);
    if (!parsed.success) return apiError(parsed.error, 400);

    const factory = await prisma.factory.create({ data: parsed.data });
    return apiSuccess({ factory: factory as unknown as Record<string, unknown> });
  } catch (e) {
    console.error("POST factories error:", e);
    return apiError("创建失败");
  }
};

export const PUT: RequestHandler = async ({ request }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return apiError("未登录", 401);
  try {
    const payload = verifyToken(token);
    if (payload.role !== "ADMIN") return apiError("权限不足", 403);

    const url = new URL(request.url);
    const id = parseInt(url.searchParams.get("id") || "0");
    if (!id) return apiError("无效ID", 400);

    const body = await request.json();
    const parsed = validateBody(factorySchema, body);
    if (!parsed.success) return apiError(parsed.error, 400);

    await prisma.factory.update({ where: { id }, data: parsed.data });
    return apiSuccess({});
  } catch (e) {
    console.error("PUT factories error:", e);
    return apiError("更新失败");
  }
};

export const DELETE: RequestHandler = async ({ request }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return apiError("未登录", 401);
  try {
    const payload = verifyToken(token);
    if (payload.role !== "ADMIN") return apiError("权限不足", 403);

    const url = new URL(request.url);
    const id = parseInt(url.searchParams.get("id") || "0");
    if (!id) return apiError("无效ID", 400);
    await prisma.factory.delete({ where: { id } });
    return apiSuccess({});
  } catch (e) {
    console.error("DELETE factories error:", e);
    return apiError("删除失败");
  }
};