import { useState } from "react";
import {
  ClipboardList,
  FileText,
  Search,
  CheckCircle2,
  Clock,
  RefreshCw,
  User as UserIcon,
  Phone,
  MapPin,
  Building2,
  Warehouse
} from "lucide-react";
import type { Order, Product, Staff } from "./types";
import QuotationsTab from "./QuotationsTab";

interface OrdersTabProps {
  orders: Order[];
  products: Product[];
  currentUser: Staff;
  loading: boolean;
  onRefresh: () => void;
  onToggleStatus: (order: Order) => void;
  updatingId: number | null;
  theme: "dark" | "light";
}

export default function OrdersTab({
  orders,
  products,
  currentUser,
  loading,
  onRefresh,
  onToggleStatus,
  updatingId,
  theme,
}: OrdersTabProps) {
  const isDark = theme === "dark";
  const [subTab, setSubTab] = useState<"orders" | "quotations">("orders");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.user?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.user?.phone.includes(searchTerm) ||
      order.orderCode.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      filterStatus === "ALL" ? true : order.status === filterStatus;

    const matchesType =
      filterType === "ALL" ? true : order.orderType === filterType;

    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Sub-Tabs Switcher */}
      <div className={`flex items-center justify-between border-b pb-3 ${
        isDark ? "border-slate-800" : "border-slate-300"
      }`}>
        <div className={`flex items-center gap-2 p-1 rounded-2xl border ${
          isDark ? "bg-slate-900/60 border-slate-800" : "bg-slate-200/90 border-slate-300 shadow-sm"
        }`}>
          <button
            onClick={() => setSubTab("orders")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              subTab === "orders"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : isDark ? "text-slate-400 hover:text-white" : "text-slate-700 hover:text-slate-950 font-bold"
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            طلبات البيع والتسليم ({orders.length})
          </button>

          <button
            onClick={() => setSubTab("quotations")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              subTab === "quotations"
                ? "bg-sky-600 text-white shadow-md shadow-sky-600/30"
                : isDark ? "text-slate-400 hover:text-white" : "text-slate-700 hover:text-slate-950 font-bold"
            }`}
          >
            <FileText className="w-4 h-4" />
            المقايسات وتجهيز الكافيهات (Quotations)
          </button>
        </div>

        <div className={`text-xs hidden sm:block font-medium ${isDark ? "text-slate-400" : "text-slate-600 font-bold"}`}>
          {subTab === "orders"
            ? "تتبع أوردرات المعرض والمخزن والتوصيل"
            : "محرك عروض الأسعار الرسمية لـ MG Group"}
        </div>
      </div>

      {subTab === "quotations" ? (
        <QuotationsTab products={products} onOrderCreated={onRefresh} />
      ) : (
        <div className="space-y-4">
          {/* شريط البحث والفلترة */}
          <div
            className={`p-4 rounded-2xl border flex flex-col md:flex-row gap-3 items-center justify-between ${
              isDark ? "bg-slate-900/60 border-slate-800/80" : "bg-slate-100/90 border-slate-300 shadow-sm"
            }`}
          >
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
              <input
                type="text"
                placeholder="بحث باسم العميل، الهاتف، أو كود الطلب..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full border rounded-xl pr-10 pl-4 py-2 text-xs focus:outline-none focus:border-indigo-500 font-medium ${
                  isDark
                    ? "bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-500"
                    : "bg-slate-200/90 border-slate-300 text-slate-900 placeholder-slate-600 font-bold"
                }`}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* تصفية الحالات */}
              <div className={`flex items-center gap-1 p-1 rounded-xl border ${
                isDark ? "bg-slate-950 border-slate-800" : "bg-slate-200 border-slate-300"
              }`}>
                {["ALL", "Pending", "Completed"].map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      filterStatus === status
                        ? "bg-indigo-600 text-white shadow-sm"
                        : isDark ? "text-slate-400 hover:text-white" : "text-slate-700 hover:text-slate-950 font-bold"
                    }`}
                  >
                    {status === "ALL" && "الكل"}
                    {status === "Pending" && "المعلقة"}
                    {status === "Completed" && "المكتملة"}
                  </button>
                ))}
              </div>

              {/* تصفية B2B vs B2C */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className={`border rounded-xl px-3 py-2 text-xs font-bold focus:outline-none ${
                  isDark
                    ? "bg-slate-950 border-slate-800 text-slate-300"
                    : "bg-slate-200 border-slate-300 text-slate-900"
                }`}
              >
                <option value="ALL">كافة أنواع العملاء</option>
                <option value="WHOLESALE">تجار الجملة (B2B)</option>
                <option value="COMMERCIAL_PROJECT">تجهيز كافيهات ومشاريع</option>
                <option value="RETAIL">عملاء قطاعي (B2C)</option>
              </select>
            </div>
          </div>

          {/* جدول الطلبات */}
          <div
            className={`rounded-2xl border overflow-hidden backdrop-blur-md shadow-2xl ${
              isDark ? "bg-slate-900/60 border-slate-800/80" : "bg-slate-100/90 border-slate-300 shadow-md"
            }`}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className={`border-b text-xs uppercase tracking-wider ${
                    isDark
                      ? "bg-slate-950/80 border-slate-800/90 text-slate-400"
                      : "bg-slate-200/90 border-slate-300 text-slate-800 font-extrabold"
                  }`}>
                    <th className="py-4 px-6">كود الأوردر والتاريخ</th>
                    <th className="py-4 px-6">العميل والتواصل</th>
                    <th className="py-4 px-6">الأجهزة المطلوبة</th>
                    <th className="py-4 px-6">الإجمالي والربح</th>
                    <th className="py-4 px-6">حالة الطلب</th>
                    <th className="py-4 px-6 text-center">إجراء فوري</th>
                  </tr>
                </thead>
                <tbody className={`divide-y text-sm ${isDark ? "divide-slate-800/60" : "divide-slate-300"}`}>
                  {loading && orders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
                        جاري تحميل الطلبات...
                      </td>
                    </tr>
                  ) : filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-500 font-bold">
                        لا توجد أي طلبات مطابقة للمعايير المحددة
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => (
                      <tr key={order.id} className={isDark ? "hover:bg-slate-800/30 transition-colors" : "hover:bg-slate-200/60 transition-colors"}>
                        <td className="py-4 px-6">
                          <div className={`font-mono text-xs font-bold px-2.5 py-1 rounded-md inline-block border ${
                            isDark
                              ? "text-indigo-400 bg-indigo-500/10 border-indigo-500/20"
                              : "text-indigo-800 bg-indigo-100 border-indigo-300"
                          }`}>
                            #{order.orderCode ? order.orderCode.slice(0, 8) : order.id}
                          </div>
                          <div className={`text-xs mt-1 font-semibold ${isDark ? "text-slate-500" : "text-slate-600"}`}>
                            {new Date(order.createdAt).toLocaleDateString("ar-EG", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {order.orderType === "WHOLESALE" ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/15 text-sky-700 border border-sky-300">
                                جملة وتجار (B2B)
                              </span>
                            ) : order.orderType === "COMMERCIAL_PROJECT" ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-700 border border-purple-300">
                                تجهيز كافيه/مشروع
                              </span>
                            ) : (
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isDark ? "bg-slate-800 text-slate-300" : "bg-slate-200 text-slate-800 border border-slate-300"
                              }`}>
                                قطاعي (B2C)
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-6">
                          <div className={`font-bold flex items-center gap-1.5 ${
                            isDark ? "text-slate-100" : "text-slate-900"
                          }`}>
                            <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                            {order.user?.name || "عميل غير معروف"}
                          </div>
                          <div className={`text-xs mt-0.5 flex items-center gap-1.5 font-bold ${
                            isDark ? "text-slate-400" : "text-slate-700"
                          }`} dir="ltr">
                            <Phone className="w-3.5 h-3.5 text-slate-500" />
                            <span>{order.user?.phone}</span>
                          </div>
                          <div className={`text-xs mt-0.5 flex items-center gap-1.5 font-medium ${
                            isDark ? "text-slate-500" : "text-slate-600"
                          }`}>
                            <MapPin className="w-3.5 h-3.5 text-slate-500" />
                            <span>{order.user?.address}</span>
                          </div>
                          <div className="mt-1 flex items-center gap-1 text-[11px] font-bold">
                            {order.fulfillmentSource === "WAREHOUSE" ? (
                              <span className="text-sky-600 font-bold flex items-center gap-1">
                                <Warehouse className="w-3 h-3" /> صرف من المخزن المركزي
                              </span>
                            ) : (
                              <span className="text-amber-700 font-bold flex items-center gap-1">
                                <Building2 className="w-3 h-3" /> صرف من معرض جسر السويس
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-6">
                          <div className="space-y-1">
                            {order.items && order.items.length > 0 ? (
                              order.items.map((item) => (
                                <div
                                  key={item.id}
                                  className={`text-xs flex items-center justify-between gap-3 px-2.5 py-1 rounded-lg border ${
                                    isDark
                                      ? "bg-slate-950/40 border-slate-800/60 text-slate-300"
                                      : "bg-slate-200/80 border-slate-300 text-slate-900 font-bold"
                                  }`}
                                >
                                  <span className="truncate max-w-[150px]">
                                    {item.product?.name || `جهاز #${item.productId}`}
                                  </span>
                                  <span className="font-mono font-black text-indigo-600">
                                    × {item.quantity}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <span className="text-xs text-slate-500">لا توجد تفاصيل</span>
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-6">
                          <div className={`text-base font-black font-mono ${
                            isDark ? "text-slate-100" : "text-slate-900"
                          }`}>
                            {order.total.toLocaleString()}{" "}
                            <span className={`text-xs font-normal ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                              ج.م
                            </span>
                          </div>
                          {currentUser.role === "ADMIN" && order.profitMargin !== undefined && (
                            <div className="text-[11px] text-emerald-600 font-mono font-bold mt-0.5">
                              ربح: +{order.profitMargin.toLocaleString()} ج.م
                            </div>
                          )}
                        </td>

                        <td className="py-4 px-6">
                          {order.status === "Completed" ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              تم التسليم
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/30">
                              <Clock className="w-3.5 h-3.5" />
                              معلق (Pending)
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-6 text-center">
                          <button
                            onClick={() => onToggleStatus(order)}
                            disabled={updatingId === order.id}
                            className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 border ${
                              order.status === "Pending"
                                ? "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500/50 shadow-md shadow-emerald-900/20"
                                : isDark
                                ? "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                                : "bg-slate-200 hover:bg-slate-300 text-slate-800 border-slate-300"
                            }`}
                          >
                            {updatingId === order.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : order.status === "Pending" ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                تعيين كمكتمل
                              </>
                            ) : (
                              <>
                                <Clock className="w-3.5 h-3.5" />
                                إرجاع كمعلق
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
