import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import all locale files
import itCommon from './locales/it/common.json';
import itChat from './locales/it/chat.json';
import itErrors from './locales/it/errors.json';

import enCommon from './locales/en/common.json';
import enChat from './locales/en/chat.json';
import enErrors from './locales/en/errors.json';

import frCommon from './locales/fr/common.json';
import frChat from './locales/fr/chat.json';
import frErrors from './locales/fr/errors.json';

import esCommon from './locales/es/common.json';
import esChat from './locales/es/chat.json';
import esErrors from './locales/es/errors.json';

import deCommon from './locales/de/common.json';
import deChat from './locales/de/chat.json';
import deErrors from './locales/de/errors.json';

import ptBRCommon from './locales/pt-BR/common.json';
import ptBRChat from './locales/pt-BR/chat.json';
import ptBRErrors from './locales/pt-BR/errors.json';

export const supportedLanguages = ['it', 'en', 'fr', 'es', 'de', 'pt-BR'] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

export const languageNames: Record<SupportedLanguage, string> = {
  it: 'Italiano',
  en: 'English',
  fr: 'Français',
  es: 'Español',
  de: 'Deutsch',
  'pt-BR': 'Português (BR)',
};

export const languageFlags: Record<SupportedLanguage, string> = {
  it: '🇮🇹',
  en: '🇬🇧',
  fr: '🇫🇷',
  es: '🇪🇸',
  de: '🇩🇪',
  'pt-BR': '🇧🇷',
};

const resources = {
  it: {
    common: itCommon,
    chat: itChat,
    errors: itErrors,
  },
  en: {
    common: enCommon,
    chat: enChat,
    errors: enErrors,
  },
  fr: {
    common: frCommon,
    chat: frChat,
    errors: frErrors,
  },
  es: {
    common: esCommon,
    chat: esChat,
    errors: esErrors,
  },
  de: {
    common: deCommon,
    chat: deChat,
    errors: deErrors,
  },
  'pt-BR': {
    common: ptBRCommon,
    chat: ptBRChat,
    errors: ptBRErrors,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'it',
    supportedLngs: supportedLanguages,
    defaultNS: 'common',
    ns: ['common', 'chat', 'errors'],

    interpolation: {
      escapeValue: false,
    },

    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'leo-webchat-language',
    },

    react: {
      useSuspense: true,
    },
  });

export default i18n;
