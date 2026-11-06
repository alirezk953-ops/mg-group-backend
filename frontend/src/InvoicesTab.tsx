import React, { useState } from "react";
import { 
  FileText, 
  Trash2, 
  Edit3, 
  Download, 
  User as UserIcon, 
  Phone, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  X, 
  Search,
  Filter
} from "lucide-react";
import type { Order } from "./types";

interface InvoicesTabProps {
  orders: Order[];
  onRefresh: () => void;
}

const API_BASE_URL = "http://localhost:3000/api";

export default function InvoicesTab({ orders, onRefresh }: InvoicesTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editStatus, setEditStatus] = useState("Pending");
  const [saving, setSaving] = useState(false);

  // فتح نافذة التعديل
  const openEditModal = (order: Order) => {
    setEditingOrder(order);
    setEditName(order.user?.name || "");
    setEditPhone(order.user?.phone || "");
    setEditAddress(order.user?.address || "");
    setEditStatus(order.status);
  };

  // حفظ التعديلات
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/orders/${editingOrder.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          phone: editPhone,
          address: editAddress,
          status: editStatus,
        }),
      });

      if (res.ok) {
        setEditingOrder(null);
        onRefresh();
      } else {
        alert("فشل تحديث بيانات الفاتورة");
      }
    } catch (err: any) {
      alert("خطأ أثناء الحفظ: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // حذف الفاتورة مع استرجاع المخزن تلقائياً
  const handleDeleteOrder = async (orderId: number) => {
    if (
      !confirm(
        "هل أنت متأكد من إلغاء/حذف هذه الفاتورة؟\nسيتم إرجاع كميات المنتجات إلى المخزن تلقائياً!"
      )
    )
      return;

    try {
      const res = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        onRefresh();
      } else {
        alert("فشل حذف الفاتورة");
      }
    } catch (err: any) {
      alert("خطأ أثناء الحذف: " + err.message);
    }
  };

  // تصفية الفواتير
  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.user?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.user?.phone.includes(searchTerm) ||
      o.orderCode.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = filterStatus === "ALL" ? true : o.status === filterStatus;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      {/* شريط البحث والفلترة */}
      <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row gap-4 items-center justify-between backdrop-blur-md">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5" />
          <input
            type="text"
            placeholder="بحث برقم الفاتورة، العميل، الهاتف..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-10 pl-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-500 ml-1" />
          {["ALL", "Pending", "Completed"].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                filterStatus === st
                  ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30"
                  : "bg-slate-950/80 text-slate-400 border-slate-800 hover:text-white"
              }`}
            >
              {st === "ALL" ? "جميع الفواتير" : st === "Pending" ? "معلقة" : "مكتملة ومسددة"}
            </button>
          ))}
        </div>
      </div>

      {/* جدول الفواتير الشامل */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-md shadow-2xl">
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-400" />
            سجل الفواتير والمبيعات الرسمية
          </h3>
          <span className="text-xs bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-md font-mono font-semibold">
            {filteredOrders.length} فاتورة
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-sm">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800/90 text-xs text-slate-400">
                <th className="py-3.5 px-6">رقم الفاتورة والتاريخ</th>
                <th className="py-3.5 px-6">بيانات العميل</th>
                <th className="py-3.5 px-6">بنود الفاتورة</th>
                <th className="py-3.5 px-6">المبلغ الإجمالي</th>
                <th className="py-3.5 px-6">حالة السداد</th>
                <th className="py-3.5 px-6 text-center">إجراءات الفاتورة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-500 text-xs">
                    لا توجد فواتير مطابقة
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-800/30 transition-colors">
                    {/* رقم الفاتورة */}
                    <td className="py-4 px-6">
                      <div className="font-mono text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md inline-block">
                        INV-#{order.orderCode.slice(0, 8).toUpperCase()}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {new Date(order.createdAt).toLocaleDateString("ar-EG", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>

                    {/* بيانات العميل */}
                    <td className="py-4 px-6">
                      <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                        <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                        {order.user?.name}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5" dir="ltr">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        <span>{order.user?.phone}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <span>{order.user?.address}</span>
                      </div>
                    </td>

                    {/* البنود */}
                    <td className="py-4 px-6">
                      <div className="space-y-1">
                        {order.items?.map((it) => (
                          <div
                            key={it.id}
                            className="text-xs bg-slate-950/40 border border-slate-800/60 px-2 py-0.5 rounded flex items-center justify-between gap-2"
                          >
                            <span className="text-slate-300">{it.product?.name}</span>
                            <span className="font-mono text-indigo-400 font-semibold">×{it.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </td>

                    {/* المبلغ */}
                    <td className="py-4 px-6 font-mono font-bold text-base text-slate-100">
                      {order.total.toLocaleString()} <span className="text-xs font-normal text-slate-400">ج.م</span>
                    </td>

                    {/* الحالة */}
                    <td className="py-4 px-6">
                      {order.status === "Completed" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" /> مسدد ومكتمل
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <Clock className="w-3 h-3" /> قيد المتابعة
                        </span>
                      )}
                    </td>

                    {/* أزرار الإجراءات: PDF - Edit - Delete */}
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {/* زر تحميل الـ PDF */}
                        <a
                          href={`${API_BASE_URL}/orders/${order.id}/invoice-html`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/30 active:scale-95"
                          title="عرض الفاتورة العربية الفاخرة وطباعتها PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>فاتورة عربي PDF</span>
                        </a>

                        {/* زر التعديل */}
                        <button
                          onClick={() => openEditModal(order)}
                          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
                          title="تعديل بيانات الفاتورة"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* زر الحذف */}
                        <button
                          onClick={() => handleDeleteOrder(order.id)}
                          className="p-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-colors"
                          title="إلغاء الفاتورة واسترجاع المخزون"
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

      {/* Modal نافذة تعديل بيانات الفاتورة */}
      {editingOrder && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setEditingOrder(null)}
              className="absolute left-4 top-4 p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-indigo-400" />
              تعديل الفاتورة: #{editingOrder.orderCode.slice(0, 8)}
            </h3>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">اسم العميل</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">رقم الهاتف</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">عنوان التوصيل</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">حالة الفاتورة</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="Pending">قيد المتابعة (Pending)</option>
                  <option value="Completed">مكتمل ومسدد (Completed)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-all disabled:opacity-50"
                >
                  {saving ? "جاري الحفظ..." : "حفظ التعديلات"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
