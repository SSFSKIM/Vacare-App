import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import enCommon from './locales/en/common.json'
import koCommon from './locales/ko/common.json'

export const defaultNamespace = 'common'

export const resources = {
  en: {
    [defaultNamespace]: enCommon
  },
  ko: {
    [defaultNamespace]: koCommon
  }
} as const

void i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    ns: [defaultNamespace],
    defaultNS: defaultNamespace,
    interpolation: {
      escapeValue: false
    },
    returnEmptyString: false
  })

export default i18n
