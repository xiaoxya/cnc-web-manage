import { prisma } from "$lib/server/db";
import { verifyPassword, signToken } from "$lib/server/auth";
import { validateBody, apiError, apiSuccess } from "$lib/server/validation";
import { loginSchema } from "$lib/schemas";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    let username = "";
    let password = "";
    const ct = request.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const body = await request.json();
      username = body.username || "";
      password = body.password || "";
    } else {
      const formData = await request.formData();
      username = formData.get("username") as string;
      password = formData.get("password") as string;
    }

    const parsed = validateBody(loginSchema, { username, password });
    if (!parsed.success) return apiError(parsed.error, 400);

    const user = await prisma.user.findUnique({
      where: { username: parsed.data.username },
    });

    if (!user || !user.active) {
      return apiError("用户名或密码错误", 401);
    }

    const valid = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!valid) {
      return apiError("用户名或密码错误", 401);
    }

    const token = signToken(user);

    const forwardedProto = request.headers.get("x-forwarded-proto");
    const isSecure = forwardedProto === "https";

    cookies.set("token", token, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: isSecure,
      maxAge: 60 * 60 * 24,
    });

    return apiSuccess({});
  } catch (e) {
    console.error("Login error:", e);
    return apiError("服务器错误");
  }
};