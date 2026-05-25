import { useState, useEffect, useMemo, Fragment } from 'react';
import { useTranslation } from '../i18n/useTranslation';
import { useAppContext } from '../store/AppContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, Line } from 'recharts';
import type { PieLabelRenderProps } from 'recharts';
import { Lock, TrendingUp, TrendingDown, DollarSign, Package, ShoppingBag } from 'lucide-react';
import { focusNextInput } from '../shared/formHelpers';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

const monthNamesAr = ['جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان', 'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const monthNamesFr = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const monthNamesEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function Yearly() {
  const { t, language } = useTranslation();
  const { orders, password, monthlyProfits, yearlySummaries } = useAppContext();

  const AUTH_KEY = 'auth_yearly';
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
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
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

  const yearOrders = useMemo(() => orders.filter(o => new Date(o.date).getFullYear() === selectedYear), [orders, selectedYear]);
  const yearDelivered = yearOrders.filter(o => o.status === 'delivered');
  const yearReturned = yearOrders.filter(o => o.status === 'returned');
  const yearTotalSales = yearDelivered.reduce((s, o) => s + o.total, 0);

  const getTop = (field: string, n: number) => {
    const counts: Record<string, number> = {};
    yearDelivered.forEach(o => {
      if (field === 'wilaya') {
        counts[o.wilaya] = (counts[o.wilaya] || 0) + o.items.reduce((s, i) => s + i.quantity, 0);
      } else {
        o.items.forEach(item => {
          const key = field === 'model' ? item.model : field === 'color' ? item.color : item.size;
          if (key) counts[key] = (counts[key] || 0) + item.quantity;
        });
      }
    });
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([name, count]) => ({ name, count, percentage: total > 0 ? (count / total) * 100 : 0 }));
  };

  const topWilayas = useMemo(() => getTop('wilaya', 10), [yearDelivered]);
  const topModels = useMemo(() => getTop('model', 10), [yearDelivered]);
  const topColors = useMemo(() => getTop('color', 10), [yearDelivered]);
  const topSizes = useMemo(() => getTop('size', 10), [yearDelivered]);

  const monthlyData = monthNamesAr.map((mn, i) => {
    const mp = monthlyProfits.find(p => p.month === mn && p.year === selectedYear);
    return {
      month: monthNames[i],
      profit: mp ? mp.finalProfit : 0,
      sales: mp ? mp.totalSales : 0,
      cost: mp ? mp.totalCost : 0,
      delivered: mp ? mp.deliveredOrders : yearDelivered.filter(o => new Date(o.date).getMonth() === i).length,
      returned: mp ? mp.returnedOrders : yearReturned.filter(o => new Date(o.date).getMonth() === i).length,
    };
  });

  const yearSummary = yearlySummaries.find(y => y.year === selectedYear);
  const totalProfit = yearSummary ? yearSummary.totalProfit : monthlyData.reduce((s, m) => s + m.profit, 0);
  const profitTrend = monthlyData.length >= 2 ? monthlyData[monthlyData.length - 1].profit - monthlyData[monthlyData.length - 2].profit : 0;

  const profitableMonths = monthlyData.filter(m => m.profit > 0).length;
  const lossMonths = monthlyData.filter(m => m.profit < 0).length;

  const CustomPie = (data: { name: string; count: number }[], title: string, icon: string) => (
    <div className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
      <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>{icon} {title}</h3>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={data} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={(entry: PieLabelRenderProps) => `${entry.name} (${((entry.percent || 0) * 100).toFixed(0)}%)`}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-[220px] text-sm" style={{ color: 'var(--text-secondary)' }}>—</div>
      )}
    </div>
  );

  const rankEmoji = (i: number) => i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>📊 {t('yearly')} {LockIcon}</h1>
        <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} onKeyDown={focusNextInput}
          className="px-3 py-2 rounded-xl border text-sm outline-none"
          style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
          {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl border-2 border-blue-400 bg-blue-50 dark:bg-blue-900/10">
          <p className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>🏆 {t('totalYearlyProfit')}</p>
          <p className="text-xl font-bold mt-1 flex items-center gap-1" style={{ color: totalProfit >= 0 ? '#059669' : '#dc2626' }}>
            {totalProfit >= 0 ? '+' : ''}{totalProfit.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            {profitTrend !== 0 && (
              <span className={`text-xs flex items-center ${profitTrend > 0 ? 'text-green-500' : 'text-red-500'}`}>
                {profitTrend > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              </span>
            )}
          </p>
        </div>
        <div className="p-4 rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}><ShoppingBag size={12} className="inline" /> {language === 'ar' ? 'إجمالي الطلبات' : language === 'fr' ? 'Total commandes' : 'Total Orders'}</p>
          <p className="text-xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{yearOrders.length}</p>
          <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{yearDelivered.length} {language === 'ar' ? 'مستلمة' : language === 'fr' ? 'livrées' : 'delivered'} | {yearReturned.length} {language === 'ar' ? 'مرتجعة' : language === 'fr' ? 'ret.' : 'ret.'}</p>
        </div>
        <div className="p-4 rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}><DollarSign size={12} className="inline" /> {language === 'ar' ? 'إجمالي المبيعات' : language === 'fr' ? 'Total ventes' : 'Total Sales'}</p>
          <p className="text-xl font-bold mt-1 text-green-500">{yearTotalSales.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</p>
        </div>
        <div className="p-4 rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}><Package size={12} className="inline" /> {language === 'ar' ? 'نتائج الأشهر' : language === 'fr' ? 'Résultats mensuels' : 'Monthly Results'}</p>
          <p className="text-xl font-bold mt-1 flex gap-2">
            <span className="text-green-500">✅ {profitableMonths}</span>
            <span className="text-red-500">❌ {lossMonths}</span>
          </p>
        </div>
      </div>

      {/* Monthly Overview Chart */}
      <div className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          📈 {language === 'ar' ? 'الأداء الشهري' : language === 'fr' ? 'Performance mensuelle' : 'Monthly Performance'}
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={monthlyData}>
            <defs>
              <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
              <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
              <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
            <Tooltip />
            <Area type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={2} fill="url(#salesGrad)" name={t('totalSales')} />
            <Area type="monotone" dataKey="cost" stroke="#ef4444" strokeWidth={2} fill="url(#costGrad)" name={t('totalCost')} />
            <Line type="monotone" dataKey="profit" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} name={t('netProfit')} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly profit trend bar */}
      <div className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          📊 {language === 'ar' ? 'صافي الربح الشهري' : language === 'fr' ? 'Bénéfice net mensuel' : 'Monthly Net Profit'}
        </h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
            <Tooltip />
            <Bar dataKey="profit" radius={[6, 6, 0, 0]}>
              {monthlyData.map((entry, i) => (
                <Cell key={i} fill={entry.profit >= 0 ? '#10b981' : '#ef4444'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top 10 Charts */}
      <h2 className="text-lg font-bold pt-2" style={{ color: 'var(--text-primary)' }}>🏆 {language === 'ar' ? 'أفضل 10' : language === 'fr' ? 'Top 10' : 'Top 10'}</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>🗺️ {t('topWilayas')}</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topWilayas} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
              <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>👕 {t('topModels')}</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topModels} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
              <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
              <Tooltip />
              <Bar dataKey="count" fill="#10b981" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>🎨 {t('topColors')}</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topColors} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
              <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
              <Tooltip />
              <Bar dataKey="count" fill="#f59e0b" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>📏 {t('topSizes')}</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topSizes} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
              <YAxis type="category" dataKey="name" width={60} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
              <Tooltip />
              <Bar dataKey="count" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pie Charts - Top 3 */}
      <h2 className="text-lg font-bold pt-2" style={{ color: 'var(--text-primary)' }}>🥇 {language === 'ar' ? 'أفضل 3' : language === 'fr' ? 'Top 3' : 'Top 3'}</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {CustomPie(topWilayas.slice(0, 3), t('topWilayas'), '🗺️')}
        {CustomPie(topModels.slice(0, 3), t('topModels'), '👕')}
        {CustomPie(topColors.slice(0, 3), t('topColors'), '🎨')}
        {CustomPie(topSizes.slice(0, 3), t('topSizes'), '📏')}
      </div>

      {/* Top 3 Detailed Ranking Cards */}
      <h2 className="text-lg font-bold pt-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
        🏅 {language === 'ar' ? 'ترتيب مفصل' : language === 'fr' ? 'Classement détaillé' : 'Detailed Ranking'}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {([
          { icon: '🗺️', title: t('topWilayas'), data: topWilayas.slice(0, 3), color: '#3b82f6' },
          { icon: '👕', title: t('topModels'), data: topModels.slice(0, 3), color: '#10b981' },
          { icon: '🎨', title: t('topColors'), data: topColors.slice(0, 3), color: '#f59e0b' },
          { icon: '📏', title: t('topSizes'), data: topSizes.slice(0, 3), color: '#8b5cf6' },
        ] as const).map((section) => (
          <div key={section.title} className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <div className="px-4 py-3 border-b text-sm font-bold flex items-center gap-2" style={{ borderColor: 'var(--border-color)' }}>{section.icon} {section.title}</div>
            <div className="p-4 space-y-3">
              {section.data.length > 0 ? section.data.map((item, i) => (
                <div key={item.name}>
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{rankEmoji(i)}</span>
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.name}</span>
                    </div>
                    <span className="text-sm font-semibold" style={{ color: section.color }}>{item.count} ({item.percentage.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full h-3 rounded-full" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(item.percentage, 100)}%`, background: `linear-gradient(90deg, ${section.color}66, ${section.color})` }} />
                  </div>
                </div>
              )) : (
                <p className="text-center py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>—</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Full year table */}
      <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <div className="px-4 py-3 border-b text-sm font-bold" style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
          📋 {language === 'ar' ? 'تقرير مفصل للسنة' : language === 'fr' ? 'Rapport annuel détaillé' : 'Detailed Yearly Report'} - {selectedYear}
        </div>
        <table className="w-full text-sm" style={{ color: 'var(--text-primary)' }}>
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
              <th className="px-4 py-3 text-xs font-semibold text-start">#</th>
              <th className="px-4 py-3 text-xs font-semibold text-start">{language === 'ar' ? 'التصنيف' : language === 'fr' ? 'Catégorie' : 'Category'}</th>
              <th className="px-4 py-3 text-xs font-semibold text-start">{t('name')}</th>
              <th className="px-4 py-3 text-xs font-semibold text-end">{t('count')}</th>
              <th className="px-4 py-3 text-xs font-semibold text-end">{t('percentage')}</th>
            </tr>
          </thead>
          <tbody>
            {[
              { label: `${'🗺️'} ${t('topWilayas')}`, data: topWilayas.slice(0, 5) },
              { label: `${'👕'} ${t('topModels')}`, data: topModels.slice(0, 5) },
              { label: `${'🎨'} ${t('topColors')}`, data: topColors.slice(0, 5) },
              { label: `${'📏'} ${t('topSizes')}`, data: topSizes.slice(0, 5) },
            ].map((group) => (
              <Fragment key={group.label}>
                <tr><td colSpan={5} className="px-4 py-2 text-xs font-bold" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>{group.label}</td></tr>
                {group.data.map((item, i) => (
                  <tr key={item.name} className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                    <td className="px-4 py-2">{rankEmoji(i)}</td>
                    <td className="px-4 py-2">{group.label}</td>
                    <td className="px-4 py-2">{item.name}</td>
                    <td className="px-4 py-2 text-end font-semibold">{item.count}</td>
                    <td className="px-4 py-2 text-end" style={{ color: 'var(--text-secondary)' }}>{item.percentage.toFixed(1)}%</td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
