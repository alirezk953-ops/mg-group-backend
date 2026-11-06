import PDFDocument from "pdfkit";
import { Response } from "express";
import prisma from "./prisma";

export async function generateInvoicePdf(orderId: number, res: Response) {
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
    res.status(404).json({ error: "الطلب غير موجود" });
    return;
  }

  const doc = new PDFDocument({ margin: 40, size: "A4" });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=invoice-${order.orderCode.slice(0, 8)}.pdf`
  );

  doc.pipe(res);

  // رأس الفاتورة (Header)
  doc
    .fillColor("#4338ca")
    .fontSize(22)
    .text("COMMERCIAL STORE - INVOICE", { align: "left" })
    .moveDown(0.3);

  doc
    .fillColor("#64748b")
    .fontSize(10)
    .text("Automated E-Commerce & WhatsApp / Telegram System", { align: "left" })
    .text("Cairo, Egypt | Phone: +20 100 000 0000", { align: "left" })
    .moveDown();

  doc
    .strokeColor("#cbd5e1")
    .lineWidth(1)
    .moveTo(40, doc.y)
    .lineTo(550, doc.y)
    .stroke()
    .moveDown(1.5);

  // بيانات الفاتورة والعميل
  const startY = doc.y;
  doc
    .fillColor("#0f172a")
    .fontSize(12)
    .text(`Invoice Code: #${order.orderCode.slice(0, 8).toUpperCase()}`, 40, startY)
    .fontSize(10)
    .fillColor("#475569")
    .text(`Order Date: ${new Date(order.createdAt).toLocaleString("en-US")}`)
    .text(`Status: ${order.status.toUpperCase()}`);

  doc
    .fillColor("#0f172a")
    .fontSize(12)
    .text("Customer Information:", 320, startY)
    .fontSize(10)
    .fillColor("#475569")
    .text(`Name: ${order.user.name}`, 320)
    .text(`Phone: ${order.user.phone}`, 320)
    .text(`Address: ${order.user.address}`, 320);

  doc.moveDown(3);

  // جدول المنتجات (Table Header)
  const tableTop = doc.y + 10;
  doc
    .rect(40, tableTop, 510, 24)
    .fill("#f1f5f9");

  doc
    .fillColor("#1e293b")
    .fontSize(10)
    .text("Item / Product", 50, tableTop + 7)
    .text("Quantity", 280, tableTop + 7)
    .text("Unit Price (EGP)", 370, tableTop + 7)
    .text("Total (EGP)", 470, tableTop + 7);

  let currentY = tableTop + 30;

  order.items.forEach((item, index) => {
    const itemTotal = item.unitPrice * item.quantity;

    if (index % 2 === 1) {
      doc.rect(40, currentY - 4, 510, 20).fill("#f8fafc");
    }

    doc
      .fillColor("#334155")
      .fontSize(9)
      .text(item.product?.name || `Product #${item.productId}`, 50, currentY)
      .text(String(item.quantity), 300, currentY)
      .text(item.unitPrice.toLocaleString(), 380, currentY)
      .text(itemTotal.toLocaleString(), 480, currentY);

    currentY += 22;
  });

  doc.moveDown(2);

  // الإجمالي
  const totalY = currentY + 15;
  doc
    .rect(340, totalY, 210, 36)
    .fill("#e0e7ff");

  doc
    .fillColor("#3730a3")
    .fontSize(12)
    .text(`TOTAL AMOUNT:`, 355, totalY + 12)
    .text(`${order.total.toLocaleString()} EGP`, 460, totalY + 12);

  // فوتر الفاتورة
  doc
    .fontSize(9)
    .fillColor("#94a3b8")
    .text(
      "Thank you for shopping with us! For returns and support, contact customer service.",
      40,
      740,
      { align: "center", width: 510 }
    );

  doc.end();
}
