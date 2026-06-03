import { getTokenFromCookies, verifyToken } from "$lib/server/auth";
import { prisma } from "$lib/server/db";
import { isAdmin } from "$lib/server/permissions";
import { validateBody, apiError, apiSuccess } from "$lib/server/validation";
import { specSchema } from "$lib/schemas";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

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
    return apiError("create failed");
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
    return apiError("update failed");
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
    return apiError("delete failed");
  }
};
