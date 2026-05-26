import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Order, InventoryItem, SubInventoryItem, ReturnInventoryItem, Worker, MonthlyProfit, YearlySummary, Notification, AppSettings, Language, Product, ProductColor, CompanyInfo, PurchaseOrder, Supplier, TrashItem, FixedExpense, VariableExpense, WorkerExpenseEntry, AdExpense } from '../types';
import { defaultColorList } from '../i18n/translations';

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  currentUser: { email: string; name: string } | null;
  login: (email: string, pwd: string) => boolean;
  register: (name: string, email: string, pwd: string) => boolean;
  logout: () => void;
  orders: Order[];
  setOrders: (orders: Order[]) => void;
  addOrder: (order: Order) => void;
  updateOrder: (id: string, order: Partial<Order>) => void;
  deleteOrder: (id: string) => void;
  getNextOrderNumber: () => string;
  inventory: InventoryItem[];
  setInventory: (inventory: InventoryItem[]) => void;
  subInventory: SubInventoryItem[];
  setSubInventory: (inv: SubInventoryItem[]) => void;
  returnInventory: ReturnInventoryItem[];
  setReturnInventory: (inv: ReturnInventoryItem[]) => void;
  addToReturnInventory: (model: string, color: string, size: string, quantity: number, orderNumber?: string) => void;
  removeFromReturnInventory: (model: string, color: string, size: string, quantity: number, orderNumber?: string) => void;
  updateSubStock: (model: string, color: string, size: string, quantity: number, operation: 'reduce' | 'restore') => void;
  getSubStock: (model: string, color: string, size: string) => number;
  products: Product[];
  setProducts: (p: Product[]) => void;
  addProduct: (p: Product) => void;
  updateProduct: (id: string, p: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  companyInfo: CompanyInfo;
  setCompanyInfo: (c: CompanyInfo) => void;
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'date' | 'read'>) => void;
  markAllNotificationsRead: () => void;
  settings: AppSettings;
  updateSettings: (s: Partial<AppSettings>) => void;
  password: string;
  workers: Worker[];
  addWorker: (worker: Worker) => void;
  updateWorker: (id: string, w: Partial<Worker>) => void;
  deleteWorker: (id: string) => void;
  monthlyProfits: MonthlyProfit[];
  setMonthlyProfits: (m: MonthlyProfit[]) => void;
  addMonthlyProfit: (m: MonthlyProfit) => void;
  yearlySummaries: YearlySummary[];
  setYearlySummaries: (y: YearlySummary[]) => void;
  purchaseOrders: PurchaseOrder[];
  addPurchaseOrder: (po: PurchaseOrder) => void;
  deletePurchaseOrder: (id: string) => void;
  updatePurchaseOrder: (id: string, data: Partial<PurchaseOrder>) => void;
  getNextInvoiceNumber: () => string;
  suppliers: Supplier[];
  addSupplier: (s: Supplier) => void;
  updateSupplier: (id: string, data: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;
  trash: TrashItem[];
  addToTrash: (data: Order | PurchaseOrder | Worker) => void;
  restoreFromTrash: (id: string) => void;
  revertPurchaseOrderStock: (po: PurchaseOrder) => void;
  fixedExpenses: FixedExpense[];
  addFixedExpense: (e: FixedExpense) => void;
  updateFixedExpense: (id: string, data: Partial<FixedExpense>) => void;
  deleteFixedExpense: (id: string) => void;
  variableExpenses: VariableExpense[];
  addVariableExpense: (e: VariableExpense) => void;
  updateVariableExpense: (id: string, data: Partial<VariableExpense>) => void;
  deleteVariableExpense: (id: string) => void;
  allFixedExpenseNames: string[];
  allVariableExpenseNames: string[];
  fixedExpenseLastAmounts: Record<string, number>;
  workerExpenseEntries: WorkerExpenseEntry[];
  addWorkerExpenseEntry: (e: WorkerExpenseEntry) => void;
  deleteWorkerExpenseEntry: (id: string) => void;
  deleteWorkerExpenseByFields: (workerCode: string, month: string, year: number, description: string, amount: number, date: string, notes?: string) => void;
  adExpenses: AdExpense[];
  addAdExpense: (e: AdExpense) => void;
  updateAdExpense: (id: string, data: Partial<AdExpense>) => void;
  deleteAdExpense: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored);
  } catch {}
  return defaultValue;
}

