import React, { useEffect, useRef, useState } from 'react';
import { Language, t } from '../game/i18n';
import { LanguageSelector } from './LanguageSelector';
import {
  CheckCircle2,
  Download,
  KeyRound,
  Loader2,
  Maximize2,
  Minimize2,
  User,
  UserCheck,
  UserPlus,
  XCircle
} from 'lucide-react';

export interface AuthCredentials {
  login: string;
  password: string;
}

export interface RegisterPayload {
  login: string;
  nick: string;
  password: string;
  passwordConfirm: string;
}

interface LoginScreenProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onGuestLogin: () => void;
  onPasswordLogin: (creds: AuthCredentials) => void | Promise<void>;
  onRegister: (payload: RegisterPayload) => void | Promise<void>;
  isAuthLoading: boolean;
  authNotice: string | null;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  canInstallPwa?: boolean;
  onInstallPwa?: () => void;
  isInstallBusy?: boolean;
}

type Panel = 'menu' | 'login' | 'register';
type FieldStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

function isFormatValid(name: string): boolean {
  return /^[a-zA-Z0-9_-]{3,20}$/.test(name);
}

function StatusBadge({
  status,
  availableLabel,
  checkingLabel,
  takenLabel
}: {
  status: FieldStatus;
  availableLabel: string;
  checkingLabel: string;
  takenLabel: string;
}) {
  if (status === 'checking') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-cyan-300">
        <Loader2 className="w-3 h-3 animate-spin" /> {checkingLabel}
      </span>
    );
  }
  if (status === 'available') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300">
        <CheckCircle2 className="w-3 h-3" /> {availableLabel}
      </span>
    );
  }
  if (status === 'taken' || status === 'invalid') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-rose-300">
        <XCircle className="w-3 h-3" /> {takenLabel}
      </span>
    );
  }
  return null;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  language,
  onLanguageChange,
  onGuestLogin,
  onPasswordLogin,
  onRegister,
  isAuthLoading,
  authNotice,
  isFullscreen,
  onToggleFullscreen,
  canInstallPwa = false,
  onInstallPwa,
  isInstallBusy = false
}) => {
  const [panel, setPanel] = useState<Panel>('menu');
  const [loginName, setLoginName] = useState('');
  const [nick, setNick] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loginStatus, setLoginStatus] = useState<FieldStatus>('idle');
  const [nickStatus, setNickStatus] = useState<FieldStatus>('idle');
  const [localError, setLocalError] = useState<string | null>(null);
  const loginSeq = useRef(0);
  const nickSeq = useRef(0);

  // Live availability — login account
  useEffect(() => {
    if (panel !== 'register') return;
    const cleaned = loginName.trim();
    if (!cleaned) {
      setLoginStatus('idle');
      return;
    }
    if (!isFormatValid(cleaned)) {
      setLoginStatus('invalid');
      return;
    }
    setLoginStatus('checking');
    const seq = ++loginSeq.current;
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/check-login?login=${encodeURIComponent(cleaned)}`);
        const data = await res.json();
        if (seq !== loginSeq.current) return;
        setLoginStatus(data.available ? 'available' : data.valid === false ? 'invalid' : 'taken');
      } catch {
        if (seq !== loginSeq.current) return;
        setLoginStatus('invalid');
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [loginName, panel]);

  // Live availability — nick
  useEffect(() => {
    if (panel !== 'register') return;
    const cleaned = nick.trim();
    if (!cleaned) {
      setNickStatus('idle');
      return;
    }
    if (!isFormatValid(cleaned)) {
      setNickStatus('invalid');
      return;
    }
    setNickStatus('checking');
    const seq = ++nickSeq.current;
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(cleaned)}`);
        const data = await res.json();
        if (seq !== nickSeq.current) return;
        setNickStatus(data.available ? 'available' : data.valid === false ? 'invalid' : 'taken');
      } catch {
        if (seq !== nickSeq.current) return;
        setNickStatus('invalid');
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [nick, panel]);

  const openPanel = (next: Panel) => {
    setLocalError(null);
    setPanel(next);
  };

  const handleLoginSubmit = async () => {
    setLocalError(null);
    const cleanLogin = loginName.trim();
    if (!isFormatValid(cleanLogin) || !password) {
      setLocalError(t('authFillRequired', language));
      return;
    }
    await onPasswordLogin({ login: cleanLogin, password });
  };

  const handleRegisterSubmit = async () => {
    setLocalError(null);
    const cleanLogin = loginName.trim();
    const cleanNick = nick.trim();
    if (!isFormatValid(cleanLogin) || !isFormatValid(cleanNick) || !password) {
      setLocalError(t('authFillRequired', language));
      return;
    }
    if (password.length < 8) {
      setLocalError(t('authPasswordTooShort', language));
      return;
    }
    if (password !== passwordConfirm) {
      setLocalError(t('authPasswordMismatch', language));
      return;
    }
    if (loginStatus === 'taken' || loginStatus === 'invalid') {
      setLocalError(t('authLoginTaken', language));
      return;
    }
    if (nickStatus === 'taken' || nickStatus === 'invalid') {
      setLocalError(t('authNickTaken', language));
      return;
    }
    if (loginStatus === 'checking' || nickStatus === 'checking') return;
    await onRegister({
      login: cleanLogin,
      nick: cleanNick,
      password,
      passwordConfirm
    });
  };

  const notice = localError || authNotice;
  const registerReady =
    loginStatus === 'available' &&
    nickStatus === 'available' &&
    password.length >= 8 &&
    password === passwordConfirm &&
    !isAuthLoading;

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

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-5">{t('loginSubtitle', language)}</p>

          {panel === 'menu' && (
            <div className="w-full flex flex-col gap-3">
              <button
                type="button"
                data-testid="login-signin-btn"
                disabled={isAuthLoading}
                onClick={() => openPanel('login')}
                className="w-full min-h-[50px] px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 text-slate-950 font-bold text-sm flex items-center justify-center gap-2.5 shadow-[0_0_20px_rgba(0,240,255,0.25)] transition cursor-pointer disabled:opacity-50 enabled:hover:brightness-110 enabled:active:scale-[0.98]"
              >
                <KeyRound className="w-4 h-4" />
                {t('authLoginTab', language)}
              </button>
              <button
                type="button"
                data-testid="login-register-btn"
                disabled={isAuthLoading}
                onClick={() => openPanel('register')}
                className="w-full min-h-[50px] px-4 py-3 rounded-xl bg-white text-slate-900 font-semibold text-sm flex items-center justify-center gap-2.5 transition cursor-pointer disabled:opacity-50 enabled:hover:bg-slate-100 enabled:active:scale-[0.98]"
              >
                <UserPlus className="w-4 h-4" />
                {t('authRegisterTab', language)}
              </button>
              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px bg-slate-800" />
                <span className="text-[10px] text-slate-500 uppercase">OR</span>
                <div className="flex-1 h-px bg-slate-800" />
              </div>
              <button
                type="button"
                data-testid="login-guest-btn"
                disabled={isAuthLoading}
                onClick={onGuestLogin}
                className="w-full min-h-[50px] px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-950/90 to-purple-950/90 border border-cyan-400/60 text-cyan-100 font-bold text-sm flex items-center justify-center gap-2.5 shadow-[0_0_20px_rgba(0,240,255,0.2)] transition cursor-pointer disabled:opacity-40 enabled:hover:from-cyan-900 enabled:hover:to-purple-900 enabled:active:scale-[0.98]"
              >
                <UserCheck className="w-4 h-4 text-cyan-300" />
                {t('guestLoginBtn', language)}
              </button>
              <p className="text-[10px] text-slate-500 -mt-1">{t('loginGuestRandomHint', language)}</p>
            </div>
          )}

          {panel === 'login' && (
            <div className="w-full flex flex-col gap-3 text-left">
              <label className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">
                {t('authLoginLabel', language)}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  data-testid="login-account-input"
                  type="text"
                  value={loginName}
                  maxLength={20}
                  autoComplete="username"
                  onChange={e => setLoginName(e.target.value.replace(/\s/g, ''))}
                  placeholder={t('authLoginPlaceholder', language)}
                  className="w-full min-h-[46px] pl-9 pr-3 py-2.5 rounded-xl bg-slate-950/90 border border-cyan-500/50 focus:border-cyan-300 focus:outline-none text-white text-sm font-mono placeholder:text-slate-500"
                />
              </div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">
                {t('authPasswordLabel', language)}
              </label>
              <input
                data-testid="login-password-input"
                type="password"
                value={password}
                autoComplete="current-password"
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleLoginSubmit();
                }}
                className="w-full min-h-[46px] px-3 py-2.5 rounded-xl bg-slate-950/90 border border-cyan-500/50 focus:border-cyan-300 focus:outline-none text-white text-sm font-mono"
              />
              <button
                type="button"
                data-testid="login-submit-btn"
                disabled={isAuthLoading}
                onClick={handleLoginSubmit}
                className="w-full min-h-[48px] mt-1 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 text-slate-950 font-bold text-sm disabled:opacity-50 enabled:hover:brightness-110"
              >
                {isAuthLoading ? '...' : t('authSubmitLogin', language)}
              </button>
              <button
                type="button"
                onClick={() => openPanel('menu')}
                className="text-[11px] text-slate-400 hover:text-cyan-300 transition"
              >
                ← {t('authBackToMenu', language)}
              </button>
            </div>
          )}

          {panel === 'register' && (
            <div className="w-full flex flex-col gap-3 text-left">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">
                  {t('authLoginLabel', language)}
                </label>
                <StatusBadge
                  status={loginStatus}
                  availableLabel={t('authLoginAvailable', language)}
                  checkingLabel={t('loginNameChecking', language)}
                  takenLabel={
                    loginStatus === 'taken' ? t('authLoginTaken', language) : t('loginNameRequiredError', language)
                  }
                />
              </div>
              <div className="relative">
                <User className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  data-testid="register-login-input"
                  type="text"
                  value={loginName}
                  maxLength={20}
                  autoComplete="username"
                  onChange={e => setLoginName(e.target.value.replace(/\s/g, ''))}
                  placeholder={t('authLoginPlaceholder', language)}
                  className="w-full min-h-[46px] pl-9 pr-3 py-2.5 rounded-xl bg-slate-950/90 border border-cyan-500/50 focus:border-cyan-300 focus:outline-none text-white text-sm font-mono placeholder:text-slate-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">
                  {t('authNickLabel', language)}
                </label>
                <StatusBadge
                  status={nickStatus}
                  availableLabel={t('authNickAvailable', language)}
                  checkingLabel={t('loginNameChecking', language)}
                  takenLabel={
                    nickStatus === 'taken' ? t('authNickTaken', language) : t('loginNameRequiredError', language)
                  }
                />
              </div>
              <input
                data-testid="register-nick-input"
                type="text"
                value={nick}
                maxLength={20}
                autoComplete="nickname"
                onChange={e => setNick(e.target.value.replace(/\s/g, ''))}
                placeholder={t('authNickPlaceholder', language)}
                className="w-full min-h-[46px] px-3 py-2.5 rounded-xl bg-slate-950/90 border border-cyan-500/50 focus:border-cyan-300 focus:outline-none text-white text-sm font-mono placeholder:text-slate-500"
              />

              <label className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">
                {t('authPasswordLabel', language)}
              </label>
              <input
                data-testid="register-password-input"
                type="password"
                value={password}
                autoComplete="new-password"
                onChange={e => setPassword(e.target.value)}
                className="w-full min-h-[46px] px-3 py-2.5 rounded-xl bg-slate-950/90 border border-cyan-500/50 focus:border-cyan-300 focus:outline-none text-white text-sm font-mono"
              />

              <label className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">
                {t('authPasswordConfirmLabel', language)}
              </label>
              <input
                data-testid="register-password-confirm-input"
                type="password"
                value={passwordConfirm}
                autoComplete="new-password"
                onChange={e => setPasswordConfirm(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && registerReady) handleRegisterSubmit();
                }}
                className="w-full min-h-[46px] px-3 py-2.5 rounded-xl bg-slate-950/90 border border-cyan-500/50 focus:border-cyan-300 focus:outline-none text-white text-sm font-mono"
              />

              <button
                type="button"
                data-testid="register-submit-btn"
                disabled={!registerReady}
                onClick={handleRegisterSubmit}
                className="w-full min-h-[48px] mt-1 rounded-xl bg-white text-slate-900 font-bold text-sm disabled:opacity-40 enabled:hover:bg-slate-100"
              >
                {isAuthLoading ? '...' : t('authSubmitRegister', language)}
              </button>
              <button
                type="button"
                onClick={() => openPanel('menu')}
                className="text-[11px] text-slate-400 hover:text-cyan-300 transition"
              >
                ← {t('authBackToMenu', language)}
              </button>
            </div>
          )}

          {notice && (
            <div
              data-testid="login-auth-notice"
              className="w-full mt-3 px-3 py-2 rounded-lg bg-amber-950/70 border border-amber-400/50 text-amber-200 text-xs text-left"
            >
              {notice}
            </div>
          )}

          {canInstallPwa && onInstallPwa && panel === 'menu' && (
            <button
              type="button"
              data-testid="login-install-btn-main"
              onClick={onInstallPwa}
              disabled={isInstallBusy}
              className="w-full mt-3 min-h-[46px] px-4 py-2.5 rounded-xl bg-emerald-950/70 border border-emerald-400/50 text-emerald-100 font-bold text-sm flex items-center justify-center gap-2 hover:bg-emerald-900 transition cursor-pointer disabled:opacity-60"
            >
              <Download className="w-4 h-4" />
              <span>{isInstallBusy ? '...' : t('installAppBtn', language)}</span>
            </button>
          )}
        </div>
      </div>

      <div className="text-center text-[10px] text-slate-500">E2E Cloud Sync · PWA Install Ready</div>
    </div>
  );
};
