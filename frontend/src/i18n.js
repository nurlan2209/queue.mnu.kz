import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ru from './locales/ru.json';
import kk from './locales/kk.json';
import en from './locales/en.json';

const resources = {
  ru: { translation: ru },
  kk: { translation: kk },
  en: { translation: en }, 
};

// Получаем язык из localStorage, если он там есть, иначе используем 'ru' по умолчанию
const savedLanguage = localStorage.getItem('language') || 'ru';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLanguage, // Используем сохраненный язык
    fallbackLng: 'ru', // Язык, на который откатываемся, если перевод отсутствует
    interpolation: {
      escapeValue: false, // React уже экранирует значения
    },
  });

// Слушаем событие смены языка и сохраняем новый язык в localStorage
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('language', lng);
});

export default i18n;