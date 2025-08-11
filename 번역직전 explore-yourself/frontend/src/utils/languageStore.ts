import { create } from "zustand";

interface LanguageState {
  language: "en" | "ko";
  setLanguage: (language: "en" | "ko") => void;
}

export const useLanguageStore = create<LanguageState>((set) => ({
  language: "en",
  setLanguage: (language) => set({ language }),
}));
