import { prisma } from "$lib/server/db";

export async function generateToolCode(categoryId: number): Promise<string> {
  const result = await prisma.$transaction(async (tx) => {
    const category = await tx.toolCategory.update({
      where: { id: categoryId },
      data: { counter: { increment: 1 } },
    });
    const padded = String(category.counter).padStart(4, "0");
    return `${category.code}-${padded}`;
  });
  return result;
}
