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
      where: { id: parseInt(params.id) },
      include: { tool: { select: { toolCode: true, name: true } }, reporter: { select: { displayName: true } } },
    });
    return json(record);
  } catch { return json(null); }
};
