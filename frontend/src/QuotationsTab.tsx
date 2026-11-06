import { useState, useEffect } from "react";
import {
  FileText,
  Plus,
  RefreshCw,
  Printer,
  CheckCircle,
  Clock,
  Sparkles,
  Building2,
  Trash2,
  Check
} from "lucide-react";
import type { Quotation, Product } from "./types";

const API_BASE_URL = "http://localhost:3000/api";

interface QuotationsTabProps {
  products: Product[];
  onOrderCreated?: () => void;
}

export default function QuotationsTab({ products, onOrderCreated }: QuotationsTabProps) {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [convertingId, setConvertingId] = useState<number | null>(null);

  // فورم المقايسة الجديدة
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerType, setCustomerType] = useState<"COMMERCIAL_PROJECT" | "WHOLESALE" | "RETAIL">("COMMERCIAL_PROJECT");
  const [projectType, setProjectType] = useState("تجهيز كافيه ومطعم");
  const [discount, setDiscount] = useState<number>(0);
  const [validDays, setValidDays] = useState<number>(15);
  const [notes, setNotes] = useState("");
  const [selectedItems, setSelectedItems] = useState<{ productId: number; quantity: number }[]>([
    { productId: products[0]?.id || 1, quantity: 1 },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/quotations`);
      if (res.ok) {
        const data = await res.json();
        setQuotations(data);
      }
    } catch (err) {
      console.error("خطأ في جلب المقايسات:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, []);

  const handleAddItem = () => {
    if (products.length === 0) return;
    setSelectedItems((prev) => [...prev, { productId: products[0].id, quantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    setSelectedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: "productId" | "quantity", value: number) => {
    setSelectedItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  // احتساب الإجمالي التقديري في الفورم
  const calculateFormTotal = () => {
    let sum = 0;
    for (const it of selectedItems) {
      const p = products.find((prod) => prod.id === it.productId);
      if (p) {
        const price =
          customerType === "WHOLESALE" || customerType === "COMMERCIAL_PROJECT" || it.quantity >= 3
            ? p.wholesalePrice || p.price
            : p.price;
        sum += price * it.quantity;
      }
    }
    return sum;
  };

  const formTotal = calculateFormTotal();
  const formFinalTotal = Math.max(0, formTotal - Number(discount || 0));

  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone || selectedItems.length === 0) {
      alert("يرجى ملء اسم العميل ورقم الهاتف واختيار الأجهزة المطلوبة");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/quotations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerPhone,
          customerType,
          projectType,
          discount: Number(discount),
          validDays: Number(validDays),
          notes,
          items: selectedItems,
        }),
      });

      if (res.ok) {
        setShowModal(false);
        // إعادة تعيين الفورم
        setCustomerName("");
        setCustomerPhone("");
        setDiscount(0);
        setNotes("");
        setSelectedItems([{ productId: products[0]?.id || 1, quantity: 1 }]);
        fetchQuotations();
      } else {
        const err = await res.json();
        alert("فشل إنشاء المقايسة: " + (err.error || "خطأ غير معروف"));
      }
    } catch (err: any) {
      alert("حدث خطأ أثناء الحفظ: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // تحويل المقايسة إلى أوردر فعلي
  const handleConvertQuotation = async (quotation: Quotation) => {
    const address = prompt("يرجى كتابة عنوان التوصيل والشحن للأوردر:", "تسليم فوري من معرض مصر الجديدة 13 جسر السويس");
    if (!address) return;

    const source = confirm("هل تريد الصرف من (المخزن الرئيسي)؟ اضغط إلغاء للصرف من (معرض جسر السويس)")
      ? "WAREHOUSE"
      : "SHOWROOM";

    setConvertingId(quotation.id);
    try {
      const res = await fetch(`${API_BASE_URL}/quotations/${quotation.id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, fulfillmentSource: source }),
      });

      if (res.ok) {
        alert("🎉 تم تحويل المقايسة إلى أوردر فعلي بنجاح وخصم الأجهزة وإصدار بطاقات الضمان!");
        fetchQuotations();
        if (onOrderCreated) onOrderCreated();
      } else {
        const data = await res.json();
        alert("فشل التحويل: " + (data.error || "تأكد من توفر المخزون"));
      }
    } catch (err: any) {
      alert("حدث خطأ: " + err.message);
    } finally {
      setConvertingId(null);
    }
  };

  const totalQuotes = quotations.length;
  const pendingQuotes = quotations.filter((q) => q.status === "PENDING").length;
  const convertedQuotes = quotations.filter((q) => q.status === "CONVERTED").length;
  const totalValue = quotations.reduce((sum, q) => sum + q.finalTotal, 0);

  return (
    <div className="space-y-6">
      {/* رأس الصفحة وأزرار التحكم */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-5 rounded-2xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-xl">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                محرك المقايسات وتجهيز الكافيهات والمنازل
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium">
                  MG Group Quoting
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                توليد عروض أسعار رسمية بـ PDF فوراً لشعار MG Group، وتطبيق أسعار الجملة، والتحويل المباشر لأوردرات
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchQuotations}
            disabled={loading}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all border border-slate-700 disabled:opacity-50"
            title="تحديث"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-sky-400" : ""}`} />
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-sky-600/30 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            إنشاء مقايسة / عرض سعر جديد
          </button>
        </div>
      </div>

      {/* كروت الإحصائيات السريعة */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-xl">
          <div className="text-slate-400 text-xs font-medium">إجمالي المقايسات</div>
          <div className="text-2xl font-bold text-white mt-1 font-mono">{totalQuotes}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">عروض الأسعار المصدرة</div>
        </div>
        <div className="bg-slate-900/40 border border-amber-900/30 p-4 rounded-xl">
          <div className="text-amber-400 text-xs font-medium">مقايسات قيد التفاوض</div>
          <div className="text-2xl font-bold text-amber-400 mt-1 font-mono">{pendingQuotes}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">بانتظار تأكيد العميل</div>
        </div>
        <div className="bg-slate-900/40 border border-emerald-900/30 p-4 rounded-xl">
          <div className="text-emerald-400 text-xs font-medium">تم تحويلها لأوردرات</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono">{convertedQuotes}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">تم بيعها وصرفها بنجاح</div>
        </div>
        <div className="bg-slate-900/40 border border-sky-900/30 p-4 rounded-xl">
          <div className="text-sky-400 text-xs font-medium">إجمالي قيمة المقايسات</div>
          <div className="text-2xl font-bold text-sky-400 mt-1 font-mono">
            {totalValue.toLocaleString()}{" "}
            <span className="text-xs font-normal text-slate-400">ج.م</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">حجم المشاريع المعروضة</div>
        </div>
      </div>

      {/* جدول المقايسات */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-md shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-xs text-slate-400 uppercase">
                <th className="py-4 px-5">كود المقايسة والتاريخ</th>
                <th className="py-4 px-5">العميل والمشروع</th>
                <th className="py-4 px-5">الأجهزة والكميات</th>
                <th className="py-4 px-5">الإجمالي والخصم</th>
                <th className="py-4 px-5">الحالة</th>
                <th className="py-4 px-5 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-sm">
              {loading && quotations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-sky-500 mb-2" />
                    جاري تحميل المقايسات...
                  </td>
                </tr>
              ) : quotations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    لا توجد أي مقايسات مسجلة حتى الآن. اضغط على زر "إنشاء مقايسة" بالبداية!
                  </td>
                </tr>
              ) : (
                quotations.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-5">
                      <div className="font-mono text-xs font-bold text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded inline-block">
                        #{q.quoteCode}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {new Date(q.createdAt).toLocaleDateString("ar-EG")} (ساري {q.validDays} يوم)
                      </div>
                    </td>

                    <td className="py-4 px-5">
                      <div className="font-bold text-white">{q.customerName}</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5" dir="ltr">
                        {q.customerPhone}
                      </div>
                      <div className="text-xs text-sky-400 mt-1 flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {q.projectType || "تجهيز"} (
                        {q.customerType === "WHOLESALE"
                          ? "سعر تجار"
                          : q.customerType === "COMMERCIAL_PROJECT"
                          ? "مشروع كافيه/شقة"
                          : "قطاعي"}
                        )
                      </div>
                    </td>

                    <td className="py-4 px-5">
                      <div className="space-y-1 max-w-xs">
                        {q.items.map((it) => (
                          <div
                            key={it.id}
                            className="text-xs bg-slate-950/60 px-2.5 py-1 rounded border border-slate-800 flex items-center justify-between gap-2"
                          >
                            <span className="text-slate-300 truncate">{it.product.name}</span>
                            <span className="text-sky-400 font-mono font-bold">×{it.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </td>

                    <td className="py-4 px-5">
                      <div className="font-bold text-base text-white font-mono">
                        {q.finalTotal.toLocaleString()}{" "}
                        <span className="text-xs font-normal text-slate-400">ج.م</span>
                      </div>
                      {q.discount > 0 && (
                        <div className="text-xs text-emerald-400 mt-0.5">
                          خصم الباقة: -{q.discount.toLocaleString()} ج.م
                        </div>
                      )}
                    </td>

                    <td className="py-4 px-5">
                      {q.status === "CONVERTED" ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <Check className="w-3.5 h-3.5" />
                          تم التحويل لأوردر
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <Clock className="w-3.5 h-3.5" />
                          بانتظار العميل
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {/* زر طباعة ومعاينة المقايسة الرسمية */}
                        <a
                          href={`${API_BASE_URL}/quotations/${q.id}/html`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold border border-slate-700 transition-all"
                          title="عرض وطباعة المقايسة PDF"
                        >
                          <Printer className="w-3.5 h-3.5 text-sky-400" />
                          طباعة PDF
                        </a>

                        {/* زر التحويل لأوردر فعلي */}
                        {q.status !== "CONVERTED" && (
                          <button
                            onClick={() => handleConvertQuotation(q)}
                            disabled={convertingId === q.id}
                            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-md shadow-emerald-900/30 transition-all active:scale-95 disabled:opacity-50"
                          >
                            {convertingId === q.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CheckCircle className="w-3.5 h-3.5" />
                            )}
                            تحويل لأوردر
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* نافذة إنشاء مقايسة جديدة (Modal) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-sky-500/10 text-sky-400 rounded-xl">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">إنشاء مقايسة / عرض سعر تجهيز أجهزة</h3>
                  <p className="text-xs text-slate-400 mt-0.5">MG Group - معرض مصر الجديدة 13 جسر السويس</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateQuotation} className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">اسم العميل / المنشأة *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: كافيه رويال / أستاذ أحمد"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">رقم الهاتف (واتساب) *</label>
                  <input
                    type="tel"
                    required
                    placeholder="01012345678"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">نظام التسعير (B2B vs B2C)</label>
                  <select
                    value={customerType}
                    onChange={(e) => setCustomerType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="COMMERCIAL_PROJECT">تجهيز كافيهات ومشاريع (أسعار الجملة + باقات)</option>
                    <option value="WHOLESALE">تاجر جملة وموزع (B2B Wholesale)</option>
                    <option value="RETAIL">عميل قطاعي / شقة عروسة (B2C Retail)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">نوع المشروع / النشاط</label>
                  <input
                    type="text"
                    value={projectType}
                    onChange={(e) => setProjectType(e.target.value)}
                    placeholder="مثال: تجهيز كافيه، شقة عروسة، مطعم..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* اختيار الأجهزة والكميات */}
              <div className="border border-slate-800 rounded-xl p-4 bg-slate-950/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">الأجهزة المطلوبة في المقايسة:</span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    إضافة جهاز آخر
                  </button>
                </div>

                {selectedItems.map((item, index) => {
                  const prod = products.find((p) => p.id === item.productId);
                  const price =
                    customerType === "WHOLESALE" || customerType === "COMMERCIAL_PROJECT" || item.quantity >= 3
                      ? prod?.wholesalePrice || prod?.price || 0
                      : prod?.price || 0;

                  return (
                    <div key={index} className="flex items-center gap-2">
                      <select
                        value={item.productId}
                        onChange={(e) => handleItemChange(index, "productId", Number(e.target.value))}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} — قطاعي: {p.price.toLocaleString()} ج.م / جملة:{" "}
                            {p.wholesalePrice ? p.wholesalePrice.toLocaleString() : p.price} ج.م (ضمان {p.warrantyMonths} شهر)
                          </option>
                        ))}
                      </select>

                      <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1">
                        <span className="text-[11px] text-slate-400">كمية:</span>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            handleItemChange(index, "quantity", Math.max(1, Number(e.target.value)))
                          }
                          className="w-12 bg-transparent text-center font-mono font-bold text-xs text-white focus:outline-none"
                        />
                      </div>

                      <div className="w-24 text-left font-mono font-bold text-xs text-sky-400">
                        {(price * item.quantity).toLocaleString()} ج.م
                      </div>

                      {selectedItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* الخصم والإجمالي */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    خصم خاص للباقة / المشروع (ج.م)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    مدة صلاحية المقايسة (أيام)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={validDays}
                    onChange={(e) => setValidDays(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* ملخص الحساب */}
              <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">الإجمالي قبل الخصم: {formTotal.toLocaleString()} ج.م</div>
                  <div className="text-base font-bold text-white mt-0.5">
                    الصافي بعد الخصم: <span className="text-sky-400 font-mono">{formFinalTotal.toLocaleString()} ج.م</span>
                  </div>
                </div>
                <div className="text-xs text-sky-400 font-medium text-left">
                  ✅ تشمل الضمان الرسمي وتوريد MG Group
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-sky-600/30 transition-all disabled:opacity-50"
                >
                  {submitting ? "جاري الحفظ..." : "حفظ وإصدار المقايسة"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
