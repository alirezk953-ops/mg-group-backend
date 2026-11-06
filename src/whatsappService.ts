import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";
import prisma from "./prisma";
import { askGeminiWithIntent, extractOrderFromFreeText, extractPhoneFromText, findProductByName } from "./geminiService";
import { OrderService } from "./orderService";
import { notifyAdminHumanHandover, sendAdminDirectAlert } from "./adminNotifier";
import { CustomerService } from "./customerService";

let currentQR: string | null = null;
let currentPairingCode: string | null = null;
let isConnected = false;
let waSock: any = null;

// كاشف هل الـ JID رقم هاتف حقيقي أم LID (معرف واتساب داخلي)
// الـ LID عادةً رقم طويل جداً (أكثر من 15 خانة) أو يحتوي على @lid
function isRealPhoneNumber(jidOrPhone: string): boolean {
  const clean = jidOrPhone.replace(/@(s\.whatsapp\.net|lid)$/, "").replace(/\D/g, "");
  // رقم الهاتف الدولي الحقيقي بين 7 و 15 خانة (معيار E.164)
  return clean.length >= 7 && clean.length <= 15;
}

// دالة إرسال آمنة تحمي السيرفر من أي Crash أو انقطاع مفاجئ في المقبس
async function safeSendMessage(sock: any, jid: string, content: any): Promise<boolean> {
  try {
    if (!sock) return false;
    await sock.sendMessage(jid, content);
    return true;
  } catch (err: any) {
    console.error(`⚠️ فشل إرسال رسالة واتساب إلى (${jid}):`, err?.message || err);
    return false;
  }
}

/**
 * 🚀 دالة إرسال رسالة نصية لأي عميل على الواتساب (Telegram-to-WhatsApp Two-Way Bridge)
 */
export async function sendWhatsAppTextMessage(
  recipientPhoneOrJid: string,
  text: string
): Promise<{ success: boolean; error?: string }> {
  if (!waSock || !isConnected) {
    return { success: false, error: "بوت الواتساب غير متصل حالياً بالسيرفر" };
  }

  let clean = recipientPhoneOrJid.replace(/[^0-9]/g, "");
  if (clean.startsWith("01") && clean.length === 11) {
    clean = "20" + clean;
  }

  if (clean.length < 8) {
    return { success: false, error: "رقم الهاتف غير صالح" };
  }

  const targetJid = clean.includes("@") ? clean : `${clean}@s.whatsapp.net`;
  const sent = await safeSendMessage(waSock, targetJid, { text });
  return { success: sent, error: sent ? undefined : "فشل إرسال رسالة الواتساب" };
}

// نظام الجلسات التفاعلية للواتساب (Interactive WhatsApp Sessions)
// أضفنا مرحلة WAITING_FOR_PHONE مثل التليجرام
interface WhatsAppSession {
  step: "IDLE" | "WAITING_FOR_PRODUCT_SELECTION" | "WAITING_FOR_QUANTITY" | "WAITING_FOR_NAME" | "WAITING_FOR_PHONE" | "WAITING_FOR_ADDRESS" | "WAITING_FOR_CONFIRM";
  products?: { id: number; name: string; price: number; stock: number }[];
  selectedProduct?: { id: number; name: string; price: number; stock: number };
  quantity?: number;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  lastActivity: number;
  // 🆕 آخر منتج شافه العميل (للـ Keyword Matching بدون AI)
  lastViewedProduct?: { id: number; name: string; price: number; stock: number };
  // 🆕 وضع الدعم البشري (Live Agent Handover)
  isHumanNeeded?: boolean;
  // 🆕 عنوان مقترح من سجل العميل السابق (CRM)
  suggestedAddress?: string;
}

// ══════════════════════════════════════════════════════════════
// 👨‍💼 كلمات طلب التحويل للدعم البشري (Live Agent Handover)
// ══════════════════════════════════════════════════════════════
const HUMAN_REQUEST_KEYWORDS = [
  /موظف/i, /خدمة عملاء/i, /خدمه عملاء/i, /بني آدم/i, /بني ادم/i, /شخص حقيقي/i, 
  /كلمني بشري/i, /مسؤول/i, /مسئول/i, /الدعم الفني/i, /الدعم/i, /إنسان/i, /انسان/i,
  /تحدث مع موظف/i, /عايز اكلم حد/i, /عاوز اكلم حد/i, /خدمه العملاء/i, /خدمة العملاء/i,
  /محادثة بشرية/i, /محتاج شخص/i, /حولني لموظف/i
];

function isHumanSupportRequested(msg: string): boolean {
  return HUMAN_REQUEST_KEYWORDS.some((rgx) => rgx.test(msg));
}

/**
 * دالة لتعديل وضع الدعم البشري للعميل في الذاكرة وقاعدة البيانات
 */
export async function setCustomerHumanHandover(phone: string, isHumanNeeded: boolean): Promise<boolean> {
  const session = whatsappSessions.get(phone);
  if (session) {
    session.isHumanNeeded = isHumanNeeded;
  }
  try {
    await prisma.customerSession.upsert({
      where: { phone },
      update: { isHumanNeeded },
      create: { phone, isHumanNeeded },
    });
    return true;
  } catch (err: any) {
    console.error("Error setting customer handover:", err.message);
    return false;
  }
}

// ══════════════════════════════════════════════════════════════
// 🎯 Keyword Matching — كلمات نية الشراء الصريحة
// بتشتغل قبل الـ AI تماماً وبتوفر وقت الاستجابة
// ══════════════════════════════════════════════════════════════
const PURCHASE_INTENT_PATTERNS = [
  /\bاطلب\b/i, /\bأطلب\b/i,
  /\bعايز\b/i, /\bعاوز\b/i,
  /\bهاته\b/i,  /\bهاتي\b/i,
  /\bاشتري\b/i, /\bأشتري\b/i,
  /\bمحتاج\b/i, /\bمحتاجه\b/i,
  /\bتمام هات\b/i,
  /\bاطلبه\b/i, /\bأطلبه\b/i,
  /\bاوردر\b/i,
  /\bحابب اشتري\b/i, /\bحاسب اطلب\b/i,
  /\bابعت\b/i,   /\bابعتهولي\b/i,
  /\bوريني\b.*\bالخطوات\b/i,
  /\bمشتري\b/i,
  /\bهاخد\b/i,   /\bهآخد\b/i,
];

