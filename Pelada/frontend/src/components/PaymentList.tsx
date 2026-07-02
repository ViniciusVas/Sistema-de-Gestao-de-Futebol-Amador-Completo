import React from 'react';
import { PeladaJogador } from '../types';
import { Check, X, DollarSign } from 'lucide-react';

interface PaymentListProps {
  players: PeladaJogador[];
  onTogglePayment: (pjId: string) => void;
  onTogglePresence: (pjId: string) => void;
}

export const PaymentList = ({ players, onTogglePayment, onTogglePresence }: PaymentListProps) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Jogador</th>
            <th className="px-4 py-4 text-xs font-bold text-gray-400 uppercase text-center">Presença</th>
            <th className="px-4 py-4 text-xs font-bold text-gray-400 uppercase text-center">Pagamento</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {players.map((pj) => (
            <tr key={pj.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4">
                <div className="font-medium text-gray-900">{pj.player?.name}</div>
              </td>
              <td className="px-4 py-4 text-center">
                <button
                  onClick={() => onTogglePresence(pj.id)}
                  className={`p-2 rounded-lg transition ${
                    pj.presenceConfirmed ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-300'
                  }`}
                >
                  <Check className="w-5 h-5" />
                </button>
              </td>
              <td className="px-4 py-4 text-center">
                <button
                  onClick={() => onTogglePayment(pj.id)}
                  className={`p-2 rounded-lg transition ${
                    pj.paymentConfirmed ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-300'
                  }`}
                >
                  <DollarSign className="w-5 h-5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