function migrateOrder(o: Record<string, unknown>): Order {
  if (o.items && Array.isArray(o.items)) {
    const migrated = o as unknown as Order;
    if (!migrated.deliveryType) migrated.deliveryType = '';
    if (!migrated.isSwap) migrated.isSwap = false;
    if (!migrated.swapRef) migrated.swapRef = '';
    if (!migrated.freeDelivery) migrated.freeDelivery = false;
    if (!migrated.paidAmount) migrated.paidAmount = 0;
    if (!migrated.discount) migrated.discount = 0;
    if (!migrated.agent) migrated.agent = '';
    return migrated;
  }
  return {
    id: o.id as string,
    date: o.date as string,
    customerName: o.customerName as string,
    phone: o.phone as string,
    orderNumber: o.orderNumber as string,
    wilaya: o.wilaya as string,
    commune: o.commune as string,
    deliveryPrice: (o.deliveryPrice as number) || 0,
    total: (o.total as number) || 0,
    paidAmount: (o.paidAmount as number) || 0,
    discount: (o.discount as number) || 0,
    deliveryCompany: (o.deliveryCompany as string) || '',
    deliveryType: (o.deliveryType as string) || '',
    isSwap: (o.isSwap as boolean) || false,
    swapRef: (o.swapRef as string) || '',
    freeDelivery: (o.freeDelivery as boolean) || false,
    status: (o.status as Order['status']) || 'pending',
    returnCost: (o.returnCost as number) || 0,
    notes: (o.notes as string) || '',
    returnDate: o.returnDate as string,
    source: (o.source as 1 | 2 | 3) || 1,
    agent: (o.agent as string) || '',
    place: (o.place as string) || '',
    items: [{
      model: o.model as string || '',
      color: o.color as string || '',
      size: o.size as string || '',
      quantity: (o.quantity as number) || 1,
      productCost: (o.productCost as number) || 0,
      sellingPrice: (o.sellingPrice as number) || 0,
    }],
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => loadFromStorage<Language>('lang', 'ar'));
  const [darkMode, setDarkMode] = useState(() => loadFromStorage<boolean>('darkMode', true));
  const [orders, setOrdersState] = useState<Order[]>(() => {
    const raw = loadFromStorage<Record<string, unknown>[]>('orders', []);
    return raw.map(migrateOrder);
  });
  const [inventory, setInventory] = useState<InventoryItem[]>(() => loadFromStorage<InventoryItem[]>('inventory', []));
  const [subInventory, setSubInventory] = useState<SubInventoryItem[]>(() => {
    const raw = loadFromStorage<unknown[]>('subInventory', []);
    if (raw.length === 0) return [];
    // migration: old format was InventoryItem[] (model + colors: Record<string, number>)
    if ('colors' in (raw[0] as Record<string, unknown>)) {
      const old = raw as Record<string, unknown>[];
      const result: SubInventoryItem[] = [];
      old.forEach(item => {
        const model = item.model as string;
        const colors = item.colors as Record<string, number> | undefined;
        if (colors) {
          Object.entries(colors).forEach(([color, qty]) => {
            if (qty > 0) result.push({ model, color, size: '', quantity: qty });
          });
        }
      });
      return result;
    }
    return raw as SubInventoryItem[];
  });
  const [returnInventory, setReturnInventory] = useState<ReturnInventoryItem[]>(() => loadFromStorage<ReturnInventoryItem[]>('returnInventory', []));
  const [products, setProducts] = useState<Product[]>(() => loadFromStorage<Product[]>('products', []));
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(() => loadFromStorage<CompanyInfo>('companyInfo', { name: '', address: '', phone: '', logo: '' }));
  const [notifications, setNotifications] = useState<Notification[]>(() => loadFromStorage<Notification[]>('notifications', []));
  const [settings, setSettings] = useState<AppSettings>(() => loadFromStorage<AppSettings>('settings', { password: '2026', colors: [...defaultColorList] }));
  const [workers, setWorkers] = useState<Worker[]>(() => loadFromStorage<Worker[]>('workers', []));
  const [monthlyProfits, setMonthlyProfits] = useState<MonthlyProfit[]>(() => loadFromStorage<MonthlyProfit[]>('monthlyProfits', []));
  const [yearlySummaries, setYearlySummaries] = useState<YearlySummary[]>(() => loadFromStorage<YearlySummary[]>('yearlySummaries', []));
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => loadFromStorage<PurchaseOrder[]>('purchaseOrders', []));
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const raw = loadFromStorage<Record<string, unknown>[]>('suppliers', []);
    return raw.map(s => ({ ...s, payments: (s as Record<string, unknown>).payments ?? [] } as Supplier));
  });
  const [trash, setTrash] = useState<TrashItem[]>(() => loadFromStorage<TrashItem[]>('trash', []));
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>(() => loadFromStorage<FixedExpense[]>('fixedExpenses', []));
  const [variableExpenses, setVariableExpenses] = useState<VariableExpense[]>(() => loadFromStorage<VariableExpense[]>('variableExpenses', []));
  const [allFixedExpenseNames, setAllFixedExpenseNames] = useState<string[]>(() => loadFromStorage<string[]>('allFixedExpenseNames', []));
  const [allVariableExpenseNames, setAllVariableExpenseNames] = useState<string[]>(() => loadFromStorage<string[]>('allVariableExpenseNames', []));
  const [fixedExpenseLastAmounts, setFixedExpenseLastAmounts] = useState<Record<string, number>>(() => loadFromStorage<Record<string, number>>('fixedExpenseLastAmounts', {}));
  const [workerExpenseEntries, setWorkerExpenseEntries] = useState<WorkerExpenseEntry[]>(() => loadFromStorage<WorkerExpenseEntry[]>('workerExpenseEntries', []));
  const [adExpenses, setAdExpenses] = useState<AdExpense[]>(() => loadFromStorage<AdExpense[]>('adExpenses', []));
  const [users, setUsers] = useState<{ email: string; password: string; name: string }[]>(() => loadFromStorage<{ email: string; password: string; name: string }[]>('users', []));
  const [currentUser, setCurrentUser] = useState<{ email: string; name: string } | null>(() => loadFromStorage<{ email: string; name: string } | null>('currentUser', null));

  const login = (email: string, pwd: string): boolean => {
    const found = users.find(u => u.email === email && u.password === pwd);
    if (found) { setCurrentUser({ email: found.email, name: found.name }); return true; }
    return false;
  };
  const register = (name: string, email: string, pwd: string): boolean => {
    if (users.find(u => u.email === email)) return false;
    const newUsers = [...users, { email, password: pwd, name }];
    setUsers(newUsers);
    setCurrentUser({ email, name });
    return true;
  };
  const logout = () => { setCurrentUser(null); };

  // Auto-clean trash older than 30 days
  useEffect(() => {
    const now = Date.now();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    const filtered = trash.filter(t => now - new Date(t.deletedAt).getTime() < thirtyDays);
    if (filtered.length !== trash.length) setTrash(filtered);
  }, []);

  const password = settings.password;

  const setOrders = (o: Order[]) => { setOrdersState(o); };

  const STORAGE_SAVERS: [string, unknown][] = [
    ['lang', language], ['darkMode', darkMode], ['orders', orders],
    ['inventory', inventory], ['subInventory', subInventory], ['products', products],
    ['companyInfo', companyInfo], ['notifications', notifications], ['settings', settings],
    ['workers', workers], ['monthlyProfits', monthlyProfits], ['yearlySummaries', yearlySummaries],
    ['purchaseOrders', purchaseOrders], ['suppliers', suppliers], ['trash', trash],
    ['returnInventory', returnInventory], ['fixedExpenses', fixedExpenses],
    ['variableExpenses', variableExpenses], ['allFixedExpenseNames', allFixedExpenseNames],
    ['allVariableExpenseNames', allVariableExpenseNames], ['fixedExpenseLastAmounts', fixedExpenseLastAmounts],
    ['workerExpenseEntries', workerExpenseEntries],
    ['adExpenses', adExpenses],
    ['users', users],
    ['currentUser', currentUser],
  ];
  useEffect(() => {
    for (const [key, val] of STORAGE_SAVERS) {
      try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
    }
  }, STORAGE_SAVERS.map(([, v]) => v));

  // Fix existing product prices from purchase order data
  useEffect(() => {
    let changed = false;
    const updated = products.map(p => {
      const po = purchaseOrders.find(o => o.items.some(i => i.productName === p.name));
      if (po) {
        const item = po.items.find(i => i.productName === p.name);
        if (item) {
          const newWsPrice = item.wholesalePrice ?? 0;
          const newRtPrice = item.retailPrice ?? 0;
          if (newWsPrice > 0 && newWsPrice !== p.wholesalePrice) { changed = true; p = { ...p, wholesalePrice: newWsPrice }; }
          if (newRtPrice > 0 && newRtPrice !== p.retailPrice) { changed = true; p = { ...p, retailPrice: newRtPrice }; }
        }
      }
      return p;
    });
    if (changed) setProducts(updated);
    localStorage.removeItem('inv_repaired_v2');
  }, []);

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  const setLanguage = (lang: Language) => setLanguageState(lang);
  const toggleDarkMode = () => setDarkMode(!darkMode);

  const getNextOrderNumber = (): string => {
    const nums = orders.map(o => {
      const n = parseInt(o.orderNumber.replace(/\D/g, ''), 10);
      return isNaN(n) ? 0 : n;
    });
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    return String(max + 1);
  };

  const addOrder = (order: Order) => {
    setOrdersState(prev => [order, ...prev]);
  };

  const updateOrder = (id: string, data: Partial<Order>) => {
    setOrdersState(prev => prev.map(o => o.id === id ? { ...o, ...data } : o));
  };

  const deleteOrder = (id: string) => {
    setOrdersState(prev => prev.filter(o => o.id !== id));
  };

  const getSubStock = (model: string, color: string, size: string): number => {
    const item = subInventory.find(i => i.model === model && i.color === color && i.size === size);
    if (!item) return 0;
    return item.quantity;
  };

  const updateSubStock = (model: string, color: string, size: string, quantity: number, operation: 'reduce' | 'restore') => {
    setSubInventory(prev => prev.map(item => {
      if (item.model !== model || item.color !== color || item.size !== size) return item;
      const newQty = operation === 'reduce' ? item.quantity - quantity : item.quantity + quantity;
      return { ...item, quantity: Math.max(0, newQty) };
    }));
  };

  const productColorsToMap = (colors: ProductColor[]): Record<string, number> => {
    const map: Record<string, number> = {};
    colors.forEach(c => { if (c.name) map[c.name] = c.quantity; });
    return map;
  };

  const syncProductToInventory = (p: Product, oldName?: string) => {
    if (oldName && oldName !== p.name) {
      setInventory(prev => prev.filter(i => i.model !== oldName));
    }
    const colorsMap = productColorsToMap(p.colors);
    const existingIdx = inventory.findIndex(i => i.model === p.name);
    if (existingIdx >= 0) {
      // Merge: keep existing colors that aren't in the product, add/update product colors
      const existing = inventory[existingIdx];
      const merged = { ...existing.colors, ...colorsMap };
      // Remove colors set to 0 by the product
      Object.keys(colorsMap).forEach(k => { if (colorsMap[k] === 0) delete merged[k]; });
      setInventory(prev => prev.map(i => i.model === p.name ? { ...i, colors: merged } : i));
    } else {
      setInventory(prev => [...prev, { model: p.name, colors: colorsMap }]);
    }
  };

  const addProduct = (p: Product) => {
    setProducts(prev => [p, ...prev]);
    syncProductToInventory(p);
  };

  const updateProduct = (id: string, data: Partial<Product>) => {
    setProducts(prev => {
      const old = prev.find(p => p.id === id);
      const updated = prev.map(p => p.id === id ? { ...p, ...data } : p);
      const newP = updated.find(p => p.id === id);
      if (newP) syncProductToInventory(newP, old?.name);
      return updated;
    });
  };

  const deleteProduct = (id: string) => {
    setProducts(prev => {
      const p = prev.find(x => x.id === id);
      if (p) setInventory(inv => inv.filter(i => i.model !== p.name));
      return prev.filter(x => x.id !== id);
    });
  };

  const addNotification = (notif: Omit<Notification, 'id' | 'date' | 'read'>) => {
    setNotifications(prev => [{
      ...notif, id: Date.now().toString(), date: new Date().toISOString(), read: false,
    }, ...prev]);
  };

  const markAllNotificationsRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  const updateSettings = (s: Partial<AppSettings>) => setSettings(prev => ({ ...prev, ...s }));

  const addWorker = (worker: Worker) => setWorkers(prev => [worker, ...prev]);
  const updateWorker = (id: string, data: Partial<Worker>) => setWorkers(prev => prev.map(w => w.id === id ? { ...w, ...data } : w));
  const deleteWorker = (id: string) => setWorkers(prev => prev.filter(w => w.id !== id));

  const getNextInvoiceNumber = (): string => {
    const nums = purchaseOrders.map(po => {
      const n = parseInt(po.invoiceNumber.replace(/\D/g, ''), 10);
      return isNaN(n) ? 0 : n;
    });
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    return String(max + 1).padStart(4, '0');
  };

  const addPurchaseOrder = (po: PurchaseOrder) => setPurchaseOrders(prev => [po, ...prev]);
  const deletePurchaseOrder = (id: string) => setPurchaseOrders(prev => prev.filter(po => po.id !== id));
  const updatePurchaseOrder = (id: string, data: Partial<PurchaseOrder>) => setPurchaseOrders(prev => prev.map(po => po.id === id ? { ...po, ...data } : po));
  const addSupplier = (s: Supplier) => setSuppliers(prev => [s, ...prev]);
  const updateSupplier = (id: string, data: Partial<Supplier>) => setSuppliers(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
  const deleteSupplier = (id: string) => setSuppliers(prev => prev.filter(s => s.id !== id));

  const addToTrash = (data: Order | PurchaseOrder | Worker) => {
    const isWorker = 'salary' in data;
    if (isWorker) {
      setTrash(prev => [{ worker: data as Worker, deletedAt: new Date().toISOString() }, ...prev]);
    } else if ('customerName' in data) {
      setTrash(prev => [{ order: data as Order, deletedAt: new Date().toISOString() }, ...prev]);
    } else {
      setTrash(prev => [{ purchaseOrder: data as PurchaseOrder, deletedAt: new Date().toISOString() }, ...prev]);
    }
  };
  const restoreFromTrash = (id: string) => {
    const item = trash.find(t => t.order?.id === id || t.purchaseOrder?.id === id || t.worker?.id === id);
    if (item) {
      if (item.worker) addWorker(item.worker);
      if (item.order) addOrder(item.order);
      if (item.order) {
        if (item.order.status === 'returned') {
          for (const oi of item.order.items) {
            setReturnInventory(prev => {
              const existing = prev.findIndex(r => r.model === oi.model && r.color === oi.color && r.size === oi.size && r.orderNumber === item.order!.orderNumber);
              if (existing >= 0) {
                const u = [...prev];
                u[existing] = { ...u[existing], quantity: u[existing].quantity + oi.quantity };
                return u;
              }
              return [...prev, { orderNumber: item.order!.orderNumber, model: oi.model, color: oi.color, size: oi.size, quantity: oi.quantity }];
            });
          }
        } else {
          // Re-deduct stock
          for (const oi of item.order.items) {
            const src = oi.source || item.order.source;
            if (src === 2) {
              updateSubStock(oi.model, oi.color, oi.size, oi.quantity, 'reduce');
            } else if (src === 3) {
              setReturnInventory(prev => prev.map(ri => ri.model === oi.model && ri.color === oi.color && ri.size === oi.size ? { ...ri, quantity: Math.max(0, ri.quantity - oi.quantity) } : ri));
            } else {
              setInventory(prev => prev.map(inv => inv.model !== oi.model ? inv : { ...inv, colors: { ...inv.colors, [oi.color]: Math.max(0, (inv.colors[oi.color] || 0) - oi.quantity) } }));
            }
          }
          // Re-add profit for delivered orders
          if (item.order.status === 'delivered') {
            const d = new Date(item.order.date);
            const mn = d.toLocaleString('en-US', { month: 'long' });
            const yr = d.getFullYear();
            const sales = item.order.total;
            const cost = item.order.items.reduce((s, i) => s + i.productCost * i.quantity, 0);
            const netContribution = sales - cost - item.order.deliveryPrice;
            setMonthlyProfits(prev => prev.map(mp => {
              if (mp.month !== mn || mp.year !== yr) return mp;
              return { ...mp, totalSales: mp.totalSales + sales, totalCost: mp.totalCost + cost, netProfit: mp.netProfit + netContribution, deliveredOrders: mp.deliveredOrders + 1 };
            }));
          }
        }
      }
      setTrash(prev => prev.filter(t => (t.order?.id !== id && t.purchaseOrder?.id !== id && t.worker?.id !== id)));
    }
  };
  const addFixedExpense = (e: FixedExpense) => {
    setFixedExpenses(prev => [e, ...prev]);
    setAllFixedExpenseNames(prev => prev.includes(e.name) ? prev : [...prev, e.name]);
    setFixedExpenseLastAmounts(prev => ({ ...prev, [e.name]: e.amount }));
  };
  const updateFixedExpense = (id: string, data: Partial<FixedExpense>) => {
    setFixedExpenses(prev => prev.map(e => e.id === id ? { ...e, ...data } : e));
    if (data.name) setAllFixedExpenseNames(prev => prev.includes(data.name!) ? prev : [...prev, data.name!]);
    if (data.name && data.amount !== undefined) setFixedExpenseLastAmounts(prev => ({ ...prev, [data.name!]: data.amount! }));
    else if (data.amount !== undefined) {
      setFixedExpenses(prev => {
        const e = prev.find(x => x.id === id);
        if (e) setFixedExpenseLastAmounts(prev2 => ({ ...prev2, [e.name]: data.amount! }));
        return prev;
      });
    }
  };
  const deleteFixedExpense = (id: string) => setFixedExpenses(prev => prev.filter(e => e.id !== id));
  const addVariableExpense = (e: VariableExpense) => {
    setVariableExpenses(prev => [e, ...prev]);
    setAllVariableExpenseNames(prev => prev.includes(e.name) ? prev : [...prev, e.name]);
  };
  const updateVariableExpense = (id: string, data: Partial<VariableExpense>) => {
    setVariableExpenses(prev => prev.map(e => e.id === id ? { ...e, ...data } : e));
    if (data.name) setAllVariableExpenseNames(prev => prev.includes(data.name!) ? prev : [...prev, data.name!]);
  };
  const deleteVariableExpense = (id: string) => setVariableExpenses(prev => prev.filter(e => e.id !== id));
  const addWorkerExpenseEntry = (e: WorkerExpenseEntry) => {
    setWorkerExpenseEntries(prev => [e, ...prev]);
    setWorkers(prev => prev.map(w => {
      if (w.code === e.workerCode && w.month === e.month && w.year === e.year) {
        return { ...w, expenses: [...w.expenses, { description: e.description, amount: e.amount, date: e.date, notes: e.notes || undefined }] };
      }
      return w;
    }));
  };
  const deleteWorkerExpenseEntry = (id: string) => {
    const entry = workerExpenseEntries.find(e => e.id === id);
    setWorkerExpenseEntries(prev => prev.filter(e => e.id !== id));
    if (entry) {
      setWorkers(prev => prev.map(w => {
        if (w.code === entry.workerCode && w.month === entry.month && w.year === entry.year) {
          return {
            ...w,
            expenses: w.expenses.filter(e =>
              !(e.description === entry.description && e.amount === entry.amount && e.date === entry.date && (e.notes || '') === (entry.notes || ''))
            )
          };
        }
        return w;
      }));
    }
  };
  const deleteWorkerExpenseByFields = (workerCode: string, month: string, year: number, description: string, amount: number, date: string, notes?: string) => {
    setWorkerExpenseEntries(prev => prev.filter(e =>
      !(e.workerCode === workerCode && e.month === month && e.year === year && e.description === description && e.amount === amount && e.date === date && (e.notes || '') === (notes || ''))
    ));
  };
  const addAdExpense = (e: AdExpense) => setAdExpenses(prev => {
    const existing = prev.findIndex(x => x.id === e.id);
    if (existing >= 0) {
      return prev.map((x, i) => i === existing ? e : x);
    }
    return [e, ...prev];
  });
  const updateAdExpense = (id: string, data: Partial<AdExpense>) => setAdExpenses(prev => prev.map(e => e.id === id ? { ...e, ...data } : e));
  const deleteAdExpense = (id: string) => setAdExpenses(prev => prev.filter(e => e.id !== id));
  const revertPurchaseOrderStock = (po: PurchaseOrder) => {
    let invCopy = [...inventory];
    let subCopy = [...subInventory];
    for (const item of po.items) {
      if (item.targetTable === 1) {
        const existingIdx = invCopy.findIndex(i => i.model === item.productName);
        if (existingIdx >= 0) {
          const currentQty = invCopy[existingIdx].colors[item.color] || 0;
          const newQty = Math.max(0, currentQty - item.quantity);
          if (newQty === 0) {
            const newColors = { ...invCopy[existingIdx].colors };
            delete newColors[item.color];
            const remainingColors = Object.keys(newColors);
            if (remainingColors.length === 0) {
              invCopy = invCopy.filter((_, i) => i !== existingIdx);
            } else {
              invCopy[existingIdx] = { ...invCopy[existingIdx], colors: newColors };
            }
          } else {
            invCopy[existingIdx] = { ...invCopy[existingIdx], colors: { ...invCopy[existingIdx].colors, [item.color]: newQty } };
          }
        }
      } else {
        const existingIdx = subCopy.findIndex(i => i.model === item.productName && i.color === item.color && i.size === item.size);
        if (existingIdx >= 0) {
          const newQty = Math.max(0, subCopy[existingIdx].quantity - item.quantity);
          if (newQty === 0) {
            subCopy = subCopy.filter((_, i) => i !== existingIdx);
          } else {
            subCopy[existingIdx] = { ...subCopy[existingIdx], quantity: newQty };
          }
        }
      }
    }
    setInventory(invCopy);
    setSubInventory(subCopy);
  };

  const addToReturnInventory = (model: string, color: string, size: string, quantity: number, orderNumber?: string) => {
    setReturnInventory(prev => {
      const existing = prev.find(i => i.model === model && i.color === color && i.size === size && i.orderNumber === orderNumber);
      if (existing) {
        return prev.map(i => i.model === model && i.color === color && i.size === size && i.orderNumber === orderNumber ? { ...i, quantity: i.quantity + quantity } : i);
      }
      return [...prev, { orderNumber, model, color, size, quantity }];
    });
  };

  const removeFromReturnInventory = (model: string, color: string, size: string, quantity: number, orderNumber?: string) => {
    setReturnInventory(prev => {
      if (orderNumber) {
        return prev.map(i => {
          if (i.model !== model || i.color !== color || i.size !== size || i.orderNumber !== orderNumber) return i;
          return { ...i, quantity: Math.max(0, i.quantity - quantity) };
        });
      }
      let remaining = quantity;
      return prev.map(i => {
        if (i.model !== model || i.color !== color || i.size !== size || remaining <= 0) return i;
        const deducted = Math.min(i.quantity, remaining);
        remaining -= deducted;
        return { ...i, quantity: i.quantity - deducted };
      });
    });
  };

  const addMonthlyProfit = (m: MonthlyProfit) => {
    setMonthlyProfits(prev => {
      const existing = prev.findIndex(p => p.month === m.month && p.year === m.year);
      if (existing >= 0) { const u = [...prev]; u[existing] = m; return u; }
      return [...prev, m];
    });
  };

  return (
    <AppContext.Provider value={{
      language, setLanguage, darkMode, toggleDarkMode,
      currentUser, login, register, logout,
      orders, setOrders, addOrder, updateOrder, deleteOrder, getNextOrderNumber,
      inventory, setInventory,
      subInventory, setSubInventory, updateSubStock, getSubStock,
      returnInventory, setReturnInventory, addToReturnInventory, removeFromReturnInventory,
      products, setProducts, addProduct, updateProduct, deleteProduct,
      companyInfo, setCompanyInfo,
      notifications, addNotification, markAllNotificationsRead,
      settings, updateSettings, password,
      workers, addWorker, updateWorker, deleteWorker,
      monthlyProfits, setMonthlyProfits, addMonthlyProfit,
      yearlySummaries, setYearlySummaries,
      purchaseOrders, addPurchaseOrder, deletePurchaseOrder, updatePurchaseOrder, getNextInvoiceNumber,
      suppliers, addSupplier, updateSupplier, deleteSupplier,
      trash, addToTrash, restoreFromTrash, revertPurchaseOrderStock,
      fixedExpenses, addFixedExpense, updateFixedExpense, deleteFixedExpense,
      variableExpenses, addVariableExpense, updateVariableExpense, deleteVariableExpense,
      allFixedExpenseNames, allVariableExpenseNames, fixedExpenseLastAmounts,
      workerExpenseEntries, addWorkerExpenseEntry, deleteWorkerExpenseEntry, deleteWorkerExpenseByFields,
      adExpenses, addAdExpense, updateAdExpense, deleteAdExpense,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}
