import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import he from './locales/he.json';
import en from './locales/en.json';

const resources = {
  he: { translation: he },
  en: { translation: en },
};

const savedLanguage = localStorage.getItem('language') || 'he';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLanguage,
    fallbackLng: 'he',
    interpolation: {
      escapeValue: false,
    },
  });

export const changeLanguage = (lng: string) => {
  i18n.changeLanguage(lng);
  localStorage.setItem('language', lng);
  document.documentElement.dir = lng === 'he' ? 'rtl' : 'ltr';
  document.documentElement.lang = lng;
};

document.documentElement.dir = savedLanguage === 'he' ? 'rtl' : 'ltr';
document.documentElement.lang = savedLanguage;

export default i18n;
