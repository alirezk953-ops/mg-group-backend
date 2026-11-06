import prisma from "./prisma";
import { OrderService } from "./orderService";
import { Response } from "express";

export interface CreateQuotationItemInput {
  productId: number;
  quantity: number;
  unitPrice?: number;
  priceType?: "RETAIL" | "WHOLESALE";
}

export interface CreateQuotationParams {
  customerName: string;
  customerPhone: string;
  customerType?: "RETAIL" | "WHOLESALE" | "COMMERCIAL_PROJECT";
  projectType?: string; // "تجهيز كافيه" | "شقة عروسة" | "مطعم" | "دفعة تجارية"
  discount?: number;
  validDays?: number;
  notes?: string;
  items: CreateQuotationItemInput[];
}

export class QuotationService {
  /**
   * إنشاء مقايسة أو عرض سعر جديد لمشروع تجهيز كافيه أو شقة أو تاجر جملة
   */
  static async createQuotation(params: CreateQuotationParams) {
    const {
      customerName,
      customerPhone,
      customerType = "COMMERCIAL_PROJECT",
      projectType = "تجهيز كافيه أو منشأة",
      discount = 0,
      validDays = 15,
      notes = "",
      items,
    } = params;

    if (!items || items.length === 0) {
      throw new Error("قائمة بنود المقايسة فارغة");
    }

    // جلب المنتجات وحساب الأسعار
    let total = 0;
    const quotationItemsData: {
      productId: number;
      quantity: number;
      unitPrice: number;
      priceType: string;
    }[] = [];

    for (const it of items) {
      const product = await prisma.product.findUnique({
        where: { id: it.productId },
      });

      if (!product) {
        throw new Error(`المنتج رقم ${it.productId} غير موجود`);
      }

      // تحديد السعر المعتمد (جملة للمشاريع والتجار أو قطاعي)
      let price = it.unitPrice;
      let pType = it.priceType;

      if (!price) {
        if (customerType === "WHOLESALE" || customerType === "COMMERCIAL_PROJECT" || it.quantity >= 3) {
          price = product.wholesalePrice || product.price;
          pType = "WHOLESALE";
        } else {
          price = product.price;
          pType = "RETAIL";
        }
      }

      total += price * it.quantity;
      quotationItemsData.push({
        productId: product.id,
        quantity: it.quantity,
        unitPrice: price,
        priceType: pType || "WHOLESALE",
      });
    }

    const finalTotal = Math.max(0, total - Number(discount));
    const quoteCode = `MG-Q-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    // تسجيل أو تحديث العميل في قاعدة البيانات
    const user = await prisma.user.upsert({
      where: { phone: customerPhone },
      update: {
        name: customerName,
        customerType,
        businessName: projectType,
      },
      create: {
        name: customerName,
        phone: customerPhone,
        address: "عرض سعر / مقايسة",
        customerType,
        businessName: projectType,
      },
    });

    const quotation = await prisma.quotation.create({
      data: {
        quoteCode,
        userId: user.id,
        customerName,
        customerPhone,
        customerType,
        projectType,
        status: "PENDING",
        total,
        discount: Number(discount),
        finalTotal,
        validDays: Number(validDays),
        notes,
        items: {
          create: quotationItemsData,
        },
      },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    return quotation;
  }

  /**
   * جلب كافة المقايسات
   */
  static async getAllQuotations() {
    return await prisma.quotation.findMany({
      include: {
        items: {
          include: { product: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * جلب مقايسة بالمعرف
   */
  static async getQuotationById(id: number) {
    return await prisma.quotation.findUnique({
      where: { id },
      include: {
        items: {
          include: { product: true },
        },
      },
    });
  }

  /**
   * تحويل المقايسة المعتمدة إلى أوردر فعلي وخصم المخزون
   */
  static async convertQuotationToOrder(
    quotationId: number,
    address: string = "استلام من معرض مصر الجديدة",
    fulfillmentSource: "SHOWROOM" | "WAREHOUSE" = "WAREHOUSE"
  ) {
    const quote = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: { items: { include: { product: true } } },
    });

    if (!quote) {
      throw new Error("المقايسة غير موجودة");
    }

    if (quote.status === "CONVERTED") {
      throw new Error("تم تحويل هذه المقايسة إلى أوردر مسبقاً");
    }

    // إنشاء الأوردر عبر OrderService الموحدة
    const orderItems = quote.items.map((it) => ({
      productId: it.productId,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
    }));

    const createdOrder = await OrderService.createOrder({
      name: quote.customerName,
      phone: quote.customerPhone,
      address,
      customerType: quote.customerType as any,
      fulfillmentSource,
      source: "Dashboard",
      items: orderItems,
    });

    // تحديث حالة المقايسة إلى CONVERTED
    await prisma.quotation.update({
      where: { id: quotationId },
      data: { status: "CONVERTED" },
    });

    return { success: true, order: createdOrder };
  }

  /**
   * توليد صفحة مقايسة رسمية أنيقة جاهزة للطباعة والـ PDF لشعار MG Group
   */
  static async renderQuotationHtml(quotationId: number, res: Response) {
    const quote = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: { items: { include: { product: true } } },
    });

    if (!quote) {
      return res.status(404).send("المقايسة غير موجودة");
    }

    const createdDate = new Date(quote.createdAt).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const expiryDate = new Date(
      new Date(quote.createdAt).getTime() + quote.validDays * 24 * 60 * 60 * 1000
    ).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const rowsHtml = quote.items
      .map(
        (it, idx) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 12px 14px; text-align: center; color: #64748b; font-weight: 600;">${idx + 1}</td>
        <td style="padding: 12px 14px;">
          <div style="font-weight: 700; color: #1e293b; font-size: 14px;">${it.product.name}</div>
          <div style="font-size: 11px; color: #0284c7; margin-top: 2px;">
            ضمان رسمي ${it.product.warrantyMonths} شهر | تسعير: ${it.priceType === "WHOLESALE" ? "جملة / باقة مشاريع" : "قطاعي معتمد"}
          </div>
        </td>
        <td style="padding: 12px 14px; text-align: center; font-weight: 700; color: #0f172a; font-family: sans-serif;">
          ${it.quantity}
        </td>
        <td style="padding: 12px 14px; text-align: left; font-weight: 600; color: #334155; font-family: sans-serif;">
          ${it.unitPrice.toLocaleString()} ج.م
        </td>
        <td style="padding: 12px 14px; text-align: left; font-weight: 700; color: #0369a1; font-family: sans-serif;">
          ${(it.quantity * it.unitPrice).toLocaleString()} ج.م
        </td>
      </tr>
    `
      )
      .join("");

    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>عرض سعر مقايسة - ${quote.quoteCode} - MG Group</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; font-family: 'Cairo', sans-serif; }
    body { background-color: #f8fafc; color: #0f172a; margin: 0; padding: 24px; }
    .page { max-width: 820px; margin: 0 auto; background: #ffffff; padding: 36px 40px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0284c7; padding-bottom: 24px; margin-bottom: 24px; }
    .brand-title { font-size: 26px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px; }
    .brand-title span { color: #0284c7; }
    .brand-sub { font-size: 12px; color: #64748b; font-weight: 600; margin-top: 2px; }
    .badge { display: inline-block; padding: 6px 14px; background: #e0f2fe; color: #0369a1; border-radius: 30px; font-weight: 700; font-size: 13px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background: #f1f5f9; padding: 18px 20px; border-radius: 14px; margin-bottom: 24px; font-size: 13px; }
    .table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
    .table th { background: #0f172a; color: #ffffff; padding: 12px 14px; font-weight: 700; text-align: right; }
    .totals { width: 320px; margin-right: auto; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; font-size: 14px; margin-bottom: 24px; }
    .total-row { display: flex; justify-content: space-between; padding: 6px 0; color: #475569; }
    .total-final { display: flex; justify-content: space-between; padding: 10px 0 4px 0; border-top: 2px dashed #cbd5e1; font-weight: 800; font-size: 18px; color: #0284c7; }
    .footer-terms { background: #fafafa; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 16px; font-size: 12px; color: #64748b; line-height: 1.8; }
    .no-print { text-align: center; margin-bottom: 20px; }
    .print-btn { background: #0284c7; color: #fff; border: none; padding: 10px 24px; font-size: 14px; font-weight: 700; border-radius: 10px; cursor: pointer; box-shadow: 0 4px 14px rgba(2,132,199,0.3); }
    @media print {
      body { background: #fff; padding: 0; }
      .page { box-shadow: none; border: none; padding: 0; max-width: 100%; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <button class="print-btn" onclick="window.print()">🖨️ طباعة المقايسة أو حفظها كـ PDF</button>
  </div>

  <div class="page">
    <div class="header">
      <div>
        <div class="brand-title">MG <span>GROUP</span></div>
        <div class="brand-sub">مجموعة إم جي للأجهزة الكهربائية وتجهيزات الكافيهات والمنازل</div>
        <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">
          📍 المعرض الرئيسي: 13 جسر السويس، مصر الجديدة | 📞 +20 12 21584153
        </div>
      </div>
      <div style="text-align: left;">
        <div class="badge">مقايسة رسمية / عرض سعر</div>
        <div style="font-size: 12px; color: #64748b; margin-top: 6px; font-family: sans-serif; font-weight: 700;">
          #${quote.quoteCode}
        </div>
      </div>
    </div>

    <div class="info-grid">
      <div>
        <div><strong style="color: #0f172a;">السيد / السادة:</strong> ${quote.customerName}</div>
        <div style="margin-top: 4px;"><strong style="color: #0f172a;">رقم التواصل:</strong> <span dir="ltr">${quote.customerPhone}</span></div>
        <div style="margin-top: 4px;"><strong style="color: #0f172a;">نوع النشاط:</strong> ${quote.projectType || "تجهيز وتوريد"}</div>
      </div>
      <div style="text-align: left;">
        <div><strong>تاريخ الإصدار:</strong> ${createdDate}</div>
        <div style="margin-top: 4px; color: #dc2626;"><strong>ساري حتى:</strong> ${expiryDate} (${quote.validDays} يوم)</div>
        <div style="margin-top: 4px;"><strong>نوع التسعير:</strong> <span style="color: #0284c7; font-weight: 700;">${quote.customerType === "WHOLESALE" ? "سعر الجملة والتجار" : "باقة تجهيزات خاصة"}</span></div>
      </div>
    </div>

    <table class="table">
      <thead>
        <tr>
          <th style="width: 40px; text-align: center;">#</th>
          <th>الجهاز / الموديل والمواصفات</th>
          <th style="width: 70px; text-align: center;">الكمية</th>
          <th style="width: 120px; text-align: left;">سعر الوحدة</th>
          <th style="width: 130px; text-align: left;">الإجمالي</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <div class="totals">
      <div class="total-row">
        <span>المجموع الإجمالي:</span>
        <span style="font-family: sans-serif; font-weight: 700;">${quote.total.toLocaleString()} ج.م</span>
      </div>
      ${
        quote.discount > 0
          ? `<div class="total-row" style="color: #16a34a;">
               <span>خصم الباقة الخاص:</span>
               <span style="font-family: sans-serif; font-weight: 700;">- ${quote.discount.toLocaleString()} ج.م</span>
             </div>`
          : ""
      }
      <div class="total-final">
        <span>الصافي المطلوب:</span>
        <span style="font-family: sans-serif;">${quote.finalTotal.toLocaleString()} ج.م</span>
      </div>
    </div>

    <div class="footer-terms">
      <strong>شروط وتأكيدات MG Group:</strong><br>
      • كافة الأجهزة أصلية وجديدة بالكرتونة ومشمولة بالضمان الرسمي المعتمد من 12 إلى 36 شهراً.<br>
      • يتم حجز البضاعة مؤقتاً فور تأكيد المقايسة عبر رقم الواتساب: <strong>+20 12 21584153</strong>.<br>
      • التوريد متاح من المعرض الرئيسي (13 جسر السويس - مصر الجديدة) أو شحن مباشر للموقع من المخزن المركزي.<br>
      • الأسعار أعلاه خاضعة للمدة المحددة وتعتبر سارية لمدة ${quote.validDays} يوماً من تاريخ الإصدار.
    </div>
  </div>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  }
}
