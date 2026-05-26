import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../i18n/useTranslation';
import { useAppContext } from '../store/AppContext';
import { Save, Key, Palette, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import { focusNextInput, clearZeroOnFocus } from '../shared/formHelpers';

export default function Settings() {
  const { t, language } = useTranslation();
  const { settings, updateSettings, password, currentUser, logout } = useAppContext();
  const navigate = useNavigate();

  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  const [newColor, setNewColor] = useState('');
  const [colors, setColors] = useState([...settings.colors]);

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess(false);

    if (oldPw !== password) {
      setPwError(t('wrongPassword'));
      return;
    }
    if (newPw.length < 3) {
      setPwError(t('password') + ' 3 ' + (language === 'ar' ? 'أحرف على الأقل' : language === 'fr' ? 'caractères minimum' : 'characters minimum'));
      return;
    }
    if (newPw !== confirmPw) {
      setPwError(t('passwordMismatch'));
      return;
    }

    updateSettings({ password: newPw });
    setPwSuccess(true);
    setOldPw('');
    setNewPw('');
    setConfirmPw('');
    toast.success(t('passwordChanged'));
  };

  const handleAddColor = () => {
    if (!newColor.trim() || colors.includes(newColor.trim())) return;
    const updated = [...colors, newColor.trim()];
    setColors(updated);
    updateSettings({ colors: updated });
    setNewColor('');
  };

  const handleRemoveColor = (color: string) => {
    const updated = colors.filter(c => c !== color);
    setColors(updated);
    updateSettings({ colors: updated });
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('settings')}</h1>

      {/* Change Password */}
      <div className="rounded-2xl border p-6" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
            <Key size={20} className="text-blue-500" />
          </div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{t('changePassword')}</h2>
        </div>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{t('oldPassword')}</label>
            <input type="password" value={oldPw} onChange={e => { setOldPw(e.target.value); setPwError(''); }} onKeyDown={focusNextInput}
              className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{t('newPassword')}</label>
            <input type="password" value={newPw} onChange={e => { setNewPw(e.target.value); setPwError(''); }} onKeyDown={focusNextInput}
              className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>{t('confirmPassword')}</label>
            <input type="password" value={confirmPw} onChange={e => { setConfirmPw(e.target.value); setPwError(''); }} onKeyDown={focusNextInput}
              className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
          </div>
          {pwError && <p className="text-red-500 text-xs">{pwError}</p>}
          {pwSuccess && <p className="text-green-500 text-xs">{t('passwordChanged')}</p>}
          <button type="submit" className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-all">
            <Save size={16} />
            <span>{t('save')}</span>
          </button>
        </form>
      </div>

      {/* Color Management */}
      <div className="rounded-2xl border p-6" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
            <Palette size={20} className="text-purple-500" />
          </div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{t('color')}</h2>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {colors.map(c => (
            <span key={c} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm" style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
              {c}
              <button onClick={() => handleRemoveColor(c)} className="text-red-400 hover:text-red-500 text-xs font-bold ml-1">×</button>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input type="text" value={newColor} onChange={e => setNewColor(e.target.value)} onKeyDown={focusNextInput} onFocus={clearZeroOnFocus} placeholder={language === 'ar' ? 'إضافة لون جديد' : language === 'fr' ? 'Nouvelle couleur' : 'New color'}
            className="flex-1 px-3 py-2 rounded-xl border text-sm outline-none"
            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
          <button onClick={handleAddColor} className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium">
            {t('add')}
          </button>
        </div>
      </div>

      {/* Logout */}
      <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{currentUser?.name}</p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{currentUser?.email}</p>
          </div>
          <button onClick={() => { logout(); navigate('/auth'); }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-all">
            <LogOut size={16} /> {language === 'ar' ? 'تسجيل الخروج' : language === 'fr' ? 'Déconnexion' : 'Logout'}
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="rounded-2xl border p-6 text-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('appName')} v1.0.0</p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>© {new Date().getFullYear()}</p>
      </div>
    </div>
  );
}
