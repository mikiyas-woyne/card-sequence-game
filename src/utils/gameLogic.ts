import { Card, Suit, Rank } from '../types';

// Generate a standard 54-card deck (52 cards + 2 Jokers)
export function createDeck(): Card[] {
  const suits: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
  const ranks: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const deck: Card[] = [];

  let cardId = 1;

  // Add standard 52 cards
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({
        id: `card_${cardId++}`,
        suit,
        rank,
        isJoker: false,
      });
    }
  }

  // Add 2 Jokers
  deck.push({
    id: `card_${cardId++}`,
    suit: 'joker',
    rank: 'joker',
    isJoker: true,
  });
  deck.push({
    id: `card_${cardId++}`,
    suit: 'joker',
    rank: 'joker',
    isJoker: true,
  });

  return deck;
}

// Shuffle deck using Fisher-Yates algorithm
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = temp;
  }
  return shuffled;
}

// Convert Rank to numeric values
export function getRankValue(rank: Rank, aceHigh: boolean): number {
  if (rank === 'joker') return 0;
  if (rank === 'A') return aceHigh ? 14 : 1;
  if (rank === 'J') return 11;
  if (rank === 'Q') return 12;
  if (rank === 'K') return 13;
  return parseInt(rank, 10);
}

// Helper to format Card for text logs / referee explanations
export function formatCardName(card: Card): string {
  if (card.isJoker) return '🃏 Joker';
  const suitSymbols: Record<Suit, string> = {
    spades: '♠',
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    joker: '🃏',
  };
  return `${card.rank}${suitSymbols[card.suit]}`;
}

// Check if a group of cards is a valid consecutive sequence of the same suit
export function validateSequence(cards: Card[], requiredLength: number): { isValid: boolean; reason: string } {
  if (cards.length !== requiredLength) {
    return {
      isValid: false,
      reason: `Group must have exactly ${requiredLength} cards (currently has ${cards.length}).`,
    };
  }

  const jokers = cards.filter((c) => c.isJoker);
  const normalCards = cards.filter((c) => !c.isJoker);

  // If everything is a Joker, it's valid
  if (normalCards.length === 0) {
    return { isValid: true, reason: 'All-wild card sequence is valid.' };
  }

  // Check if normal cards have different suits
  const firstSuit = normalCards[0].suit;
  const sameSuit = normalCards.every((c) => c.suit === firstSuit);
  if (!sameSuit) {
    return {
      isValid: false,
      reason: 'Consecutive cards with different suits are NOT allowed.',
    };
  }

  // If there's only 1 normal card, and the rest are Jokers, it's always valid
  if (normalCards.length === 1) {
    return { isValid: true, reason: 'Valid sequence completed using wild Jokers.' };
  }

  // We check both Ace representations (low = 1, high = 14)
  const canFormLow = checkConsecutive(normalCards, jokers.length, requiredLength, false);
  const canFormHigh = checkConsecutive(normalCards, jokers.length, requiredLength, true);

  if (canFormLow || canFormHigh) {
    return {
      isValid: true,
      reason: `Valid sequence of ${firstSuit.toUpperCase()} (${normalCards.map(formatCardName).join(', ')} with ${jokers.length} Joker${jokers.length !== 1 ? 's' : ''}).`,
    };
  }

  return {
    isValid: false,
    reason: `Cards ${normalCards.map(formatCardName).join(', ')} cannot form a consecutive sequence of length ${requiredLength} with ${jokers.length} Joker${jokers.length !== 1 ? 's' : ''}.`,
  };
}

// Internal checker for consecutive sequence of a specific Ace mode
function checkConsecutive(normalCards: Card[], jokerCount: number, totalLength: number, aceHigh: boolean): boolean {
  const values = normalCards.map((c) => getRankValue(c.rank, aceHigh));
  
  // Sort values
  values.sort((a, b) => a - b);

  // Check for duplicates (e.g., 7 and 7 is invalid in a straight sequence)
  for (let i = 0; i < values.length - 1; i++) {
    if (values[i] === values[i + 1]) {
      return false; // Duplicates are invalid
    }
  }

  const minVal = values[0];
  const maxVal = values[values.length - 1];
  const span = maxVal - minVal;

  // The span of the values must be less than the total length of the sequence
  if (span >= totalLength) {
    return false;
  }

  // Gaps to fill: total slots needed between min and max, minus the actual normal cards we have
  const gaps = (maxVal - minVal + 1) - values.length;

  // We must have at least as many Jokers as gaps
  return jokerCount >= gaps;
}

