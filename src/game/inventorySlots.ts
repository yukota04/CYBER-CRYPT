import { Player } from './types';

/** Permanent free backpack capacity. */
export const BASE_INVENTORY_SLOTS = 16;
/** Absolute ceiling including ad-unlocked bonus slots. */
export const MAX_INVENTORY_SLOTS = 24;
/** Bonus slots unlocked via rewarded ads last this long (ms). */
export const INVENTORY_BONUS_DURATION_MS = 24 * 60 * 60 * 1000;

export function getActiveBonusSlots(player: Player, now = Date.now()): number {
  const bonus = Math.max(0, player.inventoryBonusSlots || 0);
  if (bonus <= 0) return 0;
  const expires = player.inventoryBonusExpiresAt || 0;
  if (!expires || now >= expires) return 0;
  return Math.min(MAX_INVENTORY_SLOTS - BASE_INVENTORY_SLOTS, bonus);
}

export function getBonusTimeRemainingMs(player: Player, now = Date.now()): number {
  if (getActiveBonusSlots(player, now) <= 0) return 0;
  return Math.max(0, (player.inventoryBonusExpiresAt || 0) - now);
}

/** Recompute maxInventory from base + active ad bonuses (never below current item count). */
export function refreshInventoryCapacity(player: Player, now = Date.now()): Player {
  const activeBonus = getActiveBonusSlots(player, now);
  if ((player.inventoryBonusSlots || 0) > 0 && activeBonus === 0) {
    player.inventoryBonusSlots = 0;
    player.inventoryBonusExpiresAt = 0;
  } else if (activeBonus !== (player.inventoryBonusSlots || 0)) {
    player.inventoryBonusSlots = activeBonus;
  }

  const capacity = Math.min(MAX_INVENTORY_SLOTS, BASE_INVENTORY_SLOTS + activeBonus);
  // Keep room for items already held so bonus expiry never deletes loot
  player.maxInventory = Math.min(
    MAX_INVENTORY_SLOTS,
    Math.max(capacity, player.inventory.length)
  );
  return player;
}

export function canUnlockInventorySlot(player: Player, now = Date.now()): boolean {
  const active = getActiveBonusSlots(player, now);
  return BASE_INVENTORY_SLOTS + active < MAX_INVENTORY_SLOTS;
}

/**
 * Unlock +1 backpack slot via rewarded ad.
 * Resets the shared 24h timer for all bonus slots.
 */
export function unlockInventorySlotFromAd(player: Player, now = Date.now()): {
  ok: boolean;
  reason?: string;
  player: Player;
} {
  refreshInventoryCapacity(player, now);
  if (!canUnlockInventorySlot(player, now)) {
    return { ok: false, reason: 'MAX_SLOTS', player };
  }
  const nextBonus = Math.min(
    MAX_INVENTORY_SLOTS - BASE_INVENTORY_SLOTS,
    getActiveBonusSlots(player, now) + 1
  );
  player.inventoryBonusSlots = nextBonus;
  player.inventoryBonusExpiresAt = now + INVENTORY_BONUS_DURATION_MS;
  refreshInventoryCapacity(player, now);
  return { ok: true, player };
}

export function formatBonusCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
