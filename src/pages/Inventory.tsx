import { useState } from 'react';
import { useTranslation } from '../i18n/useTranslation';
import { useAppContext } from '../store/AppContext';
import { Package, RotateCcw, Edit2, X, Check, Search, Trash2 } from 'lucide-react';
import { focusNextInput, clearZeroOnFocus } from '../shared/formHelpers';

export default function Inventory() {
  const { t, language } = useTranslation();
  const { products, inventory, subInventory, returnInventory, setReturnInventory, settings, deleteProduct, purchaseOrders } = useAppContext();
  const colors = settings.colors;
  const [editQty, setEditQty] = useState<{ id: string; qty: number } | null>(null);
  const [search, setSearch] = useState('');

  // stock movement summary
  const totalBasicItems = inventory.reduce((s, i) => s + Object.values(i.colors).reduce((a, b) => a + b, 0), 0);
  const totalSubItems = subInventory.reduce((s, i) => s + i.quantity, 0);
  const totalReturnQty = returnInventory.reduce((s, i) => s + i.quantity, 0);
  const totalAllItems = totalBasicItems + totalReturnQty;

  const q = search.trim().toLowerCase();
  // Build table from products, fill quantities from inventory
  const tableData = products
    .filter(p => !q || p.name.toLowerCase().includes(q) || p.colors.some(c => c.name.toLowerCase().includes(q)))
    .map(p => ({
      model: p.name,
      colors: Object.fromEntries(
        p.colors.map(c => [c.name, inventory.find(i => i.model === p.name)?.colors[c.name] ?? 0])
      ) as Record<string, number>,
    }))
    .filter(row => Object.values(row.colors).some(v => v > 0) || !q);
  const filteredSubInventory = q ? subInventory.filter(i => i.model.toLowerCase().includes(q) || i.color.toLowerCase().includes(q) || (i.size && i.size.toLowerCase().includes(q))) : subInventory;
  const filteredReturnInventory = q ? returnInventory.filter(i => i.model.toLowerCase().includes(q) || i.color.toLowerCase().includes(q) || (i.size && i.size.toLowerCase().includes(q))) : returnInventory;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('inventory')}</h1>
        <div className="relative">
          <Search size={16} className="absolute top-1/2 -translate-y-1/2 right-3 pointer-events-none" style={{ color: 'var(--text-secondary)' }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={focusNextInput}
            className="pr-9 pl-3 py-1.5 rounded-lg border text-sm outline-none w-56"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
            placeholder={language === 'ar' ? 'بحث...' : language === 'fr' ? 'Recherche...' : 'Search...'} />
        </div>
      </div>

      {/* TABLE 1: Basic Inventory (product × colors grid) */}
      <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <Package size={18} className="text-blue-500" />
          <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>🔹 {t('basicInventory')}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ color: 'var(--text-primary)' }}>
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                <th className="px-3 py-2.5 text-xs font-semibold text-start whitespace-nowrap sticky right-0 bg-inherit" style={{ color: 'var(--text-secondary)' }}>{t('model')}</th>
                {colors.map(c => (
                  <th key={c} className="px-2 py-2.5 text-xs font-semibold text-center whitespace-nowrap min-w-[60px]" style={{ color: 'var(--text-secondary)' }}>{c}</th>
                ))}
                <th className="px-3 py-2.5 text-xs font-semibold text-center whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{t('totalAuto')}</th>
                <th className="px-2 py-2.5 w-12" />
              </tr>
            </thead>
            <tbody>
              {tableData.length === 0 ? (
                <tr><td colSpan={colors.length + 3} className="text-center py-8 text-sm" style={{ color: 'var(--text-secondary)' }}>{search.trim() ? (language === 'ar' ? 'لا توجد نتائج' : language === 'fr' ? 'Aucun résultat' : 'No results') : (language === 'ar' ? 'لا توجد منتجات' : language === 'fr' ? 'Aucun produit' : 'No products')}</td></tr>
              ) : (
                tableData.map(item => {
                  const total = Object.values(item.colors).reduce((a, b) => a + b, 0);
                  const prod = products.find(p => p.name === item.model);
                  return (
                    <tr key={item.model} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors" style={{ borderColor: 'var(--border-color)' }}>
                      <td className="px-3 py-2.5 font-medium text-sm sticky right-0" style={{ backgroundColor: 'var(--bg-card)' }}>{item.model}</td>
                      {colors.map(c => {
                        const qty = item.colors[c] ?? 0;
                        return (
                          <td key={c} className={`px-2 py-2.5 text-center text-sm ${
                            qty <= 2 && qty > 0 ? 'text-yellow-500 font-semibold' :
                            qty === 0 ? 'text-red-400' : ''
                          }`}>
                            <span className={`inline-block min-w-[24px] px-1.5 py-0.5 rounded ${
                              qty === 0 ? 'bg-red-50 dark:bg-red-900/10' :
                              qty <= 2 ? 'bg-yellow-50 dark:bg-yellow-900/10' : 'bg-green-50 dark:bg-green-900/10'
                            }`}>{qty}</span>
                          </td>
                        );
                      })}
                      <td className="px-3 py-2.5 text-center font-bold text-sm">{total}</td>
                      <td className="px-2 py-2.5 text-center">
                        {(() => {
                          const hasPOs = purchaseOrders.some(po => po.items.some(it => it.productName === item.model));
                          return hasPOs ? (
                            <span className="inline-block p-1.5 text-gray-300 cursor-not-allowed" title={
                              language === 'ar' ? 'لا يمكن الحذف — يوجد فواتير لهذا المنتج' :
                              language === 'fr' ? 'Suppression impossible — des factures existent pour ce produit' :
                              'Cannot delete — invoices exist for this product'
                            }><Trash2 size={14} /></span>
                          ) : (
                            <button onClick={() => {
                              if (language === 'ar' ? confirm(`حذف "${item.model}" نهائياً؟`) :
                                  language === 'fr' ? confirm(`Supprimer "${item.model}" définitivement ?`) :
                                  confirm(`Delete "${item.model}" permanently?`)) {
                                if (prod) deleteProduct(prod.id);
                              }
                            }} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 hover:text-red-500 transition-colors" title={t('delete')}>
                              <Trash2 size={14} />
                            </button>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* TABLE 2: Sub Inventory (auto, read-only) — matches invoice format (model, color, size, qty) */}
      <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <Package size={18} className="text-yellow-500" />
          <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>🔹 {t('subInventory')}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ color: 'var(--text-primary)' }}>
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                <th className="px-3 py-2.5 text-xs font-semibold text-start whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{t('model')}</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-start whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{t('color')}</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-center whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{t('size')}</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-center whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{t('quantity')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubInventory.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-sm" style={{ color: 'var(--text-secondary)' }}>{search.trim() ? (language === 'ar' ? 'لا توجد نتائج' : language === 'fr' ? 'Aucun résultat' : 'No results') : '—'}</td></tr>
              ) : (
                filteredSubInventory.map((item, idx) => (
                  <tr key={`${item.model}-${item.color}-${item.size}-${idx}`} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors" style={{ borderColor: 'var(--border-color)' }}>
                    <td className="px-3 py-2.5 font-medium text-sm">{item.model}</td>
                    <td className="px-3 py-2.5 text-sm">{item.color}</td>
                    <td className="px-3 py-2.5 text-sm text-center">{item.size}</td>
                    <td className={`px-3 py-2.5 text-sm text-center font-medium ${item.quantity <= 2 && item.quantity > 0 ? 'text-yellow-500' : item.quantity === 0 ? 'text-red-400' : ''}`}>{item.quantity}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* TABLE 3: Return Inventory */}
      <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <RotateCcw size={18} className="text-red-500" />
          <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>🔹 {t('returnInventory')}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ color: 'var(--text-primary)' }}>
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                <th className="px-3 py-2.5 text-xs font-semibold text-start whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{t('orderNumber')}</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-start whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{t('model')}</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-start whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{t('color')}</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-center whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{t('size')}</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-center whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{t('quantity')}</th>
                <th className="px-2 py-2.5 w-16" />
              </tr>
            </thead>
            <tbody>
              {filteredReturnInventory.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-sm" style={{ color: 'var(--text-secondary)' }}>{search.trim() ? (language === 'ar' ? 'لا توجد نتائج' : language === 'fr' ? 'Aucun résultat' : 'No results') : '—'}</td></tr>
              ) : (
                filteredReturnInventory.map((item, idx) => {
                  const itemKey = `${item.orderNumber || ''}-${item.model}-${item.color}-${item.size}-${idx}`;
                  return (
                    <tr key={itemKey} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors" style={{ borderColor: 'var(--border-color)' }}>
                      <td className="px-3 py-2.5 text-sm">{item.orderNumber || '-'}</td>
                      <td className="px-3 py-2.5 font-medium text-sm">{item.model}</td>
                      <td className="px-3 py-2.5 text-sm">{item.color}</td>
                      <td className="px-3 py-2.5 text-sm text-center">{item.size}</td>
                      <td className="px-3 py-2.5 text-sm text-center font-medium">
                        {editQty?.id === itemKey ? (
                          <div className="flex items-center justify-center gap-1">
                            <input type="number" min="0" value={editQty.qty} onChange={e => setEditQty({ id: itemKey, qty: Number(e.target.value) })} onKeyDown={focusNextInput} onFocus={clearZeroOnFocus}
                              className="w-16 px-1 py-0.5 rounded border text-xs text-center outline-none"
                              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                            <button onClick={() => {
                              const realIdx = returnInventory.findIndex(r => r.model === item.model && r.color === item.color && r.size === item.size && r.orderNumber === item.orderNumber);
                              if (realIdx === -1) return;
                              const updated = returnInventory.map((ri, i) => i === realIdx ? { ...ri, quantity: editQty.qty } : ri);
                              setReturnInventory(updated);
                              setEditQty(null);
                            }} className="p-0.5 text-green-500 hover:text-green-600"><Check size={14} /></button>
                            <button onClick={() => setEditQty(null)} className="p-0.5 text-red-400 hover:text-red-500"><X size={14} /></button>
                          </div>
                        ) : (
                          <span className={`${item.quantity <= 2 && item.quantity > 0 ? 'text-yellow-500 font-semibold' : item.quantity === 0 ? 'text-red-400' : ''}`}>{item.quantity}</span>
                        )}
                      </td>
                      <td className="px-2 py-2.5">
                        <div className="flex gap-1">
                          <button onClick={() => setEditQty({ id: itemKey, qty: item.quantity })} className="p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-400" title={t('edit')}>
                            <Edit2 size={13} />
                          </button>
                          <button onClick={() => {
                            if (language === 'ar' ? confirm('حذف هذا العنصر من مخزون الإرجاع؟') : language === 'fr' ? confirm('Supprimer cet élément du stock retour ?') : confirm('Delete this item from return inventory?')) {
                              const realIdx = returnInventory.findIndex(r => r.model === item.model && r.color === item.color && r.size === item.size && r.orderNumber === item.orderNumber);
                              if (realIdx === -1) return;
                              setReturnInventory(returnInventory.filter((_, i) => i !== realIdx));
                            }
                          }} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400" title={t('delete')}>
                            <Trash2 size={13} />
                          </button>
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

      {/* TABLE 4: Stock Summary */}
      <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <Package size={18} className="text-purple-500" />
          <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>🔹 {t('table4')}</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4">
          <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'إجمالي المخزون' : language === 'fr' ? 'Stock total' : 'Total Stock'}</p>
            <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{totalAllItems.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
          </div>
          <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t('basicInventory')}</p>
            <p className="text-xl font-bold text-blue-500">{totalBasicItems.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
          </div>
          <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t('subInventory')}</p>
            <p className="text-xl font-bold text-yellow-500">{totalSubItems.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
          </div>
          <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t('returnsTable')}</p>
            <p className="text-xl font-bold text-red-500">{totalReturnQty.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
          </div>
        </div>
      </div>

    </div>
  );
}
