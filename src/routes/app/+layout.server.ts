import { getTokenFromCookies, verifyToken } from "$lib/server/auth";
import { prisma } from "$lib/server/db";
import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ request, cookies }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));

  if (!token) {
    throw redirect(303, "/login");
  }

  try {
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, username: true, displayName: true, role: true },
    });

    if (!user || !user.role) {
      throw redirect(303, "/login");
    }

    return { user };
  } catch {
    cookies.delete("token", { path: "/" });
    throw redirect(303, "/login");
  }
};
