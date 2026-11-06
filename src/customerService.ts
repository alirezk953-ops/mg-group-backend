import prisma from "./prisma";

export interface CustomerProfile {
  exists: boolean;
  name?: string;
  phone: string;
  totalOrders: number;
  totalSpent: number;
  recentAddresses: string[];
  lastAddress?: string;
  isVip: boolean;
  orders: any[];
}

export class CustomerService {
  /**
   * جلب ملف العميل الكامل وسجل مشترياته بناءً على رقم هاتفه
   */
  static async getCustomerProfile(phone: string): Promise<CustomerProfile> {
    const rawClean = phone.replace(/[^0-9]/g, "");
    
    // إعداد احتمالات الرقم المصري (01xxxxxxxxx أو 201xxxxxxxxx)
    const phoneVariants = [
      rawClean,
      rawClean.startsWith("20") ? rawClean.slice(2) : `20${rawClean}`,
      rawClean.startsWith("0") ? rawClean : `0${rawClean}`,
    ];

    const user = await prisma.user.findFirst({
      where: {
        phone: { in: phoneVariants },
      },
      include: {
        orders: {
          orderBy: { createdAt: "desc" },
          include: {
            items: {
              include: { product: true },
            },
          },
        },
      },
    });

    if (!user) {
      return {
        exists: false,
        phone,
        totalOrders: 0,
        totalSpent: 0,
        recentAddresses: [],
        isVip: false,
        orders: [],
      };
    }

    const totalOrders = user.orders.length;
    const completedOrders = user.orders.filter((o) => o.status === "Completed");
    const totalSpent = completedOrders.reduce((sum, o) => sum + o.total, 0);

    // تجميع العناوين الفريدة المسجلة
    const addresses = Array.from(
      new Set([user.address, ...user.orders.map((o) => user.address)].filter(Boolean))
    );

    // العميل يعتبر VIP إذا طلب 3 مرات أو أكثر أو تخطى إجمالي مشترياته 15,000 ج.م
    const isVip = totalOrders >= 3 || totalSpent >= 15000;

    return {
      exists: true,
      name: user.name,
      phone: user.phone,
      totalOrders,
      totalSpent,
      recentAddresses: addresses,
      lastAddress: user.address,
      isVip,
      orders: user.orders,
    };
  }

  /**
   * جلب قائمة جميع العملاء مع إحصائياتهم للداشبورد (CRM)
   */
  static async getAllCustomers() {
    const users = await prisma.user.findMany({
      include: {
        orders: {
          select: {
            id: true,
            total: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return users.map((u) => {
      const completedOrders = u.orders.filter((o) => o.status === "Completed");
      const totalSpent = completedOrders.reduce((acc, o) => acc + o.total, 0);
      const isVip = u.orders.length >= 3 || totalSpent >= 15000;

      return {
        id: u.id,
        name: u.name,
        phone: u.phone,
        address: u.address,
        totalOrders: u.orders.length,
        completedOrders: completedOrders.length,
        totalSpent,
        isVip,
        lastOrderDate: u.orders[0]?.createdAt || null,
        createdAt: u.createdAt,
      };
    });
  }
}
