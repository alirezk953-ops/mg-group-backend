/**
 * ═══════════════════════════════════════════════════════════════
 * 🔔 Admin Notifier — نظام التنبيهات الفورية للإدارة
 * ═══════════════════════════════════════════════════════════════
 * بيبعت إشعار فوري على جروب/شات تليجرام الإدارة فور تأكيد أي أوردر
 * سواء جاء من واتساب أو تليجرام أو لوحة التحكم
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_TELEGRAM_CHAT_ID;

/**
 * بيبعت رسالة نصية عبر Telegram Bot API مباشرة (بدون Telegraf)
 */
async function sendTelegramMessage(chatId: string, text: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN || !chatId) return false;
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("❌ Admin Notifier: فشل إرسال التنبيه:", err);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error("❌ Admin Notifier: خطأ في الاتصال:", err.message);
    return false;
  }
}

/**
 * إرسال رسالة مباشرة إلى شات/جروب الإدارة على تليجرام
 */
export async function sendAdminDirectAlert(text: string): Promise<boolean> {
  if (!ADMIN_CHAT_ID) {
    console.log("📢 [Admin Direct Alert - Console]:\n", text);
    return false;
  }
  return await sendTelegramMessage(ADMIN_CHAT_ID, text);
}

/**
 * الشكل الكامل لبيانات الأوردر اللي بيتبعت في التنبيه
 */
export interface OrderNotificationData {
  orderCode: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  productName: string;
  quantity: number;
  total: number;
  source: "WhatsApp" | "Telegram" | "Dashboard"; // مصدر الأوردر
}

/**
 * 🔔 الدالة الرئيسية — بتبعت تنبيه الإدارة عند كل أوردر جديد
 */
export async function notifyAdminNewOrder(data: OrderNotificationData): Promise<void> {
  if (!ADMIN_CHAT_ID) {
    // لو مفيش Chat ID محدد → نكتفي بـ log في الكونسول فقط
    console.log("📢 [Admin Alert - Console Only] أوردر جديد:", JSON.stringify(data, null, 2));
    return;
  }

  const sourceEmoji =
    data.source === "WhatsApp" ? "💬 واتساب" :
    data.source === "Telegram" ? "✈️ تليجرام" : "🖥️ لوحة التحكم";

  const message =
    `🔔 *أوردر جديد وارد!* ${sourceEmoji}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🏷️ *كود الأوردر:* \`#${data.orderCode.slice(0, 8).toUpperCase()}\`\n` +
    `👤 *العميل:* ${data.customerName}\n` +
    `📞 *الهاتف:* \`${data.customerPhone}\`\n` +
    `📍 *العنوان:* ${data.customerAddress}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📦 *المنتج:* ${data.productName}\n` +
    `🔢 *الكمية:* ${data.quantity} قطعة\n` +
    `💰 *الإجمالي:* *${data.total.toLocaleString()} ج.م*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `⏱️ ${new Date().toLocaleString("ar-EG", { timeZone: "Africa/Cairo" })}`;

  const sent = await sendTelegramMessage(ADMIN_CHAT_ID, message);

  if (sent) {
    console.log(`✅ Admin Notifier: تم إرسال تنبيه الأوردر #${data.orderCode.slice(0, 8)} للإدارة.`);
  }
}

/**
 * بيانات تنبيه التحويل للدعم البشري
 */
export interface HumanHandoverNotificationData {
  customerPhone: string;
  customerName?: string;
  userMessage: string;
  source: "WhatsApp" | "Telegram";
  ordersCount?: number;
  totalSpent?: number;
  isVip?: boolean;
}

/**
 * 🚨 تنبيه الإدارة لطلب تدخل بشري فوري (Live Agent Handover)
 */
export async function notifyAdminHumanHandover(data: HumanHandoverNotificationData): Promise<void> {
  if (!ADMIN_CHAT_ID) {
    console.log("📢 [Live Support Alert - Console Only]:", JSON.stringify(data, null, 2));
    return;
  }

  const sourceEmoji = data.source === "WhatsApp" ? "💬 واتساب" : "✈️ تليجرام";
  const vipBadge = data.isVip ? " 🎖️ *(عميل VIP مميز)*" : "";
  const crmStats = (data.ordersCount !== undefined && data.ordersCount > 0)
    ? `\n📊 *سجل العميل:* ${data.ordersCount} طلبات سابقة | إجمالي مسحوبات: *${(data.totalSpent || 0).toLocaleString()} ج.م*`
    : "";

  const message =
    `🚨 *طلب تدخل بشري عاجل (Live Support)!* ${sourceEmoji}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 *العميل:* ${data.customerName || "عميل غير مسجل"}${vipBadge}\n` +
    `📞 *الهاتف:* \`${data.customerPhone}\`${crmStats}\n` +
    `💬 *الرسالة الأخيرة:* "${data.userMessage}"\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `⚠️ *تم إيقاف الرد الآلي للعميل مؤقتاً لحين التدخل.*\n\n` +
    `↩️ *للرد الفوري على العميل من تليجرام:*\n` +
    `\`/reply ${data.customerPhone} رسالتك هنا\`\n\n` +
    `🔄 *لإعادة تفعيل البوت لهذا العميل أرسل:*\n` +
    `\`/bot_on ${data.customerPhone}\`\n` +
    `⏱️ ${new Date().toLocaleString("ar-EG", { timeZone: "Africa/Cairo" })}`;

  const sent = await sendTelegramMessage(ADMIN_CHAT_ID, message);

  if (sent) {
    console.log(`🚨 Admin Notifier: تم إرسال تنبيه طلب الدعم البشري للرقم ${data.customerPhone}`);
  }
}

/**
 * ⚠️ تنبيه نقص المخزون للإدارة (Low Stock Alert)
 */
export interface LowStockNotificationData {
  productName: string;
  currentStock: number;
  minThreshold: number;
}

export async function notifyAdminLowStock(data: LowStockNotificationData): Promise<void> {
  if (!ADMIN_CHAT_ID) {
    console.log("⚠️ [Low Stock Alert - Console Only]:", JSON.stringify(data, null, 2));
    return;
  }

  const message =
    `⚠️ *تنبيه نقص مخزون عاجل (Low Stock Alert)!*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📦 *المنتج:* ${data.productName}\n` +
    `📊 *الكمية المتبقية:* *${data.currentStock} قطع فقط!* (حد الأمان: ${data.minThreshold})\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🚨 *يُرجى إعطاء أمر توريد جديد وسد العجز في المخزن فوراً.*\n` +
    `⏱️ ${new Date().toLocaleString("ar-EG", { timeZone: "Africa/Cairo" })}`;

  const sent = await sendTelegramMessage(ADMIN_CHAT_ID, message);
  if (sent) {
    console.log(`⚠️ Admin Notifier: تم إرسال تنبيه نقص المخزون للمنتج ${data.productName}`);
  }
}
