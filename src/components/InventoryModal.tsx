import React, { useEffect, useState } from 'react';
import { EquipSlot, GameItem, Player } from '../game/types';
import { Language, t } from '../game/i18n';
import { CanvasButton } from './CanvasButton';
import {
  canClassEquipItem,
  canMeetItemLevelRequirement,
  getItemRequiredLevel,
  canUpgradeItem,
  getEffectiveItemStats,
  getUpgradeCost,
  getUpgradeDestroyChance
} from '../game/items';
import { getTotalStats } from '../game/combat';
import { getRarityStyle } from '../game/rarity';
import { getLocalizedItemDescription, getLocalizedItemName } from '../game/itemI18n';
import {
  BASE_INVENTORY_SLOTS,
  MAX_INVENTORY_SLOTS,
  canUnlockInventorySlot,
  formatBonusCountdown,
  getActiveBonusSlots,
  getBonusTimeRemainingMs
} from '../game/inventorySlots';
import { showAdsBitvexRewarded } from '../game/adsbitvex';
import { X, Backpack, Shield, Hammer, Lock, AlertTriangle, Tv } from 'lucide-react';
import { GameIcon } from './GameIcon';

interface InventoryModalProps {
  player: Player;
  floor: number;
  onClose: () => void;
  onEquipItem: (item: GameItem) => void;
  onUnequipItem: (slot: EquipSlot) => void;
  onUseItem: (item: GameItem) => void;
  onDropItem: (item: GameItem) => void;
  onUpgradeItem: (item: GameItem, useProbabilityStone?: boolean) => void;
  destroyedItemPendingRecovery: GameItem | null;
  onRecoverDestroyedItem: () => void;
  onDeclineRecoverDestroyedItem: () => void;
  onUnlockInventorySlot?: () => void;
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
  destroyedItemPendingRecovery,
  onRecoverDestroyedItem,
  onDeclineRecoverDestroyedItem,
  onUnlockInventorySlot,
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
  const [adPhase, setAdPhase] = useState<'loading' | 'playing'>('loading');
  const [adProgress, setAdProgress] = useState<number>(0);
  const [adError, setAdError] = useState<string | null>(null);
  const [slotAdPlaying, setSlotAdPlaying] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const activeBonus = getActiveBonusSlots(player, nowTick);
  const bonusRemaining = getBonusTimeRemainingMs(player, nowTick);
  const canAddSlot = canUnlockInventorySlot(player, nowTick) && !!onUnlockInventorySlot;

  const stoneCount = player.stats.probabilityStones || 0;
  const stoneActive = stoneInserted && stoneCount > 0;

  useEffect(() => {
    if (!adPlaying) return;
    const interval = setInterval(() => {
      setAdProgress(prev => {
        if (adPhase === 'playing') return Math.min(96, prev + 1.2);
        return Math.min(88, prev + (prev < 40 ? 4 : prev < 70 ? 2 : 0.6));
      });
    }, 120);
    return () => clearInterval(interval);
  }, [adPlaying, adPhase]);

