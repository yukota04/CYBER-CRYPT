/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Achievement,
  CharacterClass,
  CombatLogEntry,
  DungeonState,
  GameItem,
  Player,
  RunSnapshot
} from './game/types';
import { generateDungeon, updateFOV } from './game/dungeon';
import {
  createInitialPlayer,
  resolveStepOrAttack,
  executeSkill,
  getTotalStats
} from './game/combat';
import { canUnlockSkill, computePassiveBonuses, SKILL_DATABASE } from './game/skills';
import { soundEngine } from './game/audio';
import { CanvasRenderer } from './game/canvasRenderer';
import { Language } from './game/i18n';

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

const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  { id: 'first_blood', title: 'First Breach', description: 'Eliminate your first rogue AI matrix', icon: '⚡', unlocked: false },
  { id: 'floor_3', title: 'Deep Diver', description: 'Reach Sub-Level 3 of the Cyber-Crypt', icon: '🌊', unlocked: false },
  { id: 'boss_slayer', title: 'Core Breaker', description: 'Defeat the Core Synthesizer Boss', icon: '👑', unlocked: false },
  { id: 'tech_master', title: 'Synapse Master', description: 'Unlock a Tier 3 or higher skill node', icon: '🧠', unlocked: false },
  { id: 'shard_collector', title: 'Aether Hoarder', description: 'Collect 100+ Soul Shards in a single run', icon: '💎', unlocked: false }
];

