import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../store/AppContext';
import { useTranslation } from '../i18n/useTranslation';
import { LogIn, UserPlus, Store, Eye, EyeOff } from 'lucide-react';

export default function Auth() {
  const { login, register, language } = useAppContext();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [error, setError] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (tab === 'register') {
      if (!name.trim() || !email.trim() || !pwd.trim()) { setError(t('fillAllFields')); return; }
      const ok = register(name.trim(), email.trim(), pwd);
      if (!ok) { setError(t('emailExists')); return; }
    } else {
      if (!email.trim() || !pwd.trim()) { setError(t('fillAllFields')); return; }
      const ok = login(email.trim(), pwd);
      if (!ok) { setError(t('invalidCredentials')); return; }
    }
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4">
            <Store className="text-blue-500" size={32} />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('appName')}</h1>
        </div>

        <div className="rounded-2xl shadow-xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          {/* Tabs */}
          <div className="flex border-b" style={{ borderColor: 'var(--border-color)' }}>
            <button onClick={() => { setTab('login'); setError(''); }} className={`flex-1 py-3 text-sm font-medium transition-all ${tab === 'login' ? 'text-blue-500 border-b-2 border-blue-500' : ''}`} style={{ color: tab === 'login' ? undefined : 'var(--text-secondary)' }}>
              <LogIn size={16} className="inline mr-1.5" />{t('login')}
            </button>
            <button onClick={() => { setTab('register'); setError(''); }} className={`flex-1 py-3 text-sm font-medium transition-all ${tab === 'register' ? 'text-blue-500 border-b-2 border-blue-500' : ''}`} style={{ color: tab === 'register' ? undefined : 'var(--text-secondary)' }}>
              <UserPlus size={16} className="inline mr-1.5" />{t('register')}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {tab === 'register' && (
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{t('name')}</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} autoComplete="name" className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
              </div>
            )}
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{t('email')}</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{t('password')}</label>
              <div className="relative">
                <input type={showPwd ? 'text' : 'password'} value={pwd} onChange={e => setPwd(e.target.value)} autoComplete={tab === 'register' ? 'new-password' : 'current-password'} className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all pr-10" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute inset-y-0 end-0 px-3 flex items-center" style={{ color: 'var(--text-secondary)' }}>
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && <p className="text-red-500 text-xs text-center">{error}</p>}

            <button type="submit" className="w-full py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-all">
              {tab === 'login' ? t('login') : t('register')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}