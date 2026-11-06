import { useState, useEffect } from "react";
import {
  Sun,
  Moon,
  Maximize2,
  Minimize2,
  RefreshCw,
  Truck,
  Activity,
  MessageSquare,
  Sparkles
} from "lucide-react";
import type { Staff } from "./types";

interface TopBarProps {
  theme: "dark" | "light";
  onToggleTheme: () => void;
  currentUser: Staff;
  onRefresh: () => void;
  loading: boolean;
  onToggleDeliveryPreview?: () => void;
  previewDelivery?: boolean;
}

const API_BASE_URL = "http://localhost:3000/api";

export default function TopBar({
  theme,
  onToggleTheme,
  currentUser,
  onRefresh,
  loading,
  onToggleDeliveryPreview,
  previewDelivery = false,
}: TopBarProps) {
  const isDark = theme === "dark";
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [waConnected, setWaConnected] = useState(false);
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("ar-EG", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZone: "Africa/Cairo",
        })
      );
    };
    updateClock();
    const clockInterval = setInterval(updateClock, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  useEffect(() => {
    const checkWa = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/whatsapp/status`);
        if (res.ok) {
          const data = await res.json();
          setWaConnected(Boolean(data.isConnected));
        }
      } catch {
        setWaConnected(false);
      }
    };
    checkWa();
    const interval = setInterval(checkWa, 6000);
    return () => clearInterval(interval);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <header
      className={`h-16 px-6 border-b flex items-center justify-between transition-colors z-20 ${
        isDark
          ? "bg-slate-950/80 border-slate-800/80 backdrop-blur-md text-white"
          : "bg-slate-200/90 border-slate-300/90 backdrop-blur-md text-slate-900 shadow-sm"
      }`}
    >
      {/* جهة اليمين: عنوان الشركة وهوية المعرض */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-xl border ${
            isDark
              ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30"
              : "bg-indigo-100 text-indigo-700 border-indigo-300"
          }`}>
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-black tracking-tight flex items-center gap-2">
              <span className={isDark ? "bg-gradient-to-l from-indigo-400 via-sky-300 to-indigo-100 bg-clip-text text-transparent" : "text-indigo-900 font-extrabold"}>
                MG Group ERP
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 font-bold">
                وكيل معتمد
              </span>
            </div>
            <div className={`text-[10px] ${isDark ? "text-slate-400" : "text-slate-600 font-semibold"}`}>
              13 جسر السويس، مصر الجديدة | مبيعات: +20 12 21584153
            </div>
          </div>
        </div>

        {/* حالة الباك إند والواتساب */}
        <div className="hidden md:flex items-center gap-2 mr-2">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-bold ${
            isDark
              ? "bg-slate-900/60 border-slate-800 text-emerald-400"
              : "bg-slate-100 border-slate-300 text-emerald-700"
          }`}>
            <Activity className="w-3 h-3 text-emerald-500 animate-pulse" />
            <span>الباك إند: متصل</span>
          </div>

          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-bold transition-all ${
              waConnected
                ? isDark ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-emerald-100 border-emerald-300 text-emerald-800"
                : isDark ? "bg-amber-500/10 border-amber-500/30 text-amber-400" : "bg-amber-100 border-amber-300 text-amber-800"
            }`}
          >
            <MessageSquare className="w-3 h-3" />
            <span>بوت الواتساب: {waConnected ? "شغال ومقترن ✅" : "بانتظار الاقتران ⏳"}</span>
          </div>
        </div>
      </div>

      {/* جهة اليسار: التوقيت، الأدوات، تبديل الثيم، والـ Fullscreen */}
      <div className="flex items-center gap-2.5">
        {/* توقيت القاهرة الحي */}
        <div className={`hidden lg:flex items-center px-3 py-1 rounded-xl border font-mono text-xs font-bold ${
          isDark
            ? "bg-slate-900/50 border-slate-800 text-slate-300"
            : "bg-slate-100 border-slate-300 text-slate-800"
        }`} dir="ltr">
          ⏱️ {currentTime}
        </div>

        {/* زر معاينة بوابة المندوبين (للآدمن) */}
        {currentUser.role === "ADMIN" && onToggleDeliveryPreview && (
          <button
            onClick={onToggleDeliveryPreview}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              previewDelivery
                ? "bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-900/30"
                : isDark
                ? "bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800"
                : "bg-slate-100 hover:bg-slate-300 text-slate-800 border-slate-300"
            }`}
            title="تبديل بوابة مناديب التوصيل"
          >
            <Truck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {previewDelivery ? "العودة كمدير" : "بوابة المناديب"}
            </span>
          </button>
        )}

        {/* زر التحديث المباشر */}
        <button
          onClick={onRefresh}
          disabled={loading}
          className={`p-2 rounded-xl border transition-all disabled:opacity-50 ${
            isDark
              ? "bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800"
              : "bg-slate-100 hover:bg-slate-300 text-slate-800 border-slate-300 shadow-sm"
          }`}
          title="تحديث البيانات فوراً"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-500" : ""}`} />
        </button>

        {/* زر تبديل الثيم: Dark Titanium vs Modern Light */}
        <button
          onClick={onToggleTheme}
          className={`p-2 rounded-xl border transition-all ${
            isDark
              ? "bg-slate-900 hover:bg-slate-800 text-amber-300 border-slate-800"
              : "bg-slate-100 hover:bg-slate-300 text-indigo-700 border-slate-300 shadow-sm"
          }`}
          title={isDark ? "التبديل إلى الوضع السلفر المريح (Soft Silver)" : "التبديل إلى الوضع الداكن (Dark Titanium)"}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* زر Fullscreen */}
        <button
          onClick={toggleFullscreen}
          className={`p-2 rounded-xl border transition-all hidden sm:flex ${
            isDark
              ? "bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800"
              : "bg-slate-100 hover:bg-slate-300 text-slate-800 border-slate-300 shadow-sm"
          }`}
          title={isFullscreen ? "الخروج من الشاشة الكاملة" : "ملء الشاشة"}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
}
