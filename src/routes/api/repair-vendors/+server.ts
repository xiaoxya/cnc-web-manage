import { getTokenFromCookies, verifyToken } from "$lib/server/auth";
import { prisma } from "$lib/server/db";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ request }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return json([]);
  try {
    verifyToken(token);
    const vendors = await prisma.repairVendor.findMany({ orderBy: { name: "asc" } });
    return json(vendors);
  } catch { return json([]); }
};

export const POST: RequestHandler = async ({ request }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return json({ success: false }, { status: 401 });
  try {
    const payload = verifyToken(token);
    if (payload.role !== "ADMIN") return json({ success: false, message: "权限不足" }, { status: 403 });
    const body = await request.json();
    const vendor = await prisma.repairVendor.create({ data: { name: body.name } });
    return json({ success: true, vendor });
  } catch { return json({ success: false, message: "创建失败" }, { status: 500 }); }
};

export const PUT: RequestHandler = async ({ request }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return json({ success: false }, { status: 401 });
  try {
    const payload = verifyToken(token);
    if (payload.role !== "ADMIN") return json({ success: false, message: "权限不足" }, { status: 403 });
    const url = new URL(request.url);
    const id = parseInt(url.searchParams.get("id") || "0");
    const body = await request.json();
    await prisma.repairVendor.update({ where: { id }, data: { name: body.name } });
    return json({ success: true });
  } catch { return json({ success: false, message: "更新失败" }, { status: 500 }); }
};

export const DELETE: RequestHandler = async ({ request }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return json({ success: false }, { status: 401 });
  try {
    const payload = verifyToken(token);
    if (payload.role !== "ADMIN") return json({ success: false, message: "权限不足" }, { status: 403 });
    const url = new URL(request.url);
    const id = parseInt(url.searchParams.get("id") || "0");
    await prisma.repairVendor.delete({ where: { id } });
    return json({ success: true });
  } catch { return json({ success: false, message: "删除失败" }, { status: 500 }); }
};
