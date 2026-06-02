import { getTokenFromCookies, verifyToken } from "$lib/server/auth";
import { prisma } from "$lib/server/db";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ request, params }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return json(null, { status: 401 });
  try {
    verifyToken(token);
    const record = await prisma.maintenanceRecord.findUnique({
      where: { id: parseInt(params.id ?? "0") },
      include: { tool: { select: { toolCode: true, name: true } }, reporter: { select: { displayName: true } } },
    });
    return json(record);
  } catch { return json(null); }
};

export const PUT: RequestHandler = async ({ request, params }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return json({ success: false, message: "未登录" }, { status: 401 });
  try {
    const payload = verifyToken(token);
    const id = parseInt(params.id ?? "0");
    const body = await request.json();

    const record = await prisma.$transaction(async (tx) => {
      const updated = await tx.maintenanceRecord.update({
        where: { id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          cost: body.cost ? String(body.cost) : null,
          notes: body.notes || null,
          repairVendor: body.repairVendor || null,
        },
      });
      await tx.tool.update({
        where: { id: updated.toolId },
        data: { status: "IN_STOCK" },
      });
      return updated;
    });

    return json({ success: true, record });
  } catch (e) {
    console.error(e);
    return json({ success: false, message: "操作失败" }, { status: 500 });
  }
};