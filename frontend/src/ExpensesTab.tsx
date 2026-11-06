import React, { useEffect, useState } from "react";
import { 
  DollarSign, 
  TrendingDown, 
  TrendingUp, 
  Wallet, 
  Plus, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  Calendar,
  Layers
} from "lucide-react";
import type { Expense, CashDrawerSummary } from "./types";

const API_BASE_URL = "http://localhost:3000/api";

const EXPENSE_CATEGORIES = [
  "شحن وتوصيل",
  "بوفيه وضيافة",
  "صيانة ومعدات",
  "إيجار ومرافق",
  "رواتب ومكافآت",
  "نثريات متنوعة",
  "أخرى"
];

export default function ExpensesTab() {
  const [summary, setSummary] = useState<CashDrawerSummary | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Form State
  const [amount, setAmount] = useState<string>("");
  const [category, setCategory] = useState<string>("نثريات متنوعة");
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sumRes, expRes] = await Promise.all([
        fetch(`${API_BASE_URL}/cash-drawer`),
        fetch(`${API_BASE_URL}/expenses`),
      ]);

      if (sumRes.ok) {
        const sumData = await sumRes.json();
        setSummary(sumData);
      }
      if (expRes.ok) {
        const expData = await expRes.json();
        setExpenses(expData);
      }
    } catch (err: any) {
      console.error("خطأ في جلب بيانات الخزنة والمصروفات:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setMsg({ text: "برجاء كتابة مبلغ صحيح وموجب", type: "error" });
      return;
    }

    setSubmitting(true);
    setMsg(null);

    try {
      const res = await fetch(`${API_BASE_URL}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          category,
          notes: notes.trim(),
          createdBy: "الإدارة",
        }),
      });

      if (res.ok) {
        setMsg({ text: "تم تسجيل المصروف بنجاح وخصمه من الخزنة!", type: "success" });
        setAmount("");
        setNotes("");
        fetchData();
      } else {
        const data = await res.json();
        setMsg({ text: data.error || "فشل تسجيل المصروف", type: "error" });
      }
    } catch (err: any) {
      setMsg({ text: "خطأ: " + err.message, type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا المصروف؟ سيتم إعادة المبلغ لرصيد الخزنة.")) return;

    try {
      const res = await fetch(`${API_BASE_URL}/expenses/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchData();
      } else {
        alert("فشل حذف المصروف");
      }
    } catch (err: any) {
      alert("خطأ أثناء الحذف: " + err.message);
    }
  };

  return (
    <div className="space-y-8" dir="rtl">
      {/* بطاقات الخزنة النقدية الذكية */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* صافي الخزنة الحالي */}
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950/40 border border-indigo-500/30 p-5 rounded-2xl shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-indigo-300 text-xs font-bold uppercase tracking-wider">صافي رصيد الخزنة (الدرج)</span>
            <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold mt-3 text-white">
            {summary ? summary.netCash.toLocaleString() : "0"}{" "}
            <span className="text-sm font-normal text-slate-400">ج.م</span>
          </div>
          <p className="text-xs text-indigo-300/80 mt-1 flex items-center gap-1 font-mono">
            {summary && summary.netCash >= 0 ? "✅ رصيد نقدي إيجابي" : "⚠️ عجز نقدي في الخزنة"}
          </p>
        </div>

        {/* إجمالي المبيعات المحصلة */}
        <div className="bg-slate-900/60 border border-emerald-900/40 p-5 rounded-2xl backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-emerald-400 text-xs font-semibold">إجمالي المبيعات المحصلة (كاش)</span>
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold mt-3 text-emerald-400">
            {summary ? summary.totalCollectedCash.toLocaleString() : "0"}{" "}
            <span className="text-xs font-normal text-slate-400">ج.م</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">من {summary?.completedOrdersCount || 0} طلب مكتمل</p>
        </div>

        {/* إجمالي المصروفات */}
        <div className="bg-slate-900/60 border border-rose-900/40 p-5 rounded-2xl backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-rose-400 text-xs font-semibold">إجمالي المصروفات والنثريات</span>
            <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold mt-3 text-rose-400">
            {summary ? summary.totalExpenses.toLocaleString() : "0"}{" "}
            <span className="text-xs font-normal text-slate-400">ج.م</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">{summary?.expensesCount || 0} عملية صرف مسجلة</p>
        </div>

        {/* حركة اليوم */}
        <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-semibold">صافي حركة اليوم</span>
            <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold mt-3 text-white">
            {summary ? summary.todayNetCash.toLocaleString() : "0"}{" "}
            <span className="text-xs font-normal text-slate-400">ج.م</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            مبيعات: +{summary?.todayCollectedCash || 0} | مصاريف: -{summary?.todayExpenses || 0}
          </p>
        </div>
      </div>

      {/* تصنيفات المصروفات السريعة */}
      {summary && Object.keys(summary.categoryBreakdown).length > 0 && (
        <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-2xl backdrop-blur-md">
          <div className="text-xs font-bold text-slate-300 mb-3 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-indigo-400" />
            توزيع المصروفات حسب البند:
          </div>
          <div className="flex flex-wrap gap-2.5">
            {Object.entries(summary.categoryBreakdown).map(([cat, amt]) => (
              <span key={cat} className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-medium text-slate-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                {cat}: <strong className="text-white font-mono">{amt.toLocaleString()} ج.م</strong>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* نموذج تسجيل مصروف جديد */}
      <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl backdrop-blur-md shadow-xl">
        <h2 className="text-base font-bold text-slate-100 flex items-center gap-2 mb-4">
          <Plus className="w-5 h-5 text-indigo-400" />
          تسجيل سند صرف / نثريات جديدة (خصم مباشر من الخزنة)
        </h2>

        {msg && (
          <div
            className={`p-3 rounded-xl mb-4 text-xs font-semibold flex items-center gap-2 ${
              msg.type === "success"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-red-500/10 text-red-400 border border-red-500/20"
            }`}
          >
            {msg.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {msg.text}
          </div>
        )}

        <form onSubmit={handleAddExpense} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">المبلغ المصروف (ج.م)</label>
            <input
              type="number"
              placeholder="مثال: 150"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">بند / تصنيف المصروف</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-400 mb-1.5">بيان وملاحظات الصرف</label>
            <input
              type="text"
              placeholder="مثال: كارت شحن / بنزين مندوب / مستلزمات بوفيه"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="sm:col-span-4 flex items-center justify-end gap-3 mt-1">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
            >
              {submitting ? "جاري التسجيل..." : "تسجيل وخصم من الخزنة"}
            </button>
          </div>
        </form>
      </div>

      {/* جدول المصروفات */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-md shadow-2xl">
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-rose-400" />
            سجل المصروفات والنثريات المسجلة
          </h3>
          <span className="text-xs bg-rose-500/10 text-rose-400 px-3 py-1 rounded-md font-mono font-semibold">
            {expenses.length} سند صرف
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-sm">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800/90 text-xs text-slate-400">
                <th className="py-3.5 px-6">المعرف</th>
                <th className="py-3.5 px-6">التاريخ والوقت</th>
                <th className="py-3.5 px-6">المبلغ</th>
                <th className="py-3.5 px-6">التصنيف</th>
                <th className="py-3.5 px-6">البيان والملاحظات</th>
                <th className="py-3.5 px-6">المسجِل</th>
                <th className="py-3.5 px-6 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500 text-xs">
                    جاري تحميل المصروفات...
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500 text-xs">
                    لا توجد مصروفات مسجلة حتى الآن.
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-6 font-mono text-xs text-slate-400">#{exp.id}</td>
                    <td className="py-4 px-6 text-xs text-slate-400 font-mono">
                      {new Date(exp.createdAt).toLocaleDateString("ar-EG", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-4 px-6 font-bold text-rose-400 font-mono">
                      {exp.amount.toLocaleString()} <span className="text-xs font-normal text-slate-500">ج.م</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-200 border border-slate-700">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-300 text-xs">{exp.notes || "—"}</td>
                    <td className="py-4 px-6 text-slate-400 text-xs font-mono">{exp.createdBy}</td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors"
                        title="حذف المصروف وإعادة المبلغ للخزنة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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
  );
}
