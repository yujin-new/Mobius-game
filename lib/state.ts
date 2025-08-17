import { create } from 'zustand'
import { atom } from 'jotai'

type Store = { tokens: number; add: (n?: number) => void; reset: () => void }
export const useGameStore = create<Store>((set) => ({
  tokens: 10,
  add: (n = 1) => set((s) => ({ tokens: s.tokens + n })),
  reset: () => set({ tokens: 10 }),
}))

export const whispersAtom = atom(1)
