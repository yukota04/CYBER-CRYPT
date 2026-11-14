import React, { useState } from 'react';
import { EquipSlot, GameItem, Player } from '../game/types';
import { Language, t } from '../game/i18n';
import { CanvasButton } from './CanvasButton';
import {
  canClassEquipItem,
  canUpgradeItem,
  getEffectiveItemStats,
  getProbabilityStoneCost,
  getUpgradeCost,
  getUpgradeDestroyChance
} from '../game/items';
import { getTotalStats } from '../game/combat';
import { getRarityStyle } from '../game/rarity';
import { X, Backpack, Shield, Hammer, Lock, AlertTriangle, Sparkles, Tv } from 'lucide-react';

interface InventoryModalProps {
  player: Player;
  floor: number;
  onClose: () => void;
  onEquipItem: (item: GameItem) => void;
  onUnequipItem: (slot: EquipSlot) => void;
  onUseItem: (item: GameItem) => void;
  onDropItem: (item: GameItem) => void;
  onUpgradeItem: (item: GameItem, useProbabilityStone?: boolean) => void;
  onBuyProbabilityStone: () => void;
  destroyedItemPendingRecovery: GameItem | null;
  onRecoverDestroyedItem: () => void;
  onDeclineRecoverDestroyedItem: () => void;
  upgradeFeedback?: { status: 'success' | 'destroyed'; message: string } | null;
  language: Language;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  player,
  floor,
  onClose,
  onEquipItem,
  onUnequipItem,
  onUseItem,
  onDropItem,
  onUpgradeItem,
  onBuyProbabilityStone,
  destroyedItemPendingRecovery,
  onRecoverDestroyedItem,
  onDeclineRecoverDestroyedItem,
  upgradeFeedback,
  language
}) => {
  const [activeTab, setActiveTab] = useState<'backpack' | 'equipment' | 'upgrade'>('backpack');
  const [selectedItem, setSelectedItem] = useState<GameItem | null>(
    player.inventory[0] || player.equipment.weapon || null
  );
  const [selectedSlotKey, setSelectedSlotKey] = useState<EquipSlot | null>(null);
  const [stoneInserted, setStoneInserted] = useState<boolean>(false);
  const [adPlaying, setAdPlaying] = useState<boolean>(false);
  const [adProgress, setAdProgress] = useState<number>(0);

  const stoneCount = player.stats.probabilityStones || 0;
  const stoneActive = stoneInserted && stoneCount > 0;
  const stoneCost = getProbabilityStoneCost(floor);

  const handleWatchRecoveryAd = () => {
    if (adPlaying) return;
    setAdPlaying(true);
    setAdProgress(0);
    const start = Date.now();
    const duration = 1200;
    const timer = setInterval(() => {
      const pct = Math.min(100, Math.round(((Date.now() - start) / duration) * 100));
      setAdProgress(pct);
      if (pct >= 100) {
        clearInterval(timer);
        setAdPlaying(false);
        setAdProgress(0);
        onRecoverDestroyedItem();
      }
    }, 50);
  };

  const totals = getTotalStats(player);

  const paperdollSlots: { slot: EquipSlot; labelKey: string; defaultIcon: string }[] = [
    { slot: 'helmet', labelKey: 'helmetSlot', defaultIcon: '🪖' },
    { slot: 'earrings', labelKey: 'earringsSlot', defaultIcon: '💎' },
    { slot: 'weapon', labelKey: 'weaponSlot', defaultIcon: '🗡️' },
    { slot: 'chest', labelKey: 'chestSlot', defaultIcon: '🦺' },
    { slot: 'offhand', labelKey: 'offhandSlot', defaultIcon: '🛡️' },
    { slot: 'gloves', labelKey: 'glovesSlot', defaultIcon: '🧤' },
    { slot: 'ring1', labelKey: 'ring1Slot', defaultIcon: '💍' },
    { slot: 'ring2', labelKey: 'ring2Slot', defaultIcon: '💍' },
    { slot: 'legs', labelKey: 'legsSlot', defaultIcon: '👖' },
    { slot: 'boots', labelKey: 'bootsSlot', defaultIcon: '🥾' }
  ];

  // Collect all upgradable items (equipped first, then bag)
  const equippedList = (Object.entries(player.equipment) as [EquipSlot, GameItem | null][])
    .filter(([, item]) => item !== null)
    .map(([slot, item]) => ({ item: item!, equippedIn: slot }));

  const bagUpgradable = player.inventory
    .filter(item => item.type !== 'consumable')
    .map(item => ({ item, equippedIn: null as EquipSlot | null }));

  const allUpgradable = [...equippedList, ...bagUpgradable];

  // Keep selectedItem synchronized after upgrade/equip
  const liveSelected =
    allUpgradable.find(x => x.item.id === selectedItem?.id)?.item ||
    player.inventory.find(i => i.id === selectedItem?.id) ||
    selectedItem;

  const equippedSlotForSelected = (Object.entries(player.equipment) as [EquipSlot, GameItem | null][]).find(
    ([, eq]) => eq?.id === liveSelected?.id
  )?.[0];

  const isCompatible = liveSelected
    ? liveSelected.type === 'consumable' || canClassEquipItem(player.characterClass, liveSelected)
    : true;

  const isBlockedByTwoHanded =
    liveSelected?.type === 'offhand' && !!player.equipment.weapon?.twoHanded;

  const selectedEff = liveSelected ? getEffectiveItemStats(liveSelected) : null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm select-none font-mono">
      <div className="w-full max-w-4xl bg-[#0a0718] border border-cyan-500/50 rounded-xl shadow-[0_0_35px_rgba(0,240,255,0.3)] p-3 sm:p-5 flex flex-col max-h-[92dvh] overflow-y-auto relative">
        {/* Header + Coin / Shard Balances */}
        <div className="flex flex-wrap items-center justify-between pb-3 border-b border-cyan-500/30 gap-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-cyan-400" />
            <h2 className="text-sm sm:text-base font-bold text-white tracking-wider">
              {t('arsenalTitle', language)}
            </h2>
            <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-purple-950/70 border border-purple-500/40 text-purple-300 font-bold">
              {player.characterClass}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div
              data-testid="inventory-coins-balance"
              className="px-2.5 py-1 rounded bg-amber-950/70 border border-amber-400/50 text-amber-300 font-bold text-xs flex items-center gap-1.5"
            >
              <span>🪙</span>
              <span>{player.stats.coins} {t('coins', language)}</span>
            </div>
            <div className="px-2.5 py-1 rounded bg-cyan-950/70 border border-cyan-400/40 text-cyan-300 font-bold text-xs flex items-center gap-1.5">
              <span>💎</span>
              <span>{player.stats.soulShards} {t('shards', language)}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center gap-1.5 min-w-[44px] h-10 sm:h-11 px-3 sm:px-3.5 rounded-lg bg-rose-950/90 hover:bg-rose-600 text-rose-100 hover:text-white border-2 border-rose-400/85 shadow-[0_0_14px_rgba(244,63,94,0.45)] font-bold text-xs uppercase tracking-wider transition cursor-pointer flex-shrink-0"
              aria-label="Close Inventory"
            >
              <X className="w-5 h-5 stroke-[2.75]" />
              <span>{t('closeBtn', language)}</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs: Backpack | Equipment / Outfit | Forge Upgrades */}
        <div className="flex flex-wrap gap-2 mt-3 pb-3 border-b border-slate-800/80">
          <button
            onClick={() => setActiveTab('backpack')}
            data-testid="tab-backpack"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
              activeTab === 'backpack'
                ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(0,240,255,0.25)]'
                : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            <Backpack className="w-3.5 h-3.5" />
            <span>{t('tabBackpack', language)} ({player.inventory.length}/{player.maxInventory})</span>
          </button>

          <button
            onClick={() => setActiveTab('equipment')}
            data-testid="tab-equipment"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
              activeTab === 'equipment'
                ? 'bg-purple-950/80 border-purple-400 text-purple-200 shadow-[0_0_10px_rgba(189,0,255,0.25)]'
                : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>{t('tabEquipment', language)} (10)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('upgrade');
              if ((!liveSelected || liveSelected.type === 'consumable') && allUpgradable[0]) {
                setSelectedItem(allUpgradable[0].item);
              }
            }}
            data-testid="tab-upgrade"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
              activeTab === 'upgrade'
                ? 'bg-amber-950/80 border-amber-400 text-amber-200 shadow-[0_0_10px_rgba(255,230,0,0.25)]'
                : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            <Hammer className="w-3.5 h-3.5" />
            <span>{t('tabUpgrade', language)}</span>
          </button>
        </div>

        {upgradeFeedback && (
          <div
            data-testid="upgrade-feedback-banner"
            role="status"
            className={`mt-3 px-3 py-2 rounded-lg border text-xs font-bold flex items-center gap-2 ${
              upgradeFeedback.status === 'destroyed'
                ? 'bg-red-950/80 border-red-500 text-red-200'
                : 'bg-emerald-950/80 border-emerald-400 text-emerald-200'
            }`}
          >
            <span>{upgradeFeedback.status === 'destroyed' ? '💥' : '✨'}</span>
            <span>{upgradeFeedback.message}</span>
          </div>
        )}

        {/* Main Body */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mt-4">
          {/* Left Panel (7 cols) */}
          <div className="md:col-span-7 flex flex-col gap-4">
            {activeTab === 'backpack' && (
              <div>
                <div className="flex items-center justify-between text-xs text-cyan-400 font-bold mb-2">
                  <span>{t('inventoryCache', language)}</span>
                  <span className="text-slate-400">
                    {player.inventory.length} / {player.maxInventory}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: player.maxInventory }).map((_, idx) => {
                    const item = player.inventory[idx];
                    const isSelected = liveSelected && item && liveSelected.id === item.id;
                    const compatible = item
                      ? item.type === 'consumable' || canClassEquipItem(player.characterClass, item)
                      : true;
                    const rStyle = item ? getRarityStyle(item.rarity) : null;

                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          if (item) {
                            setSelectedItem(item);
                            setSelectedSlotKey(null);
                          }
                        }}
                        className={`h-16 rounded-lg border flex flex-col items-center justify-center p-1 transition cursor-pointer relative overflow-hidden ${
                          item && rStyle
                            ? `${rStyle.cardClass} ${isSelected ? rStyle.selectedClass : ''} ${
                                !compatible ? 'opacity-65' : ''
                              }`
                            : 'border-slate-800/80 bg-slate-950/20 cursor-default'
                        }`}
                      >
                        {item && rStyle ? (
                          <>
                            <div className={`absolute top-0 inset-x-0 h-0.5 ${rStyle.accentBarClass}`} />
                            <span className="text-xl">{item.icon}</span>
                            <span className={`text-[9px] truncate w-full text-center leading-tight font-semibold ${rStyle.titleClass}`}>
                              {item.name}
                            </span>
                            {(item.upgradeLevel || 0) > 0 && (
                              <span className="absolute top-0.5 right-1 text-[9px] font-bold text-amber-300">
                                +{item.upgradeLevel}
                              </span>
                            )}
                            {rStyle.tierNumber >= 2 && (
                              <span className="text-[7px] leading-none tracking-tighter opacity-90" style={{ color: rStyle.hex }}>
                                {rStyle.stars}
                              </span>
                            )}
                            {!compatible && (
                              <Lock className="w-3 h-3 text-red-400 absolute top-0.5 left-0.5" />
                            )}
                          </>
                        ) : (
                          <span className="text-slate-800 text-xs">·</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'equipment' && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs text-purple-300 font-bold">
                  <span>{t('equippedRig', language)} · {player.characterClass.toUpperCase()}</span>
                  <div className="flex gap-2 text-[10px] text-slate-300">
                    <span className="text-cyan-400">ATK {totals.attack}</span>
                    <span className="text-amber-400">DEF {totals.defense}</span>
                    <span className="text-pink-400">CRIT {Math.round(totals.critRate * 100)}%</span>
                    <span className="text-emerald-400">HP {totals.maxHp}</span>
                  </div>
                </div>

                {/* Paperdoll Full 10-Slot Schematic */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-[#0d0822] border border-purple-500/30">
                  {paperdollSlots.map(({ slot, labelKey, defaultIcon }) => {
                    const eq = player.equipment[slot];
                    const isSelected = eq && liveSelected?.id === eq.id;
                    const blockedOffhand = slot === 'offhand' && !!player.equipment.weapon?.twoHanded;
                    const eqRarity = eq ? getRarityStyle(eq.rarity) : null;

                    return (
                      <button
                        key={slot}
                        data-testid={`equip-slot-${slot}`}
                        onClick={() => {
                          setSelectedSlotKey(slot);
                          if (eq) setSelectedItem(eq);
                        }}
                        className={`p-2 rounded-lg border flex flex-col items-center justify-center min-h-[78px] text-center transition cursor-pointer relative overflow-hidden ${
                          eq && eqRarity
                            ? `${eqRarity.cardClass} ${isSelected ? eqRarity.selectedClass : ''}`
                            : blockedOffhand
                            ? 'border-red-900/50 bg-red-950/15 text-red-400/60'
                            : 'border-slate-800 bg-slate-950/50 text-slate-500 hover:border-purple-500/40'
                        }`}
                      >
                        {eqRarity && <div className={`absolute top-0 inset-x-0 h-0.5 ${eqRarity.accentBarClass}`} />}
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                          {t(labelKey, language)}
                        </span>
                        <span className="text-lg my-0.5">{eq ? eq.icon : blockedOffhand ? '🚫' : defaultIcon}</span>
                        <span className={`text-[10px] truncate max-w-full leading-tight font-semibold ${eqRarity ? eqRarity.titleClass : ''}`}>
                          {eq ? eq.name : blockedOffhand ? '2H LOCK' : t('emptySlot', language)}
                        </span>
                        {eqRarity && eqRarity.tierNumber >= 2 && (
                          <span className="text-[8px] leading-none mt-0.5" style={{ color: eqRarity.hex }}>
                            {eqRarity.stars}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'upgrade' && (
              <div className="flex flex-col gap-2.5">
                {/* Probability Stone Slot (+60% Forge Success) */}
                <div className="p-2.5 rounded-xl bg-[#110a2a] border border-purple-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <button
                    type="button"
                    data-testid="forge-stone-slot"
                    onClick={() => {
                      if (stoneCount > 0) setStoneInserted(prev => !prev);
                    }}
                    className={`flex items-center gap-2.5 text-left px-2.5 py-1.5 rounded-lg border transition cursor-pointer flex-1 ${
                      stoneActive
                        ? 'bg-purple-900/60 border-purple-300 shadow-[0_0_14px_rgba(189,0,255,0.45)]'
                        : stoneCount > 0
                        ? 'bg-slate-900/70 border-purple-500/40 hover:border-purple-400'
                        : 'bg-slate-950/60 border-slate-800 opacity-75 cursor-not-allowed'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-lg bg-black/60 border border-purple-400/50 flex items-center justify-center text-xl flex-shrink-0">
                      🔮
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold text-purple-200 flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-purple-300" />
                        <span>{t('stoneSlotLabel', language)}</span>
                        <span className="px-1.5 py-0.2 rounded bg-purple-950 border border-purple-400/40 text-purple-200 text-[10px]">
                          x{stoneCount}
                        </span>
                      </div>
                      <div className={`text-[10px] mt-0.5 ${stoneActive ? 'text-emerald-300 font-bold' : 'text-slate-400'}`}>
                        {stoneActive ? `✓ ${t('stoneSlottedLabel', language)}` : t('stoneInsertHint', language)}
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    data-testid="buy-stone-btn"
                    disabled={player.stats.coins < stoneCost}
                    onClick={onBuyProbabilityStone}
                    className={`px-3 py-2 rounded-lg border text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
                      player.stats.coins >= stoneCost
                        ? 'bg-amber-950/80 border-amber-400 text-amber-200 hover:bg-amber-900'
                        : 'bg-slate-900/60 border-slate-700 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    🔮 {t('buyStoneBtn', language)} ({stoneCost} 🪙)
                  </button>
                </div>

                <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto pr-1">
                  {allUpgradable.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500 border border-slate-800 rounded-lg">
                      No upgradable weapons or armor found.
                    </div>
                  ) : (
                    allUpgradable.map(({ item, equippedIn }) => {
                      const cost = getUpgradeCost(item);
                      const destroyPct = Math.round(getUpgradeDestroyChance(item, stoneActive) * 100);
                      const successPct = 100 - destroyPct;
                      const canAfford = player.stats.coins >= cost;
                      const upgradable = canUpgradeItem(item);
                      const isSelected = liveSelected?.id === item.id;
                      const riskColor =
                        destroyPct === 0
                          ? 'text-emerald-400'
                          : destroyPct < 35
                          ? 'text-amber-300'
                          : 'text-red-400';
                      const rStyle = getRarityStyle(item.rarity);

                      return (
                        <div
                          key={item.id}
                          data-testid={`forge-item-${item.id}`}
                          onClick={() => setSelectedItem(item)}
                          className={`relative overflow-hidden flex items-center justify-between gap-2 p-2.5 pl-3.5 rounded-lg border cursor-pointer transition ${rStyle.cardClass} ${
                            isSelected ? rStyle.selectedClass : ''
                          }`}
                        >
                          <div className={`absolute inset-y-0 left-0 w-1 ${rStyle.accentBarClass}`} />
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-10 h-10 rounded-lg border flex items-center justify-center text-xl flex-shrink-0 ${rStyle.iconFrameClass}`}>
                              {item.icon}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold truncate flex items-center gap-1.5">
                                <span className={rStyle.titleClass}>{item.name}</span>
                                {equippedIn && (
                                  <span className="text-[9px] px-1 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30 uppercase">
                                    {equippedIn}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-300 flex flex-wrap items-center gap-1.5 mt-0.5">
                                <span className={`px-1.5 py-0.2 rounded border text-[9px] font-bold uppercase ${rStyle.badgeClass}`}>
                                  {rStyle.stars} +{item.upgradeLevel || 0}
                                </span>
                                {upgradable && (
                                  <span className={`font-bold ${riskColor}`}>
                                    ✓ {successPct}%{stoneActive ? ' 🔮' : ''} | ⚠️ {destroyPct}% {t('destroyRiskLabel', language)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex-shrink-0">
                            {upgradable ? (
                              <CanvasButton
                                label={`+1 (${cost} 🪙)`}
                                theme={canAfford ? 'amber' : 'cyan'}
                                disabled={!canAfford}
                                width={120}
                                height={34}
                                onClick={() => onUpgradeItem(item, stoneActive)}
                              />
                            ) : (
                              <span className="text-[10px] text-emerald-400 font-bold">
                                {t('maxLevelReached', language)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Panel: Item Inspection & Actions (5 cols) */}
          <div className="md:col-span-5 flex flex-col justify-between p-4 rounded-lg bg-[#0d0920] border border-cyan-500/20">
            {liveSelected ? (() => {
              const selRarity = getRarityStyle(liveSelected.rarity);
              return (
              <div className="flex flex-col h-full justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className={`text-sm font-bold ${selRarity.titleClass}`}>{liveSelected.name}</h3>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border ${selRarity.badgeClass}`}>
                          {selRarity.stars} {selRarity.label}
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase">
                          {liveSelected.type}
                        </span>
                        {liveSelected.twoHanded && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/70 border border-amber-500/40 text-amber-300">
                            2H
                          </span>
                        )}
                      </div>
                      {liveSelected.allowedClasses && liveSelected.allowedClasses.length > 0 && (
                        <div className={`text-[10px] mt-1 font-bold ${isCompatible ? 'text-emerald-400' : 'text-red-400'}`}>
                          {isCompatible ? '✓ ' : '🔒 '}
                          Class: {liveSelected.allowedClasses.map(c => c.toUpperCase()).join(' / ')}
                        </div>
                      )}
                    </div>
                    <div className={`w-12 h-12 rounded-xl border flex items-center justify-center text-2xl flex-shrink-0 ${selRarity.iconFrameClass}`}>
                      {liveSelected.icon}
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 mt-3 leading-relaxed border-t border-slate-800 pt-2">
                    {liveSelected.description}
                  </p>

                  {/* Effective Stat Modifiers (including upgrades) */}
                  <div className="mt-4 flex flex-col gap-1.5 text-xs">
                    {selectedEff && selectedEff.attackBonus > 0 && (
                      <div className="flex justify-between text-cyan-300">
                        <span>{t('atkPower', language)}:</span>
                        <span className="font-bold">+{selectedEff.attackBonus}</span>
                      </div>
                    )}
                    {selectedEff && selectedEff.defenseBonus > 0 && (
                      <div className="flex justify-between text-amber-300">
                        <span>{t('defArmor', language)}:</span>
                        <span className="font-bold">+{selectedEff.defenseBonus}</span>
                      </div>
                    )}
                    {selectedEff && selectedEff.critBonus > 0 && (
                      <div className="flex justify-between text-pink-400">
                        <span>{t('critChance', language)}:</span>
                        <span className="font-bold">+{(selectedEff.critBonus * 100).toFixed(0)}%</span>
                      </div>
                    )}
                    {selectedEff && selectedEff.hpBonus > 0 && (
                      <div className="flex justify-between text-emerald-400">
                        <span>{t('maxVit', language)}:</span>
                        <span className="font-bold">+{selectedEff.hpBonus} HP</span>
                      </div>
                    )}
                    {selectedEff && selectedEff.energyBonus > 0 && (
                      <div className="flex justify-between text-cyan-400">
                        <span>{t('maxNrg', language)}:</span>
                        <span className="font-bold">+{selectedEff.energyBonus} NRG</span>
                      </div>
                    )}
                    {liveSelected.attackRange && (
                      <div className="flex justify-between text-purple-300">
                        <span>{t('attackRangeLabel', language)}:</span>
                        <span className="font-bold">{liveSelected.attackRange} tiles</span>
                      </div>
                    )}
                    {liveSelected.healAmount && (
                      <div className="flex justify-between text-emerald-300">
                        <span>{t('healingCap', language)}:</span>
                        <span className="font-bold">+{liveSelected.healAmount} HP</span>
                      </div>
                    )}
                    {liveSelected.energyAmount && (
                      <div className="flex justify-between text-cyan-300">
                        <span>{t('energyCharge', language)}:</span>
                        <span className="font-bold">+{liveSelected.energyAmount} NRG</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 mt-5 pt-3 border-t border-slate-800 items-center">
                  {liveSelected.type === 'consumable' ? (
                    <CanvasButton
                      label={t('consumeBtn', language)}
                      icon="🧪"
                      theme="emerald"
                      width={250}
                      height={42}
                      onClick={() => onUseItem(liveSelected)}
                    />
                  ) : (
                    <>
                      {equippedSlotForSelected ? (
                        <CanvasButton
                          label={t('unequipBtn', language)}
                          icon="↩"
                          theme="cyan"
                          width={250}
                          height={42}
                          onClick={() => onUnequipItem(equippedSlotForSelected)}
                        />
                      ) : (
                        <CanvasButton
                          label={
                            !isCompatible
                              ? t('classIncompatible', language)
                              : isBlockedByTwoHanded
                              ? t('twoHandedBlocked', language)
                              : t('equipBtn', language)
                          }
                          icon={isCompatible && !isBlockedByTwoHanded ? '⚔' : '🔒'}
                          theme="cyan"
                          disabled={!isCompatible || isBlockedByTwoHanded}
                          width={250}
                          height={42}
                          onClick={() => onEquipItem(liveSelected)}
                        />
                      )}

                      {canUpgradeItem(liveSelected) && (() => {
                        const cost = getUpgradeCost(liveSelected);
                        const destroyPct = Math.round(getUpgradeDestroyChance(liveSelected, stoneActive) * 100);
                        const successPct = 100 - destroyPct;
                        return (
                          <div className="w-full flex flex-col items-center gap-1.5 mt-1">
                            <div
                              data-testid="inspector-upgrade-risk"
                              className="w-full max-w-[250px] px-2.5 py-1.5 rounded bg-slate-900/90 border border-amber-500/30 flex items-center justify-between text-[10px]"
                            >
                              <span className="text-emerald-400 font-bold">
                                {t('successRateLabel', language)}: {successPct}%{stoneActive ? ' 🔮' : ''}
                              </span>
                              <span
                                className={`font-bold flex items-center gap-1 ${
                                  destroyPct === 0
                                    ? 'text-emerald-400'
                                    : destroyPct < 35
                                    ? 'text-amber-300'
                                    : 'text-red-400'
                                }`}
                              >
                                {destroyPct > 0 && <AlertTriangle className="w-3 h-3" />}
                                {t('destroyRiskLabel', language)}: {destroyPct}%
                              </span>
                            </div>
                            <CanvasButton
                              label={`${t('upgradeGearBtn', language)} (${cost} 🪙)`}
                              icon="🔨"
                              theme="amber"
                              disabled={player.stats.coins < cost}
                              width={250}
                              height={38}
                              onClick={() => onUpgradeItem(liveSelected, stoneActive)}
                            />
                          </div>
                        );
                      })()}
                    </>
                  )}

                  {!equippedSlotForSelected && (
                    <CanvasButton
                      label={t('discardBtn', language)}
                      icon="🗑"
                      theme="pink"
                      width={250}
                      height={36}
                      onClick={() => {
                        onDropItem(liveSelected);
                        setSelectedItem(null);
                      }}
                    />
                  )}
                </div>
              </div>
              );
            })() : (
              <div className="flex items-center justify-center h-full text-slate-500 text-xs text-center">
                {selectedSlotKey ? `${selectedSlotKey.toUpperCase()}: ${t('emptySlot', language)}` : t('inspectItemPrompt', language)}
              </div>
            )}
          </div>
        </div>

        {/* Destroyed Item Ad Recovery Overlay */}
        {destroyedItemPendingRecovery && (() => {
          const dRarity = getRarityStyle(destroyedItemPendingRecovery.rarity);
          return (
          <div
            data-testid="destroyed-item-recovery-modal"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          >
            <div className={`w-full max-w-sm p-5 rounded-2xl border-2 flex flex-col items-center text-center ${dRarity.cardClass}`}>
              <div className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center text-4xl mb-3 ${dRarity.iconFrameClass}`}>
                {destroyedItemPendingRecovery.icon}
              </div>

              <div className={`text-sm font-bold ${dRarity.titleClass}`}>
                {destroyedItemPendingRecovery.name}
              </div>
              <span className={`text-[10px] mt-1 px-2 py-0.5 rounded uppercase font-bold border ${dRarity.badgeClass}`}>
                {dRarity.stars} {dRarity.label} · LVL +{destroyedItemPendingRecovery.upgradeLevel || 0}
              </span>

              <p className="text-sm font-bold text-amber-300 mt-4 mb-4">
                {t('recoverItemQuestion', language)}
              </p>

              {adPlaying ? (
                <div className="w-full flex flex-col items-center gap-2 py-2">
                  <div className="flex items-center gap-2 text-xs text-cyan-300 font-bold">
                    <Tv className="w-4 h-4 animate-pulse" />
                    <span>{t('adLoadingTitle', language)} ({adProgress}%)</span>
                  </div>
                  <p className="text-[11px] text-slate-400">{t('recoverItemLoading', language)}</p>
                  <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-cyan-500/40">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-75"
                      style={{ width: `${adProgress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3 w-full">
                  <button
                    type="button"
                    data-testid="recover-item-watch-ad-btn"
                    onClick={handleWatchRecoveryAd}
                    className="flex-1 py-3 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-[0_0_16px_rgba(16,185,129,0.4)] cursor-pointer transition active:scale-95"
                  >
                    <Tv className="w-4 h-4" />
                    <span>{t('recoverItemWatchAd', language)}</span>
                  </button>

                  <button
                    type="button"
                    data-testid="recover-item-decline-btn"
                    onClick={onDeclineRecoverDestroyedItem}
                    className="py-3 px-5 rounded-xl bg-slate-800 hover:bg-red-950 border border-slate-600 hover:border-red-500/60 text-slate-200 font-bold text-xs cursor-pointer transition active:scale-95"
                  >
                    {t('recoverItemNo', language)}
                  </button>
                </div>
              )}
            </div>
          </div>
          );
        })()}
      </div>
    </div>
  );
};
