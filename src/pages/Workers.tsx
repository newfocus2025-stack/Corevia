import { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../i18n/useTranslation';
import { useAppContext } from '../store/AppContext';
import type { WorkerExpense } from '../types';
import { Plus, Edit2, Trash2, Lock, X, Calculator, Printer, ArrowLeft, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { focusNextInput, clearZeroOnFocus } from '../shared/formHelpers';

const DAYS_IN_MONTH = 30;

function calcDailyWage(salary: number) { return salary / DAYS_IN_MONTH; }
function calcHourlyWage(salary: number, dailyHours: number) { return calcDailyWage(salary) / Math.max(dailyHours, 1); }

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

export default function Workers() {
  const { t, language } = useTranslation();
  const { workers, addWorker, updateWorker, deleteWorker, addToTrash, password, addWorkerExpenseEntry, deleteWorkerExpenseByFields, workerExpenseEntries, orders } = useAppContext();
  const navigate = useNavigate();

  const AUTH_KEY = 'auth_workers';
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
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deletePwMode, setDeletePwMode] = useState(false);
  const [deletePwInput, setDeletePwInput] = useState('');

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [salary, setSalary] = useState(0);
  const [dailyHours, setDailyHours] = useState(8);
  const [overtimeHours, setOvertimeHours] = useState(0);
  const [overtimeRate, setOvertimeRate] = useState(0);
  const [missingHours, setMissingHours] = useState(0);
  const [absenceDays, setAbsenceDays] = useState(0);
  const [expenses, setExpenses] = useState<WorkerExpense[]>([]);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState(0);
  const [paid, setPaid] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [payPeriodStart, setPayPeriodStart] = useState('');
  const [payPeriodEnd, setPayPeriodEnd] = useState('');
  const [showCalc, setShowCalc] = useState<string | null>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payModalCode, setPayModalCode] = useState('');
  const [selectedMonths, setSelectedMonths] = useState<Set<string>>(new Set());
  const expenseDescRef = useRef<HTMLInputElement>(null);
  const printWorkersRef = useRef(() => {});
  const formCache = useRef<Record<string, { overtimeHours: number; overtimeRate: number; missingHours: number; absenceDays: number; expenses: WorkerExpense[] }>>({});
  const prevWorkerCode = useRef<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'p' && !e.ctrlKey && !e.metaKey && !e.altKey && !showForm && !deleteConfirm) {
        if (showCalc) {
          const recs = workers.filter(x => x.code === showCalc);
          if (recs.length > 0) printWorkerDetail(recs[0]);
        } else {
          printWorkersRef.current();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showForm, deleteConfirm, showCalc, workers]);

  const autoCreated = useRef(false);
  useEffect(() => {
    if (autoCreated.current) return;
    autoCreated.current = true;
    // Auto-advance filter if system month changed
    if (monthFilter !== currentMonth || yearFilter !== currentYear) {
      setMonthFilter(currentMonth);
      setYearFilter(currentYear);
    }
    const existing = new Set(workers.filter(x => x.month === currentMonth && x.year === currentYear).map(x => x.code));
    workers.forEach(w => {
      if (!existing.has(w.code)) {
        addWorker({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 4),
          code: w.code, name: w.name, phone: w.phone || '',
          salary: 0, dailyHours: w.dailyHours || 8,
          month: currentMonth, year: currentYear,
          payPeriodStart: '', payPeriodEnd: '',
          overtimeHours: 0, overtimeRate: 0,
          missingHours: 0, absenceDays: 0,
        expenses: [], paid: false, paymentAmount: 0, paymentDate: undefined,
        });
        existing.add(w.code);
      }
    });
  }, []);

  const now = new Date();
  const monthNames = ['جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان', 'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const currentMonth = monthNames[now.getMonth()];
  const currentYear = now.getFullYear();
  const years = Array.from({ length: 31 }, (_, i) => currentYear - 5 + i);
  const [monthVal, setMonthVal] = useState(currentMonth);
  const [yearVal, setYearVal] = useState(currentYear);
  const [searchWorker, setSearchWorker] = useState('');
  const [monthFilter, setMonthFilter] = useState(currentMonth);
  const [yearFilter, setYearFilter] = useState(currentYear);
  const [showYearlySummary, setShowYearlySummary] = useState(false);

  const fillDates = (m: string, y: number) => {
    const mi = monthNames.indexOf(m);
    if (mi === -1) return;
    const fd = new Date(y, mi, 1);
    const ld = new Date(y, mi + 1, 0);
    const fmt = (d: Date) => { const mm = String(d.getMonth() + 1).padStart(2, '0'); const dd = String(d.getDate()).padStart(2, '0'); return `${d.getFullYear()}-${mm}-${dd}`; };
    setPayPeriodStart(fmt(fd));
    setPayPeriodEnd(fmt(ld));
  };

  const getNextCode = () => {
    const max = workers.reduce((m, w) => Math.max(m, parseInt(w.code, 10) || 0), 0);
    return String(max + 1).padStart(3, '0');
  };

  const resetForm = () => {
    formCache.current = {};
    prevWorkerCode.current = null;
    setCode(getNextCode()); setName(''); setPhone(''); setSalary(0); setDailyHours(8);
    setOvertimeHours(0); setOvertimeRate(0); setMissingHours(0); setAbsenceDays(0);
    setShowExpenseModal(false); setExpenseDesc(''); setExpenseAmount(0); setExpenses([]); setPaid(false); setPaymentAmount(0); setPaymentDate(new Date().toISOString().split('T')[0]);
    setMonthVal(currentMonth); setYearVal(currentYear);
    fillDates(currentMonth, currentYear);
    setEditId(null); setShowForm(false);
  };

  const addExpense = () => {
    if (!expenseDesc.trim() || expenseAmount <= 0) return;
    setExpenses(prev => [...prev, { description: expenseDesc.trim(), amount: expenseAmount, date: expenseDate || new Date().toISOString().split('T')[0] }]);
    setExpenseDesc(''); setExpenseAmount(0);
    setExpenseDate(new Date().toISOString().split('T')[0]);
    setShowExpenseModal(false);
    setTimeout(() => expenseDescRef.current?.focus(), 100);
  };

  const removeExpense = (idx: number) => {
    setExpenses(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) {
      const existing = workers.find(w => w.id === editId);
      if (existing) {
        updateWorker(editId, {
          code, name, phone, salary, dailyHours,
          overtimeHours, overtimeRate, missingHours, absenceDays,
          expenses, payPeriodStart, payPeriodEnd, paid, paymentAmount: paid ? paymentAmount : 0, paymentDate: paid ? paymentDate : undefined,
          month: monthVal, year: yearVal,
        });
        // Sync dailyHours across all months for same worker code
        if (dailyHours !== existing.dailyHours) {
          workers.filter(w => w.code === code && w.id !== editId).forEach(w => {
            updateWorker(w.id, { dailyHours });
          });
        }
        toast.success(language === 'ar' ? 'تم تحديث العامل' : language === 'fr' ? 'Travailleur mis à jour' : 'Worker updated');
      }
    } else {
      addWorker({
        id: Date.now().toString(), code, name, phone, salary, dailyHours,
        overtimeHours, overtimeRate, missingHours, absenceDays,
        expenses, payPeriodStart, payPeriodEnd, paid, paymentAmount: paid ? paymentAmount : 0, paymentDate: paid ? paymentDate : undefined,
        month: monthVal, year: yearVal,
      });
      toast.success(language === 'ar' ? 'تم إضافة العامل' : language === 'fr' ? 'Travailleur ajouté' : 'Worker added');
    }
    // Sync expenses to workerExpenseEntries
    const existingEntries = workerExpenseEntries.filter(e => e.workerCode === code && e.month === monthVal && e.year === yearVal);
    // Add missing entries
    for (const exp of expenses) {
      const exists = existingEntries.some(e =>
        e.description === exp.description && e.amount === exp.amount && e.date === exp.date && (e.notes || '') === (exp.notes || '')
      );
      if (!exists) {
        addWorkerExpenseEntry({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 4),
          workerCode: code,
          workerName: name,
          amount: exp.amount,
          description: exp.description,
          notes: exp.notes || '',
          date: exp.date,
          month: monthVal,
          year: yearVal,
        });
      }
    }
    // Remove orphaned entries
    for (const entry of existingEntries) {
      const exists = expenses.some(e =>
        e.description === entry.description && e.amount === entry.amount && e.date === entry.date && (e.notes || '') === (entry.notes || '')
      );
      if (!exists) {
        deleteWorkerExpenseByFields(entry.workerCode, entry.month, entry.year, entry.description, entry.amount, entry.date, entry.notes);
      }
    }
    resetForm();
  };

  const handleEdit = (w: typeof workers[0]) => {
    setCode(w.code); setName(w.name); setPhone(w.phone || ''); setSalary(Number(w.salary) || 0);
    setDailyHours(Number(w.dailyHours) || 8);
    setOvertimeHours(Number(w.overtimeHours) || 0); setOvertimeRate(Number(w.overtimeRate) || 0);
    setMissingHours(Number(w.missingHours) || 0); setAbsenceDays(Number(w.absenceDays) || 0);
    setExpenses(w.expenses || []);
    setPaid(!!w.paid); setPaymentAmount(w.paymentAmount || 0); setPaymentDate(w.paymentDate || new Date().toISOString().split('T')[0]);
    setPayPeriodStart(w.payPeriodStart || ''); setPayPeriodEnd(w.payPeriodEnd || '');
    setMonthVal(w.month || currentMonth); setYearVal(Number(w.year) || currentYear);
    formCache.current[`${w.year || currentYear}-${w.month || currentMonth}`] = { overtimeHours: w.overtimeHours || 0, overtimeRate: w.overtimeRate || 0, missingHours: w.missingHours || 0, absenceDays: w.absenceDays || 0, expenses: w.expenses || [] };
    setEditId(w.id); setShowForm(true);
  };

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

  const filteredWorkers = workers.filter(w => w.month === monthFilter);
  const yearlyWorkers = showYearlySummary ? workers.filter(w => w.year === yearFilter) : [];
  const totalSalaries = filteredWorkers.reduce((s, w) => s + w.salary, 0);
  const totalOvertimePay = filteredWorkers.reduce((s, w) => {
    return s + ((w.overtimeHours || 0) * (w.overtimeRate || 0));
  }, 0);
  const totalDeductions = filteredWorkers.reduce((s, w) => {
    const hw = calcHourlyWage(w.salary, w.dailyHours || 8);
    const dw = calcDailyWage(w.salary);
    const md = (w.missingHours || 0) * hw;
    const ad = (w.absenceDays || 0) * dw;
    const ex = (w.expenses || []).reduce((es, e) => es + e.amount, 0);
    return s + md + ad + ex;
  }, 0);
  const totalNet = filteredWorkers.reduce((s, w) => {
    const hw = calcHourlyWage(w.salary, w.dailyHours || 8);
    const dw = calcDailyWage(w.salary);
    const op = (w.overtimeHours || 0) * (w.overtimeRate || 0);
    const md = (w.missingHours || 0) * hw;
    const ad = (w.absenceDays || 0) * dw;
    const ex = (w.expenses || []).reduce((es, e) => es + e.amount, 0);
    return s + w.salary + op - md - ad - ex;
  }, 0);
  const grandSalaries = workers.reduce((s, w) => s + w.salary, 0);
  const grandOT = workers.reduce((s, w) => s + ((w.overtimeHours || 0) * (w.overtimeRate || 0)), 0);
  const grandDed = workers.reduce((s, w) => {
    const hw = calcHourlyWage(w.salary, w.dailyHours || 8);
    const dw = calcDailyWage(w.salary);
    return s + (w.missingHours || 0) * hw + (w.absenceDays || 0) * dw + (w.expenses || []).reduce((es, e) => es + e.amount, 0);
  }, 0);
  const grandNet = workers.reduce((s, w) => {
    const hw = calcHourlyWage(w.salary, w.dailyHours || 8);
    const dw = calcDailyWage(w.salary);
    const op = (w.overtimeHours || 0) * (w.overtimeRate || 0);
    const md = (w.missingHours || 0) * hw;
    const ad = (w.absenceDays || 0) * dw;
    const ex = (w.expenses || []).reduce((es, e) => es + e.amount, 0);
    return s + w.salary + op - md - ad - ex;
  }, 0);

  const printWorkers = () => {
    const printWin = window.open('', '_blank');
    if (!printWin) return;
    printWin.document.write(`<!DOCTYPE html><html dir="${language === 'ar' ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><title>${t('workers')}</title><style>
      * { margin: 0; padding: 0; box-sizing: border-box; font-family: ${language === 'ar' ? "'Traditional Arabic', Arial" : "Arial, sans-serif"}; }
      body { padding: 20px; color: #111; }
      h1 { font-size: 20px; margin-bottom: 16px; text-align: center; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: ${language === 'ar' ? 'right' : 'left'}; }
      th { background: #f0f0f0; font-weight: 600; }
      .text-end { text-align: right; }
      .text-center { text-align: center; }
      .text-green { color: #059669; font-weight: 700; }
      .text-red { color: #dc2626; font-weight: 700; }
      .net { font-weight: 700; }
      @media print { body { padding: 0; } }
    </style></head><body>
      <h1>${language === 'ar' ? 'قائمة العمال' : language === 'fr' ? 'Liste des travailleurs' : 'Workers List'}</h1>
      <table>
        <thead><tr>
          <th>${language === 'ar' ? 'الرمز' : language === 'fr' ? 'Code' : 'Code'}</th>
          <th>${language === 'ar' ? 'الاسم' : language === 'fr' ? 'Nom' : 'Name'}</th>
          <th>${language === 'ar' ? 'الشهر' : language === 'fr' ? 'Mois' : 'Month'}</th>
          <th>${language === 'ar' ? 'س.إضافية' : language === 'fr' ? 'H.Supp' : 'Overtime'}</th>
          <th>${language === 'ar' ? 'س.ناقصة' : language === 'fr' ? 'H.Manq' : 'Miss'}</th>
          <th>${language === 'ar' ? 'غياب' : language === 'fr' ? 'Abs' : 'Abs.'}</th>
          <th class="text-end">${language === 'ar' ? 'الراتب' : language === 'fr' ? 'Salaire' : 'Salary'}</th>
          <th class="text-end">${language === 'ar' ? 'الصافي' : language === 'fr' ? 'Net' : 'Net'}</th>
        </tr></thead>
        <tbody>
          ${filteredWorkers.map(w => {
            const hw = calcHourlyWage(w.salary, w.dailyHours || 8);
            const dw = calcDailyWage(w.salary);
            const op = (w.overtimeHours || 0) * (w.overtimeRate || 0);
            const md = (w.missingHours || 0) * hw;
            const ad = (w.absenceDays || 0) * dw;
            const ex = (w.expenses || []).reduce((es, e) => es + e.amount, 0);
            const net = w.salary + op - md - ad - ex;
            return `<tr>
              <td>${w.code}</td><td>${w.name}</td>
              <td class="text-center">${w.month || '-'} ${w.year || ''}</td>
              <td class="text-center">${w.overtimeHours || 0}</td>
              <td class="text-center">${w.missingHours || 0}</td>
              <td class="text-center">${w.absenceDays || 0}</td>
              <td class="text-end">${w.salary.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</td>
              <td class="text-end ${net >= 0 ? 'text-green' : 'text-red'}">${net.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
      <p style="margin-top:12px;font-size:11px;text-align:center;color:#666;">
        ${language === 'ar' ? 'مجموع الرواتب' : language === 'fr' ? 'Salaires totaux' : 'Total Salaries'}: ${totalSalaries.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج |
        ${language === 'ar' ? 'الخصومات' : language === 'fr' ? 'Déductions' : 'Deductions'}: ${totalDeductions.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج |
        ${language === 'ar' ? 'الصافي' : language === 'fr' ? 'Net' : 'Net'}: ${totalNet.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج
      </p>
      <p style="margin-top:4px;font-size:10px;text-align:center;color:#999;">${new Date().toLocaleDateString(language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-DZ' : 'en-US')}</p>
    </body></html>`);
    printWin.document.close();
    setTimeout(() => { printWin.print(); }, 300);
  };
  const printWorkerDetail = (w: typeof workers[0]) => {
    const hw = calcHourlyWage(w.salary, w.dailyHours || 8);
    const dw = calcDailyWage(w.salary);
    const op = (w.overtimeHours || 0) * (w.overtimeRate || 0);
    const md = (w.missingHours || 0) * hw;
    const ad = (w.absenceDays || 0) * dw;
    const ex = (w.expenses || []).reduce((es, e) => es + e.amount, 0);
    const net = w.salary + op - md - ad - ex;
    const printWin = window.open('', '_blank');
    if (!printWin) return;
    let expensesHtml = '';
    if (w.expenses && w.expenses.length > 0) {
      expensesHtml = `<h3 style="font-size:14px;margin:12px 0 6px;">${language === 'ar' ? 'المصاريف' : language === 'fr' ? 'Dépenses' : 'Expenses'}</h3>
        <table><thead><tr>
          <th>${language === 'ar' ? 'التاريخ' : language === 'fr' ? 'Date' : 'Date'}</th>
          <th style="text-align:${language === 'ar' ? 'right' : 'left'}">${language === 'ar' ? 'الوصف' : language === 'fr' ? 'Description' : 'Description'}</th>
          <th style="text-align:right">${language === 'ar' ? 'المبلغ' : language === 'fr' ? 'Montant' : 'Amount'}</th>
        </tr></thead><tbody>
          ${w.expenses.map(e => `<tr>
            <td style="text-align:center">${e.date || '-'}</td>
            <td>${e.description}</td>
            <td style="text-align:right">${e.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</td>
          </tr>`).join('')}
        </tbody></table>`;
    }
    printWin.document.write(`<!DOCTYPE html><html dir="${language === 'ar' ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><title>${w.name} - ${t('workers')}</title><style>
      * { margin: 0; padding: 0; box-sizing: border-box; font-family: ${language === 'ar' ? "'Traditional Arabic', Arial" : "Arial, sans-serif"}; }
      body { padding: 20px; color: #111; }
      h1 { font-size: 18px; text-align: center; margin-bottom: 2px; }
      .subtitle { text-align: center; font-size: 11px; color: #666; margin-bottom: 14px; }
      .info-grid { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; font-size: 11px; }
      .info-item { background: #f5f5f5; padding: 5px 8px; border-radius: 4px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border: 1px solid #ccc; padding: 5px 8px; text-align: ${language === 'ar' ? 'right' : 'left'}; }
      th { background: #f0f0f0; font-weight: 600; }
      .text-end { text-align: right; }
      .text-center { text-align: center; }
      .text-green { color: #059669; font-weight: 700; }
      .text-red { color: #dc2626; font-weight: 700; }
      .net-row td { border-top: 2px solid #333; font-weight: 700; font-size: 14px; }
      @media print { body { padding: 10px; } }
    </style></head><body>
      <h1>${w.name}</h1>
      <p class="subtitle">${language === 'ar' ? 'كشف راتب' : language === 'fr' ? 'Bulletin de salaire' : 'Payroll Details'} — ${w.month} ${w.year} | ${language === 'ar' ? 'الرمز' : language === 'fr' ? 'Code' : 'Code'}: ${w.code}${w.paid ? ' | ✅' + (language === 'ar' ? 'تم الدفع' : language === 'fr' ? 'Payé' : 'Paid') : ''}</p>
      <div class="info-grid">
        <div class="info-item">${language === 'ar' ? 'الراتب الأساسي' : language === 'fr' ? 'Salaire de base' : 'Base Salary'}: ${w.salary.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</div>
        <div class="info-item">${language === 'ar' ? 'الأجر اليومي' : language === 'fr' ? 'Journalier' : 'Daily Wage'}: ${dw.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</div>
        <div class="info-item">${language === 'ar' ? 'الأجر الساعي' : language === 'fr' ? 'Horaire' : 'Hourly Wage'}: ${hw.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</div>
        <div class="info-item">${language === 'ar' ? 'ساعات العمل' : language === 'fr' ? 'H/jour' : 'Hours/day'}: ${w.dailyHours || 8}</div>
        ${w.payPeriodStart && w.payPeriodEnd ? `<div class="info-item">${language === 'ar' ? 'الفترة' : language === 'fr' ? 'Période' : 'Period'}: ${w.payPeriodStart} → ${w.payPeriodEnd}</div>` : ''}
      </div>
      <table>
        <thead><tr>
          <th>${language === 'ar' ? 'البيان' : language === 'fr' ? 'Description' : 'Item'}</th>
          <th style="text-align:right">${language === 'ar' ? 'المبلغ' : language === 'fr' ? 'Montant' : 'Amount'}</th>
        </tr></thead>
        <tbody>
          <tr><td>${language === 'ar' ? 'الراتب الأساسي' : language === 'fr' ? 'Salaire de base' : 'Base Salary'}</td><td class="text-end">${w.salary.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</td></tr>
          ${op > 0 ? `<tr><td>${language === 'ar' ? 'الساعات الإضافية' : language === 'fr' ? 'Heures supplémentaires' : 'Overtime'} (${w.overtimeHours}h × ${w.overtimeRate} دج)</td><td class="text-end text-green">+${op.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</td></tr>` : ''}
          ${md > 0 ? `<tr><td>${language === 'ar' ? 'خصم الساعات الناقصة' : language === 'fr' ? 'Heures manquantes' : 'Missing Hours'} (${w.missingHours}h × ${Math.round(hw)} دج)</td><td class="text-end text-red">-${md.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</td></tr>` : ''}
          ${ad > 0 ? `<tr><td>${language === 'ar' ? 'خصم أيام الغياب' : language === 'fr' ? 'Jours d\'absence' : 'Absence Days'} (${w.absenceDays}d × ${Math.round(dw)} دج)</td><td class="text-end text-red">-${ad.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</td></tr>` : ''}
          ${ex > 0 ? `<tr><td>${language === 'ar' ? 'مجموع المصاريف' : language === 'fr' ? 'Total dépenses' : 'Total Expenses'}</td><td class="text-end text-red">-${ex.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</td></tr>` : ''}
          <tr class="net-row"><td>${language === 'ar' ? 'الصافي' : language === 'fr' ? 'Net à payer' : 'Net Pay'}</td><td class="text-end ${net >= 0 ? 'text-green' : 'text-red'}">${net.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</td></tr>
        </tbody>
      </table>
      ${expensesHtml}
      <hr style="margin:20px 0 10px;border:none;border-top:1px solid #ccc;" />
      <h2 style="font-size:14px;text-align:center;margin-bottom:8px;">${language === 'ar' ? 'التقرير الكلي' : language === 'fr' ? 'Rapport total' : 'Total Report'}${monthFilter ? ` — ${monthFilter}` : ''}</h2>
      <p style="text-align:center;font-size:12px;color:#333;">
        <strong>${language === 'ar' ? 'مجموع الرواتب' : language === 'fr' ? 'Salaires' : 'Salaries'}:</strong> ${totalSalaries.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج &nbsp;|&nbsp;
        <strong>${language === 'ar' ? 'س.إضافية' : language === 'fr' ? 'H.Supp' : 'Overtime'}:</strong> +${totalOvertimePay.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج &nbsp;|&nbsp;
        <strong>${language === 'ar' ? 'الخصومات' : language === 'fr' ? 'Déductions' : 'Deductions'}:</strong> -${totalDeductions.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج &nbsp;|&nbsp;
        <strong>${language === 'ar' ? 'الصافي' : language === 'fr' ? 'Net' : 'Net'}:</strong> ${totalNet.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج
      </p>
      <p style="margin-top:16px;font-size:10px;text-align:center;color:#999;">${new Date().toLocaleDateString(language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-DZ' : 'en-US')}</p>
    </body></html>`);
    printWin.document.close();
    setTimeout(() => { printWin.print(); }, 300);
  };
  const printWorkerAllMonths = (code: string) => {
    const recs = workers.filter(x => x.code === code);
    if (recs.length === 0) return;
    const name = recs[0].name;
    const tSalary = recs.reduce((s, w) => s + w.salary, 0);
    const tOT = recs.reduce((s, w) => s + (w.overtimeHours || 0) * (w.overtimeRate || 0), 0);
    const tDed = recs.reduce((s, w) => { const h = calcHourlyWage(w.salary, w.dailyHours || 8); const d = calcDailyWage(w.salary); return s + (w.missingHours || 0) * h + (w.absenceDays || 0) * d; }, 0);
    const tExp = recs.reduce((s, w) => s + (w.expenses || []).reduce((es, e) => es + e.amount, 0), 0);
    const tNet = tSalary + tOT - tDed - tExp;
    const printWin = window.open('', '_blank');
    if (!printWin) return;
    const monthsHtml = recs.map(w => {
      const hw = calcHourlyWage(w.salary, w.dailyHours || 8);
      const dw = calcDailyWage(w.salary);
      const op = (w.overtimeHours || 0) * (w.overtimeRate || 0);
      const md = (w.missingHours || 0) * hw;
      const ad = (w.absenceDays || 0) * dw;
      const ex = (w.expenses || []).reduce((es, e) => es + e.amount, 0);
      const net = w.salary + op - md - ad - ex;
      return `<div style="border:1px solid #ccc;border-radius:4px;padding:8px;margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;font-size:13px;">
          <strong>${w.month} ${w.year}</strong>
          <span style="${net >= 0 ? 'color:#059669' : 'color:#dc2626'};font-weight:700;">${net.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</span>
        </div>
      </div>`;
    }).join('');
    printWin.document.write(`<!DOCTYPE html><html dir="${language === 'ar' ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><title>${name} - ${t('workers')}</title><style>
      * { margin: 0; padding: 0; box-sizing: border-box; font-family: ${language === 'ar' ? "'Traditional Arabic', Arial" : "Arial, sans-serif"}; }
      body { padding: 20px; color: #111; }
      h1 { font-size: 18px; text-align: center; }
      .subtitle { text-align: center; font-size: 11px; color: #666; margin-bottom: 12px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      @media print { body { padding: 10px; } }
    </style></head><body>
      <h1>${name}</h1>
      <p class="subtitle">${language === 'ar' ? 'كل الأشهر' : language === 'fr' ? 'Tous les mois' : 'All Months'} (${recs.length}) | ${language === 'ar' ? 'الرمز' : language === 'fr' ? 'Code' : 'Code'}: ${code}</p>
      ${monthsHtml}
      <hr style="margin:12px 0;border:none;border-top:1px solid #333;" />
      <table><tr><td><strong>${language === 'ar' ? 'المجموع الكلي' : language === 'fr' ? 'Total général' : 'Grand Total'}</strong></td><td style="text-align:right;">${tSalary.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</td></tr>
        <tr><td>${language === 'ar' ? 'س.إضافية' : language === 'fr' ? 'H.Supp' : 'Overtime'}</td><td style="text-align:right;color:#059669;">+${tOT.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</td></tr>
        <tr><td>${language === 'ar' ? 'الخصومات' : language === 'fr' ? 'Déductions' : 'Deductions'}</td><td style="text-align:right;color:#dc2626;">-${tDed.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</td></tr>
        <tr><td>${language === 'ar' ? 'المصاريف' : language === 'fr' ? 'Dépenses' : 'Expenses'}</td><td style="text-align:right;color:#dc2626;">-${tExp.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</td></tr>
        <tr style="font-weight:700;border-top:2px solid #333;"><td>${language === 'ar' ? 'الصافي النهائي' : language === 'fr' ? 'Net final' : 'Final Net'}</td><td style="text-align:right;${tNet >= 0 ? 'color:#059669' : 'color:#dc2626'}">${tNet.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</td></tr>
      </table>
      <p style="margin-top:16px;font-size:10px;text-align:center;color:#999;">${new Date().toLocaleDateString(language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-DZ' : 'en-US')}</p>
    </body></html>`);
    printWin.document.close();
    setTimeout(() => { printWin.print(); }, 300);
  };
  const addNextMonth = () => {
    const mi = monthNames.indexOf(currentMonth);
    const nextMi = (mi + 1) % 12;
    const nextMonth = monthNames[nextMi];
    const nextYear = nextMi === 0 ? currentYear + 1 : currentYear;
    const prevMi = nextMi === 0 ? 11 : nextMi - 1;
    const prevMonth = monthNames[prevMi];
    const prevYear = prevMi === 11 ? nextYear - 1 : nextYear;
    const codes = new Map<string, (typeof workers)[0]>();
    workers.forEach(w => { if (!codes.has(w.code)) codes.set(w.code, w); });
    if (codes.size === 0) return;
    let firstSalary = 0, firstOTRate = 0, firstDailyHours = 8;
    codes.forEach((ref) => {
      const prev = workers.find(x => x.code === ref.code && x.month === prevMonth && x.year === prevYear);
      const salary = prev?.salary ?? 0;
      const overtimeRate = prev?.overtimeRate ?? 0;
      const dailyHours = prev?.dailyHours ?? ref.dailyHours ?? 8;
      if (ref === codes.values().next().value) { firstSalary = salary; firstOTRate = overtimeRate; firstDailyHours = dailyHours; }
      addWorker({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 4),
        code: ref.code, name: ref.name, phone: ref.phone || '',
        salary, dailyHours,
        month: nextMonth, year: nextYear,
        payPeriodStart: '', payPeriodEnd: '',
        overtimeHours: 0, overtimeRate,
        missingHours: 0, absenceDays: 0,
        expenses: [], paid: false,
      });
    });
    setMonthFilter(nextMonth);
    setYearFilter(nextYear);
    const firstRef = codes.values().next().value!;
    formCache.current = {};
    setEditId(null); setShowForm(true);
    setCode(firstRef.code); setName(firstRef.name); setPhone(firstRef.phone || '');
    setSalary(firstSalary); setDailyHours(firstDailyHours);
    setOvertimeHours(0); setOvertimeRate(firstOTRate); setMissingHours(0); setAbsenceDays(0);
    setExpenses([]); setMonthVal(nextMonth); setYearVal(nextYear);
    fillDates(nextMonth, nextYear);
  };

  printWorkersRef.current = printWorkers;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>{t('workers')} {LockIcon}</h1>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-all">
          <Plus size={16} /> <span>{language === 'ar' ? 'إضافة عامل' : language === 'fr' ? 'Ajouter travailleur' : 'Add Worker'}</span>
        </button>
        <button onClick={addNextMonth} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-medium transition-all">
          <Plus size={16} /> <span>{language === 'ar' ? 'شهر جديد' : language === 'fr' ? 'Nouveau mois' : 'New Month'}</span>
        </button>
        <button onClick={printWorkers} className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all hover:bg-gray-50 dark:hover:bg-gray-800" style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
          <Printer size={16} /> <span>{language === 'ar' ? 'طباعة' : language === 'fr' ? 'Imprimer' : 'Print'}</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'مجموع الرواتب' : language === 'fr' ? 'Salaires totaux' : 'Total Salaries'}</p>
          <p className="text-xl font-bold text-blue-500">{grandSalaries.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</p>
        </div>
        <div className="p-4 rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'أجرة الساعات الإضافية' : language === 'fr' ? 'Heures sup' : 'Overtime Pay'}</p>
          <p className="text-xl font-bold text-green-500">+{grandOT.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</p>
        </div>
        <div className="p-4 rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'مجموع الخصومات' : language === 'fr' ? 'Déductions' : 'Total Deductions'}</p>
          <p className="text-xl font-bold text-red-500">-{grandDed.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</p>
        </div>
        <div className="p-4 rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'صافي الرواتب' : language === 'fr' ? 'Salaires nets' : 'Net Pay'}</p>
          <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{grandNet.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</p>
        </div>
      </div>

      {/* Yearly Summary */}
      {showYearlySummary && (
        <div className="mb-6 rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
            <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              {language === 'ar' ? 'الملخص السنوي' : language === 'fr' ? 'Résumé annuel' : 'Yearly Summary'} — {yearFilter}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ color: 'var(--text-primary)' }}>
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                  <th className="px-3 py-2.5 text-start text-[11px] font-semibold tracking-wider" style={{ color: 'var(--text-secondary)' }}>{t('workerCode')}</th>
                  <th className="px-3 py-2.5 text-start text-[11px] font-semibold tracking-wider" style={{ color: 'var(--text-secondary)' }}>{t('workerName')}</th>
                  <th className="px-3 py-2.5 text-center text-[11px] font-semibold tracking-wider" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'عدد الأشهر' : language === 'fr' ? 'Mois' : 'Months'}</th>
                  <th className="px-3 py-2.5 text-end text-[11px] font-semibold tracking-wider" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'مجموع الرواتب' : language === 'fr' ? 'Total salaires' : 'Total Salary'}</th>
                  <th className="px-3 py-2.5 text-end text-[11px] font-semibold tracking-wider" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'س.إضافية' : language === 'fr' ? 'H.Supp' : 'Overtime'}</th>
                  <th className="px-3 py-2.5 text-end text-[11px] font-semibold tracking-wider" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'الخصومات' : language === 'fr' ? 'Déductions' : 'Deductions'}</th>
                  <th className="px-3 py-2.5 text-end text-[11px] font-semibold tracking-wider" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'المصاريف' : language === 'fr' ? 'Dépenses' : 'Expenses'}</th>
                  <th className="px-3 py-2.5 text-end text-[11px] font-semibold tracking-wider" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'الصافي' : language === 'fr' ? 'Net' : 'Net'}</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const grouped: Record<string, { name: string; records: typeof workers }> = {};
                  yearlyWorkers.forEach(w => {
                    if (!grouped[w.code]) grouped[w.code] = { name: w.name, records: [] };
                    grouped[w.code].records.push(w);
                  });
                  const entries = Object.entries(grouped);
                  return entries.length === 0 ? (
                    <tr><td colSpan={8} className="px-3 py-6 text-center text-xs" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'لا توجد بيانات لهذه السنة' : language === 'fr' ? 'Aucune donnée pour cette année' : 'No data for this year'}</td></tr>
                  ) : entries.map(([code, data]) => {
                    const totalSalary = data.records.reduce((s, w) => s + w.salary, 0);
                    const totalOT = data.records.reduce((s, w) => s + (w.overtimeHours || 0) * (w.overtimeRate || 0), 0);
                    const totalDed = data.records.reduce((s, w) => {
                      const hw = calcHourlyWage(w.salary, w.dailyHours || 8);
                      const dw = calcDailyWage(w.salary);
                      return s + (w.missingHours || 0) * hw + (w.absenceDays || 0) * dw;
                    }, 0);
                    const totalExp = data.records.reduce((s, w) => s + (w.expenses || []).reduce((es, e) => es + e.amount, 0), 0);
                    const totalNetYear = totalSalary + totalOT - totalDed - totalExp;
                    return (
                      <tr key={code} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors" style={{ borderColor: 'var(--border-color)' }}>
                        <td className="px-3 py-2.5 text-xs">{code}</td>
                        <td className="px-3 py-2.5 text-xs font-medium">{data.name}</td>
                        <td className="px-3 py-2.5 text-center text-xs">{data.records.length}</td>
                        <td className="px-3 py-2.5 text-end text-xs">{totalSalary.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</td>
                        <td className="px-3 py-2.5 text-end text-xs text-green-500">+{totalOT.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</td>
                        <td className="px-3 py-2.5 text-end text-xs text-red-500">-{totalDed.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</td>
                        <td className="px-3 py-2.5 text-end text-xs text-red-500">-{totalExp.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</td>
                        <td className="px-3 py-2.5 text-end text-xs font-bold" style={{ color: totalNetYear >= 0 ? '#059669' : '#dc2626' }}>{totalNetYear.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={resetForm} />
          <div className="relative w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col rounded-2xl shadow-xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--border-color)' }}>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {editId ? t('edit') : language === 'ar' ? 'إضافة' : language === 'fr' ? 'Ajouter' : 'Add'} {language === 'ar' ? 'عامل' : language === 'fr' ? 'travailleur' : 'worker'}
              </h2>
              <div className="flex items-center gap-2">
                {prevWorkerCode.current && (
                  <button onClick={() => { const c = prevWorkerCode.current; prevWorkerCode.current = null; resetForm(); setTimeout(() => setShowCalc(c), 50); }} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-800" style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
                    <ArrowLeft size={14} /> {language === 'ar' ? 'رجوع' : language === 'fr' ? 'Retour' : 'Back'}
                  </button>
                )}
                <button onClick={resetForm} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" style={{ color: 'var(--text-secondary)' }}><X size={18} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Employee Info */}
                <div>
                  <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    {language === 'ar' ? 'معلومات العامل' : language === 'fr' ? 'Informations' : 'Employee Info'}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'الرمز' : language === 'fr' ? 'Code' : 'Code'}</label>
                      <input type="text" value={code} onChange={e => setCode(e.target.value)} required
                        onKeyDown={focusNextInput}
                        className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                        style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'الاسم الكامل' : language === 'fr' ? 'Nom complet' : 'Full Name'}</label>
                      <input type="text" value={name} onChange={e => setName(e.target.value)} required
                        onKeyDown={focusNextInput}
                        className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                        style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'رقم الهاتف' : language === 'fr' ? 'Téléphone' : 'Phone'}</label>
                      <input type="text" value={phone} onChange={e => setPhone(e.target.value)}
                        onKeyDown={focusNextInput}
                        className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                        style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'الشهر / السنة' : language === 'fr' ? 'Mois/Année' : 'Month/Year'}</label>
                      <div className="flex gap-2">
                        <select value={monthVal} onChange={e => {
                          const oldKey = `${yearVal}-${monthVal}`;
                          formCache.current[oldKey] = { overtimeHours, overtimeRate, missingHours, absenceDays, expenses };
                          const newMonth = e.target.value; setMonthVal(newMonth); fillDates(newMonth, yearVal);
                          const newKey = `${yearVal}-${newMonth}`;
                          if (formCache.current[newKey]) {
                            const c = formCache.current[newKey];
                            setOvertimeHours(c.overtimeHours); setOvertimeRate(c.overtimeRate); setMissingHours(c.missingHours); setAbsenceDays(c.absenceDays); setExpenses(c.expenses);
                          } else {
                            const existing = workers.find(x => x.code === code && x.month === newMonth && x.year === yearVal);
                            if (existing) { setOvertimeHours(existing.overtimeHours || 0); setOvertimeRate(existing.overtimeRate || 0); setMissingHours(existing.missingHours || 0); setAbsenceDays(existing.absenceDays || 0); setExpenses(existing.expenses || []); }
                            else { setOvertimeHours(0); setOvertimeRate(0); setMissingHours(0); setAbsenceDays(0); setExpenses([]); }
                          }
                          setShowExpenseModal(false); setExpenseDesc(''); setExpenseAmount(0);
                        }}
                          onKeyDown={focusNextInput}
                          className="flex-1 px-3 py-2 rounded-xl border text-sm outline-none"
                          style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
                          {monthNames.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <div className="flex items-center px-3 py-2 rounded-xl border text-sm font-medium" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)', minWidth: 56, justifyContent: 'center' }}>
                          {yearVal}
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Base Salary + Daily Hours */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'الراتب الأساسي' : language === 'fr' ? 'Salaire de base' : 'Base Salary'}</label>
                      <input type="number" min="0" value={salary} onChange={e => setSalary(Number(e.target.value))} required
                        onFocus={e => { if (Number(e.target.value) === 0) e.target.value = ''; }}
                        onKeyDown={focusNextInput}
                        className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                        style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'عدد ساعات العمل اليومية' : language === 'fr' ? 'Heures de travail/jour' : 'Daily Work Hours'}</label>
                      <input type="number" min="1" value={dailyHours} onChange={e => setDailyHours(Number(e.target.value))} onFocus={clearZeroOnFocus}
                        onKeyDown={focusNextInput}
                        className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                        style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                    </div>
                  </div>
                </div>

                {/* Payroll Period */}
                <div>
                  <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    {language === 'ar' ? 'فترة الحساب' : language === 'fr' ? 'Période' : 'Payroll Period'}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'بداية' : language === 'fr' ? 'Début' : 'Start'}</label>
                      <input type="date" value={payPeriodStart} onChange={e => setPayPeriodStart(e.target.value)} onFocus={clearZeroOnFocus}
                        onKeyDown={focusNextInput}
                        className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                        style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'نهاية' : language === 'fr' ? 'Fin' : 'End'}</label>
                      <input type="date" value={payPeriodEnd} onChange={e => setPayPeriodEnd(e.target.value)} onFocus={clearZeroOnFocus}
                        onKeyDown={focusNextInput}
                        className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                        style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                    </div>
                  </div>
                  {payPeriodStart && payPeriodEnd && (
                    <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                      {language === 'ar' ? 'عدد أيام الفترة' : language === 'fr' ? 'Jours de la période' : 'Period days'}: <strong>{Math.max(1, Math.floor((new Date(payPeriodEnd).getTime() - new Date(payPeriodStart).getTime()) / (1000 * 60 * 60 * 24)) + 1)}</strong>
                    </p>
                  )}
                </div>

                {/* Overtime */}
                <div>
                  <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    {language === 'ar' ? 'الساعات الإضافية' : language === 'fr' ? 'Heures supplémentaires' : 'Overtime'}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'عدد الساعات' : language === 'fr' ? 'Nombre d\'heures' : 'Hours'}</label>
                      <input type="number" min="0" value={overtimeHours} onChange={e => setOvertimeHours(Number(e.target.value))} onFocus={clearZeroOnFocus}
                        onKeyDown={focusNextInput}
                        className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                        style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'سعر الساعة' : language === 'fr' ? 'Taux horaire' : 'Hourly Rate'}</label>
                      <input type="number" min="0" value={overtimeRate} onChange={e => setOvertimeRate(Number(e.target.value))} onFocus={clearZeroOnFocus}
                        onKeyDown={focusNextInput}
                        className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                        style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                    </div>
                  </div>
                  {overtimeHours > 0 && overtimeRate > 0 && (
                    <p className="text-xs mt-1 text-green-500 font-semibold">
                      {language === 'ar' ? 'أجرة الساعات الإضافية' : language === 'fr' ? 'Paye des heures sup' : 'Overtime pay'}: +{(overtimeHours * overtimeRate).toLocaleString(undefined, { maximumFractionDigits: 2 })} دج
                    </p>
                  )}
                </div>

                {/* Missing Hours + Absence */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                      <span className="w-2 h-2 rounded-full bg-yellow-500" />
                      {language === 'ar' ? 'الساعات الناقصة' : language === 'fr' ? 'Heures manquantes' : 'Missing Hours'}
                    </h3>
                    <input type="number" min="0" value={missingHours} onChange={e => setMissingHours(Number(e.target.value))} onFocus={clearZeroOnFocus}
                      onKeyDown={focusNextInput}
                      className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                      style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                    {missingHours > 0 && salary > 0 && dailyHours > 0 && (
                      <p className="text-xs mt-1 text-red-500 font-semibold">
                        {language === 'ar' ? 'الخصم' : language === 'fr' ? 'Déduction' : 'Deduction'}: -{(missingHours * calcHourlyWage(salary, dailyHours)).toLocaleString(undefined, { maximumFractionDigits: 2 })} دج
                        <br /><span className="text-yellow-600">({language === 'ar' ? 'الساعة' : language === 'fr' ? 'Taux horaire' : 'Hourly'}: {calcHourlyWage(salary, dailyHours).toLocaleString(undefined, { maximumFractionDigits: 2 })} دج)</span>
                      </p>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      {language === 'ar' ? 'أيام الغياب' : language === 'fr' ? 'Jours d\'absence' : 'Absence Days'}
                    </h3>
                    <input type="number" min="0" value={absenceDays} onChange={e => setAbsenceDays(Number(e.target.value))} onFocus={clearZeroOnFocus}
                      onKeyDown={focusNextInput}
                      className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                      style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                    {absenceDays > 0 && salary > 0 && (
                      <p className="text-xs mt-1 text-red-500 font-semibold">
                        {language === 'ar' ? 'الخصم' : language === 'fr' ? 'Déduction' : 'Deduction'}: -{(absenceDays * calcDailyWage(salary)).toLocaleString(undefined, { maximumFractionDigits: 2 })} دج
                        <br /><span className="text-yellow-600">({language === 'ar' ? 'اليومية' : language === 'fr' ? 'Journalier' : 'Daily'}: {calcDailyWage(salary).toLocaleString(undefined, { maximumFractionDigits: 2 })} دج)</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Expenses */}
                <div>
                  <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    {language === 'ar' ? 'المصاريف' : language === 'fr' ? 'Dépenses' : 'Expenses'}
                  </h3>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setExpenseDate(new Date().toISOString().split('T')[0]); setExpenseDesc(''); setExpenseAmount(0); setShowExpenseModal(true); }}
                      onKeyDown={focusNextInput}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-medium">
                      <Plus size={16} /> <span>{language === 'ar' ? 'إضافة مصروف' : language === 'fr' ? 'Ajouter dépense' : 'Add Expense'}</span>
                    </button>
                    <button type="button" onClick={() => navigate(`/expenses?workerCode=${encodeURIComponent(code)}&workerName=${encodeURIComponent(name)}&month=${encodeURIComponent(monthVal)}&year=${yearVal}`)}
                      onKeyDown={focusNextInput}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium">
                      <ExternalLink size={16} /> <span>{language === 'ar' ? 'صفحة المصاريف' : language === 'fr' ? 'Page dépenses' : 'Expenses Page'}</span>
                    </button>
                  </div>
                  {expenses.length > 0 && (
                    <div className="border rounded-xl overflow-hidden" style={{ borderColor: 'var(--border-color)' }}>
                      <table className="w-full text-xs" style={{ color: 'var(--text-primary)' }}>
                        <thead>
                          <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                            <th className="px-3 py-1.5 text-start font-semibold" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'التاريخ' : language === 'fr' ? 'Date' : 'Date'}</th>
                            <th className="px-3 py-1.5 text-start font-semibold" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'الوصف' : language === 'fr' ? 'Description' : 'Description'}</th>
                            <th className="px-3 py-1.5 text-end font-semibold" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'المبلغ' : language === 'fr' ? 'Montant' : 'Amount'}</th>
                            <th className="px-2 py-1.5 w-8" />
                          </tr>
                        </thead>
                        <tbody>
                          {expenses.map((ex, i) => (
                            <tr key={i} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                              <td className="px-3 py-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>{ex.date || '-'}</td>
                              <td className="px-3 py-1.5">{ex.description}</td>
                              <td className="px-3 py-1.5 text-end text-red-500 font-semibold">{ex.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</td>
                              <td className="px-2 py-1.5"><button type="button" onClick={() => removeExpense(i)} className="p-0.5 text-red-400 hover:text-red-500"><X size={12} /></button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {expenses.length > 0 && (
                    <p className="text-xs mt-1 text-red-500 font-semibold">
                      {language === 'ar' ? 'مجموع المصاريف' : language === 'fr' ? 'Total dépenses' : 'Total expenses'}: -{expenses.reduce((s, e) => s + e.amount, 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} دج
                    </p>
                  )}
                </div>

                {/* Summary Preview */}
                {salary > 0 && (
                  <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                    <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                      <Calculator size={16} className="text-blue-500" />
                      {language === 'ar' ? 'ملخص الراتب' : language === 'fr' ? 'Résumé du salaire' : 'Salary Summary'}
                    </h3>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'الراتب الأساسي' : language === 'fr' ? 'Salaire de base' : 'Base Salary'}</span><span className="text-blue-500 font-semibold">{salary.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</span></div>
                      {overtimeHours > 0 && overtimeRate > 0 && <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'أجرة الساعات الإضافية' : language === 'fr' ? 'Heures sup' : 'Overtime Pay'}</span><span className="text-green-500 font-semibold">+{(overtimeHours * overtimeRate).toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</span></div>}
                      {missingHours > 0 && <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'خصم الساعات الناقصة' : language === 'fr' ? 'Déduction heures manquantes' : 'Missing Hours Deduction'}</span><span className="text-red-500 font-semibold">-{(missingHours * calcHourlyWage(salary, dailyHours)).toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</span></div>}
                      {absenceDays > 0 && <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'خصم أيام الغياب' : language === 'fr' ? 'Déduction absences' : 'Absence Deduction'}</span><span className="text-red-500 font-semibold">-{(absenceDays * calcDailyWage(salary)).toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</span></div>}
                      {expenses.length > 0 && <><div className="border-t pt-1 mt-1" style={{ borderColor: 'var(--border-color)' }}></div>
                        {expenses.map((exp, i) => (
                          <div key={i} className="flex justify-between text-[11px]"><span style={{ color: 'var(--text-secondary)' }}>{exp.description}</span><span className="text-red-500 font-semibold">-{exp.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</span></div>
                        ))}
                        <div className="flex justify-between font-semibold"><span style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'مجموع المصاريف' : language === 'fr' ? 'Total dépenses' : 'Total Expenses'}</span><span className="text-red-500 font-semibold">-{expenses.reduce((s, e) => s + e.amount, 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</span></div></>}
                      <hr className="my-1" style={{ borderColor: 'var(--border-color)' }} />
                      <div className="flex justify-between text-sm font-bold"><span style={{ color: 'var(--text-primary)' }}>{language === 'ar' ? 'المجموع النهائي' : language === 'fr' ? 'Net à payer' : 'Net Pay'}</span>
                        <span style={{ color: (salary + (overtimeHours * overtimeRate) - (missingHours * calcHourlyWage(salary, dailyHours)) - (absenceDays * calcDailyWage(salary)) - expenses.reduce((s, e) => s + e.amount, 0)) >= 0 ? 'var(--text-primary)' : 'var(--text-primary)' }}>
                          {(salary + (overtimeHours * overtimeRate) - (missingHours * calcHourlyWage(salary, dailyHours)) - (absenceDays * calcDailyWage(salary)) - expenses.reduce((s, e) => s + e.amount, 0)).toLocaleString(undefined, { maximumFractionDigits: 2 })} دج
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <input type="checkbox" id="paidCb" checked={paid} onChange={e => setPaid(e.target.checked)}
                    onKeyDown={focusNextInput}
                    className="w-4 h-4 rounded border-gray-300" />
                  <label htmlFor="paidCb" className="text-sm font-medium cursor-pointer select-none" style={{ color: paid ? '#059669' : 'var(--text-secondary)' }}>
                    {language === 'ar' ? '✓ تم الدفع' : language === 'fr' ? '✓ Payé' : '✓ Paid'}
                  </label>
                </div>
                {paid && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'المبلغ المدفوع' : language === 'fr' ? 'Montant payé' : 'Amount Paid'}</label>
                      <input type="number" value={paymentAmount || ''} onChange={e => setPaymentAmount(Number(e.target.value))} onFocus={clearZeroOnFocus} onKeyDown={focusNextInput}
                        className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                        style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'تاريخ الدفع' : language === 'fr' ? 'Date de paiement' : 'Payment Date'}</label>
                      <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} onKeyDown={focusNextInput}
                        className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                        style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={resetForm} onKeyDown={focusNextInput} className="px-4 py-2 rounded-xl border text-sm" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                    {t('cancel')}
                  </button>
                  <button type="submit" onKeyDown={focusNextInput} className="px-6 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium">
                    {editId ? t('edit') : language === 'ar' ? 'إضافة' : language === 'fr' ? 'Ajouter' : 'Add'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Pay Modal */}
      {showPayModal && (() => {
        const payRecs = workers.filter(x => x.code === payModalCode);
        const calcNet = (w: Worker) => {
          const hw = calcHourlyWage(w.salary, w.dailyHours || 8);
          const dw = calcDailyWage(w.salary);
          const op = (w.overtimeHours || 0) * (w.overtimeRate || 0);
          const md = (w.missingHours || 0) * hw;
          const ad = (w.absenceDays || 0) * dw;
          const ex = (w.expenses || []).reduce((es, e) => es + e.amount, 0);
          return w.salary + op - md - ad - ex;
        };
        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none">
            <div className="relative w-full max-w-sm mx-4 rounded-2xl shadow-2xl border p-6 pointer-events-auto" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{language === 'ar' ? 'تحديد الأشهر المدفوعة' : language === 'fr' ? 'Sélectionner les mois payés' : 'Select Paid Months'}</h3>
                <button onClick={() => setShowPayModal(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" style={{ color: 'var(--text-secondary)' }}><X size={16} /></button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {payRecs.map(w => {
                  const net = calcNet(w);
                  return (
                    <label key={w.id} className="flex items-center gap-3 px-3 py-2 rounded-xl border cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800" style={{ borderColor: 'var(--border-color)' }}>
                      <input type="checkbox" checked={selectedMonths.has(w.id)} onChange={e => {
                        const next = new Set(selectedMonths);
                        if (e.target.checked) {
                          next.add(w.id);
                          updateWorker(w.id, { paid: true, paymentAmount: net, paymentDate: new Date().toISOString().split('T')[0] });
                        } else {
                          next.delete(w.id);
                          updateWorker(w.id, { paid: false, paymentAmount: 0, paymentDate: undefined });
                        }
                        setSelectedMonths(next);
                      }} className="w-4 h-4 rounded border-gray-300" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{w.month} {w.year}</span>
                        <span className="text-xs block" style={{ color: 'var(--text-secondary)' }}>{net.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</span>
                      </div>
                      {selectedMonths.has(w.id) && <span className="text-green-500 text-xs font-semibold">{language === 'ar' ? 'مدفوع' : language === 'fr' ? 'Payé' : 'Paid'}</span>}
                    </label>
                  );
                })}
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => setShowPayModal(false)} className="px-4 py-2 rounded-xl border text-sm" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>{t('cancel')}</button>
                <button onClick={() => {
                  setShowPayModal(false);
                }} className="px-4 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-medium">
                  {language === 'ar' ? 'تأكيد' : language === 'fr' ? 'Confirmer' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Delete confirm - step 1 */}
      {deleteConfirm && !deletePwMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => { setDeleteConfirm(null); setDeletePwInput(''); }} />
          <div className="relative w-full max-w-sm mx-4 rounded-2xl shadow-xl border p-6 text-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>{t('confirmDelete')}</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => { setDeleteConfirm(null); setDeletePwInput(''); }} className="px-4 py-2 rounded-xl border text-sm" style={{ borderColor: 'var(--border-color)' }}>
                {t('cancel')}
              </button>
              <button onClick={() => { setDeletePwMode(true); }} className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium">
                {t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm - step 2 password */}
      {deleteConfirm && deletePwMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => { setDeleteConfirm(null); setDeletePwMode(false); setDeletePwInput(''); }} />
          <div className="relative w-full max-w-sm mx-4 rounded-2xl shadow-xl border p-6" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{t('passwordRequired')}</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'أدخل كلمة السر لحذف العامل' : language === 'fr' ? 'Entrez le mot de passe pour supprimer le travailleur' : 'Enter password to delete worker'}</p>
            <input type="password" value={deletePwInput} onChange={e => setDeletePwInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') {
                if (deletePwInput !== password) { toast.error(t('wrongPassword')); return; }
                const w = workers.find(x => x.id === deleteConfirm);
                if (w) {
                  addToTrash(w);
                  deleteWorker(deleteConfirm);
                }
                setDeleteConfirm(null); setDeletePwMode(false); setDeletePwInput('');
                toast.custom((toastObj) => <UndoToast
                  message={language === 'ar' ? 'تم حذف العامل' : language === 'fr' ? 'Travailleur supprimé' : 'Worker deleted'}
                  undoLabel={language === 'ar' ? 'تراجع' : language === 'fr' ? 'Annuler' : 'Undo'}
                  onUndo={() => { if (w) addWorker(w); toast.dismiss(toastObj.id); }}
                  duration={5000}
                />, { duration: 5000 });
              }}}
              className="w-full px-3 py-2 rounded-xl border text-sm outline-none mb-4"
              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} autoFocus />
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setDeleteConfirm(null); setDeletePwMode(false); setDeletePwInput(''); }} className="px-4 py-2 rounded-xl border text-sm" style={{ borderColor: 'var(--border-color)' }}>
                {t('cancel')}
              </button>
              <button onClick={() => {
                if (deletePwInput !== password) { toast.error(t('wrongPassword')); return; }
                const w = workers.find(x => x.id === deleteConfirm);
                if (w) {
                  addToTrash(w);
                  deleteWorker(deleteConfirm);
                }
                setDeleteConfirm(null); setDeletePwMode(false); setDeletePwInput('');
                toast.custom((toastObj) => <UndoToast
                  message={language === 'ar' ? 'تم حذف العامل' : language === 'fr' ? 'Travailleur supprimé' : 'Worker deleted'}
                  undoLabel={language === 'ar' ? 'تراجع' : language === 'fr' ? 'Annuler' : 'Undo'}
                  onUndo={() => { if (w) addWorker(w); toast.dismiss(toastObj.id); }}
                  duration={5000}
                />, { duration: 5000 });
              }} className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium">
                {language === 'ar' ? 'حذف' : language === 'fr' ? 'Supprimer' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowExpenseModal(false)} />
          <div className="relative w-full max-w-sm mx-4 rounded-2xl shadow-xl border p-6" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{language === 'ar' ? 'إضافة مصروف' : language === 'fr' ? 'Ajouter dépense' : 'Add Expense'}</h3>
              <button onClick={() => setShowExpenseModal(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" style={{ color: 'var(--text-secondary)' }}><X size={16} /></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); addExpense(); }} className="space-y-4">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'التاريخ' : language === 'fr' ? 'Date' : 'Date'}</label>
                <input type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} onFocus={clearZeroOnFocus}
                  onKeyDown={focusNextInput}
                  className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                  style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'الوصف' : language === 'fr' ? 'Description' : 'Description'}</label>
                <input type="text" value={expenseDesc} onChange={e => setExpenseDesc(e.target.value)} required
                  ref={expenseDescRef} autoFocus
                  onKeyDown={focusNextInput}
                  className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                  style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'المبلغ' : language === 'fr' ? 'Montant' : 'Amount'}</label>
                <input type="number" min="0" value={expenseAmount} onChange={e => setExpenseAmount(Number(e.target.value))} required
                  onFocus={e => { if (Number(e.target.value) === 0) e.target.value = ''; }}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addExpense(); } }}
                  className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                  style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowExpenseModal(false)} className="px-4 py-2 rounded-xl border text-sm" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                  {t('cancel')}
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-medium">
                  {language === 'ar' ? 'حفظ' : language === 'fr' ? 'Enregistrer' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Workers table filter & search */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <input type="text" value={searchWorker} onChange={e => setSearchWorker(e.target.value)} onKeyDown={focusNextInput} onFocus={clearZeroOnFocus}
            placeholder={language === 'ar' ? '🔍 ابحث عن عامل بالاسم...' : language === 'fr' ? '🔍 Chercher un travailleur...' : '🔍 Search worker by name...'}
            className="w-full px-3 py-2 rounded-xl border text-xs outline-none"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
        </div>
        <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'الشهر' : language === 'fr' ? 'Mois' : 'Month'}</label>
        <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)} onKeyDown={focusNextInput}
          className="px-3 py-1.5 rounded-lg border text-xs outline-none"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
          {monthNames.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'السنة' : language === 'fr' ? 'Année' : 'Year'}</label>
        <select value={yearFilter} onChange={e => { setYearFilter(Number(e.target.value)); setShowYearlySummary(false); }} onKeyDown={focusNextInput}
          className="px-3 py-1.5 rounded-lg border text-xs outline-none"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ color: 'var(--text-primary)' }}>
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                <th className="px-3 py-3 text-xs font-semibold tracking-wider text-start" style={{ color: 'var(--text-secondary)' }}>{t('workerCode')}</th>
                <th className="px-3 py-3 text-xs font-semibold tracking-wider text-start" style={{ color: 'var(--text-secondary)' }}>{t('workerName')}</th>
                <th className="px-3 py-3 text-xs font-semibold tracking-wider text-center" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'عدد الأشهر' : language === 'fr' ? 'Mois' : 'Months'}</th>
                <th className="px-3 py-3 text-xs font-semibold tracking-wider text-end" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'الراتب' : language === 'fr' ? 'Salaire' : 'Salary'}</th>
                <th className="px-3 py-3 text-xs font-semibold tracking-wider text-end" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'س.إضافية' : language === 'fr' ? 'H.Supp' : 'Overtime'}</th>
                <th className="px-3 py-3 text-xs font-semibold tracking-wider text-end" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'الخصومات' : language === 'fr' ? 'Déductions' : 'Deductions'}</th>
                <th className="px-3 py-3 text-xs font-semibold tracking-wider text-end" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'الصافي' : language === 'fr' ? 'Net' : 'Net'}</th>
                <th className="px-3 py-3 text-xs font-semibold tracking-wider text-center" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'تم الدفع' : language === 'fr' ? 'Payé' : 'Paid'}</th>
                <th className="px-2 py-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {(() => {
                const searchLower = searchWorker.toLowerCase();
                const grouped: Record<string, { name: string; records: typeof workers }> = {};
                filteredWorkers.forEach(w => {
                  if (searchLower && !w.name.toLowerCase().includes(searchLower) && !w.code.toLowerCase().includes(searchLower)) return;
                  if (!grouped[w.code]) grouped[w.code] = { name: w.name, records: [] };
                  grouped[w.code].records.push(w);
                });
                const entries = Object.entries(grouped).sort(([a], [b]) => parseInt(a, 10) - parseInt(b, 10));
                if (entries.length === 0) {
                  return <tr><td colSpan={8} className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>{searchWorker ? (language === 'ar' ? 'لا توجد نتائج' : language === 'fr' ? 'Aucun résultat' : 'No results') : t('addWorker')}</td></tr>;
                }
                return entries.map(([code, data]) => {
                  const allRecs = workers.filter(w => w.code === code);
                  const tSalary = data.records.reduce((s, w) => s + w.salary, 0);
                  const tOT = data.records.reduce((s, w) => s + (w.overtimeHours || 0) * (w.overtimeRate || 0), 0);
                  const tDed = data.records.reduce((s, w) => {
                    const h = calcHourlyWage(w.salary, w.dailyHours || 8);
                    const d = calcDailyWage(w.salary);
                    return s + (w.missingHours || 0) * h + (w.absenceDays || 0) * d;
                  }, 0);
                  const tExp = data.records.reduce((s, w) => s + (w.expenses || []).reduce((es, e) => es + e.amount, 0), 0);
                  const tNet = tSalary + tOT - tDed - tExp;
                  return (
                    <tr key={code} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer" style={{ borderColor: 'var(--border-color)' }} onClick={() => setShowCalc(showCalc === code ? null : code)}>
                      <td className="px-3 py-3 font-medium">{code}</td>
                      <td className="px-3 py-3 font-medium">{data.name}</td>
                      <td className="px-3 py-3 text-center text-xs">{data.records.length}</td>
                      <td className="px-3 py-3 text-end">{tSalary.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</td>
                      <td className="px-3 py-3 text-end text-green-500 font-medium">+{tOT.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</td>
                      <td className="px-3 py-3 text-end text-red-500 font-medium">-{tDed.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</td>
                      <td className="px-3 py-3 text-end">
                        <span className={`font-bold text-sm ${tNet >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {tNet.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="text-green-500 font-bold">{allRecs.filter(w => w.paid).length}</span>
                        <span className="text-xs mx-0.5" style={{ color: 'var(--text-secondary)' }}>-</span>
                        <span className="text-red-500 font-bold">{allRecs.filter(w => !w.paid).length}</span>
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex gap-1">
                          <button onClick={e => { e.stopPropagation(); setShowCalc(showCalc === code ? null : code); }} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500" title={language === 'ar' ? 'تفاصيل' : language === 'fr' ? 'Détails' : 'Details'}>
                            <Edit2 size={14} />
                          </button>
                          <button onClick={e => { e.stopPropagation(); printWorkerAllMonths(code); }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" style={{ color: 'var(--text-secondary)' }} title={language === 'ar' ? 'طباعة الكل' : language === 'fr' ? 'Tout imprimer' : 'Print All'}>
                            <Printer size={14} />
                          </button>
                          <button onClick={e => { e.stopPropagation(); setDeleteConfirm(data.records[0].id); }} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500" title={t('delete')}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* Worker detail modal - all months */}
      {showCalc && (() => {
        const recs = workers.filter(x => x.code === showCalc);
        if (recs.length === 0) return null;
        const name = recs[0].name;
        const code = recs[0].code;
        const tSalary = recs.reduce((s, w) => s + w.salary, 0);
        const tOT = recs.reduce((s, w) => s + (w.overtimeHours || 0) * (w.overtimeRate || 0), 0);
        const tDed = recs.reduce((s, w) => {
          const h = calcHourlyWage(w.salary, w.dailyHours || 8);
          const d = calcDailyWage(w.salary);
          return s + (w.missingHours || 0) * h + (w.absenceDays || 0) * d;
        }, 0);
        const tExp = recs.reduce((s, w) => s + (w.expenses || []).reduce((es, e) => es + e.amount, 0), 0);
        const tNet = tSalary + tOT - tDed - tExp;
        return (
          <div key={code} className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowCalc(null)}>
            <div className="fixed inset-0 bg-black/50" />
            <div className="relative w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col rounded-2xl shadow-xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-3 border-b shrink-0" style={{ borderColor: 'var(--border-color)' }}>
                <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{name} <span className="font-normal text-xs" style={{ color: 'var(--text-secondary)' }}>({code})</span></h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setPayModalCode(code); setSelectedMonths(new Set(recs.filter(w => w.paid).map(w => w.id))); setShowPayModal(true); }} className="px-2 py-1 rounded-lg bg-green-500 hover:bg-green-600 text-white text-xs font-medium">
                    {language === 'ar' ? '💰 دفع' : language === 'fr' ? '💰 Payer' : '💰 Pay'}
                  </button>
                  <button onClick={() => printWorkerAllMonths(code)} className="px-2 py-1 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium" title={language === 'ar' ? 'طباعة الكل' : language === 'fr' ? 'Tout imprimer' : 'Print All'}>
                    <Printer size={13} className="inline mr-1" />{language === 'ar' ? 'الكل' : language === 'fr' ? 'Tout' : 'All'}
                  </button>
                  <button onClick={() => setShowCalc(null)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-800" style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
                    <ArrowLeft size={14} /> {language === 'ar' ? 'رجوع' : language === 'fr' ? 'Retour' : 'Back'}
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Yearly total - sticky */}
                <div className="sticky top-0 z-10 -mx-5 -mt-5 px-5 pt-5 pb-3" style={{ backgroundColor: 'var(--bg-card)' }}>
                  <div className="rounded-xl border p-4 grid grid-cols-2 sm:grid-cols-7 gap-3 text-center" style={{ borderColor: 'var(--border-color)' }}>
                    <div><p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'عدد الأشهر' : language === 'fr' ? 'Mois' : 'Months'}</p><p className="text-lg font-bold">{recs.length}</p></div>
                    <div><p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'الراتب' : language === 'fr' ? 'Salaire' : 'Salary'}</p><p className="text-lg font-bold text-blue-500">{tSalary.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p></div>
                    <div><p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'س.إضافية' : language === 'fr' ? 'H.Supp' : 'Overtime'}</p><p className="text-lg font-bold text-green-500">+{tOT.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p></div>
                    <div><p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'الخصومات' : language === 'fr' ? 'Déductions' : 'Ded.'}</p><p className="text-lg font-bold text-red-500">-{tDed.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p></div>
                    <div><p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'طلبات مستلمة' : language === 'fr' ? 'Livrées' : 'Delivered'}</p><p className="text-lg font-bold text-emerald-500">{orders.filter(o => o.agent === name && o.status === 'delivered').length}</p></div>
                    <div><p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'طلبات مرتجعة' : language === 'fr' ? 'Retournées' : 'Returned'}</p><p className="text-lg font-bold text-red-500">{orders.filter(o => o.agent === name && o.status === 'returned').length}</p></div>
                    <div><p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'الصافي' : language === 'fr' ? 'Net' : 'Net'}</p><p className="text-lg font-bold" style={{ color: tNet >= 0 ? '#059669' : '#dc2626' }}>{tNet.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p></div>
                  </div>
                </div>
                {/* Per-month breakdown */}
                {recs.map((w) => {
                  const hw = calcHourlyWage(w.salary, w.dailyHours || 8);
                  const dw = calcDailyWage(w.salary);
                  const op = (w.overtimeHours || 0) * (w.overtimeRate || 0);
                  const md = (w.missingHours || 0) * hw;
                  const ad = (w.absenceDays || 0) * dw;
                  const ex = (w.expenses || []).reduce((es, e) => es + e.amount, 0);
                  const net = w.salary + op - md - ad - ex;
                  return (
                    <div key={w.id} className="rounded-xl border p-4" style={{ borderColor: 'var(--border-color)' }}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold">{w.month} {w.year} {w.paid ? <span className="text-green-500 mr-1">✓</span> : null}</h4>
                        <div className="flex items-center gap-1">
                          <button onClick={() => { prevWorkerCode.current = showCalc; setShowCalc(null); handleEdit(w); }} className="p-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500"><Edit2 size={13} /></button>
                          <button onClick={() => { setShowCalc(null); setDeleteConfirm(w.id); }} className="p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"><Trash2 size={13} /></button>
                          <button onClick={() => printWorkerDetail(w)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" style={{ color: 'var(--text-secondary)' }}><Printer size={13} /></button>
                        </div>
                      </div>
                      <div className="grid grid-cols-5 gap-2 mb-2">
                        <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                          <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'س.إضافية' : language === 'fr' ? 'H.Supp' : 'OT'}</p>
                          <p className="text-sm font-bold text-green-500">{w.overtimeHours || 0}h</p>
                        </div>
                        <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                          <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'س.ناقصة' : language === 'fr' ? 'H.Manq' : 'Miss'}</p>
                          <p className="text-sm font-bold text-yellow-500">{w.missingHours || 0}h</p>
                        </div>
                        <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                          <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'غياب' : language === 'fr' ? 'Abs' : 'Abs.'}</p>
                          <p className="text-sm font-bold text-red-500">{w.absenceDays || 0}</p>
                        </div>
                        <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                          <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'مستلمة' : language === 'fr' ? 'Livrées' : 'Del.'}</p>
                          <p className="text-sm font-bold text-emerald-500">{orders.filter(o => o.agent === name && o.status === 'delivered' && new Date(o.date).getMonth() === monthNames.indexOf(w.month) && new Date(o.date).getFullYear() === w.year).length}</p>
                        </div>
                        <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                          <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'مرتجعة' : language === 'fr' ? 'Ret.' : 'Ret.'}</p>
                          <p className="text-sm font-bold text-red-500">{orders.filter(o => o.agent === name && o.status === 'returned' && new Date(o.date).getMonth() === monthNames.indexOf(w.month) && new Date(o.date).getFullYear() === w.year).length}</p>
                        </div>
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'الراتب' : language === 'fr' ? 'Salaire' : 'Salary'}</span><span className="text-blue-500 font-semibold">{w.salary.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</span></div>
                        {op > 0 && <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'س.إضافية' : language === 'fr' ? 'H.Supp' : 'Overtime'}</span><span className="text-green-500 font-semibold">+{op.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</span></div>}
                        {md > 0 && <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'س.ناقصة' : language === 'fr' ? 'H.Manq' : 'Miss.H'}</span><span className="text-red-500 font-semibold">-{md.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</span></div>}
                        {ad > 0 && <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'غياب' : language === 'fr' ? 'Abs.' : 'Absence'}</span><span className="text-red-500 font-semibold">-{ad.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</span></div>}
                        {ex > 0 && <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'المصاريف' : language === 'fr' ? 'Dépenses' : 'Expenses'}</span><span className="text-red-500 font-semibold">-{ex.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</span></div>}
                        <hr className="my-0.5" style={{ borderColor: 'var(--border-color)' }} />
                        <div className="flex justify-between font-bold"><span>{language === 'ar' ? 'الصافي' : language === 'fr' ? 'Net' : 'Net'}</span><span style={{ color: net >= 0 ? '#059669' : '#dc2626' }}>{net.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</span></div>
                        {w.paid && w.paymentAmount ? (
                          <div className="flex justify-between text-[11px] mt-1 pt-1 border-t" style={{ borderColor: 'var(--border-color)' }}>
                            <span className="text-green-500">{language === 'ar' ? 'المدفوع' : language === 'fr' ? 'Payé' : 'Paid'}</span>
                            <span className="text-green-500 font-semibold">{w.paymentAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج {w.paymentDate ? `(${w.paymentDate})` : ''}</span>
                          </div>
                        ) : null}
                      </div>
                      {w.expenses && w.expenses.length > 0 && (
                        <div className="mt-2 pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
                          <p className="text-[10px] font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'المصاريف' : language === 'fr' ? 'Dépenses' : 'Expenses'}</p>
                          {w.expenses.map((e, i) => (
                            <div key={i} className="flex justify-between items-center text-[11px] group">
                              <span style={{ color: 'var(--text-secondary)' }}>{e.date || ''} - {e.description}</span>
                              <div className="flex items-center gap-1">
                                <span className="text-red-500">-{e.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</span>
                                <button onClick={() => {
                                  updateWorker(w.id, { expenses: w.expenses.filter((_, idx) => idx !== i) });
                                  deleteWorkerExpenseByFields(w.code, w.month, w.year, e.description, e.amount, e.date, e.notes);
                                }} className="p-0.5 rounded text-red-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}