import React, { useState } from 'react';
import { GameItem, Player } from '../game/types';
import { Language, t } from '../game/i18n';
import { CanvasButton } from './CanvasButton';
import { X, Shield, Sword, Sparkles, Trash2 } from 'lucide-react';

interface InventoryModalProps {
  player: Player;
  onClose: () => void;
  onEquipItem: (item: GameItem) => void;
  onUnequipItem: (slot: 'weapon' | 'armor' | 'accessory') => void;
  onUseItem: (item: GameItem) => void;
  onDropItem: (item: GameItem) => void;
  language: Language;
}

const RARITY_COLORS: Record<string, string> = {
  common: 'border-slate-500 text-slate-300 bg-slate-900/40',
  rare: 'border-cyan-400 text-cyan-300 bg-cyan-950/40 shadow-[0_0_8px_rgba(0,240,255,0.2)]',
  epic: 'border-purple-400 text-purple-300 bg-purple-950/40 shadow-[0_0_10px_rgba(189,0,255,0.25)]',
  legendary: 'border-amber-400 text-amber-300 bg-amber-950/40 shadow-[0_0_12px_rgba(255,230,0,0.3)]',
  'cyber-relic': 'border-pink-500 text-pink-300 bg-pink-950/50 shadow-[0_0_15px_rgba(255,0,128,0.4)] animate-pulse'
};

