import React, { useState } from "react";
import { User, KeyRound, LogIn, AlertCircle, ShoppingBag } from "lucide-react";
import type { Staff } from "./types";

interface LoginPageProps {
  onLoginSuccess: (user: Staff, token: string) => void;
}

const API_BASE_URL = "http://localhost:3000/api";

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !pin.trim()) {
      setError("يرجى إدخال اسم المستخدم ورمز الدخول (PIN)");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          pin: pin.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.setItem("erp_token", data.token);
        localStorage.setItem("erp_user", JSON.stringify(data.user));
        onLoginSuccess(data.user, data.token);
      } else {
        setError(data.error || "بيانات الدخول غير صحيحة");
      }
    } catch (err: any) {
      setError("خطأ في الاتصال بالخادم: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // أزرار الدخول السريع للتجربة
  const quickLogin = (u: string, p: string) => {
    setUsername(u);
    setPin(p);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4" dir="rtl">
      {/* خلفية جمالية */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md bg-slate-900/80 border border-slate-800 p-8 rounded-3xl backdrop-blur-xl shadow-2xl space-y-6">
        {/* اللوجو والعنوان */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">تسجيل الدخول للنظام</h1>
            <p className="text-xs text-slate-400 mt-1">لوحة التحكم المركزية للتجارة وإدارة الطلبات الذكية</p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-2xl text-xs text-red-400 flex items-center gap-2 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* نموذج تسجيل الدخول */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              اسم المستخدم (Username)
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5" />
              <input
                type="text"
                placeholder="مثال: admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-10 pl-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              رمز الدخول السري (PIN / Password)
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5" />
              <input
                type="password"
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-10 pl-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-indigo-600/30 mt-2"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                دخول إلى لوحة التحكم
              </>
            )}
          </button>
        </form>

        {/* حسابات تجريبية سريعة بنقرة واحدة */}
        <div className="pt-4 border-t border-slate-800/80 space-y-2">
          <span className="text-[11px] text-slate-500 block text-center">أو اختر حساباً تجريبياً للدخول بنقرة واحدة:</span>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => quickLogin("admin", "1234")}
              className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-center text-xs font-semibold text-indigo-400 transition-colors"
            >
              👑 المدير (Admin)
            </button>
            <button
              type="button"
              onClick={() => quickLogin("employee", "5678")}
              className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-center text-xs font-semibold text-emerald-400 transition-colors"
            >
              💼 الموظف
            </button>
            <button
              type="button"
              onClick={() => quickLogin("delivery", "0000")}
              className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-center text-xs font-semibold text-blue-400 transition-colors"
            >
              🛵 الدليفري
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
