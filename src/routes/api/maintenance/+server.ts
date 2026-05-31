import { getTokenFromCookies, verifyToken } from "$lib/server/auth";
import { prisma } from "$lib/server/db";
import { validateBody, apiError, apiSuccess } from "$lib/server/validation";
import { maintenanceSchema } from "$lib/schemas";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ request, url }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return json([], { status: 401 });
  try {
    verifyToken(token);
    const status = url.searchParams.get("status");
    const search = url.searchParams.get("search") || "";
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (search) where.tool = { OR: [{ toolCode: { contains: search } }, { name: { contains: search } }] };

    const records = await prisma.maintenanceRecord.findMany({
      where,
      include: { tool: { select: { toolCode: true, name: true } }, reporter: { select: { displayName: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return json(records);
  } catch (e) {
    console.error("GET maintenance error:", e);
    return json([]);
  }
};

export const POST: RequestHandler = async ({ request, cookies }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return apiError("未登录", 401);
  try {
    const payload = verifyToken(token);
    const body = await request.json();

    const parsed = validateBody(maintenanceSchema, body);
    if (!parsed.success) return apiError(parsed.error, 400);

    const record = await prisma.$transaction(async (tx) => {
      await tx.tool.update({
        where: { id: parsed.data.toolId },
        data: { status: "MAINTENANCE", maintenanceCount: { increment: 1 } },
      });
      return tx.maintenanceRecord.create({
        data: {
          toolId: parsed.data.toolId,
          description: parsed.data.description,
          reporterId: payload.userId,
          notes: parsed.data.notes ?? null,
          repairVendor: (body as Record<string, unknown>).repairVendor as string ?? null,
        },
        include: { tool: { select: { toolCode: true, name: true } }, reporter: { select: { displayName: true } } },
      });
    });

    return apiSuccess({ record: record as unknown as Record<string, unknown> });
  } catch (e) {
    console.error("POST maintenance error:", e);
    return apiError("报修失败");
  }
};