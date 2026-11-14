import React, { useMemo, useState } from 'react';
import { GameItem, Player } from '../game/types';
import { Language, t } from '../game/i18n';
import { getRarityStyle } from '../game/rarity';
import { getItemSellPrice } from '../game/items';
import { getLocalizedItemDescription, getLocalizedItemName } from '../game/itemI18n';
import { CanvasButton } from './CanvasButton';
import {
  X,
  ShoppingBag,
  Gem,
  Eye,
  FlaskConical,
  Sword,
  Sparkles,
  Shield,
  Zap,
  Flame,
  Heart
} from 'lucide-react';

export type ShopCategory = 'potions' | 'gear' | 'utility';

export function getShopItemCategory(item: GameItem): ShopCategory {
  if (
    item.effectType === 'stone' ||
    item.effectType === 'teleport' ||
    item.effectType === 'cooldown_reset'
  ) {
    return 'utility';
  }
  if (item.type === 'consumable') {
    return 'potions';
  }
  return 'gear';
}

const CATEGORY_META: Record<
  ShopCategory,
  {
    icon: string;
    badgeClass: string;
    sectionHeaderClass: string;
    stripClass: string;
  }
> = {
  potions: {
    icon: '🧪',
    badgeClass: 'bg-emerald-950/90 border-emerald-400/50 text-emerald-300',
    sectionHeaderClass: 'text-emerald-300 border-emerald-500/35 bg-emerald-950/35',
    stripClass: 'bg-emerald-400'
  },
  gear: {
    icon: '⚔️',
    badgeClass: 'bg-cyan-950/90 border-cyan-400/50 text-cyan-300',
    sectionHeaderClass: 'text-cyan-300 border-cyan-500/35 bg-cyan-950/35',
    stripClass: 'bg-cyan-400'
  },
  utility: {
    icon: '🔮',
    badgeClass: 'bg-purple-950/90 border-purple-400/50 text-purple-300',
    sectionHeaderClass: 'text-purple-300 border-purple-500/35 bg-purple-950/35',
    stripClass: 'bg-purple-400'
  }
};

interface ShopModalProps {
  player: Player;
  shopItems: GameItem[];
  onClose: () => void;
  onBuyItem: (item: GameItem) => void;
  onSellItem: (item: GameItem) => void;
  language: Language;
}

