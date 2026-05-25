import { useState, useRef, useEffect } from 'react';
import { focusNextInput, clearZeroOnFocus } from '../shared/formHelpers';
import { useTranslation } from '../i18n/useTranslation';
import { useAppContext } from '../store/AppContext';
import { Plus, Trash2, Building2, Search, Edit2, AlertTriangle, Eye, X, Printer, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Suppliers() {
  const { t, language } = useTranslation();
  const { suppliers, purchaseOrders, addSupplier, updateSupplier, deleteSupplier, updatePurchaseOrder, password } = useAppContext();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [search, setSearch] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [passwordMode, setPasswordMode] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [payPOAmounts, setPayPOAmounts] = useState<Record<string, string>>({});
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [selectedInvoiceIndex, setSelectedInvoiceIndex] = useState<number | null>(null);
  const invoiceListRef = useRef<HTMLDivElement>(null);

  const AUTH_KEY = 'auth_suppliers';
  const [authed, setAuthedState] = useState(() => {
    try { const ts = sessionStorage.getItem(AUTH_KEY); return !!ts && Date.now() - Number(ts) < 5 * 60 * 1000; } catch { return false; }
  });
  const setAuthed = (v: boolean) => {
    setAuthedState(v);
    try { if (v) sessionStorage.setItem(AUTH_KEY, String(Date.now())); else sessionStorage.removeItem(AUTH_KEY); } catch {}
  };
  const [pwInput, setPwInput] = useState('');
  const [pwError, setPwError] = useState(false);
  const [lockHover, setLockHover] = useState(false);
  useEffect(() => {
    if (!authed) return;
    const interval = setInterval(() => {
      try {
        const ts = sessionStorage.getItem(AUTH_KEY);
        if (!ts || Date.now() - Number(ts) >= 5 * 60 * 1000) {
          setAuthedState(false);
          sessionStorage.removeItem(AUTH_KEY);
        }
      } catch {}
    }, 10_000);
    return () => clearInterval(interval);
  }, [authed]);
  const handlePwSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pwInput === password) { setAuthed(true); }
    else { setPwError(true); }
  };
  const printRef = useRef<() => void>(() => {});
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyP' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        printRef.current();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  if (!authed) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-full max-w-sm p-6 rounded-2xl shadow-lg border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="text-center mb-6">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-500/10 flex items-center justify-center mb-3">
              <Lock className="text-blue-500" size={28} />
            </div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{t('passwordRequired')}</h2>
          </div>
          <form onSubmit={handlePwSubmit} className="space-y-4">
            <input type="password" value={pwInput} onChange={e => { setPwInput(e.target.value); setPwError(false); }} onKeyDown={focusNextInput} placeholder={t('enterPassword')} autoFocus
              className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none ${pwError ? 'border-red-500 ring-2 ring-red-500/20' : ''}`}
              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: pwError ? undefined : 'var(--border-color)', color: 'var(--text-primary)' }} />
            {pwError && <p className="text-red-500 text-xs">{t('wrongPassword')}</p>}
            <button type="submit" className="w-full py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium">{t('enterPassword')}</button>
          </form>
        </div>
      </div>
    );
  }

  const LockIcon = (
    <button onClick={() => setAuthed(false)}
      onMouseEnter={() => setLockHover(true)} onMouseLeave={() => setLockHover(false)}
      className="p-1.5 rounded-lg transition-all duration-300 hover:bg-gray-100 dark:hover:bg-gray-800"
      style={{ color: 'var(--text-secondary)' }} title={t('lock')}>
      <svg className={`w-5 h-5 transition-all duration-300 ${lockHover ? 'scale-110' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        {lockHover ? (
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        )}
      </svg>
    </button>
  );

  const resetForm = () => {
    setName(''); setPhone(''); setAddress(''); setEmail(''); setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (editingId) {
      updateSupplier(editingId, { name: name.trim(), phone, address, email });
      toast.success(language === 'ar' ? 'تم تحديث المورد' : language === 'fr' ? 'Fournisseur mis à jour' : 'Supplier updated');
    } else {
      addSupplier({
        id: Date.now().toString(),
        name: name.trim(),
        phone,
        address,
        email,
        dateAdded: new Date().toISOString().split('T')[0],
        payments: [],
      });
      toast.success(language === 'ar' ? 'تم إضافة المورد' : language === 'fr' ? 'Fournisseur ajouté' : 'Supplier added');
    }
    resetForm();
  };

  const handleEdit = (s: typeof suppliers[0]) => {
    setEditingId(s.id);
    setName(s.name);
    setPhone(s.phone);
    setAddress(s.address);
    setEmail(s.email);
  };

  const filtered = suppliers.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.phone.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || s.address.toLowerCase().includes(q);
  });

  const getPurchaseStats = (supplierName: string) => {
    const orders = purchaseOrders.filter(po => po.supplierName === supplierName);
    return { count: orders.length, total: orders.reduce((s, po) => s + po.total, 0) };
  };

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmId(id);
    setPasswordMode(false);
    setDeletePassword('');
  };

  const handleConfirmDelete = () => {
    setPasswordMode(true);
  };

  const handlePasswordSubmit = () => {
    if (deletePassword !== password) {
      toast.error(t('wrongPassword'));
      return;
    }
    if (deleteConfirmId) {
      deleteSupplier(deleteConfirmId);
      toast.success(t('deleted'));
    }
    setDeleteConfirmId(null);
    setDeletePassword('');
    setPasswordMode(false);
  };

  // Supplier detail modal
  const selectedSupplier = selectedSupplierId ? suppliers.find(s => s.id === selectedSupplierId) : null;
  const supplierOrders = selectedSupplier ? purchaseOrders.filter(po => po.supplierName === selectedSupplier.name).sort((a, b) => Number(a.invoiceNumber) - Number(b.invoiceNumber)) : [];
  const totalPurchasesAmount = supplierOrders.reduce((s, po) => s + po.total, 0);
  const supplierPayments = selectedSupplier?.payments ?? [];
  const totalPaymentsAmount = supplierPayments.reduce((s, p) => s + p.amount, 0);
  const debts = totalPurchasesAmount - totalPaymentsAmount;
  const netTotal = totalPaymentsAmount - totalPurchasesAmount;

  const handleAddPayment = () => {
    if (!selectedSupplierId || paymentAmount <= 0) return;
    const supplier = suppliers.find(s => s.id === selectedSupplierId);
    if (!supplier) return;
    const currentPayments = supplier.payments ?? [];
    if (editingPaymentId) {
      const updated = currentPayments.map(p => p.id === editingPaymentId ? { ...p, date: paymentDate, amount: paymentAmount } : p);
      updateSupplier(selectedSupplierId, { payments: updated });
      // Also update the PO's payment
      const targetPO = purchaseOrders.find(po => po.supplierName === supplier.name && (po.payments ?? []).some(p => p.id === editingPaymentId));
      if (targetPO) {
        const updatedPoPayments = (targetPO.payments ?? []).map(p => p.id === editingPaymentId ? { ...p, date: paymentDate, amount: paymentAmount } : p);
        const newPaymentAmount = updatedPoPayments.reduce((s, p) => s + p.amount, 0);
        updatePurchaseOrder(targetPO.id, { payments: updatedPoPayments, paymentAmount: newPaymentAmount || undefined });
      }
      toast.success(language === 'ar' ? 'تم تعديل الدفعة' : language === 'fr' ? 'Paiement modifié' : 'Payment updated');
    } else {
      const newPayment = { id: Date.now().toString(), date: paymentDate, amount: paymentAmount };
      updateSupplier(selectedSupplierId, { payments: [...currentPayments, newPayment] });
      toast.success(language === 'ar' ? 'تمت إضافة الدفعة' : language === 'fr' ? 'Paiement ajouté' : 'Payment added');
    }
    setPaymentAmount(0);
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setEditingPaymentId(null);
  };

  const handlePayPO = (poId: string, amount: number) => {
    if (amount <= 0) return;
    const po = purchaseOrders.find(p => p.id === poId);
    if (!po) return;
    const newPayment = { id: Date.now().toString(), date: new Date().toISOString().split('T')[0], amount };
    const updatedPayments = [...(po.payments ?? []), newPayment];
    updatePurchaseOrder(poId, { payments: updatedPayments, paymentAmount: (po.paymentAmount ?? 0) + amount });
    const supplier = suppliers.find(s => s.name === po.supplierName);
    if (supplier) {
      updateSupplier(supplier.id, { payments: [...(supplier.payments ?? []), newPayment] });
    }
    toast.success(language === 'ar' ? 'تمت إضافة الدفعة للفاتورة' : language === 'fr' ? 'Paiement ajouté à la facture' : 'Payment added to invoice');
  };

  const handleEditPayment = (p: typeof supplierPayments[0]) => {
    setEditingPaymentId(p.id);
    setPaymentDate(p.date);
    setPaymentAmount(p.amount);
  };

  const handleDeletePayment = (paymentId: string) => {
    if (!selectedSupplierId) return;
    const supplier = suppliers.find(s => s.id === selectedSupplierId);
    if (!supplier) return;
    const updated = (supplier.payments ?? []).filter(p => p.id !== paymentId);
    updateSupplier(selectedSupplierId, { payments: updated });
    // Also remove from the PO's payments
    const targetPO = purchaseOrders.find(po => po.supplierName === supplier.name && (po.payments ?? []).some(p => p.id === paymentId));
    if (targetPO) {
      const updatedPoPayments = (targetPO.payments ?? []).filter(p => p.id !== paymentId);
      const newPaymentAmount = updatedPoPayments.reduce((s, p) => s + p.amount, 0);
      updatePurchaseOrder(targetPO.id, { payments: updatedPoPayments, paymentAmount: newPaymentAmount || undefined });
    }
    if (editingPaymentId === paymentId) {
      setEditingPaymentId(null);
      setPaymentAmount(0);
      setPaymentDate(new Date().toISOString().split('T')[0]);
    }
    toast.success(t('deleted'));
  };

  const handlePrintSupplier = () => {
    if (!selectedSupplier) return;
    const payRows = supplierPayments.map(p => `
      <tr>
        <td>${p.date}</td>
        <td style="text-align:right">${p.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} DZD</td>
      </tr>
    `).join('');
    const poRows = supplierOrders.map(po => po.items.map(item => `
      <tr>
        <td>${po.date}</td>
        <td>INV-${po.invoiceNumber}</td>
        <td>${item.productName}</td>
        <td>${item.color}</td>
        <td style="text-align:center">${item.quantity}</td>
        <td style="text-align:right">${(item.costPrice * item.quantity).toLocaleString(undefined, { maximumFractionDigits: 2 })} DZD</td>
      </tr>
    `).join('')).join('');
    const displayNet = netTotal < 0 ? `-${Math.abs(netTotal).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : netTotal.toLocaleString(undefined, { maximumFractionDigits: 2 });
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html dir="${language === 'ar' ? 'rtl' : 'ltr'}">
      <head><title>${selectedSupplier.name}</title>
      <style>
        @page { margin: 12mm; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', 'Traditional Arabic', sans-serif; padding: 24px; color: #1a1a2e; max-width: 900px; margin: auto; font-size: 13px; }
        h1 { text-align: center; font-size: 20px; margin-bottom: 20px; border-bottom: 2px solid #1a1a2e; padding-bottom: 10px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 20px; font-size: 12px; }
        .section-title { font-size: 14px; font-weight: bold; margin: 16px 0 8px; color: #2563eb; }
        table { width: 100%; border-collapse: collapse; margin: 8px 0 16px; font-size: 12px; }
        th { background: #1a1a2e; color: white; padding: 6px 8px; font-size: 11px; text-align: start; }
        td { padding: 6px 8px; border-bottom: 1px solid #e9ecef; }
        tfoot td { font-weight: bold; border-top: 2px solid #1a1a2e; }
        .summary { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-top: 16px; }
        .summary-box { border: 1px solid #e9ecef; border-radius: 8px; padding: 12px; text-align: center; }
        .summary-box .label { font-size: 10px; text-transform: uppercase; color: #6c757d; margin-bottom: 4px; }
        .summary-box .value { font-size: 18px; font-weight: bold; }
        .red { color: #ef4444; }
        .green { color: #22c55e; }
        .blue { color: #2563eb; }
        .footer { margin-top: 32px; text-align: center; font-size: 10px; color: #6c757d; border-top: 1px solid #e9ecef; padding-top: 10px; }
      </style>
      </head><body>
        <h1>${selectedSupplier.name}</h1>
        <div class="info-grid">
          <div><strong>${t('phone')}:</strong> ${selectedSupplier.phone || '—'}</div>
          <div><strong>${t('email')}:</strong> ${selectedSupplier.email || '—'}</div>
          <div><strong>${t('address')}:</strong> ${selectedSupplier.address || '—'}</div>
          <div><strong>${t('dateAdded')}:</strong> ${selectedSupplier.dateAdded || '—'}</div>
        </div>

        <div class="section-title">${t('purchases')}</div>
        <table>
          <thead><tr>
            <th>${t('date')}</th>
            <th>${t('invoiceNo')}</th>
            <th>${t('productName')}</th>
            <th>${t('color')}</th>
            <th style="text-align:center">${t('quantity')}</th>
            <th style="text-align:right">${t('total')}</th>
          </tr></thead>
          <tbody>${poRows}</tbody>
          <tfoot><tr>
            <td colspan="5" style="text-align:end">${t('total')}</td>
            <td style="text-align:right;color:#2563eb">${totalPurchasesAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} DZD</td>
          </tr></tfoot>
        </table>

        <div class="section-title">${t('addPayment')}</div>
        <table>
          <thead><tr>
            <th>${t('date')}</th>
            <th style="text-align:right">${t('paymentAmount')}</th>
          </tr></thead>
          <tbody>${payRows || `<tr><td colspan="2" style="text-align:center;color:#6c757d">—</td></tr>`}</tbody>
          <tfoot><tr>
            <td style="text-align:end">${t('total')}</td>
            <td style="text-align:right;color:#22c55e">${totalPaymentsAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} DZD</td>
          </tr></tfoot>
        </table>

        <div class="summary">
          <div class="summary-box"><div class="label">${t('debts')}</div><div class="value red">${debts.toLocaleString(undefined, { maximumFractionDigits: 2 })} DZD</div></div>
          <div class="summary-box"><div class="label">${t('totalPayments')}</div><div class="value green">${totalPaymentsAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} DZD</div></div>
          <div class="summary-box"><div class="label">${t('netTotal')}</div><div class="value ${netTotal >= 0 ? 'green' : 'red'}">${displayNet} DZD</div></div>
        </div>

        <div class="footer">${t('appName')}</div>
      </body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  printRef.current = () => {
    if (selectedInvoiceIndex !== null && supplierOrders[selectedInvoiceIndex]) {
      // Print only the expanded invoice
      const po = supplierOrders[selectedInvoiceIndex];
      const paid = (po.payments ?? []).reduce((s, p) => s + p.amount, 0);
      const rem = po.total - paid;
      const itemsRows = po.items.map(item => `
        <tr>
          <td>${item.productName}</td>
          <td>${item.color}</td>
          <td style="text-align:center">${item.size || '—'}</td>
          <td style="text-align:center">${item.quantity}</td>
          <td style="text-align:right">${item.costPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
          <td style="text-align:right">${(item.costPrice * item.quantity).toLocaleString(undefined, { maximumFractionDigits: 2 })} DZD</td>
        </tr>
      `).join('');
      const win = window.open('', '_blank');
      if (!win) return;
      win.document.write(`
        <html dir="${language === 'ar' ? 'rtl' : 'ltr'}">
        <head><title>INV-${po.invoiceNumber}</title>
        <style>
          @page { margin: 10mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Segoe UI', 'Traditional Arabic', sans-serif; padding: 20px; color: #1a1a2e; max-width: 700px; margin: auto; font-size: 12px; }
          h2 { text-align: center; font-size: 16px; margin-bottom: 16px; border-bottom: 2px solid #1a1a2e; padding-bottom: 8px; }
          .info { margin-bottom: 12px; font-size: 11px; }
          table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 11px; }
          th { background: #1a1a2e; color: white; padding: 5px 7px; font-size: 10px; text-align: start; }
          td { padding: 5px 7px; border-bottom: 1px solid #e9ecef; }
          .summary { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-top: 12px; }
          .box { border: 1px solid #e9ecef; border-radius: 6px; padding: 10px; text-align: center; }
          .box .lbl { font-size: 9px; text-transform: uppercase; color: #6c757d; margin-bottom: 3px; }
          .box .val { font-size: 15px; font-weight: bold; }
          .red { color: #ef4444; }
          .green { color: #22c55e; }
          .blue { color: #2563eb; }
          .footer { margin-top: 20px; text-align: center; font-size: 9px; color: #6c757d; border-top: 1px solid #e9ecef; padding-top: 8px; }
        </style>
        </head><body>
          <h2>INV-${po.invoiceNumber}</h2>
          <div class="info"><strong>${t('supplierName')}:</strong> ${selectedSupplier?.name} &nbsp;|&nbsp; <strong>${t('date')}:</strong> ${po.date}</div>
          <table>
            <thead><tr>
              <th>${t('productName')}</th>
              <th>${t('color')}</th>
              <th style="text-align:center">${t('size')}</th>
              <th style="text-align:center">${t('quantity')}</th>
              <th style="text-align:right">${t('costPrice')}</th>
              <th style="text-align:right">${t('total')}</th>
            </tr></thead>
            <tbody>${itemsRows}</tbody>
          </table>
          <div class="summary">
            <div class="box"><div class="lbl">${t('total')}</div><div class="val blue">${po.total.toLocaleString(undefined, { maximumFractionDigits: 2 })} DZD</div></div>
            <div class="box"><div class="lbl">${t('paymentAmount')}</div><div class="val green">${paid.toLocaleString(undefined, { maximumFractionDigits: 2 })} DZD</div></div>
            <div class="box"><div class="lbl">${language === 'ar' ? 'المتبقي' : language === 'fr' ? 'Reste' : 'Remaining'}</div><div class="val ${rem > 0 ? 'red' : 'green'}">${rem.toLocaleString(undefined, { maximumFractionDigits: 2 })} DZD</div></div>
          </div>
          <div class="footer">${t('appName')}</div>
        </body></html>
      `);
      win.document.close();
      win.focus();
      win.print();
    } else {
      handlePrintSupplier();
    }
  };

  const inputClass = 'w-full px-3 py-2 rounded-xl border text-sm outline-none';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>{t('suppliers')} {LockIcon}</h1>
      </div>

      <form onSubmit={handleSubmit} className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <Building2 size={18} className="text-blue-500" />
          <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{editingId ? t('editSupplier') : t('addSupplier')}</h3>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{t('supplierName')}</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} onKeyDown={focusNextInput} onFocus={clearZeroOnFocus} required
                placeholder={t('supplierPlaceholder')}
                className={inputClass}
                style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{t('phone')}</label>
              <input type="text" value={phone} onChange={e => setPhone(e.target.value)} onKeyDown={focusNextInput} onFocus={clearZeroOnFocus}
                className={inputClass}
                style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{t('address')}</label>
              <input type="text" value={address} onChange={e => setAddress(e.target.value)} onKeyDown={focusNextInput} onFocus={clearZeroOnFocus}
                className={inputClass}
                style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{t('email')}</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={focusNextInput} onFocus={clearZeroOnFocus}
                className={inputClass}
                style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            {editingId && (
              <button type="button" onClick={resetForm} className="px-4 py-2 rounded-xl border text-sm" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                {t('cancel')}
              </button>
            )}
            <button type="submit" className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium">
              <Plus size={16} /> {editingId ? t('edit') : t('add')}
            </button>
          </div>
        </div>
      </form>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={focusNextInput} onFocus={clearZeroOnFocus}
          placeholder={t('search')}
          className="w-full ps-9 pe-3 py-2 rounded-xl border text-sm outline-none"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
      </div>

      <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ color: 'var(--text-primary)' }}>
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                <th className="px-3 py-3 text-xs font-semibold text-start" style={{ color: 'var(--text-secondary)' }}>#</th>
                <th className="px-3 py-3 text-xs font-semibold text-start" style={{ color: 'var(--text-secondary)' }}>{t('supplierName')}</th>
                <th className="px-3 py-3 text-xs font-semibold text-start" style={{ color: 'var(--text-secondary)' }}>{t('phone')}</th>
                <th className="px-3 py-3 text-xs font-semibold text-start" style={{ color: 'var(--text-secondary)' }}>{t('address')}</th>
                <th className="px-3 py-3 text-xs font-semibold text-start" style={{ color: 'var(--text-secondary)' }}>{t('email')}</th>
                <th className="px-3 py-3 text-xs font-semibold text-start" style={{ color: 'var(--text-secondary)' }}>{t('dateAdded')}</th>
                <th className="px-3 py-3 text-xs font-semibold text-center" style={{ color: 'var(--text-secondary)' }}>{t('purchaseCount')}</th>
                <th className="px-3 py-3 text-xs font-semibold text-end" style={{ color: 'var(--text-secondary)' }}>{t('totalPurchases')}</th>
                <th className="px-3 py-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>{t('noSuppliers')}</td></tr>
              ) : (
                filtered.map((s, idx) => {
                  const stats = getPurchaseStats(s.name);
                  return (
                    <tr key={s.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer" style={{ borderColor: 'var(--border-color)' }} onClick={() => setSelectedSupplierId(s.id)}>
                      <td className="px-3 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{idx + 1}</td>
                      <td className="px-3 py-3">
                        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                          {s.name}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{s.phone || '—'}</td>
                      <td className="px-3 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{s.address || '—'}</td>
                      <td className="px-3 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{s.email || '—'}</td>
                      <td className="px-3 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{s.dateAdded || '—'}</td>
                      <td className="px-3 py-3 text-xs text-center font-semibold">{stats.count}</td>
                      <td className="px-3 py-3 text-xs text-end font-semibold">{stats.total.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</td>
                      <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <button onClick={() => setSelectedSupplierId(s.id)} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500" title={t('view')}><Eye size={14} /></button>
                          <button onClick={() => handleEdit(s)} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500" title={t('edit')}><Edit2 size={14} /></button>
                          <button onClick={() => handleDeleteClick(s.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500" title={t('delete')}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Supplier Detail Modal */}
      {selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSelectedSupplierId(null)} />
          <div className="relative w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col rounded-2xl shadow-xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex items-center gap-3">
                <Building2 size={20} className="text-blue-500" />
                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{selectedSupplier.name}</h2>
              </div>
              <div className="flex gap-2">
                <button onClick={handlePrintSupplier} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" style={{ color: 'var(--text-secondary)' }}><Printer size={18} /></button>
                <button onClick={() => setSelectedSupplierId(null)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" style={{ color: 'var(--text-secondary)' }}><X size={18} /></button>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">

              {/* Invoice Search + Selectable List */}
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{t('purchases')}</h3>
                  <div className="relative flex-1 max-w-xs">
                    <Search size={14} className="absolute start-2 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
                    <input type="text" value={invoiceSearch} onChange={e => { setInvoiceSearch(e.target.value); setSelectedInvoiceIndex(null); }} onKeyDown={focusNextInput} onFocus={clearZeroOnFocus}
                      placeholder={language === 'ar' ? 'رقم الفاتورة...' : language === 'fr' ? 'N° facture...' : 'Invoice #...'}
                      className="w-full ps-7 pe-2 py-1.5 rounded-lg border text-xs outline-none"
                      style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                  </div>
                </div>
                {(() => {
                  const filteredOrders = supplierOrders.filter(po => !invoiceSearch || po.invoiceNumber.includes(invoiceSearch));
                  if (filteredOrders.length === 0) {
                    return <p className="text-sm py-4" style={{ color: 'var(--text-secondary)' }}>—</p>;
                  }
                  return (
                    <div ref={invoiceListRef} className="border rounded-xl overflow-hidden" style={{ borderColor: 'var(--border-color)' }}
                      tabIndex={0}
                      onClick={() => setSelectedInvoiceIndex(null)}
                      onKeyDown={e => {
                        if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedInvoiceIndex(prev => prev === null ? 0 : Math.min(prev + 1, filteredOrders.length - 1)); }
                        if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedInvoiceIndex(prev => prev === null ? 0 : Math.max(prev - 1, 0)); }
                        if (e.key === 'Enter') { e.preventDefault(); const idx = selectedInvoiceIndex; setSelectedInvoiceIndex(idx === null ? 0 : idx); }
                        if (e.key === 'Escape') { e.preventDefault(); setSelectedInvoiceIndex(null); }
                      }}>
                      {filteredOrders.map((po, idx) => {
                        const paid = (po.payments ?? []).reduce((s, p) => s + p.amount, 0);
                        const rem = po.total - paid;
                        const isExpanded = selectedInvoiceIndex === idx;
                        return (
                          <div key={po.id}>
                            <div
                              className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer border-b text-xs transition-colors ${
                                isExpanded ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                              }`}
                              style={{ borderColor: 'var(--border-color)' }}
                              onClick={e => { e.stopPropagation(); setSelectedInvoiceIndex(isExpanded ? null : idx); }}
                            >
                              <span className="font-semibold min-w-[80px]">INV-{po.invoiceNumber}</span>
                              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{po.date}</span>
                              <span className="text-xs ms-auto font-semibold">{po.total.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</span>
                              <span className={`text-xs font-semibold ${rem > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                {rem > 0 ? `${rem.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج` : language === 'ar' ? 'مدفوع' : language === 'fr' ? 'Payé' : 'Paid'}
                              </span>
                            </div>
                            {/* Expanded detail */}
                            {isExpanded && (
                              <div className="border-b px-4 py-3" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}
                                onClick={e => e.stopPropagation()}>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{t('invoiceDetails')}</span>
                                  <button onClick={e => {
                                    e.stopPropagation();
                                    const win = window.open('', '_blank');
                                    if (!win) return;
                                    const paid = (po.payments ?? []).reduce((s, p) => s + p.amount, 0);
                                    const rem = po.total - paid;
                                    const itemsRows = po.items.map(item => `
                                      <tr>
                                        <td>${item.productName}</td>
                                        <td>${item.color}</td>
                                        <td style="text-align:center">${item.size || '—'}</td>
                                        <td style="text-align:center">${item.quantity}</td>
                                        <td style="text-align:right">${item.costPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                                        <td style="text-align:right">${(item.costPrice * item.quantity).toLocaleString(undefined, { maximumFractionDigits: 2 })} DZD</td>
                                      </tr>
                                    `).join('');
                                    win.document.write(`
                                      <html dir="${language === 'ar' ? 'rtl' : 'ltr'}">
                                      <head><title>INV-${po.invoiceNumber}</title>
                                      <style>
                                        @page { margin: 10mm; }
                                        * { box-sizing: border-box; margin: 0; padding: 0; }
                                        body { font-family: 'Segoe UI', 'Traditional Arabic', sans-serif; padding: 20px; color: #1a1a2e; max-width: 700px; margin: auto; font-size: 12px; }
                                        h2 { text-align: center; font-size: 16px; margin-bottom: 16px; border-bottom: 2px solid #1a1a2e; padding-bottom: 8px; }
                                        .info { margin-bottom: 12px; font-size: 11px; }
                                        table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 11px; }
                                        th { background: #1a1a2e; color: white; padding: 5px 7px; font-size: 10px; text-align: start; }
                                        td { padding: 5px 7px; border-bottom: 1px solid #e9ecef; }
                                        .summary { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-top: 12px; }
                                        .box { border: 1px solid #e9ecef; border-radius: 6px; padding: 10px; text-align: center; }
                                        .box .lbl { font-size: 9px; text-transform: uppercase; color: #6c757d; margin-bottom: 3px; }
                                        .box .val { font-size: 15px; font-weight: bold; }
                                        .red { color: #ef4444; }
                                        .green { color: #22c55e; }
                                        .blue { color: #2563eb; }
                                        .footer { margin-top: 20px; text-align: center; font-size: 9px; color: #6c757d; border-top: 1px solid #e9ecef; padding-top: 8px; }
                                      </style>
                                      </head><body>
                                        <h2>INV-${po.invoiceNumber}</h2>
                                        <div class="info"><strong>${t('supplierName')}:</strong> ${selectedSupplier?.name} &nbsp;|&nbsp; <strong>${t('date')}:</strong> ${po.date}</div>
                                        <table>
                                          <thead><tr>
                                            <th>${t('productName')}</th>
                                            <th>${t('color')}</th>
                                            <th style="text-align:center">${t('size')}</th>
                                            <th style="text-align:center">${t('quantity')}</th>
                                            <th style="text-align:right">${t('costPrice')}</th>
                                            <th style="text-align:right">${t('total')}</th>
                                          </tr></thead>
                                          <tbody>${itemsRows}</tbody>
                                        </table>
                                        <div class="summary">
                                          <div class="box"><div class="lbl">${t('total')}</div><div class="val blue">${po.total.toLocaleString(undefined, { maximumFractionDigits: 2 })} DZD</div></div>
                                          <div class="box"><div class="lbl">${t('paymentAmount')}</div><div class="val green">${paid.toLocaleString(undefined, { maximumFractionDigits: 2 })} DZD</div></div>
                                          <div class="box"><div class="lbl">${language === 'ar' ? 'المتبقي' : language === 'fr' ? 'Reste' : 'Remaining'}</div><div class="val ${rem > 0 ? 'red' : 'green'}">${rem.toLocaleString(undefined, { maximumFractionDigits: 2 })} DZD</div></div>
                                        </div>
                                        <div class="footer">${t('appName')}</div>
                                      </body></html>
                                    `);
                                    win.document.close();
                                    win.focus();
                                    win.print();
                                  }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-xs flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                                    <Printer size={13} /> {t('print')}
                                  </button>
                                </div>
                                <table className="w-full text-xs" style={{ color: 'var(--text-primary)' }}>
                                  <thead>
                                    <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                                      <th className="px-2 py-1.5 text-[10px] font-semibold text-start">{t('productName')}</th>
                                      <th className="px-2 py-1.5 text-[10px] font-semibold text-start">{t('color')}</th>
                                      <th className="px-2 py-1.5 text-[10px] font-semibold text-center">{t('size')}</th>
                                      <th className="px-2 py-1.5 text-[10px] font-semibold text-center">{t('quantity')}</th>
                                      <th className="px-2 py-1.5 text-[10px] font-semibold text-end">{t('costPrice')}</th>
                                      <th className="px-2 py-1.5 text-[10px] font-semibold text-end">{t('total')}</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {po.items.map((item, iidx) => (
                                      <tr key={iidx} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                                        <td className="px-2 py-1.5">{item.productName}</td>
                                        <td className="px-2 py-1.5">{item.color}</td>
                                        <td className="px-2 py-1.5 text-center">{item.size || '—'}</td>
                                        <td className="px-2 py-1.5 text-center">{item.quantity}</td>
                                        <td className="px-2 py-1.5 text-end">{item.costPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                                        <td className="px-2 py-1.5 text-end font-semibold">{(item.costPrice * item.quantity).toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot>
                                    <tr className="font-bold">
                                      <td colSpan={5} className="px-2 py-1.5 text-end">{t('total')}</td>
                                      <td className="px-2 py-1.5 text-end">{po.total.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</td>
                                    </tr>
                                    <tr>
                                      <td colSpan={5} className="px-2 py-1.5 text-end text-xs" style={{ color: 'var(--text-secondary)' }}>{t('paymentAmount')}</td>
                                      <td className="px-2 py-1.5 text-end font-semibold text-green-500">{paid.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</td>
                                    </tr>
                                    <tr>
                                      <td colSpan={5} className="px-2 py-1.5 text-end text-xs" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'المتبقي' : language === 'fr' ? 'Reste' : 'Remaining'}</td>
                                      <td className={`px-2 py-1.5 text-end font-semibold ${rem > 0 ? 'text-red-500' : 'text-green-500'}`}>{rem.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</td>
                                    </tr>
                                  </tfoot>
                                </table>
                                {/* PO-level payment input */}
                                <div className="flex items-center gap-2 mt-2">
                                  <input type="number" min="0" value={payPOAmounts[po.id] ?? ''} onChange={e => setPayPOAmounts(prev => ({ ...prev, [po.id]: e.target.value }))} onKeyDown={focusNextInput} onFocus={clearZeroOnFocus}
                                    className="w-20 px-2 py-1 rounded border text-xs text-center outline-none"
                                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                                    placeholder={t('paymentAmount')} />
                                  <button onClick={() => { const amt = Number(payPOAmounts[po.id]); if (amt > 0) { handlePayPO(po.id, amt); setPayPOAmounts(prev => ({ ...prev, [po.id]: '' })); } }}
                                    className="px-3 py-1 rounded bg-green-500 hover:bg-green-600 text-white text-[10px] font-medium"><Plus size={12} className="inline" /> {t('add')}</button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Payments section */}
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{t('addPayment')}</h3>
              <div className="flex gap-3 items-end flex-wrap">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{t('date')}</label>
                  <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddPayment(); } }}
                    onFocus={clearZeroOnFocus}
                    className="px-3 py-2 rounded-xl border text-sm outline-none"
                    style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{t('paymentAmount')}</label>
<input type="number" min="0" value={paymentAmount} onChange={e => setPaymentAmount(Number(e.target.value))}
  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddPayment(); } }}
  onFocus={e => { if (Number(e.target.value) === 0) e.target.value = ''; }}
  className="px-3 py-2 rounded-xl border text-sm outline-none w-32"
                    style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                </div>
                {editingPaymentId && (
                  <button onClick={() => { setEditingPaymentId(null); setPaymentAmount(0); setPaymentDate(new Date().toISOString().split('T')[0]); }} className="px-4 py-2 rounded-xl border text-sm" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                    {t('cancel')}
                  </button>
                )}
                <button onClick={handleAddPayment} className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium">
                  <Plus size={16} className="inline" /> {editingPaymentId ? t('edit') : t('add')}
                </button>
              </div>

              {supplierPayments.length > 0 && (
                <div className="overflow-x-auto border rounded-xl" style={{ borderColor: 'var(--border-color)' }}>
                  <table className="w-full text-sm" style={{ color: 'var(--text-primary)' }}>
                    <thead>
                      <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                        <th className="px-3 py-2 text-[11px] font-semibold text-start" style={{ color: 'var(--text-secondary)' }}>{t('date')}</th>
                        <th className="px-3 py-2 text-[11px] font-semibold text-end" style={{ color: 'var(--text-secondary)' }}>{t('paymentAmount')}</th>
                        <th className="px-3 py-2 w-16" />
                      </tr>
                    </thead>
                    <tbody>
                      {supplierPayments.map(p => (
                        <tr key={p.id} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                          <td className="px-3 py-2 text-xs">{p.date}</td>
                          <td className="px-3 py-2 text-xs text-end font-semibold text-green-500">{p.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</td>
                          <td className="px-3 py-2">
                            <div className="flex gap-1">
                              <button onClick={() => handleEditPayment(p)} className="p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-400"><Edit2 size={12} /></button>
                              <button onClick={() => handleDeletePayment(p.id)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400"><Trash2 size={12} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      <tr className="font-bold bg-green-50 dark:bg-green-900/10">
                        <td className="px-3 py-2 text-xs text-end">{t('total')}</td>
                        <td className="px-3 py-2 text-xs text-end text-green-500">{totalPaymentsAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</td>
                        <td />
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Fixed bottom summary bar */}
            <div className="shrink-0 border-t px-6 py-4 space-y-3" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border p-4 text-center" style={{ borderColor: 'var(--border-color)' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'الديون' : language === 'fr' ? 'Dettes' : 'Debts'}</p>
                  <p className="text-xl font-bold text-red-500">{debts.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</p>
                </div>
                <div className="rounded-xl border p-4 text-center" style={{ borderColor: 'var(--border-color)' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'المدفوعات' : language === 'fr' ? 'Paiements' : 'Payments'}</p>
                  <p className="text-xl font-bold text-green-500">{totalPaymentsAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</p>
                </div>
                <div className="rounded-xl border p-4 text-center" style={{ borderColor: 'var(--border-color)' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'المجموع الكلي' : language === 'fr' ? 'Total général' : 'Grand Total'}</p>
                  <p className="text-xl font-bold text-blue-500">{totalPurchasesAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setSelectedSupplierId(null)} className="px-5 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium">
                  {t('save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteConfirmId && !passwordMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setDeleteConfirmId(null)} />
          <div className="relative w-full max-w-sm mx-4 rounded-2xl shadow-xl border p-6 text-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <AlertTriangle size={40} className="mx-auto text-red-500 mb-3" />
            <p className="text-sm mb-2 font-bold" style={{ color: 'var(--text-primary)' }}>{t('confirmDelete')}</p>
            <p className="text-xs mb-5" style={{ color: 'var(--text-secondary)' }}>{t('thisActionCannotBeUndone')}</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 rounded-xl border text-sm" style={{ borderColor: 'var(--border-color)' }}>{t('cancel')}</button>
              <button onClick={handleConfirmDelete} className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium">{t('delete')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Password modal */}
      {deleteConfirmId && passwordMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => { setDeleteConfirmId(null); setPasswordMode(false); }} />
          <div className="relative w-full max-w-sm mx-4 rounded-2xl shadow-xl border p-6" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{t('passwordRequired')}</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>{t('enterPassword')}</p>
            <input type="password" value={deletePassword} onChange={e => setDeletePassword(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handlePasswordSubmit(); }}
              className="w-full px-3 py-2 rounded-xl border text-sm outline-none mb-4"
              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setDeleteConfirmId(null); setPasswordMode(false); }} className="px-4 py-2 rounded-xl border text-sm" style={{ borderColor: 'var(--border-color)' }}>{t('cancel')}</button>
              <button onClick={handlePasswordSubmit} className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium">{t('delete')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
