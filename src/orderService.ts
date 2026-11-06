import prisma from "./prisma";
import { notifyAdminNewOrder, notifyAdminLowStock } from "./adminNotifier";
import { WarrantyService } from "./warrantyService";

export interface OrderItemInput {
  productId: number;
  quantity: number;
  unitPrice?: number;
  priceType?: "RETAIL" | "WHOLESALE";
}

export interface CreateOrderParams {
  name: string;
  phone: string;
  address: string;
  items: OrderItemInput[];
  customerType?: "RETAIL" | "WHOLESALE" | "COMMERCIAL_PROJECT";
  fulfillmentSource?: "SHOWROOM" | "WAREHOUSE";
  source?: "WhatsApp" | "Telegram" | "Dashboard"; // مصدر الأوردر للتنبيهات
}

export class OrderService {
  /**
   * جلب سياق المنتجات الحالية بشكل نصي لتغذية الـ AI مع أسعار الجملة والقطاعي وضمان MG Group
   */
  static async getProductsContext(): Promise<string> {
    const products = await prisma.product.findMany({
      orderBy: { id: "asc" },
    });
    return products
      .map(
        (p) =>
          `- [معرف: ${p.id}] ${p.name} (${p.category}): سعر قطاعي ${p.price.toLocaleString()} ج.م، سعر جملة للتجار والكافيهات ${
            p.wholesalePrice ? p.wholesalePrice.toLocaleString() + " ج.م" : "عند الطلب"
          }، المخزون (المعرض: ${p.showroomStock}، المخزن: ${p.warehouseStock}، الإجمالي: ${p.stock})، ضمان معتمد ${
            p.warrantyMonths
          } شهراً.`
      )
      .join("\n");
  }

  /**
   * إنشاء طلب متكامل مع نظام التسعير المزدوج (B2B vs B2C)، احتساب هامش الربح،
   * خصم المخزون من المعرض أو المخزن، وتسجيل بطاقات الضمان تلقائياً
   */
  static async createOrder(params: CreateOrderParams) {
    const {
      name,
      phone,
      address,
      items,
      customerType = "RETAIL",
      fulfillmentSource = "SHOWROOM",
      source = "Dashboard",
    } = params;

    if (!items || items.length === 0) {
      throw new Error("قائمة المنتجات فارغة");
    }

    // 1. فحص كفاية المخزون واحتساب التسعير المزدوج وتكلفة المنتجات لحساب هامش الربح
    let total = 0;
    let totalCost = 0;
    const orderItemsData: {
      productId: number;
      quantity: number;
      unitPrice: number;
      priceType: string;
      productName: string;
      warrantyMonths: number;
    }[] = [];

    for (const it of items) {
      const product = await prisma.product.findUnique({
        where: { id: it.productId },
      });

      if (!product) {
        throw new Error(`المنتج رقم ${it.productId} غير موجود`);
      }

      if (product.stock < it.quantity) {
        throw new Error(`المخزون غير كافٍ للمنتج: ${product.name} (المتاح إجمالاً: ${product.stock})`);
      }

      // تحديد سعر البيع: جملة أم قطاعي
      let appliedPrice = it.unitPrice;
      let appliedType = it.priceType;

      if (!appliedPrice) {
        if (customerType === "WHOLESALE" || customerType === "COMMERCIAL_PROJECT" || it.quantity >= 3) {
          appliedPrice = product.wholesalePrice || product.price;
          appliedType = "WHOLESALE";
        } else {
          appliedPrice = product.price;
          appliedType = "RETAIL";
        }
      }

      total += appliedPrice * it.quantity;
      totalCost += (product.costPrice || appliedPrice * 0.75) * it.quantity;

      orderItemsData.push({
        productId: product.id,
        quantity: it.quantity,
        unitPrice: appliedPrice,
        priceType: appliedType || "RETAIL",
        productName: product.name,
        warrantyMonths: product.warrantyMonths,
      });
    }

    const profitMargin = Math.max(0, total - totalCost);

    // 2. تحديث بيانات العميل، خصم المخزون حسب المصدر (المعرض أو المخزن)، وحفظ الطلب
    const { order: createdOrder, lowStockAlerts } = await prisma.$transaction(async (tx) => {
      const user = await tx.user.upsert({
        where: { phone },
        update: { name, address, customerType },
        create: { name, phone, address, customerType },
      });

      const triggeredAlerts: { productName: string; currentStock: number; minThreshold: number }[] = [];

      for (const it of items) {
        // تحديث المخزون الفرعي (معرض أو مخزن) والمخزون الإجمالي
        const isShowroom = fulfillmentSource === "SHOWROOM";
        const updateData: any = {
          stock: { decrement: it.quantity },
        };

        if (isShowroom) {
          updateData.showroomStock = { decrement: it.quantity };
        } else {
          updateData.warehouseStock = { decrement: it.quantity };
        }

        const updatedProd = await tx.product.update({
          where: { id: it.productId },
          data: updateData,
        });

        if (updatedProd.stock <= updatedProd.minStockThreshold) {
          triggeredAlerts.push({
            productName: updatedProd.name,
            currentStock: updatedProd.stock,
            minThreshold: updatedProd.minStockThreshold,
          });
        }
      }

      const order = await tx.order.create({
        data: {
          userId: user.id,
          orderType: customerType,
          fulfillmentSource,
          total,
          profitMargin,
          status: "Pending",
          items: {
            create: orderItemsData.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              priceType: item.priceType,
            })),
          },
        },
        include: {
          user: true,
          items: {
            include: { product: true },
          },
        },
      });