// Score a group of cards (size 3 or 4) to evaluate near-wins
export function scoreGroup(cards: Card[], targetSize: number): number {
  const jokers = cards.filter((c) => c.isJoker);
  const normalCards = cards.filter((c) => !c.isJoker);

  // 1. If length doesn't match targetSize, it's a huge penalty
  if (cards.length !== targetSize) {
    return 0;
  }

  // 2. If it is fully valid, return max score
  const validation = validateSequence(cards, targetSize);
  if (validation.isValid) {
    return 10; // Perfect sequence score
  }

  // 3. Evaluate partial / near sequences
  if (normalCards.length === 0) {
    // Only jokers, very valuable but needs other cards
    return 5;
  }

  // If different suits exist, it's very bad unless they are jokers
  const firstSuit = normalCards[0].suit;
  const sameSuit = normalCards.every((c) => c.suit === firstSuit);
  if (!sameSuit) {
    // Check if we can salvage any same-suit subset
    return 0;
  }

  // Same suit! Let's check consecutive potential
  const checkPartialConsecutive = (aceHigh: boolean): number => {
    const values = normalCards.map((c) => getRankValue(c.rank, aceHigh));
    values.sort((a, b) => a - b);

    // Duplicates penalty
    let duplicates = 0;
    for (let i = 0; i < values.length - 1; i++) {
      if (values[i] === values[i + 1]) duplicates++;
    }
    if (duplicates > 0) return 0.5;

    const span = values[values.length - 1] - values[0];

    // If span is within limits
    if (span < targetSize) {
      const gaps = (values[values.length - 1] - values[0] + 1) - values.length;
      if (jokers.length >= gaps) {
        // This should be caught by validateSequence, but if targetSize doesn't match, or is close
        return 9;
      }
      // Gaps exist but not enough jokers
      return 6 - gaps + jokers.length;
    }

    // Completely spread out but same suit
    return 2 + jokers.length;
  };

  return Math.max(checkPartialConsecutive(false), checkPartialConsecutive(true));
}

export interface Partition {
  group1: Card[];
  group2: Card[];
  group3: Card[];
}

// Find the absolute best partition of 10 cards into (3, 3, 4)
export function findBestPartition(cards: Card[]): { partition: Partition; score: number; completedCount: number } {
  if (cards.length !== 10) {
    // If not exactly 10 cards, return trivial group
    return {
      partition: {
        group1: cards.slice(0, 3),
        group2: cards.slice(3, 6),
        group3: cards.slice(6, 10),
      },
      score: 0,
      completedCount: 0,
    };
  }

  let bestPartition: Partition = {
    group1: cards.slice(0, 3),
    group2: cards.slice(3, 6),
    group3: cards.slice(6, 10),
  };
  let bestScore = -1;
  let bestCompletedCount = 0;

  // To speed up computation, we can limit the depth or use smart generation.
  // We need to choose 3 cards for Group 1 out of 10, then 3 cards for Group 2 out of remaining 7, remaining 4 go to Group 3.
  // Total iterations: 120 * 35 = 4200. This is small enough to run fully in ~2-4ms.
  const n = cards.length;

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      for (let k = j + 1; k < n; k++) {
        // Group 1 indices: i, j, k
        const g1 = [cards[i], cards[j], cards[k]];

        // Remaining cards
        const remaining1: Card[] = [];
        for (let m = 0; m < n; m++) {
          if (m !== i && m !== j && m !== k) {
            remaining1.push(cards[m]);
          }
        }

        const lenR1 = remaining1.length; // 7 cards
        for (let a = 0; a < lenR1; a++) {
          for (let b = a + 1; b < lenR1; b++) {
            for (let c = b + 1; c < lenR1; c++) {
              // Group 2 indices in remaining1: a, b, c
              const g2 = [remaining1[a], remaining1[b], remaining1[c]];

              // Remaining cards go to Group 3
              const g3: Card[] = [];
              for (let m = 0; m < lenR1; m++) {
                if (m !== a && m !== b && m !== c) {
                  g3.push(remaining1[m]);
                }
              }

              // Evaluate this partition
              const s1 = scoreGroup(g1, 3);
              const s2 = scoreGroup(g2, 3);
              const s3 = scoreGroup(g3, 4);

              const totalScore = s1 + s2 + s3;

              let completed = 0;
              if (s1 === 10) completed++;
              if (s2 === 10) completed++;
              if (s3 === 10) completed++;

              // If we find a winning partition (all three completed), return immediately!
              if (completed === 3) {
                return {
                  partition: { group1: g1, group2: g2, group3: g3 },
                  score: 30,
                  completedCount: 3,
                };
              }

              if (totalScore > bestScore) {
                bestScore = totalScore;
                bestCompletedCount = completed;
                bestPartition = {
                  group1: g1,
                  group2: g2,
                  group3: g3,
                };
              }
            }
          }
        }
      }
    }
  }

  return {
    partition: bestPartition,
    score: bestScore,
    completedCount: bestCompletedCount,
  };
}

// AI Discard Decider: Finds the best card of 11 cards to discard, leaving 10 cards that yield the best possible partition
export function makeAiDecision(
  hand: Card[],
  drawPileEmpty: boolean
): { discardCard: Card; bestPartition: Partition; score: number; isWin: boolean } {
  let bestDiscardCard: Card = hand[0];
  let bestPartition: Partition = {
    group1: [],
    group2: [],
    group3: [],
  };
  let bestScore = -1;
  let isWin = false;

  // Try discarding each card in hand
  for (let i = 0; i < hand.length; i++) {
    const cardToDiscard = hand[i];
    
    // Create hand with this card removed
    const remainingHand = hand.filter((_, idx) => idx !== i);
    
    // Find best partition of remaining cards
    const result = findBestPartition(remainingHand);

    if (result.completedCount === 3) {
      // Winning hand!
      return {
        discardCard: cardToDiscard,
        bestPartition: result.partition,
        score: result.score,
        isWin: true,
      };
    }

    // Prefer keeping Jokers at all costs, so penalty for discarding a Joker
    let discardScore = result.score;
    if (cardToDiscard.isJoker) {
      discardScore -= 15; // Heavily discourage AI from discarding Jokers!
    }

    if (discardScore > bestScore) {
      bestScore = discardScore;
      bestDiscardCard = cardToDiscard;
      bestPartition = result.partition;
    }
  }

  return {
    discardCard: bestDiscardCard,
    bestPartition,
    score: bestScore,
    isWin: false,
  };
}
