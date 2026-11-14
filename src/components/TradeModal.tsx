import React, { useMemo, useState } from 'react';
import { GameItem, Player } from '../game/types';
import { Language, t } from '../game/i18n';
import { getRarityStyle } from '../game/rarity';
import { getLocalizedItemName } from '../game/itemI18n';
import { X } from 'lucide-react';

const TRADE_SLOTS = 6;

interface TradeModalProps {
  player: Player;
  partnerName: string;
  partnerOffer: (GameItem | null)[];
  language: Language;
  onCancel: () => void;
  onSubmit: (offer: GameItem[]) => void;
  locked?: boolean;
}

/** Online trade: left = bag, right = 6 delivery slots. Tap moves items between sides. */
export const TradeModal: React.FC<TradeModalProps> = ({
  player,
  partnerName,
  partnerOffer,
  language,
  onCancel,
  onSubmit,
  locked = false
}) => {
  const [offerIds, setOfferIds] = useState<string[]>([]);

  const offerItems = useMemo(
    () =>
      offerIds
        .map(id => player.inventory.find(i => i.id === id))
        .filter((i): i is GameItem => !!i)
        .slice(0, TRADE_SLOTS),
    [offerIds, player.inventory]
  );

  const bagItems = useMemo(
    () => player.inventory.filter(i => !offerIds.includes(i.id)),
    [player.inventory, offerIds]
  );

  const toggleToOffer = (item: GameItem) => {
    if (locked) return;
    setOfferIds(prev => {
      if (prev.includes(item.id)) return prev.filter(id => id !== item.id);
      if (prev.length >= TRADE_SLOTS) return prev;
      return [...prev, item.id];
    });
  };

  const slots: (GameItem | null)[] = Array.from({ length: TRADE_SLOTS }, (_, i) => offerItems[i] || null);
  const theirSlots: (GameItem | null)[] = Array.from(
    { length: TRADE_SLOTS },
    (_, i) => partnerOffer[i] || null
  );

  return (
    <div
      data-testid="trade-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm font-mono select-none"
    >
      <div className="w-full max-w-3xl bg-[#0a0718] border border-cyan-500/50 rounded-xl shadow-[0_0_28px_rgba(0,240,255,0.25)] p-3 sm:p-4 flex flex-col gap-3 max-h-[92dvh] overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-cyan-900/40 pb-2">
          <div>
            <h2 className="text-sm font-bold text-cyan-200 tracking-wider uppercase">Trade</h2>
            <p className="text-[10px] text-slate-400">Con {partnerName} · 6 slots</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-1.5 min-h-[40px] px-3 rounded-lg bg-rose-950/90 border border-rose-400/80 text-rose-100 text-xs font-bold"
            aria-label="Cancel trade"
          >
            <X className="w-4 h-4" />
            {t('closeBtn', language)}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-h-0 flex-1 overflow-hidden">
          {/* Left: inventory */}
          <div className="flex flex-col min-h-0 border border-slate-700/60 rounded-lg p-2 bg-[#0d0920]">
            <div className="text-[10px] font-bold text-slate-300 uppercase mb-2">Tu inventario</div>
            <div className="grid grid-cols-4 gap-1.5 overflow-y-auto flex-1 content-start">
              {bagItems.map(item => {
                const r = getRarityStyle(item.rarity);
                return (
                  <button
                    key={item.id}
                    type="button"
                    data-testid={`trade-bag-${item.id}`}
                    disabled={locked || offerItems.length >= TRADE_SLOTS}
                    onClick={() => toggleToOffer(item)}
                    className={`min-h-[64px] p-1.5 rounded-lg border flex flex-col items-center justify-center gap-0.5 ${r.cardClass} ${
                      locked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'
                    }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className={`text-[8px] truncate w-full text-center ${r.titleClass}`}>
                      {getLocalizedItemName(item, language, { includeUpgrade: false, includeLevel: false })}
                    </span>
                  </button>
                );
              })}
              {bagItems.length === 0 && (
                <div className="col-span-4 text-center text-[11px] text-slate-500 py-6">Vacío</div>
              )}
            </div>
          </div>

          {/* Right: offer + theirs */}
          <div className="flex flex-col gap-2 min-h-0">
            <div className="border border-amber-500/40 rounded-lg p-2 bg-amber-950/20">
              <div className="text-[10px] font-bold text-amber-200 uppercase mb-2">Entregar (tú)</div>
              <div className="grid grid-cols-3 gap-1.5">
                {slots.map((item, idx) => (
                  <button
                    key={`offer_${idx}`}
                    type="button"
                    data-testid={`trade-offer-slot-${idx}`}
                    disabled={locked || !item}
                    onClick={() => item && toggleToOffer(item)}
                    className={`min-h-[56px] rounded-lg border border-dashed flex flex-col items-center justify-center ${
                      item
                        ? `${getRarityStyle(item.rarity).cardClass} cursor-pointer`
                        : 'border-slate-700 bg-black/30 text-slate-600'
                    }`}
                  >
                    {item ? (
                      <>
                        <span className="text-lg">{item.icon}</span>
                        <span className="text-[8px] truncate w-full text-center px-0.5">
                          {getLocalizedItemName(item, language)}
                        </span>
                      </>
                    ) : (
                      <span className="text-[10px]">#{idx + 1}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="border border-cyan-500/35 rounded-lg p-2 bg-cyan-950/15">
              <div className="text-[10px] font-bold text-cyan-200 uppercase mb-2">Recibir ({partnerName})</div>
              <div className="grid grid-cols-3 gap-1.5">
                {theirSlots.map((item, idx) => (
                  <div
                    key={`their_${idx}`}
                    data-testid={`trade-their-slot-${idx}`}
                    className={`min-h-[56px] rounded-lg border border-dashed flex flex-col items-center justify-center ${
                      item ? getRarityStyle(item.rarity).cardClass : 'border-slate-700 bg-black/30 text-slate-600'
                    }`}
                  >
                    {item ? (
                      <>
                        <span className="text-lg">{item.icon}</span>
                        <span className="text-[8px] truncate w-full text-center px-0.5">
                          {getLocalizedItemName(item, language)}
                        </span>
                      </>
                    ) : (
                      <span className="text-[10px]">#{idx + 1}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800">
          <button
            type="button"
            data-testid="trade-cancel-btn"
            onClick={onCancel}
            className="min-h-[42px] px-4 rounded-lg bg-slate-900 border border-slate-600 text-slate-200 text-xs font-bold"
          >
            Cancelar
          </button>
          <button
            type="button"
            data-testid="trade-send-btn"
            disabled={locked}
            onClick={() => onSubmit(offerItems)}
            className={`min-h-[42px] px-4 rounded-lg border text-xs font-bold ${
              locked
                ? 'bg-slate-900 border-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-cyan-950 border-cyan-400 text-cyan-100 shadow-[0_0_12px_rgba(0,240,255,0.35)]'
            }`}
          >
            {locked ? 'Enviado…' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  );
};

interface TradeRequestBannerProps {
  fromName: string;
  onAccept: () => void;
  onReject: () => void;
}

export const TradeRequestBanner: React.FC<TradeRequestBannerProps> = ({
  fromName,
  onAccept,
  onReject
}) => (
  <div
    data-testid="trade-request-banner"
    className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-[min(92vw,380px)] p-3 rounded-xl bg-[#0a0718]/95 border border-pink-500/60 shadow-[0_0_24px_rgba(244,63,94,0.35)] font-mono"
  >
    <div className="text-xs text-pink-200 font-bold mb-2">Trade de {fromName}</div>
    <div className="flex gap-2">
      <button
        type="button"
        data-testid="trade-accept-btn"
        onClick={onAccept}
        className="flex-1 min-h-[40px] rounded-lg bg-emerald-950 border border-emerald-400 text-emerald-200 text-xs font-bold"
      >
        Aceptar
      </button>
      <button
        type="button"
        data-testid="trade-reject-btn"
        onClick={onReject}
        className="flex-1 min-h-[40px] rounded-lg bg-rose-950 border border-rose-400 text-rose-200 text-xs font-bold"
      >
        Rechazar
      </button>
    </div>
  </div>
);
