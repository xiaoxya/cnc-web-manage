import { prisma } from "$lib/server/db";
import { verifyPassword, signToken } from "$lib/server/auth";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    const formData = await request.formData();
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;

    if (!username || !password) {
      return json({ success: false, message: "用户名和密码不能为空" });
    }

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user || !user.active) {
      return json({ success: false, message: "用户名或密码错误" });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return json({ success: false, message: "用户名或密码错误" });
    }

    const token = signToken(user);

    cookies.set("token", token, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
    });

    return json({ success: true });
  } catch (e) {
    console.error("Login error:", e);
    return json({ success: false, message: "服务器错误" });
  }
};
