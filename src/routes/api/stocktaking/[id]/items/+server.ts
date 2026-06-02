import { getTokenFromCookies, verifyToken } from "$lib/server/auth";
import { prisma } from "$lib/server/db";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ request, params }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return json([], { status: 401 });
  try {
    verifyToken(token);
    const id = parseInt(params.id);
    const items = await prisma.stocktakingItem.findMany({
      where: { stocktakingId: id },
      include: {
        tool: {
          select: {
            id: true,
            toolCode: true,
            name: true,
            specification: true,
          },
        },
      },
    });
    return json(items);
  } catch (e) {
    console.error("GET stocktaking items error:", e);
    return json([]);
  }
};
