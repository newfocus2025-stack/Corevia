import { useMemo } from 'react';
import { useTranslation } from '../i18n/useTranslation';
import { useAppContext } from '../store/AppContext';
import { ShoppingBag, Package, Users, AlertTriangle, TrendingUp, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const monthNamesAr = ['جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان', 'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

export default function Dashboard() {
  const { language } = useTranslation();
  const { orders, inventory, subInventory, returnInventory, products, workers } = useAppContext();

  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  const monthOrders = useMemo(() => orders.filter(o => {
    const d = new Date(o.date);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  }), [orders, thisMonth, thisYear]);

  const monthDelivered = monthOrders.filter(o => o.status === 'delivered');
  const monthSales = monthDelivered.reduce((s, o) => s + o.total, 0);
  const monthOrdersCount = monthOrders.length;
  const lowStockItems = subInventory.filter(i => i.quantity > 0 && i.quantity <= 10);

  const totalBasicQty = inventory.reduce((s, i) => s + Object.values(i.colors).reduce((a, b) => a + b, 0), 0);
  const totalReturnQty = returnInventory.reduce((s, i) => s + i.quantity, 0);
  const totalInventoryQty = totalBasicQty + totalReturnQty;

  const cards = [
    { icon: ShoppingBag, label: language === 'ar' ? 'طلبات هذا الشهر' : language === 'fr' ? 'Commandes ce mois' : 'Orders This Month', value: monthOrdersCount, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/20' },
    { icon: DollarSign, label: language === 'ar' ? 'مبيعات هذا الشهر' : language === 'fr' ? 'Ventes ce mois' : 'Sales This Month', value: `${monthSales.toLocaleString(undefined, { maximumFractionDigits: 0 })} دج`, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/20' },
    { icon: TrendingUp, label: language === 'ar' ? 'تم التوصيل' : language === 'fr' ? 'Livrées' : 'Delivered', value: monthDelivered.length, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/20' },
    { icon: Package, label: language === 'ar' ? 'إجمالي المخزون' : language === 'fr' ? 'Stock total' : 'Total Stock', value: `${totalInventoryQty} ${language === 'ar' ? 'قطعة' : language === 'fr' ? 'pièces' : 'units'}`, color: 'text-violet-500', bg: 'bg-violet-100 dark:bg-violet-900/20' },
    { icon: Users, label: language === 'ar' ? 'العمال' : language === 'fr' ? 'Ouvriers' : 'Workers', value: workers.length, color: 'text-cyan-500', bg: 'bg-cyan-100 dark:bg-cyan-900/20' },
    { icon: AlertTriangle, label: language === 'ar' ? 'مخزون منخفض' : language === 'fr' ? 'Stock faible' : 'Low Stock', value: lowStockItems.length, color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/20' },
  ];

  const recentOrders = useMemo(() => [...orders].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5), [orders]);

  // Monthly order analysis for current year
  const monthlyAnalysis = monthNamesAr.map((mn, i) => {
    const mOrders = orders.filter(o => new Date(o.date).getMonth() === i && new Date(o.date).getFullYear() === thisYear);
    return {
      month: mn,
      delivered: mOrders.filter(o => o.status === 'delivered').length,
      returned: mOrders.filter(o => o.status === 'returned').length,
      pending: mOrders.filter(o => o.status === 'pending').length,
    };
  });

  const yearDelivered = monthlyAnalysis.reduce((s, m) => s + m.delivered, 0);
  const yearReturned = monthlyAnalysis.reduce((s, m) => s + m.returned, 0);
  const yearPending = monthlyAnalysis.reduce((s, m) => s + m.pending, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{language === 'ar' ? 'لوحة التحكم' : language === 'fr' ? 'Tableau de bord' : 'Dashboard'}</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((card) => (
          <div key={card.label} className="p-4 rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <div className="flex flex-col items-center text-center gap-2">
              <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center`}>
                <card.icon size={20} className={card.color} />
              </div>
              <div>
                <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{card.label}</p>
                <p className={`text-lg font-bold ${card.color}`}>{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>{language === 'ar' ? 'آخر الطلبات' : language === 'fr' ? 'Dernières commandes' : 'Recent Orders'}</h3>
          <div className="space-y-2">
            {recentOrders.length > 0 ? recentOrders.map(o => (
              <div key={o.id} className="flex items-center justify-between p-2 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-2 h-2 rounded-full ${o.status === 'delivered' ? 'bg-green-500' : o.status === 'returned' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                  <span className="text-xs truncate" style={{ color: 'var(--text-primary)' }}>#{o.orderNumber} - {o.customerName}</span>
                </div>
                <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{o.total.toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</span>
              </div>
            )) : (
              <p className="text-center py-4 text-xs" style={{ color: 'var(--text-secondary)' }}>—</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>{language === 'ar' ? 'تنبيهات المخزون' : language === 'fr' ? 'Alertes de stock' : 'Stock Alerts'}</h3>
          <div className="space-y-2">
            {lowStockItems.length > 0 ? lowStockItems.slice(0, 8).map(i => (
              <div key={`${i.model}-${i.color}-${i.size}`} className="flex items-center justify-between p-2 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <span className="text-xs truncate" style={{ color: 'var(--text-primary)' }}>{i.model} - {i.color} - {i.size}</span>
                <span className="text-xs font-semibold text-orange-500">{i.quantity}</span>
              </div>
            )) : (
              <p className="text-center py-4 text-xs" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'المخزون متوفر' : language === 'fr' ? 'Stock disponible' : 'Stock is sufficient'}</p>
            )}
          </div>
        </div>
      </div>

      {/* Order Analysis Chart */}
      <div className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>{language === 'ar' ? 'تحليل الطلبات الشهري' : language === 'fr' ? 'Analyse mensuelle des commandes' : 'Monthly Order Analysis'} - {thisYear}</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={monthlyAnalysis}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
            <Tooltip />
            <Bar dataKey="delivered" fill="#10b981" radius={[4, 4, 0, 0]} name={language === 'ar' ? 'مستلمة' : language === 'fr' ? 'Livrées' : 'Delivered'} />
            <Bar dataKey="returned" fill="#ef4444" radius={[4, 4, 0, 0]} name={language === 'ar' ? 'مرتجعة' : language === 'fr' ? 'Retournées' : 'Returned'} />
            <Bar dataKey="pending" fill="#f59e0b" radius={[4, 4, 0, 0]} name={language === 'ar' ? 'قيد الانتظار' : language === 'fr' ? 'En attente' : 'Pending'} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'إجمالي المنتجات' : language === 'fr' ? 'Total produits' : 'Total Products'}</p>
          <p className="text-2xl font-bold text-violet-500">{products.length}</p>
        </div>
        <div className="p-4 rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'مستلمة' : language === 'fr' ? 'Livrées' : 'Delivered'}</p>
          <p className="text-2xl font-bold text-emerald-500">{yearDelivered}</p>
        </div>
        <div className="p-4 rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'مرتجعة' : language === 'fr' ? 'Retournées' : 'Returned'}</p>
          <p className="text-2xl font-bold text-red-500">{yearReturned}</p>
        </div>
        <div className="p-4 rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'قيد الانتظار' : language === 'fr' ? 'En attente' : 'Pending'}</p>
          <p className="text-2xl font-bold text-yellow-500">{yearPending}</p>
        </div>
      </div>
    </div>
  );
}
