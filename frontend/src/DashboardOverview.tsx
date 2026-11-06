import {
  Package,
  Clock,
  CheckCircle2,
  TrendingUp,
  Wallet,
  AlertTriangle,
  Building2,
  ShieldCheck,
  Plus,
  ArrowUpRight
} from "lucide-react";
import type { Order, Product, Staff } from "./types";
import type { NavTab } from "./Sidebar";

interface DashboardOverviewProps {
  orders: Order[];
  products: Product[];
  currentUser: Staff;
  onNavigate: (tab: NavTab) => void;
  theme: "dark" | "light";
}

export default function DashboardOverview({
  orders,
  products,
  currentUser,
  onNavigate,
  theme,
}: DashboardOverviewProps) {
  const isDark = theme === "dark";

  // حساب الإحصائيات
  const totalOrders = orders.length;
  const pendingOrders = orders.filter((o) => o.status === "Pending").length;
  const completedOrders = orders.filter((o) => o.status === "Completed").length;
  const totalRevenue = orders
    .filter((o) => o.status === "Completed")
    .reduce((sum, o) => sum + o.total, 0);
  const totalProfit = orders
    .filter((o) => o.status === "Completed")
    .reduce((sum, o) => sum + (o.profitMargin || 0), 0);

  const lowStockProducts = products.filter(
    (p) => p.stock <= (p.minStockThreshold || 3)
  );

  const wholesaleOrders = orders.filter(
    (o) => o.orderType === "WHOLESALE" || o.orderType === "COMMERCIAL_PROJECT"
  );
  const retailOrders = orders.filter((o) => o.orderType === "RETAIL");

  const recentOrders = orders.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* الترحيب وشريط التوجيه العلوي */}
      <div
        className={`p-6 rounded-3xl border relative overflow-hidden transition-all ${
          isDark
            ? "bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-slate-800/80 shadow-2xl"
            : "bg-gradient-to-r from-slate-200/90 via-indigo-100/60 to-slate-200 border-slate-300 shadow-md"
        }`}
      >
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                isDark
                  ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                  : "bg-indigo-600/10 text-indigo-700 border-indigo-300"
              }`}>
                لوحة القيادة الذكية • MG Group
              </span>
              <span className={`text-xs font-semibold ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                مرحباً بك، أستاذ {currentUser.name} 👋
              </span>
            </div>
            <h2 className={`text-xl md:text-2xl font-black tracking-tight ${
              isDark ? "text-white" : "text-slate-900"
            }`}>
              نظام إدارة المعارض، الجملة، والقطاعي
            </h2>
            <p className={`text-xs mt-1 max-w-2xl leading-relaxed ${
              isDark ? "text-slate-400" : "text-slate-700 font-medium"
            }`}>
              📍 المعرض الرئيسي: 13 شارع جسر السويس، مصر الجديدة | تتبع لحظي للمخزون، أسعار الجملة، المقايسات، وبطاقات الضمان.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => onNavigate("orders")}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              أوردر أو مقايسة جديدة
            </button>
            <button
              onClick={() => onNavigate("warranty")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                isDark
                  ? "bg-slate-900 hover:bg-slate-800 text-amber-300 border-slate-800"
                  : "bg-slate-100 hover:bg-slate-200 text-amber-800 border-slate-300 shadow-sm"
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              استعلام الضمان
            </button>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute left-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2"></div>
      </div>

      {/* كروت الإحصائيات الفخمة (Metrics Cards in Silver & Dark Titanium) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. إجمالي الطلبات */}
        <div
          className={`p-5 rounded-2xl border transition-all relative overflow-hidden group ${
            isDark
              ? "bg-slate-900/60 border-slate-800/80 hover:border-blue-500/40"
              : "bg-slate-100/90 border-slate-300/90 shadow-sm hover:border-slate-400"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${isDark ? "text-slate-400" : "text-slate-700"}`}>
              إجمالي الطلبات
            </span>
            <div className={`p-2.5 rounded-xl border ${
              isDark
                ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                : "bg-blue-100 text-blue-700 border-blue-300"
            }`}>
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-3xl font-black mt-3 font-mono tracking-tight ${
            isDark ? "text-white" : "text-slate-900"
          }`}>
            {totalOrders}
          </div>
          <div className={`flex items-center gap-1 text-[11px] font-semibold mt-1 ${
            isDark ? "text-slate-400" : "text-slate-600"
          }`}>
            <span>مكتمل: {completedOrders}</span>
            <span>•</span>
            <span className={isDark ? "text-amber-400" : "text-amber-700 font-bold"}>
              معلق: {pendingOrders}
            </span>
          </div>
        </div>

        {/* 2. الطلبات المعلقة */}
        <div
          className={`p-5 rounded-2xl border transition-all relative overflow-hidden group ${
            isDark
              ? "bg-slate-900/60 border-slate-800/80 hover:border-amber-500/40"
              : "bg-slate-100/90 border-slate-300/90 shadow-sm hover:border-slate-400"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${isDark ? "text-amber-400" : "text-amber-800"}`}>
              قيد الشحن والتأكيد
            </span>
            <div className={`p-2.5 rounded-xl border ${
              isDark
                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                : "bg-amber-100 text-amber-700 border-amber-300"
            }`}>
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-3xl font-black mt-3 font-mono tracking-tight ${
            isDark ? "text-amber-400" : "text-amber-700"
          }`}>
            {pendingOrders}
          </div>
          <div className={`text-[11px] font-semibold mt-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
            تتطلب تأكيد المندوب أو المعرض
          </div>
        </div>

        {/* 3. المبيعات المحصلة */}
        <div
          className={`p-5 rounded-2xl border transition-all relative overflow-hidden group ${
            isDark
              ? "bg-slate-900/60 border-slate-800/80 hover:border-indigo-500/40"
              : "bg-slate-100/90 border-slate-300/90 shadow-sm hover:border-slate-400"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${isDark ? "text-indigo-400" : "text-indigo-800"}`}>
              المبيعات المحصلة
            </span>
            <div className={`p-2.5 rounded-xl border ${
              isDark
                ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                : "bg-indigo-100 text-indigo-700 border-indigo-300"
            }`}>
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-3xl font-black mt-3 font-mono tracking-tight ${
            isDark ? "text-indigo-300" : "text-indigo-700"
          }`}>
            {totalRevenue.toLocaleString()}{" "}
            <span className={`text-xs font-normal ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              ج.م
            </span>
          </div>
          <div className={`text-[11px] font-semibold mt-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
            الكاش الفعلي لطلبات التسليم
          </div>
        </div>

        {/* 4. صافي أرباح MG Group */}
        <div
          className={`p-5 rounded-2xl border transition-all relative overflow-hidden group ${
            isDark
              ? "bg-gradient-to-br from-emerald-950/30 via-slate-900/60 to-slate-900/60 border-emerald-900/40 hover:border-emerald-500/40"
              : "bg-gradient-to-br from-emerald-100/80 via-slate-100 to-emerald-50 border-emerald-300 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-black ${isDark ? "text-emerald-400" : "text-emerald-900"}`}>
              أرباح MG Group
            </span>
            <div className={`p-2.5 rounded-xl border ${
              isDark
                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                : "bg-emerald-200 text-emerald-800 border-emerald-300"
            }`}>
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-3xl font-black mt-3 font-mono tracking-tight ${
            isDark ? "text-emerald-400" : "text-emerald-700"
          }`}>
            +{totalProfit.toLocaleString()}{" "}
            <span className={`text-xs font-normal ${isDark ? "text-emerald-300" : "text-emerald-800"}`}>
              ج.م
            </span>
          </div>
          <div className={`text-[11px] mt-1 font-bold ${
            isDark ? "text-emerald-400/80" : "text-emerald-800"
          }`}>
            صافي هامش الربح المحقق
          </div>
        </div>

        {/* 5. حالة المخزون وتنبيهات النقص */}
        <div
          onClick={() => onNavigate("products")}
          className={`p-5 rounded-2xl border transition-all relative overflow-hidden group cursor-pointer ${
            isDark
              ? "bg-slate-900/60 border-slate-800/80 hover:border-purple-500/40"
              : "bg-slate-100/90 border-slate-300/90 shadow-sm hover:border-slate-400"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${isDark ? "text-slate-400" : "text-slate-700"}`}>
              الأجهزة بالمخزن
            </span>
            <div className={`p-2.5 rounded-xl border ${
              isDark
                ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                : "bg-purple-100 text-purple-700 border-purple-300"
            }`}>
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-3xl font-black mt-3 font-mono tracking-tight ${
            isDark ? "text-white" : "text-slate-900"
          }`}>
            {products.length}{" "}
            <span className={`text-xs font-normal ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              موديل
            </span>
          </div>
          <div className="text-[11px] mt-1 flex items-center gap-1 font-bold">
            {lowStockProducts.length > 0 ? (
              <>
                <AlertTriangle className="w-3 h-3 text-amber-500 animate-pulse" />
                <span className={isDark ? "text-amber-400" : "text-amber-700"}>
                  {lowStockProducts.length} أجهزة قاربت على النفاد
                </span>
              </>
            ) : (
              <span className={isDark ? "text-emerald-400" : "text-emerald-700"}>
                جميع الأجهزة متوفرة ✅
              </span>
            )}
          </div>
        </div>
      </div>

      {/* تفاصيل المبيعات المزدوجة (B2B vs B2C) وتدفق العمل */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* كارت تقسيم المبيعات (جملة وتجار vs قطاعي) */}
        <div
          className={`p-5 rounded-2xl border transition-all ${
            isDark
              ? "bg-slate-900/60 border-slate-800/80"
              : "bg-slate-100/90 border-slate-300/90 shadow-sm"
          }`}
        >
          <div className={`flex items-center justify-between pb-3 border-b ${
            isDark ? "border-slate-800/80" : "border-slate-300"
          }`}>
            <h3 className={`font-bold text-sm flex items-center gap-2 ${
              isDark ? "text-white" : "text-slate-900"
            }`}>
              <TrendingUp className="w-4 h-4 text-sky-500" />
              نظام التسعير المزدوج (B2B vs B2C)
            </h3>
            <span className={`text-[10px] font-mono font-bold ${
              isDark ? "text-slate-400" : "text-slate-600"
            }`}>
              Dual-Tier
            </span>
          </div>

          <div className="space-y-4 mt-4">
            <div>
              <div className="flex justify-between text-xs mb-1.5 font-bold">
                <span className={isDark ? "text-slate-300" : "text-slate-800"}>
                  أوردرات الجملة وتجهيز الكافيهات
                </span>
                <span className="font-mono text-sky-600">{wholesaleOrders.length} طلب</span>
              </div>
              <div className={`w-full h-2 rounded-full overflow-hidden border ${
                isDark ? "bg-slate-950 border-slate-800" : "bg-slate-200 border-slate-300"
              }`}>
                <div
                  className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full"
                  style={{
                    width: `${totalOrders > 0 ? (wholesaleOrders.length / totalOrders) * 100 : 0}%`,
                  }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5 font-bold">
                <span className={isDark ? "text-slate-300" : "text-slate-800"}>
                  أوردرات المستهلكين والقطاعي (الشقق)
                </span>
                <span className="font-mono text-amber-600">{retailOrders.length} طلب</span>
              </div>
              <div className={`w-full h-2 rounded-full overflow-hidden border ${
                isDark ? "bg-slate-950 border-slate-800" : "bg-slate-200 border-slate-300"
              }`}>
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                  style={{
                    width: `${totalOrders > 0 ? (retailOrders.length / totalOrders) * 100 : 0}%`,
                  }}
                ></div>
              </div>
            </div>

            <div className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
              isDark
                ? "bg-slate-950/60 border-slate-800/80 text-slate-400"
                : "bg-slate-200/60 border-slate-300 text-slate-700 font-medium"
            }`}>
              <div className="flex items-center justify-between">
                <span>توزيع الصرف:</span>
                <span className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                  معرض جسر السويس + المخزن المركزي
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>الضمان المعتمد:</span>
                <span className="text-emerald-600 font-bold">12 - 36 شهراً رسمياً</span>
              </div>
            </div>
          </div>
        </div>

        {/* أحدث الطلبات والمقايسات (Live Activity Stream) */}
        <div
          className={`lg:col-span-2 p-5 rounded-2xl border transition-all ${
            isDark
              ? "bg-slate-900/60 border-slate-800/80"
              : "bg-slate-100/90 border-slate-300/90 shadow-sm"
          }`}
        >
          <div className={`flex items-center justify-between pb-3 border-b ${
            isDark ? "border-slate-800/80" : "border-slate-300"
          }`}>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-500" />
              <h3 className={`font-bold text-sm ${isDark ? "text-white" : "text-slate-900"}`}>
                أحدث الطلبات وحركات البيع
              </h3>
            </div>
            <button
              onClick={() => onNavigate("orders")}
              className="text-xs text-indigo-600 hover:text-indigo-500 font-bold flex items-center gap-1"
            >
              عرض كافة الطلبات
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto mt-3">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className={`border-b ${
                  isDark ? "text-slate-400 border-slate-800" : "text-slate-700 border-slate-300 font-bold"
                }`}>
                  <th className="py-2.5 px-3">الأوردر</th>
                  <th className="py-2.5 px-3">العميل</th>
                  <th className="py-2.5 px-3">النوع</th>
                  <th className="py-2.5 px-3">الإجمالي</th>
                  <th className="py-2.5 px-3">الحالة</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? "divide-slate-800/60" : "divide-slate-300"}`}>
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 font-medium">
                      لا توجد طلبات مسجلة بعد.
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((ord) => (
                    <tr key={ord.id} className={isDark ? "hover:bg-slate-800/20" : "hover:bg-slate-200/50"}>
                      <td className="py-2.5 px-3 font-mono font-bold text-indigo-600">
                        #{ord.orderCode ? ord.orderCode.slice(0, 8) : ord.id}
                      </td>
                      <td className={`py-2.5 px-3 font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                        {ord.user?.name || "عميل"}
                      </td>
                      <td className="py-2.5 px-3">
                        {ord.orderType === "WHOLESALE" ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/15 text-sky-700 border border-sky-300">
                            جملة B2B
                          </span>
                        ) : ord.orderType === "COMMERCIAL_PROJECT" ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-700 border border-purple-300">
                            مشروع كافيه
                          </span>
                        ) : (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            isDark ? "bg-slate-800 text-slate-300" : "bg-slate-200 text-slate-800 font-bold"
                          }`}>
                            قطاعي
                          </span>
                        )}
                      </td>
                      <td className={`py-2.5 px-3 font-mono font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                        {ord.total.toLocaleString()} ج.م
                      </td>
                      <td className="py-2.5 px-3">
                        {ord.status === "Completed" ? (
                          <span className="text-emerald-600 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> تم التسليم
                          </span>
                        ) : (
                          <span className="text-amber-600 font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3" /> معلق
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
