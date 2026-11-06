import { useState } from "react";
import {
  Phone,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  MessageCircle,
  Truck,
  DollarSign,
  PackageCheck,
  RefreshCw,
  LogOut,
  ChevronDown,
  Clock,
  Send
} from "lucide-react";
import type { Order, Staff } from "./types";

interface DeliveryPortalProps {
  currentUser: Staff;
  orders: Order[];
  onRefresh: () => void;
  onLogout: () => void;
  onBackToAdmin?: () => void;
}

const API_BASE_URL = "http://localhost:3000/api";

export default function DeliveryPortal({
  currentUser,
  orders,
  onRefresh,
  onLogout,
  onBackToAdmin,
}: DeliveryPortalProps) {
  const [activeFilter, setActiveFilter] = useState<"pending" | "completed">("pending");
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [delayModalOrder, setDelayModalOrder] = useState<Order | null>(null);
  const [delayReason, setDelayReason] = useState<string>("العميل لا يرد على الهاتف");
  const [delayNote, setDelayNote] = useState<string>("");
  const [delaySubmitting, setDelaySubmitting] = useState<boolean>(false);

  // حساب إحصائيات الوردية الحالية
  const pendingOrders = orders.filter((o) => o.status === "Pending");
  const completedOrders = orders.filter((o) => o.status === "Completed");
  const totalCashCollected = completedOrders.reduce((acc, o) => acc + o.total, 0);

  const displayedOrders = activeFilter === "pending" ? pendingOrders : completedOrders;

  // تأكيد التسليم والتحصيل
  const handleConfirmDelivery = async (order: Order) => {
    if (!window.confirm(`هل تم تسليم الطلب #${order.orderCode.slice(0, 8)} وتحصيل مبلغ ${order.total.toLocaleString()} ج.م نقداً؟`)) {
      return;
    }

    setActionLoadingId(order.id);
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${order.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Completed", notifyCustomer: true }),
      });

      if (res.ok) {
        onRefresh();
      } else {
        alert("حدث خطأ أثناء تحديث حالة الطلب");
      }
    } catch (err: any) {
      alert("خطأ في الاتصال: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  // إرسال تقرير تعذر التسليم
  const submitDeliveryReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!delayModalOrder) return;

    setDelaySubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${delayModalOrder.id}/delivery-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: delayReason,
          note: delayNote.trim(),
        }),
      });

      if (res.ok) {
        alert("✅ تم إرسال تقرير التعذر للإدارة بنجاح");
        setDelayModalOrder(null);
        setDelayNote("");
      } else {
        alert("فشل إرسال التقرير");
      }
    } catch (err: any) {
      alert("خطأ: " + err.message);
    } finally {
      setDelaySubmitting(false);
    }
  };

  // تنسيق رقم الهاتف للواتساب
  const getWhatsAppLink = (phone: string) => {
    let clean = phone.replace(/[^0-9]/g, "");
    if (clean.startsWith("01") && clean.length === 11) {
      clean = "20" + clean;
    }
    return `https://wa.me/${clean}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-10" dir="rtl">
      {/* الهيدر العلوي الذكي */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 shadow-lg">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                {currentUser.name}
              </div>
              <div className="text-[11px] text-slate-400">بوابة المندوب الذكية (Smart Courier)</div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {onBackToAdmin && (
              <button
                onClick={onBackToAdmin}
                className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition-colors flex items-center gap-1"
                title="الرجوع للوحة التحكم الرئيسية"
              >
                لوحة الإدارة
              </button>
            )}
            <button
              onClick={onRefresh}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
              title="تحديث البيانات"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onLogout}
              className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
              title="خروج"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* المحتوى الرئيسي */}
      <main className="max-w-md mx-auto w-full px-4 pt-4 flex-1 flex flex-col gap-4">
        {/* شريط الوردية والكاش بحوزة المندوب */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900 border border-indigo-500/20 rounded-2xl p-3.5 shadow-md">
            <div className="text-slate-400 text-xs font-medium flex items-center gap-1 mb-1">
              <PackageCheck className="w-4 h-4 text-indigo-400" />
              أوردرات الوردية
            </div>
            <div className="text-xl font-extrabold text-white">
              {completedOrders.length} <span className="text-xs text-slate-400 font-normal">/ {orders.length}</span>
            </div>
            <div className="text-[11px] text-emerald-400 font-medium mt-1">
              متبقي: {pendingOrders.length} أوردر
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-900/40 to-slate-900 border border-emerald-500/20 rounded-2xl p-3.5 shadow-md">
            <div className="text-slate-400 text-xs font-medium flex items-center gap-1 mb-1">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              الكاش بحوزتك 💵
            </div>
            <div className="text-xl font-extrabold text-emerald-400">
              {totalCashCollected.toLocaleString()} <span className="text-xs font-normal">ج.م</span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-1">
              إجمالي المحصل اليوم
            </div>
          </div>
        </div>

        {/* أزرار التبديل بين الحالات */}
        <div className="bg-slate-900 border border-slate-800 p-1 rounded-2xl flex">
          <button
            onClick={() => setActiveFilter("pending")}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeFilter === "pending"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            قيد التسليم ({pendingOrders.length})
          </button>
          <button
            onClick={() => setActiveFilter("completed")}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeFilter === "completed"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            المسّلمة ({completedOrders.length})
          </button>
        </div>

        {/* قائمة الطلبات */}
        <div className="flex flex-col gap-3.5 flex-1">
          {displayedOrders.length === 0 ? (
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <PackageCheck className="w-10 h-10 text-slate-600" />
              <div className="text-sm font-semibold">لا توجد طلبات في هذا القسم حالياً</div>
              <div className="text-xs text-slate-500">كل الأوردرات مسجلة ومحدثة في النظام</div>
            </div>
          ) : (
            displayedOrders.map((order) => {
              const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.user.address)}`;
              const waLink = getWhatsAppLink(order.user.phone);

              return (
                <div
                  key={order.id}
                  className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 shadow-md flex flex-col gap-3 transition-all hover:border-slate-700"
                >
                  {/* كود الأوردر وحالته */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        #{order.orderCode.slice(0, 8).toUpperCase()}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(order.createdAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    <div className="text-base font-extrabold text-emerald-400">
                      {order.total.toLocaleString()} ج.م
                    </div>
                  </div>

                  {/* بيانات العميل والعنوان */}
                  <div className="flex flex-col gap-1.5">
                    <div className="text-sm font-bold text-white flex items-center gap-1.5">
                      <span>👤</span> {order.user.name}
                    </div>

                    <div className="text-xs text-slate-300 flex items-start gap-1.5 bg-slate-950/60 p-2 rounded-xl border border-slate-800/50">
                      <MapPin className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{order.user.address}</span>
                    </div>

                    {/* البنود والمنتجات */}
                    <div className="text-[11px] text-slate-400 flex flex-wrap gap-1 mt-1">
                      {order.items.map((it, idx) => (
                        <span key={idx} className="bg-slate-800/70 px-2 py-0.5 rounded-md text-slate-300">
                          📦 {it.product?.name} (×{it.quantity})
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* الأزرار التفاعلية السريعة (One-Tap Actions) */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {/* زر الاتصال التليفوني */}
                    <a
                      href={`tel:${order.user.phone}`}
                      className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      اتصال هاتفي
                    </a>

                    {/* زر واتساب السريع */}
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      شات واتساب
                    </a>

                    {/* زر الـ GPS خرائط جوجل */}
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="col-span-2 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 rounded-xl text-xs font-bold transition-colors"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      موقع العميل على خرائط Google GPS
                    </a>
                  </div>

                  {/* زر إتمام التسليم أو تعذر التسليم (للطلبات المعلقة فقط) */}
                  {order.status === "Pending" ? (
                    <div className="flex gap-2 pt-2 border-t border-slate-800">
                      <button
                        onClick={() => handleConfirmDelivery(order)}
                        disabled={actionLoadingId === order.id}
                        className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        تم التسليم والتحصيل ({order.total.toLocaleString()} ج.م) 💵
                      </button>

                      <button
                        onClick={() => setDelayModalOrder(order)}
                        className="p-3 bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-xl transition-colors"
                        title="تعذر التسليم / تأجيل"
                      >
                        <AlertTriangle className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold p-2.5 rounded-xl text-center flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      تم تسليم الأوردر وتحصيل المبلغ بنجاح ✅
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* نافذة تسجيل تعذر التسليم والتأجيل */}
      {delayModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-4 shadow-2xl flex flex-col gap-3 animate-in fade-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="text-sm font-bold text-white flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                تعذر تسليم الأوردر #{delayModalOrder.orderCode.slice(0, 8)}
              </div>
              <button
                onClick={() => setDelayModalOrder(null)}
                className="text-slate-400 hover:text-white text-xs"
              >
                إغلاق
              </button>
            </div>

            <form onSubmit={submitDeliveryReport} className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-slate-300 font-semibold mb-1 block">سبب التعذر:</label>
                <div className="relative">
                  <select
                    value={delayReason}
                    onChange={(e) => setDelayReason(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white appearance-none focus:outline-none focus:border-indigo-500"
                  >
                    <option value="العميل لا يرد على الهاتف">العميل لا يرد على الهاتف</option>
                    <option value="العميل طلب التأجيل لموعد آخر">العميل طلب التأجيل لموعد آخر</option>
                    <option value="العنوان غير دقيق / تعذر الوصول">العنوان غير دقيق / تعذر الوصول</option>
                    <option value="العميل رفض الاستلام أو ألغى الطلب">العميل رفض الاستلام أو ألغى الطلب</option>
                    <option value="سبب آخر">سبب آخر</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold mb-1 block">ملاحظة إضافية للإدارة (اختياري):</label>
                <textarea
                  value={delayNote}
                  onChange={(e) => setDelayNote(e.target.value)}
                  placeholder="اكتب أي توضيح هنا..."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                ></textarea>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={delaySubmitting}
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {delaySubmitting ? "جاري الإرسال..." : "إرسال تقرير للإدارة"}
                </button>
                <button
                  type="button"
                  onClick={() => setDelayModalOrder(null)}
                  className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
