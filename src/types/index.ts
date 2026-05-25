export interface OrderItem {
  model: string;
  color: string;
  size: string;
  quantity: number;
  productCost: number;
  sellingPrice: number;
  source?: 2 | 3;
}

export interface Order {
  id: string;
  date: string;
  customerName: string;
  phone: string;
  orderNumber: string;
  wilaya: string;
  commune: string;
  place?: string;
  deliveryPrice: number;
  total: number;
  paidAmount: number;
  discount: number;
  deliveryCompany: string;
  deliveryType: string;
  isSwap?: boolean;
  swapRef?: string;
  freeDelivery?: boolean;
  status: 'pending' | 'delivered' | 'returned';
  returnCost: number;
  notes: string;
  returnDate?: string;
  source: 1 | 2 | 3;
  items: OrderItem[];
  agent?: string;
}

export interface ProductColor {
  name: string;
  quantity: number;
}

export interface Product {
  id: string;
  name: string;
  wholesaleCostPrice: number;
  wholesalePercentage: number;
  wholesalePrice: number;
  retailCostPrice: number;
  retailPercentage: number;
  retailPrice: number;
  colors: ProductColor[];
}

export interface InventoryItem {
  model: string;
  colors: Record<string, number>;
}

export interface SubInventoryItem {
  model: string;
  color: string;
  size: string;
  quantity: number;
}

export interface ReturnInventoryItem {
  orderNumber?: string;
  model: string;
  color: string;
  size: string;
  quantity: number;
}

export interface WorkerExpense {
  description: string;
  amount: number;
  date: string;
  notes?: string;
}

export interface WorkerExpenseEntry {
  id: string;
  workerCode: string;
  workerName: string;
  amount: number;
  description: string;
  notes: string;
  date: string;
  month: string;
  year: number;
}

export interface AdExpense {
  id: string;
  amountUsd: number;
  exchangeRate: number;
  amountDzd: number;
  startDate: string;
  endDate: string;
  month: string;
  year: number;
}

export interface Worker {
  id: string;
  code: string;
  name: string;
  phone: string;
  salary: number;
  dailyHours: number;
  overtimeHours: number;
  overtimeRate: number;
  missingHours: number;
  absenceDays: number;
  expenses: WorkerExpense[];
  payPeriodStart: string;
  payPeriodEnd: string;
  paidRestDays?: number;
  paid?: boolean;
  paymentAmount?: number;
  paymentDate?: string;
  month: string;
  year: number;
}

export interface MonthlyProfit {
  month: string;
  year: number;
  totalSales: number;
  totalCost: number;
  netProfit: number;
  profitMargin: number;
  totalOrders: number;
  deliveredOrders: number;
  returnedOrders: number;
  totalReturnCost: number;
  workerCount: number;
  totalWorkerSalaries: number;
  adBudget: number;
  adBudgetUsd: number;
  exchangeRate: number;
  startDate: string;
  endDate: string;
  days: number;
  budgetDzd: number;
  dailyCost: number;
  finalCalculation: number;
  returnCostTotal: number;
  adBudgetTotal: number;
  workerSalariesTotal: number;
  finalProfit: number;
  finalStatus: 'profit' | 'loss';
  topWilayas: { name: string; count: number; percentage: number }[];
  topModels: { name: string; count: number; percentage: number }[];
  topColors: { name: string; count: number; percentage: number }[];
  topSizes: { name: string; count: number; percentage: number }[];
}

export interface YearlySummary {
  year: number;
  months: Record<string, { result: 'profit' | 'loss'; profit: number }>;
  totalProfit: number;
  topWilayas: { name: string; count: number; percentage: number }[];
  topModels: { name: string; count: number; percentage: number }[];
  topColors: { name: string; count: number; percentage: number }[];
  topSizes: { name: string; count: number; percentage: number }[];
}

export interface Notification {
  id: string;
  type: 'low_stock' | 'insufficient' | 'returned' | 'delivery' | 'profit' | 'monthly';
  message: string;
  date: string;
  read: boolean;
}

export interface AppSettings {
  password: string;
  colors: string[];
}

export interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  logo: string;
}

export interface PurchaseItem {
  productName: string;
  color: string;
  size: string;
  quantity: number;
  costPrice: number;
  wholesalePct?: number;
  wholesalePrice?: number;
  retailPct?: number;
  retailPrice?: number;
  targetTable: 1 | 2;
}

export interface PurchaseOrder {
  id: string;
  invoiceNumber: string;
  supplierName: string;
  date: string;
  items: PurchaseItem[];
  total: number;
  paymentAmount?: number;
  payments?: SupplierPayment[];
  editHistory?: string[];
}

export interface SupplierPayment {
  id: string;
  date: string;
  amount: number;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  address: string;
  email: string;
  dateAdded: string;
  payments: SupplierPayment[];
}

export type Language = 'ar' | 'fr' | 'en';

export interface FixedExpense {
  id: string;
  name: string;
  amount: number;
  date?: string;
}

export interface VariableExpense {
  id: string;
  name: string;
  amount: number;
  date: string;
  month: string;
  year: number;
}

export interface TrashItem {
  deletedAt: string;
  order?: Order;
  purchaseOrder?: PurchaseOrder;
  worker?: Worker;
}

export interface TranslationMap {
  [key: string]: string;
}

export interface Translations {
  ar: TranslationMap;
  fr: TranslationMap;
  en: TranslationMap;
}
