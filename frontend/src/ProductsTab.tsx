import React, { useState } from "react";
import { Plus, Trash2, Edit3, PackageCheck, AlertCircle, Building2, Warehouse, Shield } from "lucide-react";
import type { Product } from "./types";

interface ProductsTabProps {
  products: Product[];
  onRefresh: () => void;
}

const API_BASE_URL = "http://localhost:3000/api";

export default function ProductsTab({ products, onRefresh }: ProductsTabProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("تجهيزات كافيهات ومطاعم");
  const [price, setPrice] = useState("");
  const [wholesalePrice, setWholesalePrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [stock, setStock] = useState("");
  const [showroomStock, setShowroomStock] = useState("");
  const [warehouseStock, setWarehouseStock] = useState("");
  const [warrantyMonths, setWarrantyMonths] = useState("12");
  const [minStockThreshold, setMinStockThreshold] = useState("3");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price || !stock) {
      setMessage({ text: "اسم الجهاز وسعر القطاعي وإجمالي المخزون مطلوبة", type: "error" });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const url = editingProduct
        ? `${API_BASE_URL}/products/${editingProduct.id}`
        : `${API_BASE_URL}/products`;

      const method = editingProduct ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          category: category.trim(),
          price: Number(price),
          wholesalePrice: wholesalePrice ? Number(wholesalePrice) : null,
          costPrice: costPrice ? Number(costPrice) : null,
          stock: Number(stock),
          showroomStock: showroomStock ? Number(showroomStock) : 0,
          warehouseStock: warehouseStock ? Number(warehouseStock) : Number(stock),
          minStockThreshold: Number(minStockThreshold) || 3,
          warrantyMonths: Number(warrantyMonths) || 12,
        }),
      });

      if (res.ok) {
        setMessage({
          text: editingProduct ? "تم تحديث الجهاز وبيانات التسعير بنجاح!" : "تم إضافة الجهاز بنجاح!",
          type: "success",
        });
        resetForm();
        onRefresh();
      } else {
        const data = await res.json();
        setMessage({ text: data.error || "فشل حفظ الجهاز", type: "error" });
      }
    } catch (err: any) {
      setMessage({ text: "خطأ في الاتصال بالـ Backend: " + err.message, type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setName("");
    setCategory("تجهيزات كافيهات ومطاعم");
    setPrice("");
    setWholesalePrice("");
    setCostPrice("");
    setStock("");
    setShowroomStock("");
    setWarehouseStock("");
    setWarrantyMonths("12");
    setMinStockThreshold("3");
    setEditingProduct(null);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setName(product.name);
    setCategory(product.category || "تجهيزات كافيهات ومطاعم");
    setPrice(product.price.toString());
    setWholesalePrice(product.wholesalePrice ? product.wholesalePrice.toString() : "");
    setCostPrice(product.costPrice ? product.costPrice.toString() : "");
    setStock(product.stock.toString());
    setShowroomStock((product.showroomStock ?? 0).toString());
    setWarehouseStock((product.warehouseStock ?? product.stock).toString());
    setWarrantyMonths((product.warrantyMonths || 12).toString());
    setMinStockThreshold((product.minStockThreshold || 3).toString());
    setMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا الجهاز؟")) return;

    try {
      const res = await fetch(`${API_BASE_URL}/products/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ text: "تم حذف الجهاز بنجاح", type: "success" });
        onRefresh();
      } else if (data.hasRelations) {
        const confirmForce = confirm(
          `${data.error}\n\nهل ترغب في الحذف الشامل وحذف سجلات البيع/المقايسات التجريبية المرتبطة بهذا الجهاز نهائياً؟`
        );
        if (confirmForce) {
          const forceRes = await fetch(`${API_BASE_URL}/products/${id}?force=true`, {
            method: "DELETE",
          });
          const forceData = await forceRes.json();
          if (forceRes.ok) {
            setMessage({ text: "تم حذف الجهاز وسجلاته المرتبطة بنجاح", type: "success" });
            onRefresh();
          } else {
            alert(forceData.error || "تعذر إتمام الحذف الشامل");
          }
        }
      } else {
        alert(data.error || "فشل حذف الجهاز");
      }
    } catch (err: any) {
      alert("خطأ أثناء الحذف: " + err.message);
    }
  };

  return (
    <div className="space-y-8">
      {/* نموذج إضافة / تعديل منتج بنظام التسعير المزدوج والمخازن */}
      <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl backdrop-blur-md shadow-xl">
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2 mb-4">
          <Plus className="w-5 h-5 text-indigo-400" />
          {editingProduct ? `تعديل جهاز: ${editingProduct.name}` : "إضافة جهاز كهربائي جديد (MG Group Catalog)"}
        </h2>

        {message && (
          <div
            className={`p-3 rounded-xl mb-4 text-xs font-semibold flex items-center gap-2 ${
              message.type === "success"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-red-500/10 text-red-400 border border-red-500/20"
            }`}
          >
            <AlertCircle className="w-4 h-4" />
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                اسم الجهاز والموديل *
              </label>
              <input
                type="text"
                placeholder="مثال: خلاط تجاري ثقيل للمطاعم 2200 وات"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">التصنيف</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="تجهيزات كافيهات ومطاعم">تجهيزات كافيهات ومطاعم</option>
                <option value="أجهزة مطبخ صغيرة">أجهزة مطبخ صغيرة (خلاطات، كبة، كاتل)</option>
                <option value="أجهزة تدفئة ومناخ">أجهزة تدفئة ومناخ (دفايات)</option>
                <option value="سخانات ومياه">سخانات ومياه</option>
                <option value="أجهزة تهوية">أجهزة تهوية ومراوح</option>
                <option value="أخرى">أجهزة أخرى</option>
              </select>
            </div>
          </div>

          {/* نظام التسعير المزدوج والتكلفة */}
          <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4">
            <div className="text-xs font-bold text-indigo-400 mb-3">
              💰 نظام التسعير المزدوج (Dual-Tier Pricing: B2B vs B2C) وحساب هامش الربح:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  سعر البيع قطاعي (Retail Price) *
                </label>
                <input
                  type="number"
                  placeholder="مثال: 4800"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-sky-400 mb-1">
                  سعر الجملة والتجار (B2B Wholesale)
                </label>
                <input
                  type="number"
                  placeholder="مثال: 3900"
                  value={wholesalePrice}
                  onChange={(e) => setWholesalePrice(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-sky-400 font-mono focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-emerald-400 mb-1">
                  سعر التكلفة (لحساب هامش الربح)
                </label>
                <input
                  type="number"
                  placeholder="مثال: 3200"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-emerald-400 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* توزيع المخزون بين المعرض والمخزن والضمان */}
          <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4">
            <div className="text-xs font-bold text-amber-400 mb-3">
              🏢 إدارة مخزون المعرض (13 جسر السويس) والمخزن المركزي والضمان:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  إجمالي المخزون *
                </label>
                <input
                  type="number"
                  placeholder="25"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  مخزون المعرض (جسر السويس)
                </label>
                <input
                  type="number"
                  placeholder="5"
                  value={showroomStock}
                  onChange={(e) => setShowroomStock(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  مخزون المخزن المركزي (الشحن)
                </label>
                <input
                  type="number"
                  placeholder="20"
                  value={warehouseStock}
                  onChange={(e) => setWarehouseStock(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-amber-300 mb-1">
                  مدة الضمان الرسمي (أشهر)
                </label>
                <input
                  type="number"
                  placeholder="مثال: 24"
                  value={warrantyMonths}
                  onChange={(e) => setWarrantyMonths(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-amber-300 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            {editingProduct && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-all"
              >
                إلغاء التعديل
              </button>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/30 active:scale-95 disabled:opacity-50"
            >
              {submitting ? "جاري الحفظ..." : editingProduct ? "حفظ تعديلات الجهاز" : "إضافة الجهاز للكتالوج"}
            </button>
          </div>
        </form>
      </div>

      {/* جدول الأجهزة */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-md shadow-2xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-emerald-400" />
            كتالوج أجهزة MG Group (معرض جسر السويس والمخزن المركزي)
          </h3>
          <span className="text-xs bg-indigo-500/10 text-indigo-400 px-2.5 py-1 rounded-md font-mono font-semibold">
            {products.length} جهاز
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-xs text-slate-400">
                <th className="py-3.5 px-5">الجهاز والتصنيف</th>
                <th className="py-3.5 px-5">سعر القطاعي (B2C)</th>
                <th className="py-3.5 px-5">سعر الجملة (B2B)</th>
                <th className="py-3.5 px-5">التكلفة والربح التقديري</th>
                <th className="py-3.5 px-5">مخزون المعرض vs المخزن</th>
                <th className="py-3.5 px-5">الضمان المعتمد</th>
                <th className="py-3.5 px-5 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-sm">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-500 text-xs">
                    لا توجد أجهزة مسجلة حتى الآن
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const estProfit = p.costPrice ? p.price - p.costPrice : null;
                  return (
                    <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-4 px-5">
                        <div className="font-bold text-white">{p.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          #{p.id} • {p.category || "أجهزة كهربائية"}
                        </div>
                      </td>

                      <td className="py-4 px-5 font-mono font-bold text-indigo-400">
                        {p.price.toLocaleString()}{" "}
                        <span className="text-xs font-normal text-slate-500">ج.م</span>
                      </td>

                      <td className="py-4 px-5 font-mono">
                        {p.wholesalePrice ? (
                          <span className="font-bold text-sky-400">
                            {p.wholesalePrice.toLocaleString()} ج.م
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">غير محدد</span>
                        )}
                      </td>

                      <td className="py-4 px-5 font-mono text-xs">
                        {p.costPrice ? (
                          <div>
                            <div className="text-slate-400">تكلفة: {p.costPrice.toLocaleString()} ج.م</div>
                            {estProfit !== null && (
                              <div className="text-emerald-400 font-bold mt-0.5">
                                ربح قطاعي: +{estProfit.toLocaleString()} ج.م
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500">غير محدد</span>
                        )}
                      </td>

                      <td className="py-4 px-5 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 text-slate-300">
                            <Building2 className="w-3.5 h-3.5 text-amber-400" />
                            المعرض: <strong>{p.showroomStock ?? 0}</strong>
                          </span>
                          <span className="flex items-center gap-1 text-slate-300">
                            <Warehouse className="w-3.5 h-3.5 text-sky-400" />
                            المخزن: <strong>{p.warehouseStock ?? p.stock}</strong>
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          الإجمالي: <strong className="text-white">{p.stock}</strong> قطعة
                        </div>
                      </td>

                      <td className="py-4 px-5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <Shield className="w-3 h-3" />
                          {p.warrantyMonths || 12} شهر
                        </span>
                      </td>

                      <td className="py-4 px-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(p)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                            title="تعديل الجهاز"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-colors"
                            title="حذف الجهاز"
                          >
                            <Trash2 className="w-4 h-4" />
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
    </div>
  );
}
