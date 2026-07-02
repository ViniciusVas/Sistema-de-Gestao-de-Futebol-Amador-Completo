import { create } from 'zustand';
import api from '../services/api';

interface ChampionshipState {
  standings: any[];
  games: any[];
  fetchStandings: (id: string) => Promise<void>;
  fetchGames: (id: string) => Promise<void>;
  generateTable: (id: string) => Promise<void>;
}

export const useChampionshipStore = create<ChampionshipState>((set) => ({
  standings: [],
  games: [],
  fetchStandings: async (id) => {
    const res = await api.get(`/championships/${id}/standings`);
    set({ standings: res.data });
  },
  fetchGames: async (id) => {
    const res = await api.get(`/championships/${id}/games`);
    set({ games: res.data });
  },
  generateTable: async (id) => {
    await api.post(`/championships/${id}/generate-table`);
    // Refresh
    const resGames = await api.get(`/championships/${id}/games`);
    set({ games: resGames.data });
  }
}));
