import { getTokenFromCookies, verifyToken } from "$lib/server/auth";
import { prisma } from "$lib/server/db";
import { isAdmin } from "$lib/server/permissions";
import { validateBody, apiError, apiSuccess } from "$lib/server/validation";
import { specSchema } from "$lib/schemas";
import { Prisma } from "@prisma/client";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

function specErrorMessage(e: unknown, fallback: string) {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2021") return "规格型号数据表缺失，请先执行数据库迁移";
    if (e.code === "P2003") return "所属分类不存在";
    if (e.code === "P2025") return "规格型号不存在";
  }
  return fallback;
}

export const GET: RequestHandler = async ({ request, url }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return json([], { status: 401 });
  try {
    verifyToken(token);
    const categoryId = url.searchParams.get("categoryId");
    const where = categoryId ? { OR: [{ categoryId: parseInt(categoryId) }, { categoryId: null }] } : {};
    const specs = await prisma.spec.findMany({
      where,
      include: { category: { select: { name: true, code: true } } },
      orderBy: { name: "asc" },
    });
    return json(specs);
  } catch (e) {
    console.error("GET specs error:", e);
    return json([], { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return apiError("not logged in", 401);
  try {
    const payload = verifyToken(token);
    if (!isAdmin(payload.role)) return apiError("permission denied", 403);

    const body = await request.json();
    const parsed = validateBody(specSchema, body);
    if (!parsed.success) return apiError(parsed.error, 400);

    const spec = await prisma.spec.create({ data: parsed.data });
    return apiSuccess({ spec: spec as unknown as Record<string, unknown> });
  } catch (e) {
    console.error("POST specs error:", e);
    return apiError(specErrorMessage(e, "create failed"));
  }
};

export const PUT: RequestHandler = async ({ request }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return apiError("not logged in", 401);
  try {
    const payload = verifyToken(token);
    if (!isAdmin(payload.role)) return apiError("permission denied", 403);

    const body = await request.json();
    if (!body.id) return apiError("missing ID", 400);
    const parsed = validateBody(specSchema, body);
    if (!parsed.success) return apiError(parsed.error, 400);

    const spec = await prisma.spec.update({
      where: { id: body.id },
      data: parsed.data,
    });
    return apiSuccess({ spec: spec as unknown as Record<string, unknown> });
  } catch (e) {
    console.error("PUT specs error:", e);
    return apiError(specErrorMessage(e, "update failed"));
  }
};

export const DELETE: RequestHandler = async ({ request, url }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return apiError("not logged in", 401);
  try {
    const payload = verifyToken(token);
    if (!isAdmin(payload.role)) return apiError("permission denied", 403);

    const id = parseInt(url.searchParams.get("id") || "0");
    if (!id) return apiError("invalid ID", 400);
    await prisma.spec.delete({ where: { id } });
    return apiSuccess({});
  } catch (e) {
    console.error("DELETE specs error:", e);
    return apiError(specErrorMessage(e, "delete failed"));
  }
};
