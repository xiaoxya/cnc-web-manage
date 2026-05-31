import { getTokenFromCookies, verifyToken } from "$lib/server/auth";
import { prisma } from "$lib/server/db";
import { validateBody, apiError, apiSuccess } from "$lib/server/validation";
import { z } from "zod";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

const toolUpdateSchema = z.object({
  name: z.string().min(1).max(200),
  specification: z.string().optional().nullable(),
  material: z.string().optional().nullable(),
  brand: z.string().optional().nullable(),
  categoryId: z.number().int().positive(),
  locationId: z.number().int().positive().optional().nullable(),
  quantity: z.number().int().min(0).optional(),
  minQuantity: z.number().int().min(0).optional(),
  unit: z.string().optional(),
  price: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(["IN_STOCK", "IN_USE", "MAINTENANCE", "SCRAPPED"]).optional(),
});

export const GET: RequestHandler = async ({ request, params }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return json(null, { status: 401 });
  try {
    verifyToken(token);
    const id = parseInt(params.id ?? "0");
    const tool = await prisma.tool.findUnique({
      where: { id },
      include: { category: true, location: true,
        transactions: { orderBy: { createdAt: "desc" }, take: 50, include: { operator: { select: { displayName: true } } } },
        maintenance: { orderBy: { createdAt: "desc" }, include: { reporter: { select: { displayName: true } } } },
      },
    });
    return json(tool);
  } catch (e) {
    console.error("GET tool detail error:", e);
    return json(null, { status: 500 });
  }
};

export const PUT: RequestHandler = async ({ request, params }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return apiError("未登录", 401);
  try {
    verifyToken(token);
    const id = parseInt(params.id ?? "0");
    const body = await request.json();

    const parsed = validateBody(toolUpdateSchema, body);
    if (!parsed.success) return apiError(parsed.error, 400);

    const updateData: Record<string, unknown> = { ...parsed.data };
    const tool = await prisma.tool.update({
      where: { id },
      data: updateData,
      include: { category: true, location: true },
    });
    return apiSuccess({ tool: tool as unknown as Record<string, unknown> });
  } catch (e) {
    console.error("PUT tool error:", e);
    return apiError("更新失败");
  }
};

export const DELETE: RequestHandler = async ({ request, params }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return apiError("未登录", 401);
  try {
    const payload = verifyToken(token);
    if (payload.role !== "ADMIN") return apiError("权限不足", 403);
    await prisma.tool.update({ where: { id: parseInt(params.id ?? "0") }, data: { status: "SCRAPPED" } });
    return apiSuccess({});
  } catch (e) {
    console.error("DELETE tool error:", e);
    return apiError("操作失败");
  }
};
