import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";

process.on("uncaughtException", (err) => {
  console.error("🚨 Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("🚨 Unhandled Rejection:", reason);
});
import rateLimit from "express-rate-limit";
import prisma from "./prisma";
import { OrderService } from "./orderService";
import { generateInvoicePdf } from "./invoiceService";
import { renderInvoiceHtml } from "./invoiceHtmlService";
import { initTelegramBot } from "./telegramBot";
import { connectToWhatsApp, getWhatsAppStatus, requestPairingCode, setCustomerHumanHandover, sendWhatsAppTextMessage } from "./whatsappService";
import { sendAdminDirectAlert } from "./adminNotifier";
import { generateToken, authMiddleware, requireRole, AuthenticatedRequest } from "./authMiddleware";
import { CustomerService } from "./customerService";
import { QuotationService } from "./quotationService";
import { WarrantyService } from "./warrantyService";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// حماية الـ API من الـ Spam والتكرار المفرط (Rate Limiter)
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 120,
  message: { error: "طلبات كثيرة جداً من هذا العنوان، يرجى المحاولة بعد دقيقة." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);
app.use(cors());
app.use(express.json());

// تشغيل البوتات
initTelegramBot();
connectToWhatsApp();

// فحص الاتصال والسيرفر
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    message: "Server is running smoothly with Rate Limiter and Service Layer active",
    whatsapp: getWhatsAppStatus(),
  });
});

