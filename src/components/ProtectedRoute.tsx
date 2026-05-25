import { useState } from 'react';
import { useAppContext } from '../store/AppContext';
import { useTranslation } from '../i18n/useTranslation';
import { Lock } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: Props) {
  const { password } = useAppContext();
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);
  const [authed, setAuthed] = useState(false);

  if (authed) return <>{children}</>;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input === password) {
      setAuthed(true);
      setError(false);
    } else {
      setError(true);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-sm p-6 rounded-2xl shadow-lg border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-500/10 flex items-center justify-center mb-3">
            <Lock className="text-blue-500" size={28} />
          </div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{t('passwordRequired')}</h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={input}
              onChange={e => { setInput(e.target.value); setError(false); }}
              placeholder={t('enterPassword')}
              autoFocus
              className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all ${
                error ? 'border-red-500 ring-2 ring-red-500/20' : ''
              }`}
              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: error ? undefined : 'var(--border-color)', color: 'var(--text-primary)' }}
            />
            {error && <p className="text-red-500 text-xs mt-1.5">{t('wrongPassword')}</p>}
          </div>
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-all"
          >
            {t('enterPassword')}
          </button>
        </form>
        <p className="text-xs text-center mt-4" style={{ color: 'var(--text-secondary)' }}>
          {t('passwordRequired')}
        </p>
      </div>
    </div>
  );
}
