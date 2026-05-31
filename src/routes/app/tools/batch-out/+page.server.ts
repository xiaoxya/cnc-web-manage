import { getTokenFromCookies, verifyToken } from "$lib/server/auth";
import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ request }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) throw redirect(303, "/login");

  try {
    const payload = verifyToken(token);
    if (payload.role !== "ADMIN") {
      throw redirect(303, "/app/tools");
    }
  } catch {
    throw redirect(303, "/login");
  }

  return {};
};
