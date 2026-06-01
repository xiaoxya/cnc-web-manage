import { prisma } from "$lib/server/db";
import type { Prisma } from "@prisma/client";

export async function generateToolCode(
  categoryId: number,
  tx?: Prisma.TransactionClient
): Promise<string> {
  const client = tx || prisma;

  const category = await client.toolCategory.findUnique({
    where: { id: categoryId },
  });

  if (!category) {
    throw new Error("分类不存在");
  }

  const newCounter = category.counter + 1;

  await client.toolCategory.update({
    where: { id: categoryId },
    data: { counter: newCounter },
  });

  const padded = String(newCounter).padStart(4, "0");
  return category.code + "-" + padded;
}
