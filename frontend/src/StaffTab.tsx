import React, { useEffect, useState } from "react";
import { Users, UserPlus, Shield, Trash2, Edit3, CheckCircle2, AlertCircle } from "lucide-react";
import type { Staff } from "./types";

const API_BASE_URL = "http://localhost:3000/api";

export default function StaffTab({ currentRole }: { currentRole: Staff["role"] }) {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Staff["role"]>("EMPLOYEE");
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchStaff = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/staff`);
      if (res.ok) {
        const data = await res.json();
        setStaffList(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !name.trim()) {
      setMsg({ text: "اسم المستخدم والاسم الكامل مطلوبان", type: "error" });
      return;
    }

    setSubmitting(true);
    setMsg(null);

    try {
      const url = editingId ? `${API_BASE_URL}/staff/${editingId}` : `${API_BASE_URL}/staff`;
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          name: name.trim(),
          role,
          pin: pin.trim() || "1234",
        }),
      });

      if (res.ok) {
        setMsg({
          text: editingId ? "تم تعديل الموظف بنجاح!" : "تم إضافة المستخدم الجديد بنجاح!",
          type: "success",
        });
        setUsername("");
        setName("");
        setPin("");
        setRole("EMPLOYEE");
        setEditingId(null);
        fetchStaff();
      } else {
        const data = await res.json();
        setMsg({ text: data.error || "فشل حفظ المستخدم", type: "error" });
      }
    } catch (err: any) {
      setMsg({ text: "خطأ: " + err.message, type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (currentRole !== "ADMIN") {
      alert("عذراً، المدير العام (Admin) فقط هو من يملك صلاحية حذف المستخدمين!");
      return;
    }

    if (!confirm("هل أنت متأكد من حذف هذا المستخدم؟")) return;

    try {
      const res = await fetch(`${API_BASE_URL}/staff/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchStaff();
      } else {
        alert("فشل حذف المستخدم");
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleEdit = (s: Staff) => {
    if (currentRole !== "ADMIN") {
      alert("عذراً، تعديل الصلاحيات متاح فقط للمدير العام (Admin)!");
      return;
    }
    setEditingId(s.id);
    setUsername(s.username);
    setName(s.name);
    setRole(s.role);
    setPin("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-6">
      {/* نموذج إضافة وتعديل المستخدمين */}
      {currentRole === "ADMIN" ? (
        <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl backdrop-blur-md shadow-xl">
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2 mb-4">
            <UserPlus className="w-5 h-5 text-indigo-400" />
            {editingId ? "تعديل بيانات وصلاحيات الموظف" : "إضافة موظف جديد وتحديد صلاحياته (RBAC)"}
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

          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">اسم المستخدم (Username)</label>
              <input
                type="text"
                placeholder="مثال: ahmed_orders"
                value={username}
                disabled={!!editingId}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">الاسم الكامل</label>
              <input
                type="text"
                placeholder="مثال: أحمد عبد الله"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">مستوى الصلاحية (Role)</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Staff["role"])}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 font-semibold"
              >
                <option value="ADMIN">مدير عام (Admin - كامل الصلاحيات)</option>
                <option value="SUPPORT">خدمة عملاء ودعم بشري (Support / Live Chat)</option>
                <option value="EMPLOYEE">موظف مبيعات وطلبات (Employee)</option>
                <option value="DELIVERY">مسؤول شحن وتوصيل (Delivery Courier)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">رمز الدخول (PIN Code)</label>
              <input
                type="text"
                placeholder="افتراضي: 1234"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 text-left font-mono"
                dir="ltr"
              />
            </div>

            <div className="sm:col-span-4 flex items-center justify-end gap-3 mt-1">
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setUsername("");
                    setName("");
                    setPin("");
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800"
                >
                  إلغاء التعديل
                </button>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
              >
                {submitting ? "جاري الحفظ..." : editingId ? "حفظ التعديلات" : "إضافة المستخدم"}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs text-amber-400 flex items-center gap-2">
          <Shield className="w-4 h-4" />
          أنت مسجل حالياً بصلاحية ({currentRole})، إدارة وتعيين مستخدمين جدد متاحة فقط للمدير العام (Admin).
        </div>
      )}

      {/* جدول طاقم العمل والصلاحيات */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-md shadow-2xl">
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" />
            فريق العمل والموظفين المسجلين
          </h3>
          <span className="text-xs bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-md font-mono font-semibold">
            {staffList.length} مستخدم
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-sm">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800/90 text-xs text-slate-400">
                <th className="py-3.5 px-6">المعرف</th>
                <th className="py-3.5 px-6">الموظف / الاسم</th>
                <th className="py-3.5 px-6">اسم المستخدم</th>
                <th className="py-3.5 px-6">الصلاحية (Role)</th>
                <th className="py-3.5 px-6">تاريخ الإضافة</th>
                <th className="py-3.5 px-6 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-500 text-xs">
                    جاري تحميل المستخدمين...
                  </td>
                </tr>
              ) : (
                staffList.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-6 font-mono text-xs text-slate-400">#{s.id}</td>
                    <td className="py-4 px-6 font-semibold text-slate-100">{s.name}</td>
                    <td className="py-4 px-6 font-mono text-xs text-slate-300">@{s.username}</td>
                    <td className="py-4 px-6">
                      {s.role === "ADMIN" ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                          <Shield className="w-3.5 h-3.5 text-indigo-400" /> مدير عام (Admin)
                        </span>
                      ) : s.role === "SUPPORT" ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                          خدمة عملاء ودعم
                        </span>
                      ) : s.role === "EMPLOYEE" ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          موظف طلبات ومبيعات
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          مسؤول شحن وتوصيل
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-xs text-slate-500">
                      {new Date(s.createdAt).toLocaleDateString("ar-EG")}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(s)}
                          disabled={currentRole !== "ADMIN"}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors disabled:opacity-40"
                          title="تعديل المستخدم"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(s.id)}
                          disabled={currentRole !== "ADMIN" || s.username === "admin"}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-colors disabled:opacity-30"
                          title="حذف المستخدم"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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
