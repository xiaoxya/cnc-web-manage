import { getTokenFromCookies, verifyToken } from "$lib/server/auth";
import { prisma } from "$lib/server/db";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ request }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return json(null);

  try {
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, username: true, displayName: true, role: true },
    });
    return json({ user });
  } catch {
    return json(null);
  }
};
