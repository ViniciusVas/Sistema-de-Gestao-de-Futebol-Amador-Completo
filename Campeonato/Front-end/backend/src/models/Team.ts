export interface ITeam {
  id: string;
  name: string;
  city?: string;
  players: string[]; // List of player IDs
  createdAt: Date;
}
