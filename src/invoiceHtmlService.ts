import { Response } from "express";
import prisma from "./prisma";

export async function renderInvoiceHtml(orderId: number, res: Response) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: true,
      items: {
        include: { product: true },
      },
    },
  });

  if (!order) {
    res.status(404).send("<h1>الطلب غير موجود</h1>");
    return;
  }

  const itemsHtml = order.items
    .map(
      (it, idx) => `
    <tr style="background-color: ${idx % 2 === 0 ? "#ffffff" : "#f8fafc"};">
      <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #1e293b;">
        ${it.product?.name || `منتج #${it.productId}`}
      </td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #4338ca; font-weight: bold;">
        ${it.quantity}
      </td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; text-align: left; font-family: monospace;">
        ${it.unitPrice.toLocaleString()} ج.م
      </td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; text-align: left; font-family: monospace; font-weight: bold; color: #0f172a;">
        ${(it.unitPrice * it.quantity).toLocaleString()} ج.م
      </td>
    </tr>
  `
    )
    .join("");

  const html = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>فاتورة ضريبية - #${order.orderCode.slice(0, 8).toUpperCase()}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
      @page { margin: 15mm; size: A4; }
    }
    body {
      font-family: 'Cairo', sans-serif;
      background-color: #f1f5f9;
      margin: 0;
      padding: 30px 15px;
      color: #334155;
    }
    .invoice-card {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 24px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
      padding: 40px;
      border: 1px solid #e2e8f0;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 700;
    }
    .badge-success { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
    .badge-pending { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
    .print-btn {
      background: #4f46e5;
      color: #ffffff;
      border: none;
      padding: 10px 24px;
      border-radius: 12px;
      font-family: 'Cairo', sans-serif;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);
    }
    .print-btn:hover { background: #4338ca; }
  </style>
</head>
<body>

  <div class="no-print" style="max-width: 800px; margin: 0 auto 20px; text-align: left;">
    <button class="print-btn" onclick="window.print()">
      🖨️ طباعة الفاتورة أو حفظها PDF
    </button>
  </div>

  <div class="invoice-card">
    <!-- Header -->
    <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #f1f5f9; padding-bottom: 25px;">
      <div>
        <h1 style="margin: 0; color: #1e1b4b; font-size: 26px; font-weight: 900;">متجر التجارة والمبيعات الذكية</h1>
        <p style="margin: 4px 0 0; color: #64748b; font-size: 13px;">فاتورة مبيعات معتمدة ونظام طلبات إلكتروني فوري</p>
        <p style="margin: 2px 0 0; color: #94a3b8; font-size: 12px;">القاهرة، جمهورية مصر العربية | هاتف: +20 100 000 0000</p>
      </div>
      <div style="text-align: left;">
        <div style="font-size: 13px; font-weight: 800; color: #4338ca; background: #e0e7ff; padding: 6px 14px; border-radius: 10px; font-family: monospace;">
          INV-#${order.orderCode.slice(0, 8).toUpperCase()}
        </div>
        <div style="margin-top: 8px;">
          ${
            order.status === "Completed"
              ? '<span class="badge badge-success">✓ مسددة ومكتملة</span>'
              : '<span class="badge badge-pending">⏳ قيد المتابعة والتجهيز</span>'
          }
        </div>
      </div>
    </div>

    <!-- معلومات العميل والأوردر -->
    <div style="display: flex; justify-content: space-between; margin: 30px 0; background: #f8fafc; padding: 20px; border-radius: 16px; border: 1px solid #f1f5f9;">
      <div>
        <div style="font-size: 12px; color: #64748b; font-weight: 700;">بيانات العميل:</div>
        <div style="font-size: 15px; color: #0f172a; font-weight: 800; margin-top: 4px;">${order.user.name}</div>
        <div style="font-size: 13px; color: #475569; margin-top: 2px;" dir="ltr">${order.user.phone}</div>
        <div style="font-size: 13px; color: #64748b; margin-top: 2px;">📍 ${order.user.address}</div>
      </div>
      <div style="text-align: left;">
        <div style="font-size: 12px; color: #64748b; font-weight: 700;">تاريخ الإصدار:</div>
        <div style="font-size: 13px; color: #0f172a; font-weight: 700; margin-top: 4px;">
          ${new Date(order.createdAt).toLocaleDateString("ar-EG", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
        <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
          ${new Date(order.createdAt).toLocaleTimeString("ar-EG", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>
    </div>

    <!-- جدول البنود -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
      <thead>
        <tr style="background: #1e1b4b; color: #ffffff; text-align: right; font-size: 13px;">
          <th style="padding: 12px 16px; border-radius: 0 12px 12px 0;">المنتج / الصنف</th>
          <th style="padding: 12px 16px; text-align: center;">الكمية</th>
          <th style="padding: 12px 16px; text-align: left;">سعر الوحدة</th>
          <th style="padding: 12px 16px; text-align: left; border-radius: 12px 0 0 12px;">الإجمالي</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <!-- صندوق الإجمالي النهائي -->
    <div style="display: flex; justify-content: flex-end; margin-top: 20px;">
      <div style="width: 280px; background: #eef2ff; border: 2px solid #c7d2fe; padding: 18px; border-radius: 16px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; color: #4338ca;">
          <span>المجموع الفرعي:</span>
          <span style="font-family: monospace; font-weight: 700;">${order.total.toLocaleString()} ج.م</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; color: #15803d;">
          <span>مصاريف الشحن:</span>
          <span style="font-weight: 700;">مجاناً 🎉</span>
        </div>
        <div style="display: flex; justify-content: space-between; border-top: 2px dashed #c7d2fe; padding-top: 10px; font-size: 16px; font-weight: 900; color: #1e1b4b;">
          <span>الإجمالي النهائي:</span>
          <span style="font-family: monospace;">${order.total.toLocaleString()} ج.م</span>
        </div>
      </div>
    </div>

    <!-- تذييل الفاتورة -->
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #f1f5f9; text-align: center; color: #94a3b8; font-size: 12px;">
      شكراً لثقتكم وتعاملكم معنا! في حال وجود أي استفسار أو رغبة بالاسترجاع، يسعدنا تواصلكم عبر الواتساب أو تليجرام.
    </div>
  </div>

</body>
</html>
  `;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
}
