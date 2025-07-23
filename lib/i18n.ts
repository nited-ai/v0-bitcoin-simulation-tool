import i18n from "i18next"
import { initReactI18next } from "react-i18next"

// Import translations directly to avoid hydration issues
import enTranslation from "../public/locales/en/translation.json"
import deTranslation from "../public/locales/de/translation.json"
import esTranslation from "../public/locales/es/translation.json"

const resources = {
  en: {
    translation: enTranslation,
  },
  de: {
    translation: deTranslation,
  },
  "de-DE": {
    translation: deTranslation,
  },
  es: {
    translation: esTranslation,
  },
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en", // Set default language to prevent hydration issues
    fallbackLng: "en",
    debug: false,
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
    // Remove backend since we're loading translations directly
    // This prevents hydration mismatches
    react: {
      useSuspense: false, // Disable suspense to prevent hydration issues
    },
    // Disable language detection to prevent server/client mismatch
    detection: {
      order: [], // Disable automatic language detection
    },
  })

export default i18n
