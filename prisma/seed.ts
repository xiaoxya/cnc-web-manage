import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create admin user
  const adminPassword = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      passwordHash: adminPassword,
      role: "ADMIN",
      displayName: "系统管理员",
    },
  });

  // Create operator user
  const operatorPassword = await bcrypt.hash("operator123", 10);
  await prisma.user.upsert({
    where: { username: "operator" },
    update: {},
    create: {
      username: "operator",
      passwordHash: operatorPassword,
      role: "OPERATOR",
      displayName: "操作员",
    },
  });

  // Create tool categories
  const categories = [
    { code: "LAT", name: "车刀", description: "车床用刀具" },
    { code: "MIL", name: "铣刀", description: "铣床用刀具" },
    { code: "DRL", name: "钻头", description: "钻孔用刀具" },
    { code: "GRD", name: "磨刀", description: "磨削用刀具" },
    { code: "TAP", name: "丝锥", description: "攻丝用刀具" },
    { code: "CTT", name: "刀片", description: "可转位刀片" },
    { code: "REAM", name: "铰刀", description: "铰孔用刀具" },
    { code: "OTH", name: "其他", description: "其他刀具" },
  ];

  for (const cat of categories) {
    const existing = await prisma.toolCategory.findFirst({
      where: { code: cat.code, name: cat.name },
    });
    if (!existing) {
      await prisma.toolCategory.create({ data: cat });
    }
  }

  // Create sample locations
  const locations = [
    { code: "A-01-01", name: "A货架第1层第1格" },
    { code: "A-01-02", name: "A货架第1层第2格" },
    { code: "A-01-03", name: "A货架第1层第3格" },
    { code: "A-02-01", name: "A货架第2层第1格" },
    { code: "A-02-02", name: "A货架第2层第2格" },
    { code: "B-01-01", name: "B货架第1层第1格" },
    { code: "B-01-02", name: "B货架第1层第2格" },
    { code: "B-02-01", name: "B货架第2层第1格" },
    { code: "C-01-01", name: "C货架第1层第1格" },
    { code: "WORK-01", name: "1号机床工作位" },
    { code: "WORK-02", name: "2号机床工作位" },
  ];

  for (const loc of locations) {
    await prisma.location.upsert({
      where: { code: loc.code },
      update: {},
      create: loc,
    });
  }

  console.log("Seed completed!");
  console.log("Admin credentials: admin / admin123");
  console.log("Operator credentials: operator / operator123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
