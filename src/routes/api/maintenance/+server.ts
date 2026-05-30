import { getTokenFromCookies, verifyToken } from "$lib/server/auth";
import { prisma } from "$lib/server/db";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ request, url }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return json([], { status: 401 });
  try {
    verifyToken(token);
    const status = url.searchParams.get("status");
    const search = url.searchParams.get("search") || "";
    const where: any = {};
    if (status) where.status = status;
    if (search) where.tool = { OR: [{ toolCode: { contains: search } }, { name: { contains: search } }] };

    const records = await prisma.maintenanceRecord.findMany({
      where,
      include: { tool: { select: { toolCode: true, name: true } }, reporter: { select: { displayName: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return json(records);
  } catch { return json([]); }
};

export const POST: RequestHandler = async ({ request, cookies }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return json({ success: false, message: "未登录" }, { status: 401 });
  try {
    const payload = verifyToken(token);
    const body = await request.json();

    const record = await prisma.$transaction(async (tx) => {
      await tx.tool.update({ where: { id: body.toolId }, data: { status: "MAINTENANCE" } });
      return tx.maintenanceRecord.create({
        data: { toolId: body.toolId, description: body.description, reporterId: payload.userId, notes: body.notes || null },
        include: { tool: { select: { toolCode: true, name: true } }, reporter: { select: { displayName: true } } },
      });
    });

    return json({ success: true, record });
  } catch { return json({ success: false, message: "报修失败" }, { status: 500 }); }
};
