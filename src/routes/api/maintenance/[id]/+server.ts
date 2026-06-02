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
      include: { tool: { select: { toolCode: true, name: true, status: true } }, reporter: { select: { displayName: true } } },
    });
    return json(record);
  } catch { return json(null); }
};

export const PUT: RequestHandler = async ({ request, params }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return json({ success: false, message: "not logged in" }, { status: 401 });
  try {
    const payload = verifyToken(token);
    const id = parseInt(params.id ?? "0");
    const body = await request.json();

    const record = await prisma.$transaction(async (tx) => {
      const maintRecord = await tx.maintenanceRecord.findUnique({ where: { id } });
      if (!maintRecord) throw new Error("Record not found");

      const tool = await tx.tool.findUnique({ where: { id: maintRecord.toolId } });
      if (!tool) throw new Error("Tool not found");

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
        where: { id: maintRecord.toolId },
        data: {
          status: "IN_STOCK",
          quantity: tool.quantity === 0 ? 1 : tool.quantity,
        },
      });
      return updated;
    });

    return json({ success: true, record });
  } catch (e) {
    console.error(e);
    return json({ success: false, message: "operation failed" }, { status: 500 });
  }
};
