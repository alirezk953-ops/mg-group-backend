import { useEffect, useState } from "react";
import type { Order, Product, Staff } from "./types";
import Sidebar, { type NavTab } from "./Sidebar";
import TopBar from "./TopBar";
import DashboardOverview from "./DashboardOverview";
import OrdersTab from "./OrdersTab";
import ProductsTab from "./ProductsTab";
import WhatsAppTab from "./WhatsAppTab";
import InvoicesTab from "./InvoicesTab";
import StaffTab from "./StaffTab";
import LoginPage from "./LoginPage";
import DeliveryPortal from "./DeliveryPortal";
import ExpensesTab from "./ExpensesTab";
import CustomersTab from "./CustomersTab";
import WarrantyTab from "./WarrantyTab";

const API_BASE_URL = "http://localhost:3000/api";

export default function App() {
  const [currentUser, setCurrentUser] = useState<Staff | null>(() => {
    const saved = localStorage.getItem("erp_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [activeTab, setActiveTab] = useState<NavTab>("dashboard");
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [previewDelivery, setPreviewDelivery] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("erp_theme") as "dark" | "light") || "dark";
  });

  const isDark = theme === "dark";

  const handleToggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("erp_theme", next);
  };

  const handleLogout = () => {
    localStorage.removeItem("erp_token");
    localStorage.removeItem("erp_user");
    setCurrentUser(null);
  };

  const handleLoginSuccess = (user: Staff) => {
    setCurrentUser(user);
    refreshAll();
  };

  // جلب الطلبات
  const fetchOrders = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/orders`);
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      }
    } catch (error) {
      console.error("خطأ في الاتصال بالـ Backend لجلب الطلبات:", error);
    }
  };

  // جلب المنتجات
  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/products`);
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error("خطأ في الاتصال بالـ Backend لجلب المنتجات:", error);
    }
  };

  const refreshAll = async () => {
    setLoading(true);
    await Promise.all([fetchOrders(), fetchProducts()]);
    setLoading(false);
  };

  useEffect(() => {
    refreshAll();
    const interval = setInterval(() => {
      fetchOrders();
      fetchProducts();
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  // تغيير حالة الأوردر
  const toggleOrderStatus = async (order: Order) => {
    const newStatus = order.status === "Pending" ? "Completed" : "Pending";
    setUpdatingId(order.id);
    try {
      const response = await fetch(`${API_BASE_URL}/orders/${order.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setOrders((prev) =>
          prev.map((o) => (o.id === order.id ? { ...o, status: newStatus } : o))
        );
      }
    } catch (error) {
      console.error("خطأ أثناء تحديث حالة الطلب:", error);
    } finally {
      setUpdatingId(null);
    }
  };

  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // وضع بوابة المندوبين
  if (currentUser.role === "DELIVERY" || previewDelivery) {
    return (
      <DeliveryPortal
        currentUser={currentUser}
        orders={orders}
        onRefresh={refreshAll}
        onLogout={handleLogout}
        onBackToAdmin={currentUser.role === "ADMIN" ? () => setPreviewDelivery(false) : undefined}
      />
    );
  }

  const lowStockCount = products.filter((p) => p.stock <= (p.minStockThreshold || 3)).length;

  return (
    <div
      className={`min-h-screen flex flex-row transition-colors duration-200 ${
        isDark ? "bg-slate-950 text-slate-100" : "bg-slate-200/90 text-slate-900"
      }`}
      dir="rtl"
    >
      {/* 1. Sidebar الجانبي الفخم */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onLogout={handleLogout}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        theme={theme}
        orderCount={orders.length}
        lowStockCount={lowStockCount}
      />

      {/* 2. منطقة المحتوى الرئيسية */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* TopBar العلوي النظيف */}
        <TopBar
          theme={theme}
          onToggleTheme={handleToggleTheme}
          currentUser={currentUser}
          onRefresh={refreshAll}
          loading={loading}
          onToggleDeliveryPreview={() => setPreviewDelivery(!previewDelivery)}
          previewDelivery={previewDelivery}
        />

        {/* جسم الصفحة الرئيسي بحسب التبويب النشط */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          {activeTab === "dashboard" && (
            <DashboardOverview
              orders={orders}
              products={products}
              currentUser={currentUser}
              onNavigate={(tab) => setActiveTab(tab)}
              theme={theme}
            />
          )}

          {activeTab === "orders" && (
            <OrdersTab
              orders={orders}
              products={products}
              currentUser={currentUser}
              loading={loading}
              onRefresh={refreshAll}
              onToggleStatus={toggleOrderStatus}
              updatingId={updatingId}
              theme={theme}
            />
          )}

          {activeTab === "products" && (
            <ProductsTab products={products} onRefresh={fetchProducts} />
          )}

          {activeTab === "expenses" && <ExpensesTab />}

          {activeTab === "warranty" && <WarrantyTab theme={theme} />}

          {activeTab === "customers" && <CustomersTab />}

          {activeTab === "whatsapp" && <WhatsAppTab />}

          {activeTab === "invoices" && (
            <InvoicesTab orders={orders} onRefresh={refreshAll} />
          )}

          {activeTab === "staff" && (
            <StaffTab currentRole={currentUser.role} />
          )}
        </main>
      </div>
    </div>
  );
}
