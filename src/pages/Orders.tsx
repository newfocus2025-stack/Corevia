import { useState, useEffect, useRef } from 'react';
import { focusNextInput } from '../shared/formHelpers';
import { useTranslation } from '../i18n/useTranslation';
import { useAppContext } from '../store/AppContext';
import type { Order, OrderItem } from '../types';
import { Plus, Search, Edit2, Trash2, X, ShoppingBag, Printer } from 'lucide-react';
import toast from 'react-hot-toast';

function UndoToast({ message, undoLabel, onUndo, duration }: { message: string; undoLabel: string; onUndo: () => void; duration: number }) {
  const [progress, setProgress] = useState(100);
  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (elapsed >= duration) clearInterval(interval);
    }, 50);
    return () => clearInterval(interval);
  }, [duration]);
  return (
    <div className="flex flex-col gap-1 min-w-[280px]">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">{message}</span>
        <button onClick={onUndo} className="px-3 py-1 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium transition-colors">{undoLabel}</button>
      </div>
      <div className="w-full h-1 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <div className="h-full bg-blue-500 rounded-full transition-all duration-100" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

const wilayas = [
  'أدرار', 'الشلف', 'الأغواط', 'أم البواقي', 'باتنة', 'بجاية', 'بسكرة', 'بشار',
  'البليدة', 'البويرة', 'تمنراست', 'تبسة', 'تلمسان', 'تيارت', 'تيزي وزو', 'الجزائر',
  'الجلفة', 'جيجل', 'سطيف', 'سعيدة', 'سكيكدة', 'سيدي بلعباس', 'عنابة', 'قالمة',
  'قسنطينة', 'المدية', 'مستغانم', 'المسيلة', 'معسكر', 'وهران', 'ورقلة', 'إيليزي',
  'برج بوعريريج', 'بومرداس', 'الطارف', 'تندوف', 'تسمسيلت', 'الوادي', 'خنشلة',
  'سوق أهراس', 'تيبازة', 'ميلة', 'عين الدفلى', 'النعامة', 'عين تموشنت', 'غرداية',
  'غليزان', 'تميمون', 'برج باجي مختار', 'أولاد جلال', 'بني عباس', 'عين صالح',
  'عين قزام', 'تقرت', 'جانت', 'المغير', 'المنيعة',
];

const deliveryCompanies = ['Yalidine', 'Noest', 'Maystro Delivery', 'ZR Express', 'Amena', 'Eco', 'Autre'];
const orderStatuses: Order['status'][] = ['pending', 'delivered', 'returned'];

const stockColor = (available: number, quantity: number) => {
  if (available > 10) return quantity > available ? 'border-red-500 ring-2 ring-red-500/20' : 'border-green-500 ring-1 ring-green-500/30';
  if (available >= 5) return quantity > available ? 'border-red-500 ring-2 ring-red-500/20' : 'border-blue-500 ring-1 ring-blue-500/30';
  if (available > 0) return quantity > available ? 'border-red-500 ring-2 ring-red-500/20' : 'border-yellow-500 ring-1 ring-yellow-500/30';
  return '';
};

const stockBgColor = (available: number) => {
  if (available > 10) return 'bg-green-100 dark:bg-green-900/20';
  if (available >= 5) return 'bg-blue-100 dark:bg-blue-900/20';
  if (available > 0) return 'bg-yellow-100 dark:bg-yellow-900/20';
  return '';
};

export default function Orders() {
  const { t, language } = useTranslation();
  const { orders, addOrder, updateOrder, deleteOrder, inventory, setInventory, subInventory, returnInventory, addToReturnInventory, removeFromReturnInventory, products, updateSubStock, getSubStock, getNextOrderNumber, addNotification, settings, companyInfo, addToTrash, restoreFromTrash, monthlyProfits, setMonthlyProfits, workers } = useAppContext();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [clearDebtConfirm, setClearDebtConfirm] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [agent, setAgent] = useState('');
  const [place, setPlace] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Set<string>>(new Set());

  const deductStock = (item: OrderItem, orderSource: 1 | 2 | 3) => {
    const src = item.source || orderSource;
    if (src === 2) {
      updateSubStock(item.model, item.color, item.size, item.quantity, 'reduce');
    } else if (src === 3) {
      removeFromReturnInventory(item.model, item.color, item.size, item.quantity);
    } else {
      const updated = inventory.map(inv => {
        if (inv.model !== item.model) return inv;
        const qty = (inv.colors[item.color] || 0) - item.quantity;
        return { ...inv, colors: { ...inv.colors, [item.color]: Math.max(0, qty) } };
      });
      setInventory(updated);
    }
  };

  const restoreStock = (item: OrderItem, orderSource: 1 | 2 | 3, orderNumber?: string) => {
    const src = item.source || orderSource;
    if (src === 2) {
      updateSubStock(item.model, item.color, item.size, item.quantity, 'restore');
    } else if (src === 3) {
      addToReturnInventory(item.model, item.color, item.size, item.quantity, orderNumber);
    } else {
      const updated = inventory.map(inv => {
        if (inv.model !== item.model) return inv;
        return { ...inv, colors: { ...inv.colors, [item.color]: (inv.colors[item.color] || 0) + item.quantity } };
      });
      setInventory(updated);
    }
  };
  const [wilaya, setWilaya] = useState('');
  const [commune, setCommune] = useState('');
  const [deliveryPrice, setDeliveryPrice] = useState(0);
  const [freeDelivery, setFreeDelivery] = useState(false);
  const [paidAmount, setPaidAmount] = useState(0);
  const [discount, setDiscount] = useState(0);
  const paidTouched = useRef(false);

  const clearFieldError = (key: string) => {
    setFieldErrors(prev => { const s = new Set(prev); s.delete(key); return s; });
  };

  const [isSwap, setIsSwap] = useState(false);
  const [swapRef, setSwapRef] = useState('');
  const [deliveryCompany, setDeliveryCompany] = useState('');
  const [deliveryType, setDeliveryType] = useState('');
  const [status, setStatus] = useState<Order['status']>('pending');
  const [returnCost, setReturnCost] = useState(300);
  const [notes, setNotes] = useState('');
  const [source, setSource] = useState<1 | 2 | 3>(1);
  const [returnDate, setReturnDate] = useState('');

  const [items, setItems] = useState<OrderItem[]>([{ model: '', color: '', size: '', quantity: 1, productCost: 0, sellingPrice: 0 }]);

  useEffect(() => {
    if (!editId && showForm && !paidTouched.current) {
      const totalItems = items.reduce((s, it) => s + it.sellingPrice * it.quantity, 0);
      setPaidAmount(totalItems + deliveryPrice - discount);
    }
  }, [items, discount, deliveryPrice, editId, showForm]);

  // Restore form draft on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('orderFormDraft');
      if (saved) {
        const draft = JSON.parse(saved);
        setCustomerName(draft.customerName || ''); setPhone(draft.phone || '');
        setOrderNumber(draft.orderNumber || ''); setAgent(draft.agent || ''); setPlace(draft.place || ''); setWilaya(draft.wilaya || '');
        setCommune(draft.commune || ''); setDeliveryPrice(draft.deliveryPrice || 0);
        setPaidAmount(draft.paidAmount || 0); setDiscount(draft.discount || 0);
        setIsSwap(draft.isSwap || false); setSwapRef(draft.swapRef || ''); setFreeDelivery(draft.freeDelivery || false); setDeliveryCompany(draft.deliveryCompany || '');
        setDeliveryType(draft.deliveryType || ''); setStatus(draft.status || 'pending');
        setReturnCost(draft.returnCost || 0); setNotes(draft.notes || '');
        setSource(draft.source || 1); setReturnDate(draft.returnDate || '');
        if (draft.items && draft.items.length > 0) setItems(draft.items);
        if (draft.editId) setEditId(draft.editId);
        setShowForm(true);
        localStorage.removeItem('orderFormDraft');
      }
    } catch {}
  }, []);

  const resetForm = () => {
    setCustomerName(''); setPhone(''); setOrderNumber(getNextOrderNumber()); setAgent(''); setWilaya(''); setCommune(''); setPlace(''); setFieldErrors(new Set());
    setDeliveryPrice(0); setFreeDelivery(false); setPaidAmount(0); setDiscount(0); setIsSwap(false); setSwapRef(''); setDeliveryCompany(''); setDeliveryType(''); setStatus('pending'); setReturnCost(300); setNotes(''); setSource(1); setReturnDate('');
    setItems([{ model: '', color: '', size: '', quantity: 1, productCost: 0, sellingPrice: 0 }]);
    setEditId(null); paidTouched.current = false; setShowForm(false);
  };

  const openAddForm = () => {
    resetForm();
    setOrderNumber(getNextOrderNumber());
    setShowForm(true);
  };

  useEffect(() => {
    if (showForm) {
      const draft = {
        customerName, phone, orderNumber, agent, place, wilaya, commune, deliveryPrice, paidAmount, discount,
        isSwap, swapRef, freeDelivery, deliveryCompany, deliveryType, status, returnCost, notes, source, returnDate,
        items, editId, paidTouched: false,
      };
      try { localStorage.setItem('orderFormDraft', JSON.stringify(draft)); } catch {}
    } else {
      try { localStorage.removeItem('orderFormDraft'); } catch {}
    }
  }, [showForm, customerName, phone, orderNumber, agent, place, wilaya, commune, deliveryPrice, paidAmount, discount,
      isSwap, swapRef, freeDelivery, deliveryCompany, deliveryType, status, returnCost, notes, source, returnDate, items, editId]);

  const updateItem = (idx: number, data: Partial<OrderItem>) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, ...data } : item));
  };

  const addItem = () => {
    setItems(prev => [...prev, { model: '', color: '', size: '', quantity: 1, productCost: 0, sellingPrice: 0 }]);
  };

  const removeItem = (idx: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const calcTotal = () => {
    const itemsTotal = items.reduce((sum, item) => sum + item.sellingPrice * item.quantity, 0);
    return itemsTotal + (freeDelivery ? 0 : deliveryPrice) - discount;
  };

  const handleModelSelect = (idx: number, model: string) => {
    const matched = products.find(p => p.name === model);
    if (matched) {
      updateItem(idx, { model, productCost: matched.wholesaleCostPrice });
    } else {
      updateItem(idx, { model, color: '' });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = new Set<string>();
    if (!customerName.trim()) errs.add('customerName');
    if (!phone.trim()) errs.add('phone');
    if (!wilaya) errs.add('wilaya');
    if (!commune.trim()) errs.add('commune');
    if (!place.trim()) errs.add('place');
    if (!deliveryType) errs.add('deliveryType');
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.model) errs.add(`model_${i}`);
      if (!item.color) errs.add(`color_${i}`);
      if (!item.size) errs.add(`size_${i}`);
      if (item.quantity < 1) errs.add(`qty_${i}`);
    }
    if (errs.size > 0) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors(new Set());
    for (const item of items) {
      const deductSource = item.source || source;
      if (deductSource === 2) {
        const qty = getSubStock(item.model, item.color, item.size);
        if (item.quantity > qty) {
          toast.error(language === 'ar' ? 'لا يمكن إتمام الطلبية' : language === 'fr' ? 'Commande impossible' : 'Order cannot be completed');
          return;
        }
      } else if (deductSource === 3) {
        const retItem = returnInventory.find(i => i.model === item.model && i.color === item.color && i.size === item.size);
        const avail = retItem?.quantity || 0;
        if (item.quantity > avail) {
          toast.error(language === 'ar' ? 'لا يمكن إتمام الطلبية' : language === 'fr' ? 'Commande impossible' : 'Order cannot be completed');
          return;
        }
      } else {
        const invItem = inventory.find(i => i.model === item.model);
        const avail = invItem?.colors[item.color] || 0;
        if (item.quantity > avail) {
          toast.error(language === 'ar' ? 'لا يمكن إتمام الطلبية' : language === 'fr' ? 'Commande impossible' : 'Order cannot be completed');
          return;
        }
      }
    }

    const total = calcTotal();
    const orderData: Order = {
      id: editId || Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      customerName, phone, orderNumber, agent, place, wilaya, commune,
      deliveryPrice, freeDelivery, paidAmount, discount, isSwap, swapRef, total, deliveryCompany, deliveryType, status, returnCost, notes, source,
      returnDate: status === 'returned' ? (returnDate || new Date().toISOString().split('T')[0]) : undefined,
      items,
    };

    if (editId) {
      const old = orders.find(o => o.id === editId);
      if (old) {
        old.items.forEach((item, i) => {
          const oldSource = item.source || old.source;
          const newItem = items[i];
          const newItemSource = newItem?.source || source;
          if (oldSource !== 2 && old.status === 'delivered' && (status !== 'delivered' || newItemSource !== 1)) {
            restoreStock(item, old.source);
          }
          if (oldSource === 2 && old.status === 'delivered' && (status !== 'delivered' || newItemSource !== 2)) {
            restoreStock(item, old.source);
          }
          if (newItem && newItemSource !== 2 && status === 'delivered' && (old.status !== 'delivered' || oldSource !== 1)) {
            deductStock(newItem, source);
          }
          if (newItem && newItemSource === 2 && status === 'delivered' && (old.status !== 'delivered' || oldSource !== 2)) {
            deductStock(newItem, source);
          }
        });
        if (status === 'returned' && old.status !== 'returned') {
          items.forEach(item => {
            restoreStock(item, source);
          });
        }
      }
      updateOrder(editId, orderData);
      toast.success(t('orderUpdated'));
    } else {
      addOrder(orderData);
      items.forEach(item => deductStock(item, source));
      if (status === 'delivered') {
        addNotification({ type: 'delivery', message: `${t('delivered')}: ${customerName}` });
      }
      toast.success(t('orderAdded'));
    }
    resetForm();
  };

  const handleEdit = (order: Order) => {
    setCustomerName(order.customerName); setPhone(order.phone); setOrderNumber(order.orderNumber); setAgent(order.agent || ''); setPlace(order.place || '');
    setWilaya(order.wilaya); setCommune(order.commune); setDeliveryPrice(order.deliveryPrice); setFreeDelivery(order.freeDelivery || false); setPaidAmount(order.paidAmount || 0); setDiscount(order.discount || 0); setIsSwap(order.isSwap || false); setSwapRef(order.swapRef || '');
    setDeliveryCompany(order.deliveryCompany); setDeliveryType(order.deliveryType || ''); setStatus(order.status); setReturnCost(order.returnCost);
    setNotes(order.notes || ''); setSource(order.source); setReturnDate(order.returnDate || '');
    setItems(order.items.length > 0 ? order.items.map(i => ({ ...i })) : [{ model: '', color: '', size: '', quantity: 1, productCost: 0, sellingPrice: 0 }]);
    setEditId(order.id);
    paidTouched.current = true;
    setShowForm(true);
  };

  const adjustProfitForOrder = (order: Order, factor: 1 | -1) => {
    if (order.status !== 'delivered') return;
    const d = new Date(order.date);
    const mn = d.toLocaleString('en-US', { month: 'long' });
    const yr = d.getFullYear();
    const sales = order.total;
    const cost = order.items.reduce((s, i) => s + i.productCost * i.quantity, 0);
    const deliveryCost = order.freeDelivery ? order.deliveryPrice : 0;
    const netContribution = sales - cost - deliveryCost;
    setMonthlyProfits(monthlyProfits.map(mp => {
      if (mp.month !== mn || mp.year !== yr) return mp;
      return {
        ...mp,
        totalSales: mp.totalSales + factor * sales,
        totalCost: mp.totalCost + factor * cost,
        netProfit: mp.netProfit + factor * netContribution,
        deliveredOrders: mp.deliveredOrders + factor,
      };
    }));
  };

  const handleDelete = (id: string) => {
    const order = orders.find(o => o.id === id);
    if (order) {
      if (order.status === 'returned') {
        order.items.forEach(item => {
          removeFromReturnInventory(item.model, item.color, item.size, item.quantity, order.orderNumber);
        });
      } else {
        order.items.forEach(item => restoreStock(item, order.source, order.orderNumber));
      }
      if (order.status === 'delivered') adjustProfitForOrder(order, -1);
    }
    if (order) addToTrash(order);
    deleteOrder(id);
    setDeleteConfirm(null);

    toast.custom(
      (toastObj) => <UndoToast
        message={t('orderDeleted')}
        undoLabel={language === 'ar' ? 'تراجع' : language === 'fr' ? 'Annuler' : 'Undo'}
        onUndo={() => { if (order) { restoreFromTrash(id); } toast.dismiss(toastObj.id); }}
        duration={5000}
      />,
      { duration: 5000 }
    );
  };

  const handleClearDebt = (customerName: string) => {
    orders.forEach(o => {
      if (o.customerName === customerName) {
        updateOrder(o.id, { paidAmount: o.total });
      }
    });
    setClearDebtConfirm(null);
    toast.success(language === 'ar' ? 'تم تصفية جميع الديون' : language === 'fr' ? 'Toutes les dettes sont effacées' : 'All debts cleared');
  };

  const handlePrintOrder = (order: Order, simple?: boolean) => {
    const win = window.open('', '_blank');
    if (!win) return;
    const itemsTotal = order.items.reduce((s, it) => s + it.sellingPrice * it.quantity, 0);
    const oldDebt = simple ? 0 : getCustomerDebt(order.customerName, order.id);
    const delivLabel = language === 'ar' ? 'توصيل' : language === 'fr' ? 'Livraison' : 'Delivery';
    const itemRows = order.items.map(item => `
      <tr>
        <td>${item.model}</td>
        <td>${item.color}</td>
        <td style="text-align:center">${item.quantity}</td>
        <td style="text-align:right">${item.sellingPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })} DZD</td>
        <td style="text-align:right">${(item.sellingPrice * item.quantity).toLocaleString(undefined, { maximumFractionDigits: 2 })} DZD</td>
      </tr>`).join('');
    const deliveryTypeLabel = order.deliveryType === 'home' ? (language === 'ar' ? 'للمنزل' : 'Home') : order.deliveryType === 'office' ? (language === 'ar' ? 'للمكتب' : 'Office') : order.deliveryType || '';
    win.document.write(`
      <html dir="${language === 'ar' ? 'rtl' : 'ltr'}">
      <head><title>${t('order')} #${order.orderNumber}</title>
      <style>
        @page { margin: 10mm; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', 'Traditional Arabic', sans-serif; padding: 20px; color: #1a1a2e; max-width: 750px; margin: auto; }
        .header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px; border-bottom: 2px solid #1a1a2e; padding-bottom: 10px; }
        .header .logo { max-width: 70px; max-height: 70px; }
        .header .info { text-align: end; font-size: 11px; line-height: 1.6; }
        h1 { font-size: 18px; margin-bottom: 2px; }
        .subtitle { font-size: 11px; color: #6c757d; }
        .details { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 11px; line-height: 1.8; }
        .details div { flex: 1; }
        table.items { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 11px; }
        table.items th { background: #1a1a2e; color: white; padding: 6px 6px; font-size: 10px; text-align: start; }
        table.items th.right { text-align: right; }
        table.items th.center { text-align: center; }
        table.items td { padding: 5px 6px; border-bottom: 1px solid #ddd; }
        table.items td.right { text-align: right; }
        table.items td.center { text-align: center; }
        table.items tr.total td { border-top: 2px solid #1a1a2e; font-weight: bold; }
        .summary { margin-top: 8px; }
        .summary table { width: 100%; font-size: 12px; border-collapse: collapse; }
        .summary td { padding: 4px 8px; }
        .summary .label { text-align: start; }
        .summary .value { text-align: end; }
        .summary .line td { border-top: 1px solid #999; padding-top: 5px; }
        .grand-total { margin-top: 6px; }
        .grand-total table { width: 100%; border: 2px solid #1a1a2e; border-radius: 8px; font-size: 14px; }
        .grand-total td { padding: 6px 10px; }
        .grand-total .label { text-align: start; font-weight: bold; }
        .grand-total .value { text-align: end; font-weight: bold; color: #dc2626; font-size: 18px; }
        .footer { margin-top: 24px; text-align: center; font-size: 9px; color: #6c757d; border-top: 1px solid #e9ecef; padding-top: 8px; }
      </style>
      </head><body>
        <div class="header">
          ${companyInfo.logo ? `<img class="logo" src="${companyInfo.logo}" />` : ''}
          <div class="info">
            <h1>${companyInfo.name || t('appName')}</h1>
            <div>${companyInfo.address || ''}</div>
            <div>${companyInfo.phone || ''}</div>
          </div>
        </div>
        <div style="text-align:center;margin-bottom:12px">
          <h2 style="font-size:15px">${language === 'ar' ? 'فاتورة طلبية رقم' : language === 'fr' ? 'Facture N°' : 'Invoice No'} ${order.orderNumber}</h2>
          <div class="subtitle">${t('date')}: ${order.date}</div>
        </div>
        <div class="details">
          <div>
            <strong>${t('customerName')}:</strong> ${order.customerName}<br>
            <strong>${t('phone')}:</strong> ${order.phone}<br>
            <strong>${t('wilaya')}:</strong> ${order.wilaya}<br>
            <strong>${t('commune')}:</strong> ${order.commune}<br>
            ${order.place ? `<strong>${language === 'ar' ? 'المكان' : language === 'fr' ? 'Lieu' : 'Place'}:</strong> ${order.place}<br>` : ''}
            ${order.agent ? `<strong>${language === 'ar' ? 'العامل/مندوب' : language === 'fr' ? 'Ouvrier' : 'Agent'}:</strong> ${order.agent}<br>` : ''}
          </div>
          <div style="text-align:end">
            <strong>${t('deliveryCompany')}:</strong> ${order.deliveryCompany || '-'}<br>
            ${deliveryTypeLabel ? `<strong>${t('deliveryType')}:</strong> ${deliveryTypeLabel}<br>` : ''}
            ${order.notes ? `<strong>${t('notes')}:</strong> ${order.notes}` : ''}
          </div>
        </div>
        <table class="items">
          <thead><tr>
            <th>${t('model')}</th>
            <th>${t('color')}</th>
            <th class="center">${t('quantity')}</th>
            <th class="right">${t('sellingPrice')}</th>
            <th class="right">${t('total')}</th>
          </tr></thead>
          <tbody>
            ${itemRows}
            ${order.freeDelivery ? `
            <tr>
              <td><strong>${delivLabel}</strong></td>
              <td>—</td>
              <td class="center">1</td>
              <td class="right" style="color:#16a34a">${language === 'ar' ? 'مجاني' : language === 'fr' ? 'Gratuit' : 'Free'}</td>
              <td class="right" style="color:#16a34a">0 DZD</td>
            </tr>` : `
            <tr>
              <td><strong>${delivLabel}</strong></td>
              <td>—</td>
              <td class="center">1</td>
              <td class="right">${order.deliveryPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })} DZD</td>
              <td class="right">${order.deliveryPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })} DZD</td>
            </tr>`}
          </tbody>
        </table>

        <div style="display:flex;gap:24px;margin-top:10px;${language === 'ar' ? 'flex-direction:row-reverse' : ''}">
          <div class="summary" style="flex:1">
            <table>
              <tr><td class="label">${language === 'ar' ? 'مجموع المنتجات' : language === 'fr' ? 'Sous-total' : 'Subtotal'}</td><td class="value">${itemsTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })} DZD</td></tr>
              <tr><td class="label">${language === 'ar' ? 'سعر التوصيل' : language === 'fr' ? 'Livraison' : 'Delivery'}</td><td class="value">${order.freeDelivery ? (language === 'ar' ? 'مجاني' : language === 'fr' ? 'Gratuit' : 'Free') : `+${order.deliveryPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })} DZD`}</td></tr>
              <tr><td class="label" style="color:#ef4444">${language === 'ar' ? 'الخصم' : language === 'fr' ? 'Remise' : 'Discount'}</td><td class="value" style="color:#ef4444">${order.discount > 0 ? `-${order.discount.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '0'} DZD</td></tr>
              <tr class="line"><td class="label" style="font-weight:bold;font-size:13px">${language === 'ar' ? 'المجموع' : language === 'fr' ? 'Total' : 'Total'}</td><td class="value" style="font-weight:bold;font-size:13px;color:#2563eb">${order.total.toLocaleString(undefined, { maximumFractionDigits: 2 })} DZD</td></tr>
            </table>
          </div>
          <div style="flex:1">
            <table style="width:100%;font-size:12px;border-collapse:collapse">
              ${!simple && order.paidAmount > 0 ? `
              <tr><td class="label" style="padding:4px 8px;text-align:start;font-weight:bold">${language === 'ar' ? 'المبلغ المدفوع' : language === 'fr' ? 'Payé' : 'Paid'}</td><td class="value" style="padding:4px 8px;text-align:end;color:#16a34a;font-weight:bold">${order.paidAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} DZD</td></tr>
              <tr><td class="label" style="padding:4px 8px;text-align:start;font-weight:bold;color:#f97316">${language === 'ar' ? 'المتبقي من هذه الفاتورة' : language === 'fr' ? 'Reste de cette facture' : 'Remaining of this invoice'}</td><td class="value" style="padding:4px 8px;text-align:end;color:#f97316;font-weight:bold">${Math.max(0, itemsTotal - (order.discount || 0) - order.paidAmount).toLocaleString(undefined, { maximumFractionDigits: 2 })} DZD</td></tr>
              ` : ''}
            </table>
            ${!simple ? (() => { const totalDebt = Math.max(0, itemsTotal - (order.discount || 0) - order.paidAmount) + oldDebt; return totalDebt > 0 ? `
            <div class="grand-total">
              <table>
                <tr><td class="label">${language === 'ar' ? 'مجموع الديون الكلي' : language === 'fr' ? 'Total des dettes' : 'Total Debt'}</td><td class="value">${totalDebt.toLocaleString(undefined, { maximumFractionDigits: 2 })} DZD</td></tr>
              </table>
            </div>` : ''; })() : ''}
          </div>
        </div>

        ${order.isSwap ? `<div style="margin-top:6px;text-align:end;font-size:12px;color:#f97316;font-weight:bold">${language === 'ar' ? 'مبادلة' : language === 'fr' ? 'Échange' : 'Swap'}${order.swapRef ? ` (${language === 'ar' ? 'فاتورة' : language === 'fr' ? 'Facture' : 'Invoice'}: ${order.swapRef})` : ''}</div>` : ''}
        <div class="footer">${t('appName')}</div>
      </body></html>
    `);
    win.document.close();
    setTimeout(() => {
      win.focus();
      win.print();
    }, 300);
  };

  const printOrderRef = useRef(handlePrintOrder);
  printOrderRef.current = handlePrintOrder;
  const ordersRef2 = useRef(orders);
  ordersRef2.current = orders;
  const editIdRef = useRef(editId);
  editIdRef.current = editId;
  const searchRef2 = useRef(search);
  searchRef2.current = search;
  const showFormRef = useRef(showForm);
  showFormRef.current = showForm;
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyP' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        const id = editIdRef.current;
        const allOrders = ordersRef2.current;
        if (id && showFormRef.current) {
          const order = allOrders.find(o => o.id === id);
          if (order) { printOrderRef.current(order, true); return; }
        }
        const visible = allOrders.filter(o =>
          o.customerName?.toLowerCase().includes(searchRef2.current.toLowerCase()) ||
          o.orderNumber?.toLowerCase().includes(searchRef2.current.toLowerCase()) ||
          o.phone?.includes(searchRef2.current)
        );
        if (visible.length > 0) printOrderRef.current(visible[0]);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleStatusChange = (orderId: string, newStatus: Order['status']) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    if (newStatus === 'delivered' && order.status !== 'delivered') {
      if (order.status === 'returned') {
        order.items.forEach(item => removeFromReturnInventory(item.model, item.color, item.size, item.quantity, order.orderNumber));
      }
      updateOrder(orderId, { status: 'delivered' });
      addNotification({ type: 'delivery', message: `${t('delivered')}: ${order.customerName}` });
    } else if (newStatus === 'returned' && order.status !== 'returned') {
      order.items.forEach(item => {
        addToReturnInventory(item.model, item.color, item.size, item.quantity, order.orderNumber);
      });
      updateOrder(orderId, { status: 'returned', returnDate: new Date().toISOString().split('T')[0] });
      addNotification({ type: 'returned', message: `${t('returned')}: ${order.customerName}` });
      toast.success(t('returnProcessed'));
    } else if (newStatus === 'pending' && order.status !== 'pending') {
      if (order.status === 'returned') {
        order.items.forEach(item => removeFromReturnInventory(item.model, item.color, item.size, item.quantity, order.orderNumber));
      } else if (order.status === 'delivered') {
        order.items.forEach(item => restoreStock(item, order.source, order.orderNumber));
      }
      updateOrder(orderId, { status: 'pending' });
    }
  };

  const getCustomerDebt = (customerName: string, excludeId?: string): number => {
    return orders
      .filter(o => o.customerName === customerName && o.id !== excludeId)
      .reduce((sum, o) => {
        if (o.status === 'returned') {
          return sum + Math.max(0, (o.returnCost || 0) - (o.paidAmount || 0));
        }
        const itemsTotal = o.items.reduce((s, it) => s + it.sellingPrice * it.quantity, 0);
        return sum + Math.max(0, itemsTotal - (o.discount || 0) - (o.paidAmount || 0));
      }, 0);
  };

  const filtered = orders.filter(o =>
    o.customerName?.toLowerCase().includes(search.toLowerCase()) ||
    o.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
    o.phone?.includes(search)
  );

  const statusClass = (s: Order['status']) => {
    switch (s) {
      case 'delivered': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-medium';
      case 'returned': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-medium';
      default: return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 font-medium';
    }
  };

  const getAvail = (model: string, color: string): number => {
    const invItem = inventory.find(i => i.model === model);
    return invItem?.colors[color] || 0;
  };

  const sourceLabel = (item: OrderItem, orderSource: 1 | 2 | 3) => {
    const s = item.source || orderSource;
    if (s === 1) return t('table1');
    if (s === 2) return t('table2');
    return t('table3');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('orders')}</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={16} className="absolute top-1/2 -translate-y-1/2 start-3" style={{ color: 'var(--text-secondary)' }} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={focusNextInput} placeholder={t('search')} dir={language === 'ar' ? 'rtl' : 'ltr'}
              className="w-36 sm:w-48 md:w-64 ps-9 pe-4 py-2 rounded-xl border text-sm outline-none"
              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
          </div>
          <button onClick={openAddForm} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-all">
            <Plus size={16} /> <span className="hidden sm:inline">{t('add')}</span>
          </button>
        </div>
      </div>

      {/* Order Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-4 pb-10 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onClick={resetForm} />
          <div className="relative w-full max-w-6xl mx-2 sm:mx-4 rounded-2xl shadow-xl border p-4 sm:p-6" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              {editId ? t('editOrder') : t('addOrder')} #{orderNumber}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{t('customerName')}</label>
                  <input list="customer-list" type="text" value={customerName} onChange={e => {
                    setCustomerName(e.target.value);
                    clearFieldError('customerName');
                    const prev = orders.find(o => o.customerName === e.target.value);
                    if (prev) { setPhone(prev.phone); setWilaya(prev.wilaya); setCommune(prev.commune); setPlace(prev.place || ''); setDeliveryPrice(prev.deliveryPrice); setDeliveryCompany(prev.deliveryCompany); setNotes(prev.notes || ''); }
                  }} required onKeyDown={focusNextInput}
                    className={`w-full px-3 py-2 rounded-xl border text-sm outline-none ${fieldErrors.has('customerName') ? 'border-red-500' : ''}`}
                    style={{ backgroundColor: 'var(--bg-secondary)', borderColor: fieldErrors.has('customerName') ? undefined : 'var(--border-color)', color: 'var(--text-primary)' }} />
                  <datalist id="customer-list">
                    {[...new Set(orders.map(o => o.customerName).filter(Boolean))].map(n => <option key={n} value={n} />)}
                  </datalist>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{t('phone')}</label>
                  <input list="phone-list" type="text" value={phone} onChange={e => {
                    setPhone(e.target.value);
                    clearFieldError('phone');
                    const prev = orders.find(o => o.phone === e.target.value);
                    if (prev) { setCustomerName(prev.customerName); setWilaya(prev.wilaya); setCommune(prev.commune); setPlace(prev.place || ''); setDeliveryPrice(prev.deliveryPrice); setDeliveryCompany(prev.deliveryCompany); setNotes(prev.notes || ''); }
                  }} required onKeyDown={focusNextInput}
                    className={`w-full px-3 py-2 rounded-xl border text-sm outline-none ${fieldErrors.has('phone') ? 'border-red-500' : ''}`}
                    style={{ backgroundColor: 'var(--bg-secondary)', borderColor: fieldErrors.has('phone') ? undefined : 'var(--border-color)', color: 'var(--text-primary)' }} />
                  <datalist id="phone-list">
                    {[...new Set(orders.map(o => o.phone).filter(Boolean))].map(n => <option key={n} value={n} />)}
                  </datalist>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{t('orderNumber')}</label>
                  <input type="text" value={orderNumber} onChange={e => setOrderNumber(e.target.value)} onKeyDown={focusNextInput}
                    className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                    style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'العامل/مندوب' : language === 'fr' ? 'Ouvrier/Agent' : 'Worker/Agent'}</label>
                  <input type="text" value={agent} onChange={e => setAgent(e.target.value)} onKeyDown={focusNextInput}
                    list="agent-list"
                    className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                    style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                  <datalist id="agent-list">
                    {[...new Set([...workers.map(w => w.name).filter(Boolean), ...orders.map(o => o.agent).filter(Boolean)])].map(a => <option key={a} value={a} />)}
                  </datalist>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{t('source')}</label>
                   <select value={source} onChange={e => { setSource(Number(e.target.value) as 1 | 2 | 3); setItems([{ model: '', color: '', size: '', quantity: 1, productCost: 0, sellingPrice: 0 }]); }} onKeyDown={focusNextInput}
                    disabled={!!editId}
                    className="w-full px-3 py-2 rounded-xl border text-sm outline-none disabled:opacity-50"
                    style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
                    <option value={1}>{t('source1')}</option>
                    <option value={2}>{t('source2')}</option>
                    <option value={3}>{t('source3')}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{t('wilaya')}</label>
                   <select value={wilaya} onChange={e => { setWilaya(e.target.value); clearFieldError('wilaya'); }} required onKeyDown={focusNextInput}
                    className={`w-full px-3 py-2 rounded-xl border text-sm outline-none ${fieldErrors.has('wilaya') ? 'border-red-500' : ''}`}
                    style={{ backgroundColor: 'var(--bg-secondary)', borderColor: fieldErrors.has('wilaya') ? undefined : 'var(--border-color)', color: 'var(--text-primary)' }}>
                    <option value="">--</option>
                    {wilayas.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{t('commune')}</label>
                  <input type="text" value={commune} onChange={e => { setCommune(e.target.value); clearFieldError('commune'); }} required onKeyDown={focusNextInput}
                    className={`w-full px-3 py-2 rounded-xl border text-sm outline-none ${fieldErrors.has('commune') ? 'border-red-500' : ''}`}
                    style={{ backgroundColor: 'var(--bg-secondary)', borderColor: fieldErrors.has('commune') ? undefined : 'var(--border-color)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'المكان' : language === 'fr' ? 'Lieu' : 'Place'}</label>
                  <input type="text" value={place} onChange={e => { setPlace(e.target.value); clearFieldError('place'); }} onKeyDown={focusNextInput}
                    className={`w-full px-3 py-2 rounded-xl border text-sm outline-none ${fieldErrors.has('place') ? 'border-red-500' : ''}`}
                    style={{ backgroundColor: 'var(--bg-secondary)', borderColor: fieldErrors.has('place') ? undefined : 'var(--border-color)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{t('deliveryCompany')}</label>
                  <input list="delivery-list" type="text" value={deliveryCompany} onChange={e => setDeliveryCompany(e.target.value)} onKeyDown={focusNextInput}
                    className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                    style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                    placeholder={language === 'ar' ? 'شركة التوصيل' : language === 'fr' ? 'Société de livraison' : 'Delivery company'} />
                  <datalist id="delivery-list">
                    {deliveryCompanies.map(d => <option key={d} value={d} />)}
                  </datalist>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{t('deliveryType')}</label>
                   <select value={deliveryType} onChange={e => { setDeliveryType(e.target.value); clearFieldError('deliveryType'); }} onKeyDown={focusNextInput}
                    className={`w-full px-3 py-2 rounded-xl border text-sm outline-none ${fieldErrors.has('deliveryType') ? 'border-red-500' : ''}`}
                    style={{ backgroundColor: 'var(--bg-secondary)', borderColor: fieldErrors.has('deliveryType') ? undefined : 'var(--border-color)', color: 'var(--text-primary)' }}>
                    <option value="">--</option>
                    <option value="home">{language === 'ar' ? 'للمنزل' : language === 'fr' ? 'Domicile' : 'Home'}</option>
                    <option value="office">{language === 'ar' ? 'للمكتب' : language === 'fr' ? 'Bureau' : 'Office'}</option>
                  </select>
                </div>
              </div>

              {/* Order Items */}
              <div className="border rounded-xl p-3 sm:p-4" style={{ borderColor: 'var(--border-color)' }}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{t('orderItems')}</h3>
                  <button type="button" onClick={addItem} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium transition-all">
                    <Plus size={14} /> {t('addAnotherProduct')}
                  </button>
                </div>

                {items.map((item, idx) => {
                  const models = source === 1 ? inventory : source === 3 ? returnInventory : subInventory;
                  const matchedProduct = products.find(p => p.name === item.model);
                  const avail = item.model && item.color ? (source === 2 ? getSubStock(item.model, item.color, item.size) : source === 3 ? (returnInventory.find(i => i.model === item.model && i.color === item.color && i.size === item.size)?.quantity || 0) : getAvail(item.model, item.color)) : 0;
                  const insufficient = item.quantity > avail && item.color !== '' && item.model !== '';

                  const uniqueModels = [...new Set([...models.map(m => m.model), ...products.map(p => p.name)])];
                  const availableColors = source === 1
                    ? (inventory.find(i => i.model === item.model) ? Object.keys(inventory.find(i => i.model === item.model)!.colors).filter(c => (inventory.find(i => i.model === item.model)!.colors[c] || 0) > 0) : [])
                    : [...new Set((source === 2 ? subInventory : returnInventory).filter(m => m.model === item.model).map(m => m.color).filter(Boolean))];
                  const availableSizes = source === 2
                    ? [...new Set(subInventory.filter(i => i.model === item.model && i.color === item.color).map(i => i.size).filter(Boolean))]
                    : source === 3
                      ? [...new Set(returnInventory.filter(i => i.model === item.model && i.color === item.color).map(i => i.size).filter(Boolean))]
                      : [];
                  const allColors = source === 1 ? settings.colors : availableColors;

                  return (
                    <div key={idx} className="border rounded-xl p-3 mb-3 relative" style={{ borderColor: 'var(--border-color)' }}>
                      {items.length > 1 && (
                        <button type="button" onClick={() => removeItem(idx)} className="absolute top-2 end-2 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400">
                          <X size={14} />
                        </button>
                      )}
                      <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>#{idx + 1}</div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
                        <div>
                          <label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>{t('model')}</label>
                          <input type="text" value={item.model} onChange={e => { handleModelSelect(idx, e.target.value); clearFieldError(`model_${idx}`); }} onKeyDown={focusNextInput}
                            list="order-product-list"
                            className={`w-full px-2 py-1.5 rounded-lg border text-xs outline-none ${fieldErrors.has(`model_${idx}`) ? 'border-red-500' : ''}`}
                            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: fieldErrors.has(`model_${idx}`) ? undefined : 'var(--border-color)', color: 'var(--text-primary)' }}
                            placeholder={language === 'ar' ? 'اسم المنتج' : language === 'fr' ? 'Nom du produit' : 'Product name'} />
                          <datalist id="order-product-list">
                            {uniqueModels.map(n => <option key={n} value={n} />)}
                          </datalist>
                        </div>
                        <div>
                          <label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>{t('color')}</label>
                           <select value={item.color} onChange={e => { updateItem(idx, { color: e.target.value }); clearFieldError(`color_${idx}`); }} onKeyDown={focusNextInput}
                            className={`w-full px-2 py-1.5 rounded-lg border text-xs outline-none ${fieldErrors.has(`color_${idx}`) ? 'border-red-500' : ''}`}
                            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: fieldErrors.has(`color_${idx}`) ? undefined : 'var(--border-color)', color: 'var(--text-primary)' }}>
                            <option value="">--</option>
                            {allColors.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>{t('size')}</label>
                          {source === 1 ? (
                            <input type="text" value={item.size} onChange={e => { updateItem(idx, { size: e.target.value }); clearFieldError(`size_${idx}`); }} onKeyDown={focusNextInput}
                              className={`w-full px-2 py-1.5 rounded-lg border text-xs outline-none ${fieldErrors.has(`size_${idx}`) ? 'border-red-500' : ''}`}
                              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: fieldErrors.has(`size_${idx}`) ? undefined : 'var(--border-color)', color: 'var(--text-primary)' }} />
                          ) : (
                             <select value={item.size} onChange={e => { updateItem(idx, { size: e.target.value }); clearFieldError(`size_${idx}`); }} onKeyDown={focusNextInput}
                              className={`w-full px-2 py-1.5 rounded-lg border text-xs outline-none ${fieldErrors.has(`size_${idx}`) ? 'border-red-500' : ''}`}
                              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: fieldErrors.has(`size_${idx}`) ? undefined : 'var(--border-color)', color: 'var(--text-primary)' }}>
                              <option value="">--</option>
                              {availableSizes.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          )}
                        </div>
                        <div>
                          <label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>{t('quantity')}</label>
                          <input type="number" min="1" value={item.quantity} onChange={e => { updateItem(idx, { quantity: Number(e.target.value) }); clearFieldError(`qty_${idx}`); }}
                            onKeyDown={focusNextInput} onFocus={e => { if (Number(e.target.value) === 0) e.target.value = ''; }}
                            onBlur={e => { if (e.target.value === '') updateItem(idx, { quantity: 0 }); }}
                            className={`w-full px-2 py-1.5 rounded-lg border text-xs outline-none ${fieldErrors.has(`qty_${idx}`) ? 'border-red-500' : insufficient ? 'border-red-500 ring-2 ring-red-500/20' : stockColor(avail, item.quantity)}`}
                            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: fieldErrors.has(`qty_${idx}`) ? undefined : 'var(--border-color)', color: 'var(--text-primary)' }} />
                          {insufficient && <p className="text-[10px] text-red-500">{t('stock')}: {avail}</p>}
                        </div>
                        <div>
                          <label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>{t('productCost')}</label>
                          <div className="w-full px-2 py-1.5 rounded-lg border text-xs" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                            {item.productCost.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>{t('sellingPrice')}</label>
                          <input type="number" min="0" value={item.sellingPrice} onChange={e => updateItem(idx, { sellingPrice: Number(e.target.value) })}
                            onKeyDown={focusNextInput} onFocus={e => { if (Number(e.target.value) === 0) e.target.value = ''; }}
                            onBlur={e => { if (e.target.value === '') updateItem(idx, { sellingPrice: 0 }); }}
                            className={`w-full px-2 py-1.5 rounded-lg border text-xs outline-none ${item.sellingPrice === 0 ? 'opacity-30' : ''}`}
                            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                          {matchedProduct && (
                            <div className="flex gap-1 mt-1">
                              <button type="button" onClick={() => updateItem(idx, { sellingPrice: matchedProduct.wholesalePrice })}
                                className="flex-1 px-1 py-0.5 rounded text-[10px] border text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                                style={{ borderColor: 'var(--border-color)' }}>
                                {t('wholesalePrice')}: {matchedProduct.wholesalePrice.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج
                              </button>
                              <button type="button" onClick={() => updateItem(idx, { sellingPrice: matchedProduct.retailPrice })}
                                className="flex-1 px-1 py-0.5 rounded text-[10px] border text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                style={{ borderColor: 'var(--border-color)' }}>
                                {t('retailPrice')}: {matchedProduct.retailPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج
                              </button>
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>{t('fromWhere')}</label>
                           <select value={item.source || ''} onChange={e => updateItem(idx, { source: e.target.value ? Number(e.target.value) as 2 | 3 : undefined })} onKeyDown={focusNextInput}
                            className="w-full px-2 py-1.5 rounded-lg border text-xs outline-none"
                            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
                            <option value="">{t('table1')}</option>
                            <option value="2">{t('table2')}</option>
                            <option value="3">{t('table3')}</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="flex justify-between items-center pt-2">
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {language === 'ar' ? 'مجموع المنتجات' : language === 'fr' ? 'Sous-total' : 'Subtotal'}: <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{items.reduce((s, it) => s + it.sellingPrice * it.quantity, 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</span>
                    {discount > 0 && <> | {language === 'ar' ? 'خصم' : language === 'fr' ? 'Remise' : 'Discount'}: <span className="font-medium text-red-500">{discount.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</span></>}
                    {' | '}{t('deliveryPrice')}: <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{deliveryPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</span>
                    {' | '}<span className="text-lg font-bold text-blue-500">{t('total')}: {calcTotal().toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</span>
                    {paidAmount > 0 && <> | {language === 'ar' ? 'المدفوع' : language === 'fr' ? 'Payé' : 'Paid'}: <span className="font-medium text-green-500">{paidAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</span></>}
                    {paidAmount < calcTotal() && paidAmount > 0 && <> | {language === 'ar' ? 'المتبقي' : language === 'fr' ? 'Restant' : 'Remaining'}: <span className="font-medium text-orange-500">{(calcTotal() - paidAmount).toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</span></>}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{t('deliveryPrice')}</label>
<input type="number" min="0" value={deliveryPrice} onChange={e => setDeliveryPrice(Number(e.target.value))}
  onKeyDown={focusNextInput} onFocus={e => { if (Number(e.target.value) === 0) e.target.value = ''; }}
  className={`w-full px-3 py-2 rounded-xl border text-sm outline-none ${deliveryPrice === 0 ? 'opacity-30' : ''}`}
                    style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                  <button type="button" onClick={() => { setIsSwap(!isSwap); if (!isSwap) { setFreeDelivery(true); } }}
                    className={`mt-1 w-full px-2 py-1 rounded-lg text-xs font-medium border transition-all ${isSwap ? 'bg-orange-500 text-white border-orange-500' : 'bg-transparent text-orange-500 border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20'}`}>
                    {isSwap ? '✓ ' : ''}{language === 'ar' ? 'مبادلة' : language === 'fr' ? 'Échange' : 'Swap'}
                  </button>
                  <button type="button" onClick={() => setFreeDelivery(!freeDelivery)}
                    className={`mt-1 w-full px-2 py-1 rounded-lg text-xs font-medium border transition-all ${freeDelivery ? 'bg-green-500 text-white border-green-500' : 'bg-transparent text-green-500 border-green-300 hover:bg-green-50 dark:hover:bg-green-900/20'}`}>
                    {freeDelivery ? '✓ ' : ''}{language === 'ar' ? 'توصيل مجاني' : language === 'fr' ? 'Livraison gratuite' : 'Free Delivery'}
                  </button>
                  {isSwap && (
                     <select value={swapRef} onChange={e => setSwapRef(e.target.value)} onKeyDown={focusNextInput}
                      className={`mt-1 w-full px-2 py-1 rounded-lg text-xs border outline-none ${isSwap ? 'border-orange-300' : ''}`}
                      style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                      <option value="">{language === 'ar' ? 'اختر فاتورة للمبادلة' : language === 'fr' ? 'Choisir une facture' : 'Select invoice'}</option>
                      {orders.filter(o => o.customerName === customerName && o.id !== editId).map(o => (
                        <option key={o.id} value={o.orderNumber}>{t('invoice')} #{o.orderNumber} - {o.date}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'المبلغ المدفوع' : language === 'fr' ? 'Montant payé' : 'Paid Amount'}</label>
                  <input type="number" min="0" value={paidAmount} onChange={e => { setPaidAmount(Number(e.target.value)); paidTouched.current = true; }}
                    onKeyDown={focusNextInput} onFocus={e => { if (Number(e.target.value) === 0) e.target.value = ''; }}

                    className={`w-full px-3 py-2 rounded-xl border text-sm outline-none ${paidAmount === 0 ? 'opacity-30' : ''}`}
                    style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'الخصم' : language === 'fr' ? 'Remise' : 'Discount'}</label>
                  <input type="number" min="0" value={discount} onChange={e => setDiscount(Number(e.target.value))}
                    onKeyDown={focusNextInput} onFocus={e => { if (Number(e.target.value) === 0) e.target.value = ''; }}
                    className={`w-full px-3 py-2 rounded-xl border text-sm outline-none ${discount === 0 ? 'opacity-30' : ''}`}
                    style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{t('status')}</label>
                   <select value={status} onChange={e => setStatus(e.target.value as Order['status'])} onKeyDown={focusNextInput}
                    className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                    style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
                    {orderStatuses.map(s => <option key={s} value={s}>{t(s)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{t('returnCost')}</label>
<input type="number" min="0" value={returnCost} onChange={e => setReturnCost(Number(e.target.value))}
  onKeyDown={focusNextInput} onFocus={e => { if (Number(e.target.value) === 0) e.target.value = ''; }}
  onBlur={e => { if (e.target.value === '') { setReturnCost(300) } }}
  className={`w-full px-3 py-2 rounded-xl border text-sm outline-none ${returnCost === 0 ? 'opacity-30' : ''}`}
                    style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{t('notes')}</label>
                  <input type="text" value={notes} onChange={e => setNotes(e.target.value)} onKeyDown={focusNextInput}
                    className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                    style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
                <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                  {t('total')}: <span className="text-blue-500">{calcTotal().toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</span>
                </p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => {
                    if (editId) { const o = orders.find(x => x.id === editId); if (o) handlePrintOrder(o, true); }
                    else {
                      const tmp = {
                        id: 'tmp', orderNumber, customerName, phone, wilaya, commune, place: '', agent: '',
                        date: new Date().toISOString().split('T')[0], deliveryCompany, deliveryType, freeDelivery, notes: '', status: status as Order['status'],
                        items: items.map(i => ({ model: i.model, color: i.color, size: i.size, quantity: i.quantity, sellingPrice: i.sellingPrice })),
                        deliveryPrice, discount: discount || 0, paidAmount: paidAmount || 0, total: calcTotal(),
                        isSwap: false, swapRef: '', returnCost, returnDate: '', source: 1,
                      } as Order;
                      handlePrintOrder(tmp, true);
                    }
                  }} className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                    <Printer size={16} /> {t('print')}
                  </button>
                  <button type="button" onClick={resetForm} className="px-4 py-2 rounded-xl border text-sm" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>{t('cancel')}</button>
                  <button type="submit" className="flex items-center gap-2 px-6 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-all">
                    <ShoppingBag size={16} />
                    {editId ? t('editOrder') : t('submitOrder')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') handleDelete(deleteConfirm); }}>
          <div className="fixed inset-0 bg-black/50" onClick={() => setDeleteConfirm(null)} />
          <div className="relative w-full max-w-sm mx-4 rounded-2xl shadow-xl border p-6 text-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <Trash2 size={40} className="mx-auto text-red-500 mb-3" />
            <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{t('confirmDelete')}</h3>
            <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>{t('thisActionCannotBeUndone')}</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 rounded-xl border text-sm" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>{t('cancel')}</button>
              <button autoFocus onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium">{t('delete')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Clear debt confirm */}
      {clearDebtConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setClearDebtConfirm(null)} />
          <div className="relative w-full max-w-sm mx-4 rounded-2xl shadow-xl border p-6 text-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              {language === 'ar' ? 'تصفية الديون' : language === 'fr' ? 'Effacer les dettes' : 'Clear Debts'}
            </h3>
            <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
              {language === 'ar' ? `هل أنت متأكد من تصفية جميع ديون ${clearDebtConfirm}؟` : language === 'fr' ? `Effacer toutes les dettes de ${clearDebtConfirm} ?` : `Clear all debts of ${clearDebtConfirm}?`}
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setClearDebtConfirm(null)} className="px-4 py-2 rounded-xl border text-sm" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>{t('cancel')}</button>
              <button onClick={() => handleClearDebt(clearDebtConfirm)} className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium">
                {language === 'ar' ? 'تصفية' : language === 'fr' ? 'Effacer' : 'Clear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Orders Table */}
      <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ color: 'var(--text-primary)' }}>
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                {[t('date'), t('customerName'), t('phone'), t('orderNumber'), language === 'ar' ? 'العامل/مندوب' : language === 'fr' ? 'Ouvrier' : 'Agent', t('model'), t('color'), t('size'), t('quantity'), t('fromWhere'), t('wilaya'), t('commune'), language === 'ar' ? 'المكان' : language === 'fr' ? 'Lieu' : 'Place', t('sellingPrice'), t('deliveryPrice'), t('total'), t('status'), t('deliveryCompany'), t('deliveryType'), language === 'ar' ? 'مدفوع' : language === 'fr' ? 'Payé' : 'Paid', ''].map(h => (
                  <th key={h} className="px-2 py-2.5 text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap text-start" style={{ color: 'var(--text-secondary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={19} className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>{t('noOrders')}</td></tr>
              ) : (
                filtered.flatMap(order =>
                  order.items.length === 0
                    ? [(
                      <tr key={order.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors" style={{ borderColor: 'var(--border-color)' }}>
                        <td className="px-2 py-2.5 whitespace-nowrap text-xs">{order.date}</td>
                        <td className="px-2 py-2.5 font-medium whitespace-nowrap text-xs">{order.customerName}</td>
                        <td className="px-2 py-2.5 whitespace-nowrap text-xs">{order.phone}</td>
                        <td className="px-2 py-2.5 whitespace-nowrap text-xs">{order.orderNumber}</td>
                        <td className="px-2 py-2.5 whitespace-nowrap text-xs">{order.agent || '—'}</td>
                        <td colSpan={4} className="px-2 py-2.5 text-xs italic" style={{ color: 'var(--text-secondary)' }}>—</td>
                        <td className="px-2 py-2.5 whitespace-nowrap text-xs">{order.place || '—'}</td>
                        <td className="px-2 py-2.5 whitespace-nowrap text-xs">{order.wilaya}</td>
                        <td className="px-2 py-2.5 whitespace-nowrap text-xs">{order.commune}</td>
                        <td colSpan={3} className="px-2 py-2.5 text-xs">—</td>
                        <td className="px-2 py-2.5 whitespace-nowrap text-xs">{order.deliveryCompany}</td>
                        <td className="px-2 py-2.5 whitespace-nowrap text-xs">{order.deliveryType === 'home' ? (language === 'ar' ? 'للمنزل' : language === 'fr' ? 'Domicile' : 'Home') : order.deliveryType === 'office' ? (language === 'ar' ? 'للمكتب' : language === 'fr' ? 'Bureau' : 'Office') : order.deliveryType}</td>
                        <td className="px-2 py-2.5 whitespace-nowrap text-xs">
                          <span className="text-green-600 font-medium">{order.paidAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                          {order.paidAmount < order.total && <span className="text-red-500 text-[10px] block">
                            {language === 'ar' ? 'باقي' : language === 'fr' ? 'Reste' : 'Left'}: {(order.total - order.paidAmount).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            <button onClick={() => setClearDebtConfirm(order.customerName)}
                              className="mt-1 px-1.5 py-0.5 rounded text-[9px] bg-orange-500 text-white hover:bg-orange-600 block">
                              {language === 'ar' ? 'تصفية' : language === 'fr' ? 'Effacer' : 'Clear'}
                            </button>
                          </span>}
                        </td>
                        <td className="px-2 py-2.5 whitespace-nowrap">
                          <div className="flex gap-1">
                            <button onClick={() => handleEdit(order)} className="p-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 transition-colors"><Edit2 size={13} /></button>
                            <button onClick={() => handlePrintOrder(order)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"><Printer size={13} /></button>
                            <button onClick={() => setDeleteConfirm(order.id)} className="p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    )]
                    : order.items.map((item, idx) => (
                      <tr key={`${order.id}-${idx}`} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors" style={{ borderColor: 'var(--border-color)' }}>
                        <td className="px-2 py-2.5 whitespace-nowrap text-xs">{idx === 0 ? order.date : ''}</td>
                        <td className="px-2 py-2.5 font-medium whitespace-nowrap text-xs">{idx === 0 ? order.customerName : ''}</td>
                        <td className="px-2 py-2.5 whitespace-nowrap text-xs">{idx === 0 ? order.phone : ''}</td>
                        <td className="px-2 py-2.5 whitespace-nowrap text-xs">{idx === 0 ? order.orderNumber : ''}</td>
                        <td className="px-2 py-2.5 whitespace-nowrap text-xs">{idx === 0 ? (order.agent || '—') : ''}</td>
                        <td className="px-2 py-2.5 whitespace-nowrap text-xs">{item.model}</td>
                        <td className="px-2 py-2.5 whitespace-nowrap text-xs">{item.color}</td>
                        <td className="px-2 py-2.5 whitespace-nowrap text-xs">{item.size}</td>
                        <td className="px-2 py-2.5 text-center text-xs">{item.quantity}</td>
                        <td className={`px-2 py-2.5 whitespace-nowrap text-xs ${stockBgColor(order.source === 2 ? getSubStock(item.model, item.color, item.size) : order.source === 3 ? (returnInventory.find(r => r.model === item.model && r.color === item.color && r.size === item.size)?.quantity || 0) : getAvail(item.model, item.color))}`}>
                          {sourceLabel(item, order.source)}
                        </td>
                        <td className="px-2 py-2.5 whitespace-nowrap text-xs">{idx === 0 ? order.wilaya : ''}</td>
                        <td className="px-2 py-2.5 whitespace-nowrap text-xs">{idx === 0 ? order.commune : ''}</td>
                        <td className="px-2 py-2.5 whitespace-nowrap text-xs">{idx === 0 ? (order.place || '—') : ''}</td>
                        <td className="px-2 py-2.5 whitespace-nowrap text-xs">{item.sellingPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                        <td className="px-2 py-2.5 whitespace-nowrap text-xs text-center">{idx === 0 ? order.deliveryPrice.toLocaleString(undefined, { maximumFractionDigits: 2 }) : ''}</td>
                        <td className="px-2 py-2.5 whitespace-nowrap text-xs font-medium text-blue-500">{(item.sellingPrice * item.quantity).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                        <td className="px-1 py-2.5 whitespace-nowrap">
                           <select value={order.status} onChange={e => handleStatusChange(order.id, e.target.value as Order['status'])} onKeyDown={focusNextInput}
                            className={`px-1 py-1 rounded border text-[11px] outline-none w-20 ${statusClass(order.status)}`}
                            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
                            {orderStatuses.map(s => <option key={s} value={s}>{t(s)}</option>)}
                          </select>
                        </td>
                        <td className="px-2 py-2.5 whitespace-nowrap text-xs">{idx === 0 ? order.deliveryCompany : ''}</td>
                        <td className="px-2 py-2.5 whitespace-nowrap text-xs">{idx === 0 ? (order.deliveryType === 'home' ? (language === 'ar' ? 'للمنزل' : language === 'fr' ? 'Domicile' : 'Home') : order.deliveryType === 'office' ? (language === 'ar' ? 'للمكتب' : language === 'fr' ? 'Bureau' : 'Office') : order.deliveryType || '') : ''}</td>
                        <td className="px-2 py-2.5 whitespace-nowrap text-xs">
                          {idx === 0 ? <>
                            <span className="text-green-600 font-medium">{order.paidAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                            {order.paidAmount < order.total && <span className="text-red-500 text-[10px] block">
                              {language === 'ar' ? 'باقي' : language === 'fr' ? 'Reste' : 'Left'}: {(order.total - order.paidAmount).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                              <button onClick={() => setClearDebtConfirm(order.customerName)}
                                className="mt-1 px-1.5 py-0.5 rounded text-[9px] bg-orange-500 text-white hover:bg-orange-600 block">
                                {language === 'ar' ? 'تصفية' : language === 'fr' ? 'Effacer' : 'Clear'}
                              </button>
                            </span>}
                          </> : ''}
                        </td>
                        <td className="px-2 py-2.5 whitespace-nowrap">
                          <div className="flex gap-1">
                            <button onClick={() => handleEdit(order)} className="p-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 transition-colors"><Edit2 size={13} /></button>
                            {idx === 0 && <button onClick={() => handlePrintOrder(order)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"><Printer size={13} /></button>}
                            <button onClick={() => setDeleteConfirm(order.id)} className="p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    ))
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
