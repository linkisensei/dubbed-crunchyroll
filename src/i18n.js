import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

const resources = {
  en: {
    translation: {
    "site_title" : "Dubbed animes on Crunchyroll",
      "all_seasons": "All",
      "spring": "Spring",
      "summer" : "Summer",
      "fall" : "Fall",
      "winter" : "Winter",
    }
  },
  pt: {
    translation: {
        "site_title" : "Animes dublados na Crunchyroll",
      "all_seasons": "Todas",
      "spring": "Primavera",
      "summer" : "Verão",
      "fall" : "Outono",
      "winter" : "Inverno",
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
