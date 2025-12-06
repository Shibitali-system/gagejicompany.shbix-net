import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import sw from "./locales/sw.json";
import en from "./locales/en.json";

i18n.use(initReactI18next).init({
  resources: {
    sw: { translation: sw },
    en: { translation: en },
  },
  lng: "sw", // default language
  fallbackLng: "sw",
  interpolation: { escapeValue: false },
});

export default i18n;
