import { create } from "zustand";
import { validateAccess } from "@/lib/huggingface";

const STORAGE_KEYS = {
  huggingfaceToken: "huggingfaceToken",
  shamelaDataset: "shamelaDataset",
} as const;

type SettingsState = {
  hydrated: boolean;
  huggingfaceToken: string;
  shamelaDataset: string;
  shamelaAccessVerified: boolean;
  validating: boolean;
  validationError: string | null;

  hydrate: () => void;
  updateHuggingfaceToken: (token: string) => void;
  updateShamelaDataset: (dataset: string) => void;
  setValidation: (result: { verified: boolean; error: string | null }) => void;
  setValidating: (validating: boolean) => void;
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  huggingfaceToken: "",

  hydrate: () => {
    if (get().hydrated) {
      return;
    }

    const encoded = localStorage.getItem(STORAGE_KEYS.huggingfaceToken);
    const token = encoded ? atob(encoded) : "";
    const dataset = localStorage.getItem(STORAGE_KEYS.shamelaDataset) || "";

    set({ huggingfaceToken: token, hydrated: true, shamelaDataset: dataset });

    if (token && dataset) {
      set({ validating: true });
      validateAccess(token, dataset)
        .then((result) => {
          set({
            shamelaAccessVerified: result.ok,
            validating: false,
            validationError: result.error ?? null,
          });
        })
        .catch(() => {
          set({ validating: false });
        });
    }
  },
  hydrated: false,

  setValidating: (validating) => set({ validating }),

  setValidation: ({ verified, error }) =>
    set({ shamelaAccessVerified: verified, validating: false, validationError: error }),
  shamelaAccessVerified: false,
  shamelaDataset: "",

  updateHuggingfaceToken: (token) => {
    localStorage.setItem(STORAGE_KEYS.huggingfaceToken, btoa(token));
    set({ huggingfaceToken: token, shamelaAccessVerified: false, validationError: null });
  },

  updateShamelaDataset: (dataset) => {
    localStorage.setItem(STORAGE_KEYS.shamelaDataset, dataset);
    set({ shamelaAccessVerified: false, shamelaDataset: dataset, validationError: null });
  },
  validating: false,
  validationError: null,
}));
