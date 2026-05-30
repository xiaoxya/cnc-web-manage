import { getTokenFromCookies, verifyToken } from "$lib/server/auth";
import { prisma } from "$lib/server/db";
import { generateReferenceNo } from "$lib/utils";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, cookies }) => {
  const token = getTokenFromCookies(request.headers.get("cookie"));
  if (!token) return json({ success: false, message: "未登录" }, { status: 401 });

  try {
    const payload = verifyToken(token);
    const body = await request.json();
    const { type, items, referenceNo } = body;

    if (!["IN", "OUT"].includes(type)) {
      return json({ success: false, message: "无效的操作类型" }, { status: 400 });
    }

    const refNo = referenceNo || generateReferenceNo(type);
    let count = 0;

    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const tool = await tx.tool.findUnique({ where: { id: item.toolId } });
        if (!tool) continue;

        const qty = type === "IN" ? item.quantity : -item.quantity;
        const newQty = tool.quantity + qty;
        if (newQty < 0) throw new Error(`刀具 ${tool.toolCode} 库存不足`);

        await tx.tool.update({
          where: { id: item.toolId },
          data: {
            quantity: newQty,
            status: newQty === 0 ? "IN_USE" : "IN_STOCK",
          },
        });

        await tx.toolTransaction.create({
          data: {
            toolId: item.toolId,
            type,
            quantity: item.quantity,
            operatorId: payload.userId,
            referenceNo: refNo,
            notes: item.notes || null,
          },
        });
        count++;
      }
    });

    return json({ success: true, count, referenceNo: refNo });
  } catch (e: any) {
    console.error("Batch transaction error:", e);
    return json({ success: false, message: e.message || "操作失败" }, { status: 500 });
  }
};