export const InventoryModal: React.FC<InventoryModalProps> = ({
  player,
  onClose,
  onEquipItem,
  onUnequipItem,
  onUseItem,
  onDropItem,
  language
}) => {
  const [selectedItem, setSelectedItem] = useState<GameItem | null>(
    player.inventory[0] || player.equipment.weapon || null
  );

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none font-mono">
      <div className="w-full max-w-2xl bg-[#0a0718] border border-cyan-500/50 rounded-lg shadow-[0_0_30px_rgba(0,240,255,0.3)] p-5 flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-cyan-500/30">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-cyan-400" />
            <h2 className="text-base font-bold text-white tracking-wider">{t('arsenalTitle', language)}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close Inventory"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content: Equipment & Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
          {/* Left Column: Equipped Slots & Inventory Grid */}
          <div className="flex flex-col gap-4">
            {/* Equipment Slots */}
            <div>
              <div className="text-xs text-cyan-400 font-bold mb-2">{t('equippedRig', language)}</div>
              <div className="grid grid-cols-3 gap-2">
                {/* Weapon Slot */}
                <div
                  onClick={() => player.equipment.weapon && setSelectedItem(player.equipment.weapon)}
                  className={`p-2 rounded border cursor-pointer flex flex-col items-center justify-center min-h-[70px] text-center ${
                    player.equipment.weapon
                      ? RARITY_COLORS[player.equipment.weapon.rarity]
                      : 'border-slate-800 bg-slate-950/40 text-slate-600'
                  }`}
                >
                  <span className="text-[10px] text-slate-400 font-bold">{t('weaponSlot', language)}</span>
                  <span className="text-lg my-0.5">{player.equipment.weapon?.icon || '🗡️'}</span>
                  <span className="text-[10px] truncate max-w-full">
                    {player.equipment.weapon ? player.equipment.weapon.name : t('emptySlot', language)}
                  </span>
                </div>

                {/* Armor Slot */}
                <div
                  onClick={() => player.equipment.armor && setSelectedItem(player.equipment.armor)}
                  className={`p-2 rounded border cursor-pointer flex flex-col items-center justify-center min-h-[70px] text-center ${
                    player.equipment.armor
                      ? RARITY_COLORS[player.equipment.armor.rarity]
                      : 'border-slate-800 bg-slate-950/40 text-slate-600'
                  }`}
                >
                  <span className="text-[10px] text-slate-400 font-bold">{t('armorSlot', language)}</span>
                  <span className="text-lg my-0.5">{player.equipment.armor?.icon || '🛡️'}</span>
                  <span className="text-[10px] truncate max-w-full">
                    {player.equipment.armor ? player.equipment.armor.name : t('emptySlot', language)}
                  </span>
                </div>

                {/* Accessory Slot */}
                <div
                  onClick={() => player.equipment.accessory && setSelectedItem(player.equipment.accessory)}
                  className={`p-2 rounded border cursor-pointer flex flex-col items-center justify-center min-h-[70px] text-center ${
                    player.equipment.accessory
                      ? RARITY_COLORS[player.equipment.accessory.rarity]
                      : 'border-slate-800 bg-slate-950/40 text-slate-600'
                  }`}
                >
                  <span className="text-[10px] text-slate-400 font-bold">{t('accessorySlot', language)}</span>
                  <span className="text-lg my-0.5">{player.equipment.accessory?.icon || '💍'}</span>
                  <span className="text-[10px] truncate max-w-full">
                    {player.equipment.accessory ? player.equipment.accessory.name : t('emptySlot', language)}
                  </span>
                </div>
              </div>
            </div>

            {/* Bag Grid */}
            <div>
              <div className="flex items-center justify-between text-xs text-cyan-400 font-bold mb-2">
                <span>{t('inventoryCache', language)}</span>
                <span className="text-slate-400">{player.inventory.length} / {player.maxInventory}</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: player.maxInventory }).map((_, idx) => {
                  const item = player.inventory[idx];
                  const isSelected = selectedItem && item && selectedItem.id === item.id;

                  return (
                    <button
                      key={idx}
                      onClick={() => item && setSelectedItem(item)}
                      className={`h-14 rounded border flex flex-col items-center justify-center p-1 transition cursor-pointer relative ${
                        item
                          ? `${RARITY_COLORS[item.rarity]} ${isSelected ? 'ring-2 ring-cyan-300' : ''}`
                          : 'border-slate-800/80 bg-slate-950/20 cursor-default'
                      }`}
                    >
                      {item ? (
                        <>
                          <span className="text-xl">{item.icon}</span>
                          <span className="text-[9px] truncate w-full text-center leading-tight">
                            {item.name}
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-800 text-xs">·</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Item Inspection Details */}
          <div className="flex flex-col justify-between p-4 rounded-lg bg-[#0d0920] border border-cyan-500/20">
            {selectedItem ? (
              <div className="flex flex-col h-full justify-between">
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">{selectedItem.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-300">
                          {selectedItem.rarity}
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase">
                          {selectedItem.type}
                        </span>
                      </div>
                    </div>
                    <span className="text-3xl">{selectedItem.icon}</span>
                  </div>

                  <p className="text-xs text-slate-300 mt-3 leading-relaxed border-t border-slate-800 pt-2">
                    {selectedItem.description}
                  </p>

                  {/* Stat Modifiers */}
                  <div className="mt-4 flex flex-col gap-1.5 text-xs">
                    {selectedItem.attackBonus && (
                      <div className="flex justify-between text-cyan-300">
                        <span>{t('atkPower', language)}:</span>
                        <span className="font-bold">+{selectedItem.attackBonus}</span>
                      </div>
                    )}
                    {selectedItem.defenseBonus && (
                      <div className="flex justify-between text-amber-300">
                        <span>{t('defArmor', language)}:</span>
                        <span className="font-bold">+{selectedItem.defenseBonus}</span>
                      </div>
                    )}
                    {selectedItem.critBonus && (
                      <div className="flex justify-between text-pink-400">
                        <span>{t('critChance', language)}:</span>
                        <span className="font-bold">+{(selectedItem.critBonus * 100).toFixed(0)}%</span>
                      </div>
                    )}
                    {selectedItem.hpBonus && (
                      <div className="flex justify-between text-emerald-400">
                        <span>{t('maxVit', language)}:</span>
                        <span className="font-bold">+{selectedItem.hpBonus} HP</span>
                      </div>
                    )}
                    {selectedItem.energyBonus && (
                      <div className="flex justify-between text-cyan-400">
                        <span>{t('maxNrg', language)}:</span>
                        <span className="font-bold">+{selectedItem.energyBonus} NRG</span>
                      </div>
                    )}
                    {selectedItem.healAmount && (
                      <div className="flex justify-between text-emerald-300">
                        <span>{t('healingCap', language)}:</span>
                        <span className="font-bold">+{selectedItem.healAmount} HP</span>
                      </div>
                    )}
                    {selectedItem.energyAmount && (
                      <div className="flex justify-between text-cyan-300">
                        <span>{t('energyCharge', language)}:</span>
                        <span className="font-bold">+{selectedItem.energyAmount} NRG</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions with CanvasButton */}
                <div className="flex flex-col gap-2 mt-6 pt-3 border-t border-slate-800 items-center">
                  {selectedItem.type === 'consumable' ? (
                    <CanvasButton
                      label={t('consumeBtn', language)}
                      icon="🧪"
                      theme="emerald"
                      width={260}
                      height={44}
                      onClick={() => onUseItem(selectedItem)}
                    />
                  ) : (
                    <>
                      {Object.values(player.equipment).some(e => e?.id === selectedItem.id) ? (
                        <CanvasButton
                          label={t('unequipBtn', language)}
                          icon="↩"
                          theme="cyan"
                          width={260}
                          height={44}
                          onClick={() => onUnequipItem(selectedItem.type as any)}
                        />
                      ) : (
                        <CanvasButton
                          label={t('equipBtn', language)}
                          icon="⚔"
                          theme="cyan"
                          width={260}
                          height={44}
                          onClick={() => onEquipItem(selectedItem)}
                        />
                      )}
                    </>
                  )}

                  <CanvasButton
                    label={t('discardBtn', language)}
                    icon="🗑"
                    theme="pink"
                    width={260}
                    height={38}
                    onClick={() => {
                      onDropItem(selectedItem);
                      setSelectedItem(null);
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                {t('inspectItemPrompt', language)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