  const handleWatchRecoveryAd = async () => {
    if (adPlaying) return;
    setAdError(null);
    setAdPlaying(true);
    setAdPhase('loading');
    setAdProgress(6);

    const { showAdsBitvexRewarded } = await import('../game/adsbitvex');
    const result = await showAdsBitvexRewarded({
      onAdLaunching: () => {
        setAdPhase('playing');
        setAdProgress(prev => Math.max(prev, 55));
      }
    });

    if (result.ok) {
      setAdProgress(100);
      setAdPlaying(false);
      setAdProgress(0);
      onRecoverDestroyedItem();
      return;
    }

    setAdPlaying(false);
    setAdProgress(0);
    setAdError(
      language === 'es'
        ? 'Anuncio no disponible. Inténtalo de nuevo.'
        : 'Ad unavailable. Please try again.'
    );
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

  const meetsLevelReq = liveSelected
    ? liveSelected.type === 'consumable' || canMeetItemLevelRequirement(player.stats.level, liveSelected)
    : true;

  const requiredLevel = liveSelected && liveSelected.type !== 'consumable'
    ? getItemRequiredLevel(liveSelected)
    : 0;

  const isBlockedByTwoHanded =
    liveSelected?.type === 'offhand' && !!player.equipment.weapon?.twoHanded;

  const canEquipSelected =
    !!liveSelected &&
    liveSelected.type !== 'consumable' &&
    isCompatible &&
    meetsLevelReq &&
    !isBlockedByTwoHanded;

  const selectedEff = liveSelected ? getEffectiveItemStats(liveSelected) : null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm select-none cc-font">
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
              <GameIcon id="currency.coins" fallback="🪙" size={14} />
              <span>{player.stats.coins} {t('coins', language)}</span>
            </div>
            <div className="px-2.5 py-1 rounded bg-cyan-950/70 border border-cyan-400/40 text-cyan-300 font-bold text-xs flex items-center gap-1.5">
              <GameIcon id="currency.soul_shards" fallback="💎" size={14} />
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
                <div className="flex items-center justify-between text-xs text-cyan-400 font-bold mb-2 gap-2">
                  <span>{t('inventoryCache', language)}</span>
                  <span className="text-slate-400">
                    {player.inventory.length} / {player.maxInventory}
                    {activeBonus > 0 ? (
                      <span className="text-amber-300 ml-1">(+{activeBonus})</span>
                    ) : null}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mb-2 leading-snug">
                  {t('inventorySlotBonusHint', language)}
                </p>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <button
                    type="button"
                    data-testid="unlock-inventory-slot-btn"
                    disabled={!canAddSlot || slotAdPlaying}
                    onClick={async () => {
                      if (!onUnlockInventorySlot || !canAddSlot || slotAdPlaying) return;
                      setSlotAdPlaying(true);
                      setAdError(null);
                      setAdPlaying(true);
                      setAdPhase('loading');
                      setAdProgress(8);
                      try {
                        const result = await showAdsBitvexRewarded({
                          onAdLaunching: () => {
                            setAdPhase('playing');
                            setAdProgress(prev => Math.max(prev, 55));
                          }
                        });
                        if (result.ok) {
                          setAdProgress(100);
                          onUnlockInventorySlot();
                        } else {
                          setAdError(result.message || result.reason);
                        }
                      } catch {
                        setAdError('Ad failed');
                      } finally {
                        setSlotAdPlaying(false);
                        setAdPlaying(false);
                        setAdProgress(0);
                      }
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition ${
                      canAddSlot && !slotAdPlaying
                        ? 'bg-amber-950/80 border-amber-400/50 text-amber-200 hover:bg-amber-900/80 cursor-pointer'
                        : 'bg-slate-900/60 border-slate-700 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <Tv className="w-3.5 h-3.5" />
                    {slotAdPlaying
                      ? '...'
                      : player.maxInventory >= MAX_INVENTORY_SLOTS && activeBonus >= MAX_INVENTORY_SLOTS - BASE_INVENTORY_SLOTS
                      ? t('inventorySlotsMaxed', language)
                      : t('unlockInventorySlot', language)}
                  </button>
                  {activeBonus > 0 && (
                    <span
                      data-testid="inventory-bonus-timer"
                      className="text-[10px] font-bold text-pink-300 bg-pink-950/50 border border-pink-500/40 px-2 py-1 rounded"
                    >
                      {t('inventorySlotTimer', language)} {formatBonusCountdown(bonusRemaining)}
                    </span>
                  )}
                </div>
                {adError && activeTab === 'backpack' && (
                  <div className="text-[10px] text-rose-300 mb-2">{adError}</div>
                )}
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: player.maxInventory }).map((_, idx) => {
                    const isBonusSlot = idx >= BASE_INVENTORY_SLOTS;
                    const item = player.inventory[idx];
                    const isSelected = liveSelected && item && liveSelected.id === item.id;
                    const compatible = item
                      ? item.type === 'consumable' ||
                        (canClassEquipItem(player.characterClass, item) &&
                          canMeetItemLevelRequirement(player.stats.level, item))
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
                            : isBonusSlot
                            ? 'border-amber-500/35 bg-amber-950/20 cursor-default'
                            : 'border-slate-800/80 bg-slate-950/20 cursor-default'
                        }`}
                      >
                        {isBonusSlot && (
                          <span className="absolute bottom-0.5 left-0.5 text-[7px] font-bold text-amber-400/80">AD</span>
                        )}
                        {item && rStyle ? (
                          <>
                            <div className={`absolute top-0 inset-x-0 h-0.5 ${rStyle.accentBarClass}`} />
                            <GameIcon id={item.baseKey || item.id} fallback={item.icon} size={32} />
                            <span className={`text-[9px] truncate w-full text-center leading-tight font-semibold ${rStyle.titleClass}`}>
                              {getLocalizedItemName(item, language, { includeUpgrade: false, includeLevel: false })}
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
                        <span className="my-0.5"><GameIcon id={eq ? (eq.baseKey || eq.id) : blockedOffhand ? 'ui.inv.blocked_offhand' : `ui.slot.${slot === 'ring1' || slot === 'ring2' ? slot : slot}`} fallback={eq ? eq.icon : blockedOffhand ? '🚫' : defaultIcon} size={28} /></span>
                        <span className={`text-[10px] truncate max-w-full leading-tight font-semibold ${eqRarity ? eqRarity.titleClass : ''}`}>
                          {eq
                            ? getLocalizedItemName(eq, language)
                            : blockedOffhand
                            ? '2H LOCK'
                            : t('emptySlot', language)}
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
                <div className="text-[10px] text-slate-400 px-1">
                  Toca un ítem → usa piedra (si tienes) → forja. La piedra solo se compra en la tienda NPC.
                </div>
                {liveSelected && canUpgradeItem(liveSelected) && (
                  <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl bg-[#110a2a] border border-purple-500/40">
                    <button
                      type="button"
                      data-testid="forge-use-stone-btn"
                      disabled={stoneCount <= 0}
                      onClick={() => setStoneInserted(prev => !prev)}
                      className={`px-3 py-2 rounded-lg border text-[11px] font-bold transition ${
                        stoneCount <= 0
                          ? 'bg-slate-900/60 border-slate-700 text-slate-500 cursor-not-allowed opacity-60'
                          : stoneActive
                          ? 'bg-purple-900/70 border-purple-300 text-purple-100'
                          : 'bg-slate-900/70 border-purple-500/50 text-purple-200 hover:border-purple-300 cursor-pointer'
                      }`}
                    >
                      🔮 {stoneActive ? 'Piedra equipada' : 'Usar piedra'} (x{stoneCount})
                    </button>
                    <CanvasButton
                      label={`Forjar +1 (${getUpgradeCost(liveSelected)} 🪙)`}
                      theme={player.stats.coins >= getUpgradeCost(liveSelected) ? 'amber' : 'cyan'}
                      disabled={player.stats.coins < getUpgradeCost(liveSelected)}
                      width={160}
                      height={36}
                      onClick={() => onUpgradeItem(liveSelected, stoneActive)}
                    />
                    <span className="text-[10px] text-slate-400">
                      Éxito {100 - Math.round(getUpgradeDestroyChance(liveSelected, stoneActive) * 100)}%
                      {stoneActive ? ' 🔮' : ''}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[340px] overflow-y-auto pr-1">
                  {allUpgradable.length === 0 ? (
                    <div className="col-span-full p-6 text-center text-xs text-slate-500 border border-slate-800 rounded-lg">
                      No upgradable weapons or armor found.
                    </div>
                  ) : (
                    allUpgradable.map(({ item, equippedIn }) => {
                      const isSelected = liveSelected?.id === item.id;
                      const rStyle = getRarityStyle(item.rarity);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          data-testid={`forge-item-${item.id}`}
                          onClick={() => {
                            setSelectedItem(item);
                            setStoneInserted(false);
                          }}
                          className={`relative min-h-[88px] p-2 rounded-lg border flex flex-col items-center justify-center gap-1 transition cursor-pointer ${rStyle.cardClass} ${
                            isSelected ? rStyle.selectedClass + ' ring-2 ring-cyan-400' : ''
                          }`}
                        >
                          <GameIcon id={item.baseKey || item.id} fallback={item.icon} size={36} />
                          <span className={`text-[9px] font-bold truncate w-full text-center ${rStyle.titleClass}`}>
                            {getLocalizedItemName(item, language, { includeUpgrade: false, includeLevel: false })}
                          </span>
                          <span className="text-[9px] text-cyan-300">
                            Lv.{item.itemLevel || 1} · +{item.upgradeLevel || 0}
                          </span>
                          {equippedIn && (
                            <span className="absolute top-1 right-1 text-[8px] px-1 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                              EQ
                            </span>
                          )}
                        </button>
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
                      <h3 className={`text-sm font-bold ${selRarity.titleClass}`}>
                        {getLocalizedItemName(liveSelected, language)}
                      </h3>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border ${selRarity.badgeClass}`}>
                          {selRarity.stars} {selRarity.label}
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase">
                          {liveSelected.type}
                          {liveSelected.itemLevel ? ` · Lv.${liveSelected.itemLevel}` : ''}
                          {typeof liveSelected.upgradeLevel === 'number' ? ` · +${liveSelected.upgradeLevel}` : ''}
                        </span>
                        {liveSelected.twoHanded && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/70 border border-amber-500/40 text-amber-300">
                            2H
                          </span>
                        )}
                      </div>
                      {requiredLevel > 0 && (
                        <div
                          className={`text-[10px] mt-1 font-bold ${meetsLevelReq ? 'text-cyan-300' : 'text-amber-400'}`}
                          data-testid="item-level-requirement"
                        >
                          {meetsLevelReq ? '✓ ' : '🔒 '}
                          {t('levelRequirement', language)} {requiredLevel}
                          {!meetsLevelReq ? ` (${t('yourLevel', language)} ${player.stats.level})` : ''}
                        </div>
                      )}
                      {liveSelected.allowedClasses && liveSelected.allowedClasses.length > 0 && (
                        <div className={`text-[10px] mt-1 font-bold ${isCompatible ? 'text-emerald-400' : 'text-red-400'}`}>
                          {isCompatible ? '✓ ' : '🔒 '}
                          Class: {liveSelected.allowedClasses.map(c => c.toUpperCase()).join(' / ')}
                        </div>
                      )}
                    </div>
                    <div className={`w-12 h-12 rounded-xl border flex items-center justify-center text-2xl flex-shrink-0 ${selRarity.iconFrameClass}`}>
                      <GameIcon id={liveSelected.baseKey || liveSelected.id} fallback={liveSelected.icon} size={40} />
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 mt-3 leading-relaxed border-t border-slate-800 pt-2">
                    {getLocalizedItemDescription(liveSelected, language)}
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
                              : !meetsLevelReq
                              ? `${t('levelRequirement', language)} ${requiredLevel}`
                              : isBlockedByTwoHanded
                              ? t('twoHandedBlocked', language)
                              : t('equipBtn', language)
                          }
                          icon={canEquipSelected ? '⚔' : '🔒'}
                          theme="cyan"
                          disabled={!canEquipSelected}
                          width={250}
                          height={42}
                          onClick={() => onEquipItem(liveSelected)}
                        />
                      )}

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

        {/* Full-screen ad loading gate (inventory slot unlock) — must show BEFORE the ad appears */}
        {slotAdPlaying && (
          <div
            data-testid="inventory-slot-ad-loading"
            className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-3 bg-black/90 backdrop-blur-md"
          >
            <div className="flex items-center gap-2 text-sm font-bold text-cyan-300">
              <Tv className="w-5 h-5 animate-pulse" />
              <span>
                {t('adLoadingTitle', language)} ({Math.round(adProgress)}%)
              </span>
            </div>
            <p className="text-xs text-slate-400 px-6 text-center max-w-xs">
              {adPhase === 'loading'
                ? language === 'es'
                  ? 'Esperando a que aparezca el anuncio…'
                  : 'Waiting for the ad to appear…'
                : t('adLoadingDesc', language)}
            </p>
            <div className="w-[min(70vw,260px)] h-2.5 bg-slate-900 rounded-full overflow-hidden border border-cyan-500/40">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-100"
                style={{ width: `${Math.max(adProgress, 8)}%` }}
              />
            </div>
          </div>
        )}

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
                <GameIcon id={destroyedItemPendingRecovery.baseKey || destroyedItemPendingRecovery.id} fallback={destroyedItemPendingRecovery.icon} size={48} />
              </div>

              <div className={`text-sm font-bold ${dRarity.titleClass}`}>
                {getLocalizedItemName(destroyedItemPendingRecovery, language)}
              </div>
              <span className={`text-[10px] mt-1 px-2 py-0.5 rounded uppercase font-bold border ${dRarity.badgeClass}`}>
                {dRarity.stars} {dRarity.label} · LVL +{destroyedItemPendingRecovery.upgradeLevel || 0}
              </span>

              <p className="text-sm font-bold text-amber-300 mt-4 mb-4">
                {t('recoverItemQuestion', language)}
              </p>

              {adPlaying ? (
                <div className="w-full flex flex-col items-center gap-2 py-2" data-testid="ad-loading-overlay">
                  <div className="flex items-center gap-2 text-xs text-cyan-300 font-bold">
                    <Tv className="w-4 h-4 animate-pulse" />
                    <span>
                      {t('adLoadingTitle', language)} ({Math.round(adProgress)}%)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {adPhase === 'loading'
                      ? language === 'es'
                        ? 'Esperando a que aparezca el anuncio…'
                        : 'Waiting for the ad to appear…'
                      : t('recoverItemLoading', language)}
                  </p>
                  <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-cyan-500/40">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-100"
                      style={{ width: `${adProgress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 w-full">
                  {adError && (
                    <div className="w-full px-3 py-2 rounded-lg bg-rose-950/60 border border-rose-400/50 text-[11px] text-rose-200">
                      {adError}
                    </div>
                  )}
                  <div className="flex items-center justify-center gap-3 w-full">
                    <button
                      type="button"
                      data-testid="recover-item-watch-ad-btn"
                      onClick={() => {
                        void handleWatchRecoveryAd();
                      }}
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
