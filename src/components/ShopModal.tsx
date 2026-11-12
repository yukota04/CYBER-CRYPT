import React from 'react';
import { GameItem, Player } from '../game/types';
import { Language, t } from '../game/i18n';
import { CanvasButton } from './CanvasButton';
import { X, ShoppingBag, Sparkles, Gem, Shield, Zap, Sword } from 'lucide-react';

interface ShopModalProps {
  player: Player;
  shopItems: GameItem[];
  onClose: () => void;
  onBuyItem: (item: GameItem) => void;
  language: Language;
}

export const ShopModal: React.FC<ShopModalProps> = ({
  player,
  shopItems,
  onClose,
  onBuyItem,
  language
}) => {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none font-mono">
      <div className="w-full max-w-xl bg-[#090616] border border-amber-500/60 rounded-xl shadow-[0_0_35px_rgba(255,230,0,0.3)] p-5 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-amber-500/30">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-950/60 border border-amber-500/50 text-amber-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-amber-300 tracking-wider uppercase">
                {t('shopTitle', language)}
              </h2>
              <p className="text-[11px] text-slate-400">
                Wandering Black Market Broker · Neural Hardware & Relics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-950/80 border border-amber-500/40 rounded-lg text-amber-300 font-bold text-xs">
              <Gem className="w-3.5 h-3.5 text-amber-400" />
              <span>{player.stats.soulShards} {t('shards', language)}</span>
            </div>
            <button
              onClick={onClose}
              aria-label="Close Black Market"
              className="p-1.5 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-colors text-slate-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Item Catalog */}
        <div className="py-4 space-y-3 overflow-y-auto flex-1 pr-1">
          {shopItems.map((item, idx) => {
            const canAfford = player.stats.soulShards >= item.value;
            const inventoryFull = player.inventory.length >= player.maxInventory;

            return (
              <div
                key={item.id || idx}
                className="flex items-center justify-between p-3 rounded-lg bg-[#0e0924]/90 border border-slate-700/60 hover:border-amber-500/40 transition-all shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-black/60 border border-slate-600/50 flex items-center justify-center text-xl">
                    {item.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-100">{item.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold bg-purple-950/80 text-purple-300 border border-purple-500/40">
                        {item.rarity}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 max-w-sm mt-0.5">
                      {item.description}
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-cyan-300 font-semibold mt-1">
                      {item.attackBonus && <span>⚔️ +{item.attackBonus} ATK</span>}
                      {item.defenseBonus && <span>🛡️ +{item.defenseBonus} DEF</span>}
                      {item.critBonus && <span>⚡ +{Math.round(item.critBonus * 100)}% CRIT</span>}
                      {item.hpBonus && <span>❤️ +{item.hpBonus} HP</span>}
                      {item.healAmount && <span>🧪 +{item.healAmount} HEAL</span>}
                      {item.energyAmount && <span>🔋 +{item.energyAmount} ENERGY</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <CanvasButton
                    label={`${t('buyItem', language)} [${item.value} 💎]`}
                    theme={canAfford && !inventoryFull ? 'amber' : 'cyan'}
                    disabled={!canAfford || inventoryFull}
                    width={150}
                    height={40}
                    onClick={() => onBuyItem(item)}
                    aria-label={`Buy ${item.name} for ${item.value} shards`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span>
            {player.inventory.length >= player.maxInventory 
              ? '⚠️ Inventory full! Discard or consume items before purchasing.' 
              : `Storage slots available: ${player.maxInventory - player.inventory.length} / ${player.maxInventory}`}
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded transition-colors text-xs"
          >
            {t('resumeOp', language) || 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
};
