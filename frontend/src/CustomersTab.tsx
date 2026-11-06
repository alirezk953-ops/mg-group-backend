import { useEffect, useState } from "react";
import { 
  Users, 
  Crown, 
  MessageCircle, 
  Search, 
  RefreshCw,
  Award
} from "lucide-react";
import type { CustomerRecord } from "./types";

const API_BASE_URL = "http://localhost:3000/api";

export default function CustomersTab() {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/customers`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data);
      }
    } catch (err: any) {
      console.error("خطأ في جلب بيانات العملاء:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      c.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalVip = customers.filter((c) => c.isVip).length;
  const totalLTV = customers.reduce((sum, c) => sum + c.totalSpent, 0);

  const getWhatsAppLink = (phone: string) => {
    let clean = phone.replace(/[^0-9]/g, "");
    if (clean.startsWith("01") && clean.length === 11) {
      clean = "20" + clean;
    }
    return `https://wa.me/${clean}`;
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* إحصائيات سريعة للـ CRM */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-medium">إجمالي قاعدة العملاء</span>
            <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold mt-3 text-white">{customers.length}</div>
          <p className="text-xs text-slate-500 mt-1">عملاء مسجلين بالهاتف والعنوان</p>
        </div>

        <div className="bg-slate-900/60 border border-amber-900/40 p-5 rounded-2xl backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-amber-400 text-xs font-semibold">عملاء VIP المميزين</span>
            <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl">
              <Crown className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold mt-3 text-amber-400">{totalVip}</div>
          <p className="text-xs text-slate-500 mt-1">طلبوا أكثر من 3 مرات أو تجاوزت مسحوباتهم 15 ألف</p>
        </div>

        <div className="bg-slate-900/60 border border-emerald-900/40 p-5 rounded-2xl backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-emerald-400 text-xs font-semibold">إجمالي القيمة التراكمية (LTV)</span>
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold mt-3 text-emerald-400">
            {totalLTV.toLocaleString()}{" "}
            <span className="text-sm font-normal text-slate-400">ج.م</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">إجمالي مشتريات كافة العملاء</p>
        </div>
      </div>

      {/* شريط البحث والتحديث */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
          <input
            type="text"
            placeholder="بحث بالاسم أو رقم الهاتف أو العنوان..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pr-10 pl-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <button
          onClick={fetchCustomers}
          disabled={loading}
          className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 transition-colors"
          title="تحديث القائمة"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-400" : ""}`} />
        </button>
      </div>

      {/* جدول العملاء و CRM */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-md shadow-2xl">
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" />
            سجل وتاريخ العملاء (Customer Lifetime Value)
          </h3>
          <span className="text-xs bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-md font-mono font-semibold">
            {filtered.length} عميل
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-sm">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800/90 text-xs text-slate-400">
                <th className="py-3.5 px-6">العميل</th>
                <th className="py-3.5 px-6">رقم الهاتف والتواصل</th>
                <th className="py-3.5 px-6">العنوان المسجل</th>
                <th className="py-3.5 px-6">عدد الطلبات</th>
                <th className="py-3.5 px-6">إجمالي المشتريات</th>
                <th className="py-3.5 px-6">تصنيف العميل</th>
                <th className="py-3.5 px-6">آخر أوردر</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500 text-xs">
                    جاري تحميل سجل العملاء...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500 text-xs">
                    لا يوجد عملاء يطابقون البحث.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-6 font-semibold text-slate-100">{c.name}</td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-300" dir="ltr">
                          {c.phone}
                        </span>
                        <a
                          href={getWhatsAppLink(c.phone)}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                          title="محادثة واتساب مباشرة"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-xs text-slate-300 max-w-xs truncate" title={c.address}>
                      {c.address}
                    </td>
                    <td className="py-4 px-6 font-mono text-xs">
                      <span className="font-bold text-white">{c.totalOrders}</span>{" "}
                      <span className="text-slate-500 font-normal">({c.completedOrders} مكتمل)</span>
                    </td>
                    <td className="py-4 px-6 font-mono font-bold text-emerald-400">
                      {c.totalSpent.toLocaleString()}{" "}
                      <span className="text-xs font-normal text-slate-500">ج.م</span>
                    </td>
                    <td className="py-4 px-6">
                      {c.isVip ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          <Crown className="w-3 h-3 text-amber-400" /> عميل VIP
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300">
                          عميل عادي
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-xs text-slate-400 font-mono">
                      {c.lastOrderDate
                        ? new Date(c.lastOrderDate).toLocaleDateString("ar-EG", {
                            month: "short",
                            day: "numeric",
                          })
                        : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