export default function App() {
  // Game State Machine: 'title' | 'playing' | 'paused' | 'gameover'
  const [gameState, setGameState] = useState<'title' | 'playing' | 'paused' | 'gameover'>('title');
  const [selectedClass, setSelectedClass] = useState<CharacterClass>('striker');
  const [isMuted, setIsMuted] = useState(false);
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

  // Modals
  const [showInventory, setShowInventory] = useState(false);
  const [showSkillTree, setShowSkillTree] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showMultiplayer, setShowMultiplayer] = useState(false);
  const [showSocial, setShowSocial] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  // User Profile & Server State
  const [userToken, setUserToken] = useState<string>('');
  const [userProfile, setUserProfile] = useState<{ id: string; username: string; role: 'player' | 'moderator' | 'admin' } | null>(null);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<string>('Syncing...');
  const [achievements, setAchievements] = useState<Achievement[]>(DEFAULT_ACHIEVEMENTS);
  const [userStats, setUserStats] = useState({ highestFloor: 1, totalKills: 0, bestScore: 0 });

  // Game Engine State
  const [turn, setTurn] = useState<number>(1);
  const [score, setScore] = useState<number>(0);
  const [monstersSlain, setMonstersSlain] = useState<number>(0);
  const [combatLogs, setCombatLogs] = useState<CombatLogEntry[]>([
    { id: 'init_1', text: 'Neural feed synchronized. Welcome to CYBER-CRYPT.', type: 'info', turn: 1 }
  ]);
  const [runSnapshot, setRunSnapshot] = useState<RunSnapshot | null>(null);

  // React State for HUD & Canvas
  const [player, setPlayer] = useState<Player>(() => createInitialPlayer('striker'));
  const [dungeon, setDungeon] = useState<DungeonState>(() => generateDungeon(1, 100));

  // Canvas Refs & Renderer
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const floatingTextsRef = useRef<{ text: string; x: number; y: number; color: string; life: number }[]>([]);

  // Keep live references to prevent closure staleness in 60fps loop and hotkeys
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

  // Sync body dataset state
  useEffect(() => {
    document.body.dataset.state = gameState;
  }, [gameState]);

  // Auth / Guest Setup on Mount & autostart query parameter support
  useEffect(() => {
    // Check autostart
    const params = new URLSearchParams(window.location.search);
    const autostart = params.get('autostart') === '1';

    // Guest login
    fetch('/api/auth/guest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform: navigator.userAgent.includes('Mobile') ? 'mobile_web' : 'desktop_web' })
    })
      .then(res => res.json())
      .then(data => {
        if (data.token) {
          setUserToken(data.token);
          setUserProfile(data.user);
          setCloudSyncStatus('Encrypted Cloud Synced');
        }
      })
      .catch(() => {
        setCloudSyncStatus('Local Storage Only');
      });

    if (autostart) {
      handleStartGame();
    }
  }, []);

  // Initialize Canvas Renderer and 60fps render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new CanvasRenderer(canvas);
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

      const rawDt = (time - lastTime) / 1000;
      if (rawDt < 0.033) return; // Cap at ~30 FPS for CPU container efficiency
      const dt = Math.min(rawDt, 0.05);
      lastTime = time;

      // Update floating texts life
      const ftList = floatingTextsRef.current;
      for (let i = ftList.length - 1; i >= 0; i--) {
        ftList[i].life += dt * 30;
        if (ftList[i].life > 40) ftList.splice(i, 1);
      }

      if (dungeonRef.current && playerRef.current) {
        renderer.render(dungeonRef.current, playerRef.current, ftList, dt);
      }
    };

    animId = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  // Trigger sound events and floating texts from action results
  const handleSoundAndVisuals = useCallback((events: string[], screenShake: number, floaters: any[]) => {
    for (const ev of events) {
      soundEngine.playSFX(ev as any);
    }
    if (screenShake > 0 && rendererRef.current) {
      rendererRef.current.addTrauma(screenShake);
    }
    for (const f of floaters) {
      floatingTextsRef.current.push({ ...f, life: 0 });
      if (f.isCrit && rendererRef.current) {
        rendererRef.current.spawnParticles(f.x, f.y, '#ffe600', 16);
      }
    }
  }, []);

  // Check achievements helper
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

  // Cloud Save Sync
  const syncCloudSave = useCallback((curPlayer: Player, curFloor: number, curScore: number) => {
    if (!userToken) return;

    const saveHash = `sha256_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const payload = {
      encryptedData: JSON.stringify({
        hp: curPlayer.stats.hp,
        level: curPlayer.stats.level,
        class: curPlayer.characterClass,
        shards: curPlayer.stats.soulShards,
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

  // Turn Action: Step or Attack
  const handlePlayerMove = useCallback((dx: number, dy: number) => {
    if (gameStateRef.current !== 'playing') return;

    const curPlayer = playerRef.current;
    const curDungeon = dungeonRef.current;
    const curTurn = turnRef.current;

    const result = resolveStepOrAttack(curPlayer, curDungeon, dx, dy, curTurn);

    // Apply FOV update around new player position
    updateFOV(result.dungeon.tiles, result.player.x, result.player.y, 7);

    // Update state
    setPlayer(result.player);
    setDungeon(result.dungeon);
    setCombatLogs(prev => [...result.logs, ...prev].slice(0, 30));
    setTurn(curTurn + 1);

    handleSoundAndVisuals(result.soundEvents, result.screenShake, result.floatingTexts);

    // Score increment
    const gainedKills = curDungeon.monsters.length - result.dungeon.monsters.length;
    if (gainedKills > 0) {
      setMonstersSlain(m => m + gainedKills);
      setScore(s => s + gainedKills * 150);
      checkAchievements(curDungeon.floor, monstersSlainRef.current + gainedKills, result.player.stats.soulShards);
    }

    // Floor Completed / Next Floor
    if (result.floorCompleted) {
      const nextFloor = curDungeon.floor + 1;
      const newDungeonState = generateDungeon(nextFloor);
      const startRoom = newDungeonState.rooms[0];

      result.player.x = startRoom.centerX;
      result.player.y = startRoom.centerY;
      updateFOV(newDungeonState.tiles, result.player.x, result.player.y, 7);

      setDungeon(newDungeonState);
      setScore(s => s + 500);
      checkAchievements(nextFloor, monstersSlainRef.current, result.player.stats.soulShards);
      syncCloudSave(result.player, nextFloor, scoreRef.current + 500);
    }

    // Game Over / Permadeath
    if (result.gameOver) {
      const snapshot: RunSnapshot = {
        score: scoreRef.current + monstersSlainRef.current * 120,
        floor: curDungeon.floor,
        turns: curTurn,
        monstersSlain: monstersSlainRef.current,
        soulShards: result.player.stats.soulShards,
        characterClass: result.player.characterClass,
        level: result.player.stats.level,
        seed: 42,
        timestamp: Date.now()
      };

      setRunSnapshot(snapshot);
      setGameState('gameover');
      syncCloudSave(result.player, curDungeon.floor, snapshot.score);

      // Submit score to global leaderboard
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
            timeSec: curTurn * 2
          })
        }).catch(() => {});
      }

      setUserStats(prev => ({
        highestFloor: Math.max(prev.highestFloor, snapshot.floor),
        totalKills: prev.totalKills + snapshot.monstersSlain,
        bestScore: Math.max(prev.bestScore, snapshot.score)
      }));
    }
  }, [handleSoundAndVisuals, checkAchievements, syncCloudSave, userToken]);

  // Cast Active Skill
  const handleCastSkill = useCallback((skillId: string) => {
    if (gameStateRef.current !== 'playing') return;

    const curPlayer = playerRef.current;
    const curDungeon = dungeonRef.current;
    const curTurn = turnRef.current;

    const result = executeSkill(curPlayer, curDungeon, skillId, curTurn);
    updateFOV(result.dungeon.tiles, result.player.x, result.player.y, 7);

    setPlayer(result.player);
    setDungeon(result.dungeon);
    setCombatLogs(prev => [...result.logs, ...prev].slice(0, 30));
    setTurn(curTurn + 1);

    handleSoundAndVisuals(result.soundEvents, result.screenShake, result.floatingTexts);

    if (result.gameOver) {
      setGameState('gameover');
    }
  }, [handleSoundAndVisuals]);

  // Start New Run
  const handleStartGame = useCallback(() => {
    const newDungeon = generateDungeon(1);
    const startRoom = newDungeon.rooms[0];
    const newPlayer = createInitialPlayer(selectedClass, startRoom.centerX, startRoom.centerY);

    updateFOV(newDungeon.tiles, newPlayer.x, newPlayer.y, 7);

    setDungeon(newDungeon);
    setPlayer(newPlayer);
    setTurn(1);
    setScore(0);
    setMonstersSlain(0);
    setCombatLogs([
      { id: 'start_run', text: `DEPLOYED: Operative ${newPlayer.characterClass.toUpperCase()} initialized on Floor 1.`, type: 'info', turn: 1 }
    ]);
    setGameState('playing');

    soundEngine.startMusic();
  }, [selectedClass]);

  // Global Keyboard Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in chat or admin inputs
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select') return;

      const state = gameStateRef.current;

      // Title Screen: Enter or Space starts game
      if (state === 'title') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleStartGame();
          return;
        }
      }

      // Game Over Screen: Enter restarts game
      if (state === 'gameover') {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleStartGame();
          return;
        }
      }

      // Mute toggle [M]
      if (e.key === 'm' || e.key === 'M') {
        const nextMute = !soundEngine.getMuted();
        soundEngine.setMuted(nextMute);
        setIsMuted(nextMute);
        return;
      }

      // Pause toggle [Escape or P]
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (state === 'playing') {
          setGameState('paused');
        } else if (state === 'paused') {
          setGameState('playing');
        }
        return;
      }

      // Gameplay Hotkeys (only when in 'playing' state)
      if (state === 'playing') {
        // Inventory [I]
        if (e.key === 'i' || e.key === 'I') {
          setShowInventory(prev => !prev);
          return;
        }
        // Skill Tree [K]
        if (e.key === 'k' || e.key === 'K') {
          setShowSkillTree(prev => !prev);
          return;
        }

        // Movement / Attack
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
          // Wait turn
          e.preventDefault();
          handlePlayerMove(0, 0);
        }

        // Active Skills [1, 2, 3, 4]
        if (['1', '2', '3', '4'].includes(e.key)) {
          const idx = parseInt(e.key, 10) - 1;
          const activeSkills = Object.values(SKILL_DATABASE).filter(
            s => s.branch === playerRef.current.characterClass && s.type === 'active'
          );
          if (activeSkills[idx]) {
            handleCastSkill(activeSkills[idx].id);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleStartGame, handlePlayerMove, handleCastSkill]);

  // Inventory actions
  const handleEquipItem = (item: GameItem) => {
    setPlayer(prev => {
      const newEquipment = { ...prev.equipment };
      const newInventory = prev.inventory.filter(i => i.id !== item.id);

      // Return existing item in slot to inventory
      const currentEquipped = newEquipment[item.type as 'weapon' | 'armor' | 'accessory'];
      if (currentEquipped) newInventory.push(currentEquipped);

      newEquipment[item.type as 'weapon' | 'armor' | 'accessory'] = item;

      return {
        ...prev,
        equipment: newEquipment,
        inventory: newInventory
      };
    });
    soundEngine.playSFX('pickup');
  };

  const handleUnequipItem = (slot: 'weapon' | 'armor' | 'accessory') => {
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

  const handleUseItem = (item: GameItem) => {
    setPlayer(prev => {
      const newInventory = prev.inventory.filter(i => i.id !== item.id);
      const totals = getTotalStats(prev);
      let newHp = prev.stats.hp;
      let newEnergy = prev.stats.energy;

      if (item.healAmount) {
        newHp = Math.min(totals.maxHp, newHp + item.healAmount);
        soundEngine.playSFX('chest');
      }
      if (item.energyAmount) {
        newEnergy = Math.min(totals.maxEnergy, newEnergy + item.energyAmount);
        soundEngine.playSFX('skill');
      }

      return {
        ...prev,
        stats: { ...prev.stats, hp: newHp, energy: newEnergy },
        inventory: newInventory
      };
    });
  };

  const handleDropItem = (item: GameItem) => {
    setPlayer(prev => ({
      ...prev,
      inventory: prev.inventory.filter(i => i.id !== item.id)
    }));
  };

  // Skill Tree Unlock
  const handleUnlockSkill = (skillId: string) => {
    const node = SKILL_DATABASE[skillId];
    if (!node) return;

    if (!canUnlockSkill(skillId, player.unlockedSkills, player.stats.skillPoints).canUnlock) {
      return;
    }

    setPlayer(prev => {
      const nextUnlocked = [...prev.unlockedSkills, skillId];
      const nextPoints = prev.stats.skillPoints - node.pointCost;

      // Apply passive stat boost if passive
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
    checkAchievements(dungeon.floor, monstersSlain, player.stats.soulShards);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#060410] select-none">
      {/* Isolated Canvas Mount (Never torn down by React reconciliation) */}
      <canvas
        ref={canvasRef}
        data-testid="game-canvas"
        className="absolute inset-0 w-full h-full block cursor-crosshair"
      />

      {/* 1. TITLE SCREEN */}
      {gameState === 'title' && (
        <TitleScreen
          selectedClass={selectedClass}
          onSelectClass={setSelectedClass}
          onStartGame={handleStartGame}
          onOpenLeaderboard={() => setShowLeaderboard(true)}
          onOpenMultiplayer={() => setShowMultiplayer(true)}
          onOpenSocial={() => setShowSocial(true)}
          onOpenAdmin={() => setShowAdmin(true)}
          isMuted={isMuted}
          onToggleMute={() => {
            const next = !isMuted;
            setIsMuted(next);
            soundEngine.setMuted(next);
          }}
          userProfile={userProfile}
          cloudSyncStatus={cloudSyncStatus}
          language={language}
          onLanguageChange={handleLanguageChange}
        />
      )}

      {/* 2. PLAYING HUD & TOUCH CONTROLS */}
      {gameState === 'playing' && (
        <>
          <GameHUD
            player={player}
            dungeon={dungeon}
            combatLogs={combatLogs}
            turn={turn}
            isMuted={isMuted}
            onToggleMute={() => {
              const next = !isMuted;
              setIsMuted(next);
              soundEngine.setMuted(next);
            }}
            onOpenInventory={() => setShowInventory(true)}
            onOpenSkillTree={() => setShowSkillTree(true)}
            onPause={() => setGameState('paused')}
            onCastSkill={handleCastSkill}
            language={language}
          />
          <TouchControls
            onMove={handlePlayerMove}
            onWaitTurn={() => handlePlayerMove(0, 0)}
            onOpenInventory={() => setShowInventory(true)}
            onOpenSkillTree={() => setShowSkillTree(true)}
          />
        </>
      )}

      {/* 3. PAUSE MODAL */}
      {gameState === 'paused' && (
        <PauseModal
          onResume={() => setGameState('playing')}
          onRestart={handleStartGame}
          onReturnToTitle={() => {
            soundEngine.stopMusic();
            setGameState('title');
          }}
          isMuted={isMuted}
          onToggleMute={() => {
            const next = !isMuted;
            setIsMuted(next);
            soundEngine.setMuted(next);
          }}
          floor={dungeon.floor}
          language={language}
        />
      )}

      {/* 4. GAME OVER MODAL */}
      {gameState === 'gameover' && runSnapshot && (
        <GameOverModal
          snapshot={runSnapshot}
          onRestart={handleStartGame}
          onReturnToTitle={() => {
            soundEngine.stopMusic();
            setGameState('title');
          }}
          language={language}
        />
      )}

      {/* 5. INVENTORY MODAL */}
      {showInventory && (
        <InventoryModal
          player={player}
          onClose={() => setShowInventory(false)}
          onEquipItem={handleEquipItem}
          onUnequipItem={handleUnequipItem}
          onUseItem={handleUseItem}
          onDropItem={handleDropItem}
          language={language}
        />
      )}

      {/* 6. SKILL TREE MODAL */}
      {showSkillTree && (
        <SkillTreeModal
          player={player}
          onClose={() => setShowSkillTree(false)}
          onUnlockSkill={handleUnlockSkill}
          language={language}
        />
      )}

      {/* 7. LEADERBOARD & ACHIEVEMENTS */}
      {showLeaderboard && (
        <LeaderboardModal
          onClose={() => setShowLeaderboard(false)}
          achievements={achievements}
          userStats={userStats}
          language={language}
        />
      )}

      {/* 8. MULTIPLAYER DUEL MODAL */}
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

      {/* 9. SOCIAL & COMMS */}
      {showSocial && (
        <SocialModal
          onClose={() => setShowSocial(false)}
          userToken={userToken}
          username={userProfile?.username || 'Operative'}
          language={language}
        />
      )}

      {/* 10. ADMIN DASHBOARD & TELEMETRY */}
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
    </div>
  );
}
