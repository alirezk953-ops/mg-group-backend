import dotenv from "dotenv";
import prisma from "./prisma";

dotenv.config();

export interface AiIntentResult {
  intent: "INQUIRY" | "ORDER" | "BUY_PRODUCT" | "WHOLESALE_INQUIRY" | "QUOTATION_REQUEST" | "WARRANTY_CHECK";
  reply: string;
  customerType?: "RETAIL" | "WHOLESALE" | "COMMERCIAL_PROJECT";
  projectType?: string;
  orderData?: {
    productId?: number;
    productName?: string;
    quantity?: number;
    customerName?: string;
    customerPhone?: string;
    customerAddress?: string;
  };
  quotationData?: {
    projectType?: string;
    customerName?: string;
    customerPhone?: string;
    items?: { productId: number; productName: string; quantity: number }[];
  };
}

// قائمة نماذج Gemini الرسمية النشطة مع التبديل التلقائي
const CANDIDATE_MODELS = [
  "gemini-1.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash-latest",
  "gemini-1.5-pro"
];

// معلومات وهوية شركة MG Group الرسمية
export const MG_COMPANY_INFO = {
  name: "MG Group (مجموعة إم جي للأجهزة الكهربائية)",
  agentType: "وكيل وموزع معتمد لكبرى ماركات الأجهزة الكهربائية والمنزلية وتجهيزات الكافيهات",
  showroomAddress: "13 شارع جسر السويس، مصر الجديدة، القاهرة (أمام محطة مترو جسر السويس مباشرة)",
  locationUrl: "https://maps.app.goo.gl/MGGroup13GesrSuez",
  salesPhone: "+20 12 21584153",
  workingHours: "يومياً من 10:00 صباحاً حتى 11:00 مساءً",
  warrantyInfo: "ضمان رسمي معتمد من 12 إلى 36 شهراً ضد عيوب الصناعة مع مركز صيانة واستبدال فوري",
};

// =====================================================
// محرك البحث المحلي عن المنتجات بالاسم
// =====================================================
export async function findProductByName(
  query: string
): Promise<{ id: number; name: string; price: number; wholesalePrice: number | null; stock: number } | null> {
  const products = await prisma.product.findMany({ where: { stock: { gt: 0 } } });
  const q = query.toLowerCase().trim();

  let best: { product: typeof products[0]; score: number } | null = null;
  for (const p of products) {
    const pName = p.name.toLowerCase();
    const words = pName.split(/\s+/);
    let score = 0;
    for (const w of words) {
      if (w.length > 2 && q.includes(w)) score += w.length;
    }
    const queryWords = q.split(/[\s/\-,]+/);
    for (const qw of queryWords) {
      if (qw.length > 2 && pName.includes(qw)) score += qw.length;
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { product: p, score };
    }
  }
  return best ? best.product : null;
}

// =====================================================
// استخراج رقم هاتف مصري من نص حر بـ RegEx
// =====================================================
export function extractPhoneFromText(text: string): string | null {
  const m = text.match(/(?:01[0125]\d{8}|\+?20\s?1[0125]\d{8})/);
  if (!m) return null;
  let phone = m[0].replace(/\s/g, "").replace(/^\+/, "");
  if (phone.startsWith("201")) return phone;
  if (phone.startsWith("01")) return "20" + phone;
  return phone;
}

// =====================================================
// استخراج بيانات الأوردر من رسالة نصية حرة محلياً
// =====================================================
export async function extractOrderFromFreeText(message: string, _senderPhone: string): Promise<{
  productId: number;
  productName: string;
  quantity: number;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
} | null> {
  const text = message.trim();
  const product = await findProductByName(text);
  if (!product) return null;

  let customerName = "";
  const nameMatch = text.match(/(?:اسم[يى]?|الاسم|name)\s*[:\s]\s*([^\n\r/\\|،,]+)/i);
  if (nameMatch) {
    const raw = nameMatch[1].trim().split(/[/\\|،\n]/)[0].trim();
    if (raw.length >= 3 && raw.length <= 60 && !/(عايز|عاوز|اطلب|اشتري|هات|محتاج|واحد)/i.test(raw)) {
      customerName = raw;
    }
  }

  const extractedPhone = extractPhoneFromText(text);

  let customerAddress = "";
  const addrMatch = text.match(/(?:عنوان[يى]?|العنوان|address|شارع|ش\.)\s*[:\s]\s*([^\n\r/\\|،]+)/i);
  if (addrMatch) {
    const raw = addrMatch[1].trim().split(/[|،\n]/)[0].trim();
    if (raw.length >= 5 && !/(عايز|عاوز|اطلب|اشتري|واحد|هات)/i.test(raw)) {
      customerAddress = raw;
    }
  }

  if (!customerName || !extractedPhone || !customerAddress) {
    return null;
  }

  let quantity = 1;
  const qtyMatch = text.match(/(\d+)\s*(?:قطعة|حبة|عدد|pieces?|qty)/i);
  if (qtyMatch) quantity = Math.min(parseInt(qtyMatch[1]), product.stock);

  return {
    productId: product.id,
    productName: product.name,
    quantity,
    customerName,
    customerPhone: extractedPhone,
    customerAddress,
  };
}

