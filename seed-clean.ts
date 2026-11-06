import prisma from "./src/prisma";

async function main() {
  // تحديث أسماء المنتجات باللغة العربية الصريحة
  await prisma.product.upsert({
    where: { id: 1 },
    update: { name: "لابتوب Dell G15", price: 32000, stock: 8 },
    create: { id: 1, name: "لابتوب Dell G15", price: 32000, stock: 8 },
  });

  await prisma.product.upsert({
    where: { id: 2 },
    update: { name: "آيفون 15 برو ماكس", price: 54000, stock: 6 },
    create: { id: 2, name: "آيفون 15 برو ماكس", price: 54000, stock: 6 },
  });

  await prisma.product.upsert({
    where: { id: 3 },
    update: { name: "سماعة AirPods Pro 2", price: 9500, stock: 15 },
    create: { id: 3, name: "سماعة AirPods Pro 2", price: 9500, stock: 15 },
  });

  await prisma.product.create({
    data: { name: "ساعة Apple Watch Series 9", price: 18500, stock: 10 },
  });

  console.log("✅ تم ضبط وترميز المنتجات العربية بنجاح في قاعدة البيانات!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
