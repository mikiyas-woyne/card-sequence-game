import React from 'react';
import { motion } from 'motion/react';
import { Card, Suit } from '../types';
import { Star } from 'lucide-react';

interface CardComponentProps {
  key?: string;
  card: Card;
  isSelected?: boolean;
  onClick?: () => void;
  isMini?: boolean;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  isDrawn?: boolean;
}

export default function CardComponent({ 
  card, 
  isSelected = false, 
  onClick, 
  isMini = false,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDrawn = false
}: CardComponentProps) {
  const isJoker = card.isJoker;

  const suitSymbols: Record<Suit, string> = {
    spades: '♠',
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    joker: '🃏',
  };

  const suitNames: Record<Suit, string> = {
    spades: 'Spades',
    hearts: 'Hearts',
    diamonds: 'Diamonds',
    clubs: 'Clubs',
    joker: 'Joker',
  };

  // Suit specific styling (Vibrant classic colors on crisp white cards)
  const getSuitStyles = (suit: Suit) => {
    switch (suit) {
      case 'hearts':
        return {
          text: 'text-red-600',
          bg: 'bg-red-50',
          border: 'border-neutral-200',
          glow: 'shadow-[0_2px_8px_rgba(220,38,38,0.08)]',
          selectedGlow: 'shadow-[0_0_20px_rgba(234,179,8,0.65)] border-amber-400 ring-2 ring-amber-400 bg-amber-50/10',
        };
      case 'diamonds':
        return {
          text: 'text-red-600',
          bg: 'bg-red-50',
          border: 'border-neutral-200',
          glow: 'shadow-[0_2px_8px_rgba(220,38,38,0.08)]',
          selectedGlow: 'shadow-[0_0_20px_rgba(234,179,8,0.65)] border-amber-400 ring-2 ring-amber-400 bg-amber-50/10',
        };
      case 'spades':
        return {
          text: 'text-neutral-900',
          bg: 'bg-neutral-50',
          border: 'border-neutral-200',
          glow: 'shadow-[0_2px_8px_rgba(24,24,27,0.08)]',
          selectedGlow: 'shadow-[0_0_20px_rgba(234,179,8,0.65)] border-amber-400 ring-2 ring-amber-400 bg-amber-50/10',
        };
      case 'clubs':
        return {
          text: 'text-neutral-900',
          bg: 'bg-neutral-50',
          border: 'border-neutral-200',
          glow: 'shadow-[0_2px_8px_rgba(24,24,27,0.08)]',
          selectedGlow: 'shadow-[0_0_20px_rgba(234,179,8,0.65)] border-amber-400 ring-2 ring-amber-400 bg-amber-50/10',
        };
      case 'joker':
        return {
          text: 'text-amber-600',
          bg: 'bg-amber-50',
          border: 'border-neutral-200',
          glow: 'shadow-[0_2px_8px_rgba(217,119,6,0.1)]',
          selectedGlow: 'shadow-[0_0_20px_rgba(234,179,8,0.65)] border-amber-400 ring-2 ring-amber-400 bg-amber-50/10',
        };
    }
  };

  const styles = getSuitStyles(card.suit);

  // Responsive dimensions
  // Mini is used for opponent cards (hidden/small) or condensed logs
  const widthClass = isMini ? 'w-[clamp(1.25rem,4dvh,2.25rem)] aspect-[5/7]' : 'w-[clamp(1.75rem,6dvh,4rem)] aspect-[5/7]';
  const sizeTextClass = isMini ? 'text-[8px]' : 'text-[9px] sm:text-xs';
  const sizeSymbolClass = isMini ? 'text-xs' : 'text-base sm:text-2xl';

  return (
    <motion.div
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`
        relative select-none rounded-lg sm:rounded-xl border flex flex-col justify-between p-1 sm:p-2 cursor-grab active:cursor-grabbing transition-all duration-150 bg-white touch-none
        ${widthClass}
        ${isSelected 
          ? styles.selectedGlow 
          : isDrawn 
            ? 'border-yellow-400 ring-2 ring-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.7)] bg-amber-50/20' 
            : `${styles.border} ${styles.glow}`
        }
      `}
      layoutId={card.id}
    >
      {/* Selection outline effect */}
      {isSelected && (
        <span className="absolute inset-0 rounded-lg sm:rounded-xl border border-amber-400 pointer-events-none animate-pulse" />
      )}

      {/* Drawn Card Badge */}
      {isDrawn && !isMini && (
        <span className="absolute -top-1.5 -right-1.5 px-1 py-0.5 bg-yellow-400 text-slate-950 font-mono text-[7px] sm:text-[8px] font-extrabold rounded border border-white shadow-sm animate-bounce z-20">
          DRAWN
        </span>
      )}

      {/* Top Left Rank & Mini Suit */}
      <div className={`flex flex-col items-start leading-none font-black tracking-tighter ${styles.text} ${sizeTextClass}`}>
        <span>{isJoker ? 'J' : card.rank}</span>
        <span className="text-[8px] sm:text-[10px]">{suitSymbols[card.suit]}</span>
      </div>

      {/* Center Giant Symbol */}
      <div className={`self-center ${styles.text} ${sizeSymbolClass} font-semibold leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.05)]`}>
        {isJoker ? (
          <Star className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-amber-500 animate-spin" style={{ animationDuration: '6s' }} />
        ) : (
          suitSymbols[card.suit]
        )}
      </div>

      {/* Bottom Right Rank & Mini Suit (inverted for authentic feel) */}
      {!isMini && (
        <div className={`flex flex-col items-end leading-none font-black tracking-tighter self-end rotate-180 ${styles.text} ${sizeTextClass}`}>
          <span>{isJoker ? 'J' : card.rank}</span>
          <span className="text-[8px] sm:text-[10px]">{suitSymbols[card.suit]}</span>
        </div>
      )}
    </motion.div>
  );
}