// =====================================================
// الـ Smart Local Fallback المحسّن لـ MG Group
// =====================================================
export function smartLocalFallback(userMessage: string, productContext: string): AiIntentResult {
  const clean = userMessage.trim().toLowerCase();

  // 1. السؤال عن العنوان أو اللوكيشن أو المعرض
  if (/(مكانكم|عنوان|المعرض|فين|مصر الجديدة|جسر السويس|اللوكيشن|لوكيشن|المحل|الفرع)/i.test(clean)) {
    return {
      intent: "INQUIRY",
      reply:
        `📍 *معرض MG Group الرئيسي بمصر الجديدة:*\n` +
        `تشرفنا بزيارتك يا فندم! العنوان: *${MG_COMPANY_INFO.showroomAddress}*\n` +
        `🚗 رابط موقع المعرض على خرائط جوجل:\n${MG_COMPANY_INFO.locationUrl}\n\n` +
        `⏰ مواعيد العمل: ${MG_COMPANY_INFO.workingHours}\n` +
        `📞 هاتف وواتساب المبيعات: ${MG_COMPANY_INFO.salesPhone}\n` +
        `متوفر بالمعرض كافة الأجهزة الكهربائية وتجهيزات الكافيهات والمنازل مع معاينة وتجربة فورية! ✨`,
    };
  }

  // 2. استفسارات تجار الجملة والكافيهات (B2B Wholesale)
  if (/(جملة|تجار|كافيه|كافيهات|مطعم|مطاعم|كميات|موزع|سعر الجملة|اسعار الجملة|بكام جملة)/i.test(clean)) {
    return {
      intent: "WHOLESALE_INQUIRY",
      customerType: "WHOLESALE",
      reply:
        `أهلاً بحضرتك في قسم المبيعات التجارية وتجار الجملة بشركة *MG Group*! 🤝💼\n\n` +
        `نحن وكيل وموزع معتمد نوفر أسعار جملة خاصة جداً وهامش ربح ممتاز لأصحاب المحلات والكافيهات والمطاعم مع فواتير ضريبية وضمان رسمي.\n\n` +
        `📋 *لإرسال قائمة أسعار الجملة المعتمدة وعروض الكميات:* من فضلك اكتب لنا:\n` +
        `1. اسم المحل أو الكافيه\n` +
        `2. الأجهزة المطلوبة والكميات التقريبية\n` +
        `وسيقوم مسؤول قطاع التجاري بالتواصل معك فوراً أو إرسال مقايسة رسمية! 📦`,
    };
  }

  // 3. طلبات المقايسة وتجهيز العرائس والكافيهات (Packages & Quoting)
  if (/(مقايسة|مقايسه|عرض سعر|تجهيز كافيه|تجهيز شقة|تجهيز عروسة|عايز اجهز|باكدج|باقة)/i.test(clean)) {
    return {
      intent: "QUOTATION_REQUEST",
      customerType: "COMMERCIAL_PROJECT",
      reply:
        `ألف مبروك وبالتوفيق في تجهيز المكان يا فندم! 🌟🏢\n` +
        `في *MG Group* بنجهز كبرى الكافيهات والشقق بأعلى كفاءة وأفضل أسعار توريد مجمعة مع خصم خاص للباقات الكاملة وضمان شامل.\n\n` +
        `📝 *لعمل مقايسة رسمية فورية بـ PDF شيك:* أرسل لنا قائمة الأجهزة المطلوبة (مثلاً: 5 كاتل + 3 خلاط ثقيل + 2 دفاية) والاسم الكريم، وهنبعتلك المقايسة والإجمالي والخصم فوراً! 📑`,
    };
  }

  // 4. استفسارات الضمان والصيانة (Warranty & Maintenance)
  if (/(ضمان|صيانة|تصليح|عطل|استبدال|قطع غيار|تالف)/i.test(clean)) {
    return {
      intent: "WARRANTY_CHECK",
      reply:
        `أهلاً بك يا فندم في مركز خدمة عملاء وضمان *MG Group* 🛡️\n` +
        `كافة أجهزتنا أصلية ومشمولة بضمان رسمي من 12 إلى 36 شهراً.\n\n` +
        `🔧 لتسجيل تذكرة صيانة أو فحص حالة الضمان: أرسل لنا *رقم الهاتف المسجل به الفاتورة* أو كود الضمان، أو شرفنا بجهازك في مركز المعرض بـ *13 جسر السويس، مصر الجديدة* لخدمتك فوراً!`,
    };
  }

  // 5. تحيات وترحيب
  if (/^(ازيك|السلام عليكم|سلام|مرحبا|اهلا|أهلا|أهلاً|صباح الخير|مساء الخير|هاي|hello|hi)/i.test(clean)) {
    return {
      intent: "INQUIRY",
      reply:
        `أهلاً وسهلاً بحضرتك في *MG Group* للأجهزة الكهربائية وتجهيزات الكافيهات والمنازل! 🌸\n` +
        `وكيل معتمد وموزع رسمي - معرض مصر الجديدة: 13 جسر السويس 📍\n\n` +
        `يسعدنا خدمتك:\n` +
        `🛍️ تصفح الأجهزة والأسعار: اكتب كلمة *المنتجات*\n` +
        `💼 لأسعار الجملة والتجار: اكتب *جملة*\n` +
        `📑 لطلب مقايسة تجهيز كافيه أو شقة: اكتب *مقايسة*\n` +
        `أو اسألني مباشرة عن أي جهاز وسأجيبك فوراً! 🤖`,
    };
  }

  // 6. استعراض قائمة الأجهزة
  if (/^(عاوز اعمل اوردر|عايز اطلب|طلب|شراء|اعرضلي التفصيل|تفاصيل|الاسعار|الأسعار|كام|بكام|الكتالوج|قائمة|المنتجات)/i.test(clean)) {
    return {
      intent: "INQUIRY",
      reply:
        `أهلاً بك يا فندم! 🛍️ إليك قائمة أبرز أجهزة *MG Group* المتوفرة بالمعرض والمخزن:\n\n` +
        productContext +
        `\n\n💡 للطلب الفوري: اكتب اسم الجهاز وعنوانك، أو شرفنا في *معرض مصر الجديدة 13 جسر السويس* للمعاينة والاستلام المباشر! 🚀`,
    };
  }

  // 7. نية شراء منتج محدد
  const isBuy = /(اطلب|أطلب|عايز|عاوز|اشتري|أشتري|هات|هاته|محتاج|محتاجه|شراء|احجز|واحد)/i.test(clean);
  const lines = productContext.split("\n").filter((l) => l.trim().length > 0);
  for (const line of lines) {
    const match = line.match(/- \[معرف:\s*(\d+)\]\s*([^:]+):/);
    if (match) {
      const pId = parseInt(match[1], 10);
      const prodName = match[2].trim();
      const words = prodName.split(" ").filter((w) => w.length > 2);
      const matchesProd = words.some((w) => clean.includes(w.toLowerCase()));
      if (matchesProd) {
        if (isBuy) {
          return {
            intent: "BUY_PRODUCT",
            reply: `عظيم جداً يا فندم! 📦 تم اختيار: *${prodName}* من MG Group.\nالجهاز أصلي وجديد بالضمان المعتمد. لتأكيد طلبك وتجهيزه من المعرض أو الشحن المباشر، من فضلك اكتب لي *اسمك الكريم ورقم هاتفك* 📝`,
            orderData: {
              productId: pId,
              productName: prodName,
              quantity: 1,
            },
          };
        }
        return {
          intent: "INQUIRY",
          reply: `أهلاً بك! تفاصيل جهاز (${prodName}):\n${line.replace(/^- /, "🔹 ")}\n\n📍 متوفر للمعاينة بمعرضنا 13 جسر السويس بمصر الجديدة أو للشحن الفوري. للطلب: اكتب *حابب اطلب واحد*! 🚀`,
        };
      }
    }
  }

  // 8. الرد العام
  return {
    intent: "INQUIRY",
    reply:
      `أهلاً بك في *MG Group* للأجهزة الكهربائية وتجهيزات الكافيهات والمنازل 🌹\n` +
      `📍 معرضنا الرئيسي: 13 جسر السويس، مصر الجديدة | 📞 +20 12 21584153\n` +
      `تقدر تكتب كلمة *المنتجات* للاطلاع على الأسعار والمخزون، أو تطلب أسعار الجملة والمقايسات في أي وقت!`,
  };
}

