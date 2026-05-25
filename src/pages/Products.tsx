import { useState, useMemo } from 'react';
import { focusNextInput, clearZeroOnFocus } from '../shared/formHelpers';
import { useTranslation } from '../i18n/useTranslation';
import { useAppContext } from '../store/AppContext';
import type { PurchaseItem } from '../types';
import { Edit2, Trash2, Package, Plus, ShoppingCart, Printer, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Products() {
  const { t, language } = useTranslation();
  const { products, deleteProduct, suppliers, purchaseOrders, addPurchaseOrder, deletePurchaseOrder, updatePurchaseOrder, updateSupplier, getNextInvoiceNumber, password, settings, updateSettings, inventory, setInventory, subInventory, setSubInventory, setProducts, addToTrash, revertPurchaseOrderStock } = useAppContext();
  const today = new Date().toISOString().split('T')[0];
  const [poDate, setPoDate] = useState(today);
  const [poSupplier, setPoSupplier] = useState('');
  const [poInvoiceNo, setPoInvoiceNo] = useState(getNextInvoiceNumber());
  const [poItems, setPoItems] = useState<PurchaseItem[]>([{ productName: '', color: '', size: '', quantity: 1, costPrice: 0, wholesalePct: 0, retailPct: 0, targetTable: 1 }]);
  const [poEditId, setPoEditId] = useState<string | null>(null);
  const [poPaymentAmount, setPoPaymentAmount] = useState(0);
  const [poPaymentEditId, setPoPaymentEditId] = useState<string | null>(null);
  const [poPaymentModalOpen, setPoPaymentModalOpen] = useState(false);
  const [poPaymentInput, setPoPaymentInput] = useState(0);
  const [poPaymentDateInput, setPoPaymentDateInput] = useState(poDate);
  const [poPasswordModal, setPoPasswordModal] = useState<string | null>(null);
  const [poPasswordInput, setPoPasswordInput] = useState('');
  const [newColorInput, setNewColorInput] = useState('');
  const [showColorInput, setShowColorInput] = useState<number | null>(null);
  const [poDeleteId, setPoDeleteId] = useState<string | null>(null);
  const [quickPayOpen, setQuickPayOpen] = useState(false);
  const [quickPaySupplier, setQuickPaySupplier] = useState('');
  const [quickPayAmount, setQuickPayAmount] = useState('');
  const [quickPayDate, setQuickPayDate] = useState(today);
  const colorList = settings.colors;

  const poSupplierDebt = useMemo(() => {
    if (!poSupplier) return 0;
    return purchaseOrders
      .filter(po => po.supplierName === poSupplier)
      .reduce((s, po) => s + po.total - (po.payments ?? []).reduce((ps, p) => ps + p.amount, 0), 0);
  }, [poSupplier, purchaseOrders]);

  const poSupplierPayments = useMemo(() => {
    if (!poSupplier) return [];
    const supplier = suppliers.find(s => s.name === poSupplier);
    return supplier?.payments ?? [];
  }, [poSupplier, suppliers]);

  const poUpdateItem = (idx: number, data: Partial<PurchaseItem>) => {
    setPoItems(prev => prev.map((item, i) => i === idx ? { ...item, ...data } : item));
  };

  const handlePoWsPct = (idx: number, pct: number) => {
    const rounded = Math.round(pct * 10) / 10;
    setPoItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const cost = item.costPrice;
      return { ...item, wholesalePct: rounded, wholesalePrice: cost > 0 ? Math.round((cost + cost * rounded / 100) * 10) / 10 : 0 };
    }));
  };
  const handlePoWsPrice = (idx: number, price: number) => {
    setPoItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const cost = item.costPrice;
      return { ...item, wholesalePrice: price, wholesalePct: cost > 0 ? Math.round(((price - cost) / cost) * 100 * 10) / 10 : 0 };
    }));
  };
  const handlePoRtPct = (idx: number, pct: number) => {
    const rounded = Math.round(pct * 10) / 10;
    setPoItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const cost = item.costPrice;
      return { ...item, retailPct: rounded, retailPrice: cost > 0 ? Math.round((cost + cost * rounded / 100) * 10) / 10 : 0 };
    }));
  };
  const handlePoRtPrice = (idx: number, price: number) => {
    setPoItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const cost = item.costPrice;
      return { ...item, retailPrice: price, retailPct: cost > 0 ? Math.round(((price - cost) / cost) * 100 * 10) / 10 : 0 };
    }));
  };

  const poAddItem = () => {
    setPoItems(prev => [...prev, { productName: '', color: '', size: '', quantity: 1, costPrice: 0, wholesalePct: 0, retailPct: 0, targetTable: 1 }]);
  };

  const poRemoveItem = (idx: number) => {
    if (poItems.length <= 1) return;
    setPoItems(prev => prev.filter((_, i) => i !== idx));
  };

  function poCalcTotal() { return poItems.reduce((s, item) => s + item.costPrice * item.quantity, 0); }

  const poResetForm = () => {
    setPoDate(today);
    setPoSupplier('');
    setPoItems([{ productName: '', color: '', size: '', quantity: 1, costPrice: 0, wholesalePct: 0, retailPct: 0, targetTable: 1 }]);
    setPoInvoiceNo(getNextInvoiceNumber());
    setPoEditId(null);
    setPoPaymentAmount(0);
    setPoPaymentEditId(null);
    setPoPaymentModalOpen(false);
    setPoPaymentInput(0);
    setPoPaymentDateInput(today);
  };

  const poSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!poSupplier.trim()) { toast.error(language === 'ar' ? 'اختر المورد' : language === 'fr' ? 'Choisissez le fournisseur' : 'Select supplier'); return; }
    for (const item of poItems) {
      if (!item.productName || !item.color || item.quantity < 1) { toast.error(language === 'ar' ? 'املأ جميع الحقول' : language === 'fr' ? 'Remplissez tous les champs' : 'Fill all fields'); return; }
      if (item.targetTable === 2 && !item.size) { toast.error(language === 'ar' ? 'الجدول 2 يتطلب كتابة المقاس' : language === 'fr' ? 'Le tableau 2 nécessite la taille' : 'Table 2 requires size'); return; }
    }
    if (poEditId) {
      const oldPo = purchaseOrders.find(p => p.id === poEditId);
      // Reverse old items from inventory
      let invRollback = [...inventory];
      let subRollback = [...subInventory];
      if (oldPo) {
        for (const item of oldPo.items) {
          if (item.targetTable === 1) {
            const idx = invRollback.findIndex(i => i.model === item.productName);
            if (idx >= 0) {
              const cur = (invRollback[idx].colors[item.color] || 0) - item.quantity;
              const updated = { ...invRollback[idx], colors: { ...invRollback[idx].colors, [item.color]: Math.max(0, cur) } };
              invRollback = [...invRollback.slice(0, idx), updated, ...invRollback.slice(idx + 1)];
            }
          } else {
            const idx = subRollback.findIndex(i => i.model === item.productName && i.color === item.color && i.size === item.size);
            if (idx >= 0) {
              const updated = { ...subRollback[idx], quantity: Math.max(0, subRollback[idx].quantity - item.quantity) };
              subRollback = [...subRollback.slice(0, idx), updated, ...subRollback.slice(idx + 1)];
            }
          }
        }
      }
      // Apply new items
      for (const item of poItems) {
        if (item.targetTable === 1) {
          const idx = invRollback.findIndex(i => i.model === item.productName);
          if (idx >= 0) {
            invRollback[idx] = { ...invRollback[idx], colors: { ...invRollback[idx].colors, [item.color]: (invRollback[idx].colors[item.color] || 0) + item.quantity } };
          } else {
            invRollback.push({ model: item.productName, colors: { [item.color]: item.quantity } });
          }
        } else {
          const idx = subRollback.findIndex(i => i.model === item.productName && i.color === item.color && i.size === item.size);
          if (idx >= 0) {
            subRollback[idx] = { ...subRollback[idx], quantity: subRollback[idx].quantity + item.quantity };
          } else {
            subRollback.push({ model: item.productName, color: item.color, size: item.size, quantity: item.quantity });
          }
        }
      }
      const editHistory = [...(oldPo?.editHistory ?? []), today];
      setInventory(invRollback);
      setSubInventory(subRollback);
      updatePurchaseOrder(poEditId, {
        invoiceNumber: poInvoiceNo,
        supplierName: poSupplier,
        date: poDate,
        items: poItems.map(i => ({ ...i })),
        total: poCalcTotal(),
        paymentAmount: poPaymentAmount > 0 ? poPaymentAmount : undefined,
        editHistory,
      });
      toast.success(language === 'ar' ? 'تم تحديث الفاتورة' : language === 'fr' ? 'Facture mise à jour' : 'Invoice updated');
    } else {
      addPurchaseOrder({
        id: Date.now().toString(),
        invoiceNumber: poInvoiceNo,
        supplierName: poSupplier,
        date: poDate,
        items: poItems.map(i => ({ ...i })),
        total: poCalcTotal(),
        paymentAmount: poPaymentAmount > 0 ? poPaymentAmount : undefined,
        payments: poPaymentAmount > 0 ? [{ id: Date.now().toString(), date: poDate, amount: poPaymentAmount }] : undefined,
      });
      if (poPaymentAmount > 0) {
        const supplier = suppliers.find(s => s.name === poSupplier);
        if (supplier) {
          const newPayment = { id: Date.now().toString(), date: poDate, amount: poPaymentAmount };
          updateSupplier(supplier.id, { payments: [...(supplier.payments ?? []), newPayment] });
        }
      }
      let updatedProducts = [...products];
      for (const item of poItems) {
        const wsPct = item.wholesalePct ?? 0;
        const rtPct = item.retailPct ?? 0;
        const wsPrice = item.wholesalePrice ?? 0;
        const rtPrice = item.retailPrice ?? 0;
        if (item.targetTable === 1) {
          const existingIdx = updatedProducts.findIndex(p => p.name === item.productName);
          if (existingIdx >= 0) {
            updatedProducts[existingIdx] = {
              ...updatedProducts[existingIdx],
              wholesaleCostPrice: item.costPrice,
              wholesalePercentage: wsPct,
              wholesalePrice: wsPrice,
              retailCostPrice: item.costPrice,
              retailPercentage: rtPct,
              retailPrice: rtPrice,
            };
          } else {
            updatedProducts.push({
              id: Date.now().toString() + item.productName,
              name: item.productName,
              wholesaleCostPrice: item.costPrice,
              wholesalePercentage: wsPct,
              wholesalePrice: wsPrice,
              retailCostPrice: item.costPrice,
              retailPercentage: rtPct,
              retailPrice: rtPrice,
              colors: [{ name: item.color, quantity: item.quantity }],
            });
          }
        }
      }
      setProducts(updatedProducts);
      // Route items to their tables
      const invCopy = [...inventory];
      const subCopy = [...subInventory];
      for (const item of poItems) {
        if (item.targetTable === 1) {
          const existingIdx = invCopy.findIndex(i => i.model === item.productName);
          if (existingIdx >= 0) {
            invCopy[existingIdx] = {
              ...invCopy[existingIdx],
              colors: { ...invCopy[existingIdx].colors, [item.color]: (invCopy[existingIdx].colors[item.color] || 0) + item.quantity },
            };
          } else {
            invCopy.push({ model: item.productName, colors: { [item.color]: item.quantity } });
          }
        } else {
          const existingIdx = subCopy.findIndex(i => i.model === item.productName && i.color === item.color && i.size === item.size);
          if (existingIdx >= 0) {
            subCopy[existingIdx] = { ...subCopy[existingIdx], quantity: subCopy[existingIdx].quantity + item.quantity };
          } else {
            subCopy.push({ model: item.productName, color: item.color, size: item.size, quantity: item.quantity });
          }
        }
      }
      setInventory(invCopy);
      setSubInventory(subCopy);
      toast.success(language === 'ar' ? 'تم حفظ الفاتورة' : language === 'fr' ? 'Facture enregistrée' : 'Invoice saved');
    }
    poResetForm();
  };

  const handlePrintPO = (po: typeof purchaseOrders[0]) => {
    const win = window.open('', '_blank');
    if (!win) return;
    const lang = language;
    const supplier = suppliers.find(s => s.name === po.supplierName);
    const poPayments = po.payments ?? [];
    const totalPaid = poPayments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = po.total - totalPaid;
    const itemRows = po.items.map(item =>
      `<tr>
        <td>${item.productName}${item.color ? ` (${item.color})` : ''}${item.size ? ` - ${item.size}` : ''}</td>
        <td style="text-align:center">${item.quantity}</td>
        <td style="text-align:right">${item.costPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })} DZD</td>
        <td style="text-align:right">${(item.costPrice * item.quantity).toLocaleString(undefined, { maximumFractionDigits: 2 })} DZD</td>
      </tr>`
    ).join('');
    const paymentRows = poPayments.length > 0 ? poPayments.map(p =>
      `<tr>
        <td>${p.date}</td>
        <td style="text-align:right">${p.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} DZD</td>
      </tr>`
    ).join('') : `<tr><td colspan="2" style="text-align:center;color:#999">${lang === 'ar' ? 'لا توجد دفعات' : lang === 'fr' ? 'Aucun paiement' : 'No payments'}</td></tr>`;
    win.document.write(`
      <html dir="${lang === 'ar' ? 'rtl' : 'ltr'}">
      <head><title>${t('purchaseInvoice')}</title>
      <style>
        @page { margin: 15mm; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', 'Traditional Arabic', sans-serif; padding: 30px; color: #1a1a2e; max-width: 800px; margin: auto; }
        h1 { text-align: center; font-size: 22px; margin-bottom: 24px; border-bottom: 2px solid #1a1a2e; padding-bottom: 12px; }
        .info { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 13px; flex-wrap: wrap; gap: 8px; }
        .info div { line-height: 1.8; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
        th { background: #1a1a2e; color: white; padding: 8px 10px; font-size: 12px; }
        td { padding: 8px 10px; border-bottom: 1px solid #e9ecef; }
        tfoot td { font-weight: bold; border-top: 2px solid #1a1a2e; }
        .total-label { text-align: ${lang === 'ar' ? 'start' : 'end'}; }
        .total-value { text-align: right; color: #2563eb; font-size: 16px; }
        .section-title { font-size: 14px; font-weight: bold; margin: 20px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #ccc; }
        .summary { margin-top: 20px; font-size: 14px; line-height: 2; }
        .summary .label { font-weight: bold; }
        .summary .paid { color: #22c55e; }
        .summary .remaining { color: ${remaining > 0 ? '#dc2626' : '#22c55e'}; font-weight: bold; }
        .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #6c757d; border-top: 1px solid #e9ecef; padding-top: 12px; }
      </style>
      </head><body>
        <h1>${t('purchaseInvoice')}</h1>
        <div class="info">
          <div>
            <strong>${t('supplierName')}:</strong> ${po.supplierName}<br>
            ${supplier?.phone ? `<strong>${lang === 'ar' ? 'الهاتف' : lang === 'fr' ? 'Tél' : 'Phone'}:</strong> ${supplier.phone}<br>` : ''}
            ${supplier?.address ? `<strong>${lang === 'ar' ? 'العنوان' : lang === 'fr' ? 'Adresse' : 'Address'}:</strong> ${supplier.address}` : ''}
          </div>
          <div style="text-align:${lang === 'ar' ? 'start' : 'end'}">
            <strong>${t('invoiceNo')}:</strong> INV-${po.invoiceNumber}<br>
            <strong>${t('date')}:</strong> ${po.date}
          </div>
        </div>
        <div class="section-title">${lang === 'ar' ? 'المنتجات' : lang === 'fr' ? 'Produits' : 'Products'}</div>
        <table>
          <thead><tr>
            <th>${t('productName')}</th>
            <th style="text-align:center">${t('quantity')}</th>
            <th style="text-align:right">${t('productCost')}</th>
            <th style="text-align:right">${t('total')}</th>
          </tr></thead>
          <tbody>${itemRows}</tbody>
          <tfoot><tr>
            <td colspan="3" class="total-label">${t('total')}</td>
            <td class="total-value">${po.total.toLocaleString(undefined, { maximumFractionDigits: 2 })} DZD</td>
          </tr></tfoot>
        </table>
        <div class="section-title">${lang === 'ar' ? 'سجل الدفعات' : lang === 'fr' ? 'Historique des paiements' : 'Payment History'}</div>
        <table>
          <thead><tr>
            <th>${lang === 'ar' ? 'التاريخ' : lang === 'fr' ? 'Date' : 'Date'}</th>
            <th style="text-align:right">${lang === 'ar' ? 'المبلغ' : lang === 'fr' ? 'Montant' : 'Amount'}</th>
          </tr></thead>
          <tbody>${paymentRows}</tbody>
        </table>
        <div class="summary">
          <div><span class="label">${t('total')}:</span> ${po.total.toLocaleString(undefined, { maximumFractionDigits: 2 })} DZD</div>
          <div><span class="label">${lang === 'ar' ? 'المدفوع' : lang === 'fr' ? 'Payé' : 'Paid'}:</span> <span class="paid">${totalPaid.toLocaleString(undefined, { maximumFractionDigits: 2 })} DZD</span></div>
          <div><span class="label">${lang === 'ar' ? 'المتبقي' : lang === 'fr' ? 'Reste' : 'Remaining'}:</span> <span class="remaining">${remaining.toLocaleString(undefined, { maximumFractionDigits: 2 })} DZD</span></div>
        </div>
        <div class="footer">${t('appName')}</div>
      </body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  const poStartEdit = (po: typeof purchaseOrders[0]) => {
    setPoPasswordModal(po.id);
    setPoPasswordInput('');
  };

  const poStartDelete = (po: typeof purchaseOrders[0]) => {
    setPoDeleteId(po.id);
    setPoPasswordInput('');
  };

  const poConfirmEdit = () => {
    if (poPasswordInput !== password) {
      toast.error(t('wrongPassword'));
      return;
    }
    const po = purchaseOrders.find(p => p.id === poPasswordModal);
    if (!po) return;
    setPoDate(po.date);
    setPoSupplier(po.supplierName);
    setPoInvoiceNo(po.invoiceNumber);
    setPoItems(po.items.map(i => ({ ...i })));
    setPoEditId(po.id);
    setPoPasswordModal(null);
    setPoPasswordInput('');
  };

  const poConfirmDelete = () => {
    if (poPasswordInput !== password) {
      toast.error(t('wrongPassword'));
      return;
    }
    const po = purchaseOrders.find(p => p.id === poDeleteId);
    if (!po) return;
    revertPurchaseOrderStock(po);
    addToTrash(po);
    deletePurchaseOrder(po.id);
    // Auto-delete products that now have zero stock and no other POs
    const invAfter = inventory.map(i => ({ ...i, colors: { ...i.colors } }));
    const subAfter = [...subInventory];
    po.items.forEach(item => {
      if (item.targetTable === 1) {
        const idx = invAfter.findIndex(i => i.model === item.productName);
        if (idx >= 0) {
          const newQty = Math.max(0, (invAfter[idx].colors[item.color] || 0) - item.quantity);
          if (newQty === 0) {
            delete invAfter[idx].colors[item.color];
          } else {
            invAfter[idx].colors[item.color] = newQty;
          }
        }
      } else {
        const idx = subAfter.findIndex(i => i.model === item.productName && i.color === item.color && i.size === item.size);
        if (idx >= 0) subAfter[idx].quantity = Math.max(0, subAfter[idx].quantity - item.quantity);
      }
    });
    po.items.forEach(item => {
      const prod = products.find(p => p.name === item.productName);
      if (!prod) return;
      const stillInPOs = purchaseOrders.some(po2 => po2.id !== po.id && po2.items.some(it => it.productName === item.productName));
      if (stillInPOs) return;
      const totalQty = Object.values(invAfter.find(i => i.model === item.productName)?.colors ?? {}).reduce((a, b) => a + b, 0);
      if (totalQty === 0) deleteProduct(prod.id);
    });
    setPoDeleteId(null);
    setPoPasswordInput('');
    toast.success(t('deleted'));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('products')}</h1>
      </div>

      {/* Purchase Invoice Section */}
      <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <ShoppingCart size={18} className="text-blue-500" />
          <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{t('purchaseInvoice')}</h3>
          {poEditId && <span className="text-xs text-orange-500 ms-2">({t('edit')})</span>}
        </div>
        <form onSubmit={poSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{t('date')}</label>
              <input type="date" value={poDate} onChange={e => setPoDate(e.target.value)} onKeyDown={focusNextInput} onFocus={clearZeroOnFocus}
                className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{t('supplierName')}</label>
               <select value={poSupplier} onChange={e => { setPoSupplier(e.target.value); if (!poEditId) setPoInvoiceNo(getNextInvoiceNumber()); }} onKeyDown={focusNextInput} required
                className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
                <option value="">--</option>
                {suppliers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{t('invoiceNo')}</label>
              <input type="text" value={poInvoiceNo} onChange={e => setPoInvoiceNo(e.target.value)} onKeyDown={focusNextInput}
                className="w-full px-3 py-2 rounded-xl border text-sm outline-none font-semibold"
                style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{t('orderItems')}</h4>
              <button type="button" onClick={poAddItem} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-[10px] font-medium">
                <Plus size={12} /> {t('add')}
              </button>
            </div>
            <div className="space-y-2">
              {poItems.map((item, idx) => {
                const wsPct = item.wholesalePct ?? 0;
                const wsPrice = item.wholesalePrice ?? 0;
                const rtPct = item.retailPct ?? 0;
                const rtPrice = item.retailPrice ?? 0;
                return (
                  <div key={idx} className="border rounded-xl p-3 space-y-2" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-card)' }}>
                    <div className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-4">
                        <label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>{t('productName')}</label>
                        <input type="text" value={item.productName} onChange={e => {
                          const name = e.target.value;
                          const p = products.find(p => p.name === name);
                          poUpdateItem(idx, { productName: name, wholesalePct: p?.wholesalePercentage ?? 0, retailPct: p?.retailPercentage ?? 0 });
                        }} onKeyDown={focusNextInput}
                          list="po-product-list"
                          className="w-full px-1.5 py-1 rounded border text-xs outline-none"
                          style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                          placeholder={language === 'ar' ? 'اسم المنتج' : language === 'fr' ? 'Nom du produit' : 'Product name'} />
                        <datalist id="po-product-list">
                          {products.map(p => <option key={p.id} value={p.name} />)}
                        </datalist>
                      </div>
                      <div className="col-span-1">
                        <label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>{t('quantity')}</label>
                        <input type="number" min="1" value={item.quantity} onChange={e => poUpdateItem(idx, { quantity: Number(e.target.value) })}
                          onKeyDown={focusNextInput} onFocus={e => { if (Number(e.target.value) === 0) e.target.value = ''; }}
                          onBlur={e => { if (e.target.value === '') { poUpdateItem(idx, { quantity: 0 }) } }}
                          className="w-full px-1.5 py-1 rounded border text-xs text-center outline-none"
                          style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                      </div>
                      <div className="col-span-3">
                        <label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>{t('color')}</label>
                        <div className="flex gap-1">
                           <select value={item.color} onChange={e => poUpdateItem(idx, { color: e.target.value })} onKeyDown={focusNextInput}
                            className="flex-1 px-1.5 py-1 rounded border text-xs outline-none"
                            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
                            <option value="">--</option>
                            {colorList.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          {showColorInput === idx ? (
                            <div className="flex gap-1">
                              <input type="text" value={newColorInput} onChange={e => setNewColorInput(e.target.value)} onKeyDown={focusNextInput}
                                className="w-20 px-1 py-1 rounded border text-xs outline-none"
                                style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                                placeholder={language === 'ar' ? 'لون' : language === 'fr' ? 'Couleur' : 'Color'} />
                              <button type="button" onClick={() => {
                                if (newColorInput.trim() && !colorList.includes(newColorInput.trim())) {
                                  updateSettings({ colors: [...colorList, newColorInput.trim()] });
                                }
                                setNewColorInput('');
                                setShowColorInput(null);
                              }} className="p-1 rounded text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20"><Plus size={14} /></button>
                              <button type="button" onClick={() => { setShowColorInput(null); setNewColorInput(''); }} className="p-1 rounded text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"><X size={14} /></button>
                            </div>
                          ) : (
                            <button type="button" onClick={() => setShowColorInput(idx)} className="p-1 rounded text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"><Plus size={14} /></button>
                          )}
                        </div>
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>{t('size')}</label>
                        <input type="text" value={item.size} onChange={e => {
                          const size = e.target.value;
                          poUpdateItem(idx, { size, targetTable: size ? 2 : 1 });
                        }} onKeyDown={focusNextInput}
                          className="w-full px-1.5 py-1 rounded border text-xs outline-none"
                          style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                          placeholder={language === 'ar' ? 'مقاس' : language === 'fr' ? 'Taille' : 'Size'} />
                      </div>
                      <div className="col-span-1">
                        <label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>{t('table')}</label>
                         <select value={item.targetTable} onChange={e => poUpdateItem(idx, { targetTable: Number(e.target.value) as 1 | 2 })} onKeyDown={focusNextInput}
                          className="w-full px-1 py-1 rounded border text-xs outline-none"
                          style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
                          <option value={1}>1</option>
                          <option value={2}>2</option>
                        </select>
                      </div>
                      <div className="col-span-1 flex justify-end">
                        {poItems.length > 1 && (
                          <button type="button" onClick={() => poRemoveItem(idx)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>{t('productCost')} (دج)</label>
                        <input type="number" min="0" step="0.01" value={item.costPrice} onChange={e => { poUpdateItem(idx, { costPrice: Number(e.target.value) }); }}
                          onKeyDown={focusNextInput} onFocus={e => { if (Number(e.target.value) === 0) e.target.value = ''; }}
                          onBlur={e => { if (e.target.value === '') poUpdateItem(idx, { costPrice: 0 }); }}
                          className="w-full px-1.5 py-1 rounded border text-xs text-center outline-none"
                          style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>{t('wholesalePrice')} (دج)</label>
                        <input type="number" min="0" step="0.01" value={wsPrice} onChange={e => handlePoWsPrice(idx, Number(e.target.value))}
                          onKeyDown={focusNextInput} onFocus={e => { if (Number(e.target.value) === 0) e.target.value = ''; }}
                          onBlur={e => { if (e.target.value === '') handlePoWsPrice(idx, 0); }}
                          className="w-full px-1.5 py-1 rounded border text-xs text-center outline-none font-semibold text-green-500"
                          style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }} />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>{t('wholesalePct')}</label>
                        <input type="number" min="0" step="0.1" value={wsPct} onChange={e => handlePoWsPct(idx, Number(e.target.value))}
                          onKeyDown={focusNextInput} onFocus={e => { if (Number(e.target.value) === 0) e.target.value = ''; }}
                          onBlur={e => { if (e.target.value === '') handlePoWsPct(idx, 0); }}
                          className="w-full px-1.5 py-1 rounded border text-xs text-center outline-none"
                          style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>{t('retailPrice')} (دج)</label>
                        <input type="number" min="0" step="0.01" value={rtPrice} onChange={e => handlePoRtPrice(idx, Number(e.target.value))}
                          onKeyDown={focusNextInput} onFocus={e => { if (Number(e.target.value) === 0) e.target.value = ''; }}
                          onBlur={e => { if (e.target.value === '') handlePoRtPrice(idx, 0); }}
                          className="w-full px-1.5 py-1 rounded border text-xs text-center outline-none font-semibold text-green-500"
                          style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }} />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium mb-0.5 block" style={{ color: 'var(--text-secondary)' }}>{t('retailPct')}</label>
                        <input type="number" min="0" step="0.1" value={rtPct} onChange={e => handlePoRtPct(idx, Number(e.target.value))}
                          onKeyDown={focusNextInput} onFocus={e => { if (Number(e.target.value) === 0) e.target.value = ''; }}
                          onBlur={e => { if (e.target.value === '') handlePoRtPct(idx, 0); }}
                          className="w-full px-1.5 py-1 rounded border text-xs text-center outline-none"
                          style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Debt Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3 rounded-xl border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
                <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'مجموع الفاتورة' : language === 'fr' ? 'Total facture' : 'Invoice Total'}</p>
                <p className="text-lg font-bold text-blue-500">{poCalcTotal().toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</p>
              </div>
              <div className="p-3 rounded-xl border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
                <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'الدفع' : language === 'fr' ? 'Paiement' : 'Payment'}</p>
                <input type="number" min="0" value={poPaymentAmount} onChange={e => setPoPaymentAmount(Number(e.target.value))}
                  onKeyDown={focusNextInput} onFocus={e => { if (Number(e.target.value) === 0) e.target.value = ''; }}
                  className="w-full mt-1 px-2 py-1 rounded-lg border text-sm text-center outline-none font-bold"
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: poPaymentAmount >= poCalcTotal() ? '#22c55e' : 'var(--border-color)', color: 'var(--text-primary)' }} />
              </div>
              <div className="p-3 rounded-xl border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: poSupplierDebt > 0 ? '#ef4444' : 'var(--border-color)' }}>
                <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'ديون سابقة' : language === 'fr' ? 'Dettes précédentes' : 'Previous Debt'}</p>
                <p className={`text-lg font-bold ${poSupplierDebt > 0 ? 'text-red-500' : 'text-green-500'}`}>{poSupplierDebt.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</p>
              </div>
              <div className="p-3 rounded-xl border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
                <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'مجموع فواتير' : language === 'fr' ? 'Total factures' : 'Invoice Total'}</p>
                <p className="text-lg font-bold text-blue-500">{(() => { if (!poSupplier) return 0; return purchaseOrders.filter(po => po.supplierName === poSupplier).reduce((s, po) => s + po.total, 0); })().toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</p>
              </div>
            </div>

            {/* Payments Section */}
            {poSupplier && poSupplierPayments.length > 0 && (
              <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{language === 'ar' ? 'الدفوعات السابقة' : language === 'fr' ? 'Paiements précédents' : 'Previous Payments'}</p>
                  <button type="button" onClick={() => { setPoPaymentModalOpen(true); setPoPaymentInput(0); setPoPaymentDateInput(poDate); setPoPaymentEditId(null); }}
                    className="text-xs px-2 py-1 rounded bg-green-500 hover:bg-green-600 text-white font-medium">{language === 'ar' ? 'إضافة دفعة' : language === 'fr' ? 'Ajouter' : 'Add Payment'}</button>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {poSupplierPayments.slice().reverse().map(p => (
                    <div key={p.id} className="flex items-center justify-between text-xs py-1 px-2 rounded" style={{ backgroundColor: 'var(--bg-card)' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{p.date}</span>
                      <span className="font-semibold text-green-500">{p.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</span>
                      <div className="flex gap-1">
                        <button type="button" onClick={() => { setPoPaymentModalOpen(true); setPoPaymentEditId(p.id); setPoPaymentInput(p.amount); setPoPaymentDateInput(p.date); }}
                          className="text-blue-400 hover:text-blue-600"><Edit2 size={12} /></button>
                        <button type="button" onClick={() => {
                          const supplier = suppliers.find(s => s.name === poSupplier);
                          if (supplier) {
                            const updatedSupplierPayments = (supplier.payments ?? []).filter(pp => pp.id !== p.id);
                            updateSupplier(supplier.id, { payments: updatedSupplierPayments });
                            // Also remove from the PO's payments
                            const targetPo = poEditId ? purchaseOrders.find(po => po.id === poEditId) : purchaseOrders.filter(po => po.supplierName === poSupplier).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                            if (targetPo) {
                              const updatedPoPayments = (targetPo.payments ?? []).filter(pp => pp.id !== p.id);
                              const newPaymentAmount = updatedPoPayments.reduce((s, pp) => s + pp.amount, 0);
                              updatePurchaseOrder(targetPo.id, { payments: updatedPoPayments, paymentAmount: newPaymentAmount || undefined });
                            }
                          }
                        }} className="text-red-400 hover:text-red-600"><Trash2 size={12} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            {poSupplier && (
              <button type="button" onClick={() => { setPoPaymentModalOpen(true); setPoPaymentInput(0); setPoPaymentDateInput(poDate); setPoPaymentEditId(null); }}

                className="text-xs px-3 py-2 rounded-xl border" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                {language === 'ar' ? 'إضافة دفعة' : language === 'fr' ? 'Ajouter un paiement' : 'Add Payment'}
              </button>
            )}
            <div className="flex gap-2">
              {poEditId && (
                <button type="button" onClick={poResetForm} className="px-4 py-2 rounded-xl border text-sm" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                  {t('cancel')}
                </button>
              )}
              <button type="submit" className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium">
                <ShoppingCart size={16} /> {poEditId ? t('edit') : t('save')}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Payment Modal */}
      {poPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setPoPaymentModalOpen(false)} />
          <div className="relative w-full max-w-sm mx-4 rounded-2xl shadow-xl border p-6" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{poPaymentEditId ? (language === 'ar' ? 'تعديل الدفعة' : language === 'fr' ? 'Modifier le paiement' : 'Edit Payment') : (language === 'ar' ? 'إضافة دفعة' : language === 'fr' ? 'Ajouter un paiement' : 'Add Payment')}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{t('date')}</label>
                <input type="date" value={poPaymentDateInput} onChange={e => setPoPaymentDateInput(e.target.value)} onKeyDown={focusNextInput} onFocus={clearZeroOnFocus}
                  className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                  style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'المبلغ' : language === 'fr' ? 'Montant' : 'Amount'} (دج)</label>
                <input type="number" min="0" value={poPaymentInput} onChange={e => setPoPaymentInput(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                  style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                  onFocus={e => { if (Number(e.target.value) === 0) e.target.value = ''; }}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('po-payment-save')?.click(); } }} />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setPoPaymentModalOpen(false)} className="px-4 py-2 rounded-xl border text-sm" style={{ borderColor: 'var(--border-color)' }}>{t('cancel')}</button>
              <button id="po-payment-save" onClick={() => {
                if (poPaymentInput <= 0) return;
                const supplier = suppliers.find(s => s.name === poSupplier);
                if (!supplier) return;
                const current = supplier.payments ?? [];
                if (poPaymentEditId) {
                  updateSupplier(supplier.id, { payments: current.map(p => p.id === poPaymentEditId ? { ...p, date: poPaymentDateInput, amount: poPaymentInput } : p) });
                  // Also update the PO's payment
                  const targetPo = poEditId ? purchaseOrders.find(po => po.id === poEditId) : purchaseOrders.filter(po => po.supplierName === poSupplier).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                  if (targetPo) {
                    const updatedPoPayments = (targetPo.payments ?? []).map(p => p.id === poPaymentEditId ? { ...p, date: poPaymentDateInput, amount: poPaymentInput } : p);
                    const newPaymentAmount = updatedPoPayments.reduce((s, p) => s + p.amount, 0);
                    updatePurchaseOrder(targetPo.id, { payments: updatedPoPayments, paymentAmount: newPaymentAmount || undefined });
                  }
                } else {
                  const newPayment = { id: Date.now().toString(), date: poPaymentDateInput, amount: poPaymentInput };
                  updateSupplier(supplier.id, { payments: [...current, newPayment] });
                  const targetPoId = poEditId || purchaseOrders.filter(po => po.supplierName === poSupplier).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.id;
                  if (targetPoId) {
                    const existingPo = purchaseOrders.find(p => p.id === targetPoId);
                    const prevAmount = existingPo?.paymentAmount ?? 0;
                    const prevPayments = existingPo?.payments ?? [];
                    updatePurchaseOrder(targetPoId, { payments: [...prevPayments, newPayment], paymentAmount: prevAmount + poPaymentInput });
                  }
                  setPoPaymentAmount(poPaymentInput);
                }
                setPoPaymentModalOpen(false);
              }} className="px-4 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-medium">
                {poPaymentEditId ? t('edit') : t('save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saved Purchase Invoices */}
      {purchaseOrders.length > 0 && (
        <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center justify-between px-4 py-3 border-b flex-wrap gap-2" style={{ borderColor: 'var(--border-color)' }}>
            <div className="flex items-center gap-2">
              <Package size={18} className="text-purple-500" />
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{t('savedInvoices')}</h3>
            </div>
            <div className="flex items-center gap-2">
               <select value={quickPaySupplier} onChange={e => setQuickPaySupplier(e.target.value)} onKeyDown={focusNextInput}
                className="px-2 py-1.5 rounded-lg border text-xs outline-none"
                style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
                <option value="">{language === 'ar' ? 'كل الموردين' : language === 'fr' ? 'Tous les fournisseurs' : 'All suppliers'}</option>
                {[...new Set(purchaseOrders.map(po => po.supplierName))].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button onClick={() => { setQuickPayOpen(true); setQuickPayAmount(''); setQuickPayDate(today); }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white text-xs font-medium">
                <Plus size={13} /> {language === 'ar' ? 'إضافة دفعة' : language === 'fr' ? 'Ajouter paiement' : 'Add Payment'}
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ color: 'var(--text-primary)' }}>
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                  <th className="px-3 py-2.5 text-xs font-semibold text-start" style={{ color: 'var(--text-secondary)' }}>{t('invoiceNo')}</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-start" style={{ color: 'var(--text-secondary)' }}>{t('date')}</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-start" style={{ color: 'var(--text-secondary)' }}>{t('supplierName')}</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-start" style={{ color: 'var(--text-secondary)' }}>{t('productName')}</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-start" style={{ color: 'var(--text-secondary)' }}>{t('color')}</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-start" style={{ color: 'var(--text-secondary)' }}>{t('size')}</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-center" style={{ color: 'var(--text-secondary)' }}>{t('quantity')}</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-center" style={{ color: 'var(--text-secondary)' }}>{t('table')}</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-end" style={{ color: 'var(--text-secondary)' }}>{t('wholesalePrice')}</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-end" style={{ color: 'var(--text-secondary)' }}>{t('wholesalePct')}</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-end" style={{ color: 'var(--text-secondary)' }}>{t('retailPrice')}</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-end" style={{ color: 'var(--text-secondary)' }}>{t('retailPct')}</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-end" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'الدفع' : language === 'fr' ? 'Paiement' : 'Payment'}</th>
                  <th className="px-2 py-2.5 w-16" />
                </tr>
              </thead>
              <tbody>
                {[...purchaseOrders].sort((a, b) => Number(a.invoiceNumber) - Number(b.invoiceNumber)).filter(po => !quickPaySupplier || po.supplierName === quickPaySupplier).map(po => (
                  po.items.map((item, idx) => (
                    <tr key={`${po.id}-${idx}`} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50" style={{ borderColor: 'var(--border-color)' }}>
                      <td className="px-3 py-2 text-xs font-semibold">
                          {idx === 0 ? (
                            <div>
                              <span>{`INV-${po.invoiceNumber}`}</span>
                              {po.editHistory && po.editHistory.length > 0 && (
                                <div className="text-[10px] font-normal mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                                  {language === 'ar' ? 'آخر تعديل:' : language === 'fr' ? 'Dernière modif:' : 'Last edit:'} {po.editHistory[po.editHistory.length - 1]}
                                </div>
                              )}
                            </div>
                          ) : ''}
                        </td>
                      <td className="px-3 py-2 text-xs">{idx === 0 ? po.date : ''}</td>
                      <td className="px-3 py-2 text-xs">{idx === 0 ? po.supplierName : ''}</td>
                      <td className="px-3 py-2 text-xs">{item.productName}</td>
                      <td className="px-3 py-2 text-xs">{item.color}</td>
                      <td className="px-3 py-2 text-xs">{item.size || '-'}</td>
                      <td className="px-3 py-2 text-xs text-center">{item.quantity}</td>
                      <td className="px-3 py-2 text-xs text-center">{item.targetTable || 1}</td>
                      <td className="px-3 py-2 text-xs text-end">{(item.wholesalePrice ?? 0) > 0 ? `${(item.wholesalePrice ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} دج` : '-'}</td>
                      <td className="px-3 py-2 text-xs text-end">{(item.wholesalePct ?? 0) > 0 ? `${item.wholesalePct}%` : '-'}</td>
                      <td className="px-3 py-2 text-xs text-end">{(item.retailPrice ?? 0) > 0 ? `${(item.retailPrice ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} دج` : '-'}</td>
                      <td className="px-3 py-2 text-xs text-end">{(item.retailPct ?? 0) > 0 ? `${item.retailPct}%` : '-'}</td>
                      <td className="px-3 py-2 text-xs text-end">{idx === 0 ? (() => { const paid = (po.payments ?? []).reduce((s, p) => s + p.amount, 0); const rem = po.total - paid; return rem <= 0 ? <span className="text-green-500 font-semibold">{language === 'ar' ? 'مدفوع' : language === 'fr' ? 'Payé' : 'Paid'}</span> : <span className="text-red-500 font-semibold">{language === 'ar' ? 'غير مدفوع' : language === 'fr' ? 'Impayé' : 'Unpaid'}</span>; })() : ''}</td>
                      <td className="px-2 py-2">
                        {idx === 0 && (
                          <div className="flex gap-1">
                            <button onClick={() => handlePrintPO(po)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500" title={t('print')}>
                              <Printer size={13} />
                            </button>
                            <button onClick={() => poStartEdit(po)} className="p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-400" title={t('edit')}>
                              <Edit2 size={13} />
                            </button>
                            <button onClick={() => poStartDelete(po)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400" title={t('delete')}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Payment Modal */}
      {quickPayOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setQuickPayOpen(false)} />
          <div className="relative w-full max-w-sm mx-4 rounded-2xl shadow-xl border p-6" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{language === 'ar' ? 'إضافة دفعة' : language === 'fr' ? 'Ajouter un paiement' : 'Add Payment'}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{t('supplierName')}</label>
                 <select value={quickPaySupplier} onChange={e => setQuickPaySupplier(e.target.value)} onKeyDown={focusNextInput}
                  className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                  style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
                  <option value="">--</option>
                  {[...new Set(purchaseOrders.map(po => po.supplierName))].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{t('date')}</label>
                <input type="date" value={quickPayDate} onChange={e => setQuickPayDate(e.target.value)} onKeyDown={focusNextInput} onFocus={clearZeroOnFocus}
                  className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                  style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'المبلغ' : language === 'fr' ? 'Montant' : 'Amount'} (دج)</label>
                <input type="number" min="0" value={quickPayAmount} onChange={e => setQuickPayAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                  style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                  onFocus={e => { if (e.target.value === '0' || e.target.value === '') e.target.value = ''; setQuickPayAmount(''); }}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('quick-pay-submit')?.click(); } }} />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setQuickPayOpen(false)} className="px-4 py-2 rounded-xl border text-sm" style={{ borderColor: 'var(--border-color)' }}>{t('cancel')}</button>
              <button onClick={() => {
                if (!quickPaySupplier || !quickPayAmount || Number(quickPayAmount) <= 0) { toast.error(language === 'ar' ? 'اختر المورد وأدخل المبلغ' : language === 'fr' ? 'Choisissez le fournisseur et le montant' : 'Select supplier and amount'); return; }
                const supplier = suppliers.find(s => s.name === quickPaySupplier);
                if (!supplier) return;
                const qpAmount = Number(quickPayAmount);
                updateSupplier(supplier.id, { payments: [...(supplier.payments ?? []), { id: Date.now().toString(), date: quickPayDate, amount: qpAmount }] });
                // Add payment to the latest invoice's payments array
                const supplierPOs = purchaseOrders.filter(po => po.supplierName === quickPaySupplier).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                if (supplierPOs.length > 0) {
                  const latest = supplierPOs[0];
                  const newPayment = { id: Date.now().toString(), date: quickPayDate, amount: qpAmount };
                  const existingPayments = latest.payments ?? [];
                  updatePurchaseOrder(latest.id, { payments: [...existingPayments, newPayment], paymentAmount: (latest.paymentAmount ?? 0) + qpAmount });
                }
                setQuickPayOpen(false);
                setQuickPayAmount('');
                toast.success(language === 'ar' ? 'تم إضافة الدفعة' : language === 'fr' ? 'Paiement ajouté' : 'Payment added');
              }} id="quick-pay-submit" className="px-4 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-medium">
                {t('save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password modal for edit */}
      {poPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setPoPasswordModal(null)} />
          <div className="relative w-full max-w-sm mx-4 rounded-2xl shadow-xl border p-6" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{t('passwordRequired')}</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>{t('enterPassword')}</p>
            <input type="password" value={poPasswordInput} onChange={e => setPoPasswordInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') poConfirmEdit(); }} autoFocus
              className="w-full px-3 py-2 rounded-xl border text-sm outline-none mb-4"
              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setPoPasswordModal(null)} className="px-4 py-2 rounded-xl border text-sm" style={{ borderColor: 'var(--border-color)' }}>{t('cancel')}</button>
              <button onClick={poConfirmEdit} className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium">{t('edit')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Password modal for delete */}
      {poDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setPoDeleteId(null)} />
          <div className="relative w-full max-w-sm mx-4 rounded-2xl shadow-xl border p-6" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{t('passwordRequired')}</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'أدخل كلمة السر لحذف الفاتورة' : language === 'fr' ? 'Entrez le mot de passe pour supprimer la facture' : 'Enter password to delete invoice'}</p>
            <input type="password" value={poPasswordInput} onChange={e => setPoPasswordInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') poConfirmDelete(); }}
              className="w-full px-3 py-2 rounded-xl border text-sm outline-none mb-4"
              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setPoDeleteId(null)} className="px-4 py-2 rounded-xl border text-sm" style={{ borderColor: 'var(--border-color)' }}>{t('cancel')}</button>
              <button onClick={poConfirmDelete} className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium">{language === 'ar' ? 'حذف' : language === 'fr' ? 'Supprimer' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}