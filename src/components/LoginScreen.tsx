import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Language, t } from '../game/i18n';
import { LanguageSelector } from './LanguageSelector';
import {
  CheckCircle2,
  Download,
  Loader2,
  Maximize2,
  Minimize2,
  Smartphone,
  User,
  UserCheck,
  XCircle
} from 'lucide-react';

interface LoginScreenProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  /** Guest ignores the typed name — server assigns a random operative name */
  onGuestLogin: () => void;
  /** Google requires a validated available operative name */
  onGoogleLogin: (username: string) => void;
  isGoogleLoading: boolean;
  googleNotice: string | null;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  canInstallPwa?: boolean;
  onInstallPwa?: () => void;
  isInstallBusy?: boolean;
  /** When Firebase already has a Google session, exclude that account from "taken" checks */
  excludeUserId?: string | null;
}

type NameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

function isFormatValid(name: string): boolean {
  return /^[a-zA-Z0-9_-]{3,20}$/.test(name);
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  language,
  onLanguageChange,
  onGuestLogin,
  onGoogleLogin,
  isGoogleLoading,
  googleNotice,
  isFullscreen,
  onToggleFullscreen,
  canInstallPwa = false,
  onInstallPwa,
  isInstallBusy = false,
  excludeUserId = null
}) => {
  const [operativeName, setOperativeName] = useState('');
  const [nameStatus, setNameStatus] = useState<NameStatus>('idle');
  const [nameError, setNameError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const checkSeq = useRef(0);

  const trimmed = operativeName.trim();
  const hasChosenName = isFormatValid(trimmed);
  // Both buttons stay disabled until the player types a valid operative name.
  // Guest still ignores that typed value and receives a random server name.
  const guestEnabled = hasChosenName && !isGoogleLoading;
  const googleEnabled = hasChosenName && nameStatus === 'available' && !isGoogleLoading;

  useEffect(() => {
    const cleaned = operativeName.trim();
    if (!cleaned) {
      setNameStatus('idle');
      setNameError(null);
      return;
    }
    if (!isFormatValid(cleaned)) {
      setNameStatus('invalid');
      setNameError(t('loginNameRequiredError', language));
      return;
    }

    setNameStatus('checking');
    setNameError(null);
    const seq = ++checkSeq.current;
    const timer = window.setTimeout(async () => {
      try {
        const qs = new URLSearchParams({ username: cleaned });
        if (excludeUserId) qs.set('excludeUserId', excludeUserId);
        const res = await fetch(`/api/auth/check-username?${qs.toString()}`);
        const data = await res.json();
        if (seq !== checkSeq.current) return;
        if (data.available) {
          setNameStatus('available');
          setNameError(null);
        } else {
          setNameStatus(data.valid === false ? 'invalid' : 'taken');
          setNameError(
            data.valid === false
              ? t('loginNameRequiredError', language)
              : t('loginNameTakenError', language)
          );
        }
      } catch {
        if (seq !== checkSeq.current) return;
        setNameStatus('invalid');
        setNameError(t('loginNameCheckFailed', language));
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [operativeName, language, excludeUserId]);

  const statusBadge = useMemo(() => {
    switch (nameStatus) {
      case 'checking':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] text-cyan-300">
            <Loader2 className="w-3 h-3 animate-spin" /> {t('loginNameChecking', language)}
          </span>
        );
      case 'available':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300">
            <CheckCircle2 className="w-3 h-3" /> {t('loginNameAvailable', language)}
          </span>
        );
      case 'taken':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] text-rose-300">
            <XCircle className="w-3 h-3" /> {t('loginNameTakenError', language)}
          </span>
        );
      default:
        return null;
    }
  }, [nameStatus, language]);

  const handleGuestClick = () => {
    if (!guestEnabled) return;
    onGuestLogin();
  };

  const handleGoogleClick = () => {
    if (!googleEnabled) {
      setNameError(t('loginNameRequiredError', language));
      inputRef.current?.focus();
      return;
    }
    onGoogleLogin(trimmed);
  };

  return (
    <div
      data-testid="login-screen"
      className="fixed inset-0 z-40 flex flex-col justify-between p-4 sm:p-8 select-none overflow-y-auto bg-gradient-to-b from-[#070414]/96 via-[#0d0724]/94 to-[#05030e]/98 backdrop-blur-md font-mono"
    >
      <div className="flex items-center justify-between w-full max-w-md mx-auto">
        <span className="text-[11px] font-bold tracking-widest text-cyan-400 uppercase flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          CYBER-CRYPT OS
        </span>
        <div className="flex items-center gap-2">
          {canInstallPwa && onInstallPwa && (
            <button
              type="button"
              data-testid="login-install-btn"
              onClick={onInstallPwa}
              disabled={isInstallBusy}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-emerald-950/80 border border-emerald-400/50 text-emerald-200 hover:bg-emerald-900 transition cursor-pointer disabled:opacity-60 text-[11px] font-bold"
              title={t('installAppBtn', language)}
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('installAppBtn', language)}</span>
            </button>
          )}
          <LanguageSelector currentLanguage={language} onLanguageChange={onLanguageChange} />
          <button
            onClick={onToggleFullscreen}
            data-testid="login-fullscreen-btn"
            className="p-2 rounded-lg bg-slate-900/90 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-950 transition cursor-pointer"
            title={t('fullscreenToggle', language)}
            aria-label={t('fullscreenToggle', language)}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="w-full max-w-md mx-auto my-auto py-6">
        <div className="p-6 sm:p-8 rounded-2xl bg-[#0a061c]/95 border border-cyan-500/50 shadow-[0_0_40px_rgba(0,240,255,0.25)] flex flex-col items-center text-center">
          <svg viewBox="0 0 680 104" className="w-full max-w-xs mx-auto h-auto mb-3 drop-shadow-[0_0_18px_rgba(0,240,255,0.45)]">
            <defs>
              <linearGradient id="loginNeonGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#00f0ff" />
                <stop offset="50%" stopColor="#ff00a0" />
                <stop offset="100%" stopColor="#ffe600" />
              </linearGradient>
            </defs>
            <path
              d="M 30 8 L 650 8 L 672 36 L 672 68 L 650 96 L 30 96 L 8 68 L 8 36 Z"
              fill="rgba(12, 8, 30, 0.85)"
              stroke="#00f0ff"
              strokeWidth="2"
            />
            <text
              x="340"
              y="56"
              textAnchor="middle"
              fill="url(#loginNeonGrad)"
              fontFamily="ui-monospace, monospace"
              fontSize="42"
              fontWeight="bold"
              letterSpacing="6"
            >
              CYBER-CRYPT
            </text>
            <text
              x="340"
              y="80"
              textAnchor="middle"
              fill="#a5f3fc"
              fontFamily="ui-monospace, monospace"
              fontSize="11"
              letterSpacing="4"
            >
              // NEURAL ACCESS PORTAL //
            </text>
          </svg>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4">{t('loginSubtitle', language)}</p>

          <div className="w-full mb-4 text-left">
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="operative-name-input"
                className="block text-[11px] font-bold uppercase tracking-wider text-cyan-300"
              >
                {t('loginNameLabel', language)}
              </label>
              {statusBadge}
            </div>
            <div className="relative">
              <User className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={inputRef}
                id="operative-name-input"
                data-testid="login-name-input"
                type="text"
                value={operativeName}
                maxLength={20}
                autoComplete="username"
                onChange={e => setOperativeName(e.target.value.replace(/\s/g, ''))}
                onKeyDown={e => {
                  if (e.key === 'Enter' && googleEnabled) handleGoogleClick();
                }}
                placeholder={t('loginNamePlaceholder', language)}
                className="w-full min-h-[46px] pl-9 pr-3 py-2.5 rounded-xl bg-slate-950/90 border border-cyan-500/50 focus:border-cyan-300 focus:outline-none text-white text-sm font-mono placeholder:text-slate-500"
              />
            </div>
            <p className="mt-1.5 text-[10px] text-slate-400">{t('loginNameGoogleOnlyHint', language)}</p>
            {nameError && (
              <div data-testid="login-name-error" className="mt-1.5 text-[11px] text-rose-300 font-bold">
                ⚠ {nameError}
              </div>
            )}
          </div>

          <div className="w-full flex flex-col gap-3">
            <button
              type="button"
              data-testid="login-google-btn"
              disabled={!googleEnabled}
              onClick={handleGoogleClick}
              className="w-full min-h-[50px] px-4 py-3 rounded-xl bg-white text-slate-900 font-sans font-semibold text-sm flex items-center justify-center gap-3 shadow-[0_4px_18px_rgba(255,255,255,0.2)] transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:bg-slate-100 enabled:active:scale-[0.98]"
            >
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"
                />
              </svg>
              <span>{isGoogleLoading ? '...' : t('googleLoginBtn', language)}</span>
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[10px] text-cyan-300/80">
              <Smartphone className="w-3 h-3" />
              <span>{t('googleMobileNote', language)}</span>
            </div>

            {googleNotice && (
              <div
                data-testid="login-google-notice"
                className="px-3 py-2 rounded-lg bg-amber-950/70 border border-amber-400/50 text-amber-200 text-xs text-left"
              >
                {googleNotice}
              </div>
            )}

            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-slate-800" />
              <span className="text-[10px] text-slate-500 uppercase">OR</span>
              <div className="flex-1 h-px bg-slate-800" />
            </div>

            <button
              type="button"
              data-testid="login-guest-btn"
              disabled={!guestEnabled}
              onClick={handleGuestClick}
              className="w-full min-h-[50px] px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-950/90 to-purple-950/90 border border-cyan-400/60 text-cyan-100 font-bold text-sm flex items-center justify-center gap-2.5 shadow-[0_0_20px_rgba(0,240,255,0.2)] transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:from-cyan-900 enabled:hover:to-purple-900 enabled:active:scale-[0.98]"
            >
              <UserCheck className="w-4 h-4 text-cyan-300" />
              <span>{t('guestLoginBtn', language)}</span>
            </button>
            <p className="text-[10px] text-slate-500 -mt-1">{t('loginGuestRandomHint', language)}</p>

            {canInstallPwa && onInstallPwa && (
              <button
                type="button"
                data-testid="login-install-btn-main"
                onClick={onInstallPwa}
                disabled={isInstallBusy}
                className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-emerald-950/70 border border-emerald-400/50 text-emerald-100 font-bold text-sm flex items-center justify-center gap-2 hover:bg-emerald-900 transition cursor-pointer disabled:opacity-60"
              >
                <Download className="w-4 h-4" />
                <span>{isInstallBusy ? '...' : t('installAppBtn', language)}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="text-center text-[10px] text-slate-500">E2E Cloud Sync · PWA Install Ready</div>
    </div>
  );
};
