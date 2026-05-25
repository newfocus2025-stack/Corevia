import { useAppContext } from '../store/AppContext';
import { translations } from './translations';

export function useTranslation() {
  const { language } = useAppContext();

  const t = (key: string): string => {
    const lang = translations[language];
    return lang[key] || key;
  };

  return { t, language };
}
