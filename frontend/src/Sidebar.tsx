import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Wallet,
  ShieldCheck,
  Users,
  MessageSquare,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut
} from "lucide-react";
import type { Staff } from "./types";

export type NavTab =
  | "dashboard"
  | "orders"
  | "products"
  | "expenses"
  | "warranty"
  | "customers"
  | "whatsapp"
  | "invoices"
  | "staff";

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  currentUser: Staff;
  onLogout: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  theme: "dark" | "light";
  orderCount?: number;
  lowStockCount?: number;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  currentUser,
  onLogout,
  isCollapsed,
  setIsCollapsed,
  theme,
  orderCount = 0,
  lowStockCount = 0,
}: SidebarProps) {
  const isDark = theme === "dark";

  const navItems = [
    {
      id: "dashboard" as NavTab,
      label: "الرئيسية والإحصائيات",
      subtitle: "نظرة عامة ومؤشرات حية",
      icon: LayoutDashboard,
      color: "text-indigo-500",
      activeBg: isDark ? "bg-indigo-600/20 text-indigo-300 border-indigo-500/40" : "bg-white text-indigo-900 border-slate-300 shadow-sm",
    },
    {
      id: "orders" as NavTab,
      label: "الطلبات والمقايسات",
      subtitle: "المبيعات وباقات الكافيهات",
      icon: ShoppingCart,
      color: "text-sky-500",
      badge: orderCount > 0 ? orderCount : undefined,
      activeBg: isDark ? "bg-sky-600/20 text-sky-300 border-sky-500/40" : "bg-white text-sky-900 border-slate-300 shadow-sm",
    },
    {
      id: "products" as NavTab,
      label: "إدارة المخزون والأسعار",
      subtitle: "معرض جسر السويس والمخزن",
      icon: Package,
      color: "text-amber-500",
      badge: lowStockCount > 0 ? "تنبيه" : undefined,
      badgeColor: isDark ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-amber-100 text-amber-800 border border-amber-300",
      activeBg: isDark ? "bg-amber-600/20 text-amber-300 border-amber-500/40" : "bg-white text-amber-900 border-slate-300 shadow-sm",
    },
    {
      id: "expenses" as NavTab,
      label: "الخزنة والمصروفات",
      subtitle: "التدفق النقدي وصافي الأرباح",
      icon: Wallet,
      color: "text-emerald-500",
      activeBg: isDark ? "bg-emerald-600/20 text-emerald-300 border-emerald-500/40" : "bg-white text-emerald-900 border-slate-300 shadow-sm",
    },
    {
      id: "warranty" as NavTab,
      label: "الضمان وتذاكر الصيانة",
      subtitle: "خدمة ما بعد البيع والاستبدال",
      icon: ShieldCheck,
      color: "text-purple-500",
      activeBg: isDark ? "bg-purple-600/20 text-purple-300 border-purple-500/40" : "bg-white text-purple-900 border-slate-300 shadow-sm",
    },
    {
      id: "customers" as NavTab,
      label: "سجل العملاء والتجار (CRM)",
      subtitle: "بيانات عملاء الجملة والقطاعي",
      icon: Users,
      color: "text-blue-500",
      activeBg: isDark ? "bg-blue-600/20 text-blue-300 border-blue-500/40" : "bg-white text-blue-900 border-slate-300 shadow-sm",
    },
    {
      id: "whatsapp" as NavTab,
      label: "ربط الواتساب الذكي",
      subtitle: "بوت Baileys و Gemini AI",
      icon: MessageSquare,
      color: "text-emerald-500",
      activeBg: isDark ? "bg-emerald-600/20 text-emerald-300 border-emerald-500/40" : "bg-white text-emerald-900 border-slate-300 shadow-sm",
    },
    {
      id: "invoices" as NavTab,
      label: "الفواتير والـ PDF",
      subtitle: "طباعة الفواتير الرسمية",
      icon: FileText,
      color: "text-teal-500",
      activeBg: isDark ? "bg-teal-600/20 text-teal-300 border-teal-500/40" : "bg-white text-teal-900 border-slate-300 shadow-sm",
    },
  ];

  if (currentUser.role === "ADMIN") {
    navItems.push({
      id: "staff" as NavTab,
      label: "الصلاحيات والموظفين",
      subtitle: "إدارة الفريق والصلاحيات",
      icon: Settings,
      color: "text-rose-500",
      activeBg: isDark ? "bg-rose-600/20 text-rose-300 border-rose-500/40" : "bg-white text-rose-900 border-slate-300 shadow-sm",
    });
  }

  return (
    <aside
      className={`relative flex flex-col justify-between transition-all duration-300 select-none z-30 ${
        isCollapsed ? "w-20" : "w-64"
      } ${
        isDark
          ? "bg-slate-950/95 border-l border-slate-800/80 text-slate-100 backdrop-blur-xl"
          : "bg-slate-200/90 border-l border-slate-300 text-slate-800 shadow-lg"
      }`}
    >
      {/* Brand Header */}
      <div>
        <div className={`p-4 border-b ${isDark ? "border-slate-800/80" : "border-slate-300"} flex items-center justify-between`}>
          {!isCollapsed && (
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-sky-500 to-amber-400 p-[1.5px] shadow-md flex-shrink-0">
                <div className={`w-full h-full rounded-2xl flex items-center justify-center font-black text-sm tracking-tight ${
                  isDark ? "bg-slate-950 text-white" : "bg-slate-100 text-indigo-950"
                }`}>
                  MG
                </div>
              </div>
              <div className="truncate">
                <div className="flex items-center gap-1.5">
                  <h1 className={`font-extrabold text-base tracking-tight ${
                    isDark ? "bg-gradient-to-l from-indigo-200 via-sky-300 to-white bg-clip-text text-transparent" : "text-slate-900"
                  }`}>
                    MG GROUP
                  </h1>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                    isDark ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "bg-amber-100 text-amber-800 border border-amber-300"
                  }`}>
                    PRO
                  </span>
                </div>
                <p className={`text-[10px] truncate mt-0.5 ${isDark ? "text-slate-400" : "text-slate-600 font-semibold"}`}>
                  معرض مصر الجديدة 13 جسر السويس
                </p>
              </div>
            </div>
          )}

          {isCollapsed && (
            <div className="w-10 h-10 mx-auto rounded-2xl bg-gradient-to-tr from-indigo-600 via-sky-500 to-amber-400 p-[1.5px] shadow-md flex items-center justify-center">
              <div className={`w-full h-full rounded-2xl flex items-center justify-center font-black text-sm ${
                isDark ? "bg-slate-950 text-white" : "bg-slate-100 text-indigo-950"
              }`}>
                MG
              </div>
            </div>
          )}

          {/* Toggle Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`p-1.5 rounded-xl border transition-all ${
              isDark
                ? "bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border-slate-800"
                : "bg-slate-100 hover:bg-slate-300 text-slate-700 border-slate-300 shadow-sm"
            }`}
            title={isCollapsed ? "توسيع القائمة" : "تصغير القائمة"}
          >
            {isCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Links */}
        <div className="p-3 space-y-1.5 overflow-y-auto max-h-[calc(100vh-170px)]">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all relative group ${
                  isActive
                    ? `${item.activeBg} shadow-sm border`
                    : isDark
                    ? "text-slate-400 hover:text-slate-100 hover:bg-slate-900/60"
                    : "text-slate-700 hover:text-slate-950 hover:bg-slate-300/60"
                } ${isCollapsed ? "justify-center px-2" : ""}`}
                title={isCollapsed ? item.label : undefined}
              >
                {isActive && (
                  <span className="absolute right-0 top-2 bottom-2 w-1 rounded-l-full bg-gradient-to-b from-indigo-500 to-sky-400"></span>
                )}

                <div className={`p-1.5 rounded-xl transition-colors ${
                  isActive
                    ? isDark ? "bg-slate-900/80" : "bg-slate-100 shadow-sm"
                    : isDark ? "bg-slate-900/40 group-hover:bg-slate-900" : "bg-slate-300/50 group-hover:bg-slate-300"
                }`}>
                  <Icon className={`w-4 h-4 ${isActive ? item.color : isDark ? "text-slate-400" : "text-slate-600"}`} />
                </div>

                {!isCollapsed && (
                  <div className="flex-1 text-right truncate">
                    <div className="truncate leading-tight font-bold">{item.label}</div>
                    <div className={`text-[10px] truncate font-medium mt-0.5 ${
                      isActive ? (isDark ? "text-slate-300" : "text-slate-700 font-bold") : isDark ? "text-slate-500" : "text-slate-600"
                    }`}>
                      {item.subtitle}
                    </div>
                  </div>
                )}

                {!isCollapsed && item.badge && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      item.badgeColor || (isDark ? "bg-sky-500/20 text-sky-400 border border-sky-500/30" : "bg-sky-100 text-sky-800 border border-sky-300")
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* User Card & Logout */}
      <div className={`p-3 border-t ${isDark ? "border-slate-800/80 bg-slate-950/80" : "border-slate-300 bg-slate-200/90"}`}>
        {!isCollapsed ? (
          <div className={`flex items-center justify-between gap-2 p-2 rounded-2xl border ${
            isDark ? "bg-slate-900/40 border-slate-800/60" : "bg-slate-100 border-slate-300 shadow-sm"
          }`}>
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-sky-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-md">
                {currentUser.name.charAt(0)}
              </div>
              <div className="truncate">
                <div className={`text-xs font-extrabold truncate flex items-center gap-1.5 ${
                  isDark ? "text-white" : "text-slate-900"
                }`}>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  {currentUser.name}
                </div>
                <div className={`text-[10px] font-mono font-bold ${
                  isDark ? "text-indigo-400" : "text-indigo-700"
                }`}>
                  {currentUser.role === "ADMIN" ? "مدير النظام (Admin)" : currentUser.role}
                </div>
              </div>
            </div>

            <button
              onClick={onLogout}
              className={`p-1.5 rounded-xl transition-colors ${
                isDark ? "text-slate-400 hover:text-rose-400 hover:bg-rose-500/10" : "text-slate-600 hover:text-rose-600 hover:bg-rose-100"
              }`}
              title="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onLogout}
            className={`w-full flex items-center justify-center p-2.5 rounded-xl transition-colors ${
              isDark ? "text-slate-400 hover:text-rose-400 hover:bg-rose-500/10" : "text-slate-600 hover:text-rose-600 hover:bg-rose-100"
            }`}
            title="تسجيل الخروج"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
}
