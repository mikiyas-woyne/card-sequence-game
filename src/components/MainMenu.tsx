import React from 'react';
import { motion } from 'motion/react';
import { Play, Volume2, VolumeX, Gamepad2, Layers, Flame, Trophy } from 'lucide-react';
import { GameSettings, GameType } from '../types';
import audio from '../utils/audio';

interface MainMenuProps {
  settings: GameSettings;
  onUpdateSettings: (s: GameSettings) => void;
  gameType: GameType;
  onSelectGameType: (type: GameType) => void;
  onStartGame: () => void;
}

export default function MainMenu({ settings, onUpdateSettings, gameType, onSelectGameType, onStartGame }: MainMenuProps) {
  const toggleSound = () => {
    const newEnabled = !settings.soundEnabled;
    audio.enabled = newEnabled;
    onUpdateSettings({ ...settings, soundEnabled: newEnabled });
    audio.playSelect();
  };

  const handleStart = () => {
    audio.playWin();
    onStartGame();
  };

  const handleSelectType = (type: GameType) => {
    audio.playSelect();
    onSelectGameType(type);
  };

  return (
    <div
      id="main-menu"
      className="main-menu-container relative h-screen max-h-screen h-[100dvh] max-h-[100dvh] bg-slate-950 flex flex-col items-center justify-between py-4 sm:py-8 px-4 sm:px-6 overflow-hidden text-white select-none"
    >
      {/* Background neon elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.15)_0%,transparent_60%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(6,182,212,0.12)_0%,transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,38,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(18,24,38,0.05)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none opacity-30" />

      {/* Floating neon cards in background */}
      <div className="absolute top-[15%] left-[-10px] w-20 h-32 border border-indigo-500/10 bg-indigo-950/5 rounded-xl rotate-12 blur-[1px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[20%] right-[-20px] w-24 h-36 border border-cyan-500/10 bg-cyan-950/5 rounded-xl -rotate-12 blur-[1px] pointer-events-none animate-pulse delay-1000" />

      {/* Header and Brand */}
      <motion.div
        className="text-center"
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <span className="text-[9px] tracking-[0.4em] font-mono text-cyan-400 uppercase font-bold drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]">
          AXUMIT STUDIOS PRESENTS
        </span>
      </motion.div>

      {/* Game Mode Selector */}
      <motion.div 
        className="w-full max-w-sm bg-slate-900/80 p-0.5 rounded-xl border border-slate-800 flex relative z-10 my-2"
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.05 }}
      >
        <button
          onClick={() => handleSelectType('sequence')}
          className={`flex-1 py-2 rounded-lg font-mono text-[10px] sm:text-xs font-bold tracking-wider transition-all duration-200 flex items-center justify-center space-x-1 cursor-pointer ${
            gameType === 'sequence'
              ? 'bg-gradient-to-r from-cyan-500 to-indigo-500 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3 h-3" />
          <span>SEQUENCE</span>
        </button>
        <button
          onClick={() => handleSelectType('crazy')}
          className={`flex-1 py-2 rounded-lg font-mono text-[10px] sm:text-xs font-bold tracking-wider transition-all duration-200 flex items-center justify-center space-x-1 cursor-pointer ${
            gameType === 'crazy'
              ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Flame className="w-3 h-3" />
          <span>CRAZY GAME</span>
        </button>
      </motion.div>

      {/* Game Titles */}
      <div className="w-full flex flex-col items-center max-w-sm text-center px-2 space-y-3 sm:space-y-4">
        <motion.div
          key={gameType}
          className="space-y-1.5 sm:space-y-2"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 120 }}
        >
          {/* Card Fan Icon */}
          <div className="flex justify-center">
            <div className={`relative flex items-center justify-center w-11 h-11 bg-slate-900 border rounded-xl shadow-lg ${
              gameType === 'crazy' 
                ? 'border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.3)]' 
                : 'border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.3)]'
            }`}>
              {gameType === 'crazy' ? (
                <Flame className="w-5 h-5 text-amber-400 animate-bounce" />
              ) : (
                <Layers className="w-5 h-5 text-indigo-400" />
              )}
              <div className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${gameType === 'crazy' ? 'bg-amber-400 animate-ping' : 'bg-cyan-400 animate-ping'}`} />
              <div className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${gameType === 'crazy' ? 'bg-amber-400' : 'bg-cyan-400'}`} />
            </div>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight uppercase">
            {gameType === 'sequence' ? (
              <>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-400 to-indigo-500 drop-shadow-[0_0_10px_rgba(99,102,241,0.3)]">
                  Card Sequence
                </span>
                <br />
                <span className="text-white text-2xl sm:text-3xl tracking-wider font-bold">
                  Game
                </span>
              </>
            ) : (
              <>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-rose-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                  Crazy Cards
                </span>
                <br />
                <span className="text-white text-2xl sm:text-3xl tracking-wider font-bold">
                  Wild Match
                </span>
              </>
            )}
          </h1>

          <p className="text-cyan-300/80 font-mono text-[10px] tracking-wide lowercase italic max-w-xs mx-auto">
            {gameType === 'sequence' ? '"lets paly with cards"' : '"get rid of all your cards first!"'}
          </p>
        </motion.div>

        {/* Quick Help Guide Panel */}
        <motion.div
          key={`guide-${gameType}`}
          className="w-full bg-slate-900/60 border border-slate-800/80 rounded-xl p-2.5 sm:p-3 text-left space-y-1.5 sm:space-y-2 shadow-inner text-[10px] sm:text-xs text-slate-400"
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {gameType === 'sequence' ? (
            <>
              <div className="flex items-center space-x-1.5 text-cyan-400 font-bold font-mono tracking-wider">
                <Gamepad2 className="w-3.5 h-3.5" />
                <span>HOW TO PLAY:</span>
              </div>
              <ul className="list-disc pl-4 space-y-1 text-slate-300 leading-tight">
                <li>You start with <span className="text-white font-medium">11 cards</span>; opponent starts with <span className="text-white font-medium">10 cards</span>.</li>
                <li>In each turn, draw 1 card, arrange your hand, then discard 1 card.</li>
                <li>Your objective is to arrange 10 cards into exactly:
                  <ul className="list-circle pl-3 pt-0.5 space-y-0.5 text-cyan-300">
                    <li>3 consecutive same-suit + 3 consecutive same-suit + 4 consecutive same-suit</li>
                  </ul>
                </li>
                <li><span className="text-cyan-400 font-bold">Jokers (🃏)</span> are wild cards.</li>
              </ul>
            </>
          ) : (
            <>
              <div className="flex items-center space-x-1.5 text-amber-400 font-bold font-mono tracking-wider">
                <Gamepad2 className="w-3.5 h-3.5" />
                <span>HOW TO PLAY:</span>
              </div>
              <ul className="list-disc pl-4 space-y-1 text-slate-300 leading-tight">
                <li>Both start with <span className="text-white font-medium">7 cards</span>. Empty your hand first to win!</li>
                <li>Play card matching the <span className="text-amber-400 font-semibold">suit or rank</span> of the top card.</li>
                <li>If you can't play, draw a card.</li>
                <li><span className="text-amber-400 font-bold">8 and Jack (J)</span> are Wilds to change the active suit!</li>
                <li><span className="text-rose-400 font-bold">Penalty:</span> Play <span className="text-white font-semibold">2</span> (draw 2) or <span className="text-white font-semibold">A♠</span> (draw 5)!</li>
              </ul>
            </>
          )}
        </motion.div>
      </div>

      {/* Buttons / Controls Footer */}
      <motion.div
        className="w-full max-w-xs flex flex-col items-center space-y-2 px-2 pt-2"
        initial={{ y: 15, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        {/* Play Button - Large, Touch Friendly */}
        <button
          id="btn-start"
          onClick={handleStart}
          className={`w-full h-12 sm:h-14 rounded-xl font-bold text-base tracking-widest shadow-md active:scale-95 transition-transform duration-100 flex items-center justify-center space-x-2.5 text-white border cursor-pointer ${
            gameType === 'crazy'
              ? 'bg-gradient-to-r from-amber-500 to-rose-600 border-amber-300/30 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
              : 'bg-gradient-to-r from-cyan-500 to-indigo-600 border-cyan-300/30 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
          }`}
        >
          <Play className="w-5 h-5 fill-white" />
          <span>START MATCH</span>
        </button>

        {/* Sound Toggle */}
        <button
          id="btn-sound-toggle"
          onClick={toggleSound}
          className="w-full h-10 bg-slate-900 border border-slate-800 rounded-lg hover:border-slate-700 font-mono text-[10px] text-slate-400 flex items-center justify-center space-x-2 cursor-pointer transition-colors active:bg-slate-800"
        >
          {settings.soundEnabled ? (
            <>
              <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>SFX: ENABLED</span>
            </>
          ) : (
            <>
              <VolumeX className="w-3.5 h-3.5 text-rose-400" />
              <span>SFX: MUTED</span>
            </>
          )}
        </button>
      </motion.div>
    </div>
  );
}
