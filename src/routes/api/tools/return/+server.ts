import { getTokenFromCookies, verifyToken } from "$lib/server/auth";
import { prisma } from "$lib/server/db";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, cookies }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return json({ success: false, message: "未登录" }, { status: 401 });

  try {
    const payload = verifyToken(token);
    if (payload.role !== "ADMIN") return json({ success: false, message: "权限不足" }, { status: 403 });
    const body = await request.json();
    const { toolId, factoryId, quantity } = body;
    const qty = quantity || 1;

    if (!toolId) {
      return json({ success: false, message: "缺少刀具ID" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const tool = await tx.tool.findUnique({ where: { id: toolId } });
      if (!tool) throw new Error("刀具不存在");
      if (tool.status === "SCRAPPED") throw new Error("已报废刀具不可回收");

      const newQty = tool.quantity + qty;

      await tx.tool.update({
        where: { id: toolId },
        data: {
          quantity: newQty,
          status: newQty > 0 ? "IN_STOCK" : tool.status,
        },
      });

      const record = await tx.toolTransaction.create({
        data: {
          toolId,
          type: "IN",
          quantity: qty,
          operatorId: payload.userId,
          referenceNo: `RT-${Date.now().toString(36).toUpperCase()}`,
          notes: factoryId ? `工厂回收 (factoryId:${factoryId})` : "工厂回收",
          factoryId: factoryId || null,
        },
      });

      return { tool, record, newQty };
    });

    return json({ success: true, tool: result.tool, newQuantity: result.newQty });
  } catch (e: any) {
    console.error("Return error:", e);
    return json({ success: false, message: e.message || "回收失败" }, { status: 500 });
  }
};
