import { prisma } from "$lib/server/db";
import type { Prisma } from "@prisma/client";

export async function generateToolCode(
  categoryId: number,
  tx?: Prisma.TransactionClient
): Promise<string> {
  const client = tx || prisma;
  const category = await client.toolCategory.update({
    where: { id: categoryId },
    data: { counter: { increment: 1 } },
  });
  const padded = String(category.counter).padStart(4, "0");
  return category.code + "-" + padded;
}
