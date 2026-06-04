import { getTokenFromCookies, verifyToken } from "$lib/server/auth";
import { prisma } from "$lib/server/db";
import { validateBody, apiError } from "$lib/server/validation";
import { maintenanceCompleteSchema } from "$lib/schemas";
import { Prisma } from "@prisma/client";
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
    const parsed = validateBody(maintenanceCompleteSchema, body);
    if (!parsed.success) return apiError(parsed.error, 400);
    const { cost, notes, repairVendor } = parsed.data;

    const record = await prisma.$transaction(async (tx) => {
      const maintRecord = await tx.maintenanceRecord.findUnique({ where: { id } });
      if (!maintRecord) throw new Error("Record not found");

      const tool = await tx.tool.findUnique({ where: { id: maintRecord.toolId } });
      if (!tool) throw new Error("Tool not found");

      const wasInUse = maintRecord.previousStatus === "IN_USE";
      const restoredStatus = wasInUse ? "IN_USE" : "IN_STOCK";
      const restoredQuantity = wasInUse ? tool.quantity : (tool.quantity > 0 ? tool.quantity : 1);

      const updated = await tx.maintenanceRecord.update({
        where: { id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          cost,
          notes,
          repairVendor,
        },
      });

      await tx.tool.update({
        where: { id: maintRecord.toolId },
        data: {
          status: restoredStatus,
          quantity: restoredQuantity,
        },
      });
      return updated;
    });

    return json({ success: true, record });
  } catch (e) {
    console.error("Complete maintenance error:", e);
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      return json({ success: false, message: e.message }, { status: 500 });
    }
    return json({ success: false, message: e instanceof Error ? e.message : "operation failed" }, { status: 500 });
  }
};
