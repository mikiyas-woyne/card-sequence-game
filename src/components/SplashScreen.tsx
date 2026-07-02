import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Trophy } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 2800);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      id="splash-screen"
      className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center z-50 text-white select-none overflow-hidden"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: 'easeInOut' }}
    >
      {/* Background cyber glow grid effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.12)_0%,transparent_60%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,38,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(18,24,38,0.1)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none opacity-45" />

      <div className="flex flex-col items-center space-y-6 max-w-xs text-center">
        {/* Animated Neon Logo Symbol */}
        <motion.div
          className="relative w-24 h-24 bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.4)] border border-cyan-400/30"
          initial={{ scale: 0.3, rotate: -45, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 100, damping: 15, delay: 0.2 }}
        >
          {/* Logo inner rings and trophy */}
          <Trophy className="w-12 h-12 text-cyan-200 animate-pulse" />
          <motion.div
            className="absolute inset-0 rounded-2xl border-2 border-dashed border-cyan-300/40"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          />
        </motion.div>

        {/* Studio Name */}
        <div className="space-y-2">
          <motion.h2
            className="text-2xl font-black tracking-[0.25em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 uppercase drop-shadow-[0_0_12px_rgba(6,182,212,0.5)]"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            AXUMIT STUDIOS
          </motion.h2>

          <motion.p
            className="text-xs tracking-[0.4em] text-cyan-400 font-mono"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 1.0 }}
          >
            N E O N • A R C A D E
          </motion.p>
        </div>

        {/* Loading Spinner / Sparkle */}
        <motion.div
          className="flex items-center space-x-2 text-cyan-500/60 font-mono text-[10px] tracking-widest pt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 1.4 }}
        >
          <Sparkles className="w-3 h-3 animate-spin text-cyan-400" />
          <span>BOOTING CORE</span>
        </motion.div>
      </div>
    </motion.div>
  );
}
