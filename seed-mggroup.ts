import prisma from "./src/prisma";

async function main() {
  console.log("🚀 جاري تهيئة منتجات MG Group للأجهزة الكهربائية والتجهيزات...");

  const productsData = [
    {
      name: "خلاط تجاري ثقيل للمطاعم والكافيهات 2200 وات",
      category: "تجهيزات كافيهات ومطاعم",
      price: 4800,
      wholesalePrice: 3900,
      costPrice: 3200,
      stock: 25,
      showroomStock: 5,
      warehouseStock: 20,
      minStockThreshold: 4,
      warrantyMonths: 24,
    },
    {
      name: "غلاية مياه ستانلس سريعة 2.2 لتر MG Pro",
      category: "أجهزة مطبخ صغيرة",
      price: 850,
      wholesalePrice: 650,
      costPrice: 500,
      stock: 60,
      showroomStock: 15,
      warehouseStock: 45,
      minStockThreshold: 10,
      warrantyMonths: 12,
    },
    {
      name: "دفاية زيت 13 ريشة فاخرة بالتايمر والأمان",
      category: "أجهزة تدفئة ومناخ",
      price: 3400,
      wholesalePrice: 2750,
      costPrice: 2200,
      stock: 30,
      showroomStock: 8,
      warehouseStock: 22,
      minStockThreshold: 5,
      warrantyMonths: 24,
    },
    {
      name: "سخان مياه فوري رقمي تدفق مستمر MG Smart",
      category: "سخانات ومياه",
      price: 5200,
      wholesalePrice: 4300,
      costPrice: 3600,
      stock: 20,
      showroomStock: 4,
      warehouseStock: 16,
      minStockThreshold: 3,
      warrantyMonths: 36,
    },
    {
      name: "كبة لحوم وخضار متعددة الاستخدامات 1000 وات",
      category: "أجهزة مطبخ صغيرة",
      price: 1650,
      wholesalePrice: 1300,
      costPrice: 1000,
      stock: 40,
      showroomStock: 10,
      warehouseStock: 30,
      minStockThreshold: 6,
      warrantyMonths: 18,
    },
    {
      name: "ماكينة اسبريسو احترافية للكافيهات دبل جروب",
      category: "تجهيزات كافيهات ومطاعم",
      price: 16500,
      wholesalePrice: 13800,
      costPrice: 11500,
      stock: 10,
      showroomStock: 2,
      warehouseStock: 8,
      minStockThreshold: 2,
      warrantyMonths: 24,
    },
    {
      name: "مروحة عمودية شبح 18 بوصة ريموت كنترول",
      category: "أجهزة تهوية",
      price: 1950,
      wholesalePrice: 1550,
      costPrice: 1250,
      stock: 35,
      showroomStock: 7,
      warehouseStock: 28,
      minStockThreshold: 5,
      warrantyMonths: 24,
    },
  ];

  for (const item of productsData) {
    const existing = await prisma.product.findFirst({
      where: { name: item.name },
    });

    if (existing) {
      await prisma.product.update({
        where: { id: existing.id },
        data: item,
      });
    } else {
      await prisma.product.create({
        data: item,
      });
    }
  }

  console.log("✅ تم تحديث كتالوج منتجات MG Group بنجاح!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
