import { create } from "zustand";
import { validateAccess } from "@/lib/huggingface";

const STORAGE_KEYS = {
  huggingfaceToken: "huggingfaceToken",
  shamelaDataset: "shamelaDataset",
} as const;

type SettingsState = {
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

export const useSettingsStore = create<SettingsState>((set) => ({
  huggingfaceToken: "",
  shamelaDataset: "",
  shamelaAccessVerified: false,
  validating: false,
  validationError: null,

  hydrate: () => {
    const encoded = localStorage.getItem(STORAGE_KEYS.huggingfaceToken);
    const token = encoded ? atob(encoded) : "";
    const dataset = localStorage.getItem(STORAGE_KEYS.shamelaDataset) || "";

    set({ huggingfaceToken: token, shamelaDataset: dataset });

    if (token && dataset) {
      set({ validating: true });
      validateAccess(token, dataset)
        .then((result) => {
          set({ shamelaAccessVerified: result.ok, validationError: result.error ?? null, validating: false });
        })
        .catch(() => {
          set({ validating: false });
        });
    }
  },

  updateHuggingfaceToken: (token) => {
    localStorage.setItem(STORAGE_KEYS.huggingfaceToken, btoa(token));
    set({ huggingfaceToken: token, shamelaAccessVerified: false, validationError: null });
  },

  updateShamelaDataset: (dataset) => {
    localStorage.setItem(STORAGE_KEYS.shamelaDataset, dataset);
    set({ shamelaDataset: dataset, shamelaAccessVerified: false, validationError: null });
  },

  setValidation: ({ verified, error }) =>
    set({ shamelaAccessVerified: verified, validationError: error, validating: false }),

  setValidating: (validating) => set({ validating }),
}));