      return { order, lowStockAlerts: triggeredAlerts };
    });

    // 3. إصدار بطاقات الضمان الرسمية لـ MG Group تلقائياً لكل جهاز مباع
    for (const item of orderItemsData) {
      WarrantyService.registerWarranty({
        orderId: createdOrder.id,
        userId: createdOrder.userId,
        customerName: createdOrder.user.name,
        customerPhone: createdOrder.user.phone,
        productName: item.productName,
        warrantyMonths: item.warrantyMonths,
      }).catch((e) => console.error("فشل تسجيل بطاقة الضمان:", e));
    }

    // 4. تنبيه الإدارة عبر تليجرام مع تفاصيل المعرض/المخزن ونظام التسعير وهامش الربح
    notifyAdminNewOrder({
      orderCode: createdOrder.orderCode,
      customerName: `${createdOrder.user.name} [${customerType === "WHOLESALE" ? "تاجر جملة" : customerType === "COMMERCIAL_PROJECT" ? "تجهيز كافيه/مشروع" : "عميل قطاعي"}]`,
      customerPhone: createdOrder.user.phone,
      customerAddress: `${createdOrder.user.address} (مصدر الصرف: ${fulfillmentSource === "SHOWROOM" ? "معرض جسر السويس" : "المخزن الرئيسي"})`,
      productName: createdOrder.items.map((i) => `${i.product?.name} (${i.priceType === "WHOLESALE" ? "جملة" : "قطاعي"})`).join("، "),
      quantity: createdOrder.items.reduce((acc, i) => acc + i.quantity, 0),
      total: createdOrder.total,
      source,
    }).catch((e) => console.error("Admin Notifier Error:", e));

    // 5. تنبيه نقص المخزون للمنتجات التي وصلت لحد الأمان
    for (const alertData of lowStockAlerts) {
      notifyAdminLowStock(alertData).catch((e) => console.error("Low Stock Alert Error:", e));
    }

    return createdOrder;
  }

  /**
   * جلب كافة الطلبات مع التفاصيل والترتيب
   */
  static async getAllOrders() {
    return await prisma.order.findMany({
      include: {
        user: true,
        items: {
          include: { product: true },
        },
        warranties: true,
      },
      orderBy: { id: "desc" },
    });
  }

  /**
   * تحديث حالة الطلب
   */
  static async updateOrderStatus(orderId: number, status: "Pending" | "Completed" | "Shipping") {
    return await prisma.order.update({
      where: { id: orderId },
      data: { status },
      include: {
        user: true,
        items: {
          include: { product: true },
        },
      },
    });
  }

  /**
   * حذف الطلب وإعادة الكميات المحجوزة للمخزن أوتوماتيكياً
   */
  static async deleteOrder(orderId: number) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new Error("الطلب غير موجود");
    }

    return await prisma.$transaction(async (tx) => {
      // إعادة كميات المنتجات إلى المخزن
      for (const item of order.items) {
        const updateData: any = { stock: { increment: item.quantity } };
        if (order.fulfillmentSource === "SHOWROOM") {
          updateData.showroomStock = { increment: item.quantity };
        } else {
          updateData.warehouseStock = { increment: item.quantity };
        }

        await tx.product.update({
          where: { id: item.productId },
          data: updateData,
        });
      }

      // حذف عناصر الطلب
      await tx.orderItem.deleteMany({
        where: { orderId },
      });

      // حذف الطلب
      await tx.order.delete({
        where: { id: orderId },
      });

      return { success: true, message: "تم حذف الطلب وإعادة المنتجات للمخزون بنجاح" };
    });
  }

  /**
   * تعديل بيانات العميل أو حالة الطلب
   */
  static async updateOrderDetails(
    orderId: number,
    data: { name?: string; phone?: string; address?: string; status?: string; orderType?: string }
  ) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true },
    });

    if (!order) {
      throw new Error("الطلب غير موجود");
    }

    return await prisma.$transaction(async (tx) => {
      if (data.name || data.phone || data.address || data.orderType) {
        await tx.user.update({
          where: { id: order.userId },
          data: {
            ...(data.name && { name: data.name }),
            ...(data.phone && { phone: data.phone }),
            ...(data.address && { address: data.address }),
            ...(data.orderType && { customerType: data.orderType }),
          },
        });
      }

      if (data.status || data.orderType) {
        await tx.order.update({
          where: { id: orderId },
          data: {
            ...(data.status && { status: data.status }),
            ...(data.orderType && { orderType: data.orderType }),
          },
        });
      }

      return await tx.order.findUnique({
        where: { id: orderId },
        include: {
          user: true,
          items: { include: { product: true } },
          warranties: true,
        },
      });
    });
  }
}
