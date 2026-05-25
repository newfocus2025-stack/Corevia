import { useState, useEffect } from 'react';
import { useTranslation } from '../i18n/useTranslation';
import { useAppContext } from '../store/AppContext';
import type { MonthlyProfit } from '../types';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { PieLabelRenderProps } from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, Users, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { focusNextInput } from '../shared/formHelpers';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

const monthNamesAr = ['جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان', 'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const monthNamesFr = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const monthNamesEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function ProfitSummary() {
  const { t, language } = useTranslation();
  const { orders, workers, fixedExpenses, variableExpenses, addMonthlyProfit, yearlySummaries, setYearlySummaries, password, adExpenses, suppliers, purchaseOrders, products, inventory, returnInventory } = useAppContext();

  // Independent lock state per page (persists via sessionStorage)
  const AUTH_KEY = 'auth_profit-summary';
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

  const LockIcon = authed ? (
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
  ) : null;

  // Monthly form state
  const [selectedMonth, setSelectedMonth] = useState(monthNamesAr[new Date().getMonth()]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showMonthlyForm, setShowMonthlyForm] = useState(false);

  // Auto-compute ad budget from Expenses page
  const monthAdEntries = adExpenses.filter(e => e.month === selectedMonth && e.year === selectedYear);
  const totalAdDzd = monthAdEntries.reduce((s, e) => s + e.amountDzd, 0);
  const totalAdUsd = monthAdEntries.reduce((s, e) => s + e.amountUsd, 0);
  const avgExchangeRate = totalAdUsd > 0 ? Math.round(totalAdDzd / totalAdUsd) : 250;
  const adStartDate = monthAdEntries.length > 0 ? monthAdEntries.map(e => e.startDate).sort()[0] : '';
  const adEndDate = monthAdEntries.length > 0 ? monthAdEntries.map(e => e.endDate).sort().reverse()[0] : '';
  const adDays = adStartDate && adEndDate ? Math.max(1, Math.ceil((new Date(adEndDate).getTime() - new Date(adStartDate).getTime()) / (1000 * 60 * 60 * 24))) : 1;
  const adDailyCost = adDays > 0 ? totalAdDzd / adDays : 0;

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

  const monthNames = language === 'ar' ? monthNamesAr : language === 'fr' ? monthNamesFr : monthNamesEn;
  const monthIndex = monthNamesAr.indexOf(selectedMonth);
  const mIdx = monthIndex >= 0 ? monthIndex : new Date().getMonth();

  // Compute data for selected month
  const monthOrders = orders.filter(o => {
    const d = new Date(o.date);
    return d.getMonth() === mIdx && d.getFullYear() === selectedYear;
  });

  const deliveredOrders = monthOrders.filter(o => o.status === 'delivered');
  const pendingOrders = monthOrders.filter(o => o.status === 'pending');
  const returnedOrders = monthOrders.filter(o => o.status === 'returned');
  const pendingDeliveredOrders = [...pendingOrders, ...deliveredOrders];
  const totalAllSales = pendingDeliveredOrders.reduce((s, o) => s + o.total, 0);
  const totalDeliveredSales = deliveredOrders.reduce((s, o) => s + o.total, 0);
  const totalPendingSales = pendingOrders.reduce((s, o) => s + o.total, 0);
  const totalReturnedSales = returnedOrders.reduce((s, o) => s + o.total, 0);
  const totalCostPendingDelivered = pendingDeliveredOrders.reduce((s, o) =>
    s + o.items.reduce((si, item) => si + item.productCost * item.quantity, 0), 0);
  const deliveryCostOnShop = pendingDeliveredOrders.filter(o => o.freeDelivery).reduce((s, o) => s + o.deliveryPrice, 0);
  const netProfitPendingDelivered = pendingDeliveredOrders.reduce((s, o) => {
    const revenue = o.items.reduce((si, item) => si + item.price * item.quantity, 0);
    const cost = o.items.reduce((si, item) => si + item.productCost * item.quantity, 0);
    return s + revenue - cost;
  }, 0);
  const totalReturnCost = returnedOrders.reduce((s, o) => s + o.returnCost, 0);
  const profitMargin = totalDeliveredSales > 0 ? (netProfitPendingDelivered / totalDeliveredSales) * 100 : 0;

  const monthWorkers = workers.filter(w => w.month === selectedMonth && w.year === selectedYear);
  const calcHourlyWage = (salary: number, dailyHours: number) => salary / 30 / Math.max(dailyHours, 1);
  const calcDailyWage = (salary: number) => salary / 30;
  const totalWorkerDues = monthWorkers.reduce((s, w) => {
    const hw = calcHourlyWage(w.salary, w.dailyHours || 8);
    const dw = calcDailyWage(w.salary);
    const op = (w.overtimeHours || 0) * (w.overtimeRate || 0);
    const md = (w.missingHours || 0) * hw;
    const ad = (w.absenceDays || 0) * dw;
    const ex = (w.expenses || []).reduce((es, e) => es + e.amount, 0);
    return s + w.salary + op - md - ad - ex;
  }, 0);
  const totalPaidWorkerAmount = monthWorkers.filter(w => w.paid).reduce((s, w) => s + (w.paymentAmount || 0), 0);
  const totalFixedExpenses = fixedExpenses.reduce((s, f) => s + f.amount, 0);
  const monthVariableAmounts = variableExpenses.filter(e => e.month === selectedMonth && e.year === selectedYear);
  const totalVariableExpenses = monthVariableAmounts.reduce((s, e) => s + e.amount, 0);
  const totalExpensesAmount = totalFixedExpenses + totalVariableExpenses;
  const totalSupplierDebt = suppliers.reduce((total, s) => {
    const poTotal = purchaseOrders.filter(po => po.supplierName === s.name).reduce((sum, po) => sum + po.total, 0);
    const supplierPayments = (s.payments || []).reduce((sum, p) => sum + p.amount, 0);
    return total + Math.max(0, poTotal - supplierPayments);
  }, 0);
  const totalPaidToSuppliers = suppliers.reduce((sum, s) => sum + (s.payments || []).reduce((ps, p) => ps + p.amount, 0), 0);
  const totalBasicItems = inventory.reduce((s, i) => s + Object.values(i.colors).reduce((a, b) => a + b, 0), 0);
  const totalReturnQty = returnInventory.reduce((s, i) => s + i.quantity, 0);
  const totalStockQty = totalBasicItems + totalReturnQty;
  const totalInventoryCost = inventory.reduce((sum, inv) =>
    sum + Object.values(inv.colors).reduce((s, q) => s + q, 0) * (products.find(p => p.name === inv.model)?.wholesaleCostPrice ?? 0), 0)
    + returnInventory.reduce((sum, ri) => sum + ri.quantity * (products.find(p => p.name === ri.model)?.wholesaleCostPrice ?? 0), 0);
  const budgetDzd = totalAdDzd;
  const finalProfit = netProfitPendingDelivered - totalReturnCost - budgetDzd - totalPaidWorkerAmount - totalExpensesAmount;
  const finalStatus = finalProfit >= 0 ? 'profit' : 'loss';

  // Top stats
  const getCounts = (field: 'model' | 'color' | 'size') => {
    return monthOrders.filter(o => o.status === 'delivered').flatMap(o => o.items).reduce((acc: Record<string, number>, item) => {
      const key = item[field];
      if (key) acc[key] = (acc[key] || 0) + item.quantity;
      return acc;
    }, {} as Record<string, number>);
  };

  const getWilayaCounts = () => {
    const counts: Record<string, number> = {};
    monthOrders.filter(o => o.status === 'delivered').forEach(o => {
      counts[o.wilaya] = (counts[o.wilaya] || 0) + o.items.reduce((s, i) => s + i.quantity, 0);
    });
    return counts;
  };

  const toTop = (counts: Record<string, number>, n: number) => {
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, n).map(([name, count]) => ({ name, count, percentage: total > 0 ? (count / total) * 100 : 0 }));
  };

  const topWilayas = toTop(getWilayaCounts(), 3);
  const topModels = toTop(getCounts('model'), 3);
  const topColors = toTop(getCounts('color'), 3);
  const topSizes = toTop(getCounts('size'), 3);

  const handleSaveMonth = () => {
    const profit: MonthlyProfit = {
      month: selectedMonth, year: selectedYear,
      totalSales: totalDeliveredSales + totalPendingSales, totalCost: totalCostPendingDelivered + deliveryCostOnShop, netProfit: netProfitPendingDelivered, profitMargin,
      totalOrders: monthOrders.length,
      deliveredOrders: deliveredOrders.length,
      returnedOrders: returnedOrders.length,
      totalReturnCost, workerCount: monthWorkers.length,
      totalWorkerSalaries: totalWorkerDues, adBudget: budgetDzd, adBudgetUsd: totalAdUsd, exchangeRate: avgExchangeRate,
      startDate: adStartDate, endDate: adEndDate, days: adDays, budgetDzd, dailyCost: adDailyCost, finalCalculation: finalProfit,
      returnCostTotal: totalReturnCost, adBudgetTotal: budgetDzd,
      workerSalariesTotal: totalWorkerDues, finalProfit, finalStatus,
      topWilayas, topModels, topColors, topSizes,
    };
    addMonthlyProfit(profit);

    // Update yearly summary
    const yearData = yearlySummaries.find(y => y.year === selectedYear);
    if (yearData) {
      const updatedMonths = { ...yearData.months, [selectedMonth]: { result: finalStatus as 'profit' | 'loss', profit: finalProfit } };
      const totalYearProfit = Object.values(updatedMonths).reduce((s, m) => s + m.profit, 0);
      setYearlySummaries(yearlySummaries.map(y => y.year === selectedYear ? {
        ...y,
        months: updatedMonths,
        totalProfit: totalYearProfit,
        topWilayas: getTopYear('wilaya', selectedYear, 3),
        topModels: getTopYear('model', selectedYear, 3),
        topColors: getTopYear('color', selectedYear, 3),
        topSizes: getTopYear('size', selectedYear, 3),
      } : y));
    } else {
      const totalYearProfit = finalProfit;
      setYearlySummaries([...yearlySummaries, {
        year: selectedYear, months: { [selectedMonth]: { result: finalStatus, profit: finalProfit } },
        totalProfit: totalYearProfit,
        topWilayas: getTopYear('wilaya', selectedYear, 3),
        topModels: getTopYear('model', selectedYear, 3),
        topColors: getTopYear('color', selectedYear, 3),
        topSizes: getTopYear('size', selectedYear, 3),
      }]);
    }
    toast.success(t('save'));
    setShowMonthlyForm(false);
  };

  const getTopYear = (field: 'wilaya' | 'model' | 'color' | 'size', year: number, n: number) => {
    const yearOrders = orders.filter(o => new Date(o.date).getFullYear() === year && o.status === 'delivered');
    let counts: Record<string, number> = {};
    if (field === 'wilaya') {
      yearOrders.forEach(o => {
        counts[o.wilaya] = (counts[o.wilaya] || 0) + o.items.reduce((s, i) => s + i.quantity, 0);
      });
    } else {
      yearOrders.flatMap(o => o.items).forEach(item => {
        const key = item[field];
        if (key) counts[key] = (counts[key] || 0) + item.quantity;
      });
    }
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, n).map(([name, count]) => ({ name, count, percentage: total > 0 ? (count / total) * 100 : 0 }));
  };

  const rankEmoji = (i: number) => i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';

  const renderStatsTable = (title: string, data: { name: string; count: number; percentage: number }[], icon: string) => (
    <div className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
      <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>{icon} {title}</h3>
      <table className="w-full text-xs" style={{ color: 'var(--text-primary)' }}>
        <thead>
          <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
            <th className="py-2 text-start">{t('rank')}</th>
            <th className="py-2 text-start">{t('name')}</th>
            <th className="py-2 text-end">{t('count')}</th>
            <th className="py-2 text-end">{t('percentage')}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, i) => (
            <tr key={item.name} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
              <td className="py-2">{rankEmoji(i)}</td>
              <td className="py-2">{item.name}</td>
              <td className="py-2 text-end">{item.count}</td>
              <td className="py-2 text-end">{item.percentage.toFixed(1)}%</td>
            </tr>
          ))}
          {data.length === 0 && <tr><td colSpan={4} className="py-4 text-center" style={{ color: 'var(--text-secondary)' }}>—</td></tr>}
        </tbody>
      </table>
      {data.length > 0 && (
        <div className="mt-3" style={{ height: 160 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={60} label={(entry: PieLabelRenderProps) => `${entry.name} ${((entry.percent || 0) * 100).toFixed(0)}%`}>
                {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );

  // Product ranking (all items sorted by quantity)
  const allModelCounts = pendingDeliveredOrders.flatMap(o => o.items).reduce((acc, item) => {
    if (item.model) acc[item.model] = (acc[item.model] || 0) + item.quantity;
    return acc;
  }, {} as Record<string, number>);
  const allModelStats = Object.entries(allModelCounts).map(([name, count]) => {
    const revenue = pendingDeliveredOrders.filter(o => o.items.some(i => i.model === name)).reduce((s, o) => s + o.total, 0);
    return { name, count, revenue };
  }).sort((a, b) => b.count - a.count);

  const allColorCounts = pendingDeliveredOrders.flatMap(o => o.items).reduce((acc, item) => {
    if (item.color) acc[item.color] = (acc[item.color] || 0) + item.quantity;
    return acc;
  }, {} as Record<string, number>);
  const allColorStats = Object.entries(allColorCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

  const allSizeCounts = pendingDeliveredOrders.flatMap(o => o.items).reduce((acc, item) => {
    if (item.size) acc[item.size] = (acc[item.size] || 0) + item.quantity;
    return acc;
  }, {} as Record<string, number>);
  const allSizeStats = Object.entries(allSizeCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

  // Worker performance
  const workerStats = pendingDeliveredOrders.reduce((acc, o) => {
    if (!o.agent) return acc;
    acc[o.agent] = acc[o.agent] || { orders: 0, total: 0 };
    acc[o.agent].orders++;
    acc[o.agent].total += o.total;
    return acc;
  }, {} as Record<string, { orders: number; total: number }>);
  const workerStatsSorted = Object.entries(workerStats).sort((a, b) => b[1].orders - a[1].orders).map(([name, data]) => ({ name, ...data }));

  // Wilaya stats (deliveries vs returns)
  const wilayaDeliveries = deliveredOrders.reduce((acc, o) => { acc[o.wilaya] = (acc[o.wilaya] || 0) + 1; return acc; }, {} as Record<string, number>);
  const wilayaReturns = returnedOrders.reduce((acc, o) => { acc[o.wilaya] = (acc[o.wilaya] || 0) + 1; return acc; }, {} as Record<string, number>);
  const allWilayas = [...new Set([...Object.keys(wilayaDeliveries), ...Object.keys(wilayaReturns)])];
  const wilayaReturnStats = allWilayas.map(w => ({
    name: w,
    delivered: wilayaDeliveries[w] || 0,
    returned: wilayaReturns[w] || 0,
    rate: ((wilayaDeliveries[w] || 0) + (wilayaReturns[w] || 0)) > 0
      ? ((wilayaReturns[w] || 0) / ((wilayaDeliveries[w] || 0) + (wilayaReturns[w] || 0))) * 100
      : 0,
  })).sort((a, b) => b.rate - a.rate);
  const topDeliveryWilayas = Object.entries(wilayaDeliveries).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count })  );

  const renderBarChart = (title: string, data: { name: string; count: number }[], icon: string, color: string) => (
    <div className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
      <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>{icon} {title}</h3>
      {data.length > 0 ? (
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
              <Tooltip />
              <Bar dataKey="count" fill={color} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-center py-8 text-xs" style={{ color: 'var(--text-secondary)' }}>—</p>
      )}
    </div>
  );

  // Derived data for charts
  const totalWorkerOrders = workerStatsSorted.reduce((s, w) => s + w.orders, 0);
  const workerPieData = workerStatsSorted.map(w => ({ name: w.name, count: w.orders, percentage: totalWorkerOrders > 0 ? (w.orders / totalWorkerOrders) * 100 : 0 }));
  const totalDeliveryWilayaCount = topDeliveryWilayas.reduce((s, w) => s + w.count, 0);
  const deliveryWilayaPieData = topDeliveryWilayas.map(w => ({ name: w.name, count: w.count, percentage: totalDeliveryWilayaCount > 0 ? (w.count / totalDeliveryWilayaCount) * 100 : 0 }));
  const totalReturnWilayaCount = wilayaReturnStats.filter(w => w.returned > 0).reduce((s, w) => s + w.returned, 0);
  const returnWilayaPieData = wilayaReturnStats.filter(w => w.returned > 0).map(w => ({ name: w.name, count: w.returned, percentage: totalReturnWilayaCount > 0 ? (w.returned / totalReturnWilayaCount) * 100 : 0 }));

  const yearSummary = yearlySummaries.find(y => y.year === selectedYear);
  const yearSummaryItems: { icon: string; label: string; data: { name: string; count: number; percentage: number }[]; color: string }[] = yearSummary ? [
    { icon: '🗺️', label: language === 'ar' ? 'أكثر 3 ولايات' : language === 'fr' ? 'Top 3 wilayas' : 'Top 3 Wilayas', data: yearSummary.topWilayas, color: '#3b82f6' },
    { icon: '👕', label: language === 'ar' ? 'أكثر 3 موديلات' : language === 'fr' ? 'Top 3 modèles' : 'Top 3 Models', data: yearSummary.topModels, color: '#10b981' },
    { icon: '📏', label: language === 'ar' ? 'أكثر 3 مقاسات' : language === 'fr' ? 'Top 3 tailles' : 'Top 3 Sizes', data: yearSummary.topSizes, color: '#f59e0b' },
    { icon: '🎨', label: language === 'ar' ? 'أكثر 3 ألوان' : language === 'fr' ? 'Top 3 couleurs' : 'Top 3 Colors', data: yearSummary.topColors, color: '#8b5cf6' },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>{t('profitSummary')} {LockIcon}</h1>
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
          <button onClick={() => setShowMonthlyForm(true)} className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium">
            {t('monthlyReport')}
          </button>
        </div>
      </div>

      {showMonthlyForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 pb-10 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowMonthlyForm(false)} />
          <div className="relative w-full max-w-lg mx-4 rounded-2xl shadow-xl border p-6" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{t('monthlyReport')} - {selectedMonth} {selectedYear}</h2>
            <div className="space-y-4">
              {/* Top section - Salaries, Expenses, Return Cost, Final Profit */}
              <div className="p-4 rounded-xl border space-y-2" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
                <div className="flex justify-between text-sm"><span style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'المستحق للعمال' : language === 'fr' ? 'Dû aux ouvriers' : 'Worker Dues'}</span><span className="font-semibold">{Math.max(0, totalWorkerDues - totalPaidWorkerAmount).toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</span></div>
                <div className="flex justify-between text-sm"><span style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'مدفوعات العمال' : language === 'fr' ? 'Paiements ouvriers' : 'Worker Payments'}</span><span className="font-semibold text-green-500">{totalPaidWorkerAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</span></div>
                <div className="flex justify-between text-sm"><span style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'إجمالي المصاريف' : language === 'fr' ? 'Total dépenses' : 'Total Expenses'}</span><span className="font-semibold text-orange-500">{totalExpensesAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</span></div>
                <div className="flex justify-between text-sm"><span style={{ color: 'var(--text-secondary)' }}>{t('returnCost')}</span><span className="font-semibold text-red-500">{totalReturnCost.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</span></div>
                {monthAdEntries.length > 0 && (
                  <div className="pt-1 space-y-1.5">
                    <div className="flex justify-between text-sm"><span style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'ميزانية الإعلانات (دج)' : language === 'fr' ? 'Budget pub (DZD)' : 'Ad Budget (DZD)'}</span><span className="font-semibold text-cyan-500">{budgetDzd.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</span></div>
                    <div className="flex justify-between text-sm"><span style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'ميزانية الإعلانات (USD)' : language === 'fr' ? 'Budget pub (USD)' : 'Ad Budget (USD)'}</span><span className="font-semibold text-cyan-500">{totalAdUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })} دولار</span></div>
                    <div className="flex justify-between text-sm"><span style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'سعر الصرف' : language === 'fr' ? 'Taux de change' : 'Exchange Rate'}</span><span className="font-semibold">{avgExchangeRate} دج/$</span></div>
                    <div className="flex justify-between text-sm"><span style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'أيام الحملة' : language === 'fr' ? 'Jours de campagne' : 'Campaign Days'}</span><span className="font-semibold">{adDays} {language === 'ar' ? 'يوم' : language === 'fr' ? 'jours' : 'days'}</span></div>
                    <div className="flex justify-between text-sm"><span style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'التكلفة اليومية' : language === 'fr' ? 'Coût journalier' : 'Daily Cost'}</span><span className="font-semibold text-cyan-500">{adDailyCost.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</span></div>
                  </div>
                )}
                <hr style={{ borderColor: 'var(--border-color)' }} />
                <div className="flex justify-between text-sm font-bold"><span>{t('finalProfit')}</span><span className={finalProfit >= 0 ? 'text-green-500' : 'text-red-500'}>{finalProfit.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</span></div>
                <div className="flex justify-between text-sm"><span>{t('profitStatus')}</span><span className={`font-bold ${finalStatus === 'profit' ? 'text-green-500' : 'text-red-500'}`}>{finalStatus === 'profit' ? '✅ ' + t('successfulMonth') : '❌ ' + t('lossMonth')}</span></div>
              </div>

              {/* Bottom section - Financial summary moved to bottom */}
              <div className="p-4 rounded-xl border space-y-2" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
                <div className="flex justify-between text-sm"><span style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'إجمالي المبيعات (مستلمة + انتظار)' : language === 'fr' ? 'Total ventes (livrées + attente)' : 'Sales (Delivered + Pending)'}</span><span className="font-semibold text-green-500">{(totalDeliveredSales + totalPendingSales).toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</span></div>
                <div className="flex justify-between text-sm"><span style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'إجمالي التكلفة (بدون توصيل)' : language === 'fr' ? 'Coût total (sans livraison)' : 'Total Cost (excl. delivery)'}</span><span className="font-semibold text-red-400">{totalCostPendingDelivered.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</span></div>
                <div className="flex justify-between text-sm"><span style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'توصيل على المحل' : language === 'fr' ? 'Livraison magasin' : 'Delivery on Shop'}</span><span className="font-semibold text-purple-500">{deliveryCostOnShop.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</span></div>
                <div className="flex justify-between text-sm"><span style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'صافي الربح' : language === 'fr' ? 'Bénéfice net' : 'Net Profit'}</span><span className={`font-semibold ${netProfitPendingDelivered >= 0 ? 'text-green-500' : 'text-red-500'}`}>{netProfitPendingDelivered.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</span></div>
              </div>

              <div className="flex justify-end gap-2">
                <button onClick={() => setShowMonthlyForm(false)} className="px-4 py-2 rounded-xl border text-sm" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>{t('cancel')}</button>
                <button onClick={handleSaveMonth} className="px-6 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium">{t('save')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Row 1 - Sales breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
              <DollarSign size={20} className="text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'إجمالي المبيعات' : language === 'fr' ? 'Total ventes' : 'Total Sales'}</p>
              <p className="text-lg font-bold text-blue-500 truncate">{totalAllSales.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</p>
              <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'عدد الطلبات' : language === 'fr' ? 'Nb commandes' : 'Orders'}: {pendingDeliveredOrders.length}</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
              <DollarSign size={20} className="text-green-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'إجمالي المستلمة' : language === 'fr' ? 'Total livrées' : 'Delivered Sales'}</p>
              <p className="text-lg font-bold text-green-500 truncate">{totalDeliveredSales.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</p>
              <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'عدد المستلمة' : language === 'fr' ? 'Nb livrées' : 'Delivered'}: {deliveredOrders.length}</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
              <DollarSign size={20} className="text-yellow-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'قيد الإنتظار' : language === 'fr' ? 'En attente' : 'Pending Sales'}</p>
              <p className="text-lg font-bold text-yellow-500 truncate">{totalPendingSales.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</p>
              <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'عدد المنتظرة' : language === 'fr' ? 'Nb en attente' : 'Pending'}: {pendingOrders.length}</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <DollarSign size={20} className="text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'تم إرجاعها' : language === 'fr' ? 'Retournées' : 'Returned Sales'}</p>
              <p className="text-lg font-bold text-red-500 truncate">{totalReturnedSales.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</p>
              <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'عدد المرتجعة' : language === 'fr' ? 'Nb retournées' : 'Returned'}: {returnedOrders.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2 - Cost, Delivery on Shop, Net Sales, Ad Budget, Expenses, Return cost, Supplier Debts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4">
        <div className="p-4 rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <TrendingDown size={20} className="text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'إجمالي التكلفة' : language === 'fr' ? 'Coût total' : 'Total Cost'}</p>
              <p className="text-lg font-bold text-red-400 truncate">{totalCostPendingDelivered.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</p>
              <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'عدد الطلبات' : language === 'fr' ? 'Nb commandes' : 'Orders'}: {pendingDeliveredOrders.length}</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
              <DollarSign size={20} className="text-purple-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'توصيل على المحل' : language === 'fr' ? 'Livraison sur magasin' : 'Delivery on Shop'}</p>
              <p className="text-lg font-bold text-purple-500 truncate">{deliveryCostOnShop.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</p>
              <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'عدد الطلبات' : language === 'fr' ? 'Nb commandes' : 'Orders'}: {pendingDeliveredOrders.filter(o => o.freeDelivery).length}</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${netProfitPendingDelivered >= 0 ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'}`}>
              <TrendingUp size={20} className={netProfitPendingDelivered >= 0 ? 'text-green-500' : 'text-red-500'} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'صافي المبيعات (الأرباح)' : language === 'fr' ? 'Ventes nettes (Bénéfice)' : 'Net Sales (Profit)'}</p>
              <p className={`text-lg font-bold truncate ${netProfitPendingDelivered >= 0 ? 'text-green-500' : 'text-red-500'}`}>{netProfitPendingDelivered.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</p>
              <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'عدد الطلبات' : language === 'fr' ? 'Nb commandes' : 'Orders'}: {pendingDeliveredOrders.length}</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-900/20 flex items-center justify-center">
              <DollarSign size={20} className="text-cyan-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'ميزانية الإعلانات' : language === 'fr' ? 'Budget pub' : 'Ad Budget'}</p>
              <p className="text-lg font-bold text-cyan-500 truncate">{budgetDzd.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</p>
              <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{totalAdUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })} USD {language === 'ar' ? '| السعر' : language === 'fr' ? '| Taux' : '| Rate'}: {avgExchangeRate}</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/20 flex items-center justify-center">
              <DollarSign size={20} className="text-teal-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'مصاريف (ثابتة + متغيرة)' : language === 'fr' ? 'Dépenses (fixes + variables)' : 'Expenses (Fixed + Variable)'}</p>
              <p className="text-lg font-bold text-teal-500 truncate">{totalExpensesAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</p>
              <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'من صفحة المصاريف' : language === 'fr' ? 'Depuis page dépenses' : 'From Expenses page'}</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
              <DollarSign size={20} className="text-orange-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'تكلفة الإرجاع' : language === 'fr' ? 'Coût retour' : 'Return Cost'}</p>
              <p className="text-lg font-bold text-orange-500 truncate">{totalReturnCost.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</p>
              <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'عدد المرتجعة' : language === 'fr' ? 'Nb retournées' : 'Returned'}: {returnedOrders.length}</p>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/20 flex items-center justify-center">
              <DollarSign size={20} className="text-rose-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'ديون الموردين' : language === 'fr' ? 'Dettes fournisseurs' : 'Supplier Debts'}</p>
              <p className="text-lg font-bold text-rose-500 truncate">{totalSupplierDebt.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</p>
              <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'إجمالي الديون' : language === 'fr' ? 'Total dettes' : 'Total debts'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stock & Suppliers Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl border-2 border-blue-200 dark:border-blue-800" style={{ backgroundColor: 'var(--bg-card)' }}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'إجمالي التكلفة في المخزون' : language === 'fr' ? 'Coût total du stock' : 'Total Inventory Cost'}</p>
                <p className="text-2xl font-bold text-blue-500">{totalInventoryCost.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</p>
              </div>
            </div>
            <div className="text-end">
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'عدد القطع في المخزون' : language === 'fr' ? 'Pièces en stock' : 'Items in Stock'}</p>
              <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{totalStockQty.toLocaleString()}</p>
              <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'مخزون أساسي + مرتجع' : language === 'fr' ? 'Stock de base + retour' : 'Basic + Return stock'}</p>
            </div>
          </div>
        </div>
        <div className="p-5 rounded-2xl border-2 border-emerald-200 dark:border-emerald-800" style={{ backgroundColor: 'var(--bg-card)' }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'مدفوعات إلى الموردين' : language === 'fr' ? 'Paiements aux fournisseurs' : 'Payments to Suppliers'}</p>
              <p className="text-2xl font-bold text-emerald-500">{totalPaidToSuppliers.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</p>
              <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'إجمالي المدفوعات لكل الموردين' : language === 'fr' ? 'Total payé à tous les fournisseurs' : 'Total paid to all suppliers'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-2">
            <Users size={16} className="text-blue-500" />
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'المستحق للعمال' : language === 'fr' ? 'Dû aux ouvriers' : 'Worker Dues'}</p>
          </div>
          <p className="text-lg font-bold" style={{ color: Math.max(0, totalWorkerDues - totalPaidWorkerAmount) > 0 ? 'var(--text-primary)' : '#059669' }}>{Math.max(0, totalWorkerDues - totalPaidWorkerAmount).toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</p>
        </div>
        <div className="p-4 rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-2">
            <DollarSign size={16} className="text-green-500" />
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'مدفوعات العمال' : language === 'fr' ? 'Paiements ouvriers' : 'Worker Payments'}</p>
          </div>
          <p className="text-lg font-bold text-green-500">{totalPaidWorkerAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</p>
        </div>
        <div className="p-4 rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-2">
            <DollarSign size={16} className="text-red-500" />
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t('returnCost')}</p>
          </div>
          <p className="text-lg font-bold text-red-500">{totalReturnCost.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</p>
        </div>
      </div>

      <div className={`p-6 rounded-2xl border-2 ${finalStatus === 'profit' ? 'border-green-400 bg-green-50 dark:bg-green-900/10' : 'border-red-400 bg-red-50 dark:bg-red-900/10'}`}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{t('finalProfit')}</p>
            <p className={`text-3xl font-bold ${finalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {finalProfit >= 0 ? '+' : ''}{finalProfit.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج
            </p>
          </div>
          <div className="text-end">
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{t('profitStatus')}</p>
            <p className={`text-lg font-bold ${finalStatus === 'profit' ? 'text-green-500' : 'text-red-500'}`}>
              {finalStatus === 'profit' ? '✅ ' + t('successfulMonth') : '❌ ' + t('lossMonth')}
            </p>
          </div>
        </div>
      </div>

      <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>📊 {t('monthlyReport')} - {selectedMonth} {selectedYear}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderStatsTable(t('topWilayas'), topWilayas, '🗺️')}
        {renderStatsTable(t('topModels'), topModels, '👕')}
        {renderStatsTable(t('topColors'), topColors, '🎨')}
        {renderStatsTable(t('topSizes'), topSizes, '📏')}
      </div>

      {/* Product Ranking */}
      <h2 className="text-lg font-bold pt-4" style={{ color: 'var(--text-primary)' }}>📦 {language === 'ar' ? 'ترتيب المنتجات' : language === 'fr' ? 'Classement des produits' : 'Product Ranking'}</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="px-4 py-3 border-b text-sm font-semibold" style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>👕 {t('model')}</div>
          <div className="overflow-y-auto max-h-72">
            <table className="w-full text-xs" style={{ color: 'var(--text-primary)' }}>
              <thead><tr className="border-b" style={{ borderColor: 'var(--border-color)' }}><th className="px-4 py-2 text-start">#</th><th className="px-4 py-2 text-start">{t('name')}</th><th className="px-4 py-2 text-end">{t('count')}</th><th className="px-4 py-2 text-end">{t('revenue') || 'الإيراد'}</th></tr></thead>
              <tbody>
                {allModelStats.map((item, i) => (
                  <tr key={item.name} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                    <td className="px-4 py-1.5">{rankEmoji(i)}</td>
                    <td className="px-4 py-1.5">{item.name}</td>
                    <td className="px-4 py-1.5 text-end font-semibold">{item.count}</td>
                    <td className="px-4 py-1.5 text-end">{item.revenue.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</td>
                  </tr>
                ))}
                {allModelStats.length === 0 && <tr><td colSpan={4} className="py-4 text-center" style={{ color: 'var(--text-secondary)' }}>—</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="px-4 py-3 border-b text-sm font-semibold" style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>🎨 {t('color')}</div>
          <div className="overflow-y-auto max-h-72">
            <table className="w-full text-xs" style={{ color: 'var(--text-primary)' }}>
              <thead><tr className="border-b" style={{ borderColor: 'var(--border-color)' }}><th className="px-4 py-2 text-start">#</th><th className="px-4 py-2 text-start">{t('name')}</th><th className="px-4 py-2 text-end">{t('count')}</th></tr></thead>
              <tbody>
                {allColorStats.map((item, i) => (
                  <tr key={item.name} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                    <td className="px-4 py-1.5">{rankEmoji(i)}</td>
                    <td className="px-4 py-1.5">{item.name}</td>
                    <td className="px-4 py-1.5 text-end font-semibold">{item.count}</td>
                  </tr>
                ))}
                {allColorStats.length === 0 && <tr><td colSpan={3} className="py-4 text-center" style={{ color: 'var(--text-secondary)' }}>—</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="px-4 py-3 border-b text-sm font-semibold" style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>📏 {t('size')}</div>
          <div className="overflow-y-auto max-h-72">
            <table className="w-full text-xs" style={{ color: 'var(--text-primary)' }}>
              <thead><tr className="border-b" style={{ borderColor: 'var(--border-color)' }}><th className="px-4 py-2 text-start">#</th><th className="px-4 py-2 text-start">{t('name')}</th><th className="px-4 py-2 text-end">{t('count')}</th></tr></thead>
              <tbody>
                {allSizeStats.map((item, i) => (
                  <tr key={item.name} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                    <td className="px-4 py-1.5">{rankEmoji(i)}</td>
                    <td className="px-4 py-1.5">{item.name}</td>
                    <td className="px-4 py-1.5 text-end font-semibold">{item.count}</td>
                  </tr>
                ))}
                {allSizeStats.length === 0 && <tr><td colSpan={3} className="py-4 text-center" style={{ color: 'var(--text-secondary)' }}>—</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Worker Performance */}
      <h2 className="text-lg font-bold pt-4" style={{ color: 'var(--text-primary)' }}>👤 {language === 'ar' ? 'أداء العمال' : language === 'fr' ? 'Performance des travailleurs' : 'Worker Performance'}</h2>
      <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <table className="w-full text-sm" style={{ color: 'var(--text-primary)' }}>
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
              <th className="px-4 py-3 text-xs font-semibold text-start">#</th>
              <th className="px-4 py-3 text-xs font-semibold text-start">{language === 'ar' ? 'العامل' : language === 'fr' ? 'Travailleur' : 'Worker'}</th>
              <th className="px-4 py-3 text-xs font-semibold text-end">{language === 'ar' ? 'عدد الطلبات' : language === 'fr' ? 'Nb commandes' : 'Orders'}</th>
              <th className="px-4 py-3 text-xs font-semibold text-end">{language === 'ar' ? 'إجمالي المبيعات' : language === 'fr' ? 'Total ventes' : 'Total Sales'}</th>
              <th className="px-4 py-3 text-xs font-semibold text-end">{language === 'ar' ? 'المتوسط' : language === 'fr' ? 'Moyenne' : 'Average'}</th>
            </tr>
          </thead>
          <tbody>
            {workerStatsSorted.map((w, i) => (
              <tr key={w.name} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                <td className="px-4 py-2">{rankEmoji(i)}</td>
                <td className="px-4 py-2 font-medium">{w.name}</td>
                <td className="px-4 py-2 text-end">{w.orders}</td>
                <td className="px-4 py-2 text-end">{w.total.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</td>
                <td className="px-4 py-2 text-end">{w.orders > 0 ? (w.total / w.orders).toLocaleString(undefined, { maximumFractionDigits: 2 }) : 0} دج</td>
              </tr>
            ))}
            {workerStatsSorted.length === 0 && <tr><td colSpan={5} className="py-4 text-center" style={{ color: 'var(--text-secondary)' }}>—</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderStatsTable(language === 'ar' ? 'نسبة أداء العمال' : language === 'fr' ? 'Performance des travailleurs' : 'Worker Performance', workerPieData, '👤')}
        {renderBarChart(language === 'ar' ? 'أداء العمال' : language === 'fr' ? 'Performance travailleurs' : 'Worker Performance', workerStatsSorted.map(w => ({ name: w.name, count: w.orders })), '👤', '#3b82f6')}
      </div>

      {/* Wilaya Stats */}
      <h2 className="text-lg font-bold pt-4" style={{ color: 'var(--text-primary)' }}>🗺️ {language === 'ar' ? 'إحصائيات الولايات' : language === 'fr' ? 'Statistiques des wilayas' : 'Wilaya Statistics'}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="px-4 py-3 border-b text-sm font-semibold" style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>📦 {language === 'ar' ? 'الأكثر استلاماً للطلبات' : language === 'fr' ? 'Plus de livraisons' : 'Most Deliveries'}</div>
          <table className="w-full text-xs" style={{ color: 'var(--text-primary)' }}>
            <thead><tr className="border-b" style={{ borderColor: 'var(--border-color)' }}><th className="px-4 py-2 text-start">#</th><th className="px-4 py-2 text-start">{t('wilaya')}</th><th className="px-4 py-2 text-end">{language === 'ar' ? 'المستلمة' : language === 'fr' ? 'Livrées' : 'Delivered'}</th><th className="px-4 py-2 text-end">{t('percentage')}</th></tr></thead>
            <tbody>
              {topDeliveryWilayas.map((w, i) => {
                const pct = totalDeliveryWilayaCount > 0 ? (w.count / totalDeliveryWilayaCount) * 100 : 0;
                return (
                <tr key={w.name} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                  <td className="px-4 py-1.5">{rankEmoji(i)}</td>
                  <td className="px-4 py-1.5">{w.name}</td>
                  <td className="px-4 py-1.5 text-end font-semibold">{w.count}</td>
                  <td className="px-4 py-1.5 text-end" style={{ color: 'var(--text-secondary)' }}>{pct.toFixed(1)}%</td>
                </tr>
              );})}
              {topDeliveryWilayas.length === 0 && <tr><td colSpan={4} className="py-4 text-center" style={{ color: 'var(--text-secondary)' }}>—</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="px-4 py-3 border-b text-sm font-semibold" style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>🔄 {language === 'ar' ? 'الأكثر إرجاعاً' : language === 'fr' ? 'Plus de retours' : 'Most Returns'}</div>
          <table className="w-full text-xs" style={{ color: 'var(--text-primary)' }}>
            <thead><tr className="border-b" style={{ borderColor: 'var(--border-color)' }}><th className="px-4 py-2 text-start">#</th><th className="px-4 py-2 text-start">{t('wilaya')}</th><th className="px-4 py-2 text-end">{language === 'ar' ? 'مرتجعة' : language === 'fr' ? 'Retournées' : 'Returned'}</th><th className="px-4 py-2 text-end">{language === 'ar' ? 'نسبة الإرجاع' : language === 'fr' ? 'Taux retour' : 'Return Rate'}</th></tr></thead>
            <tbody>
              {wilayaReturnStats.filter(w => w.returned > 0).map((w, i) => (
                <tr key={w.name} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                  <td className="px-4 py-1.5">{rankEmoji(i)}</td>
                  <td className="px-4 py-1.5">{w.name}</td>
                  <td className="px-4 py-1.5 text-end">{w.returned}</td>
                  <td className="px-4 py-1.5 text-end font-semibold text-red-500">{w.rate.toFixed(1)}%</td>
                </tr>
              ))}
              {wilayaReturnStats.filter(w => w.returned > 0).length === 0 && <tr><td colSpan={4} className="py-4 text-center" style={{ color: 'var(--text-secondary)' }}>—</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts for wilaya stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderStatsTable(language === 'ar' ? 'نسبة التوصيل حسب الولايات' : language === 'fr' ? 'Livraisons par wilaya' : 'Deliveries by Wilaya', deliveryWilayaPieData, '📦')}
        {renderBarChart(language === 'ar' ? 'التوصيل حسب الولايات' : language === 'fr' ? 'Livraisons par wilaya' : 'Deliveries by Wilaya', topDeliveryWilayas, '📦', '#10b981')}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderStatsTable(language === 'ar' ? 'نسبة الإرجاع حسب الولايات' : language === 'fr' ? 'Retours par wilaya' : 'Returns by Wilaya', returnWilayaPieData, '🔄')}
        {renderBarChart(language === 'ar' ? 'الإرجاع حسب الولايات' : language === 'fr' ? 'Retours par wilaya' : 'Returns by Wilaya', wilayaReturnStats.filter(w => w.returned > 0).map(w => ({ name: w.name, count: w.returned })), '🔄', '#ef4444')}
      </div>

      {yearSummary && (
        <>
          <h2 className="text-lg font-bold pt-4" style={{ color: 'var(--text-primary)' }}>📊 {t('yearlySummary')} - {selectedYear}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {yearSummaryItems.map((section) => (
              <div key={section.label} className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                <div className="px-4 py-3 border-b text-sm font-bold flex items-center gap-2" style={{ borderColor: 'var(--border-color)', color: section.color }}>{section.icon} {section.label}</div>
                <div className="p-4 space-y-3">
                  {section.data.length > 0 ? section.data.map((item, i) => (
                    <div key={item.name}>
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>#{i + 1}</span>
                          <span className="text-xs font-medium truncate max-w-[120px]" style={{ color: 'var(--text-primary)' }}>{item.name}</span>
                        </div>
                        <span className="text-xs font-semibold" style={{ color: section.color }}>{item.count} ({item.percentage.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full h-2.5 rounded-full" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(item.percentage, 100)}%`, background: `linear-gradient(90deg, ${section.color}88, ${section.color})` }} />
                      </div>
                    </div>
                  )) : (
                    <p className="text-center py-4 text-xs" style={{ color: 'var(--text-secondary)' }}>—</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

    </div>
  );
}
