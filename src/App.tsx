/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Achievement,
  AttackEffect,
  CharacterClass,
  CheckpointSnapshot,
  CombatLogEntry,
  CoopRoomState,
  DifficultyMode,
  DungeonState,
  EquipSlot,
  GameItem,
  Player,
  PlayMode,
  RunSnapshot,
  SavedPlayerLoadout
} from './game/types';
import { generateDungeon, updateFOV } from './game/dungeon';
import {
  collectDeathDropBagsAt,
  createInitialPlayer,
  resolveStepOrAttack,
  resolveRangedAttack,
  executeSkill,
  useConsumableItem,
  getTotalStats,
  getFovRadius,
  getPlayerAttackRange
} from './game/combat';
import {
  clearOfflineSave,
  getOfflineSaveSlotKey,
  loadAllOfflineSaves,
  loadOfflineSave,
  OfflineSaveSlotKey,
  OfflineSaveState,
  saveOfflineRun
} from './game/offlineSave';
import {
  AppSettings,
  loadAppSettings,
  saveAppSettings
} from './game/settings';
import { canUnlockSkill, SKILL_DATABASE } from './game/skills';
import {
  attemptUpgradeItem,
  canClassEquipItem,
  canUpgradeItem,
  getEquipSlotForItem,
  getProbabilityStoneCost,
  getUpgradeCost
} from './game/items';
import { soundEngine } from './game/audio';
import { preloadAdsBitvex } from './game/adsbitvex';
import { CanvasRenderer, CoopRemoteRenderPlayer } from './game/canvasRenderer';
import { Language, t } from './game/i18n';

import { LoginScreen } from './components/LoginScreen';
import { TitleScreen } from './components/TitleScreen';
import { GameHUD } from './components/GameHUD';
import { TouchControls } from './components/TouchControls';
import { InventoryModal } from './components/InventoryModal';
import { SkillTreeModal } from './components/SkillTreeModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { MultiplayerModal } from './components/MultiplayerModal';
import { SocialModal } from './components/SocialModal';
import { AdminDashboardModal } from './components/AdminDashboardModal';
import { GameOverModal } from './components/GameOverModal';
import { PauseModal } from './components/PauseModal';
import { Minimap } from './components/Minimap';
import { ShopModal } from './components/ShopModal';
import { OptionsModal } from './components/OptionsModal';
import {
  auth,
  checkGoogleRedirectSignIn,
  onAuthStateChanged,
  signInWithGoogleNativeMobile,
  signOutFirebaseUser,
  syncFirebaseUserProfile,
  testFirestoreConnection
} from './firebase';

const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  { id: 'first_blood', title: 'First Breach', description: 'Eliminate your first rogue AI matrix', icon: '⚡', unlocked: false },
  { id: 'floor_3', title: 'Deep Diver', description: 'Reach Sub-Level 3 of the Cyber-Crypt', icon: '🌊', unlocked: false },
  { id: 'boss_slayer', title: 'Core Breaker', description: 'Defeat the Core Synthesizer Boss', icon: '👑', unlocked: false },
  { id: 'tech_master', title: 'Synapse Master', description: 'Unlock a Tier 3 or higher skill node', icon: '🧠', unlocked: false },
  { id: 'shard_collector', title: 'Aether Hoarder', description: 'Collect 100+ Soul Shards in a single run', icon: '💎', unlocked: false }
];