// =====================================================
// الـ Main AI Intent Detection Function مع توجيه هوية MG Group
// =====================================================
export async function askGeminiWithIntent(
  userMessage: string,
  productListContext: string
): Promise<AiIntentResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY_HERE") {
    return smartLocalFallback(userMessage, productListContext);
  }

  const prompt = `أنت المساعد الذكي ومستشار المبيعات الرسمي لشركة "MG Group" (مجموعة إم جي للتجارة والأجهزة الكهربائية وتجهيزات الكافيهات والمنازل).
بيانات الشركة الثابتة:
- الصفة: وكيل وموزع معتمد لكبرى ماركات الأجهزة الكهربائية والتجهيزات.
- المعرض الرئيسي: 13 شارع جسر السويس، مصر الجديدة، القاهرة (أمام محطة مترو جسر السويس).
- اللوكيشن: https://maps.app.goo.gl/MGGroup13GesrSuez
- هاتف وواتساب المبيعات: +20 12 21584153.
- سياسة البيع: نظام تسعير مزدوج (قطاعي للمستهلكين والشقق، وجملة بكميات خاصة للتجار والكافيهات والمطاعم)، مع إمكانية عمل مقايسات (Quotations) لتجهيز الكافيهات والشقق.

قائمة المنتجات والأسعار والضمان المتاحة حالياً:
${productListContext}

رسالة العميل هي: "${userMessage}"

المطلوب بدقة:
1. حدد نية العميل (intent):
   - "WHOLESALE_INQUIRY": إذا كان تاجر أو صاحب كافيه أو يسأل عن أسعار الجملة أو الكميات. رحب به واطلب اسم المحل/الكافيه واذكر مزايا الجملة.
   - "QUOTATION_REQUEST": إذا كان يطلب تجهيز كافيه أو شقة عروسة أو يطلب مجموعة أجهزة معاً (مثال: 5 كاتل و 3 خلاط ثقيل).
   - "BUY_PRODUCT": إذا كان يريد شراء أو حجز منتج معين ولم يذكر بياناته كاملة بعد.
   - "ORDER": إذا ذكر رغبته في الشراء مع بياناته (الاسم / العنوان / الهاتف).
   - "WARRANTY_CHECK": إذا كان يسأل عن الضمان أو الصيانة أو الأعطال.
   - "INQUIRY": استفسار عام، أو سؤال عن عنوان المعرض في مصر الجديدة (13 جسر السويس) ورابط اللوكيشن.

2. اكتب رداً بالعامية المصرية الراقية والودودة جداً بصفتك مستشار MG Group.
   - إذا سأل عن المكان أو المعرض، اذكر دائماً: "13 شارع جسر السويس، مصر الجديدة (أمام المترو)" مع رقم الواتساب ورابط اللوكيشن.
   - إذا سأل عن الأسعار أو جهاز معين، وضح ميزة الضمان المعتمد.

3. استخرج البيانات المناسبة بـ JSON فقط:
{
  "intent": "INQUIRY",
  "customerType": "RETAIL", // أو "WHOLESALE" أو "COMMERCIAL_PROJECT"
  "reply": "نص الرد المصري الذكي هنا",
  "orderData": {
    "productId": 1,
    "productName": "خلاط تجاري",
    "quantity": 1
  }
}`;

  for (const model of CANDIDATE_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000);

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.3,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        continue;
      }

      const data = await response.json();
      let rawText = (data as any)?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      rawText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();

      const parsed = JSON.parse(rawText) as AiIntentResult;
      if (parsed && parsed.reply) {
        return parsed;
      }
    } catch (err: any) {
      // Cascade to next model or fallback
    }
  }

  return smartLocalFallback(userMessage, productListContext);
}
