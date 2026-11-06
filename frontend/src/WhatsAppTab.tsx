import React, { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { 
  MessageSquare, 
  CheckCircle2, 
  RefreshCw, 
  Smartphone, 
  ShieldCheck, 
  KeyRound, 
  Send, 
  Copy, 
  Check, 
  AlertCircle,
  Terminal,
  Bot
} from "lucide-react";

const API_BASE_URL = "http://localhost:3000/api";

interface SessionRecord {
  id: number;
  phone: string;
  name?: string | null;
  isHumanNeeded: boolean;
  lastMessage?: string | null;
  updatedAt: string;
}

export default function WhatsAppTab() {
  const [status, setStatus] = useState<{ isConnected: boolean; qr: string | null; pairingCode?: string | null }>({
    isConnected: false,
    qr: null,
    pairingCode: null,
  });
  const [loading, setLoading] = useState(true);
  const [method, setMethod] = useState<"phone" | "qr">("phone");
  const [phone, setPhone] = useState("");
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [requestingCode, setRequestingCode] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/whatsapp/status`);
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        if (data.pairingCode && !pairingCode) {
          setPairingCode(data.pairingCode);
        }
      }
    } catch (err) {
      console.error("خطأ أثناء جلب حالة الواتساب:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHandoverSessions = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/handover`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (err) {
      console.error("خطأ في جلب جلسات العملاء:", err);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchHandoverSessions();
    const interval = setInterval(() => {
      fetchStatus();
      fetchHandoverSessions();
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleRequestPairingCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      setErrorMsg("يرجى إدخال رقم الهاتف");
      return;
    }

    setRequestingCode(true);
    setErrorMsg(null);
    setPairingCode(null);

    try {
      const res = await fetch(`${API_BASE_URL}/whatsapp/pairing-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPairingCode(data.code);
      } else {
        setErrorMsg(data.error || "فشل طلب كود الاقتران");
      }
    } catch (err: any) {
      setErrorMsg("خطأ في الاتصال بالسيرفر: " + err.message);
    } finally {
      setRequestingCode(false);
    }
  };

  const handleToggleHandover = async (phoneToToggle: string, currentNeeded: boolean) => {
    try {
      await fetch(`${API_BASE_URL}/handover/${phoneToToggle}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isHumanNeeded: !currentNeeded }),
      });
      fetchHandoverSessions();
    } catch (err) {
      console.error("فشل تعديل حالة الدعم البشري:", err);
    }
  };

  const copyToClipboard = () => {
    if (pairingCode) {
      navigator.clipboard.writeText(pairingCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-5 rounded-2xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              مركز ربط الواتساب الذكي والذكاء الاصطناعي
              {status.isConnected ? (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> متصل أونلاين
                </span>
              ) : (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1 font-bold">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> بانتظار الاقتران
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              ربط مباشر مع Baileys WebSocket + مستشار المبيعات الذكي (Gemini AI) لخدمة تجار الجملة ومشاريع الكافيهات والقطاعي
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            fetchStatus();
            fetchHandoverSessions();
          }}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-400" : ""}`} />
          تحديث الاتصال
        </button>
      </div>

      {/* الشاشة مقسمة لجزئين: جزء للاقتران وجزء لسجل تفاعلات الـ AI والدعم البشري */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* الجزء الأيسر: كارت الاقتران بالـ 8 أرقام أو الـ QR */}
        <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 p-6 rounded-2xl backdrop-blur-md shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                حالة الاقتران والربط
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">Baileys v7 Engine</span>
            </div>

            {status.isConnected ? (
              <div className="py-8 text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">الواتساب متصل ويعمل بنجاح! 🚀</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                    البوت يستقبل رسائل العملاء ويرد عليها تلقائياً بعروض أسعار MG Group وموقع معرض 13 جسر السويس.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-right space-y-1">
                  <div className="flex justify-between text-slate-300">
                    <span>رقم الشركة الرسمي:</span>
                    <strong className="font-mono text-emerald-400" dir="ltr">+20 12 21584153</strong>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>هوية الرد:</span>
                    <strong className="text-white">مستشار مبيعات MG Group</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {/* مفتاح الاختيار بين الكود والـ QR */}
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setMethod("phone")}
                    className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      method === "phone"
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/30"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    كود الـ 8 أرقام (سريع)
                  </button>
                  <button
                    onClick={() => setMethod("qr")}
                    className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      method === "qr"
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/30"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    مسح QR Code
                  </button>
                </div>

                {method === "phone" ? (
                  <div className="space-y-4">
                    {errorMsg && (
                      <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {errorMsg}
                      </div>
                    )}

                    <form onSubmit={handleRequestPairingCode} className="space-y-2">
                      <label className="block text-xs font-bold text-slate-300">
                        رقم هاتف الواتساب (مثال: 01221584153 أو 201221584153):
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="01221584153"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 font-mono focus:outline-none focus:border-emerald-500 text-left"
                          dir="ltr"
                        />
                        <button
                          type="submit"
                          disabled={requestingCode}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all disabled:opacity-50"
                        >
                          {requestingCode ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                          طلب الكود
                        </button>
                      </div>
                    </form>

                    {pairingCode && (
                      <div className="p-4 bg-emerald-950/30 border border-emerald-500/40 rounded-xl space-y-2 text-center animate-in fade-in">
                        <span className="text-xs text-emerald-400 font-bold">كود الاقتران (ادخله في هاتفك الآن):</span>
                        <div className="flex items-center justify-center gap-2">
                          <div className="font-mono text-2xl font-black text-emerald-300 bg-slate-950 px-5 py-2 rounded-xl border border-emerald-500/30">
                            {pairingCode}
                          </div>
                          <button
                            type="button"
                            onClick={copyToClipboard}
                            className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-xl"
                            title="نسخ"
                          >
                            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                        <div className="text-[11px] text-slate-400 text-right bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                          من الواتساب ⬅️ <strong>الأجهزة المرتبطة</strong> ⬅️ <strong>ربط جهاز</strong> ⬅️ <strong>الربط برقم الهاتف</strong> واكتب الكود.
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-4 space-y-3">
                    {status.qr ? (
                      <div className="p-3 bg-white rounded-2xl shadow-xl border-4 border-emerald-500/30">
                        <QRCodeSVG value={status.qr} size={200} level="M" />
                      </div>
                    ) : (
                      <div className="py-8 text-center text-slate-400 text-xs">
                        <RefreshCw className="w-6 h-6 animate-spin text-emerald-500 mx-auto mb-2" />
                        جاري توليد رمز الـ QR Code...
                      </div>
                    )}
                    <p className="text-xs text-slate-400 text-center">
                      امسح الرمز بكاميرا الواتساب لربط الجهاز خلال ثوانٍ
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="text-[11px] text-slate-500 border-t border-slate-800 pt-3 flex items-center justify-between">
            <span>MG Group Smart Multi-Device</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
        </div>

        {/* الجزء الأيمن: سجل تفاعلات الذكاء الاصطناعي وجلسات العملاء (Gemini Live Terminal) */}
        <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 p-6 rounded-2xl backdrop-blur-md shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-indigo-400" />
                <h3 className="font-bold text-sm text-white">سجل تفاعلات الذكاء الاصطناعي وجلسات العملاء</h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                Gemini 1.5/2.0 Cascade
              </span>
            </div>

            {/* نبذة عن ردود الـ AI المعتمدة لـ MG Group */}
            <div className="my-4 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-1.5">
              <div className="text-slate-300 font-bold flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5 text-indigo-400" />
                سلوكيات البوت الذكي التلقائية:
              </div>
              <ul className="text-slate-400 text-[11px] list-disc list-inside space-y-1">
                <li>الرد على تجار الجملة والكافيهات بقوائم أسعار الـ B2B وتأكيد الطلبيات.</li>
                <li>توليد عروض الأسعار والمقايسات لتجهيز الشقق والكافيهات بـ PDF فوري.</li>
                <li>إرسال عنوان معرض مصر الجديدة (13 جسر السويس) ورابط اللوكيشن عند السؤال عن المكان.</li>
                <li>فحص حالة الضمان والاستبدال برقم هاتف العميل تلقائياً.</li>
              </ul>
            </div>

            {/* قائمة جلسات العملاء النشطة والدعم البشري */}
            <div>
              <div className="text-xs font-bold text-slate-300 mb-2 flex items-center justify-between">
                <span>جلسات العملاء الحية على الواتساب ({sessions.length}):</span>
                <span className="text-[10px] text-slate-500">محدث لحظياً</span>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {sessions.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                    لا توجد محادثات جارية في الوقت الحالي. ستظهر الرسائل فور ورودها!
                  </div>
                ) : (
                  sessions.map((sess) => (
                    <div
                      key={sess.id}
                      className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="truncate">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{sess.name || "عميل واتساب"}</span>
                          <span className="text-[10px] text-slate-400 font-mono" dir="ltr">
                            ({sess.phone})
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          آخر رسالة: "{sess.lastMessage || "بدون نص"}"
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleToggleHandover(sess.phone, sess.isHumanNeeded)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                            sess.isHumanNeeded
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          }`}
                        >
                          {sess.isHumanNeeded ? "تدخل بشري 👨‍💼" : "رد آلي بالـ AI 🤖"}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 border-t border-slate-800 pt-3 flex items-center justify-between mt-4">
            <span>MG Group Live Handover & Bridge</span>
            <span className="text-emerald-400 font-bold">24/7 Automation</span>
          </div>
        </div>
      </div>
    </div>
  );
}
