import { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../i18n/useTranslation';
import { useAppContext } from '../store/AppContext';
import { Plus, Trash2, Edit2, Lock, DollarSign, Receipt, TrendingUp, Printer, ExternalLink, Megaphone } from 'lucide-react';
import type { FixedExpense, VariableExpense, WorkerExpenseEntry, AdExpense } from '../types';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { clearZeroOnFocus } from '../shared/formHelpers';

const monthNamesAr = ['جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان', 'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const monthNamesFr = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const monthNamesEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function Expenses() {
  const { t, language } = useTranslation();
  const { fixedExpenses, addFixedExpense, updateFixedExpense, deleteFixedExpense,
    variableExpenses, addVariableExpense, updateVariableExpense, deleteVariableExpense,
    allFixedExpenseNames, allVariableExpenseNames, fixedExpenseLastAmounts,
    workers, workerExpenseEntries, addWorkerExpenseEntry, deleteWorkerExpenseEntry,
    password, adExpenses, addAdExpense, updateAdExpense, deleteAdExpense } = useAppContext();
  const navigate = useNavigate();

  const AUTH_KEY = 'auth_expenses';
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

  const monthNames = language === 'ar' ? monthNamesAr : language === 'fr' ? monthNamesFr : monthNamesEn;
  const [selectedMonth, setSelectedMonth] = useState(monthNamesAr[new Date().getMonth()]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Auto-fill from Workers page via URL params
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const wp = searchParams.get('workerCode');
    if (wp) {
      const m = searchParams.get('month');
      const y = searchParams.get('year');
      if (m && monthNamesAr.includes(m)) setSelectedMonth(m);
      if (y) setSelectedYear(Number(y));
      setWorkerCode(wp);
      setWorkerDesc('');
      setWorkerAmount(0);
      setWorkerNotes('');
      setWorkerDate(firstOfMonth(m && monthNamesAr.includes(m) ? m : selectedMonth, y ? Number(y) : selectedYear));
    }
  }, []);

  const totalFixed = fixedExpenses.reduce((s, f) => s + f.amount, 0);
  const monthVar = variableExpenses.filter(e => e.month === selectedMonth && e.year === selectedYear);
  const totalVariable = monthVar.reduce((s, e) => s + e.amount, 0);

  const today = new Date().toISOString().split('T')[0];
  const firstOfMonth = (m: string, y: number) => `${y}-${String(monthNamesAr.indexOf(m) + 1).padStart(2, '0')}-01`;
  const lastOfMonth = (m: string, y: number) => {
    const mi = monthNamesAr.indexOf(m);
    if (mi < 0) return `${y}-01-31`;
    const lastDay = new Date(y, mi + 1, 0).getDate();
    return `${y}-${String(mi + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  };

  // Fixed expense form
  const [fixedName, setFixedName] = useState('');
  const [fixedAmount, setFixedAmount] = useState(0);
  const [editingFixedId, setEditingFixedId] = useState<string | null>(null);
  const [fixedDate, setFixedDate] = useState(today);

  const resetFixedForm = () => {
    const first = firstOfMonth(selectedMonth, selectedYear);
    setEditingFixedId(null);
    setFixedName('');
    setFixedAmount(0);
    setFixedDate(first);
  };

  const handleFixedNameChange = (value: string) => {
    setFixedName(value);
    if (editingFixedId) return;
    if (fixedExpenseLastAmounts[value] !== undefined) {
      setFixedAmount(fixedExpenseLastAmounts[value]);
    }
  };

  const handleAddFixed = () => {
    if (!fixedName.trim()) return;
    const item: FixedExpense = {
      id: editingFixedId || Date.now().toString(),
      name: fixedName.trim(),
      amount: Number(fixedAmount),
      date: fixedDate,
    };
    if (editingFixedId) {
      updateFixedExpense(editingFixedId, item);
    } else {
      addFixedExpense(item);
    }
    resetFixedForm();
  };

  const startEditFixed = (f: FixedExpense) => {
    const first = firstOfMonth(selectedMonth, selectedYear);
    setEditingFixedId(f.id);
    setFixedName(f.name);
    setFixedAmount(f.amount);
    setFixedDate(f.date || first);
  };

  // Variable expense form
  const [varName, setVarName] = useState('');
  const [varAmount, setVarAmount] = useState(0);
  const [varDate, setVarDate] = useState(today);
  const [editingVarId, setEditingVarId] = useState<string | null>(null);

  const resetVarForm = () => {
    const first = firstOfMonth(selectedMonth, selectedYear);
    setEditingVarId(null);
    setVarName('');
    setVarAmount(0);
    setVarDate(first);
  };

  const handleAddVar = () => {
    if (!varName.trim() || varAmount <= 0) return;
    const item: VariableExpense = {
      id: editingVarId || Date.now().toString(),
      name: varName.trim(),
      amount: Number(varAmount),
      date: varDate,
      month: selectedMonth,
      year: selectedYear,
    };
    if (editingVarId) {
      updateVariableExpense(editingVarId, item);
    } else {
      addVariableExpense(item);
    }
    resetVarForm();
  };

  const startEditVar = (e: VariableExpense) => {
    setEditingVarId(e.id);
    setVarName(e.name);
    setVarAmount(e.amount);
    setVarDate(e.date);
  };

  // Worker expense form
  const [workerCode, setWorkerCode] = useState('');
  const [workerAmount, setWorkerAmount] = useState(0);
  const [workerDate, setWorkerDate] = useState(firstOfMonth(selectedMonth, selectedYear));
  const [workerDesc, setWorkerDesc] = useState('');
  const [workerNotes, setWorkerNotes] = useState('');

  const resetWorkerForm = () => {
    setWorkerCode('');
    setWorkerAmount(0);
    setWorkerDate(firstOfMonth(selectedMonth, selectedYear));
    setWorkerDesc('');
    setWorkerNotes('');
  };

  const handleAddWorkerExpense = () => {
    if (!workerCode || workerAmount <= 0) return;
    const entry: WorkerExpenseEntry = {
      id: Date.now().toString(),
      workerCode,
      workerName: workers.find(w => w.code === workerCode)?.name || '',
      amount: Number(workerAmount),
      description: workerDesc.trim(),
      notes: workerNotes.trim(),
      date: workerDate,
      month: selectedMonth,
      year: selectedYear,
    };
    addWorkerExpenseEntry(entry);
    resetWorkerForm();
  };

  const monthWorkerEntries = workerExpenseEntries.filter(e => e.month === selectedMonth && e.year === selectedYear);
  const totalWorkerExpenses = monthWorkerEntries.reduce((s, e) => s + e.amount, 0);
  const grandTotal = totalFixed + totalVariable + totalWorkerExpenses;

  // Ad expense form
  const [adAmountUsd, setAdAmountUsd] = useState(0);
  const [adExchangeRate, setAdExchangeRate] = useState(250);
  const [adStartDate, setAdStartDate] = useState(firstOfMonth(selectedMonth, selectedYear));
  const [adEndDate, setAdEndDate] = useState(lastOfMonth(selectedMonth, selectedYear));
  const [editingAdId, setEditingAdId] = useState<string | null>(null);
  const adAmountDzd = adAmountUsd * adExchangeRate;
  const monthAdExpenses = adExpenses.filter(e => e.month === selectedMonth && e.year === selectedYear);
  const totalAdExpenses = monthAdExpenses.reduce((s, e) => s + e.amountDzd, 0);

  const resetAdForm = () => {
    setEditingAdId(null);
    setAdAmountUsd(0);
    setAdExchangeRate(250);
    setAdStartDate(firstOfMonth(selectedMonth, selectedYear));
    setAdEndDate(lastOfMonth(selectedMonth, selectedYear));
  };

  const handleAddAd = () => {
    if (adAmountUsd <= 0) return;
    if (editingAdId) {
      updateAdExpense(editingAdId, {
        amountUsd: adAmountUsd,
        exchangeRate: adExchangeRate,
        amountDzd: adAmountDzd,
        startDate: adStartDate,
        endDate: adEndDate,
      });
    } else {
      addAdExpense({
        id: Date.now().toString(),
        amountUsd: adAmountUsd,
        exchangeRate: adExchangeRate,
        amountDzd: adAmountDzd,
        startDate: adStartDate,
        endDate: adEndDate,
        month: selectedMonth,
        year: selectedYear,
      });
    }
    resetAdForm();
  };

  const startEditAd = (e: AdExpense) => {
    setEditingAdId(e.id);
    setAdAmountUsd(e.amountUsd);
    setAdExchangeRate(e.exchangeRate);
    setAdStartDate(e.startDate);
    setAdEndDate(e.endDate);
  };

  // Unique worker codes for datalist
  const uniqueWorkerCodes = [...new Set(workers.map(w => w.code))].sort();

  // All unique variable expense names across months for datalist

  // Sync date inputs with selected month/year
  useEffect(() => {
    const monthIdx = monthNamesAr.indexOf(selectedMonth);
    if (monthIdx < 0) return;
    const first = firstOfMonth(selectedMonth, selectedYear);
    if (!editingFixedId) setFixedDate(first);
    if (!editingVarId) setVarDate(first);
  }, [selectedMonth, selectedYear]);

  const focusNextInput = (e: React.KeyboardEvent) => {
    const target = e.currentTarget as HTMLElement;
    if (e.key === 'Enter' && target instanceof HTMLSelectElement) return; // native open/close, auto-advance via initSelectAutoAdvance
    const container = target.closest('.expense-form, form, main');
    if (!container) return;
    const inputs = container.querySelectorAll('input, select, button');
    const idx = Array.from(inputs).indexOf(target);
    if (idx < 0) return;
    if (e.key === 'Enter') {
      if (target instanceof HTMLButtonElement) return;
      e.preventDefault();
      if (idx < inputs.length - 1) {
        (inputs[idx + 1] as HTMLElement).focus();
      }
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const dir = e.key === 'ArrowDown' ? 1 : -1;
      const nextIdx = idx + dir;
      if (nextIdx >= 0 && nextIdx < inputs.length) {
        (inputs[nextIdx] as HTMLElement).focus();
      }
    }
  };

  // Print
  const printFixed = () => {
    const rows = fixedExpenses.map(f =>
      `<tr><td>${f.date || ''}</td><td>${f.name}</td><td style="text-align:end">${f.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</td></tr>`
    ).join('');
    const total = fixedExpenses.reduce((s, f) => s + f.amount, 0);
    printWindow(`
      <h3>${language === 'ar' ? 'المصاريف الدائمة' : language === 'fr' ? 'Dépenses fixes' : 'Fixed Expenses'}</h3>
      <table border="1" cellpadding="6" cellspacing="0" style="width:100%;border-collapse:collapse;font-family:sans-serif;font-size:13px">
        <thead><tr style="background:#f3f4f6"><th>${t('date')}</th><th>${t('description')}</th><th style="text-align:end">${t('amount')}</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="3" style="text-align:center">—</td></tr>'}</tbody>
        <tfoot><tr style="font-weight:bold;background:#fff7ed"><td colspan="2">${t('totalExpenses')}</td><td style="text-align:end">${total.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</td></tr></tfoot>
      </table>`);
  };

  const printVariable = () => {
    const rows = monthVar.map(e =>
      `<tr><td>${e.date}</td><td>${e.name}</td><td style="text-align:end">${e.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</td></tr>`
    ).join('');
    printWindow(`
      <h3>${language === 'ar' ? 'المصاريف المتغيرة' : language === 'fr' ? 'Dépenses variables' : 'Variable Expenses'} (${monthNames[monthNamesAr.indexOf(selectedMonth)]} ${selectedYear})</h3>
      <table border="1" cellpadding="6" cellspacing="0" style="width:100%;border-collapse:collapse;font-family:sans-serif;font-size:13px">
        <thead><tr style="background:#f3f4f6"><th>${t('date')}</th><th>${t('description')}</th><th style="text-align:end">${t('amount')}</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="3" style="text-align:center">—</td></tr>'}</tbody>
        <tfoot><tr style="font-weight:bold;background:#eff6ff"><td colspan="2">${t('totalExpenses')}</td><td style="text-align:end">${totalVariable.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</td></tr></tfoot>
      </table>`);
  };

  const printAll = () => {
    const fixedRows = fixedExpenses.map(f =>
      `<tr><td>${f.date || ''}</td><td>${f.name}</td><td style="text-align:end">${f.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</td></tr>`
    ).join('');
    const fixedTotal = fixedExpenses.reduce((s, f) => s + f.amount, 0);
    const varRows = monthVar.map(e =>
      `<tr><td>${e.date}</td><td>${e.name}</td><td style="text-align:end">${e.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</td></tr>`
    ).join('');
    const workerRows = monthWorkerEntries.map(e =>
      `<tr><td>${e.date}</td><td>${e.workerCode} - ${e.workerName}</td><td>${e.description}</td><td style="text-align:end">${e.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</td></tr>`
    ).join('');
    printWindow(`
      <h3>${language === 'ar' ? 'المصاريف الدائمة' : language === 'fr' ? 'Dépenses fixes' : 'Fixed Expenses'}</h3>
      <table border="1" cellpadding="6" cellspacing="0" style="width:100%;border-collapse:collapse;font-family:sans-serif;font-size:13px">
        <thead><tr style="background:#f3f4f6"><th>${t('date')}</th><th>${t('description')}</th><th style="text-align:end">${t('amount')}</th></tr></thead>
        <tbody>${fixedRows || '<tr><td colspan="3" style="text-align:center">—</td></tr>'}</tbody>
        <tfoot><tr style="font-weight:bold;background:#fff7ed"><td colspan="2">${t('totalExpenses')}</td><td style="text-align:end">${fixedTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</td></tr></tfoot>
      </table><br/>
      <h3>${language === 'ar' ? 'المصاريف المتغيرة' : language === 'fr' ? 'Dépenses variables' : 'Variable Expenses'} (${monthNames[monthNamesAr.indexOf(selectedMonth)]} ${selectedYear})</h3>
      <table border="1" cellpadding="6" cellspacing="0" style="width:100%;border-collapse:collapse;font-family:sans-serif;font-size:13px">
        <thead><tr style="background:#f3f4f6"><th>${t('date')}</th><th>${t('description')}</th><th style="text-align:end">${t('amount')}</th></tr></thead>
        <tbody>${varRows || '<tr><td colspan="3" style="text-align:center">—</td></tr>'}</tbody>
        <tfoot><tr style="font-weight:bold;background:#eff6ff"><td colspan="2">${t('totalExpenses')}</td><td style="text-align:end">${totalVariable.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</td></tr></tfoot>
      </table><br/>
      <h3>${language === 'ar' ? 'مصاريف العمال' : language === 'fr' ? 'Dépenses ouvriers' : 'Worker Expenses'} (${monthNames[monthNamesAr.indexOf(selectedMonth)]} ${selectedYear})</h3>
      <table border="1" cellpadding="6" cellspacing="0" style="width:100%;border-collapse:collapse;font-family:sans-serif;font-size:13px">
        <thead><tr style="background:#f3f4f6"><th>${t('date')}</th><th>${language === 'ar' ? 'العامل' : language === 'fr' ? 'Ouvrier' : 'Worker'}</th><th>${t('description')}</th><th style="text-align:end">${t('amount')}</th></tr></thead>
        <tbody>${workerRows || '<tr><td colspan="4" style="text-align:center">—</td></tr>'}</tbody>
        <tfoot><tr style="font-weight:bold;background:#f3e8ff"><td colspan="3">${t('totalExpenses')}</td><td style="text-align:end">${totalWorkerExpenses.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</td></tr></tfoot>
      </table><br/>
      <hr/>
      <h3 style="text-align:${language === 'ar' ? 'left' : 'right'}">${language === 'ar' ? 'المجموع الكلي (ثابتة + متغيرة + عمال)' : language === 'fr' ? 'Total général (fixes + variables + ouvriers)' : 'Grand Total (Fixed + Variable + Workers)'}: ${grandTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</h3>`);
  };

  const printWindow = (html: string) => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html dir="${language === 'ar' ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><title>${t('expenses')}</title></head><body style="padding:20px">${html}</body></html>`);
    w.document.close();
    w.print();
  };

  const printRef = useRef(printAll);
  printRef.current = printAll;
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
            <input type="password" value={pwInput} onChange={e => { setPwInput(e.target.value); setPwError(false); }} placeholder={t('enterPassword')} autoFocus onKeyDown={focusNextInput}
              className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none ${pwError ? 'border-red-500 ring-2 ring-red-500/20' : ''}`}
              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: pwError ? undefined : 'var(--border-color)', color: 'var(--text-primary)' }} />
            {pwError && <p className="text-red-500 text-xs">{t('wrongPassword')}</p>}
            <button type="submit" className="w-full py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium">{t('enterPassword')}</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Receipt size={24} className="text-orange-500" /> {t('expenses')}
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
          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800" style={{ color: 'var(--text-secondary)' }}>P {t('print')}</span>
        </h1>
        <div className="flex items-center gap-3">
          <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} onKeyDown={focusNextInput}
            className="px-3 py-2 rounded-xl border text-sm outline-none"
            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
            {monthNames.map((m, i) => <option key={i} value={monthNamesAr[i]}>{m}</option>)}
          </select>
          <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} onKeyDown={focusNextInput}
            className="px-3 py-2 rounded-xl border text-sm outline-none"
            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
            {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="p-4 rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
              <DollarSign size={20} className="text-orange-500" />
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'مصاريف ثابتة' : language === 'fr' ? 'Dépenses fixes' : 'Fixed Expenses'}</p>
              <p className="text-lg font-bold text-orange-500">{totalFixed.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</p>
              <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{fixedExpenses.length} {t('count')}</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
              <TrendingUp size={20} className="text-blue-500" />
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'مصاريف متغيرة' : language === 'fr' ? 'Dépenses variables' : 'Variable Expenses'}</p>
              <p className="text-lg font-bold text-blue-500">{totalVariable.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</p>
              <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{monthVar.length} {t('count')}</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/20 flex items-center justify-center">
              <Receipt size={20} className="text-teal-500" />
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'مجموع (ثابتة + متغيرة)' : language === 'fr' ? 'Total (fixes + variables)' : 'Total (Fixed + Variable)'}</p>
              <p className="text-lg font-bold text-teal-500">{(totalFixed + totalVariable).toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</p>
              <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{fixedExpenses.length + monthVar.length} {t('count')}</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
              <Megaphone size={20} className="text-yellow-500" />
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'ميزانية الإعلانات' : language === 'fr' ? 'Budget pub' : 'Ad Budget'}</p>
              <p className="text-lg font-bold text-yellow-500">{totalAdExpenses.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</p>
              <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{monthAdExpenses.length} {t('count')}</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
              <DollarSign size={20} className="text-purple-500" />
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'مصاريف العمال' : language === 'fr' ? 'Dépenses ouvriers' : 'Worker Expenses'}</p>
              <p className="text-lg font-bold text-purple-500">{totalWorkerExpenses.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</p>
              <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{monthWorkerEntries.length} {t('count')}</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
              <Receipt size={20} className="text-green-500" />
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'مجموع (ثابتة + متغيرة + عمال)' : language === 'fr' ? 'Total (fixes + variables + ouvriers)' : 'Total (Fixed + Variable + Workers)'}</p>
              <p className="text-lg font-bold text-green-500">{grandTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</p>
            </div>
          </div>
        </div>
      </div>

      {/* Ad Expenses Section */}
      <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
          <Megaphone size={18} className="text-yellow-500" />
          <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{language === 'ar' ? 'الإعلانات' : language === 'fr' ? 'Publicité' : 'Ad Expenses'} - {monthNames[monthNamesAr.indexOf(selectedMonth)]} {selectedYear}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400">{totalAdExpenses.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</span>
        </div>
        <div className="p-4">
          <div className="expense-form flex items-end gap-2 mb-4 flex-wrap">
            <div className="w-28">
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'المبلغ ($)' : language === 'fr' ? 'Montant ($)' : 'Amount ($)'}</label>
              <input type="number" min="0" value={adAmountUsd || ''} onChange={e => setAdAmountUsd(Number(e.target.value))}
                onFocus={clearZeroOnFocus}
                onKeyDown={focusNextInput}
                className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
            </div>
            <div className="w-28">
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'سعر الصرف' : language === 'fr' ? 'Taux change' : 'Exchange Rate'}</label>
              <input type="number" min="0" value={adExchangeRate} onChange={e => setAdExchangeRate(Number(e.target.value))}
                onFocus={clearZeroOnFocus}
                onKeyDown={focusNextInput}
                className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
            </div>
            <div className="w-32">
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'المبلغ (دج)' : language === 'fr' ? 'Montant (DZD)' : 'Amount (DZD)'}</label>
              <input type="number" value={adAmountDzd} readOnly
                className="w-full px-3 py-2 rounded-xl border text-sm outline-none bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
            </div>
            <div className="min-w-[140px]">
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{t('startDate')}</label>
              <input type="date" value={adStartDate} onChange={e => setAdStartDate(e.target.value)}
                onFocus={clearZeroOnFocus}
                onKeyDown={focusNextInput}
                className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
            </div>
            <div className="min-w-[140px]">
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{t('endDate')}</label>
              <input type="date" value={adEndDate} onChange={e => setAdEndDate(e.target.value)}
                onFocus={clearZeroOnFocus}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddAd(); } }}
                className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
            </div>
            <button onClick={handleAddAd} className="flex items-center gap-1 px-4 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium transition-colors whitespace-nowrap">
              {editingAdId ? <Edit2 size={15} /> : <Plus size={15} />} {editingAdId ? t('edit') : t('add')}
            </button>
            {editingAdId && (
              <button onClick={resetAdForm} className="flex items-center gap-1 px-4 py-2 rounded-xl border text-sm" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>{t('cancel')}</button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ color: 'var(--text-primary)' }}>
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                  <th className="text-end p-2 font-semibold">{language === 'ar' ? 'المبلغ ($)' : language === 'fr' ? 'Montant ($)' : 'Amount ($)'}</th>
                  <th className="text-end p-2 font-semibold">{language === 'ar' ? 'السعر' : language === 'fr' ? 'Taux' : 'Rate'}</th>
                  <th className="text-end p-2 font-semibold">{language === 'ar' ? 'المبلغ (دج)' : language === 'fr' ? 'Montant (DZD)' : 'Amount (DZD)'}</th>
                  <th className="text-start p-2 font-semibold">{t('startDate')}</th>
                  <th className="text-start p-2 font-semibold">{t('endDate')}</th>
                  <th className="text-center p-2 font-semibold">{language === 'ar' ? 'الأيام' : language === 'fr' ? 'Jours' : 'Days'}</th>
                  <th className="text-end p-2 font-semibold">{language === 'ar' ? 'التكلفة اليومية' : language === 'fr' ? 'Coût journalier' : 'Daily Cost'}</th>
                  <th className="text-center p-2 font-semibold" style={{ width: 60 }}>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {monthAdExpenses.length === 0 ? (
                  <tr><td colSpan={8} className="p-4 text-center" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'لا توجد إعلانات' : language === 'fr' ? 'Aucune publicité' : 'No ad expenses'}</td></tr>
                ) : monthAdExpenses.map(e => {
                  const days = Math.max(1, Math.ceil((new Date(e.endDate).getTime() - new Date(e.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1);
                  const daily = e.amountDzd / days;
                  return (
                    <tr key={e.id} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                      <td className="p-2 text-end">${e.amountUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      <td className="p-2 text-end">{e.exchangeRate} دج</td>
                      <td className="p-2 text-end font-medium">{e.amountDzd.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</td>
                      <td className="p-2">{e.startDate}</td>
                      <td className="p-2">{e.endDate}</td>
                      <td className="p-2 text-center font-medium">{days}</td>
                      <td className="p-2 text-end">{daily.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</td>
                      <td className="p-2">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => startEditAd(e)} className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-500 transition-colors">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => deleteAdExpense(e.id)} className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Fixed Expenses Section */}
      <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
          <DollarSign size={18} className="text-orange-500" />
          <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{language === 'ar' ? 'المصاريف الدائمة' : language === 'fr' ? 'Dépenses fixes' : 'Fixed Expenses'} - {monthNames[monthNamesAr.indexOf(selectedMonth)]} {selectedYear}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">{totalFixed.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</span>
          <button onClick={printFixed} className="mr-auto p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" style={{ color: 'var(--text-secondary)' }} title={t('print')}>
            <Printer size={15} />
          </button>
        </div>
        <div className="p-4">
          <div className="expense-form flex items-end gap-2 mb-4 flex-wrap">
            <div className="min-w-[140px]">
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{t('date')}</label>
              <input type="date" value={fixedDate} onChange={e => setFixedDate(e.target.value)}
                onFocus={clearZeroOnFocus}
                onKeyDown={focusNextInput}
                className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{t('description')}</label>
              <input list="fixedExpenseList" type="text" value={fixedName} onChange={e => handleFixedNameChange(e.target.value)}
                onKeyDown={focusNextInput} placeholder={t('description')}
                className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
              <datalist id="fixedExpenseList">
                {allFixedExpenseNames.map((n, i) => <option key={i} value={n} />)}
              </datalist>
            </div>
            <div className="w-28">
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{t('amount')}</label>
              <input type="number" min="0" value={fixedAmount || ''} onChange={e => setFixedAmount(Number(e.target.value))}
                onKeyDown={focusNextInput}
                onFocus={e => { if (Number(e.target.value) === 0) e.target.value = ''; }}
                className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
            </div>
            <button onClick={handleAddFixed} onKeyDown={focusNextInput} className="flex items-center gap-1 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium transition-colors whitespace-nowrap">
              {editingFixedId ? <Edit2 size={15} /> : <Plus size={15} />} {editingFixedId ? t('edit') : t('add')}
            </button>
            {editingFixedId && (
              <button onClick={resetFixedForm} className="px-3 py-2 rounded-xl border text-sm" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>{t('cancel')}</button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ color: 'var(--text-primary)' }}>
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                  <th className="text-start p-2 font-semibold">{t('date')}</th>
                  <th className="text-start p-2 font-semibold">{t('description')}</th>
                  <th className="text-end p-2 font-semibold">{t('amount')}</th>
                  <th className="text-center p-2 font-semibold" style={{ width: 80 }}>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {fixedExpenses.length === 0 ? (
                  <tr><td colSpan={4} className="p-4 text-center" style={{ color: 'var(--text-secondary)' }}>{t('noExpenses')}</td></tr>
                ) : fixedExpenses.map(f => (
                  <tr key={f.id} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                    <td className="p-2">{f.date ? new Date(f.date).toLocaleDateString(language === 'ar' ? 'ar-SA' : language === 'fr' ? 'fr-FR' : 'en-US') : ''}</td>
                    <td className="p-2">{f.name}</td>
                    <td className="p-2 text-end font-medium">{f.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</td>
                    <td className="p-2">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => startEditFixed(f)} className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-500 transition-colors">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => deleteFixedExpense(f.id)} className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Variable Expenses Section - per month */}
      <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
          <TrendingUp size={18} className="text-blue-500" />
          <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{language === 'ar' ? 'المصاريف المتغيرة' : language === 'fr' ? 'Dépenses variables' : 'Variable Expenses'} - {monthNames[monthNamesAr.indexOf(selectedMonth)]} {selectedYear}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">{totalVariable.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</span>
          <button onClick={printVariable} className="mr-auto p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" style={{ color: 'var(--text-secondary)' }} title={t('print')}>
            <Printer size={15} />
          </button>
        </div>
        <div className="p-4">
          <div className="expense-form flex items-end gap-2 mb-4 flex-wrap">
            <div className="min-w-[140px]">
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{t('date')}</label>
              <input type="date" value={varDate} onChange={e => setVarDate(e.target.value)}
                onFocus={clearZeroOnFocus}
                onKeyDown={focusNextInput}
                className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{t('description')}</label>
              <input list="varExpenseList" type="text" value={varName} onChange={e => setVarName(e.target.value)}
                onKeyDown={focusNextInput} placeholder={t('description')}
                className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
              <datalist id="varExpenseList">
                {allVariableExpenseNames.map((n, i) => <option key={i} value={n} />)}
              </datalist>
            </div>
            <div className="w-28">
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{t('amount')}</label>
              <input type="number" min="0" value={varAmount || ''} onChange={e => setVarAmount(Number(e.target.value))}
                onKeyDown={focusNextInput}
                onFocus={e => { if (Number(e.target.value) === 0) e.target.value = ''; }}
                className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
            </div>
            <button onClick={handleAddVar} onKeyDown={focusNextInput} className="flex items-center gap-1 px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors whitespace-nowrap">
              {editingVarId ? <Edit2 size={15} /> : <Plus size={15} />} {editingVarId ? t('edit') : t('add')}
            </button>
            {editingVarId && (
              <button onClick={resetVarForm} className="px-3 py-2 rounded-xl border text-sm" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>{t('cancel')}</button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ color: 'var(--text-primary)' }}>
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                  <th className="text-start p-2 font-semibold">{t('date')}</th>
                  <th className="text-start p-2 font-semibold">{t('description')}</th>
                  <th className="text-end p-2 font-semibold">{t('amount')}</th>
                  <th className="text-center p-2 font-semibold" style={{ width: 80 }}>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {monthVar.length === 0 ? (
                  <tr><td colSpan={4} className="p-4 text-center" style={{ color: 'var(--text-secondary)' }}>{t('noExpenses')}</td></tr>
                ) : monthVar.map(e => (
                  <tr key={e.id} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                    <td className="p-2">{new Date(e.date).toLocaleDateString(language === 'ar' ? 'ar-SA' : language === 'fr' ? 'fr-FR' : 'en-US')}</td>
                    <td className="p-2">{e.name}</td>
                    <td className="p-2 text-end font-medium">{e.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</td>
                    <td className="p-2">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => startEditVar(e)} className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-500 transition-colors">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => deleteVariableExpense(e.id)} className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Worker Expenses Section */}
      <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
          <DollarSign size={18} className="text-purple-500" />
          <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{language === 'ar' ? 'مصاريف العمال' : language === 'fr' ? 'Dépenses ouvriers' : 'Worker Expenses'} - {monthNames[monthNamesAr.indexOf(selectedMonth)]} {selectedYear}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">{totalWorkerExpenses.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</span>
          <button onClick={() => navigate('/workers')} className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-500 hover:bg-purple-600 text-white text-xs font-medium transition-colors">
            <ExternalLink size={13} /> {language === 'ar' ? 'صفحة العمال' : language === 'fr' ? 'Page ouvriers' : 'Workers Page'}
          </button>
        </div>
        <div className="p-4">
          <div className="expense-form flex items-end gap-2 mb-4 flex-wrap">
            <div className="min-w-[140px]">
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{t('date')}</label>
              <input type="date" value={workerDate} onChange={e => setWorkerDate(e.target.value)}
                onFocus={clearZeroOnFocus}
                onKeyDown={focusNextInput}
                className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
            </div>
            <div className="min-w-[120px]">
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'العامل' : language === 'fr' ? 'Ouvrier' : 'Worker'}</label>
              <input list="workerCodeList" type="text" value={workerCode} onChange={e => setWorkerCode(e.target.value)}
                onKeyDown={focusNextInput} placeholder={t('workerCode')}
                className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
              <datalist id="workerCodeList">
                {uniqueWorkerCodes.map((c, i) => {
                  const w = workers.find(x => x.code === c);
                  return <option key={i} value={c}>{w ? `${c} - ${w.name}` : c}</option>;
                })}
              </datalist>
            </div>
            <div className="flex-1 min-w-[120px]">
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{t('description')}</label>
              <input type="text" value={workerDesc} onChange={e => setWorkerDesc(e.target.value)}
                onKeyDown={focusNextInput} placeholder={t('description')}
                className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
            </div>
            <div className="w-28">
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{t('amount')}</label>
              <input type="number" min="0" value={workerAmount || ''} onChange={e => setWorkerAmount(Number(e.target.value))}
                onKeyDown={focusNextInput}
                onFocus={e => { if (Number(e.target.value) === 0) e.target.value = ''; }}
                className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
            </div>
            <div className="flex-1 min-w-[120px]">
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'ملاحظة' : language === 'fr' ? 'Note' : 'Notes'}</label>
              <input type="text" value={workerNotes} onChange={e => setWorkerNotes(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddWorkerExpense(); } }}
                placeholder={language === 'ar' ? 'ملاحظة' : language === 'fr' ? 'Note' : 'Notes'}
                className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
            </div>
            <button onClick={handleAddWorkerExpense} className="flex items-center gap-1 px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium transition-colors whitespace-nowrap">
              <Plus size={15} /> {t('add')}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ color: 'var(--text-primary)' }}>
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                  <th className="text-start p-2 font-semibold">{t('date')}</th>
                  <th className="text-start p-2 font-semibold">{language === 'ar' ? 'العامل' : language === 'fr' ? 'Ouvrier' : 'Worker'}</th>
                  <th className="text-start p-2 font-semibold">{t('description')}</th>
                  <th className="text-start p-2 font-semibold">{language === 'ar' ? 'ملاحظة' : language === 'fr' ? 'Note' : 'Notes'}</th>
                  <th className="text-end p-2 font-semibold">{t('amount')}</th>
                  <th className="text-center p-2 font-semibold" style={{ width: 60 }}>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {monthWorkerEntries.length === 0 ? (
                  <tr><td colSpan={6} className="p-4 text-center" style={{ color: 'var(--text-secondary)' }}>{t('noExpenses')}</td></tr>
                ) : monthWorkerEntries.map(e => (
                  <tr key={e.id} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                    <td className="p-2">{new Date(e.date).toLocaleDateString(language === 'ar' ? 'ar-SA' : language === 'fr' ? 'fr-FR' : 'en-US')}</td>
                    <td className="p-2">{e.workerCode} - {e.workerName}</td>
                    <td className="p-2">{e.description}</td>
                    <td className="p-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{e.notes}</td>
                    <td className="p-2 text-end font-medium">{e.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</td>
                    <td className="p-2">
                      <div className="flex items-center justify-center">
                        <button onClick={() => deleteWorkerExpenseEntry(e.id)} className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
