import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from '../i18n/useTranslation';
import { useAppContext } from '../store/AppContext';
import { initSelectAutoAdvance } from '../shared/formHelpers';
import {
  ShoppingBag, Package, Users, DollarSign, BarChart3, Settings,
  Menu, X, Moon, Sun, Bell, Globe, ClipboardList, Building2, Trash2, Receipt, LayoutDashboard
} from 'lucide-react';
import type { Language } from '../types';

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, key: 'dashboard', protect: false, color: 'bg-sky-500' },
  { path: '/orders', icon: ShoppingBag, key: 'orders', protect: false, color: 'bg-blue-500' },
  { path: '/inventory', icon: Package, key: 'inventory', protect: false, color: 'bg-emerald-500' },
  { path: '/products', icon: ClipboardList, key: 'products', protect: false, color: 'bg-violet-500' },
  { path: '/workers', icon: Users, key: 'workers', protect: true, color: 'bg-cyan-500' },
  { path: '/expenses', icon: Receipt, key: 'expenses', protect: true, color: 'bg-orange-500' },
  { path: '/suppliers', icon: Building2, key: 'suppliers', protect: true, color: 'bg-amber-500' },
  { path: '/profit-summary', icon: DollarSign, key: 'profitSummary', protect: true, color: 'bg-green-500' },
  { path: '/yearly', icon: BarChart3, key: 'yearly', protect: true, color: 'bg-indigo-500' },
  { path: '/trash', icon: Trash2, key: 'trash', protect: false, color: 'bg-red-500' },
  { path: '/settings', icon: Settings, key: 'settings', protect: false, color: 'bg-gray-500' },
];

export default function Layout() {
  const { t } = useTranslation();
  const { darkMode, toggleDarkMode, language, setLanguage, notifications, markAllNotificationsRead } = useAppContext();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const location = useLocation();

  useEffect(() => { initSelectAutoAdvance(); }, []);

  const unread = notifications.filter(n => !n.read).length;

  const languages: { code: Language; label: string }[] = [
    { code: 'ar', label: 'العربية' },
    { code: 'fr', label: 'Français' },
    { code: 'en', label: 'English' },
  ];

  const langLabel: Record<Language, string> = { ar: 'العربية', fr: 'Français', en: 'English' };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 z-50 w-72 transform transition-all duration-300 ease-out
        ${language === 'ar' ? 'right-0' : 'left-0'}
        ${sidebarOpen ? 'translate-x-0' : language === 'ar' ? 'translate-x-full' : '-translate-x-full'}
        shadow-2xl
      `} style={{ backgroundColor: 'var(--bg-card)' }}>
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{t('appName')}</h1>
          <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" style={{ color: 'var(--text-secondary)' }}>
            <X size={20} />
          </button>
        </div>
        <nav className="p-3 space-y-0.5">
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                style={{ color: isActive ? undefined : 'var(--text-secondary)' }}
              >
                {isActive && (
                  <div className={`absolute ${language === 'ar' ? 'right-0' : 'left-0'} top-1/2 -translate-y-1/2 w-1 h-6 rounded-full ${item.color}`} />
                )}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${item.color} ${isActive ? 'shadow-sm' : 'opacity-80'}`}>
                  <item.icon size={16} />
                </div>
                <span className={isActive ? 'font-semibold' : ''}>{t(item.key)}</span>
                {item.protect && (
                  <svg className="w-3 h-3 mr-auto opacity-40" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                )}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top navbar */}
        <header className="sticky top-0 z-30 border-b" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center justify-between px-4 h-14">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" style={{ color: 'var(--text-secondary)' }}>
                <Menu size={20} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Language switcher */}
              <div className="relative">
                <button onClick={() => { setLangOpen(!langOpen); setNotifOpen(false); }} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm border transition-all hover:bg-gray-100 dark:hover:bg-gray-800" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                  <Globe size={16} />
                  <span className="hidden sm:inline">{langLabel[language]}</span>
                </button>
                {langOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
                    <div className="absolute top-full mt-1 end-0 z-50 w-36 rounded-lg shadow-lg border py-1" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                      {languages.map(l => (
                        <button key={l.code} onClick={() => { setLanguage(l.code); setLangOpen(false); }} className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 ${language === l.code ? 'text-blue-600 dark:text-blue-400 font-medium' : ''}`} style={{ color: language === l.code ? undefined : 'var(--text-primary)' }}>
                          {l.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Theme toggle */}
              <button onClick={toggleDarkMode} className="p-2 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-gray-800" style={{ color: 'var(--text-secondary)' }}>
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              {/* Notifications */}
              <div className="relative">
                <button onClick={() => { setNotifOpen(!notifOpen); setLangOpen(false); }} className="p-2 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-gray-800 relative" style={{ color: 'var(--text-secondary)' }}>
                  <Bell size={18} />
                  {unread > 0 && (
                    <span className="absolute -top-0.5 -end-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </button>
                {notifOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                    <div className="absolute top-full mt-1 end-0 z-50 w-80 rounded-lg shadow-lg border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                      <div className="flex items-center justify-between p-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
                        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('notifications')}</span>
                        {unread > 0 && (
                          <button onClick={markAllNotificationsRead} className="text-xs text-blue-500 hover:text-blue-600">{t('markAllRead')}</button>
                        )}
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <p className="p-4 text-sm text-center" style={{ color: 'var(--text-secondary)' }}>{t('noNotifications')}</p>
                        ) : (
                          notifications.slice(0, 20).map(n => (
                            <div key={n.id} className={`p-3 border-b text-sm ${!n.read ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`} style={{ borderColor: 'var(--border-color)' }}>
                              <p style={{ color: 'var(--text-primary)' }}>{n.message}</p>
                              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{new Date(n.date).toLocaleDateString(language === 'ar' ? 'ar-SA' : language === 'fr' ? 'fr-FR' : 'en-US')}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 overflow-x-hidden overflow-y-auto">
          <div key={location.pathname} className="page-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