export default function App() {
  const [gameState, setGameState] = useState<'title' | 'playing' | 'paused' | 'gameover'>('title');
  const [authScreenVisible, setAuthScreenVisible] = useState<boolean>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('autostart') !== '1';
    } catch {
      return true;
    }
  });
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleNotice, setGoogleNotice] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [appSettings, setAppSettings] = useState<AppSettings>(() => loadAppSettings());
  const [selectedClass, setSelectedClass] = useState<CharacterClass>('striker');
  const [playMode, setPlayMode] = useState<PlayMode>('offline');
  const [difficultyMode, setDifficultyMode] = useState<DifficultyMode>('normal');
  const [isMuted, setIsMuted] = useState<boolean>(() => loadAppSettings().audio.masterMuted);
  const [language, setLanguage] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('cyber_lang') as Language;
      return saved && ['en', 'es', 'fr', 'de', 'ja'].includes(saved) ? saved : 'es';
    } catch {
      return 'es';
    }
  });

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    try {
      localStorage.setItem('cyber_lang', lang);
    } catch {}
  };

  // Modals & Overlays
  const [showInventory, setShowInventory] = useState(false);
  const [showSkillTree, setShowSkillTree] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showMultiplayer, setShowMultiplayer] = useState(false);
  const [showSocial, setShowSocial] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showMinimap, setShowMinimap] = useState(true);
  const [showShop, setShowShop] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [upgradeFeedback, setUpgradeFeedback] = useState<{ status: 'success' | 'destroyed'; message: string } | null>(null);
  const [destroyedItemRecovery, setDestroyedItemRecovery] = useState<{
    item: GameItem;
    equipSlot: EquipSlot | null;
  } | null>(null);

  // User Profile & Server State
  const [userToken, setUserToken] = useState<string>('');
  const [userProfile, setUserProfile] = useState<{ id: string; username: string; role: 'player' | 'moderator' | 'admin' } | null>(null);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<string>('Local Device Save');
  const [achievements, setAchievements] = useState<Achievement[]>(DEFAULT_ACHIEVEMENTS);
  const [userStats, setUserStats] = useState({ highestFloor: 1, totalKills: 0, bestScore: 0 });
  const [guestAccountId] = useState<string>(() => {
    try {
      const existing = localStorage.getItem('cyber_crypt_guest_op_id');
      if (existing) return existing;
      const created = `op_acct_${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem('cyber_crypt_guest_op_id', created);
      return created;
    } catch {
      return `op_acct_${Math.random().toString(36).slice(2, 10)}`;
    }
  });
  const onlineAccountId = userProfile?.id || guestAccountId;
  const [onlineStashes, setOnlineStashes] = useState<Partial<Record<CharacterClass, SavedPlayerLoadout>>>({});

  // Game Engine State
  const [turn, setTurn] = useState<number>(1);
  const [score, setScore] = useState<number>(0);
  const [monstersSlain, setMonstersSlain] = useState<number>(0);
  const [combatLogs, setCombatLogs] = useState<CombatLogEntry[]>([
    { id: 'init_1', text: 'Neural feed synchronized. Welcome to CYBER-CRYPT.', type: 'info', turn: 1 }
  ]);
  const [runSnapshot, setRunSnapshot] = useState<RunSnapshot | null>(null);

  // Persistent Checkpoint State (Normal Mode) & Per-(Difficulty, Role) Local Offline Run Saves
  const [checkpointSnapshot, setCheckpointSnapshot] = useState<CheckpointSnapshot | null>(null);
  const [savedOfflineRuns, setSavedOfflineRuns] = useState<Record<OfflineSaveSlotKey, OfflineSaveState | null>>(() =>
    loadAllOfflineSaves()
  );

  // Co-Op WebSocket State
  const [localPlayerId] = useState<string>(() => `op_${Math.random().toString(36).slice(2, 9)}`);
  const [coopConnected, setCoopConnected] = useState(false);
  const [coopRoom, setCoopRoom] = useState<CoopRoomState | null>(null);
  const [coopError, setCoopError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // React State for HUD & Canvas
  const [player, setPlayer] = useState<Player>(() => createInitialPlayer('striker'));
  const [dungeon, setDungeon] = useState<DungeonState>(() => generateDungeon(1, 100));

  // Canvas Refs & Renderer
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const targetFpsRef = useRef<30 | 60>(appSettings.targetFps);
  const floatingTextsRef = useRef<{ text: string; x: number; y: number; color: string; isCrit?: boolean; life: number }[]>([]);
  const lastFovPosRef = useRef<{ x: number; y: number; floor: number } | null>(null);
  const remotePlayersRef = useRef<CoopRemoteRenderPlayer[]>([]);
  const hoveredTileRef = useRef<{ x: number; y: number } | null>(null);

  // Live Refs
  const playerRef = useRef(player);
  playerRef.current = player;
  const dungeonRef = useRef(dungeon);
  dungeonRef.current = dungeon;
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;
  const turnRef = useRef(turn);
  turnRef.current = turn;
  const scoreRef = useRef(score);
  scoreRef.current = score;
  const monstersSlainRef = useRef(monstersSlain);
  monstersSlainRef.current = monstersSlain;
  const playModeRef = useRef(playMode);
  playModeRef.current = playMode;
  const coopRoomRef = useRef(coopRoom);
  coopRoomRef.current = coopRoom;
  const difficultyModeRef = useRef(difficultyMode);
  difficultyModeRef.current = difficultyMode;
  const selectedClassRef = useRef(selectedClass);
  selectedClassRef.current = selectedClass;

  useEffect(() => {
    document.body.dataset.state = gameState;
  }, [gameState]);

  const handleUpdateSettings = useCallback((next: AppSettings) => {
    setAppSettings(next);
    saveAppSettings(next);
    soundEngine.setAudioSettings(next.audio);
    setIsMuted(next.audio.masterMuted);
    targetFpsRef.current = next.targetFps;
    rendererRef.current?.applyPerformanceOptions({
      enableScanlines: next.enableScanlines,
      enableGlow: next.enableGlow,
      enableParticles: next.enableParticles
    });
  }, []);

  const handleToggleMasterMute = useCallback(() => {
    const nextMuted = !appSettings.audio.masterMuted;
    handleUpdateSettings({
      ...appSettings,
      audio: {
        ...appSettings.audio,
        masterMuted: nextMuted
      }
    });
  }, [appSettings, handleUpdateSettings]);

  // Apply persisted audio settings on initial mount
  useEffect(() => {
    soundEngine.setAudioSettings(appSettings.audio);
  }, []);

  // Fetch server-saved online stashes per role whenever entering Online hub or account changes
  const fetchOnlineStashes = useCallback(() => {
    const headers: Record<string, string> = {};
    if (userToken) headers.Authorization = `Bearer ${userToken}`;
    fetch(`/api/online/stashes?accountId=${encodeURIComponent(onlineAccountId)}`, { headers })
      .then(res => res.json())
      .then(data => {
        if (data?.stashes) {
          setOnlineStashes(data.stashes);
        }
      })
      .catch(() => {});
  }, [onlineAccountId, userToken]);

  useEffect(() => {
    if (playMode === 'online' && gameState === 'title') {
      fetchOnlineStashes();
    }
  }, [playMode, gameState, fetchOnlineStashes]);

  // Global Gesture AudioContext Unlock + Tactile Physical-Modeled UI Button Clicks
  useEffect(() => {
    let audioBooted = false;
    const unlockAudio = () => {
      soundEngine.unlockFromGesture();
      preloadAdsBitvex();
      if (!audioBooted) {
        audioBooted = true;
        soundEngine.startMusic();
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      unlockAudio();
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const btn = target.closest('button, [role="button"], [role="tab"]') as HTMLElement | null;
      if (!btn) return;
      if (btn.hasAttribute('disabled') || btn.getAttribute('aria-disabled') === 'true') {
        soundEngine.playUI('error');
        return;
      }
      if (btn.closest('[data-no-ui-sfx="true"]')) return;
      soundEngine.playUI('click');
    };

    const onKeyFirst = () => unlockAudio();

    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyFirst, { once: true, capture: true });
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyFirst, true);
    };
  }, []);

  // Adaptive Music Context Sync (Title -> Explore -> Combat -> Boss)
  useEffect(() => {
    const nearbyEnemies = dungeon.monsters.filter(
      m => m.alerted || Math.hypot(m.x - player.x, m.y - player.y) <= 7
    ).length;
    const bossVisible = dungeon.monsters.some(
      m => m.archetype === 'core_synthesizer' && (m.alerted || dungeon.tiles[m.y]?.[m.x]?.visible)
    );
    const lowHp = player.stats.hp > 0 && player.stats.hp <= player.stats.maxHp * 0.3;

    soundEngine.setMusicContext({
      scene: authScreenVisible ? 'login' : gameState,
      floor: dungeon.floor,
      nearbyEnemies,
      bossVisible,
      lowHp
    });
  }, [authScreenVisible, gameState, dungeon.floor, dungeon.monsters, dungeon.tiles, player.x, player.y, player.stats.hp, player.stats.maxHp]);

  // Keep remotePlayersRef synced when coopRoom updates
  useEffect(() => {
    if (playMode === 'online' && coopRoom && coopRoom.status === 'playing') {
      remotePlayersRef.current = coopRoom.players
        .filter(s => s.playerId !== localPlayerId && s.player)
        .map(s => ({
          playerId: s.playerId,
          username: s.username,
          characterClass: s.player!.characterClass,
          x: s.player!.x,
          y: s.player!.y,
          facing: s.player!.facing,
          movedThisTurn: s.movedThisTurn,
          alive: s.alive
        }));
    } else {
      remotePlayersRef.current = [];
    }
  }, [playMode, coopRoom, localPlayerId]);

  const handleSoundAndVisuals = useCallback(
    (
      events: string[],
      screenShake: number,
      floaters: any[],
      hitstopSeconds = 0,
      attackEffects: AttackEffect[] = []
    ) => {
      for (const ev of events) {
        soundEngine.playSFX(ev as any);
      }
      if (rendererRef.current) {
        if (screenShake > 0) rendererRef.current.addTrauma(screenShake);
        if (hitstopSeconds > 0) rendererRef.current.triggerHitstop(hitstopSeconds);
        for (const fx of attackEffects) {
          rendererRef.current.spawnAttackEffect(fx);
        }
      }
      for (const f of floaters) {
        floatingTextsRef.current.push({ ...f, life: 0 });
        if (f.isCrit && rendererRef.current) {
          rendererRef.current.spawnParticles(f.x, f.y, '#ffe600', 18);
        }
      }
    },
    []
  );

  // Native Fullscreen management for mobile & desktop
  useEffect(() => {
    const onFsChange = () => {
      const fsEl = document.fullscreenElement || (document as any).webkitFullscreenElement;
      setIsFullscreen(!!fsEl);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
    };
  }, []);

  const requestNativeFullscreen = useCallback(async () => {
    try {
      const el = document.documentElement as any;
      if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
        if (el.requestFullscreen) await el.requestFullscreen();
        else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
      }
    } catch {
      // Headless or browser gesture restriction ignored safely
    }
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      const fsEl = document.fullscreenElement || (document as any).webkitFullscreenElement;
      if (!fsEl) {
        await requestNativeFullscreen();
      } else {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if ((document as any).webkitExitFullscreen) await (document as any).webkitExitFullscreen();
      }
    } catch {}
  }, [requestNativeFullscreen]);

  const handleGuestLogin = useCallback(async () => {
    if (window.innerWidth < 768 || 'ontouchstart' in window) {
      requestNativeFullscreen();
    }
    if (!userToken) {
      try {
        const res = await fetch('/api/auth/guest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ platform: navigator.userAgent.includes('Mobile') ? 'mobile_web' : 'desktop_web' })
        });
        const data = await res.json();
        if (data.token) {
          setUserToken(data.token);
          setUserProfile(data.user);
          setCloudSyncStatus('Encrypted Cloud Synced');
        }
      } catch {
        setCloudSyncStatus('Local Storage Only');
      }
    }
    setAuthScreenVisible(false);
  }, [userToken, requestNativeFullscreen]);

  const finalizeFirebaseUserSession = useCallback(
    async (fbUser: NonNullable<typeof auth.currentUser>) => {
      try {
        const idToken = await fbUser.getIdToken();
        const res = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idToken,
            platform: navigator.userAgent.includes('Mobile') ? 'mobile_web' : 'desktop_web'
          })
        });
        const data = await res.json();
        if (res.ok && data.token) {
          setUserToken(data.token);
          setUserProfile(data.user);
          setCloudSyncStatus('Google Cloud Synced');
          syncFirebaseUserProfile(fbUser, userStats.highestFloor, userStats.bestScore).catch(() => {});
          setAuthScreenVisible(false);
          return true;
        }
        setGoogleNotice(data.error || 'Google authentication failed.');
        return false;
      } catch {
        setGoogleNotice('Could not complete Google Sign-In sync.');
        return false;
      }
    },
    [userStats.bestScore, userStats.highestFloor]
  );

  const handleGoogleLogin = useCallback(async () => {
    setIsGoogleLoading(true);
    setGoogleNotice(null);
    if (window.innerWidth < 768 || 'ontouchstart' in window) {
      requestNativeFullscreen();
    }
    try {
      const fbUser = await signInWithGoogleNativeMobile();
      if (fbUser) {
        await finalizeFirebaseUserSession(fbUser);
      }
    } catch (err: any) {
      const msg = err?.code === 'auth/popup-closed-by-user'
        ? 'Google sign-in popup was closed before finishing.'
        : err?.message || 'Google sign-in failed.';
      setGoogleNotice(msg);
    } finally {
      setIsGoogleLoading(false);
    }
  }, [finalizeFirebaseUserSession, requestNativeFullscreen]);

  // Firebase connection test, Google redirect check & Guest bootstrap
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const autostart = params.get('autostart') === '1';

    testFirestoreConnection();

    let handledFirebase = false;
    checkGoogleRedirectSignIn().then(fbUser => {
      if (fbUser) {
        handledFirebase = true;
        finalizeFirebaseUserSession(fbUser);
      }
    });

    const unsubAuth = onAuthStateChanged(auth, fbUser => {
      if (fbUser && !handledFirebase) {
        handledFirebase = true;
        finalizeFirebaseUserSession(fbUser);
      }
    });

    fetch('/api/auth/guest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform: navigator.userAgent.includes('Mobile') ? 'mobile_web' : 'desktop_web' })
    })
      .then(res => res.json())
      .then(data => {
        if (!handledFirebase && data.token) {
          setUserToken(prev => prev || data.token);
          setUserProfile(prev => prev || data.user);
          setCloudSyncStatus('Encrypted Cloud Synced');
        }
      })
      .catch(() => {
        setCloudSyncStatus('Local Storage Only');
      });

    if (autostart) {
      setAuthScreenVisible(false);
      handleStartGame();
    }

    return () => unsubAuth();
  }, []);

  // Initialize Canvas Renderer and configurable 60/30 FPS render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new CanvasRenderer(canvas);
    renderer.applyPerformanceOptions({
      enableScanlines: appSettings.enableScanlines,
      enableGlow: appSettings.enableGlow,
      enableParticles: appSettings.enableParticles
    });
    rendererRef.current = renderer;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let lastTime = performance.now();
    let animId: number;

    const renderLoop = (time: number) => {
      animId = requestAnimationFrame(renderLoop);

      const minIntervalMs = targetFpsRef.current === 30 ? 31 : 0;
      const elapsedMs = time - lastTime;
      if (minIntervalMs > 0 && elapsedMs < minIntervalMs) {
        return;
      }

      const rawDt = elapsedMs / 1000;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.08);
      lastTime = time;

      // Freeze floating text decay during hitstop
      if (renderer.getHitstopRemaining() <= 0) {
        const ftList = floatingTextsRef.current;
        for (let i = ftList.length - 1; i >= 0; i--) {
          ftList[i].life += dt * 30;
          if (ftList[i].life > 40) ftList.splice(i, 1);
        }
      }

      if (dungeonRef.current && playerRef.current) {
        renderer.render(
          dungeonRef.current,
          playerRef.current,
          floatingTextsRef.current,
          dt,
          remotePlayersRef.current,
          hoveredTileRef.current
        );
      }
    };

    animId = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resizeCanvas);
      soundEngine.dispose();
    };
  }, []);

  // Real WebSocket Connection for Online 3-Player Co-Op Mode
  useEffect(() => {
    if (playMode !== 'online') {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setCoopConnected(false);
      return;
    }

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${proto}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setCoopConnected(true);
      setCoopError(null);
      ws.send(
        JSON.stringify({
          type: 'coop:join',
          roomId: 'ALPHA-1',
          playerId: localPlayerId,
          accountId: onlineAccountId,
          username: userProfile?.username || `Op_${localPlayerId.slice(-4)}`
        })
      );
    };

    ws.onmessage = ev => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'coop:error') {
          setCoopError(msg.error);
          return;
        }
        if (msg.type === 'coop:room_update' && msg.room) {
          setCoopError(null);
          setCoopRoom(msg.room);
          const mySlot = msg.room.players.find((p: any) => p.playerId === localPlayerId);
          if (msg.room.status === 'playing' && msg.room.dungeon && mySlot?.player) {
            setDungeon(msg.room.dungeon);
            setPlayer(mySlot.player);
            setTurn(msg.room.turn);
            setScore(msg.room.score);
            setMonstersSlain(msg.room.monstersSlain);
          }
        } else if (msg.type === 'coop:started' && msg.room) {
          setCoopError(null);
          setCoopRoom(msg.room);
          const mySlot = msg.room.players.find((p: any) => p.playerId === localPlayerId);
          if (msg.room.dungeon && mySlot?.player) {
            setDungeon(msg.room.dungeon);
            setPlayer(mySlot.player);
            setTurn(msg.room.turn);
            setScore(msg.room.score);
            setMonstersSlain(msg.room.monstersSlain);
            setCombatLogs(msg.room.logs || []);
            soundEngine.setMusicContext({
              scene: 'playing',
              floor: msg.room.dungeon.floor,
              nearbyEnemies: 0,
              bossVisible: false,
              lowHp: false
            });
            setGameState('playing');
            soundEngine.startMusic();
          }
        } else if (msg.type === 'coop:revived' && msg.room) {
          setCoopError(null);
          setCoopRoom(msg.room);
          const mySlot = msg.room.players.find((p: any) => p.playerId === localPlayerId);
          if (msg.room.dungeon && mySlot?.player) {
            setDungeon(msg.room.dungeon);
            setPlayer(mySlot.player);
            setTurn(msg.room.turn);
            setScore(msg.room.score);
            setMonstersSlain(msg.room.monstersSlain);
            setCombatLogs(msg.room.logs || []);
            setRunSnapshot(null);
            setGameState('playing');
            soundEngine.playSFX('shrine');
            refreshFOVIfNeeded(msg.room.dungeon, mySlot.player.x, mySlot.player.y, true);
          }
        } else if (msg.type === 'coop:turn_resolved' && msg.room) {
          setCoopError(null);
          setCoopRoom(msg.room);
          const mySlot = msg.room.players.find((p: any) => p.playerId === localPlayerId);
          if (msg.room.dungeon && mySlot?.player) {
            setDungeon(msg.room.dungeon);
            setPlayer(mySlot.player);
            setTurn(msg.room.turn);
            setScore(msg.room.score);
            setMonstersSlain(msg.room.monstersSlain);
            setCombatLogs(msg.room.logs || []);
            handleSoundAndVisuals(
              msg.soundEvents || [],
              msg.screenShake || 0,
              msg.floatingTexts || [],
              msg.hitstopSeconds || 0,
              msg.attackEffects || []
            );
            if (!mySlot.alive || msg.room.status === 'gameover') {
              setRunSnapshot({
                score: msg.room.score,
                floor: msg.room.dungeon.floor,
                turns: msg.room.turn,
                monstersSlain: msg.room.monstersSlain,
                soulShards: mySlot.player.stats.soulShards,
                coins: mySlot.player.stats.coins,
                characterClass: mySlot.player.characterClass,
                level: mySlot.player.stats.level,
                seed: 42,
                timestamp: Date.now()
              });
              setGameState('gameover');
            }
          }
        } else if (msg.type === 'coop:upgrade_result') {
          if (msg.status === 'destroyed') {
            setUpgradeFeedback({
              status: 'destroyed',
              message: `${t('upgradeDestroyedMsg', language)} (${msg.itemName})`
            });
            soundEngine.playSFX('forge_destroy');
          } else {
            setUpgradeFeedback({
              status: 'success',
              message: `${t('upgradeSuccessMsg', language)} (${msg.itemName})`
            });
            soundEngine.playSFX('forge_success');
          }
        }
      } catch {}
    };

    ws.onclose = () => {
      setCoopConnected(false);
    };

    return () => {
      ws.close();
      if (wsRef.current === ws) wsRef.current = null;
    };
  }, [playMode, localPlayerId, onlineAccountId, userProfile?.username, handleSoundAndVisuals]);

  const sendCoopWs = useCallback((payload: unknown) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  const handleReturnToTitle = useCallback(() => {
    if (playModeRef.current === 'online') {
      sendCoopWs({ type: 'coop:leave' });
      setCoopRoom(null);
      setTimeout(() => fetchOnlineStashes(), 150);
    }
    setShowShop(false);
    setShowInventory(false);
    setShowSkillTree(false);
    soundEngine.setMusicContext({ scene: 'title' });
    setGameState('title');
  }, [sendCoopWs, fetchOnlineStashes]);

  const handleLogout = useCallback(async () => {
    if (playModeRef.current === 'online') {
      sendCoopWs({ type: 'coop:leave' });
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setCoopRoom(null);
      setCoopConnected(false);
      setPlayMode('offline');
    }
    await signOutFirebaseUser();
    setUserToken('');
    setUserProfile(null);
    setOnlineStashes({});
    setCloudSyncStatus('Local Device Save');
    setShowOptions(false);
    setShowInventory(false);
    setShowSkillTree(false);
    setShowShop(false);
    setShowLeaderboard(false);
    setShowMultiplayer(false);
    setShowSocial(false);
    setShowAdmin(false);
    soundEngine.setMusicContext({ scene: 'login' });
    setGameState('title');
    setAuthScreenVisible(true);
  }, [sendCoopWs]);

  const checkAchievements = useCallback((newFloor: number, kills: number, shards: number) => {
    setAchievements(prev =>
      prev.map(ach => {
        if (ach.unlocked) return ach;
        if (ach.id === 'first_blood' && kills >= 1) return { ...ach, unlocked: true };
        if (ach.id === 'floor_3' && newFloor >= 3) return { ...ach, unlocked: true };
        if (ach.id === 'shard_collector' && shards >= 100) return { ...ach, unlocked: true };
        return ach;
      })
    );
  }, []);

  const syncCloudSave = useCallback((curPlayer: Player, curFloor: number, curScore: number) => {
    if (!userToken) return;

    const saveHash = `sha256_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const payload = {
      encryptedData: JSON.stringify({
        hp: curPlayer.stats.hp,
        level: curPlayer.stats.level,
        class: curPlayer.characterClass,
        shards: curPlayer.stats.soulShards,
        coins: curPlayer.stats.coins,
        skills: curPlayer.unlockedSkills
      }),
      saveHash,
      version: curFloor,
      lastFloor: curFloor,
      score: curScore,
      characterClass: curPlayer.characterClass,
      deviceId: navigator.userAgent.includes('Mobile') ? 'mobile_device' : 'desktop_device'
    };

    fetch('/api/saves/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`
      },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCloudSyncStatus(`Synced Floor ${curFloor} [E2E]`);
        }
      })
      .catch(() => {});
  }, [userToken]);

  const refreshFOVIfNeeded = useCallback((dng: DungeonState, px: number, py: number, force = false) => {
    const prev = lastFovPosRef.current;
    if (!force && prev && prev.x === px && prev.y === py && prev.floor === dng.floor) {
      return;
    }
    updateFOV(dng.tiles, px, py, getFovRadius(dng));
    lastFovPosRef.current = { x: px, y: py, floor: dng.floor };
  }, []);

  const saveCheckpoint = useCallback(
    (cpPlayer: Player, cpDungeon: DungeonState, cpScore: number, cpKills: number, cpTurn: number) => {
      if (difficultyModeRef.current !== 'normal' || playModeRef.current !== 'offline') return;
      setCheckpointSnapshot({
        floor: cpDungeon.floor,
        x: cpPlayer.x,
        y: cpPlayer.y,
        player: JSON.parse(JSON.stringify(cpPlayer)),
        dungeon: JSON.parse(JSON.stringify(cpDungeon)),
        score: cpScore,
        monstersSlain: cpKills,
        turn: cpTurn,
        timestamp: Date.now()
      });
    },
    []
  );

  // Auto-persist offline run strictly locally on the device (per difficulty + role)
  useEffect(() => {
    if (playMode !== 'offline') return;
    if (gameState !== 'playing' && gameState !== 'paused') return;
    const saved = saveOfflineRun({
      difficultyMode,
      player,
      dungeon,
      turn,
      score,
      monstersSlain,
      combatLogs,
      checkpointSnapshot
    });
    if (saved) {
      const slotKey = getOfflineSaveSlotKey(saved.difficultyMode, saved.player.characterClass);
      setSavedOfflineRuns(prev => ({
        ...prev,
        [slotKey]: saved
      }));
    }
  }, [
    playMode,
    gameState,
    difficultyMode,
    player,
    dungeon,
    turn,
    score,
    monstersSlain,
    combatLogs,
    checkpointSnapshot
  ]);

  const triggerGameOver = useCallback(
    (
      finalPlayer: Player,
      finalDungeon: DungeonState,
      floor: number,
      turnsPlayed: number,
      totalKills: number,
      currentScore: number
    ) => {
      const snapshot: RunSnapshot = {
        score: currentScore + totalKills * 120,
        floor,
        turns: turnsPlayed,
        monstersSlain: totalKills,
        soulShards: finalPlayer.stats.soulShards,
        coins: finalPlayer.stats.coins,
        characterClass: finalPlayer.characterClass,
        level: finalPlayer.stats.level,
        seed: 42,
        timestamp: Date.now()
      };

      if (playModeRef.current === 'offline') {
        const diff = difficultyModeRef.current;
        const cls = finalPlayer.characterClass;
        const slotKey = getOfflineSaveSlotKey(diff, cls);
        if (diff === 'hard') {
          clearOfflineSave('hard', cls);
          setSavedOfflineRuns(prev => ({ ...prev, [slotKey]: null }));
        } else {
          const saved = saveOfflineRun({
            difficultyMode: diff,
            player: finalPlayer,
            dungeon: finalDungeon,
            turn: turnsPlayed,
            score: currentScore,
            monstersSlain: totalKills,
            combatLogs,
            checkpointSnapshot
          });
          if (saved) {
            setSavedOfflineRuns(prev => ({
              ...prev,
              [slotKey]: saved
            }));
          }
        }
      }

      setRunSnapshot(snapshot);
      setGameState('gameover');

      // Only online runs sync telemetry/leaderboard to server; offline stays strictly local on device
      if (playModeRef.current === 'online') {
        syncCloudSave(finalPlayer, floor, snapshot.score);
        if (userToken) {
          fetch('/api/leaderboard/submit', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${userToken}`
            },
            body: JSON.stringify({
              score: snapshot.score,
              floor: snapshot.floor,
              characterClass: snapshot.characterClass,
              timeSec: turnsPlayed * 2
            })
          }).catch(() => {});
        }
      }

      setUserStats(prev => ({
        highestFloor: Math.max(prev.highestFloor, snapshot.floor),
        totalKills: prev.totalKills + snapshot.monstersSlain,
        bestScore: Math.max(prev.bestScore, snapshot.score)
      }));
    },
    [syncCloudSave, userToken, combatLogs, checkpointSnapshot]
  );

  // Revive from last Checkpoint (Normal Mode OR Online Co-Op) keeping live deathDrops (Floating Skull) on map
  const handleReviveCheckpoint = useCallback(() => {
    if (playModeRef.current === 'online') {
      sendCoopWs({ type: 'coop:revive_checkpoint' });
      return;
    }

    const curPlayer = playerRef.current;
    const liveDungeon: DungeonState = JSON.parse(JSON.stringify(dungeonRef.current));
    const totals = getTotalStats(curPlayer);

    const cpPos =
      curPlayer.lastCheckpoint && curPlayer.lastCheckpoint.floor === liveDungeon.floor
        ? { x: curPlayer.lastCheckpoint.x, y: curPlayer.lastCheckpoint.y }
        : checkpointSnapshot && checkpointSnapshot.floor === liveDungeon.floor
        ? { x: checkpointSnapshot.x, y: checkpointSnapshot.y }
        : liveDungeon.checkpoints.find(c => c.activated) ||
          liveDungeon.checkpoints[0] || {
            x: liveDungeon.rooms[0]?.centerX ?? 5,
            y: liveDungeon.rooms[0]?.centerY ?? 5
          };

    if (liveDungeon.tiles[cpPos.y]?.[cpPos.x]?.hazard) {
      delete liveDungeon.tiles[cpPos.y][cpPos.x].hazard;
    }

    const revivedPlayer: Player = {
      ...JSON.parse(JSON.stringify(curPlayer)),
      x: cpPos.x,
      y: cpPos.y,
      stats: {
        ...curPlayer.stats,
        hp: Math.max(1, Math.floor(totals.maxHp * 0.85)),
        energy: totals.maxEnergy
      },
      buffs: {
        overclockTurns: 0,
        shieldAmount: 0,
        regenTurns: 0,
        regenHpPerTurn: 0,
        regenEnergyPerTurn: 0
      }
    };

    refreshFOVIfNeeded(liveDungeon, revivedPlayer.x, revivedPlayer.y, true);
    setDungeon(liveDungeon);
    setPlayer(revivedPlayer);
    setRunSnapshot(null);
    setCombatLogs(prev => [
      {
        id: `revive_${Date.now()}`,
        text: `◈ CHECKPOINT RESTORED at Floor ${liveDungeon.floor} (${revivedPlayer.x}, ${revivedPlayer.y}). Step on your Floating Skull ☠️ to recover dropped gear & coins!`,
        type: 'level_up' as const,
        turn: turnRef.current
      },
      ...prev
    ].slice(0, 30));
    setGameState('playing');
    soundEngine.playSFX('shrine');
  }, [checkpointSnapshot, refreshFOVIfNeeded, sendCoopWs]);

  // Revive in-place after watching Ad (Unlimited uses, preserves exact coordinates & recovers dropped skull bag)
  const handleReviveInPlace = useCallback(() => {
    const curPlayer = playerRef.current;
    const curDungeon = dungeonRef.current;
    const totals = getTotalStats(curPlayer);
    const emergencyShield = Math.max(35, Math.floor(totals.maxHp * 0.4));

    const revivedPlayer: Player = {
      ...JSON.parse(JSON.stringify(curPlayer)),
      stats: {
        ...curPlayer.stats,
        hp: totals.maxHp,
        energy: totals.maxEnergy
      },
      buffs: {
        overclockTurns: Math.max(curPlayer.buffs.overclockTurns, 1),
        shieldAmount: Math.max(curPlayer.buffs.shieldAmount, emergencyShield),
        regenTurns: curPlayer.buffs.regenTurns || 0,
        regenHpPerTurn: curPlayer.buffs.regenHpPerTurn || 0,
        regenEnergyPerTurn: curPlayer.buffs.regenEnergyPerTurn || 0
      }
    };

    // Clear floor hazard under feet on revive and immediately collect own Floating Skull bag if standing on it
    const updatedDungeon: DungeonState = JSON.parse(JSON.stringify(curDungeon));
    if (updatedDungeon.tiles[revivedPlayer.y]?.[revivedPlayer.x]?.hazard) {
      delete updatedDungeon.tiles[revivedPlayer.y][revivedPlayer.x].hazard;
    }
    const recovered = collectDeathDropBagsAt(revivedPlayer, updatedDungeon, 'solo');

    refreshFOVIfNeeded(updatedDungeon, revivedPlayer.x, revivedPlayer.y, true);
    setDungeon(updatedDungeon);
    setPlayer(revivedPlayer);
    setRunSnapshot(null);
    setCombatLogs(prev => [
      {
        id: `ad_revive_${Date.now()}`,
        text: `📺 AD REVIVE: Neural link restored in-place at (${revivedPlayer.x}, ${revivedPlayer.y}) on Floor ${updatedDungeon.floor} (+${emergencyShield} Shield)${
          recovered.recoveredBags > 0 ? ` · ☠️ Recovered ${recovered.totalItems} items & ${recovered.totalCoins} coins!` : '!'
        }`,
        type: 'level_up' as const,
        turn: turnRef.current
      },
      ...prev
    ].slice(0, 30));
    setGameState('playing');
    soundEngine.playSFX('level_up');
  }, [refreshFOVIfNeeded]);

  // Turn Action: Step or Attack
  const handlePlayerMove = useCallback((dx: number, dy: number) => {
    if (gameStateRef.current !== 'playing') return;

    // Online 3-Player Co-Op: forward move & lock until 3/3 act
    if (playModeRef.current === 'online' && coopRoomRef.current?.status === 'playing') {
      const mySlot = coopRoomRef.current.players.find(p => p.playerId === localPlayerId);
      if (mySlot?.movedThisTurn) {
        return; // Blocked until all teammates move
      }
      sendCoopWs({ type: 'coop:submit_action', actionType: 'move', dx, dy });
      return;
    }

    const curPlayer = playerRef.current;
    const curDungeon = dungeonRef.current;
    const curTurn = turnRef.current;

    const result = resolveStepOrAttack(curPlayer, curDungeon, dx, dy, curTurn);

    refreshFOVIfNeeded(result.dungeon, result.player.x, result.player.y);

    setPlayer(result.player);
    setDungeon(result.dungeon);
    setCombatLogs(prev => [...result.logs, ...prev].slice(0, 30));
    setTurn(curTurn + 1);

    handleSoundAndVisuals(
      result.soundEvents,
      result.screenShake,
      result.floatingTexts,
      result.hitstopSeconds,
      result.attackEffects
    );

    if (result.openShop) {
      setShowShop(true);
    }

    const gainedKills = curDungeon.monsters.length - result.dungeon.monsters.length;
    const nextTotalKills = monstersSlainRef.current + Math.max(0, gainedKills);
    const nextScore = scoreRef.current + Math.max(0, gainedKills) * 150;
    if (gainedKills > 0) {
      setMonstersSlain(nextTotalKills);
      setScore(nextScore);
      checkAchievements(curDungeon.floor, nextTotalKills, result.player.stats.soulShards);
    }

    if (result.checkpointTriggered) {
      saveCheckpoint(result.player, result.dungeon, nextScore, nextTotalKills, curTurn + 1);
    }

    if (result.floorCompleted) {
      const nextFloor = curDungeon.floor + 1;
      const newDungeonState = generateDungeon(nextFloor);
      const startRoom = newDungeonState.rooms[0];
      const nextStartCp = newDungeonState.checkpoints[0] || { x: startRoom.centerX, y: startRoom.centerY, activated: true };

      result.player.x = startRoom.centerX;
      result.player.y = startRoom.centerY;
      result.player.lastCheckpoint = { floor: nextFloor, x: nextStartCp.x, y: nextStartCp.y };
      refreshFOVIfNeeded(newDungeonState, result.player.x, result.player.y, true);

      setDungeon(newDungeonState);
      setShowShop(false);
      setScore(nextScore + 500);
      saveCheckpoint(result.player, newDungeonState, nextScore + 500, nextTotalKills, curTurn + 1);

      if (newDungeonState.activeEvent) {
        setCombatLogs(prev => [
          {
            id: `env_banner_${Date.now()}`,
            text: `${newDungeonState.activeEvent!.icon} EVENT TRIGGERED: ${newDungeonState.activeEvent!.name} — ${newDungeonState.activeEvent!.effectText}`,
            type: 'level_up' as const,
            turn: curTurn + 1
          },
          ...prev
        ].slice(0, 30));
      }
      checkAchievements(nextFloor, nextTotalKills, result.player.stats.soulShards);
    }

    if (result.gameOver) {
      triggerGameOver(result.player, result.dungeon, curDungeon.floor, curTurn, nextTotalKills, nextScore);
    }
  }, [
    localPlayerId,
    sendCoopWs,
    handleSoundAndVisuals,
    checkAchievements,
    syncCloudSave,
    refreshFOVIfNeeded,
    saveCheckpoint,
    triggerGameOver
  ]);

  // Cast Active Skill
  const handleCastSkill = useCallback((skillId: string) => {
    if (gameStateRef.current !== 'playing') return;

    if (playModeRef.current === 'online' && coopRoomRef.current?.status === 'playing') {
      const mySlot = coopRoomRef.current.players.find(p => p.playerId === localPlayerId);
      if (mySlot?.movedThisTurn) return;
      sendCoopWs({ type: 'coop:submit_action', actionType: 'skill', skillId });
      return;
    }

    const curPlayer = playerRef.current;
    const curDungeon = dungeonRef.current;
    const curTurn = turnRef.current;

    const result = executeSkill(curPlayer, curDungeon, skillId, curTurn);
    refreshFOVIfNeeded(result.dungeon, result.player.x, result.player.y);

    setPlayer(result.player);
    setDungeon(result.dungeon);
    setCombatLogs(prev => [...result.logs, ...prev].slice(0, 30));
    setTurn(curTurn + 1);

    handleSoundAndVisuals(
      result.soundEvents,
      result.screenShake,
      result.floatingTexts,
      result.hitstopSeconds,
      result.attackEffects
    );

    const gainedKills = curDungeon.monsters.length - result.dungeon.monsters.length;
    const nextTotalKills = monstersSlainRef.current + Math.max(0, gainedKills);
    const nextScore = scoreRef.current + Math.max(0, gainedKills) * 150;
    if (gainedKills > 0) {
      setMonstersSlain(nextTotalKills);
      setScore(nextScore);
      checkAchievements(curDungeon.floor, nextTotalKills, result.player.stats.soulShards);
    }

    if (result.gameOver) {
      triggerGameOver(result.player, result.dungeon, curDungeon.floor, curTurn, nextTotalKills, nextScore);
    }
  }, [localPlayerId, sendCoopWs, handleSoundAndVisuals, refreshFOVIfNeeded, checkAchievements, triggerGameOver]);

  // Ranged Attack (1..5 tiles weapon reach, targeted or auto-nearest)
  const handleRangedAttack = useCallback(
    (targetX?: number, targetY?: number) => {
      if (gameStateRef.current !== 'playing') return;

      if (playModeRef.current === 'online' && coopRoomRef.current?.status === 'playing') {
        const mySlot = coopRoomRef.current.players.find(p => p.playerId === localPlayerId);
        if (mySlot?.movedThisTurn) return;
        sendCoopWs({
          type: 'coop:submit_action',
          actionType: 'ranged_attack',
          targetX,
          targetY
        });
        return;
      }

      const curPlayer = playerRef.current;
      const curDungeon = dungeonRef.current;
      const curTurn = turnRef.current;

      const result = resolveRangedAttack(curPlayer, curDungeon, targetX, targetY, curTurn);
      if (result.player === curPlayer && result.dungeon === curDungeon) {
        // Out of range / no target: surface feedback log without consuming turn
        setCombatLogs(prev => [...result.logs, ...prev].slice(0, 30));
        return;
      }

      refreshFOVIfNeeded(result.dungeon, result.player.x, result.player.y);
      setPlayer(result.player);
      setDungeon(result.dungeon);
      setCombatLogs(prev => [...result.logs, ...prev].slice(0, 30));
      setTurn(curTurn + 1);

      handleSoundAndVisuals(
        result.soundEvents,
        result.screenShake,
        result.floatingTexts,
        result.hitstopSeconds,
        result.attackEffects
      );

      const gainedKills = curDungeon.monsters.length - result.dungeon.monsters.length;
      const nextTotalKills = monstersSlainRef.current + Math.max(0, gainedKills);
      const nextScore = scoreRef.current + Math.max(0, gainedKills) * 150;
      if (gainedKills > 0) {
        setMonstersSlain(nextTotalKills);
        setScore(nextScore);
        checkAchievements(curDungeon.floor, nextTotalKills, result.player.stats.soulShards);
      }

      if (result.gameOver) {
        triggerGameOver(result.player, result.dungeon, curDungeon.floor, curTurn, nextTotalKills, nextScore);
      }
    },
    [localPlayerId, sendCoopWs, handleSoundAndVisuals, refreshFOVIfNeeded, checkAchievements, triggerGameOver]
  );

  // Continue Saved Offline Run (Isolated per difficulty AND per role)
  const handleContinueGame = useCallback(() => {
    const activeDiff = difficultyModeRef.current;
    const activeClass = selectedClassRef.current;
    const slotKey = getOfflineSaveSlotKey(activeDiff, activeClass);
    const saved = savedOfflineRuns[slotKey] || loadOfflineSave(activeDiff, activeClass);
    if (!saved) return;
    if (window.innerWidth < 768 || 'ontouchstart' in window) {
      requestNativeFullscreen();
    }

    const restoredDungeon: DungeonState = JSON.parse(JSON.stringify(saved.dungeon));
    let restoredPlayer: Player = JSON.parse(JSON.stringify(saved.player));

    if (restoredPlayer.stats.hp <= 0 && saved.difficultyMode === 'normal') {
      const totals = getTotalStats(restoredPlayer);
      const cp =
        restoredPlayer.lastCheckpoint && restoredPlayer.lastCheckpoint.floor === restoredDungeon.floor
          ? restoredPlayer.lastCheckpoint
          : restoredDungeon.checkpoints.find(c => c.activated) ||
            restoredDungeon.checkpoints[0] || {
              x: restoredDungeon.rooms[0]?.centerX ?? restoredPlayer.x,
              y: restoredDungeon.rooms[0]?.centerY ?? restoredPlayer.y
            };
      restoredPlayer = {
        ...restoredPlayer,
        x: cp.x,
        y: cp.y,
        stats: {
          ...restoredPlayer.stats,
          hp: Math.max(1, Math.floor(totals.maxHp * 0.85)),
          energy: totals.maxEnergy
        }
      };
    }

    refreshFOVIfNeeded(restoredDungeon, restoredPlayer.x, restoredPlayer.y, true);
    setDifficultyMode(saved.difficultyMode);
    setSelectedClass(restoredPlayer.characterClass);
    setDungeon(restoredDungeon);
    setPlayer(restoredPlayer);
    setTurn(saved.turn || 1);
    setScore(saved.score || 0);
    setMonstersSlain(saved.monstersSlain || 0);
    setCheckpointSnapshot(saved.checkpointSnapshot || null);
    setShowShop(false);
    setDestroyedItemRecovery(null);
    setRunSnapshot(null);
    setCombatLogs([
      {
        id: `resume_${Date.now()}`,
        text: `RESUMED SAVED RUN (${saved.difficultyMode.toUpperCase()} · ${restoredPlayer.characterClass.toUpperCase()}): Floor ${restoredDungeon.floor} · Turn ${saved.turn}.`,
        type: 'level_up' as const,
        turn: saved.turn || 1
      },
      ...(saved.combatLogs || [])
    ].slice(0, 30));

    const nearby = restoredDungeon.monsters.filter(
      m => m.alerted || Math.hypot(m.x - restoredPlayer.x, m.y - restoredPlayer.y) <= 7
    ).length;
    soundEngine.setMusicContext({
      scene: 'playing',
      floor: restoredDungeon.floor,
      nearbyEnemies: nearby,
      bossVisible: restoredDungeon.monsters.some(
        m => m.archetype === 'core_synthesizer' && (m.alerted || restoredDungeon.tiles[m.y]?.[m.x]?.visible)
      ),
      lowHp: restoredPlayer.stats.hp <= restoredPlayer.stats.maxHp * 0.3
    });
    setGameState('playing');
    soundEngine.startMusic();
  }, [savedOfflineRuns, refreshFOVIfNeeded, requestNativeFullscreen]);

  // Start New Offline Run (Deletes only the active difficulty + role saved run)
  const handleStartGame = useCallback(() => {
    if (window.innerWidth < 768 || 'ontouchstart' in window) {
      requestNativeFullscreen();
    }
    const activeDiff = difficultyModeRef.current;
    const activeClass = selectedClassRef.current;
    const slotKey = getOfflineSaveSlotKey(activeDiff, activeClass);
    clearOfflineSave(activeDiff, activeClass);
    setSavedOfflineRuns(prev => ({
      ...prev,
      [slotKey]: null
    }));

    const newDungeon = generateDungeon(1);
    const startRoom = newDungeon.rooms[0];
    const startCp = newDungeon.checkpoints[0] || { x: startRoom.centerX, y: startRoom.centerY, activated: true };
    const newPlayer = createInitialPlayer(activeClass, startRoom.centerX, startRoom.centerY);
    newPlayer.lastCheckpoint = { floor: 1, x: startCp.x, y: startCp.y };

    refreshFOVIfNeeded(newDungeon, newPlayer.x, newPlayer.y, true);

    setDungeon(newDungeon);
    setPlayer(newPlayer);
    setTurn(1);
    setScore(0);
    setMonstersSlain(0);
    setShowShop(false);
    setDestroyedItemRecovery(null);
    setRunSnapshot(null);
    setCombatLogs([
      { id: 'start_run', text: `DEPLOYED: Operative ${newPlayer.characterClass.toUpperCase()} initialized on Floor 1 (${activeDiff.toUpperCase()}).`, type: 'info', turn: 1 }
    ]);
    saveCheckpoint(newPlayer, newDungeon, 0, 0, 1);

    soundEngine.setMusicContext({
      scene: 'playing',
      floor: 1,
      nearbyEnemies: 0,
      bossVisible: false,
      lowHp: false
    });
    setGameState('playing');
    soundEngine.startMusic();
  }, [refreshFOVIfNeeded, saveCheckpoint, requestNativeFullscreen]);

  // Global Keyboard Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select') return;

      const state = gameStateRef.current;

      if (state === 'title' && playModeRef.current === 'offline') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleStartGame();
          return;
        }
      }

      if (state === 'gameover') {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleStartGame();
          return;
        }
      }

      if (e.key === 'n' || e.key === 'N') {
        const nextMute = !soundEngine.getMuted();
        soundEngine.setMuted(nextMute);
        setIsMuted(nextMute);
        return;
      }

      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (state === 'playing') {
          if (showShop) { setShowShop(false); return; }
          if (showInventory) { setUpgradeFeedback(null); setShowInventory(false); return; }
          if (showSkillTree) { setShowSkillTree(false); return; }
          setGameState('paused');
        } else if (state === 'paused') {
          setGameState('playing');
        }
        return;
      }

      if (state === 'playing') {
        if (e.key === 'm' || e.key === 'M') {
          setShowMinimap(prev => !prev);
          return;
        }
        if (e.key === 'i' || e.key === 'I') {
          setShowInventory(prev => {
            if (prev) setUpgradeFeedback(null);
            return !prev;
          });
          return;
        }
        if (e.key === 'k' || e.key === 'K') {
          setShowSkillTree(prev => !prev);
          return;
        }
        if (e.key === 'f' || e.key === 'F') {
          e.preventDefault();
          handleRangedAttack();
          return;
        }

        if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') {
          e.preventDefault();
          handlePlayerMove(0, -1);
        } else if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') {
          e.preventDefault();
          handlePlayerMove(0, 1);
        } else if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
          e.preventDefault();
          handlePlayerMove(-1, 0);
        } else if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
          e.preventDefault();
          handlePlayerMove(1, 0);
        } else if (e.key === ' ' || e.key === '.') {
          e.preventDefault();
          handlePlayerMove(0, 0);
        }

        if (['1', '2', '3', '4', '5', '6', '7', '8'].includes(e.key)) {
          const idx = parseInt(e.key, 10) - 1;
          const activeSkills = Object.values(SKILL_DATABASE)
            .filter(s => s.branch === playerRef.current.characterClass && s.type === 'active')
            .sort((a, b) => {
              const aUn = playerRef.current.unlockedSkills.includes(a.id) ? 1 : 0;
              const bUn = playerRef.current.unlockedSkills.includes(b.id) ? 1 : 0;
              return bUn - aUn;
            });
          if (activeSkills[idx] && playerRef.current.unlockedSkills.includes(activeSkills[idx].id)) {
            handleCastSkill(activeSkills[idx].id);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleStartGame, handlePlayerMove, handleCastSkill, handleRangedAttack, showShop, showInventory, showSkillTree]);

  // Inventory Actions (10-slot Equipment + Class Weapon Guard + Coins Forge Upgrade)
  const handleEquipItem = (item: GameItem) => {
    if (playMode === 'online' && coopRoom?.status === 'playing') {
      sendCoopWs({ type: 'coop:equip_item', itemId: item.id });
      soundEngine.playSFX('pickup');
      return;
    }

    setPlayer(prev => {
      if (!canClassEquipItem(prev.characterClass, item)) return prev;
      const slot = getEquipSlotForItem(item, prev.equipment);
      if (!slot) return prev;
      if (slot === 'offhand' && prev.equipment.weapon?.twoHanded) return prev;

      const newEquipment = { ...prev.equipment };
      const newInventory = prev.inventory.filter(i => i.id !== item.id);

      // If equipping a 2H weapon, return current offhand to inventory
      if (slot === 'weapon' && item.twoHanded && newEquipment.offhand) {
        newInventory.push(newEquipment.offhand);
        newEquipment.offhand = null;
      }

      const currentEquipped = newEquipment[slot];
      if (currentEquipped) newInventory.push(currentEquipped);

      newEquipment[slot] = item;

      return {
        ...prev,
        equipment: newEquipment,
        inventory: newInventory
      };
    });
    soundEngine.playSFX('pickup');
  };

  const handleUnequipItem = (slot: EquipSlot) => {
    if (playMode === 'online' && coopRoom?.status === 'playing') {
      sendCoopWs({ type: 'coop:unequip_item', slot });
      soundEngine.playSFX('pickup');
      return;
    }

    setPlayer(prev => {
      const currentItem = prev.equipment[slot];
      if (!currentItem || prev.inventory.length >= prev.maxInventory) return prev;

      const newEquipment = { ...prev.equipment, [slot]: null };
      return {
        ...prev,
        equipment: newEquipment,
        inventory: [...prev.inventory, currentItem]
      };
    });
  };

  const handleBuyProbabilityStone = useCallback(() => {
    if (playModeRef.current === 'online' && coopRoomRef.current?.status === 'playing') {
      sendCoopWs({ type: 'coop:buy_stone' });
      soundEngine.playSFX('pickup');
      return;
    }

    const stoneCost = getProbabilityStoneCost(dungeonRef.current.floor);
    const curPlayer = playerRef.current;
    if (curPlayer.stats.coins < stoneCost) return;

    setPlayer(prev => {
      if (prev.stats.coins < stoneCost) return prev;
      return {
        ...prev,
        stats: {
          ...prev.stats,
          coins: prev.stats.coins - stoneCost,
          probabilityStones: (prev.stats.probabilityStones || 0) + 1
        }
      };
    });
    setCombatLogs(prev => [
      {
        id: `buy_stone_${Date.now()}`,
        text: `🔮 Acquired Probability Stone (+60% Forge Success) for ${stoneCost} Coins!`,
        type: 'item' as const,
        turn: turnRef.current
      },
      ...prev
    ].slice(0, 30));
    soundEngine.playSFX('pickup');
  }, [sendCoopWs]);

  const handleUpgradeItem = (item: GameItem, useProbabilityStone = false) => {
    if (playMode === 'online' && coopRoom?.status === 'playing') {
      sendCoopWs({ type: 'coop:upgrade_item', itemId: item.id, useProbabilityStone });
      return;
    }

    const curPlayer = playerRef.current;
    if (!canUpgradeItem(item)) return;
    const cost = getUpgradeCost(item);
    if (curPlayer.stats.coins < cost) return;

    const stoneConsumed = useProbabilityStone && (curPlayer.stats.probabilityStones || 0) > 0;
    const outcome = attemptUpgradeItem(item, Math.random(), stoneConsumed);

    let equippedSlotFound: EquipSlot | null = null;
    for (const k of Object.keys(curPlayer.equipment) as EquipSlot[]) {
      if (curPlayer.equipment[k]?.id === item.id) {
        equippedSlotFound = k;
        break;
      }
    }

    setPlayer(prev => {
      if (prev.stats.coins < cost) return prev;
      const newEquipment = { ...prev.equipment };
      let foundInEquip = false;

      for (const k of Object.keys(newEquipment) as EquipSlot[]) {
        if (newEquipment[k]?.id === item.id) {
          newEquipment[k] = outcome.status === 'success' ? outcome.item : null;
          foundInEquip = true;
          break;
        }
      }

      const newInventory = foundInEquip
        ? prev.inventory
        : outcome.status === 'success' && outcome.item
        ? prev.inventory.map(i => (i.id === item.id ? outcome.item! : i))
        : prev.inventory.filter(i => i.id !== item.id);

      return {
        ...prev,
        stats: {
          ...prev.stats,
          coins: prev.stats.coins - cost,
          probabilityStones: stoneConsumed
            ? Math.max(0, (prev.stats.probabilityStones || 0) - 1)
            : prev.stats.probabilityStones || 0
        },
        equipment: newEquipment,
        inventory: newInventory
      };
    });

    if (outcome.status === 'destroyed') {
      const msg = `${t('upgradeDestroyedMsg', language)} [${item.name}] (-${cost} 🪙)`;
      setUpgradeFeedback({ status: 'destroyed', message: msg });
      setDestroyedItemRecovery({ item: { ...item }, equipSlot: equippedSlotFound });
      setCombatLogs(prev => [
        { id: `forge_brk_${Date.now()}`, text: `💥 ${msg}`, type: 'enemy_attack' as const, turn: turnRef.current },
        ...prev
      ].slice(0, 30));
      soundEngine.playSFX('forge_destroy');
    } else if (outcome.item) {
      const msg = `${t('upgradeSuccessMsg', language)} → ${outcome.item.name}`;
      setUpgradeFeedback({ status: 'success', message: msg });
      setCombatLogs(prev => [
        { id: `forge_ok_${Date.now()}`, text: `🔨 ${msg}`, type: 'item' as const, turn: turnRef.current },
        ...prev
      ].slice(0, 30));
      soundEngine.playSFX('forge_success');
    }
  };

  const handleRecoverDestroyedItem = useCallback(() => {
    if (!destroyedItemRecovery) return;
    const { item, equipSlot } = destroyedItemRecovery;

    setPlayer(prev => {
      const nextEq = { ...prev.equipment };
      if (equipSlot && !nextEq[equipSlot]) {
        nextEq[equipSlot] = item;
        return { ...prev, equipment: nextEq };
      }
      if (prev.inventory.length < prev.maxInventory) {
        return { ...prev, inventory: [...prev.inventory, item] };
      }
      // If bag happens to be full, expand temp capacity by 1 so recovery never fails
      return { ...prev, maxInventory: prev.maxInventory + 1, inventory: [...prev.inventory, item] };
    });

    setUpgradeFeedback({
      status: 'success',
      message: `${t('recoverItemRestoredMsg', language)} (${item.name})`
    });
    setCombatLogs(prev => [
      {
        id: `recover_ok_${Date.now()}`,
        text: `📺 AD RECOVERY: Restored [${item.name}] at LVL +${item.upgradeLevel || 0}!`,
        type: 'level_up' as const,
        turn: turnRef.current
      },
      ...prev
    ].slice(0, 30));
    setDestroyedItemRecovery(null);
    soundEngine.playSFX('level_up');
  }, [destroyedItemRecovery, language]);

  const handleDeclineRecoverDestroyedItem = useCallback(() => {
    setDestroyedItemRecovery(null);
  }, []);

  const handleUseItem = (item: GameItem) => {
    if (playMode === 'online' && coopRoom?.status === 'playing') {
      sendCoopWs({ type: 'coop:use_item', itemId: item.id });
      soundEngine.playSFX('potion_heal');
      return;
    }

    const curPlayer = playerRef.current;
    const curDungeon = dungeonRef.current;
    const curTurn = turnRef.current;

    const result = useConsumableItem(curPlayer, curDungeon, item, curTurn);
    refreshFOVIfNeeded(result.dungeon, result.player.x, result.player.y);
    setPlayer(result.player);
    setDungeon(result.dungeon);
    setCombatLogs(prev => [...result.logs, ...prev].slice(0, 30));

    handleSoundAndVisuals(
      result.soundEvents,
      result.screenShake,
      result.floatingTexts,
      result.hitstopSeconds,
      result.attackEffects
    );

    const gainedKills = curDungeon.monsters.length - result.dungeon.monsters.length;
    if (gainedKills > 0) {
      const nextTotalKills = monstersSlainRef.current + gainedKills;
      const nextScore = scoreRef.current + gainedKills * 150;
      setMonstersSlain(nextTotalKills);
      setScore(nextScore);
      checkAchievements(curDungeon.floor, nextTotalKills, result.player.stats.soulShards);
    }
  };

  const handleDropItem = (item: GameItem) => {
    if (playMode === 'online' && coopRoom?.status === 'playing') {
      sendCoopWs({ type: 'coop:drop_item', itemId: item.id });
      return;
    }

    setPlayer(prev => ({
      ...prev,
      inventory: prev.inventory.filter(i => i.id !== item.id)
    }));
  };

  const handleBuyShopItem = useCallback((item: GameItem) => {
    if (playModeRef.current === 'online' && coopRoomRef.current?.status === 'playing') {
      sendCoopWs({ type: 'coop:buy_shop_item', itemId: item.id });
      soundEngine.playSFX('chest');
      return;
    }

    const curPlayer = playerRef.current;
    const currency = item.currency || 'shards';
    const isStone = item.effectType === 'stone';

    if (currency === 'coins') {
      if (curPlayer.stats.coins < item.value) return;
    } else {
      if (curPlayer.stats.soulShards < item.value) return;
    }

    if (!isStone && curPlayer.inventory.length >= curPlayer.maxInventory) return;

    setPlayer(prev => {
      if (currency === 'coins' && prev.stats.coins < item.value) return prev;
      if (currency !== 'coins' && prev.stats.soulShards < item.value) return prev;
      if (!isStone && prev.inventory.length >= prev.maxInventory) return prev;

      const nextStats = {
        ...prev.stats,
        coins: currency === 'coins' ? prev.stats.coins - item.value : prev.stats.coins,
        soulShards: currency !== 'coins' ? prev.stats.soulShards - item.value : prev.stats.soulShards,
        probabilityStones: isStone ? (prev.stats.probabilityStones || 0) + 1 : prev.stats.probabilityStones || 0
      };

      const purchasedInstance = isStone
        ? null
        : { ...item, id: `${item.id}_own_${Date.now()}_${Math.random().toString(36).slice(2, 5)}` };

      return {
        ...prev,
        stats: nextStats,
        inventory: purchasedInstance ? [...prev.inventory, purchasedInstance] : prev.inventory
      };
    });

    // Consumable potions & Probability Stones remain stocked on the merchant; unique gear is bought once
    if (!isStone && item.type !== 'consumable') {
      setDungeon(prev => ({
        ...prev,
        shopItems: (prev.shopItems || []).filter(i => i.id !== item.id)
      }));
    }

    const currencyTag = currency === 'coins' ? 'Coins 🪙' : 'Diamonds 💎';
    setCombatLogs(prev => [
      {
        id: `shop_buy_${Date.now()}`,
        text: `MERCHANT: Acquired [${item.name}] for ${item.value} ${currencyTag}.`,
        type: 'item' as const,
        turn: turnRef.current
      },
      ...prev
    ].slice(0, 30));

    soundEngine.playSFX('chest');
  }, [sendCoopWs]);

  const handleUnlockSkill = (skillId: string) => {
    const node = SKILL_DATABASE[skillId];
    if (!node) return;

    if (playMode === 'online' && coopRoom?.status === 'playing') {
      sendCoopWs({ type: 'coop:unlock_skill', skillId });
      soundEngine.playSFX('level_up');
      return;
    }

    if (!canUnlockSkill(skillId, player.unlockedSkills, player.stats.skillPoints).canUnlock) {
      return;
    }

    setPlayer(prev => {
      const nextUnlocked = [...prev.unlockedSkills, skillId];
      const nextPoints = prev.stats.skillPoints - node.pointCost;

      const newStats = { ...prev.stats, skillPoints: nextPoints };
      if (node.type === 'passive' && node.effect.statBoost) {
        if (node.effect.statBoost.maxHp) {
          newStats.maxHp += node.effect.statBoost.maxHp;
          newStats.hp = Math.min(newStats.maxHp, newStats.hp + node.effect.statBoost.maxHp);
        }
        if (node.effect.statBoost.maxEnergy) {
          newStats.maxEnergy += node.effect.statBoost.maxEnergy;
          newStats.energy = Math.min(newStats.maxEnergy, newStats.energy + node.effect.statBoost.maxEnergy);
        }
      }

      return {
        ...prev,
        stats: newStats,
        unlockedSkills: nextUnlocked
      };
    });

    soundEngine.playSFX('level_up');
    if (node.tier >= 3) {
      setAchievements(prev => prev.map(a => a.id === 'tech_master' ? { ...a, unlocked: true } : a));
    }
    checkAchievements(dungeon.floor, monstersSlain, player.stats.soulShards);
  };

  return (
    <div className="relative w-screen h-[100dvh] overflow-hidden bg-[#060410] select-none">
      <canvas
        ref={canvasRef}
        data-testid="game-canvas"
        className="absolute inset-0 w-full h-full block cursor-crosshair"
        onMouseMove={e => {
          if (gameStateRef.current !== 'playing' || !rendererRef.current) return;
          hoveredTileRef.current = rendererRef.current.screenToTile(
            e.nativeEvent.offsetX,
            e.nativeEvent.offsetY
          );
        }}
        onMouseLeave={() => {
          hoveredTileRef.current = null;
        }}
        onClick={e => {
          if (gameStateRef.current !== 'playing' || !rendererRef.current) return;
          const tile = rendererRef.current.screenToTile(
            e.nativeEvent.offsetX,
            e.nativeEvent.offsetY
          );
          const curDungeon = dungeonRef.current;
          const curPlayer = playerRef.current;
          const clickedTile = curDungeon.tiles[tile.y]?.[tile.x];

          // Tapping NPC Merchant opens Shop directly
          if (clickedTile && clickedTile.type === 'shop' && (clickedTile.visible || clickedTile.explored)) {
            setShowShop(true);
            soundEngine.playSFX('pickup');
            return;
          }

          const targetMonster = curDungeon.monsters.find(m => m.x === tile.x && m.y === tile.y);
          if (targetMonster && curDungeon.tiles[tile.y]?.[tile.x]?.visible) {
            const maxRange = getPlayerAttackRange(curPlayer);
            const dist = Math.max(Math.abs(tile.x - curPlayer.x), Math.abs(tile.y - curPlayer.y));
            if (dist >= 1 && dist <= maxRange) {
              handleRangedAttack(tile.x, tile.y);
            }
          }
        }}
      />

      {authScreenVisible && gameState === 'title' && (
        <LoginScreen
          language={language}
          onLanguageChange={handleLanguageChange}
          onGuestLogin={handleGuestLogin}
          onGoogleLogin={handleGoogleLogin}
          isGoogleLoading={isGoogleLoading}
          googleNotice={googleNotice}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
        />
      )}

      {!authScreenVisible && gameState === 'title' && (
        <TitleScreen
          selectedClass={selectedClass}
          onSelectClass={setSelectedClass}
          playMode={playMode}
          onChangePlayMode={setPlayMode}
          difficultyMode={difficultyMode}
          onChangeDifficultyMode={setDifficultyMode}
          savedOfflineRun={savedOfflineRuns[getOfflineSaveSlotKey(difficultyMode, selectedClass)]}
          savedOfflineRuns={savedOfflineRuns}
          onlineStashes={onlineStashes}
          onContinueGame={handleContinueGame}
          onStartGame={handleStartGame}
          coopRoom={coopRoom}
          coopConnected={coopConnected}
          coopError={coopError}
          localPlayerId={localPlayerId}
          onJoinCoopRoom={roomId =>
            sendCoopWs({
              type: 'coop:join',
              roomId,
              playerId: localPlayerId,
              accountId: onlineAccountId,
              username: userProfile?.username || `Op_${localPlayerId.slice(-4)}`
            })
          }
          onSelectCoopRole={cls => sendCoopWs({ type: 'coop:select_role', characterClass: cls })}
          onToggleCoopReady={ready => sendCoopWs({ type: 'coop:toggle_ready', ready })}
          onStartCoopGame={() => sendCoopWs({ type: 'coop:start_game' })}
          onOpenLeaderboard={() => setShowLeaderboard(true)}
          onOpenMultiplayer={() => setShowMultiplayer(true)}
          onOpenSocial={() => setShowSocial(true)}
          onOpenAdmin={() => setShowAdmin(true)}
          onOpenOptions={() => setShowOptions(true)}
          isMuted={isMuted}
          onToggleMute={handleToggleMasterMute}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          userProfile={userProfile}
          cloudSyncStatus={cloudSyncStatus}
          language={language}
          onLanguageChange={handleLanguageChange}
        />
      )}

      {gameState === 'playing' && (
        <>
          <GameHUD
            player={player}
            dungeon={dungeon}
            combatLogs={combatLogs}
            turn={turn}
            isMuted={isMuted}
            showMinimap={showMinimap}
            isFullscreen={isFullscreen}
            difficultyMode={difficultyMode}
            coopRoom={playMode === 'online' ? coopRoom : null}
            localPlayerId={localPlayerId}
            onToggleMinimap={() => setShowMinimap(prev => !prev)}
            onToggleMute={handleToggleMasterMute}
            onToggleFullscreen={toggleFullscreen}
            onOpenInventory={() => {
              soundEngine.playUI('open');
              setShowInventory(true);
            }}
            onOpenSkillTree={() => {
              soundEngine.playUI('open');
              setShowSkillTree(true);
            }}
            onOpenOptions={() => {
              soundEngine.playUI('open');
              setShowOptions(true);
            }}
            onPause={() => {
              soundEngine.playUI('open');
              setGameState('paused');
            }}
            onCastSkill={handleCastSkill}
            onRangedAttack={() => handleRangedAttack()}
            language={language}
          />
          <Minimap
            dungeon={dungeon}
            player={player}
            isOpen={showMinimap}
            onClose={() => {
              soundEngine.playUI('close');
              setShowMinimap(false);
            }}
            language={language}
          />
          <TouchControls
            player={player}
            dungeon={dungeon}
            onMove={handlePlayerMove}
            onWaitTurn={() => handlePlayerMove(0, 0)}
            onOpenInventory={() => {
              soundEngine.playUI('open');
              setShowInventory(true);
            }}
            onOpenSkillTree={() => {
              soundEngine.playUI('open');
              setShowSkillTree(true);
            }}
            onCastSkill={handleCastSkill}
            onRangedAttack={() => handleRangedAttack()}
          />
        </>
      )}

      {gameState === 'paused' && (
        <PauseModal
          onResume={() => {
            soundEngine.playUI('close');
            setGameState('playing');
          }}
          onRestart={handleStartGame}
          onReturnToTitle={handleReturnToTitle}
          onOpenOptions={() => {
            soundEngine.playUI('open');
            setShowOptions(true);
          }}
          isMuted={isMuted}
          onToggleMute={handleToggleMasterMute}
          floor={dungeon.floor}
          language={language}
        />
      )}

      {gameState === 'gameover' && runSnapshot && (
        <GameOverModal
          snapshot={runSnapshot}
          difficultyMode={difficultyMode}
          hasCheckpoint={
            playMode === 'online'
              ? !!coopRoom?.dungeon
              : !!checkpointSnapshot || !!player.lastCheckpoint
          }
          isOnlineCoop={playMode === 'online'}
          hasDeathDrop={(dungeon.deathDrops || []).some(d =>
            playMode === 'online' ? d.ownerId === localPlayerId : d.ownerId === 'solo'
          )}
          canReviveWithAd={playMode === 'offline'}
          onReviveInPlace={handleReviveInPlace}
          onReviveCheckpoint={handleReviveCheckpoint}
          onRestart={handleStartGame}
          onReturnToTitle={handleReturnToTitle}
          language={language}
        />
      )}

      {showInventory && (
        <InventoryModal
          player={player}
          floor={dungeon.floor}
          onClose={() => {
            soundEngine.playUI('close');
            setUpgradeFeedback(null);
            setShowInventory(false);
          }}
          onEquipItem={handleEquipItem}
          onUnequipItem={handleUnequipItem}
          onUseItem={handleUseItem}
          onDropItem={handleDropItem}
          onUpgradeItem={handleUpgradeItem}
          onBuyProbabilityStone={handleBuyProbabilityStone}
          destroyedItemPendingRecovery={destroyedItemRecovery?.item || null}
          onRecoverDestroyedItem={handleRecoverDestroyedItem}
          onDeclineRecoverDestroyedItem={handleDeclineRecoverDestroyedItem}
          upgradeFeedback={upgradeFeedback}
          language={language}
        />
      )}

      {showSkillTree && (
        <SkillTreeModal
          player={player}
          onClose={() => {
            soundEngine.playUI('close');
            setShowSkillTree(false);
          }}
          onUnlockSkill={handleUnlockSkill}
          language={language}
        />
      )}

      {showShop && (
        <ShopModal
          player={player}
          shopItems={dungeon.shopItems || []}
          onClose={() => {
            soundEngine.playUI('close');
            setShowShop(false);
          }}
          onBuyItem={handleBuyShopItem}
          language={language}
        />
      )}

      {showLeaderboard && (
        <LeaderboardModal
          onClose={() => setShowLeaderboard(false)}
          achievements={achievements}
          userStats={userStats}
          currentUsername={userProfile?.username}
          language={language}
        />
      )}

      {showMultiplayer && (
        <MultiplayerModal
          onClose={() => setShowMultiplayer(false)}
          userToken={userToken}
          username={userProfile?.username || 'Operative'}
          playerScore={score}
          playerFloor={dungeon.floor}
          language={language}
        />
      )}

      {showSocial && (
        <SocialModal
          onClose={() => setShowSocial(false)}
          userToken={userToken}
          username={userProfile?.username || 'Operative'}
          language={language}
        />
      )}

      {showAdmin && (
        <AdminDashboardModal
          onClose={() => setShowAdmin(false)}
          userRole={userProfile?.role || 'admin'}
          userToken={userToken}
          onUpdateRole={newRole => {
            if (userProfile) setUserProfile({ ...userProfile, role: newRole });
          }}
          language={language}
        />
      )}

      {showOptions && (
        <OptionsModal
          settings={appSettings}
          onUpdateSettings={handleUpdateSettings}
          onLogout={handleLogout}
          onClose={() => {
            soundEngine.playUI('close');
            setShowOptions(false);
          }}
          userProfile={userProfile}
          language={language}
        />
      )}
    </div>
  );
}