/**
 * يكشف هل رسالة العميل تعبر عن نية شراء صريحة؟
 */
function hasPurchaseIntent(message: string): boolean {
  return PURCHASE_INTENT_PATTERNS.some((pattern) => pattern.test(message));
}

const whatsappSessions = new Map<string, WhatsAppSession>();
// قفل المستخدمين النشطين لمنع معالجة الرسائل المتزامنة في نفس اللحظة (Debounce / Throttling)
const processingSenders = new Set<string>();
// تتبع آخر وقت اتصال بالذكاء الاصطناعي لكل مستخدم لمنع سبام الـ API
const lastAiRequest = new Map<string, number>();

function getWASession(phone: string): WhatsAppSession {
  const now = Date.now();
  const session = whatsappSessions.get(phone);
  // انتهاء صلاحية الجلسة تلقائياً بعد 30 دقيقة خمول
  if (!session || (now - session.lastActivity > 30 * 60 * 1000)) {
    const newSession: WhatsAppSession = {
      step: "IDLE",
      lastActivity: now,
    };
    whatsappSessions.set(phone, newSession);
    return newSession;
  }
  session.lastActivity = now;
  return session;
}

// دالة مركزية لإنشاء الأوردر وإرسال إيصال التأكيد في الواتساب
async function createAndConfirmWAOrder(
  sock: any,
  senderJid: string,
  session: WhatsAppSession,
  overridePhone?: string
): Promise<void> {
  // ✅ إصلاح: نستخدم رقم الهاتف المُدخَل من العميل فعلياً فقط
  // نرفض استخدام senderJid إذا كان LID (معرف واتساب داخلي مش رقم هاتف حقيقي)
  let phone = overridePhone || session.customerPhone;
  if (!phone) {
    // محاولة أخيرة: استخراج من الـ JID فقط لو كان رقم هاتف حقيقي
    const fromJid = senderJid.replace(/@(s\.whatsapp\.net|lid)$/, "");
    if (isRealPhoneNumber(fromJid)) {
      phone = fromJid;
    } else {
      // الـ JID هو LID → لا يمكن إكمال الطلب بدون رقم حقيقي
      await safeSendMessage(sock, senderJid, {
        text:
          `⚠️ لم يتم حفظ رقم هاتفك بعد.\n` +
          `📞 من فضلك أرسل رقم موبايلك لإتمام الطلب (مثال: 01012345678):`,
      });
      session.step = "WAITING_FOR_PHONE";
      return;
    }
  }
  try {
    const order = await OrderService.createOrder({
      name: session.customerName!,
      phone,
      address: session.customerAddress!,
      items: [{ productId: session.selectedProduct!.id, quantity: session.quantity || 1 }],
      source: "WhatsApp",
    });

    // إعادة تهيئة الجلسة
    session.step = "IDLE";
    session.selectedProduct = undefined;
    session.quantity = undefined;
    session.products = undefined;
    session.customerName = undefined;
    session.customerPhone = undefined;
    session.customerAddress = undefined;

    const confirmMsg =
      `🎉 *تم تأكيد طلبك بنجاح وحفظه في لوحة التحكم!*\n\n` +
      `🏷️ *كود الأوردر:* \`#${order.orderCode.slice(0, 8)}\`\n` +
      `👤 *العميل:* ${order.user.name}\n` +
      `📞 *الهاتف:* \`+${order.user.phone}\`\n` +
      `📦 *المنتج:* ${order.items[0]?.product?.name} (×${order.items[0]?.quantity})\n` +
      `💰 *المبلغ الإجمالي:* *${order.total.toLocaleString()} جنيه مصري*\n` +
      `📍 *العنوان:* ${order.user.address}\n` +
      `⏳ *حالة الطلب:* قيد المراجعة والتحضير (Pending)\n\n` +
      `🚚 سنتواصل معك عبر الهاتف لتأكيد موعد التوصيل قريباً!\nشكراً لثقتك بنا. ✨`;

    await safeSendMessage(sock, senderJid, { text: confirmMsg });
  } catch (err: any) {
    session.step = "IDLE";
    await safeSendMessage(sock, senderJid, {
      text: `⚠️ حدث خطأ أثناء حفظ الطلب: ${err.message}\nيرجى المحاولة مجدداً أو إرسال كلمة *المنتجات* للبدء من جديد.`,
    });
  }
}

// تحويل الأرقام العربية (١، ٢، ٣) إلى أرقام قياسية (1, 2, 3)
function normalizeArabicDigits(str: string): string {
  const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
  return str.replace(/[٠-٩]/g, (char) => arabicDigits.indexOf(char).toString());
}