// --- مسار تسجيل الدخول وإصدار التوكن (Auth / Login API) ---
app.post("/api/auth/login", async (req: Request, res: Response) => {
  try {
    const { username, pin } = req.body;
    if (!username || !pin) {
      return res.status(400).json({ error: "اسم المستخدم والرمز السري (PIN) مطلوبان" });
    }

    const staff = await prisma.staff.findUnique({
      where: { username: String(username).trim().toLowerCase() },
    });

    if (!staff || staff.pin !== String(pin).trim()) {
      return res.status(401).json({ error: "اسم المستخدم أو رمز الدخول غير صحيح" });
    }

    const token = generateToken({
      id: staff.id,
      username: staff.username,
      name: staff.name,
      role: staff.role as any,
    });

    res.json({
      success: true,
      token,
      user: {
        id: staff.id,
        username: staff.username,
        name: staff.name,
        role: staff.role,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// التحقق من صلاحية التوكن الحالي
app.get("/api/auth/me", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
});

// --- 1. العملاء (Users) ---
app.get("/api/users", async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      include: { orders: true },
      orderBy: { id: "desc" },
    });
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- 2. المنتجات (Products CRUD) ---
app.get("/api/products", async (_req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { id: "desc" },
    });
    res.json(products);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/products", async (req: Request, res: Response) => {
  try {
    const {
      name,
      price,
      wholesalePrice,
      costPrice,
      category,
      stock,
      showroomStock,
      warehouseStock,
      minStockThreshold,
      warrantyMonths,
    } = req.body;

    if (!name || price === undefined || stock === undefined) {
      return res.status(400).json({ error: "اسم المنتج والسعر والمخزون مطلوبين" });
    }

    const product = await prisma.product.create({
      data: {
        name: String(name).trim(),
        price: Number(price),
        wholesalePrice: wholesalePrice !== undefined && wholesalePrice !== null ? Number(wholesalePrice) : null,
        costPrice: costPrice !== undefined && costPrice !== null ? Number(costPrice) : null,
        category: category ? String(category).trim() : "أجهزة منزلية",
        stock: Number(stock),
        showroomStock: showroomStock !== undefined ? Number(showroomStock) : 0,
        warehouseStock: warehouseStock !== undefined ? Number(warehouseStock) : Number(stock),
        minStockThreshold: minStockThreshold !== undefined ? Number(minStockThreshold) : 3,
        warrantyMonths: warrantyMonths !== undefined ? Number(warrantyMonths) : 12,
      },
    });
    res.status(201).json(product);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/products/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const productId = Number(id);
    if (!productId || isNaN(productId)) {
      return res.status(400).json({ error: "معرّف الجهاز غير صالح" });
    }

    const {
      name,
      price,
      wholesalePrice,
      costPrice,
      category,
      stock,
      showroomStock,
      warehouseStock,
      minStockThreshold,
      warrantyMonths,
    } = req.body;

    const product = await prisma.product.update({
      where: { id: productId },
      data: {
        ...(name && { name: String(name).trim() }),
        ...(price !== undefined && !isNaN(Number(price)) && { price: Number(price) }),
        ...(wholesalePrice !== undefined && { wholesalePrice: (wholesalePrice === null || wholesalePrice === "" || isNaN(Number(wholesalePrice))) ? null : Number(wholesalePrice) }),
        ...(costPrice !== undefined && { costPrice: (costPrice === null || costPrice === "" || isNaN(Number(costPrice))) ? null : Number(costPrice) }),
        ...(category && { category: String(category).trim() }),
        ...(stock !== undefined && !isNaN(Number(stock)) && { stock: Number(stock) }),
        ...(showroomStock !== undefined && !isNaN(Number(showroomStock)) && { showroomStock: Number(showroomStock) }),
        ...(warehouseStock !== undefined && !isNaN(Number(warehouseStock)) && { warehouseStock: Number(warehouseStock) }),
        ...(minStockThreshold !== undefined && !isNaN(Number(minStockThreshold)) && { minStockThreshold: Number(minStockThreshold) }),
        ...(warrantyMonths !== undefined && !isNaN(Number(warrantyMonths)) && { warrantyMonths: Number(warrantyMonths) }),
      },
    });
    res.json(product);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/products/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const productId = Number(id);
    if (!productId || isNaN(productId)) {
      return res.status(400).json({ error: "معرّف الجهاز غير صالح" });
    }

    const orderItemsCount = await prisma.orderItem.count({ where: { productId } });
    const quotationItemsCount = await prisma.quotationItem.count({ where: { productId } });

    if (orderItemsCount > 0 || quotationItemsCount > 0) {
      const force = req.query.force === "true";
      if (!force) {
        return res.status(400).json({
          hasRelations: true,
          orderItemsCount,
          quotationItemsCount,
          error: `لا يمكن حذف هذا الجهاز لوجود سجلات مبيعات مرتبطة به (${orderItemsCount} أوردر) و (${quotationItemsCount} مقايسة). يمكنك تصفير المخزون لتجنب ظهوره للبيع، أو تأكيد الحذف الشامل.`,
        });
      }

      // في حال تأكيد الحذف الشامل للبيانات التجريبية
      await prisma.quotationItem.deleteMany({ where: { productId } });
      await prisma.orderItem.deleteMany({ where: { productId } });
    }

    await prisma.product.delete({
      where: { id: productId },
    });
    res.json({ success: true, message: "تم حذف المنتج بنجاح" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- 3. الطلبات عبر الـ OrderService الموحدة (Orders API) ---
app.get("/api/orders", async (_req: Request, res: Response) => {
  try {
    const orders = await OrderService.getAllOrders();
    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/orders", async (req: Request, res: Response) => {
  try {
    const { name, phone, address, items, userId, customerType, fulfillmentSource } = req.body;

    // دعم الإنشاء المباشر أو عبر بيانات العميل
    let customerName = name;
    let customerPhone = phone;
    let customerAddress = address;

    if (userId && (!customerName || !customerPhone)) {
      const existingUser = await prisma.user.findUnique({ where: { id: Number(userId) } });
      if (existingUser) {
        customerName = existingUser.name;
        customerPhone = existingUser.phone;
        customerAddress = existingUser.address;
      }
    }

    if (!customerName || !customerPhone || !items) {
      return res.status(400).json({ error: "بيانات العميل وقائمة المنتجات مطلوبة لإتمام الأوردر" });
    }

    const order = await OrderService.createOrder({
      name: customerName,
      phone: customerPhone,
      address: customerAddress || "غير محدد",
      customerType: customerType || "RETAIL",
      fulfillmentSource: fulfillmentSource || "SHOWROOM",
      items,
    });

    res.status(201).json(order);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.patch("/api/orders/:id/status", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notifyCustomer = true } = req.body;

    const order = await OrderService.updateOrderStatus(Number(id), status);

    // إذا تم تسليم الطلب ومطلوب إشعار العميل على الواتساب
    if (notifyCustomer && (status === "Completed" || status === "Delivered") && order.user?.phone) {
      const thankYouMsg =
        `🎉 *شكراً لتعاملك معنا يا أستاذ/ة ${order.user.name}!* ✨\n\n` +
        `📦 تم تسليم طلبك بنجاح وبكود: \`#${order.orderCode.slice(0, 8)}\`\n` +
        `💵 إجمالي المبلغ المحصل: *${order.total.toLocaleString()} ج.م*\n\n` +
        `سعداء جداً بخدمتك ونتمنى أن ينال المنتج إعجابك ورضاك! 🌹`;

      sendWhatsAppTextMessage(order.user.phone, thankYouMsg).catch((e) =>
        console.error("فشل إرسال إشعار شكر العميل على الواتساب:", e.message)
      );
    }

    res.json(order);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// تقرير المندوب عند تعذر أو تأجيل التسليم
app.post("/api/orders/:id/delivery-report", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason, note } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: Number(id) },
      include: { user: true },
    });

    if (!order) {
      return res.status(404).json({ error: "الطلب غير موجود" });
    }

    const alertMsg =
      `🛑 *تقرير مندوب التوصيل (تعذر/تأجيل التسليم):*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🏷️ *الطلب:* \`#${order.orderCode.slice(0, 8)}\`\n` +
      `👤 *العميل:* ${order.user.name}\n` +
      `📞 *الهاتف:* \`${order.user.phone}\`\n` +
      `🛑 *سبب التعذر:* ${reason || "غير محدد"}\n` +
      (note ? `📝 *ملاحظة إضافية:* "${note}"\n` : "") +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `⏱️ ${new Date().toLocaleString("ar-EG", { timeZone: "Africa/Cairo" })}`;

    sendAdminDirectAlert(alertMsg).catch((e) =>
      console.error("فشل إرسال تقرير المندوب لتليجرام:", e.message)
    );

    res.json({ success: true, message: "تم تسجيل تقرير التوصيل وإخطار الإدارة بنجاح" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// تعديل بيانات الطلب والعميل
app.put("/api/orders/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, phone, address, status } = req.body;

    const order = await OrderService.updateOrderDetails(Number(id), { name, phone, address, status });
    res.json(order);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// حذف الطلب وإرجاع المخزون تلقائياً
app.delete("/api/orders/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await OrderService.deleteOrder(Number(id));
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// مسار توليد وتحميل فاتورة الـ PDF الرسمية بتشكيل ودعم عربي
app.get("/api/orders/:id/invoice", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await renderInvoiceHtml(Number(id), res);
  } catch (error: any) {
    res.status(500).json({ error: "فشل توليد الفاتورة: " + error.message });
  }
});

// مسار الفاتورة العربية الفاخرة (HTML/Print/PDF جاهزة للطباعة فوراً بخط Cairo)
app.get("/api/orders/:id/invoice-html", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await renderInvoiceHtml(Number(id), res);
  } catch (error: any) {
    res.status(500).send("فشل عرض الفاتورة: " + error.message);
  }
});

// ══════════════════════════════════════════════════════════════
// 3.5. محرك المقايسات وعروض الأسعار لتجهيز الكافيهات والمنازل (Quotations API)
// ══════════════════════════════════════════════════════════════
app.get("/api/quotations", async (_req: Request, res: Response) => {
  try {
    const quotations = await QuotationService.getAllQuotations();
    res.json(quotations);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/quotations/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const quotation = await QuotationService.getQuotationById(Number(id));
    if (!quotation) return res.status(404).json({ error: "المقايسة غير موجودة" });
    res.json(quotation);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/quotations", async (req: Request, res: Response) => {
  try {
    const quotation = await QuotationService.createQuotation(req.body);
    res.status(201).json(quotation);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/quotations/:id/convert", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { address, fulfillmentSource } = req.body;
    const result = await QuotationService.convertQuotationToOrder(
      Number(id),
      address,
      fulfillmentSource
    );
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/quotations/:id/html", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await QuotationService.renderQuotationHtml(Number(id), res);
  } catch (error: any) {
    res.status(500).send("فشل عرض المقايسة: " + error.message);
  }
});

// ══════════════════════════════════════════════════════════════
// 3.6. تتبع الضمان والصيانة للأجهزة (Warranty & Maintenance API)
// ══════════════════════════════════════════════════════════════
app.get("/api/warranties", async (_req: Request, res: Response) => {
  try {
    const warranties = await WarrantyService.getAllWarranties();
    res.json(warranties);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/warranties", async (req: Request, res: Response) => {
  try {
    const { customerName, customerPhone, productName, serialNumber, warrantyMonths } = req.body;
    if (!customerName || !customerPhone || !productName) {
      return res.status(400).json({ error: "اسم العميل، الهاتف، واسم الجهاز مطلوبة لإصدار الضمان" });
    }
    const warranty = await WarrantyService.registerWarranty({
      customerName,
      customerPhone,
      productName,
      serialNumber,
      warrantyMonths: Number(warrantyMonths) || 12,
    });
    res.status(201).json(warranty);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.put("/api/warranties/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await WarrantyService.updateWarranty(Number(id), req.body);
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.delete("/api/warranties/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await WarrantyService.deleteWarranty(Number(id));
    res.json({ success: true, message: "تم حذف بطاقة الضمان بنجاح" });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/warranties/search", async (req: Request, res: Response) => {
  try {
    const q = req.query.q as string;
    if (!q) return res.status(400).json({ error: "معيار البحث مطلوب" });
    const results = await WarrantyService.searchWarranty(q);
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/warranties/tickets", async (req: Request, res: Response) => {
  try {
    const { warrantyId, issueDescription } = req.body;
    if (!warrantyId || !issueDescription) {
      return res.status(400).json({ error: "معرف الضمان ووصف العطل مطلوبان" });
    }
    const ticket = await WarrantyService.createMaintenanceTicket({
      warrantyId: Number(warrantyId),
      issueDescription: String(issueDescription),
    });
    res.status(201).json(ticket);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.patch("/api/warranties/tickets/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, actionTaken } = req.body;
    const updated = await WarrantyService.updateTicketStatus(Number(id), { status, actionTaken });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- 4. إدارة طاقم العمل والصلاحيات (Staff / RBAC APIs) ---
app.get("/api/staff", async (_req: Request, res: Response) => {
  try {
    const staff = await prisma.staff.findMany({
      orderBy: { id: "asc" },
      select: { id: true, username: true, name: true, role: true, createdAt: true },
    });
    res.json(staff);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/staff", async (req: Request, res: Response) => {
  try {
    const { username, name, role, pin } = req.body;
    if (!username || !name || !role) {
      return res.status(400).json({ error: "اسم المستخدم والاسم الكامل والصلاحية مطلوبة" });
    }

    const newStaff = await prisma.staff.create({
      data: {
        username: String(username).trim().toLowerCase(),
        name: String(name).trim(),
        role: String(role).toUpperCase(),
        pin: pin ? String(pin).trim() : "1234",
      },
      select: { id: true, username: true, name: true, role: true, createdAt: true },
    });
    res.status(201).json(newStaff);
  } catch (error: any) {
    res.status(400).json({ error: "اسم المستخدم مسجل مسبقاً أو بيانات غير صحيحة" });
  }
});

app.put("/api/staff/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, role, pin } = req.body;

    const updated = await prisma.staff.update({
      where: { id: Number(id) },
      data: {
        ...(name && { name: String(name).trim() }),
        ...(role && { role: String(role).toUpperCase() }),
        ...(pin && { pin: String(pin).trim() }),
      },
      select: { id: true, username: true, name: true, role: true, createdAt: true },
    });
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.delete("/api/staff/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.staff.delete({
      where: { id: Number(id) },
    });
    res.json({ success: true, message: "تم حذف المستخدم بنجاح" });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// --- 4. الواتساب (WhatsApp Status & Pairing Code) ---
app.get("/api/whatsapp/status", (_req: Request, res: Response) => {
  res.json(getWhatsAppStatus());
});

app.post("/api/whatsapp/pairing-code", async (req: Request, res: Response) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ error: "رقم الهاتف مطلوب" });
  }

  const result = await requestPairingCode(phone);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  res.json({ success: true, code: result.code });
});

// --- 5. إدارة الدعم البشري والتحويل اليدوي (Live Agent Handover API) ---
app.get("/api/handover", async (_req: Request, res: Response) => {
  try {
    const sessions = await prisma.customerSession.findMany({
      orderBy: { updatedAt: "desc" },
    });
    res.json(sessions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/handover/:phone/toggle", async (req: Request, res: Response) => {
  try {
    const { phone } = req.params;
    const { isHumanNeeded } = req.body;
    const cleanPhone = phone.replace(/[^0-9]/g, "");

    await setCustomerHumanHandover(cleanPhone, Boolean(isHumanNeeded));
    res.json({ success: true, phone: cleanPhone, isHumanNeeded: Boolean(isHumanNeeded) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ══════════════════════════════════════════════════════════════
// 6. إدارة المصروفات والخزنة النقدية (Expenses & Cash Drawer APIs)
// ══════════════════════════════════════════════════════════════
app.get("/api/expenses", async (_req: Request, res: Response) => {
  try {
    const expenses = await prisma.expense.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(expenses);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/expenses", async (req: Request, res: Response) => {
  try {
    const { amount, category, notes, createdBy } = req.body;
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({ error: "المبلغ مطلوب ويجب أن يكون رقماً موجباً" });
    }

    const expense = await prisma.expense.create({
      data: {
        amount: Number(amount),
        category: category ? String(category).trim() : "عام",
        notes: notes ? String(notes).trim() : null,
        createdBy: createdBy ? String(createdBy).trim() : "admin",
      },
    });
    res.status(201).json(expense);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/expenses/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.expense.delete({
      where: { id: Number(id) },
    });
    res.json({ success: true, message: "تم حذف المصروف بنجاح" });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// تقرير الخزنة الذكية المباشر (Smart Cash Drawer)
app.get("/api/cash-drawer", async (_req: Request, res: Response) => {
  try {
    // 1. حساب مبيعات الطلبات المكتملة وهامش الربح
    const completedOrders = await prisma.order.findMany({
      where: { status: "Completed" },
      select: { total: true, profitMargin: true, createdAt: true },
    });
    const totalCollectedCash = completedOrders.reduce((sum, o) => sum + o.total, 0);
    const totalProfitMargin = completedOrders.reduce((sum, o) => sum + (o.profitMargin || 0), 0);

    // 2. حساب إجمالي المصروفات
    const allExpenses = await prisma.expense.findMany();
    const totalExpenses = allExpenses.reduce((sum, e) => sum + e.amount, 0);

    // 3. صافي الخزنة الحالي
    const netCash = totalCollectedCash - totalExpenses;

    // 4. إحصائيات اليوم (Today Stats)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayOrders = completedOrders.filter((o) => new Date(o.createdAt) >= todayStart);
    const todayCollectedCash = todayOrders.reduce((sum, o) => sum + o.total, 0);
    const todayProfitMargin = todayOrders.reduce((sum, o) => sum + (o.profitMargin || 0), 0);

    const todayExpensesList = allExpenses.filter((e) => new Date(e.createdAt) >= todayStart);
    const todayExpenses = todayExpensesList.reduce((sum, e) => sum + e.amount, 0);
    const todayNetCash = todayCollectedCash - todayExpenses;

    // 5. تصنيف المصروفات
    const categoryBreakdown: Record<string, number> = {};
    for (const exp of allExpenses) {
      categoryBreakdown[exp.category] = (categoryBreakdown[exp.category] || 0) + exp.amount;
    }

    res.json({
      totalCollectedCash,
      totalExpenses,
      netCash,
      totalProfitMargin,
      todayProfitMargin,
      todayCollectedCash,
      todayExpenses,
      todayNetCash,
      completedOrdersCount: completedOrders.length,
      expensesCount: allExpenses.length,
      categoryBreakdown,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ══════════════════════════════════════════════════════════════
// 7. إدارة سجل العملاء و CRM (Customer Profile & History APIs)
// ══════════════════════════════════════════════════════════════
app.get("/api/customers", async (_req: Request, res: Response) => {
  try {
    const customers = await CustomerService.getAllCustomers();
    res.json(customers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/customers/:phone", async (req: Request, res: Response) => {
  try {
    const { phone } = req.params;
    const profile = await CustomerService.getCustomerProfile(phone);
    res.json(profile);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 السيرفر التجاري شغال بنجاح على: http://localhost:${PORT}`);
});
