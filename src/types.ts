export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs' | 'joker';

export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'joker';

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  isJoker: boolean;
}

export type HandGroupIndex = 0 | 1 | 2 | 3; // 0 = Group 1 (3), 1 = Group 2 (3), 2 = Group 3 (4), 3 = Unassigned / Buffer

export interface PlayerState {
  name: string;
  isHuman: boolean;
  // Cards currently grouped
  group1: Card[]; // Target size: 3
  group2: Card[]; // Target size: 3
  group3: Card[]; // Target size: 4
  unassigned: Card[]; // Buffer for drawn card or general cards
  score: number;
}

export interface GameSettings {
  soundEnabled: boolean;
}

export type GamePhase = 'splash' | 'menu' | 'playing' | 'gameover';

export type GameType = 'sequence' | 'crazy';

export interface RefereeComment {
  text: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: number;
}
