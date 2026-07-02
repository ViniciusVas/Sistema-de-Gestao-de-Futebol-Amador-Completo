import React from 'react';
import { Player } from '../types';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TeamCardProps {
  id: string;
  name: string;
  players: Player[];
}

export const PlayerItem = ({ player }: { player: Player }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: player.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-zinc-800 p-3 mb-2 rounded border border-zinc-700 shadow-sm cursor-move flex justify-between items-center hover:border-blue-500 transition-colors"
    >
      <span className="font-medium text-zinc-100">{player.name}</span>
      <span className="text-yellow-500 font-bold">★ {player.stars.toFixed(1)}</span>
    </div>
  );
};

export const TeamCard = ({ id, name, players }: TeamCardProps) => {
  return (
    <div className="bg-zinc-900 p-4 rounded-xl border-2 border-zinc-800">
      <h3 className="text-lg font-bold mb-4 text-zinc-200 flex justify-between">
        {name}
        <span className="text-sm font-normal text-zinc-500">
          {(players.reduce((acc, p) => acc + p.stars, 0) / (players.length || 1)).toFixed(1)} avg
        </span>
      </h3>
      <div className="min-h-[200px]">
        {players.map((player) => (
          <PlayerItem key={player.id} player={player} />
        ))}
      </div>
    </div>
  );
};
