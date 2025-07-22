const isBrowser = typeof window !== "undefined"

import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import Backend from "i18next-http-backend"
import LanguageDetector from "i18next-browser-languagedetector"

/**
 * On the server we skip:
 *  • loading translation JSON over HTTP
 *  • browser language-detection
 * This prevents long-running network calls during `next build`.
 */
if (isBrowser) {
  i18n.use(Backend).use(LanguageDetector)
}

i18n.use(initReactI18next).init({
  // if you add new languages, put the fallback here too
  fallbackLng: "en",
  debug: false,
  interpolation: { escapeValue: false },
  // backend is only active in the browser, but we still need the path there
  backend: {
    loadPath: "/locales/{{lng}}/translation.json",
  },
})

export default i18n