// إرسال قائمة المنتجات المرقمة التفاعلية
async function sendNumberedMenu(sock: any, senderJid: string, introTitle?: string): Promise<boolean> {
  const senderPhone = senderJid.replace("@s.whatsapp.net", "");
  const session = getWASession(senderPhone);

  const products = await prisma.product.findMany({
    where: { stock: { gt: 0 } },
    orderBy: { id: "asc" },
  });

  if (products.length === 0) {
    await safeSendMessage(sock, senderJid, {
      text: "عذراً، لا توجد منتجات متوفرة بالمخزون حالياً للطلب. تواصل معنا لاحقاً!",
    });
    return false;
  }

  const emojiNumbers = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

  let text = introTitle || "🏢 *أهلاً بك في MG Group للأجهزة الكهربائية والتجهيزات!*\n📍 المعرض الرئيسي: 13 جسر السويس، مصر الجديدة\n📞 هاتف وواتساب المبيعات: +20 12 21584153\n\n🛍️ *كتالوج الأجهزة والأسعار المعتمدة:*";
  text += "\n\n";

  products.forEach((p, idx) => {
    const num = emojiNumbers[idx] || `${idx + 1}️⃣`;
    text += `${num} *${p.name}*\n`;
    text += `   💵 سعر قطاعي: *${p.price.toLocaleString()} ج.م*\n`;
    if ((p as any).wholesalePrice) {
      text += `   💼 سعر جملة وتجار: *${(p as any).wholesalePrice.toLocaleString()} ج.م*\n`;
    }
    text += `   🛡️ ضمان معتمد: ${(p as any).warrantyMonths || 12} شهر | 📦 متوفر: ${p.stock} قطعة\n\n`;
  });

  text += "━━━━━━━━━━━━━━━━━━━━\n";
  text += "💡 *للطلب الفوري:* أرسل رقم الجهاز (مثلاً: 1 أو 2)\n";
  text += "🏢 *لتجهيز كافيه أو شقة أو عرض سعر:* اكتب *مقايسة*\n";
  text += "📍 *لزيارة المعرض أو اللوكيشن:* اكتب *العنوان*\n";
  text += "💬 أو اسألني أي سؤال بكلامك العادي وسأجيبك فوراً! 🤖";

  session.step = "WAITING_FOR_PRODUCT_SELECTION";
  session.products = products.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    stock: p.stock,
  }));

  await safeSendMessage(sock, senderJid, { text });
  return true;
}

export function getWhatsAppStatus() {
  return {
    isConnected,
    qr: currentQR,
    pairingCode: currentPairingCode,
  };
}

export async function requestPairingCode(
  phoneNumber: string
): Promise<{ success: boolean; code?: string; error?: string }> {
  try {
    if (!waSock) {
      return { success: false, error: "خدمة الواتساب غير مهيأة بعد، يرجى المحاولة بعد لحظات." };
    }

    if (isConnected) {
      return { success: false, error: "الواتساب متصل بالفعل!" };
    }

    let cleanNumber = phoneNumber.replace(/[^0-9]/g, "");

    if (cleanNumber.startsWith("01") && cleanNumber.length === 11) {
      cleanNumber = "20" + cleanNumber;
    }

    if (cleanNumber.length < 10) {
      return {
        success: false,
        error: "رقم الهاتف غير صحيح، يرجى كتابة كود الدولة متبوعاً بالرقم (مثال: 201012345678)",
      };
    }

    console.log(`📲 جاري طلب كود الاقتران لرقم الهاتف: +${cleanNumber}...`);
    const code = await waSock.requestPairingCode(cleanNumber);
    currentPairingCode = code;
    console.log(`🔑 تم استلام كود الاقتران بنجاح: [ ${code} ]`);

    return { success: true, code };
  } catch (err: any) {
    console.error("❌ فشل توليد كود الاقتران:", err.message);
    return { success: false, error: err.message || "حدث خطأ أثناء طلب كود الاقتران" };
  }
}

