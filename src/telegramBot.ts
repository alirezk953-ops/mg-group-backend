import { Telegraf, Markup } from "telegraf";
import prisma from "./prisma";
import { askGeminiWithIntent } from "./geminiService";
import { OrderService } from "./orderService";
import { setCustomerHumanHandover, sendWhatsAppTextMessage } from "./whatsappService";

export function initTelegramBot(): Telegraf<any> | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token || token === "YOUR_TELEGRAM_BOT_TOKEN_HERE") {
    console.log("⚠️ لم يتم تعيين TELEGRAM_BOT_TOKEN في ملف .env.");
    return null;
  }

  const bot = new Telegraf(token);

  // جلسات المستخدمين المؤقتة
  const userSessions = new Map<number, {
    step: "IDLE" | "AWAITING_NAME" | "AWAITING_PHONE" | "AWAITING_ADDRESS" | "AWAITING_QUANTITY";
    selectedProductId?: number;
    quantity?: number;
    customerName?: string;
    customerPhone?: string;
    customerAddress?: string;
  }>();

  function getSession(chatId: number) {
    if (!userSessions.has(chatId)) {
      userSessions.set(chatId, { step: "IDLE" });
    }
    return userSessions.get(chatId)!;
  }

  // أمر البداية /start
  bot.command("start", async (ctx) => {
    const welcomeText = `👋 أهلاً بك في منصة *MG Group* للأجهزة الكهربائية وتجهيزات الكافيهات والمنازل!\n\n` +
      `🏢 *المعرض الرئيسي:* 13 جسر السويس، مصر الجديدة، القاهرة (أمام المترو)\n` +
      `📞 *واتساب ومبيعات الشركة:* +20 12 21584153\n` +
      `🛡️ وكيل وموزع معتمد - ضمان رسمي 12 إلى 36 شهراً\n\n` +
      `🤖 أنا مساعدك الذكي ولوحة تحكم الإدارة والمبيعات:\n` +
      `• للأوامر الإدارية: /profit (تقرير الأرباح)، /showroom (جرد المعرض والمخزن)، /quotations (المقايسات)\n` +
      `• أو استخدم الأزرار السريعة بالأسفل للطلب وتصفح الأجهزة:`;

    await ctx.reply(welcomeText, Markup.keyboard([
      ["🛍️ عرض المنتجات", "📦 طلب جديد"],
      ["📊 تقرير الأرباح والمبيعات", "🏢 جرد المعرض والمخزن"],
      ["📋 طلباتي السابقة", "📑 المقايسات المفتوحة"]
    ]).resize());
  });

  // 📊 تقرير الأرباح والمبيعات ونظام التسعير المزدوج
  bot.command(["profit", "stats"], async (ctx) => {
    try {
      const orders = await prisma.order.findMany({
        include: { items: { include: { product: true } } },
      });

      const completedOrders = orders.filter((o) => o.status === "Completed");
      const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0);
      const totalProfit = completedOrders.reduce((sum, o) => sum + (o.profitMargin || 0), 0);

      const wholesaleOrders = orders.filter((o) => o.orderType === "WHOLESALE" || o.orderType === "COMMERCIAL_PROJECT");
      const retailOrders = orders.filter((o) => o.orderType === "RETAIL");

      const msg =
        `📊 *تقرير أرباح ومبيعات MG Group المباشر:*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `📦 *إجمالي الطلبات:* ${orders.length} طلب (${completedOrders.length} مكتمل)\n` +
        `💰 *المبيعات المحصلة:* ${totalRevenue.toLocaleString()} ج.م\n` +
        `📈 *صافي هامش الربح المحقق:* *${totalProfit.toLocaleString()} ج.م*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🏢 *أوردرات الجملة والمشاريع (B2B):* ${wholesaleOrders.length} أوردر\n` +
        `🏠 *أوردرات المستهلكين والقطاعي (B2C):* ${retailOrders.length} أوردر\n` +
        `⏱️ ${new Date().toLocaleString("ar-EG", { timeZone: "Africa/Cairo" })}`;

      await ctx.replyWithMarkdown(msg);
    } catch (err: any) {
      await ctx.reply("حدث خطأ أثناء جلب تقرير الأرباح: " + err.message);
    }
  });

  // 🏢 جرد مخزون المعرض ومخزون المخزن المركزي
  bot.command(["showroom", "stock"], async (ctx) => {
    try {
      const products = await prisma.product.findMany({ orderBy: { id: "asc" } });
      let msg = `🏢 *جرد أجهزة MG Group (المعرض والمخزن المركزي):*\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      products.forEach((p) => {
        msg += `🔹 *${p.name}*\n`;
        msg += `   📍 المعرض (13 جسر السويس): *${p.showroomStock}* قطعة\n`;
        msg += `   🏭 المخزن المركزي: *${p.warehouseStock}* قطعة\n`;
        msg += `   📦 الإجمالي: ${p.stock} قطعة | ضمان: ${p.warrantyMonths} شهر\n\n`;
      });

      await ctx.replyWithMarkdown(msg);
    } catch (err: any) {
      await ctx.reply("حدث خطأ أثناء جرد المخزون: " + err.message);
    }
  });

  // 📑 استعراض المقايسات المفتوحة
  bot.command("quotations", async (ctx) => {
    try {
      const quotes = await prisma.quotation.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
      });

      if (quotes.length === 0) {
        return ctx.reply("لا توجد مقايسات مسجلة حالياً.");
      }

      let msg = `📑 *أحدث مقايسات تجهيز الكافيهات والمنازل (MG Group):*\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      quotes.forEach((q) => {
        msg += `🏷️ *كود:* \`#${q.quoteCode}\` | الحالة: *${q.status}*\n`;
        msg += `👤 *العميل:* ${q.customerName} (${q.customerPhone})\n`;
        msg += `🏢 *المشروع:* ${q.projectType || "تجهيز وتوريد"}\n`;
        msg += `💰 *الإجمالي المطلوب:* *${q.finalTotal.toLocaleString()} ج.م* (خصم: ${q.discount} ج.م)\n\n`;
      });

      await ctx.replyWithMarkdown(msg);
    } catch (err: any) {
      await ctx.reply("حدث خطأ: " + err.message);
    }
  });

  bot.hears("📊 تقرير الأرباح والمبيعات", async (ctx) => {
    const fakeCtx = Object.assign(Object.create(ctx), { message: { text: "/profit" } });
    // @ts-ignore
    bot.handleUpdate({ ...ctx.update, message: { ...ctx.message, text: "/profit" } });
  });

  bot.hears("🏢 جرد المعرض والمخزن", async (ctx) => {
    // @ts-ignore
    bot.handleUpdate({ ...ctx.update, message: { ...ctx.message, text: "/showroom" } });
  });

  bot.hears("📑 المقايسات المفتوحة", async (ctx) => {
    // @ts-ignore
    bot.handleUpdate({ ...ctx.update, message: { ...ctx.message, text: "/quotations" } });
  });

  // 👨‍💼 أوامر الإدارة للتحكم في وضع الدعم البشري للبوت
  bot.command(["bot_on", "reset"], async (ctx) => {
    const parts = (ctx.message.text || "").split(/\s+/);
    const phone = parts[1]?.trim();
    if (!phone) {
      return ctx.reply("⚠️ يرجى كتابة رقم هاتف العميل بعد الأمر، مثال:\n/bot_on 201012345678");
    }
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    await setCustomerHumanHandover(cleanPhone, false);
    return ctx.reply(`✅ تم إعادة تفعيل البوت الآلي للعميل (+${cleanPhone}) بنجاح! البوت الآن جاهز للرد عليه.`);
  });

  bot.command("bot_off", async (ctx) => {
    const parts = (ctx.message.text || "").split(/\s+/);
    const phone = parts[1]?.trim();
    if (!phone) {
      return ctx.reply("⚠️ يرجى كتابة رقم هاتف العميل بعد الأمر، مثال:\n/bot_off 201012345678");
    }
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    await setCustomerHumanHandover(cleanPhone, true);
    return ctx.reply(`🚨 تم إيقاف البوت الآلي للعميل (+${cleanPhone}) وتحويله لوضع الدعم البشري.`);
  });

  // 💬 جسر الرد المباشر من تليجرام إلى واتساب (Telegram-to-WhatsApp Two-Way Bridge)
  bot.command("reply", async (ctx) => {
    const text = ctx.message.text || "";
    const match = text.match(/^\/reply\s+([0-9+]+)\s+(.+)$/s);
    if (!match) {
      return ctx.reply(
        "⚠️ طريقة استخدام غير صحيحة للأمر!\n\n" +
        "الصيغة الصحيحة:\n" +
        "`/reply 201012345678 نص رسالتك هنا للعميل`",
        { parse_mode: "Markdown" }
      );
    }

    const phone = match[1].trim();
    const replyMessage = match[2].trim();

    await ctx.sendChatAction("typing");
    const result = await sendWhatsAppTextMessage(phone, replyMessage);

    if (result.success) {
      return ctx.reply(
        `✅ *تم إرسال ردك للعميل على الواتساب بنجاح!*\n\n` +
        `👤 *الرقم:* \`${phone}\`\n` +
        `💬 *الرسالة:* "${replyMessage}"`,
        { parse_mode: "Markdown" }
      );
    } else {
      return ctx.reply(`❌ فشل إرسال الرسالة إلى (+${phone}): ${result.error || "تأكد من اتصال واتساب"}`);
    }
  });

  // عرض المنتجات المتوفرة بالأزرار التفاعلية (Inline Keyboards)
  bot.hears("🛍️ عرض المنتجات", async (ctx) => {
    try {
      const products = await prisma.product.findMany({
        orderBy: { id: "asc" },
      });
      if (products.length === 0) {
        return ctx.reply("عذراً، لا توجد منتجات متاحة حالياً.");
      }

      let msg = "🛒 *قائمة المنتجات المتاحة لدينا:*\n\n";
      products.forEach((p) => {
        msg += `🔹 *${p.name}*\n`;
        msg += `   💵 السعر: ${p.price.toLocaleString()} ج.م\n`;
        msg += `   📦 المخزون المتبقي: ${p.stock > 0 ? p.stock + " قطعة" : "نفد المخزون ❌"}\n\n`;
      });
      msg += "👇 *اضغط على المنتج الذي ترغب في طلبه مباشرة من الأزرار بالأسفل:*";

      // إنشاء أزرار تفاعلية لكل منتج متوفر
      const availableProducts = products.filter((p) => p.stock > 0);
      const buttons = availableProducts.map((p) => [
        Markup.button.callback(`🛒 اطلب ${p.name} (${p.price.toLocaleString()} ج.م)`, `select_product_${p.id}`)
      ]);

      await ctx.replyWithMarkdown(msg, Markup.inlineKeyboard(buttons));
    } catch (error: any) {
      await ctx.reply("حدث خطأ أثناء جلب المنتجات: " + error.message);
    }
  });

  // بدء عملية طلب جديد بالأزرار
  bot.hears("📦 طلب جديد", async (ctx) => {
    try {
      const products = await prisma.product.findMany({
        where: { stock: { gt: 0 } },
        orderBy: { id: "asc" },
      });

      if (products.length === 0) {
        return ctx.reply("للأسف لا توجد منتجات متوفرة بالمخزون حالياً للطلب.");
      }

      const buttons = products.map((p) => [
        Markup.button.callback(`🛒 ${p.name} - ${p.price.toLocaleString()} ج.م`, `select_product_${p.id}`)
      ]);

      await ctx.reply("من فضلك اختر المنتج الذي تريد طلبه بضغطة زر:", Markup.inlineKeyboard(buttons));
    } catch (error: any) {
      await ctx.reply("حدث خطأ: " + error.message);
    }
  });

  // استقبال اختيار المنتج بالأزرار التفاعلية
  bot.action(/^select_product_(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const productId = Number(ctx.match[1]);
    const product = await prisma.product.findUnique({ where: { id: productId } });

    if (!product || product.stock <= 0) {
      return ctx.reply("عذراً، هذا المنتج غير متاح حالياً أو نفد من المخزون.");
    }

    const session = getSession(ctx.chat!.id);
    session.selectedProductId = productId;
    session.step = "AWAITING_QUANTITY";

    const qtyButtons = [
      [
        Markup.button.callback("1️⃣ قطعة واحدة", `set_qty_${productId}_1`),
        Markup.button.callback("2️⃣ قطعتين", `set_qty_${productId}_2`),
        Markup.button.callback("3️⃣ 3 قطع", `set_qty_${productId}_3`),
      ],
      [
        Markup.button.callback("❌ إلغاء الطلب", "cancel_order")
      ]
    ];

    await ctx.reply(
      `اخترت: *${product.name}*\n💵 السعر: ${product.price.toLocaleString()} ج.م\n📦 المخزون المتاح: ${product.stock} قطعة\n\n🔢 اختر الكمية بضغطة زر بالأسفل أو اكتب رقماً في الشات:`,
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard(qtyButtons),
      }
    );
  });

  // استقبال تحديد الكمية بضغطة زر
  bot.action(/^set_qty_(\d+)_(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const productId = Number(ctx.match[1]);
    const quantity = Number(ctx.match[2]);
    const session = getSession(ctx.chat!.id);

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.stock < quantity) {
      return ctx.reply(`⚠️ عذراً، المخزون المتبقي (${product?.stock ?? 0} قطعة فقط) لا يكفي الكمية المطلوبة.`);
    }

    session.selectedProductId = productId;
    session.quantity = quantity;
    session.step = "AWAITING_NAME";

    await ctx.reply(
      `✅ تم اختيار: *${quantity}* قطعة من (${product.name}).\n💰 الإجمالي: *${(product.price * quantity).toLocaleString()} ج.م*\n\n📝 من فضلك اكتب *اسمك ثلاثي* لتسجيل الفاتورة:`,
      { parse_mode: "Markdown" }
    );
  });

  // إلغاء الطلب من الأزرار
  bot.action("cancel_order", async (ctx) => {
    await ctx.answerCbQuery();
    const session = getSession(ctx.chat!.id);
    session.step = "IDLE";
    session.selectedProductId = undefined;
    session.quantity = undefined;
    await ctx.reply("❌ تم إلغاء الطلب الحالي. يمكنك استعراض المنتجات في أي وقت عبر زر '🛍️ عرض المنتجات' بالأسفل.");
  });

  // تأكيد وحفظ الطلب نهائياً
  bot.action("confirm_order", async (ctx) => {
    await ctx.answerCbQuery();
    const session = getSession(ctx.chat!.id);

    if (!session.selectedProductId || !session.customerName || !session.customerPhone || !session.customerAddress) {
      return ctx.reply("⚠️ جلسة الطلب غير مكتملة، يرجى البدء من جديد عبر زر '📦 طلب جديد'.");
    }

    try {
      const order = await OrderService.createOrder({
        name: session.customerName,
        phone: session.customerPhone,
        address: session.customerAddress,
        items: [
          {
            productId: session.selectedProductId,
            quantity: session.quantity || 1,
          },
        ],
        source: "Telegram",
      });

      session.step = "IDLE";
      session.selectedProductId = undefined;
      session.quantity = undefined;

      const successMsg =
        `🎉 *تم تأكيد طلبك بنجاح وحفظه في لوحة التحكم!*\n\n` +
        `🔖 كود الأوردر: \`#${order.orderCode.slice(0, 8)}\`\n` +
        `👤 العميل: *${order.user.name}*\n` +
        `📞 الهاتف: \`${order.user.phone}\`\n` +
        `📦 المنتج: *${order.items[0]?.product?.name}* (×${order.items[0]?.quantity})\n` +
        `💰 المبلغ الإجمالي: *${order.total.toLocaleString()} جنيه مصري*\n` +
        `📍 العنوان: *${order.user.address}*\n` +
        `⏳ حالة الطلب: *قيد المراجعة والتحضير (Pending)*\n\n` +
        `سنتواصل معك عبر الهاتف لتأكيد موعد التوصيل قريباً! 🚚✨`;

      await ctx.replyWithMarkdown(successMsg);
    } catch (err: any) {
      session.step = "IDLE";
      await ctx.reply("حدث خطأ أثناء حفظ الطلب: " + err.message);
    }
  });

  // عرض الطلبات السابقة للمستخدم
  bot.hears("📋 طلباتي السابقة", async (ctx) => {
    await ctx.reply("من فضلك أدخل رقم هاتفك المسجل (مثال: 01012345678):");
    const session = getSession(ctx.chat.id);
    session.step = "AWAITING_PHONE";
  });

  // زر المساعدة
  bot.hears("ℹ️ المساعدة", async (ctx) => {
    await ctx.reply("🤖 هذا البوت مزود بذكاء اصطناعي تفاعلي:\n- تقدر تسألني أي سؤال كتابة (مثلاً: 'إيه أرخص لابتوب عندكم؟' أو 'عايز اطلب ايفون') وهرد عليك فوراً!\n- اضغط على '🛍️ عرض المنتجات' للاطلاع على الأسعار.\n- اضغط على '📦 طلب جديد' لحجز طلبك وخصم المخزون فوراً.");
  });

  // معالجة الرسائل النصية
  bot.on("text", async (ctx) => {
    const text = ctx.message.text.trim();
    const session = getSession(ctx.chat.id);

    // إلغاء العملية إذا كتب العميل إلغاء
    if (text === "إلغاء" || text === "الغاء" || text === "/cancel") {
      session.step = "IDLE";
      session.selectedProductId = undefined;
      session.quantity = undefined;
      return ctx.reply("❌ تم إلغاء الطلب الحالي. يمكنك بدء طلب جديد في أي وقت عبر '📦 طلب جديد' أو '🛍️ عرض المنتجات'!");
    }

    // 1. استقبال الكمية
    if (session.step === "AWAITING_QUANTITY") {
      const quantity = parseInt(text, 10);
      if (isNaN(quantity) || quantity <= 0 || !/^\d+$/.test(text)) {
        return ctx.reply("⚠️ برجاء إدخال رقم صحيح وموجب فقط (مثال: 1 أو 2):");
      }

      const product = await prisma.product.findUnique({
        where: { id: session.selectedProductId },
      });

      if (!product || product.stock < quantity) {
        return ctx.reply(`⚠️ عذراً، المخزون المتبقي هو (${product?.stock ?? 0}) قطعة فقط. يرجى اختيار كمية أقل:`);
      }

      session.quantity = quantity;
      session.step = "AWAITING_NAME";
      return ctx.reply(`تمام! تم تحديد الكمية (${quantity} قطعة).\nمن فضلك اكتب *اسمك ثلاثي* لتسجيل الفاتورة:`, {
        parse_mode: "Markdown"
      });
    }

    // 2. استقبال الاسم
    if (session.step === "AWAITING_NAME") {
      if (text.length < 3 || text.length > 50) {
        return ctx.reply("⚠️ يرجى كتابة اسم حقيقي مكون من 3 إلى 50 حرف:");
      }
      session.customerName = text;
      session.step = "AWAITING_PHONE";
      return ctx.reply("شكراً لك! من فضلك أدخل رقم الهاتف لتأكيد الطلب (مثال: 01012345678):");
    }

    // 3. استقبال رقم الهاتف
    if (session.step === "AWAITING_PHONE") {
      const cleanPhone = text.replace(/[\s-]/g, "");
      const phoneRegex = /^(01[0125][0-9]{8}|\+?[0-9]{10,15})$/;

      if (!phoneRegex.test(cleanPhone)) {
        return ctx.reply("⚠️ رقم الهاتف غير صحيح. يرجى إدخال رقم هاتف صالح (مثال: 01012345678):");
      }

      if (!session.selectedProductId) {
        const user = await prisma.user.findUnique({
          where: { phone: cleanPhone },
          include: {
            orders: {
              include: {
                items: { include: { product: true } },
              },
              orderBy: { id: "desc" },
            },
          },
        });

        session.step = "IDLE";
        if (!user || user.orders.length === 0) {
          return ctx.reply("لم نجد أي طلبات سابقة مسجلة بهذا الرقم.");
        }

        let reply = `📋 *الطلبات المسجلة للعميل ${user.name}:*\n\n`;
        user.orders.forEach((ord) => {
          reply += `🔹 أوردر: \`#${ord.orderCode.slice(0, 8)}\`\n`;
          reply += `   الحالة: *${ord.status === "Completed" ? "مكتمل ✅" : "قيد التنفيذ ⏳"}*\n`;
          reply += `   الإجمالي: ${ord.total.toLocaleString()} ج.م\n`;
          ord.items.forEach((it) => {
            reply += `   - ${it.product.name} (×${it.quantity})\n`;
          });
          reply += "\n";
        });

        return ctx.replyWithMarkdown(reply);
      }

      session.customerPhone = cleanPhone;
      session.step = "AWAITING_ADDRESS";
      return ctx.reply("ممتاز! أين مكان التوصيل؟ (يرجى كتابة المدينة، الحي، والشارع):");
    }

    // 4. استقبال العنوان وعرض ملخص الطلب مع زر التأكيد التفاعلي (Inline Button)
    if (session.step === "AWAITING_ADDRESS") {
      if (text.length < 5 || text.length > 200) {
        return ctx.reply("⚠️ يرجى كتابة عنوان واضح بالتفصيل (بين 5 و 200 حرف):");
      }

      session.customerAddress = text;

      const product = await prisma.product.findUnique({
        where: { id: session.selectedProductId },
      });

      const confirmButtons = [
        [
          Markup.button.callback("✅ تأكيد وإرسال الطلب الآن", "confirm_order"),
          Markup.button.callback("❌ إلغاء الطلب", "cancel_order"),
        ],
      ];

      const reviewMsg =
        `📋 *يرجى مراجعة تفاصيل طلبك قبل التأكيد:*\n\n` +
        `📦 *المنتج:* ${product?.name}\n` +
        `🔢 *الكمية:* ${session.quantity} قطعة\n` +
        `💰 *المبلغ المطلوب:* ${((product?.price || 0) * (session.quantity || 1)).toLocaleString()} ج.م\n` +
        `👤 *الاسم:* ${session.customerName}\n` +
        `📞 *الهاتف:* ${session.customerPhone}\n` +
        `📍 *العنوان:* ${session.customerAddress}\n\n` +
        `👇 *اضغط على زر التأكيد بالأسفل لإتمام الطلب فوراً:*`;

      return ctx.replyWithMarkdown(reviewMsg, Markup.inlineKeyboard(confirmButtons));
    }

    // --- 5. الذكاء الاصطناعي مع التقاط نية الشراء التلقائية (AI Intent Recognition) ---
    try {
      await ctx.sendChatAction("typing");

      const productListContext = await OrderService.getProductsContext();
      const aiResult = await askGeminiWithIntent(text, productListContext);

      // إذا كانت رسالة واحدة تحتوي على كافة البيانات الحقيقية المؤكدة (اسم + هاتف + عنوان)
      const isTgOrderComplete =
        aiResult.intent === "ORDER" &&
        aiResult.orderData?.productId &&
        aiResult.orderData?.customerName &&
        aiResult.orderData.customerName !== "عميل واتساب" &&
        aiResult.orderData.customerName.length >= 3 &&
        aiResult.orderData?.customerAddress &&
        aiResult.orderData.customerAddress.length >= 5 &&
        aiResult.orderData?.customerPhone &&
        aiResult.orderData.customerPhone !== "01000000000";

      if (isTgOrderComplete && aiResult.orderData?.productId) {
        try {
          const autoOrder = await OrderService.createOrder({
            name: aiResult.orderData.customerName!,
            phone: aiResult.orderData.customerPhone!,
            address: aiResult.orderData.customerAddress!,
            items: [
              {
                productId: aiResult.orderData.productId,
                quantity: aiResult.orderData.quantity || 1,
              },
            ],
            source: "Telegram",
          });

          await ctx.replyWithMarkdown(
            `🎉 *تم إنشاء طلبك الذكي بنجاح!*\nكود الأوردر: \`#${autoOrder.orderCode.slice(0, 8)}\`\nالإجمالي: ${autoOrder.total.toLocaleString()} ج.م`
          );
          return;
        } catch {
          // في حالة النقص بالمخزون نعود للرد العادي
        }
      }

      // لو العميل يريد شراء منتج محدد أو نية شراء ولكن تنقص البيانات -> الانتقال لخطوة إدخال الاسم
      if (
        (aiResult.intent === "BUY_PRODUCT" || aiResult.intent === "ORDER") &&
        aiResult.orderData?.productId
      ) {
        const product = await prisma.product.findUnique({
          where: { id: aiResult.orderData.productId },
        });
        if (product && product.stock > 0) {
          session.selectedProductId = product.id;
          session.quantity = aiResult.orderData.quantity || 1;
          session.customerName = undefined;
          session.customerPhone = undefined;
          session.customerAddress = undefined;
          session.step = "AWAITING_NAME";
          return ctx.replyWithMarkdown(
            `ممتاز جداً! تم اختيار: *${product.name}* (${product.price.toLocaleString()} ج.م) 📦\n\nعشان نجهز أوردرك، من فضلك اكتب **اسمك بالكامل** 📝`
          );
        }
      }

      await ctx.reply(aiResult.reply);
    } catch (aiErr: any) {
      console.error("Gemini Handling Error:", aiErr);
      await ctx.reply("أهلاً بك! تقدر تتصفح المنتجات من خلال الأزرار بالأسفل في أي وقت.");
    }
  });

  bot.launch()
    .then(() => console.log("🤖 تم تشغيل بوت التليجرام بنجاح (مع دعم الـ AI والـ OrderService)!"))
    .catch((err) => console.error("❌ فشل تشغيل بوت التليجرام:", err.message));

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));

  return bot;
}
