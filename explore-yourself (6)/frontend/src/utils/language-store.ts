import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import i18n from '@/i18n/config'

export type SupportedLanguage = 'en' | 'ko'

interface LanguageState {
  language: SupportedLanguage
  setLanguage: (language: SupportedLanguage) => void
}

export const supportedLanguages: Array<{ value: SupportedLanguage; labelKey: string }> = [
  { value: 'en', labelKey: 'language.english' },
  { value: 'ko', labelKey: 'language.korean' }
]

export const useLanguageStore = create(
  persist<LanguageState>(
    (set) => ({
      language: 'en',
      setLanguage: (language) => {
        void i18n.changeLanguage(language)
        set({ language })
      }
    }),
    {
      name: 'language-preference',
      onRehydrateStorage: () => (state) => {
        if (state?.language) {
          void i18n.changeLanguage(state.language)
        }
      }
    }
  )
)
