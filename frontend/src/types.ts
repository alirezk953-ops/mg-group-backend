export interface User {
  id: number;
  name: string;
  phone: string;
  address: string;
  customerType?: "RETAIL" | "WHOLESALE" | "COMMERCIAL_PROJECT";
  businessName?: string | null;
}

export interface Product {
  id: number;
  name: string;
  category?: string;
  price: number;
  wholesalePrice?: number | null;
  costPrice?: number | null;
  stock: number;
  showroomStock?: number;
  warehouseStock?: number;
  minStockThreshold?: number;
  warrantyMonths?: number;
}

export interface OrderItem {
  id: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  priceType?: "RETAIL" | "WHOLESALE";
  product: Product;
}

export interface Order {
  id: number;
  orderCode: string;
  userId: number;
  orderType?: "RETAIL" | "WHOLESALE" | "COMMERCIAL_PROJECT";
  fulfillmentSource?: "SHOWROOM" | "WAREHOUSE";
  total: number;
  profitMargin?: number;
  status: "Pending" | "Completed" | "Shipping";
  createdAt: string;
  updatedAt: string;
  user: User;
  items: OrderItem[];
  warranties?: WarrantyRecord[];
}

export interface Staff {
  id: number;
  username: string;
  name: string;
  role: "ADMIN" | "SUPPORT" | "EMPLOYEE" | "DELIVERY";
  createdAt: string;
}

export interface Expense {
  id: number;
  amount: number;
  category: string;
  notes?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CashDrawerSummary {
  totalCollectedCash: number;
  totalExpenses: number;
  netCash: number;
  totalProfitMargin?: number;
  todayProfitMargin?: number;
  todayCollectedCash: number;
  todayExpenses: number;
  todayNetCash: number;
  completedOrdersCount: number;
  expensesCount: number;
  categoryBreakdown: Record<string, number>;
}

export interface CustomerRecord {
  id: number;
  name: string;
  phone: string;
  address: string;
  customerType?: string;
  businessName?: string | null;
  totalOrders: number;
  completedOrders: number;
  totalSpent: number;
  isVip: boolean;
  lastOrderDate: string | null;
  createdAt: string;
}

export interface QuotationItem {
  id: number;
  quotationId: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  priceType: string;
  product: Product;
}

export interface Quotation {
  id: number;
  quoteCode: string;
  customerName: string;
  customerPhone: string;
  customerType: "RETAIL" | "WHOLESALE" | "COMMERCIAL_PROJECT";
  projectType?: string;
  status: "PENDING" | "APPROVED" | "CONVERTED" | "CANCELLED";
  total: number;
  discount: number;
  finalTotal: number;
  validDays: number;
  notes?: string | null;
  createdAt: string;
  items: QuotationItem[];
}

export interface MaintenanceTicket {
  id: number;
  warrantyId: number;
  issueDescription: string;
  actionTaken?: string | null;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  createdAt: string;
  updatedAt: string;
}

export interface WarrantyRecord {
  id: number;
  warrantyCode: string;
  orderId?: number;
  customerName: string;
  customerPhone: string;
  productName: string;
  serialNumber?: string | null;
  startDate: string;
  endDate: string;
  status: "ACTIVE" | "EXPIRED" | "CLAIMED";
  tickets?: MaintenanceTicket[];
  createdAt: string;
}
