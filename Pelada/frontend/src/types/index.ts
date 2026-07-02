export interface Player {
  id: string;
  name: string;
  stars: number;
  active: boolean;
}

export interface Pelada {
  id: string;
  title: string;
  date: string;
  location: string;
  status: 'agendada' | 'em_andamento' | 'finalizada';
  playersPerTeam: number;
  inscritos: PeladaJogador[];
}

export interface PeladaJogador {
  id: string;
  playerId: string;
  player?: Player;
  presenceConfirmed: boolean;
  paymentConfirmed: boolean;
}

export interface Team {
  id: string;
  name: string;
  players: Player[];
}
