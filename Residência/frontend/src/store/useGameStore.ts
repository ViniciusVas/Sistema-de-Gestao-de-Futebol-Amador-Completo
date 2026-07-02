import { create } from 'zustand';

interface GameState {
  peladaId: string | null;
  placar: { casa: number; visitante: number };
  cronometro: { segundos: number; ativo: boolean };
  setPeladaId: (id: string) => void;
  updatePlacar: (placar: { casa: number; visitante: number }) => void;
  updateCronometro: (segundos: number, ativo: boolean) => void;
  resetGame: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  peladaId: null,
  placar: { casa: 0, visitante: 0 },
  cronometro: { segundos: 0, ativo: false },
  setPeladaId: (id) => set({ peladaId: id }),
  updatePlacar: (placar) => set({ placar }),
  updateCronometro: (segundos, ativo) => set({ cronometro: { segundos, ativo } }),
  resetGame: () => set({ placar: { casa: 0, visitante: 0 }, cronometro: { segundos: 0, ativo: false } }),
}));
