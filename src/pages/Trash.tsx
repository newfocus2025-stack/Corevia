import { useState, useEffect } from 'react';
import { useTranslation } from '../i18n/useTranslation';
import { useAppContext } from '../store/AppContext';
import { Trash2, RotateCcw, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Trash() {
  const { t, language } = useTranslation();
  const { trash, restoreFromTrash } = useAppContext();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const thirtyDays = 30 * 24 * 60 * 60 * 1000;

  const handleRestore = (id: string) => {
    restoreFromTrash(id);
    toast.success(t('orderRestored'));
  };

  const isOrder = (item: typeof trash[0]): item is typeof trash[0] & { order: NonNullable<typeof trash[0]['order']> } => !!item.order;
  const isPo = (item: typeof trash[0]): item is typeof trash[0] & { purchaseOrder: NonNullable<typeof trash[0]['purchaseOrder']> } => !!item.purchaseOrder;
  const isWorker = (item: typeof trash[0]): item is typeof trash[0] & { worker: NonNullable<typeof trash[0]['worker']> } => !!item.worker;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-900/20" style={{ color: 'var(--text-primary)' }}>
          <Trash2 size={22} className="text-red-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{language === 'ar' ? 'المهملات' : language === 'fr' ? 'Corbeille' : 'Trash'}</h1>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'العناصر المحذوفة تبقى 30 يوماً ثم تُحذف تلقائياً' : language === 'fr' ? 'Les éléments supprimés restent 30 jours puis sont supprimés automatiquement' : 'Deleted items stay 30 days then auto-delete'}</p>
        </div>
      </div>

      {trash.length === 0 ? (
        <div className="text-center py-16">
          <Trash2 size={48} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--text-secondary)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'السلة فارغة' : language === 'fr' ? 'La corbeille est vide' : 'Trash is empty'}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border-color)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                <th className="px-3 py-2.5 text-start text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'النوع' : language === 'fr' ? 'Type' : 'Type'}</th>
                <th className="px-3 py-2.5 text-start text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{t('orderNumber')}</th>
                <th className="px-3 py-2.5 text-start text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'الاسم' : language === 'fr' ? 'Nom' : 'Name'}</th>
                <th className="px-3 py-2.5 text-start text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{t('total')}</th>
                <th className="px-3 py-2.5 text-start text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{t('date')}</th>
                <th className="px-3 py-2.5 text-start text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'تاريخ الحذف' : language === 'fr' ? 'Date de suppression' : 'Deleted At'}</th>
                <th className="px-3 py-2.5 text-start text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'الوقت المتبقي' : language === 'fr' ? 'Temps restant' : 'Time Left'}</th>
                <th className="px-3 py-2.5 text-start text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}></th>
              </tr>
            </thead>
            <tbody>
              {trash.map((item) => {
                const elapsed = now - new Date(item.deletedAt).getTime();
                const remaining = Math.max(0, thirtyDays - elapsed);
                const daysLeft = Math.floor(remaining / (24 * 60 * 60 * 1000));
                const hoursLeft = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
                const minutesLeft = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
                const secondsLeft = Math.floor((remaining % (60 * 1000)) / 1000);
                const order = isOrder(item) ? item.order : null;
                const po = isPo(item) ? item.purchaseOrder : null;
                const worker = isWorker(item) ? item.worker : null;
                const label = order
                  ? (language === 'ar' ? 'فاتورة بيع' : language === 'fr' ? 'Facture vente' : 'Sale Invoice')
                  : po
                  ? (language === 'ar' ? 'فاتورة شراء' : language === 'fr' ? 'Facture achat' : 'Purchase Invoice')
                  : (language === 'ar' ? 'عامل' : language === 'fr' ? 'Travailleur' : 'Worker');
                const badgeClass = order
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : po
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
                return (
                  <tr key={order?.id || po?.id || worker?.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors" style={{ borderColor: 'var(--border-color)' }}>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${badgeClass}`}>
                        {label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs">{order ? order.orderNumber : po ? `INV-${po.invoiceNumber}` : worker ? worker.code : ''}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs font-medium">{order ? order.customerName : po ? po.supplierName : worker ? worker.name : ''}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs">{(order ? order.total : po ? po.total : worker ? worker.salary : 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} دج</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs">{order ? order.date : po ? po.date : worker ? `${worker.month} ${worker.year}` : ''}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs">{new Date(item.deletedAt).toLocaleDateString(language === 'ar' ? 'ar-SA' : language === 'fr' ? 'fr-FR' : 'en-US')}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-mono text-xs font-medium" style={{ color: daysLeft === 0 && hoursLeft === 0 ? '#ef4444' : 'var(--text-secondary)' }}>
                        <Clock size={12} />
                        <span className={daysLeft === 0 && hoursLeft === 0 ? 'text-red-500' : ''}>
                          {daysLeft > 0 && `${daysLeft}:`}{String(hoursLeft).padStart(2, '0')}:{String(minutesLeft).padStart(2, '0')}:{String(secondsLeft).padStart(2, '0')}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <button onClick={() => handleRestore(order?.id || po?.id || worker?.id || '')}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium transition-all">
                        <RotateCcw size={12} />
                        {language === 'ar' ? 'استعادة' : language === 'fr' ? 'Restaurer' : 'Restore'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}