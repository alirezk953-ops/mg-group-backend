import prisma from "./src/prisma";

async function main() {
  await prisma.staff.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      name: "المدير العام (Admin)",
      role: "ADMIN",
      pin: "1234",
    },
  });

  await prisma.staff.upsert({
    where: { username: "employee" },
    update: {},
    create: {
      username: "employee",
      name: "سارة محمود (موظف طلبات)",
      role: "EMPLOYEE",
      pin: "5678",
    },
  });

  await prisma.staff.upsert({
    where: { username: "delivery" },
    update: {},
    create: {
      username: "delivery",
      name: "كابتن طارق (مسؤول الشحن)",
      role: "DELIVERY",
      pin: "0000",
    },
  });

  console.log("✅ تم إعداد مستخدمي النظام والصلاحيات الافتراضية بنجاح!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
