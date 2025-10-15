import { initReactI18next } from 'react-i18next';
import i18next from 'i18next';
import enTranslation from '@/locales/en/translation.json';
import jaTranslation from '@/locales/ja/translation.json';
import viTranslation from '@/locales/vi/translation.json';

export const supportedLanguages = ['vi', 'en', 'ja'] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];
export const defaultLanguage: SupportedLanguage = 'vi';
export const fallbackLanguage: SupportedLanguage = 'vi';

const resources = {
  en: {
    translation: enTranslation
  },
  ja: {
    translation: jaTranslation
  },
  vi: {
    translation: viTranslation
  }
} as const;

if (!i18next.isInitialized) {
  void i18next.use(initReactI18next).init({
    resources,
    supportedLngs: supportedLanguages,
    lng: defaultLanguage,
    fallbackLng: fallbackLanguage,
    defaultNS: 'translation',
    interpolation: {
      escapeValue: false
    },
    returnNull: false,
    react: {
      useSuspense: false
    }
  });
}

export { i18next };
export default i18next;
