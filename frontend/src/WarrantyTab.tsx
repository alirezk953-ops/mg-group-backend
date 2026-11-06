import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Search,
  Wrench,
  CheckCircle2,
  RefreshCw,
  Calendar,
  Hash,
  Plus,
  Edit3,
  Trash2
} from "lucide-react";
import type { WarrantyRecord } from "./types";

const API_BASE_URL = "http://localhost:3000/api";

interface WarrantyTabProps {
  theme?: "dark" | "light";
}

export default function WarrantyTab({ theme = "dark" }: WarrantyTabProps) {
  const isDark = theme === "dark";
  const [warranties, setWarranties] = useState<WarrantyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // تذاكر الصيانة
  const [selectedWarranty, setSelectedWarranty] = useState<WarrantyRecord | null>(null);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [issueDescription, setIssueDescription] = useState("");
  const [submittingTicket, setSubmittingTicket] = useState(false);

  // نافذة إضافة / تعديل بطاقة الضمان
  const [showWarrantyModal, setShowWarrantyModal] = useState(false);
  const [editingWarranty, setEditingWarranty] = useState<WarrantyRecord | null>(null);
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [prodName, setProdName] = useState("");
  const [serialNo, setSerialNo] = useState("");
  const [warrantyMonths, setWarrantyMonths] = useState("12");
  const [warrantyStatus, setWarrantyStatus] = useState("ACTIVE");
  const [savingWarranty, setSavingWarranty] = useState(false);

  const fetchWarranties = async (query = "") => {
    setLoading(true);
    try {
      const url = query.trim()
        ? `${API_BASE_URL}/warranties/search?q=${encodeURIComponent(query.trim())}`
        : `${API_BASE_URL}/warranties`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setWarranties(data);
      }
    } catch (err) {
      console.error("خطأ في جلب بيانات الضمان:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarranties();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchWarranties(searchTerm);
  };

  // فتح نافذة إضافة بطاقة ضمان جديدة
  const handleOpenAddModal = () => {
    setEditingWarranty(null);
    setCustName("");
    setCustPhone("");
    setProdName("");
    setSerialNo(`SN-${Math.floor(100000 + Math.random() * 900000)}`);
    setWarrantyMonths("12");
    setWarrantyStatus("ACTIVE");
    setShowWarrantyModal(true);
  };

  // فتح نافذة تعديل بطاقة الضمان
  const handleOpenEditModal = (w: WarrantyRecord) => {
    setEditingWarranty(w);
    setCustName(w.customerName);
    setCustPhone(w.customerPhone);
    setProdName(w.productName);
    setSerialNo(w.serialNumber || "");
    setWarrantyMonths("12");
    setWarrantyStatus(w.status || "ACTIVE");
    setShowWarrantyModal(true);
  };

  // حفظ بطاقة الضمان (إضافة أو تعديل)
  const handleSaveWarranty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim() || !custPhone.trim() || !prodName.trim()) {
      alert("يرجى ملء اسم العميل، الهاتف، واسم الجهاز");
      return;
    }

    setSavingWarranty(true);
    try {
      const url = editingWarranty
        ? `${API_BASE_URL}/warranties/${editingWarranty.id}`
        : `${API_BASE_URL}/warranties`;
      const method = editingWarranty ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: custName.trim(),
          customerPhone: custPhone.trim(),
          productName: prodName.trim(),
          serialNumber: serialNo.trim() || null,
          warrantyMonths: Number(warrantyMonths) || 12,
          status: warrantyStatus,
        }),
      });

      if (res.ok) {
        alert(editingWarranty ? "✅ تم تعديل بطاقة الضمان بنجاح!" : "✅ تم إصدار بطاقة الضمان بنجاح!");
        setShowWarrantyModal(false);
        fetchWarranties(searchTerm);
      } else {
        const err = await res.json();
        alert("فشل الحفظ: " + (err.error || "خطأ غير معروف"));
      }
    } catch (err: any) {
      alert("حدث خطأ: " + err.message);
    } finally {
      setSavingWarranty(false);
    }
  };

  // حذف بطاقة الضمان
  const handleDeleteWarranty = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف بطاقة الضمان هذه؟")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/warranties/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchWarranties(searchTerm);
      } else {
        alert("فشل حذف بطاقة الضمان");
      }
    } catch (err: any) {
      alert("خطأ أثناء الحذف: " + err.message);
    }
  };

  const handleOpenTicketModal = (w: WarrantyRecord) => {
    setSelectedWarranty(w);
    setIssueDescription("");
    setShowTicketModal(true);
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWarranty || !issueDescription.trim()) return;

    setSubmittingTicket(true);
    try {
      const res = await fetch(`${API_BASE_URL}/warranties/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warrantyId: selectedWarranty.id,
          issueDescription: issueDescription.trim(),
        }),
      });

      if (res.ok) {
        alert("✅ تم تسجيل تذكرة الصيانة بنجاح وإخطار الإدارة وتليجرام فوراً!");
        setShowTicketModal(false);
        fetchWarranties(searchTerm);
      } else {
        const data = await res.json();
        alert("فشل تسجيل التذكرة: " + (data.error || "خطأ غير معروف"));
      }
    } catch (err: any) {
      alert("حدث خطأ: " + err.message);
    } finally {
      setSubmittingTicket(false);
    }
  };

  const handleUpdateTicketStatus = async (ticketId: number, status: string, actionTaken: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/warranties/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, actionTaken }),
      });
      if (res.ok) {
        fetchWarranties(searchTerm);
      }
    } catch (err) {
      console.error("فشل تحديث التذكرة:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl border transition-all ${
        isDark ? "bg-slate-900/60 border-slate-800 backdrop-blur-md" : "bg-slate-100/90 border-slate-300 shadow-sm"
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl border ${
            isDark ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-amber-100 text-amber-800 border-amber-300"
          }`}>
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className={`text-xl font-black flex items-center gap-2 ${isDark ? "text-white" : "text-slate-900"}`}>
              تتبع الضمان والصيانة للأجهزة الكهربائية
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                isDark ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-amber-100 text-amber-800 border-amber-300"
              }`}>
                وكيل معتمد MG Group
              </span>
            </h2>
            <p className={`text-xs mt-1 font-medium ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              ربط كل جهاز برقم تليفون العميل والسيريال ومدة الضمان (12 - 36 شهراً)، وتعديل وحذف البطاقات، وتسجيل الصيانة والاستبدال الفوري.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* زر إصدار بطاقة ضمان جديدة */}
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-900/30 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            إصدار بطاقة ضمان جديدة
          </button>

          <form onSubmit={handleSearch} className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-2.5" />
            <input
              type="text"
              placeholder="بحث بالهاتف، كود الضمان، أو السيريال..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full border rounded-xl pr-10 pl-3 py-2 text-xs focus:outline-none focus:border-amber-500 font-bold ${
                isDark ? "bg-slate-950 border-slate-800 text-white placeholder-slate-500" : "bg-slate-200 border-slate-300 text-slate-900 placeholder-slate-600"
              }`}
            />
          </form>

          <button
            onClick={() => fetchWarranties(searchTerm)}
            disabled={loading}
            className={`p-2 rounded-xl border transition-all disabled:opacity-50 ${
              isDark ? "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700" : "bg-slate-200 hover:bg-slate-300 text-slate-800 border-slate-300 shadow-sm"
            }`}
            title="تحديث"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-amber-500" : ""}`} />
          </button>
        </div>
      </div>

      {/* جدول بطاقات الضمان */}
      <div className={`rounded-2xl border overflow-hidden backdrop-blur-md shadow-2xl ${
        isDark ? "bg-slate-900/60 border-slate-800" : "bg-slate-100/90 border-slate-300 shadow-md"
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className={`border-b text-xs uppercase ${
                isDark ? "bg-slate-950/80 border-slate-800 text-slate-400" : "bg-slate-200/90 border-slate-300 text-slate-800 font-extrabold"
              }`}>
                <th className="py-4 px-5">كود الضمان والسيريال</th>
                <th className="py-4 px-5">العميل والتواصل</th>
                <th className="py-4 px-5">الجهاز والموديل</th>
                <th className="py-4 px-5">مدة وسريان الضمان</th>
                <th className="py-4 px-5">حالة الضمان</th>
                <th className="py-4 px-5">تذاكر الصيانة / الاستبدال</th>
                <th className="py-4 px-5 text-center">إجراء فوري وتعديل</th>
              </tr>
            </thead>
            <tbody className={`divide-y text-sm ${isDark ? "divide-slate-800" : "divide-slate-300"}`}>
              {loading && warranties.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-500 mb-2" />
                    جاري تحميل سجلات الضمان...
                  </td>
                </tr>
              ) : warranties.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500 font-bold">
                    لا توجد سجلات ضمان مطابقة. اضغط على زر "إصدار بطاقة ضمان جديدة" بالأعلى لإضافة ضمان لأي جهاز!
                  </td>
                </tr>
              ) : (
                warranties.map((w) => {
                  const isExpired = new Date(w.endDate).getTime() < Date.now();
                  return (
                    <tr key={w.id} className={isDark ? "hover:bg-slate-800/30 transition-colors" : "hover:bg-slate-200/50 transition-colors"}>
                      <td className="py-4 px-5">
                        <div className={`font-mono text-xs font-bold px-2.5 py-1 rounded inline-block border ${
                          isDark ? "text-amber-400 bg-amber-500/10 border-amber-500/20" : "text-amber-900 bg-amber-100 border-amber-300"
                        }`}>
                          #{w.warrantyCode}
                        </div>
                        <div className={`text-[11px] font-mono mt-1 flex items-center gap-1 font-bold ${
                          isDark ? "text-slate-400" : "text-slate-600"
                        }`}>
                          <Hash className="w-3 h-3 text-slate-500" />
                          {w.serialNumber || "بدون سيريال"}
                        </div>
                      </td>

                      <td className="py-4 px-5">
                        <div className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{w.customerName}</div>
                        <div className={`text-xs font-mono font-bold mt-0.5 ${isDark ? "text-slate-400" : "text-slate-700"}`} dir="ltr">
                          {w.customerPhone}
                        </div>
                      </td>

                      <td className="py-4 px-5">
                        <div className={`font-bold ${isDark ? "text-slate-200" : "text-slate-900"}`}>{w.productName}</div>
                        <div className={`text-xs mt-0.5 ${isDark ? "text-slate-500" : "text-slate-600 font-semibold"}`}>
                          ضمان معتمد MG Group
                        </div>
                      </td>

                      <td className="py-4 px-5">
                        <div className={`text-xs flex items-center gap-1 font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span>من: {new Date(w.startDate).toLocaleDateString("ar-EG")}</span>
                        </div>
                        <div
                          className={`text-xs font-bold mt-1 ${
                            isExpired ? (isDark ? "text-rose-400" : "text-rose-700") : (isDark ? "text-emerald-400" : "text-emerald-700")
                          }`}
                        >
                          إلى: {new Date(w.endDate).toLocaleDateString("ar-EG")}
                          {isExpired ? " (منتهي ❌)" : " (ساري ✅)"}
                        </div>
                      </td>

                      <td className="py-4 px-5">
                        {isExpired ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 border border-rose-500/30">
                            منتهي
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            ساري بالضمان
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-5">
                        {w.tickets && w.tickets.length > 0 ? (
                          <div className="space-y-1.5 max-w-xs">
                            {w.tickets.map((t) => (
                              <div
                                key={t.id}
                                className={`text-xs p-2 rounded-lg border ${
                                  isDark ? "bg-slate-950 border-slate-800" : "bg-slate-200 border-slate-300"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className={`font-bold ${isDark ? "text-amber-400" : "text-amber-900"}`}>
                                    عطل: {t.issueDescription}
                                  </span>
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                      t.status === "RESOLVED" || t.status === "CLOSED"
                                        ? "bg-emerald-500/20 text-emerald-700 border border-emerald-300"
                                        : "bg-amber-500/20 text-amber-700 border border-amber-300"
                                    }`}
                                  >
                                    {t.status === "RESOLVED" ? "تم الصيانة" : t.status === "OPEN" ? "مفتوحة" : t.status}
                                  </span>
                                </div>
                                {t.actionTaken && (
                                  <div className={`text-[11px] font-bold mt-1 ${isDark ? "text-emerald-400" : "text-emerald-800"}`}>
                                    الإجراء: {t.actionTaken}
                                  </div>
                                )}
                                {t.status === "OPEN" && (
                                  <div className="flex items-center gap-1 mt-2">
                                    <button
                                      onClick={() =>
                                        handleUpdateTicketStatus(t.id, "RESOLVED", "تم تصليح العطل بالمعرض")
                                      }
                                      className="px-2 py-0.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-[10px] font-bold"
                                    >
                                      تم التصليح
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleUpdateTicketStatus(t.id, "RESOLVED", "تم استبدال الجهاز بجديد بالكرتونة")
                                      }
                                      className="px-2 py-0.5 bg-sky-700 hover:bg-sky-600 text-white rounded text-[10px] font-bold"
                                    >
                                      استبدال بجديد
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className={`text-xs ${isDark ? "text-slate-500" : "text-slate-600"}`}>
                            لا توجد بلاغات أعطال
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* زر تسجيل صيانة */}
                          <button
                            onClick={() => handleOpenTicketModal(w)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold shadow-sm transition-all active:scale-95"
                            title="تسجيل عطل أو طلب صيانة/استبدال"
                          >
                            <Wrench className="w-3.5 h-3.5" />
                            <span>بلاغ صيانة</span>
                          </button>

                          {/* زر تعديل بطاقة الضمان */}
                          <button
                            onClick={() => handleOpenEditModal(w)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-sm transition-all active:scale-95"
                            title="تعديل بيانات العميل أو مدة وسريان الضمان"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>تعديل</span>
                          </button>

                          {/* زر حذف بطاقة الضمان */}
                          <button
                            onClick={() => handleDeleteWarranty(w.id)}
                            className="p-1.5 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/25 text-red-500 transition-all active:scale-95"
                            title="حذف بطاقة الضمان نهائياً"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* مودال إضافة أو تعديل بطاقة الضمان */}
      {showWarrantyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-lg rounded-2xl shadow-2xl p-6 border ${
            isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-300 text-slate-900"
          }`}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-base">
                  {editingWarranty ? `تعديل بطاقة الضمان: #${editingWarranty.warrantyCode}` : "إصدار بطاقة ضمان رسمي جديدة"}
                </h3>
              </div>
              <button
                onClick={() => setShowWarrantyModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveWarranty} className="space-y-4 mt-4 text-xs font-bold">
              <div>
                <label className="block mb-1">اسم العميل / التاجر *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: أ/ محمد عبد الله"
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  className={`w-full border rounded-xl p-2.5 text-xs focus:outline-none focus:border-amber-500 ${
                    isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-100 border-slate-300 text-slate-900"
                  }`}
                />
              </div>

              <div>
                <label className="block mb-1">رقم الهاتف (واتساب العميل) *</label>
                <input
                  type="tel"
                  required
                  placeholder="01012345678"
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  className={`w-full border rounded-xl p-2.5 text-xs focus:outline-none focus:border-amber-500 font-mono ${
                    isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-100 border-slate-300 text-slate-900"
                  }`}
                />
              </div>

              <div>
                <label className="block mb-1">اسم الجهاز / الموديل *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: خلاط تجاري ثقيل 2200 وات أو كاتل MG Pro"
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  className={`w-full border rounded-xl p-2.5 text-xs focus:outline-none focus:border-amber-500 ${
                    isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-100 border-slate-300 text-slate-900"
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1">الرقم التسلسلي (سيريال الجهاز)</label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="SN-123456"
                      value={serialNo}
                      onChange={(e) => setSerialNo(e.target.value)}
                      className={`flex-1 border rounded-xl p-2.5 text-xs focus:outline-none focus:border-amber-500 font-mono ${
                        isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-100 border-slate-300 text-slate-900"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setSerialNo(`SN-${Math.floor(100000 + Math.random() * 900000)}`)}
                      className="px-2.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-xl border border-slate-700 text-[10px]"
                      title="توليد سيريال عشوائي"
                    >
                      توليد
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block mb-1">مدة الضمان الرسمية</label>
                  <select
                    value={warrantyMonths}
                    onChange={(e) => setWarrantyMonths(e.target.value)}
                    className={`w-full border rounded-xl p-2.5 text-xs focus:outline-none focus:border-amber-500 ${
                      isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-100 border-slate-300 text-slate-900"
                    }`}
                  >
                    <option value="12">12 شهراً (سنة واحدة)</option>
                    <option value="18">18 شهراً</option>
                    <option value="24">24 شهراً (سنتان)</option>
                    <option value="36">36 شهراً (3 سنوات)</option>
                  </select>
                </div>
              </div>

              {editingWarranty && (
                <div>
                  <label className="block mb-1">حالة الضمان</label>
                  <select
                    value={warrantyStatus}
                    onChange={(e) => setWarrantyStatus(e.target.value)}
                    className={`w-full border rounded-xl p-2.5 text-xs focus:outline-none focus:border-amber-500 ${
                      isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-100 border-slate-300 text-slate-900"
                    }`}
                  >
                    <option value="ACTIVE">ساري بالضمان (Active)</option>
                    <option value="EXPIRED">منتهي الضمان (Expired)</option>
                    <option value="CLAIMED">تم الاستبدال بجديد (Claimed)</option>
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowWarrantyModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={savingWarranty}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-xs shadow-md shadow-amber-900/30 transition-all disabled:opacity-50"
                >
                  {savingWarranty ? "جاري الحفظ..." : editingWarranty ? "حفظ التعديلات" : "إصدار بطاقة الضمان"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مودال تسجيل صيانة أو استبدال */}
      {showTicketModal && selectedWarranty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-lg rounded-2xl shadow-2xl p-6 border ${
            isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-300 text-slate-900"
          }`}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-base">تسجيل تذكرة صيانة أو استبدال</h3>
              </div>
              <button
                onClick={() => setShowTicketModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4 mt-4">
              <div className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                isDark ? "bg-slate-950 border-slate-800" : "bg-slate-100 border-slate-300 font-medium"
              }`}>
                <div>
                  <strong>الجهاز:</strong> {selectedWarranty.productName}
                </div>
                <div>
                  <strong>العميل:</strong> {selectedWarranty.customerName} (
                  {selectedWarranty.customerPhone})
                </div>
                <div>
                  <strong>كود الضمان:</strong> #{selectedWarranty.warrantyCode}
                </div>
                <div>
                  <strong>صلاحية الضمان:</strong> حتى{" "}
                  {new Date(selectedWarranty.endDate).toLocaleDateString("ar-EG")}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">
                  وصف العطل أو المشكلة بالتفصيل *
                </label>
                <textarea
                  required
                  rows={3}
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  placeholder="مثال: الخلاط لا يعمل في السرعة الثانية، أو الكاتل يفصل قبل الغليان..."
                  className={`w-full border rounded-xl p-3 text-sm focus:outline-none focus:border-amber-500 ${
                    isDark ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-100 border-slate-300 text-slate-900 font-medium"
                  }`}
                />
              </div>

              <div className={`text-xs p-3 rounded-xl border font-semibold ${
                isDark ? "text-amber-400 bg-amber-500/10 border-amber-500/20" : "text-amber-800 bg-amber-50 border-amber-300"
              }`}>
                📍 سيتم إرسال إشعار فوري لإدارة المعرض بمصر الجديدة (13 جسر السويس) عبر بوت تليجرام لاتخاذ الإجراء (صيانة فورية أو استبدال الجهاز).
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTicketModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submittingTicket}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-amber-600/30 transition-all disabled:opacity-50"
                >
                  {submittingTicket ? "جاري الحفظ..." : "تأكيد وإرسال للإدارة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