export const ShopModal: React.FC<ShopModalProps> = ({
  player,
  shopItems,
  onClose,
  onBuyItem,
  onSellItem,
  language
}) => {
  const [shopMode, setShopMode] = useState<'buy' | 'sell'>('buy');
  const [selectedCategory, setSelectedCategory] = useState<'all' | ShopCategory>('all');
  const [previewItem, setPreviewItem] = useState<GameItem | null>(null);
  const [selectedSellIds, setSelectedSellIds] = useState<string[]>([]);

  const counts = useMemo(() => {
    const c = { all: shopItems.length, potions: 0, gear: 0, utility: 0 };
    for (const item of shopItems) {
      c[getShopItemCategory(item)] += 1;
    }
    return c;
  }, [shopItems]);

  const filteredSections = useMemo(() => {
    const order: ShopCategory[] = ['potions', 'gear', 'utility'];
    const targetCats = selectedCategory === 'all' ? order : [selectedCategory];
    return targetCats
      .map(cat => ({
        category: cat,
        items: shopItems.filter(it => getShopItemCategory(it) === cat)
      }))
      .filter(sec => sec.items.length > 0);
  }, [shopItems, selectedCategory]);

  const getCategoryLabel = (cat: ShopCategory) => {
    if (cat === 'potions') return t('shopCatPotions', language);
    if (cat === 'gear') return t('shopCatGear', language);
    return t('shopCatUtility', language);
  };

  const renderStatChips = (item: GameItem, expanded = false) => {
    const chipClass = expanded
      ? 'px-2.5 py-1.5 rounded-lg bg-black/55 border border-slate-700/70 flex items-center justify-between text-xs'
      : '';
    if (!expanded) {
      return (
        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-cyan-300 font-semibold mt-1">
          {item.attackBonus ? <span className="px-1.5 py-0.5 rounded bg-black/50 border border-cyan-500/30">⚔️ +{item.attackBonus} ATK</span> : null}
          {item.defenseBonus ? <span className="px-1.5 py-0.5 rounded bg-black/50 border border-amber-500/30 text-amber-300">🛡️ +{item.defenseBonus} DEF</span> : null}
          {item.critBonus ? <span className="px-1.5 py-0.5 rounded bg-black/50 border border-pink-500/30 text-pink-300">⚡ +{Math.round(item.critBonus * 100)}% CRIT</span> : null}
          {item.hpBonus ? <span className="px-1.5 py-0.5 rounded bg-black/50 border border-emerald-500/30 text-emerald-300">❤️ +{item.hpBonus} HP</span> : null}
          {item.healAmount ? <span className="px-1.5 py-0.5 rounded bg-black/50 border border-emerald-500/30 text-emerald-300">🧪 +{item.healAmount} HP</span> : null}
          {item.energyAmount ? <span className="px-1.5 py-0.5 rounded bg-black/50 border border-cyan-500/30 text-cyan-300">🔋 +{item.energyAmount} NRG</span> : null}
          {item.regenTurns ? (
            <span className="px-1.5 py-0.5 rounded bg-black/50 border border-emerald-500/30 text-emerald-300">
              🌿 +{item.regenHpPerTurn}HP / +{item.regenEnergyPerTurn}NRG × {item.regenTurns}T
            </span>
          ) : null}
          {item.burnTurns ? (
            <span className="px-1.5 py-0.5 rounded bg-black/50 border border-orange-500/35 text-orange-300">
              🔥 {item.burnRadius}t AoE · {item.burnTurns}T BURN
            </span>
          ) : null}
          {item.shieldGrant ? (
            <span className="px-1.5 py-0.5 rounded bg-black/50 border border-amber-500/30 text-amber-300">
              🛡️ +{item.shieldGrant} SHIELD
            </span>
          ) : null}
          {item.effectType === 'stone' ? (
            <span className="px-1.5 py-0.5 rounded bg-purple-950/70 border border-purple-400/50 text-purple-200">
              ✨ +60% FORGE RATE
            </span>
          ) : null}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
        {item.attackBonus ? (
          <div className={`${chipClass} text-cyan-300`}>
            <span className="flex items-center gap-1.5"><Sword className="w-3.5 h-3.5" /> {t('atkPower', language)}</span>
            <span className="font-bold">+{item.attackBonus}</span>
          </div>
        ) : null}
        {item.defenseBonus ? (
          <div className={`${chipClass} text-amber-300`}>
            <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> {t('defArmor', language)}</span>
            <span className="font-bold">+{item.defenseBonus}</span>
          </div>
        ) : null}
        {item.critBonus ? (
          <div className={`${chipClass} text-pink-300`}>
            <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> {t('critChance', language)}</span>
            <span className="font-bold">+{Math.round(item.critBonus * 100)}%</span>
          </div>
        ) : null}
        {item.hpBonus ? (
          <div className={`${chipClass} text-emerald-300`}>
            <span className="flex items-center gap-1.5"><Heart className="w-3.5 h-3.5" /> {t('maxVit', language)}</span>
            <span className="font-bold">+{item.hpBonus} HP</span>
          </div>
        ) : null}
        {item.healAmount ? (
          <div className={`${chipClass} text-emerald-300`}>
            <span>🧪 {t('healingCap', language)}</span>
            <span className="font-bold">+{item.healAmount} HP</span>
          </div>
        ) : null}
        {item.energyAmount ? (
          <div className={`${chipClass} text-cyan-300`}>
            <span>🔋 {t('energyCharge', language)}</span>
            <span className="font-bold">+{item.energyAmount} NRG</span>
          </div>
        ) : null}
        {item.regenTurns ? (
          <div className={`${chipClass} text-emerald-300 sm:col-span-2`}>
            <span>🌿 Over-Time Regen</span>
            <span className="font-bold">+{item.regenHpPerTurn} HP &amp; +{item.regenEnergyPerTurn} NRG / {item.regenTurns} Turns</span>
          </div>
        ) : null}
        {item.burnTurns ? (
          <div className={`${chipClass} text-orange-300 sm:col-span-2`}>
            <span className="flex items-center gap-1.5"><Flame className="w-3.5 h-3.5" /> Thermal Burn AoE</span>
            <span className="font-bold">{item.burnRadius} tiles · {item.burnDamage} DMG × {item.burnTurns}T</span>
          </div>
        ) : null}
        {item.shieldGrant ? (
          <div className={`${chipClass} text-amber-300`}>
            <span>🛡️ Instant Barrier</span>
            <span className="font-bold">+{item.shieldGrant} SHIELD</span>
          </div>
        ) : null}
        {item.effectType === 'stone' ? (
          <div className={`${chipClass} text-purple-200 sm:col-span-2`}>
            <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Forge Boost</span>
            <span className="font-bold">+60% Upgrade Success</span>
          </div>
        ) : null}
        {item.effectType === 'cooldown_reset' ? (
          <div className={`${chipClass} text-pink-200 sm:col-span-2`}>
            <span>⚡ Neural Surge</span>
            <span className="font-bold">Resets Skill Cooldowns + +15% CRIT</span>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div
      data-testid="shop-modal"
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/82 backdrop-blur-sm select-none font-mono"
    >
      <div className="w-full max-w-3xl bg-[#090616] border-t sm:border border-amber-500/60 rounded-t-2xl sm:rounded-xl shadow-[0_0_40px_rgba(255,230,0,0.28)] p-3 sm:p-5 flex flex-col max-h-[92dvh] relative">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-amber-500/30">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-2 rounded-lg bg-amber-950/60 border border-amber-500/50 text-amber-400 flex-shrink-0">
              <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-amber-300 tracking-wider uppercase truncate">
                {t('shopTitle', language)}
              </h2>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                {t('shopMerchantSubtitle', language)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="flex items-center gap-1 px-2 py-1 bg-amber-950/80 border border-amber-400/50 rounded-lg text-amber-300 font-bold text-[11px]">
              <span>🪙</span>
              <span>{player.stats.coins}</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 bg-cyan-950/80 border border-cyan-400/50 rounded-lg text-cyan-300 font-bold text-[11px]">
              <Gem className="w-3 h-3 text-cyan-400" />
              <span>{player.stats.soulShards}</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 bg-purple-950/80 border border-purple-400/50 rounded-lg text-purple-300 font-bold text-[11px]">
              <span>🔮</span>
              <span>{player.stats.probabilityStones || 0}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Merchant Shop"
              className="flex items-center justify-center gap-1.5 min-w-[44px] h-10 sm:h-11 px-3 sm:px-3.5 rounded-lg bg-rose-950/90 hover:bg-rose-600 text-rose-100 hover:text-white border-2 border-rose-400/85 shadow-[0_0_14px_rgba(244,63,94,0.45)] font-bold text-xs uppercase tracking-wider transition cursor-pointer flex-shrink-0"
            >
              <X className="w-5 h-5 stroke-[2.75]" />
              <span>{t('closeBtn', language)}</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 py-2 border-b border-slate-800/80">
          <button
            type="button"
            data-testid="shop-mode-buy"
            onClick={() => setShopMode('buy')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
              shopMode === 'buy'
                ? 'bg-amber-950 border-amber-400 text-amber-200'
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
          >
            Comprar
          </button>
          <button
            type="button"
            data-testid="shop-mode-sell"
            onClick={() => setShopMode('sell')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
              shopMode === 'sell'
                ? 'bg-pink-950 border-pink-400 text-pink-200'
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
          >
            Vender
          </button>
        </div>

        {/* Category Tabs (Mobile-First Touch Targets) */}
        {shopMode === 'buy' && (
        <div className="flex items-center gap-1.5 sm:gap-2 py-2.5 border-b border-slate-800/80 overflow-x-auto no-scrollbar">
          <button
            type="button"
            data-testid="shop-cat-all"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold border whitespace-nowrap transition cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-amber-950/85 border-amber-400 text-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.3)]'
                : 'bg-slate-900/70 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            ✨ {t('shopCatAll', language)} ({counts.all})
          </button>

          <button
            type="button"
            data-testid="shop-cat-potions"
            onClick={() => setSelectedCategory('potions')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold border whitespace-nowrap transition cursor-pointer ${
              selectedCategory === 'potions'
                ? 'bg-emerald-950/85 border-emerald-400 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                : 'bg-slate-900/70 border-slate-700 text-slate-400 hover:text-emerald-200'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>{t('shopCatPotions', language)} ({counts.potions})</span>
          </button>

          <button
            type="button"
            data-testid="shop-cat-gear"
            onClick={() => setSelectedCategory('gear')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold border whitespace-nowrap transition cursor-pointer ${
              selectedCategory === 'gear'
                ? 'bg-cyan-950/85 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(0,240,255,0.35)]'
                : 'bg-slate-900/70 border-slate-700 text-slate-400 hover:text-cyan-200'
            }`}
          >
            <Sword className="w-3.5 h-3.5" />
            <span>{t('shopCatGear', language)} ({counts.gear})</span>
          </button>

          <button
            type="button"
            data-testid="shop-cat-utility"
            onClick={() => setSelectedCategory('utility')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold border whitespace-nowrap transition cursor-pointer ${
              selectedCategory === 'utility'
                ? 'bg-purple-950/85 border-purple-400 text-purple-200 shadow-[0_0_12px_rgba(168,85,247,0.35)]'
                : 'bg-slate-900/70 border-slate-700 text-slate-400 hover:text-purple-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('shopCatUtility', language)} ({counts.utility})</span>
          </button>
        </div>
        )}

        {/* Categorized & Rarity-Enhanced Item Catalog */}
        <div className="py-3 space-y-4 overflow-y-auto flex-1 pr-1">
          {shopMode === 'sell' ? (
            <div className="space-y-2" data-testid="shop-sell-panel">
              <p className="text-[11px] text-slate-400 px-1">
                Selecciona ítems del inventario. El precio depende del nivel y la rareza.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {player.inventory.map(item => {
                  const price = getItemSellPrice(item);
                  const selected = selectedSellIds.includes(item.id);
                  const r = getRarityStyle(item.rarity);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      data-testid={`shop-sell-item-${item.id}`}
                      onClick={() =>
                        setSelectedSellIds(prev =>
                          prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]
                        )
                      }
                      className={`relative min-h-[84px] p-2 rounded-lg border text-left transition ${r.cardClass} ${
                        selected ? 'ring-2 ring-pink-400' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{item.icon}</span>
                        <div className="min-w-0">
                          <div className={`text-[10px] font-bold truncate ${r.titleClass}`}>
                            {getLocalizedItemName(item, language, { includeUpgrade: false })}
                          </div>
                          <div className="text-[9px] text-amber-300 mt-0.5">
                            Lv.{item.itemLevel || 1} · +{item.upgradeLevel || 0} · {price} 🪙
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
                {player.inventory.length === 0 && (
                  <div className="col-span-full text-center text-xs text-slate-500 py-8">Inventario vacío</div>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 pt-2">
                <span className="text-[11px] text-amber-200 font-bold">
                  Total:{' '}
                  {player.inventory
                    .filter(i => selectedSellIds.includes(i.id))
                    .reduce((sum, i) => sum + getItemSellPrice(i), 0)}{' '}
                  🪙
                </span>
                <CanvasButton
                  label={`Vender (${selectedSellIds.length})`}
                  theme="amber"
                  disabled={selectedSellIds.length === 0}
                  width={150}
                  height={38}
                  onClick={() => {
                    const toSell = player.inventory.filter(i => selectedSellIds.includes(i.id));
                    toSell.forEach(onSellItem);
                    setSelectedSellIds([]);
                  }}
                />
              </div>
            </div>
          ) : (
          filteredSections.map(section => {
            const catMeta = CATEGORY_META[section.category];
            return (
              <div key={section.category} data-testid={`shop-section-${section.category}`} className="space-y-2">
                <div
                  className={`px-2.5 py-1 rounded-md border text-[10px] sm:text-xs font-bold uppercase tracking-wider flex items-center justify-between ${catMeta.sectionHeaderClass}`}
                >
                  <span className="flex items-center gap-1.5">
                    <span>{catMeta.icon}</span>
                    <span>{getCategoryLabel(section.category)}</span>
                  </span>
                  <span className="opacity-75">{section.items.length}</span>
                </div>

                <div className="space-y-2">
                  {section.items.map((item, idx) => {
                    const currency = item.currency || 'shards';
                    const isCoinItem = currency === 'coins';
                    const isStone = item.effectType === 'stone';
                    const canAfford = isCoinItem
                      ? player.stats.coins >= item.value
                      : player.stats.soulShards >= item.value;
                    const inventoryFull = !isStone && player.inventory.length >= player.maxInventory;
                    const rarityStyle = getRarityStyle(item.rarity);

                    return (
                      <div
                        key={item.id || `${section.category}_${idx}`}
                        data-testid={`shop-item-${item.effectType || item.type}-${idx}`}
                        className={`relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2.5 sm:p-3 rounded-xl border transition-all ${rarityStyle.cardClass}`}
                      >
                        {/* Left Rarity Accent Strip */}
                        <div className={`absolute inset-y-0 left-0 w-1 ${rarityStyle.accentBarClass}`} />

                        <div className="flex items-start sm:items-center gap-3 pl-1.5 min-w-0">
                          <div
                            className={`w-11 h-11 rounded-xl border flex flex-col items-center justify-center text-xl flex-shrink-0 ${rarityStyle.iconFrameClass}`}
                          >
                            <span>{item.icon}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className={`font-bold text-xs sm:text-sm ${rarityStyle.titleClass}`}>
                                {getLocalizedItemName(item, language)}
                              </span>
                              <span
                                data-testid={`rarity-badge-${item.rarity}`}
                                className={`text-[9px] px-1.5 py-0.5 rounded border uppercase font-bold tracking-wider ${rarityStyle.badgeClass}`}
                              >
                                {rarityStyle.stars} {rarityStyle.label}
                              </span>
                              <span
                                className={`text-[9px] px-1.5 py-0.5 rounded border uppercase font-semibold ${catMeta.badgeClass}`}
                              >
                                {catMeta.icon} {getCategoryLabel(section.category)}
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-300/90 max-w-md mt-0.5 leading-snug">
                              {getLocalizedItemDescription(item, language)}
                            </p>

                            {renderStatChips(item, false)}
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pl-1.5 sm:pl-0 flex-shrink-0">
                          <button
                            type="button"
                            data-testid={`shop-preview-btn-${item.id || idx}`}
                            onClick={() => setPreviewItem(item)}
                            className="min-h-[38px] px-3 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 active:scale-95 border border-slate-500/50 hover:border-cyan-400 text-cyan-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                            aria-label={`${t('previewBtn', language)} ${getLocalizedItemName(item, language)}`}
                          >
                            <Eye className="w-3.5 h-3.5 text-cyan-400" />
                            <span>{t('previewBtn', language)}</span>
                          </button>

                          <CanvasButton
                            label={`${t('buyItem', language)} [${item.value} ${isCoinItem ? '🪙' : '💎'}]`}
                            theme={canAfford && !inventoryFull ? (isCoinItem ? 'amber' : 'cyan') : 'purple'}
                            disabled={!canAfford || inventoryFull}
                            width={148}
                            height={38}
                            onClick={() => onBuyItem(item)}
                            aria-label={`Buy ${getLocalizedItemName(item, language)} for ${item.value} ${currency}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
          )}
        </div>

        {/* Footer */}
        <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <span>
            {player.inventory.length >= player.maxInventory
              ? '⚠️ Bag full (Stones still fit!)'
              : `Bag: ${player.inventory.length} / ${player.maxInventory}`}
          </span>
          <button
            onClick={onClose}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors text-xs font-bold cursor-pointer"
          >
            {t('resumeOp', language) || 'Done'}
          </button>
        </div>

        {/* Mobile-First Item Preview Modal Overlay */}
        {previewItem && (() => {
          const pRarity = getRarityStyle(previewItem.rarity);
          const pCat = getShopItemCategory(previewItem);
          const pCatMeta = CATEGORY_META[pCat];
          const pCurrency = previewItem.currency || 'shards';
          const pIsCoin = pCurrency === 'coins';
          const pIsStone = previewItem.effectType === 'stone';
          const pCanAfford = pIsCoin
            ? player.stats.coins >= previewItem.value
            : player.stats.soulShards >= previewItem.value;
          const pBagFull = !pIsStone && player.inventory.length >= player.maxInventory;

          return (
            <div
              data-testid="shop-preview-modal"
              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md"
              onClick={() => setPreviewItem(null)}
            >
              <div
                className={`w-full max-w-md rounded-2xl border-2 p-4 sm:p-5 flex flex-col ${pRarity.cardClass}`}
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-700/60">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-300">
                    {t('previewModalTitle', language)}
                  </span>
                  <button
                    type="button"
                    data-testid="close-preview-btn"
                    onClick={() => setPreviewItem(null)}
                    className="flex items-center justify-center gap-1.5 min-w-[44px] h-10 px-3 rounded-lg bg-rose-950/90 hover:bg-rose-600 text-rose-100 hover:text-white border-2 border-rose-400/85 shadow-[0_0_12px_rgba(244,63,94,0.45)] font-bold text-xs uppercase tracking-wider transition cursor-pointer flex-shrink-0"
                    aria-label={t('closePreviewBtn', language)}
                  >
                    <X className="w-5 h-5 stroke-[2.75]" />
                    <span>{t('closeBtn', language)}</span>
                  </button>
                </div>

                {/* Emblem + Rarity Tier Banner */}
                <div className="flex items-center gap-3.5 mt-3.5">
                  <div
                    className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center text-3xl flex-shrink-0 ${pRarity.iconFrameClass}`}
                  >
                    {previewItem.icon}
                  </div>
                  <div className="min-w-0">
                    <h3 className={`text-base font-bold leading-tight ${pRarity.titleClass}`}>
                      {getLocalizedItemName(previewItem, language)}
                    </h3>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase ${pRarity.badgeClass}`}>
                        {pRarity.stars} {pRarity.label}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase ${pCatMeta.badgeClass}`}>
                        {pCatMeta.icon} {getCategoryLabel(pCat)}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-200 leading-relaxed mt-3 p-2.5 rounded-lg bg-black/45 border border-slate-700/60">
                  {getLocalizedItemDescription(previewItem, language)}
                </p>

                <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-300 px-1">
                  <span>{t('classCompatLabel', language)}:</span>
                  <span className="font-bold text-cyan-300 uppercase">
                    {previewItem.allowedClasses && previewItem.allowedClasses.length > 0
                      ? previewItem.allowedClasses.join(' / ')
                      : t('allClassesLabel', language)}
                  </span>
                </div>

                {/* Full Stats & Effects Breakdown */}
                {renderStatChips(previewItem, true)}

                <div className="flex items-center justify-between gap-2.5 mt-5 pt-3 border-t border-slate-700/60">
                  <button
                    type="button"
                    onClick={() => setPreviewItem(null)}
                    className="flex-1 min-h-[42px] px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-600 text-slate-200 text-xs font-bold cursor-pointer transition"
                  >
                    {t('closePreviewBtn', language)}
                  </button>
                  <button
                    type="button"
                    data-testid="preview-buy-btn"
                    disabled={!pCanAfford || pBagFull}
                    onClick={() => {
                      onBuyItem(previewItem);
                      setPreviewItem(null);
                    }}
                    className={`flex-1 min-h-[42px] px-3 py-2 rounded-xl border text-xs font-bold cursor-pointer transition active:scale-95 ${
                      pCanAfford && !pBagFull
                        ? pIsCoin
                          ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 border-amber-300 text-white shadow-[0_0_16px_rgba(245,158,11,0.45)]'
                          : 'bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 border-cyan-300 text-white shadow-[0_0_16px_rgba(0,240,255,0.45)]'
                        : 'bg-slate-900 border-slate-700 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {t('buyItem', language)} [{previewItem.value} {pIsCoin ? '🪙' : '💎'}]
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};