export async function connectToWhatsApp() {
  try {
    const AUTH_FOLDER = process.env.AUTH_FOLDER || "auth_info_baileys";
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      browser: ["Ubuntu", "Chrome", "20.0.04"],
    });

    waSock = sock;

    sock.ev.on("connection.update", (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        currentQR = qr;
        console.log("\n=======================================================");
        console.log("📱 امسح الـ QR Code بكاميرا الواتساب على موبايلك لربط البوت:");
        console.log("=======================================================\n");
        qrcode.generate(qr, { small: true });
        console.log("\n(أو استخدم كود الاقتران برقم الهاتف من لوحة التحكم)\n");
      }

      if (connection === "close") {
        isConnected = false;
        currentPairingCode = null;
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        console.log(`⚠️ انقطع اتصال الواتساب (رمز: ${statusCode}). إعادة الاتصال:`, shouldReconnect);
        
        // لو 401 أو loggedOut نحذف الجلسة القديمة وننتظر كود جديد
        if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
          console.log("🔄 الجلسة القديمة انتهت أو تم فك الارتباط من الموبايل. جاري تهيئة جلسة نظيفة...");
          try {
            const fs = require("fs");
            if (fs.existsSync(AUTH_FOLDER)) {
              fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
            }
          } catch {}
          setTimeout(connectToWhatsApp, 3000);
        } else if (shouldReconnect) {
          setTimeout(connectToWhatsApp, 5000);
        }
      } else if (connection === "open") {
        isConnected = true;
        currentQR = null;
        currentPairingCode = null;
        console.log("✅ تم الاتصال بالواتساب بنجاح! بوت الواتساب الآن أونلاين وجاهز 🚀");
      }
    });

    sock.ev.on("creds.update", saveCreds);

    // استقبال ومعالجة رسائل الواتساب بنظام القوائم المرقمة والذكاء الاصطناعي
    sock.ev.on("messages.upsert", async ({ messages, type }) => {
      if (type !== "notify") return;

      for (const msg of messages) {
        try {
          if (msg.key.fromMe || !msg.key.remoteJid || msg.key.remoteJid.endsWith("@g.us")) continue;

          const senderJid = msg.key.remoteJid;
          const userMessage =
            msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text ||
            "";

          if (!userMessage.trim()) continue;

          const cleanMsg = userMessage.trim();
          const senderPhone = senderJid.replace(/@(s\.whatsapp\.net|lid)$/, "");
          console.log(`📩 رسالة واتساب جديدة من (+${senderPhone}): ${cleanMsg}`);

          // حماية من الرسائل المتزامنة السريعة (Debouncing / Throttling)
          if (processingSenders.has(senderPhone)) {
            console.log(`⏳ تم تأجيل رسالة متزامنة من (+${senderPhone}) لتفادي التكرار`);
            continue;
          }
          processingSenders.add(senderPhone);

          const session = getWASession(senderPhone);

        // ══════════════════════════════════════════════════════════════
        // 0. أمر إعادة تشغيل البوت / إيقاف الدعم البشري (/bot_on أو /reset)
        // ══════════════════════════════════════════════════════════════
        if (/^(\/bot_on|\/reset|\/auto|تفعيل البوت|شغل البوت)$/i.test(cleanMsg)) {
          session.isHumanNeeded = false;
          await setCustomerHumanHandover(senderPhone, false);
          await safeSendMessage(sock, senderJid, {
            text: "🤖 *تم إعادة تفعيل الرد الآلي بنجاح!*\nأهلاً بك مجدداً، أرسل كلمة *المنتجات* لاستعراض الكتالوج أو اسألني أي سؤال وسأجيبك فوراً! 🚀",
          });
          continue;
        }

        // ══════════════════════════════════════════════════════════════
        // 0.1 فحص طلب التحويل للدعم البشري (Live Agent Handover)
        // ══════════════════════════════════════════════════════════════
        if (isHumanSupportRequested(cleanMsg)) {
          session.isHumanNeeded = true;
          await setCustomerHumanHandover(senderPhone, true);
          prisma.customerSession.update({
            where: { phone: senderPhone },
            data: { lastMessage: cleanMsg },
          }).catch(() => {});

          // استرجاع سجل العميل لتغذية الإدارة بملف الـ CRM
          const cProfile = await CustomerService.getCustomerProfile(senderPhone).catch(() => null);

          notifyAdminHumanHandover({
            customerPhone: senderPhone,
            customerName: session.customerName || cProfile?.name,
            userMessage: cleanMsg,
            source: "WhatsApp",
            ordersCount: cProfile?.totalOrders,
            totalSpent: cProfile?.totalSpent,
            isVip: cProfile?.isVip,
          }).catch((e) => console.error("Admin Handover Alert Error:", e));

          await safeSendMessage(sock, senderJid, {
            text:
              `👨‍💼 *تم إبلاغ فريق الدعم البشري والإدارة فوراً!*\n\n` +
              `لقد أوقفنا الردود الآلية مؤقتاً وسيتواصل معك أحد مسؤولي خدمة العملاء شخصياً عبر هذا الشات في أقرب وقت.\n\n` +
              `💬 تفضل بكتابة كل ما تحتاجه وسنتابع معك مباشرة. ✨\n\n` +
              `*(للرجوع للمساعد الآلي في أي وقت، اكتب: تفعيل البوت)*`,
          });
          continue;
        }

        // ══════════════════════════════════════════════════════════════
        // 0.2 وضع صمت البوت أثناء الدعم البشري (تحويل رسائل العميل لتليجرام)
        // ══════════════════════════════════════════════════════════════
        if (session.isHumanNeeded) {
          console.log(`🤫 وضع الدعم البشري نشط للرقم (+${senderPhone}) — جاري تحويل الرسالة لتليجرام.`);
          prisma.customerSession.update({
            where: { phone: senderPhone },
            data: { lastMessage: cleanMsg },
          }).catch(() => {});

          const forwardText =
            `💬 *رسالة واردة من عميل (دعم بشري)*:\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n` +
            `📞 *الهاتف:* \`${senderPhone}\`\n` +
            `📝 *الرسالة:* "${cleanMsg}"\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n` +
            `↩️ للرد عليه فوراً اكتب:\n` +
            `\`/reply ${senderPhone} رسالتك هنا\``;

          sendAdminDirectAlert(forwardText).catch((e) => console.error("Telegram Forward Error:", e));
          continue;
        }

        // ══════════════════════════════════════════════════════════════
        // 1. إلغاء الطلب في أي وقت
        // ══════════════════════════════════════════════════════════════
        if (cleanMsg === "إلغاء" || cleanMsg === "الغاء" || cleanMsg.toLowerCase() === "cancel") {
          session.step = "IDLE";
          session.selectedProduct = undefined;
          session.quantity = undefined;
          session.products = undefined;
          session.customerName = undefined;
          session.customerPhone = undefined;
          session.customerAddress = undefined;
          session.suggestedAddress = undefined;
          await safeSendMessage(sock, senderJid, {
            text: "❌ تم إلغاء الطلب بنجاح. أرسل كلمة *المنتجات* في أي وقت لاستعراض القائمة من جديد! 🌸",
          });
          continue;
        }

        // ══════════════════════════════════════════════════════════════
        // 2. التحيات المباشرة الصريحة (رد فوري مباشر 0 توكنز وبدون AI مع تمييز العميل القديم)
        // ══════════════════════════════════════════════════════════════
        const isGreeting = /^(السلام عليكم|سلام عليكم|سلام|ازيك|ازي حضرتك|مساء الخير|صباح الخير|اهلا|أهلا|أهلاً|مرحبا|هاي|hello|hi)$/i.test(cleanMsg);
        if (isGreeting && session.step === "IDLE") {
          const cProfile = await CustomerService.getCustomerProfile(senderPhone).catch(() => null);
          if (cProfile && cProfile.exists && cProfile.name) {
            const vipText = cProfile.isVip ? " 🌟 (عميلنا المميز)" : "";
            await safeSendMessage(sock, senderJid, {
              text:
                `أهلاً وسهلاً بك يا أستاذ *${cProfile.name}*${vipText} في *MG Group* للأجهزة الكهربائية والتجهيزات! 🌸\n` +
                `📍 معرضنا الرئيسي: 13 جسر السويس، مصر الجديدة\n` +
                `يسعدنا خدمتك مجدداً، أرسل كلمة *المنتجات* لاستعراض الأسعار والضمان، أو *مقايسة* لتجهيز كافيه أو شقة، أو اسألني عن أي جهاز تريده وسأجيبك فوراً! 🤖`,
            });
          } else {
            await safeSendMessage(sock, senderJid, {
              text:
                `أهلاً وسهلاً بك في *MG Group* للأجهزة الكهربائية وتجهيزات الكافيهات والمنازل! 🌸\n` +
                `📍 المعرض الرئيسي: 13 جسر السويس، مصر الجديدة (أمام محطة المترو)\n` +
                `📞 هاتف وواتساب المبيعات: +20 12 21584153\n\n` +
                `يسعدنا مساعدتك:\n` +
                `🛍️ للأسعار والكتالوج: أرسل كلمة *المنتجات*\n` +
                `💼 لأسعار الجملة والتجار: أرسل *جملة*\n` +
                `📑 لطلب مقايسة تجهيز مكان: أرسل *مقايسة*\n` +
                `📍 للعنوان واللوكيشن: أرسل *المعرض*\n` +
                `أو اسألني بأي طريقة وسأرد عليك فوراً! 🤖`,
            });
          }
          continue;
        }

        // ══════════════════════════════════════════════════════════════
        // 3. طلب عرض القائمة المرقمة والأسعار المباشر (رد فوري من DB 0 توكنز)
        // ══════════════════════════════════════════════════════════════
        const isMenuTrigger = /(منتجات|المنتجات|اسعار|الاسعار|الأسعار|قائمة|القائمة|menu|كتالوج|الكتالوج|المتوفر|المتاح|البضاعة)/i.test(cleanMsg) &&
          !hasPurchaseIntent(cleanMsg);
        if (isMenuTrigger && session.step === "IDLE") {
          await sendNumberedMenu(sock, senderJid);
          continue;
        }

        // ══════════════════════════════════════════════════════════════
        // 4. استفسار مباشر وسريع عن منتج وسعره ومخزونه (رد فوري 0 توكنز)
        // ══════════════════════════════════════════════════════════════
        if (session.step === "IDLE") {
          const productInMsg = await findProductByName(cleanMsg);
          if (productInMsg) {
            session.lastViewedProduct = productInMsg;
          }

          const isPriceOrInfo = /(بكام|كام|سعر|تكلفة|تفاصيل|مواصفات|معلومات|متاح|متوفر|مخزون)/i.test(cleanMsg);
          if (productInMsg && isPriceOrInfo && !hasPurchaseIntent(cleanMsg)) {
            const cardText =
              `🔹 *${productInMsg.name}*\n` +
              `💵 السعر: *${productInMsg.price.toLocaleString()} ج.م*\n` +
              `📦 المخزون المتاح: *${productInMsg.stock} قطعة*\n\n` +
              `💡 *للطلب الفوري:* أرسل *حابب اطلب واحد* أو اكتب *المنتجات* لاختيار رقمه! 🚀`;
            await safeSendMessage(sock, senderJid, { text: cardText });
            continue;
          }
        }

        // ══════════════════════════════════════════════════════════════
        // 3. One-Shot: رسالة واحدة كاملة البيانات الحقيقية فقط
        //    مثال: "عاوز لابتوب ديل / اسمي علي رزق / 01015555555 / 12 شارع حامد"
        // ══════════════════════════════════════════════════════════════
        if (session.step === "IDLE") {
          const oneShot = await extractOrderFromFreeText(cleanMsg, senderPhone);
          // تحقق صارم: لا نقبل One-Shot إلا إذا توفرت بيانات حقيقية بنسبة 100%
          if (
            oneShot &&
            oneShot.productId &&
            oneShot.customerName &&
            oneShot.customerName !== "عميل واتساب" &&
            oneShot.customerAddress &&
            oneShot.customerAddress.length >= 5 &&
            oneShot.customerPhone &&
            isRealPhoneNumber(oneShot.customerPhone)
          ) {
            const matchedProduct = await prisma.product.findUnique({ where: { id: oneShot.productId } });

            if (matchedProduct && matchedProduct.stock > 0) {
              session.selectedProduct = matchedProduct;
              session.lastViewedProduct = matchedProduct;
              session.quantity = oneShot.quantity || 1;
              session.customerName = oneShot.customerName;
              session.customerPhone = oneShot.customerPhone;
              session.customerAddress = oneShot.customerAddress;
              session.step = "WAITING_FOR_CONFIRM";

              const total = matchedProduct.price * (session.quantity || 1);
              const summaryMsg =
                `🤖 *فهمت طلبك! تفاصيل الأوردر:*\n\n` +
                `📦 المنتج: *${matchedProduct.name}*\n` +
                `🔢 الكمية: *${session.quantity} قطعة*\n` +
                `💰 الإجمالي: *${total.toLocaleString()} ج.م*\n` +
                `👤 الاسم: *${session.customerName}*\n` +
                `📞 الهاتف: *${session.customerPhone}*\n` +
                `📍 العنوان: *${session.customerAddress}*\n\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `✅ *1* — تأكيد وإرسال الطلب الآن\n` +
                `❌ *2* — إلغاء الطلب`;

              await safeSendMessage(sock, senderJid, { text: summaryMsg });
              continue;
            }
          }
        }

        // ══════════════════════════════════════════════════════════════
        // 3.5 طبقة فحص نية الشراء الصريحة (Rule-Based Keyword Matching)
        // إذا العميل كتب "حابب اطلب واحد" أو "عايز اشتري ديل"
        // ══════════════════════════════════════════════════════════════
        if (session.step === "IDLE") {
          const productInMsg = await findProductByName(cleanMsg);
          // إذا ذكر العميل منتج في رسالته، نحفظه كآخر منتج تم الاطلاع عليه
          if (productInMsg) {
            session.lastViewedProduct = productInMsg;
          }

          // فحص هل الرسالة تحتوي على نية شراء صريحة؟
          if (hasPurchaseIntent(cleanMsg)) {
            const targetProduct = productInMsg || session.lastViewedProduct;

            if (targetProduct) {
              const liveProduct = await prisma.product.findUnique({ where: { id: targetProduct.id } });
              if (liveProduct && liveProduct.stock > 0) {
                // استخراج الكمية إن وجدت، أو افتراضي 1
                let qty = 1;
                const qtyMatch = cleanMsg.match(/(\d+)\s*(?:قطعة|حبة|عدد|pieces?|qty)?/i);
                if (qtyMatch && parseInt(qtyMatch[1], 10) > 0) {
                  qty = Math.min(parseInt(qtyMatch[1], 10), liveProduct.stock);
                }

                session.selectedProduct = liveProduct;
                session.lastViewedProduct = liveProduct;
                session.quantity = qty;
                // تفريغ أي بيانات وهمية سابقة وإجبار التدفق خطوة بخطوة
                session.customerName = undefined;
                session.customerPhone = undefined;
                session.customerAddress = undefined;
                session.step = "WAITING_FOR_NAME";

                const replyText =
                  `ممتاز جداً! تم اختيار: *${liveProduct.name}* (${liveProduct.price.toLocaleString()} ج.م) 📦\n\n` +
                  `عشان نجهز أوردرك، من فضلك اكتب **اسمك بالكامل** 📝`;

                await safeSendMessage(sock, senderJid, { text: replyText });
                continue;
              } else if (liveProduct && liveProduct.stock <= 0) {
                await safeSendMessage(sock, senderJid, {
                  text: `⚠️ عذراً يا فندم، المنتج (*${liveProduct.name}*) نفد من المخزون حالياً.\nأرسل كلمة *المنتجات* لاستعراض الأجهزة المتاحة حالياً! 🌸`,
                });
                continue;
              }
            } else {
              // نية شراء بدون ذكر منتج ولا يوجد منتج محفوظ في الجلسة -> عرض القائمة المرقمة فوراً
              await sendNumberedMenu(
                sock,
                senderJid,
                `أهلاً بك يا فندم! 🛍️ يسعدنا خدمتك.\nمن فضلك اختر رقم المنتج الذي تود شراءه من القائمة:`
              );
              continue;
            }
          }
        }

        // ══════════════════════════════════════════════════════════════
        // 4. مرحلة اختيار المنتج من القائمة المرقمة
        // ══════════════════════════════════════════════════════════════
        if (session.step === "WAITING_FOR_PRODUCT_SELECTION") {
          const selectedIdx = parseInt(normalizeArabicDigits(cleanMsg), 10) - 1;
          if (!isNaN(selectedIdx) && session.products && session.products[selectedIdx]) {
            const chosen = session.products[selectedIdx];

            const liveProduct = await prisma.product.findUnique({ where: { id: chosen.id } });
            if (!liveProduct || liveProduct.stock <= 0) {
              await safeSendMessage(sock, senderJid, {
                text: "⚠️ عذراً، هذا المنتج نفد من المخزون للتو! أرسل رقماً آخر أو أرسل *المنتجات* لعرض القائمة المحدثة.",
              });
              continue;
            }

            session.selectedProduct = liveProduct;
            session.step = "WAITING_FOR_QUANTITY";

            const replyText =
              `✅ ممتاز! لقد اخترت:\n*${liveProduct.name}*\n` +
              `💵 السعر: *${liveProduct.price.toLocaleString()} ج.م*\n` +
              `📦 المتاح بالمخزن: ${liveProduct.stock} قطعة\n\n` +
              `🔢 *كم عدد القطع التي ترغب في طلبها؟*\n` +
              `(أرسل رقماً فقط، مثلاً: 1 أو 2 — أو أرسل "إلغاء")`;

            await safeSendMessage(sock, senderJid, { text: replyText });
            continue;
          }
          // رقم غير صالح → نتركه يمر لـ Gemini
        }

        // ══════════════════════════════════════════════════════════════
        // 5. مرحلة تحديد الكمية
        // ══════════════════════════════════════════════════════════════
        if (session.step === "WAITING_FOR_QUANTITY") {
          const qty = parseInt(normalizeArabicDigits(cleanMsg), 10);
          if (isNaN(qty) || qty <= 0) {
            await safeSendMessage(sock, senderJid, {
              text: "⚠️ برجاء إرسال رقم صحيح وموجب للكمية (مثال: 1 أو 2) أو أرسل *إلغاء*:",
            });
            continue;
          }

          if (session.selectedProduct && qty > session.selectedProduct.stock) {
            await safeSendMessage(sock, senderJid, {
              text: `⚠️ عذراً، المخزون المتبقي هو (${session.selectedProduct.stock}) قطعة فقط. يرجى إرسال كمية أقل أو اكتب *إلغاء*:`,
            });
            continue;
          }

          session.quantity = qty;
          session.step = "WAITING_FOR_NAME";

          const totalEstimate = (session.selectedProduct?.price || 0) * qty;
          await safeSendMessage(sock, senderJid, {
            text:
              `👍 تمام! الكمية: *${qty} قطعة* — الإجمالي: *${totalEstimate.toLocaleString()} ج.م*\n\n` +
              `📝 من فضلك اكتب *اسمك الكريم* (الاسم الثلاثي) لتسجيل الفاتورة:`,
          });
          continue;
        }

        // ══════════════════════════════════════════════════════════════
        // 6. مرحلة إدخال الاسم
        // ══════════════════════════════════════════════════════════════
        if (session.step === "WAITING_FOR_NAME") {
          if (cleanMsg.length < 3 || cleanMsg.length > 60) {
            await safeSendMessage(sock, senderJid, {
              text: "⚠️ يرجى كتابة اسم حقيقي مكون من 3 إلى 60 حرف:",
            });
            continue;
          }

          session.customerName = cleanMsg;
          session.step = "WAITING_FOR_PHONE";

          await safeSendMessage(sock, senderJid, {
            text:
              `أهلاً بك يا أستاذ *${cleanMsg}*! 🌹\n\n` +
              `📞 *ما رقم هاتفك للتواصل والتوصيل؟*\n` +
              `(اكتب رقمك، أو أرسل كلمة *تخطي* لاستخدام رقم واتسابك تلقائياً)`,
          });
          continue;
        }

        // ══════════════════════════════════════════════════════════════
        // 7. مرحلة إدخال رقم الهاتف (جديد)
        // ══════════════════════════════════════════════════════════════
        if (session.step === "WAITING_FOR_PHONE") {
          const isSkip = /^(تخطي|تخطى|skip|بعدين|لا)$/i.test(cleanMsg.trim());

          if (isSkip) {
            // ✅ إصلاح: تخطي يُستخدم senderPhone فقط لو كان رقم هاتف حقيقي (مش LID)
            if (isRealPhoneNumber(senderPhone)) {
              session.customerPhone = senderPhone;
            } else {
              // الـ senderPhone هو LID → نرفض التخطي ونطلب رقم حقيقي
              await safeSendMessage(sock, senderJid, {
                text:
                  `⚠️ لا يمكن استخدام رقم واتسابك تلقائياً في هذه الحالة.\n` +
                  `📞 يرجى إرسال رقم موبايلك الحقيقي للتواصل (مثال: 01012345678):`,
              });
              continue;
            }
          } else {
            const extractedPhone = extractPhoneFromText(cleanMsg);
            if (!extractedPhone) {
              await safeSendMessage(sock, senderJid, {
                text:
                  `⚠️ لم أتعرف على رقم هاتف صالح في رسالتك.\n` +
                  `يرجى إرسال رقمك بالأرقام فقط (مثال: 01012345678 أو 201012345678)\n` +
                  `أو أرسل كلمة *تخطي* لاستخدام رقم واتسابك.`,
              });
              continue;
            }
            session.customerPhone = extractedPhone;
          }

          session.step = "WAITING_FOR_ADDRESS";

          // فحص العنوان السابق في الـ CRM لاقتراحه على العميل كخيار سريع
          const cProfile = await CustomerService.getCustomerProfile(session.customerPhone).catch(() => null);
          if (cProfile && cProfile.lastAddress) {
            session.suggestedAddress = cProfile.lastAddress;
            await safeSendMessage(sock, senderJid, {
              text:
                `✅ تم حفظ رقم الهاتف: *${session.customerPhone}*\n\n` +
                `📍 مسجل لدينا عنوانك السابق:\n` +
                `🏠 *"${cProfile.lastAddress}"*\n\n` +
                `💡 هل ترغب في الشحن لهذا العنوان؟\n` +
                `أرسل كلمة *(نعم)* لتأكيده، أو اكتب عنوانك الجديد بالتفصيل 🚚:`,
            });
          } else {
            await safeSendMessage(sock, senderJid, {
              text:
                `✅ تم حفظ رقم الهاتف: *${session.customerPhone}*\n\n` +
                `📍 *الخطوة الأخيرة:* اكتب عنوان التوصيل بالتفصيل\n` +
                `(المحافظة — المنطقة/الحي — اسم الشارع ورقم المبنى):`,
            });
          }
          continue;
        }

        // ══════════════════════════════════════════════════════════════
        // 8. مرحلة إدخال العنوان → عرض ملخص التأكيد
        // ══════════════════════════════════════════════════════════════
        if (session.step === "WAITING_FOR_ADDRESS") {
          let chosenAddress = cleanMsg;
          const isConfirmSuggested = /^(نعم|ايوه|أيوة|تمام|اه|أه|yes|اوك|أوك)$/i.test(cleanMsg.trim());

          if (isConfirmSuggested && session.suggestedAddress) {
            chosenAddress = session.suggestedAddress;
          } else if (cleanMsg.length < 5 || cleanMsg.length > 250) {
            await safeSendMessage(sock, senderJid, {
              text: "⚠️ يرجى كتابة عنوان واضح ومفصل (5 أحرف على الأقل) أو إرسال (نعم) لتأكيد عنوانك السابق:",
            });
            continue;
          }

          session.customerAddress = chosenAddress;
          session.step = "WAITING_FOR_CONFIRM";

          const total = (session.selectedProduct?.price || 0) * (session.quantity || 1);
          // ✅ إصلاح: نعرض الهاتف الحقيقي المُدخَل فقط — لا نستخدم senderPhone إلا لو كان رقم حقيقي
          const displayPhone = session.customerPhone || (isRealPhoneNumber(senderPhone) ? senderPhone : "—");
          const summaryMsg =
            `📋 *ملخص طلبك — راجع البيانات وأكد:*\n\n` +
            `📦 المنتج: *${session.selectedProduct?.name}*\n` +
            `🔢 الكمية: *${session.quantity} قطعة*\n` +
            `💰 الإجمالي: *${total.toLocaleString()} ج.م*\n` +
            `👤 الاسم: *${session.customerName}*\n` +
            `📞 الهاتف: *${displayPhone}*\n` +
            `📍 العنوان: *${session.customerAddress}*\n\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `✅ *1* — تأكيد وإرسال الطلب الآن\n` +
            `❌ *2* — إلغاء الطلب`;

          await safeSendMessage(sock, senderJid, { text: summaryMsg });
          continue;
        }

        // ══════════════════════════════════════════════════════════════
        // 9. مرحلة التأكيد النهائي (جديد) — 1=تأكيد / 2=إلغاء
        // ══════════════════════════════════════════════════════════════
        if (session.step === "WAITING_FOR_CONFIRM") {
          const choice = normalizeArabicDigits(cleanMsg.trim());

          if (choice === "1" || cleanMsg.trim() === "تأكيد" || cleanMsg.trim() === "نعم") {
            await createAndConfirmWAOrder(sock, senderJid, session);
            continue;
          } else if (choice === "2" || cleanMsg.trim() === "إلغاء" || cleanMsg.trim() === "لا") {
            session.step = "IDLE";
            session.selectedProduct = undefined;
            session.quantity = undefined;
            session.products = undefined;
            session.customerName = undefined;
            session.customerPhone = undefined;
            session.customerAddress = undefined;
            await safeSendMessage(sock, senderJid, {
              text: "❌ تم إلغاء الطلب. أرسل *المنتجات* متى شئت لبدء طلب جديد! 😊",
            });
            continue;
          } else {
            // رد غير مفهوم في مرحلة التأكيد
            await safeSendMessage(sock, senderJid, {
              text:
                `⚠️ لم أفهم اختيارك.\n` +
                `أرسل *1* للتأكيد وإتمام الطلب، أو *2* للإلغاء.`,
            });
            continue;
          }
        }

        // ══════════════════════════════════════════════════════════════
        // 10. معالجة الرسائل العادية عبر Google Gemini AI (مع حماية التردد)
        // ══════════════════════════════════════════════════════════════
        try {
          // حماية الـ API من التردد العالي (AI Throttling / Rate-Limit Protection)
          const lastCall = lastAiRequest.get(senderPhone) || 0;
          const timeSinceLast = Date.now() - lastCall;
          if (timeSinceLast < 2000) {
            // تأخير هادئ لمنع خطأ 429
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }
          lastAiRequest.set(senderPhone, Date.now());

          const productListContext = await OrderService.getProductsContext();
          const aiResult = await askGeminiWithIntent(userMessage, productListContext);

          // تحقق صارم: هل بيانات الأوردر من الـ AI مكتملة وحقيقية 100%؟
          const isCompleteAiOrder =
            aiResult.intent === "ORDER" &&
            aiResult.orderData?.productId &&
            aiResult.orderData?.customerName &&
            aiResult.orderData.customerName !== "عميل واتساب" &&
            aiResult.orderData.customerName.length >= 3 &&
            !/(عايز|عاوز|اطلب|اشتري|واحد|هات|محتاج)/i.test(aiResult.orderData.customerName) &&
            aiResult.orderData?.customerAddress &&
            aiResult.orderData.customerAddress.length >= 5 &&
            !/(عايز|عاوز|اطلب|اشتري|واحد|هات|محتاج)/i.test(aiResult.orderData.customerAddress) &&
            aiResult.orderData?.customerPhone &&
            isRealPhoneNumber(aiResult.orderData.customerPhone);

          if (isCompleteAiOrder && aiResult.orderData?.productId) {
            // نجهز الجلسة ونعرض ملخص التأكيد لأن البيانات حقيقية وكاملة
            const liveProduct = await prisma.product.findUnique({ where: { id: aiResult.orderData.productId } });
            if (liveProduct && liveProduct.stock > 0) {
              session.selectedProduct = liveProduct;
              session.lastViewedProduct = liveProduct;
              session.quantity = aiResult.orderData.quantity || 1;
              session.customerName = aiResult.orderData.customerName;
              session.customerPhone = aiResult.orderData.customerPhone;
              session.customerAddress = aiResult.orderData.customerAddress;
              session.step = "WAITING_FOR_CONFIRM";

              const total = liveProduct.price * session.quantity;
              const aiSummaryMsg =
                `🤖 *فهمت طلبك! راجع التفاصيل:*\n\n` +
                `📦 المنتج: *${liveProduct.name}*\n` +
                `🔢 الكمية: *${session.quantity} قطعة*\n` +
                `💰 الإجمالي: *${total.toLocaleString()} ج.م*\n` +
                `👤 الاسم: *${session.customerName}*\n` +
                `📞 الهاتف: *${session.customerPhone}*\n` +
                `📍 العنوان: *${session.customerAddress}*\n\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `✅ *1* — تأكيد وإرسال الطلب الآن\n` +
                `❌ *2* — إلغاء الطلب`;

              await safeSendMessage(sock, senderJid, { text: aiSummaryMsg });
              continue;
            }
          }

          // لو حدد الذكاء الاصطناعي نية شراء منتج (أو ORDER ببيانات ناقصة) -> إجبار الانتقال لـ WAITING_FOR_NAME
          if ((aiResult.intent === "BUY_PRODUCT" || aiResult.intent === "ORDER") && aiResult.orderData?.productId) {
            const liveProduct = await prisma.product.findUnique({ where: { id: aiResult.orderData.productId } });
            if (liveProduct && liveProduct.stock > 0) {
              session.selectedProduct = liveProduct;
              session.lastViewedProduct = liveProduct;
              session.quantity = aiResult.orderData.quantity || 1;
              session.customerName = undefined;
              session.customerPhone = undefined;
              session.customerAddress = undefined;
              session.step = "WAITING_FOR_NAME";

              const replyMsg =
                `ممتاز جداً! تم اختيار: *${liveProduct.name}* (${liveProduct.price.toLocaleString()} ج.م) 📦\n\n` +
                `عشان نجهز أوردرك، من فضلك اكتب **اسمك بالكامل** 📝`;

              await safeSendMessage(sock, senderJid, { text: replyMsg });
              continue;
            }
          }

          // حفظ آخر منتج تم الاستفسار عنه لاستخدامه عند الرغبة بالشراء لاحقاً
          const queriedProduct = await findProductByName(userMessage);
          if (queriedProduct) {
            session.lastViewedProduct = queriedProduct;
          }

          // رد AI عادي مع تلميح للقائمة المرقمة
          let replyWithHint = aiResult.reply;
          if (/سعر|كام|منتج|شراء|اطلب|متوفر|متاح/i.test(userMessage)) {
            replyWithHint += "\n\n💡 *ملاحظة: يمكنك إرسال كلمة \"المنتجات\" لعرض قائمة مرقمة والاختيار منها بضغطة زر.*";
          }

          await safeSendMessage(sock, senderJid, { text: replyWithHint });
        } catch (err: any) {
          console.error("❌ خطأ أثناء معالجة رسالة الواتساب عبر Gemini:", err.message);
          await safeSendMessage(sock, senderJid, {
            text: "أهلاً بك! يمكنك إرسال كلمة *المنتجات* في أي وقت لعرض المنتجات واختيار طلبك برقم المنتج بسهولة.",
          });
        }
      } catch (msgErr: any) {
        console.error("❌ خطأ غير متوقع أثناء معالجة رسالة واتساب مفردة:", msgErr?.message || msgErr);
      } finally {
        const sPhone = msg.key?.remoteJid ? msg.key.remoteJid.replace(/@(s\.whatsapp\.net|lid)$/, "") : "";
        if (sPhone) processingSenders.delete(sPhone);
      }
    }
  });
  } catch (err: any) {
    console.error("❌ فشل تشغيل خدمة الواتساب Baileys:", err.message);
  }
}
