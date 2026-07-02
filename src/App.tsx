import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { 
  Trophy, RotateCcw, Volume2, VolumeX, Menu, 
  Sparkles, HelpCircle, Layers, ShieldCheck, Play, ArrowRight, CornerDownLeft, Flame
} from 'lucide-react';
import { Card, Suit, Rank, GamePhase, GameSettings, GameType } from './types';
import { 
  createDeck, shuffleDeck, validateSequence, findBestPartition, makeAiDecision, formatCardName, Partition 
} from './utils/gameLogic';
import audio from './utils/audio';

// Import our custom sub-components
import SplashScreen from './components/SplashScreen';
import MainMenu from './components/MainMenu';
import CardComponent from './components/CardComponent';

export default function App() {
  // Phase Management
  const [phase, setPhase] = useState<GamePhase>('splash');
  
  // Game Mode Selection State
  const [gameType, setGameType] = useState<GameType>('sequence');

  // Crazy Cards Specific States
  const [activeCrazySuit, setActiveCrazySuit] = useState<Suit | null>(null);
  const [isSuitSelectionOpen, setIsSuitSelectionOpen] = useState<boolean>(false);
  const [playedCrazyCard, setPlayedCrazyCard] = useState<Card | null>(null);
  
  // Game Settings
  const [settings, setSettings] = useState<GameSettings>({
    soundEnabled: true,
  });

  // Core Game State
  const [drawPile, setDrawPile] = useState<Card[]>([]);
  const [discardPile, setDiscardPile] = useState<Card[]>([]);
  
  // Player Hand State (Unified single array for extreme simplicity and swap-reordering)
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  
  // AI Hand State (Keep simple)
  const [aiHand, setAiHand] = useState<Card[]>([]);

  // Turn Tracking
  const [currentTurn, setCurrentTurn] = useState<'player' | 'ai'>('player');
  const [playerHasDrawn, setPlayerHasDrawn] = useState<boolean>(true); // Player starts with 11 cards, so has "already drawn" first turn
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);

  // Selections
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [drawnCardId, setDrawnCardId] = useState<string | null>(null);

  // Drag and drop reordering state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Dealing Animation state
  const [isDealing, setIsDealing] = useState<boolean>(false);

  // Opponent's winning partition for verification/proof
  const [aiWinningPartition, setAiWinningPartition] = useState<Partition | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    
    // Check if dragging from discard pile (where draggedIndex is set to -100)
    if (draggedIndex === -100) {
      if (currentTurn !== 'player') return;
      if (playerHasDrawn) {
        setRefereeCommentary("Wait, you already drew a card! You must discard 1 card to end your turn.");
        audio.playError();
        setDraggedIndex(null);
        return;
      }
      if (discardPile.length === 0) {
        setDraggedIndex(null);
        return;
      }

      audio.playDraw();
      const nextCard = discardPile[0];
      setDiscardPile(discardPile.slice(1));
      
      const updatedHand = [...playerHand];
      updatedHand.splice(targetIndex, 0, nextCard);
      setPlayerHand(updatedHand);
      setPlayerHasDrawn(true);
      setDrawnCardId(nextCard.id); // Track drawn card!
      setRefereeCommentary(`You drew ${formatCardName(nextCard)} from the Discard Pile. Arrange your cards and select one to discard.`);
      setDraggedIndex(null);
      return;
    }

    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const updatedHand = [...playerHand];
    // Remove the card from its original position
    const [draggedCard] = updatedHand.splice(draggedIndex, 1);
    // Insert the card into the new target position
    updatedHand.splice(targetIndex, 0, draggedCard);

    setPlayerHand(updatedHand);
    setDraggedIndex(null);
    audio.playSelect();
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Logs & Referee Feedback
  const [refereeCommentary, setRefereeCommentary] = useState<string>('');
  const [matchWinner, setMatchWinner] = useState<'player' | 'ai' | null>(null);
  const [scores, setScores] = useState({ player: 0, ai: 0 });

  // UI state for rule drawer
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);

  // Sound sync
  useEffect(() => {
    audio.enabled = settings.soundEnabled;
  }, [settings.soundEnabled]);

  // Start a new match
  const handleStartMatch = () => {
    if (gameType === 'sequence') {
      const deck = shuffleDeck(createDeck());
      
      // Deal cards: Player gets 11, AI gets 10
      const pHand = deck.slice(0, 11);
      const aHand = deck.slice(11, 21);
      const remainingDeck = deck.slice(21);

      // Initial partition sort for Player (to present it organized initially)
      const playerArrangement = findBestPartition(pHand.slice(0, 10));
      const sortedPlayerHand = [
        ...playerArrangement.partition.group1,
        ...playerArrangement.partition.group2,
        ...playerArrangement.partition.group3,
        pHand[10] // Put the 11th card at the end
      ];
      setPlayerHand(sortedPlayerHand);
      setDrawnCardId(null); // Do not show any drawn card badge at the beginning of the game!

      // AI Hand setup
      setAiHand(aHand);

      // Setup piles
      setDrawPile(remainingDeck);
      setDiscardPile([]);
      
      // Select state reset
      setSelectedCard(null);
      setMatchWinner(null);
      setAiWinningPartition(null);
      
      // Turn order reset
      setCurrentTurn('player');
      setPlayerHasDrawn(true); // Player starts with 11 cards, no draw needed
      setIsAiThinking(false);

      // Trigger Dealing Animation
      setIsDealing(true);
      setTimeout(() => {
        setIsDealing(false);
      }, 2200);

      // Referee introduction
      setRefereeCommentary(
        "Welcome to the high-stakes table! You received 11 cards and start first. Tap any two cards to swap and rearrange them. Tap your selected card and tap Discard to end your turn!"
      );
    } else {
      // Crazy Game Setup
      // 52-card standard deck (no Jokers)
      const deck = shuffleDeck(createDeck().filter(c => !c.isJoker));
      
      // Deal 7 cards to player, 7 to AI
      const pHand = deck.slice(0, 7);
      const aHand = deck.slice(7, 14);
      let remainingDeck = deck.slice(14);
      
      // Select a non-crazy, non-penalty card to start the Discard Pile
      let startCardIndex = remainingDeck.findIndex(
        c => c.rank !== '8' && c.rank !== 'J' && c.rank !== '2' && !(c.rank === 'A' && c.suit === 'spades')
      );
      if (startCardIndex === -1) startCardIndex = 0;
      const startCard = remainingDeck[startCardIndex];
      remainingDeck = remainingDeck.filter((_, idx) => idx !== startCardIndex);

      setPlayerHand(pHand);
      setAiHand(aHand);
      setDrawPile(remainingDeck);
      setDiscardPile([startCard]);
      
      // Reset selections and custom states
      setSelectedCard(null);
      setMatchWinner(null);
      setAiWinningPartition(null);
      setDrawnCardId(null);
      setActiveCrazySuit(null);
      setPlayedCrazyCard(null);
      setIsSuitSelectionOpen(false);

      // Turn setup
      setCurrentTurn('player');
      setPlayerHasDrawn(false); // Player starts with 7 cards, must play or draw
      setIsAiThinking(false);

      // Trigger Dealing Animation
      setIsDealing(true);
      setTimeout(() => {
        setIsDealing(false);
      }, 2200);

      setRefereeCommentary(
        `Crazy Match Started! Play a card matching the top discard (${formatCardName(startCard)}) or play an 8/Jack. If you can't play, draw a card!`
      );
    }

    setPhase('playing');
  };

  // Auto-Arrange player's hand
  const handlePlayerAutoArrange = () => {
    audio.playSelect();
    
    if (playerHand.length === 10) {
      const best = findBestPartition(playerHand);
      const sorted = [
        ...best.partition.group1,
        ...best.partition.group2,
        ...best.partition.group3
      ];
      setPlayerHand(sorted);
      setRefereeCommentary(`Hand auto-arranged! Completed sequences: ${best.completedCount}/3.`);
    } else if (playerHand.length === 11) {
      // Find best discard to optimize remaining 10
      const decision = makeAiDecision(playerHand, drawPile.length === 0);
      const sorted = [
        ...decision.bestPartition.group1,
        ...decision.bestPartition.group2,
        ...decision.bestPartition.group3,
        decision.discardCard
      ];
      setPlayerHand(sorted);
      setSelectedCard(decision.discardCard); // Select the suggested discard
      setRefereeCommentary(
        `Suggested discard: ${formatCardName(decision.discardCard)} (placed at the end). Tap DISCARD to throw it!`
      );
    }
  };

  // Handle Card Tap - Selection only, no swapping!
  const handleCardTap = (card: Card) => {
    audio.playPop();

    if (selectedCard && selectedCard.id === card.id) {
      // Deselect if tapping same card
      setSelectedCard(null);
    } else {
      // Select the clicked card
      setSelectedCard(card);
    }
  };

  // Draw Card from draw pile
  const handleDrawCard = () => {
    if (gameType === 'crazy') {
      handleCrazyDrawCard();
      return;
    }
    
    if (currentTurn !== 'player') return;
    if (playerHasDrawn) {
      setRefereeCommentary("Wait, you already drew a card! You must discard 1 card to end your turn.");
      audio.playError();
      return;
    }

    if (drawPile.length === 0) {
      setRefereeCommentary("The Draw Pile is empty! Reshuffling or tie is declared.");
      audio.playError();
      return;
    }

    audio.playDraw();
    const nextCard = drawPile[0];
    setDrawPile(drawPile.slice(1));
    setPlayerHand([...playerHand, nextCard]);
    setPlayerHasDrawn(true);
    setDrawnCardId(nextCard.id); // Track drawn card!
    setRefereeCommentary(`You drew ${formatCardName(nextCard)}. Arrange your cards and select one to discard.`);
  };

  // Draw Card from discard pile
  const handleDrawFromDiscard = () => {
    if (gameType === 'crazy') {
      setRefereeCommentary("In Crazy Cards, you play on top of the Discard Pile; you cannot draw from it!");
      audio.playError();
      return;
    }
    if (currentTurn !== 'player') return;
    if (playerHasDrawn) {
      setRefereeCommentary("Wait, you already drew a card! You must discard 1 card to end your turn.");
      audio.playError();
      return;
    }

    if (discardPile.length === 0) {
      setRefereeCommentary("The Discard Pile is empty!");
      audio.playError();
      return;
    }

    audio.playDraw();
    const nextCard = discardPile[0];
    setDiscardPile(discardPile.slice(1));
    setPlayerHand([...playerHand, nextCard]);
    setPlayerHasDrawn(true);
    setDrawnCardId(nextCard.id); // Track drawn card!
    setRefereeCommentary(`You drew ${formatCardName(nextCard)} from the Discard Pile. Arrange your cards and select one to discard.`);
  };

  // Helper to check if a card is playable in Crazy mode
  const isCardPlayableInCrazy = (card: Card, topCard: Card, activeSuit: Suit | null): boolean => {
    if (card.isJoker) return false; // Filtered out
    
    // 8 and Jack are Crazy Cards: Playable at any time!
    if (card.rank === '8' || card.rank === 'J') {
      return true;
    }

    if (activeSuit) {
      return card.suit === activeSuit;
    }

    // Match top card suit or rank
    return card.suit === topCard.suit || card.rank === topCard.rank;
  };

  // Penalize player (makes human draw)
  const penalizePlayer = (count: number, currentDrawPile: Card[], currentDiscardPile: Card[]) => {
    let tempDraw = [...currentDrawPile];
    let tempDiscard = [...currentDiscardPile];
    const drawn: Card[] = [];

    for (let i = 0; i < count; i++) {
      if (tempDraw.length === 0) {
        if (tempDiscard.length > 1) {
          const topCard = tempDiscard[0];
          tempDraw = shuffleDeck(tempDiscard.slice(1));
          tempDiscard = [topCard];
        } else {
          break; // absolutely out of cards
        }
      }
      if (tempDraw.length > 0) {
        drawn.push(tempDraw[0]);
        tempDraw = tempDraw.slice(1);
      }
    }

    if (drawn.length > 0) {
      audio.playDraw();
      setPlayerHand(prev => [...prev, ...drawn]);
      setDrawPile(tempDraw);
      setDiscardPile(tempDiscard);
    }
  };

  // Penalize AI (makes opponent draw)
  const penalizeAi = (count: number, currentDrawPile: Card[], currentDiscardPile: Card[]) => {
    let tempDraw = [...currentDrawPile];
    let tempDiscard = [...currentDiscardPile];
    const drawn: Card[] = [];

    for (let i = 0; i < count; i++) {
      if (tempDraw.length === 0) {
        if (tempDiscard.length > 1) {
          const topCard = tempDiscard[0];
          tempDraw = shuffleDeck(tempDiscard.slice(1));
          tempDiscard = [topCard];
        } else {
          break; // absolutely out of cards
        }
      }
      if (tempDraw.length > 0) {
        drawn.push(tempDraw[0]);
        tempDraw = tempDraw.slice(1);
      }
    }

    if (drawn.length > 0) {
      audio.playDraw();
      setAiHand(prev => [...prev, ...drawn]);
      setDrawPile(tempDraw);
      setDiscardPile(tempDiscard);
    }
  };

  // Draw Card in Crazy Mode
  const handleCrazyDrawCard = () => {
    if (currentTurn !== 'player') return;
    if (playerHasDrawn) {
      setRefereeCommentary("You have already drawn this turn! If you cannot make a play, tap PASS.");
      audio.playError();
      return;
    }

    let currentDrawPile = [...drawPile];
    let currentDiscard = [...discardPile];
    let nextCard: Card | null = null;

    if (currentDrawPile.length === 0) {
      if (currentDiscard.length > 1) {
        audio.playDraw();
        const topCard = currentDiscard[0];
        const reshuffledDeck = shuffleDeck(currentDiscard.slice(1));
        nextCard = reshuffledDeck[0];
        setDrawPile(reshuffledDeck.slice(1));
        setDiscardPile([topCard]);
        setPlayerHand([...playerHand, nextCard]);
        setPlayerHasDrawn(true);
        setDrawnCardId(nextCard.id);
        
        // Check if playable
        const isPlayable = isCardPlayableInCrazy(nextCard, topCard, activeCrazySuit);
        if (isPlayable) {
          setRefereeCommentary(`You reshuffled and drew ${formatCardName(nextCard)}. It's playable! Select it and tap PLAY CARD.`);
        } else {
          setRefereeCommentary(`You reshuffled and drew ${formatCardName(nextCard)}. Not playable. Tap PASS.`);
        }
      } else {
        setRefereeCommentary("No more cards left to draw in the deck!");
        audio.playError();
      }
    } else {
      audio.playDraw();
      nextCard = currentDrawPile[0];
      setDrawPile(currentDrawPile.slice(1));
      setPlayerHand([...playerHand, nextCard]);
      setPlayerHasDrawn(true);
      setDrawnCardId(nextCard.id);
      
      // Check if playable
      const topCard = currentDiscard[0];
      const isPlayable = isCardPlayableInCrazy(nextCard, topCard, activeCrazySuit);
      if (isPlayable) {
        setRefereeCommentary(`You drew ${formatCardName(nextCard)}. This card is playable! Select it and tap PLAY CARD.`);
      } else {
        setRefereeCommentary(`You drew ${formatCardName(nextCard)}. It's not playable. Tap PASS to end your turn.`);
      }
    }
  };

  // Play Card in Crazy Mode
  const handleCrazyPlayCard = () => {
    if (currentTurn !== 'player') return;
    if (!selectedCard) {
      setRefereeCommentary("Select a card from your hand to play.");
      audio.playError();
      return;
    }

    const topCard = discardPile[0];
    const isPlayable = isCardPlayableInCrazy(selectedCard, topCard, activeCrazySuit);

    if (!isPlayable) {
      setRefereeCommentary(
        activeCrazySuit 
          ? `Illegal move! You must match the active suit (${activeCrazySuit.toUpperCase()}) or play an 8 or Jack.`
          : `Illegal move! Match the top card's rank or suit, or play an 8 or Jack.`
      );
      audio.playError();
      return;
    }

    // Card is playable!
    audio.playDiscard();

    // If it's an 8 or Jack, trigger suit selection first
    if (selectedCard.rank === '8' || selectedCard.rank === 'J') {
      setPlayedCrazyCard(selectedCard);
      setIsSuitSelectionOpen(true);
      return;
    }

    // Normal Card Play
    const updatedHand = playerHand.filter(c => c.id !== selectedCard.id);
    setPlayerHand(updatedHand);
    setSelectedCard(null);
    setDrawnCardId(null);
    
    // Set active crazy suit back to null
    setActiveCrazySuit(null);

    // Play on discard pile
    const updatedDiscard = [selectedCard, ...discardPile];
    setDiscardPile(updatedDiscard);

    let commentary = `You played ${formatCardName(selectedCard)}.`;

    // Handle penalties
    if (selectedCard.rank === '2') {
      commentary += ` PENALTY! Opponent must immediately draw 2 cards!`;
      penalizeAi(2, drawPile, updatedDiscard);
    } else if (selectedCard.rank === 'A' && selectedCard.suit === 'spades') {
      commentary += ` ULTRA PENALTY! Opponent must immediately draw 5 cards!`;
      penalizeAi(5, drawPile, updatedDiscard);
    }

    // Check Win Condition
    if (updatedHand.length === 0) {
      audio.playWin();
      setMatchWinner('player');
      setScores(prev => ({ ...prev, player: prev.player + 1 }));
      setRefereeCommentary("CONGRATULATIONS! You got rid of all your cards and won the match!");
      setTimeout(() => {
        setPhase('gameover');
      }, 2000);
      return;
    }

    // Switch Turn
    setCurrentTurn('ai');
    setPlayerHasDrawn(false);
    setRefereeCommentary(commentary + " Opponent is calculating...");
    
    // Trigger AI turn
    triggerCrazyAiMove(updatedDiscard);
  };

  // Pass Turn in Crazy Mode
  const handleCrazyPassTurn = () => {
    if (currentTurn !== 'player') return;
    if (!playerHasDrawn) {
      setRefereeCommentary("You must draw a card from the deck before passing!");
      audio.playError();
      return;
    }

    // Turn changes
    audio.playSelect();
    setCurrentTurn('ai');
    setPlayerHasDrawn(false);
    setSelectedCard(null);
    setDrawnCardId(null);
    setRefereeCommentary("You passed your turn. Opponent is thinking...");
    
    // Trigger AI turn
    triggerCrazyAiMove(discardPile);
  };

  // Suit Selection Callback in Crazy Mode
  const handleSuitSelect = (suit: Suit) => {
    if (!playedCrazyCard) return;

    // Complete the card play
    audio.playDiscard();
    const updatedHand = playerHand.filter(c => c.id !== playedCrazyCard.id);
    setPlayerHand(updatedHand);
    setSelectedCard(null);
    setDrawnCardId(null);

    // Set the active suit chosen
    setActiveCrazySuit(suit);

    // Play on discard pile
    const updatedDiscard = [playedCrazyCard, ...discardPile];
    setDiscardPile(updatedDiscard);

    // Clear tracking
    setPlayedCrazyCard(null);
    setIsSuitSelectionOpen(false);

    // Check Win Condition
    if (updatedHand.length === 0) {
      audio.playWin();
      setMatchWinner('player');
      setScores(prev => ({ ...prev, player: prev.player + 1 }));
      setRefereeCommentary("CONGRATULATIONS! You got rid of all your cards and won the match!");
      setTimeout(() => {
        setPhase('gameover');
      }, 2000);
      return;
    }

    // Switch Turn
    setCurrentTurn('ai');
    setPlayerHasDrawn(false);
    setRefereeCommentary(`You played ${formatCardName(playedCrazyCard)} and chose ${suit.toUpperCase()}! Opponent's turn.`);
    
    // Trigger AI turn
    triggerCrazyAiMove(updatedDiscard);
  };

  // AI Decision Engine for Crazy Mode
  const triggerCrazyAiMove = (currentDiscardPile: Card[]) => {
    setIsAiThinking(true);
    
    setTimeout(() => {
      const topCard = currentDiscardPile[0];
      // Find all valid cards AI can play
      const playableCards = aiHand.filter(card => isCardPlayableInCrazy(card, topCard, activeCrazySuit));
      
      if (playableCards.length > 0) {
        // AI has at least one playable card. Prioritize penalties, then normal cards, then wildcards
        let cardToPlay = playableCards.find(c => c.rank === '2' || (c.rank === 'A' && c.suit === 'spades'));
        if (!cardToPlay) {
          cardToPlay = playableCards.find(c => c.rank !== '8' && c.rank !== 'J');
        }
        if (!cardToPlay) {
          cardToPlay = playableCards[0]; // fallback to 8 or J
        }
        
        // Play the card!
        audio.playDiscard();
        const updatedAiHand = aiHand.filter(c => c.id !== cardToPlay.id);
        setAiHand(updatedAiHand);
        
        const updatedDiscardPile = [cardToPlay, ...currentDiscardPile];
        setDiscardPile(updatedDiscardPile);
        
        let commentary = `Opponent played ${formatCardName(cardToPlay)}.`;
        
        // Check if it's an 8 or J
        if (cardToPlay.rank === '8' || cardToPlay.rank === 'J') {
          // AI chooses the suit it has the most of in its remaining hand
          const suitCounts: Record<Suit, number> = { spades: 0, hearts: 0, diamonds: 0, clubs: 0, joker: 0 };
          updatedAiHand.forEach(c => { suitCounts[c.suit] = (suitCounts[c.suit] || 0) + 1; });
          let bestSuit: Suit = 'spades';
          let maxCount = -1;
          (['spades', 'hearts', 'diamonds', 'clubs'] as Suit[]).forEach(s => {
            if (suitCounts[s] > maxCount) {
              maxCount = suitCounts[s];
              bestSuit = s;
            }
          });
          
          setActiveCrazySuit(bestSuit);
          commentary += ` Opponent chose ${bestSuit.toUpperCase()} as the next active suit!`;
        } else {
          // Clear active crazy suit since a normal card was played
          setActiveCrazySuit(null);
          
          // Check penalties
          if (cardToPlay.rank === '2') {
            commentary += ` PENALTY! You must immediately draw 2 cards!`;
            penalizePlayer(2, drawPile, updatedDiscardPile);
          } else if (cardToPlay.rank === 'A' && cardToPlay.suit === 'spades') {
            commentary += ` ULTRA PENALTY! You must immediately draw 5 cards!`;
            penalizePlayer(5, drawPile, updatedDiscardPile);
          }
        }
        
        // Check if AI wins
        if (updatedAiHand.length === 0) {
          audio.playLose();
          setMatchWinner('ai');
          setScores(prev => ({ ...prev, ai: prev.ai + 1 }));
          setRefereeCommentary(`Opponent has played their last card and won!`);
          setTimeout(() => {
            setPhase('gameover');
          }, 2000);
          setIsAiThinking(false);
          return;
        }
        
        // Finish turn
        setIsAiThinking(false);
        setCurrentTurn('player');
        setPlayerHasDrawn(false);
        setRefereeCommentary(commentary + " Your turn!");
        
      } else {
        // AI cannot play. It must draw from the deck!
        let currentDrawPile = [...drawPile];
        let currentDiscard = [...currentDiscardPile];
        
        if (currentDrawPile.length === 0) {
          // Reshuffle discard pile if draw is empty
          if (currentDiscard.length > 1) {
            audio.playDraw();
            const topCard = currentDiscard[0];
            currentDrawPile = shuffleDeck(currentDiscard.slice(1));
            currentDiscard = [topCard];
            setDiscardPile(currentDiscard);
          } else {
            // Genuinely no cards left. AI has to pass.
            setIsAiThinking(false);
            setCurrentTurn('player');
            setPlayerHasDrawn(false);
            setRefereeCommentary("Draw Pile is completely empty! Opponent passes. Your turn!");
            return;
          }
        }
        
        audio.playDraw();
        const drawnCard = currentDrawPile[0];
        const nextDrawPile = currentDrawPile.slice(1);
        setDrawPile(nextDrawPile);
        
        // Check if drawn card is playable
        const isDrawnPlayable = isCardPlayableInCrazy(drawnCard, currentDiscard[0], activeCrazySuit);
        
        if (isDrawnPlayable) {
          // AI plays the drawn card immediately!
          audio.playDiscard();
          const updatedDiscardPile = [drawnCard, ...currentDiscard];
          setDiscardPile(updatedDiscardPile);
          
          let commentary = `Opponent had no valid plays, draws a card, and plays it immediately: ${formatCardName(drawnCard)}.`;
          
          if (drawnCard.rank === '8' || drawnCard.rank === 'J') {
            const suitCounts: Record<Suit, number> = { spades: 0, hearts: 0, diamonds: 0, clubs: 0, joker: 0 };
            aiHand.forEach(c => { suitCounts[c.suit] = (suitCounts[c.suit] || 0) + 1; });
            let bestSuit: Suit = 'spades';
            let maxCount = -1;
            (['spades', 'hearts', 'diamonds', 'clubs'] as Suit[]).forEach(s => {
              if (suitCounts[s] > maxCount) {
                maxCount = suitCounts[s];
                bestSuit = s;
              }
            });
            setActiveCrazySuit(bestSuit);
            commentary += ` Opponent chose ${bestSuit.toUpperCase()} as the next active suit!`;
          } else {
            setActiveCrazySuit(null);
            
            if (drawnCard.rank === '2') {
              commentary += ` PENALTY! You must immediately draw 2 cards!`;
              penalizePlayer(2, nextDrawPile, updatedDiscardPile);
            } else if (drawnCard.rank === 'A' && drawnCard.suit === 'spades') {
              commentary += ` ULTRA PENALTY! You must immediately draw 5 cards!`;
              penalizePlayer(5, nextDrawPile, updatedDiscardPile);
            }
          }
          
          setIsAiThinking(false);
          setCurrentTurn('player');
          setPlayerHasDrawn(false);
          setRefereeCommentary(commentary + " Your turn!");
          
        } else {
          // AI adds the drawn card to its hand and passes
          setAiHand([...aiHand, drawnCard]);
          setIsAiThinking(false);
          setCurrentTurn('player');
          setPlayerHasDrawn(false);
          setRefereeCommentary(`Opponent had no valid plays, draws a card, and passes. Your turn!`);
        }
      }
    }, 1500);
  };

  // Discard Selected Card
  const handleDiscard = () => {
    if (currentTurn !== 'player') return;
    if (!playerHasDrawn) {
      setRefereeCommentary("You must DRAW a card before you can discard!");
      audio.playError();
      return;
    }

    if (!selectedCard) {
      setRefereeCommentary("Select a card from your hand first, then tap DISCARD.");
      audio.playError();
      return;
    }

    audio.playDiscard();

    // Remove from player hand
    const updatedHand = playerHand.filter(c => c.id !== selectedCard.id);
    setPlayerHand(updatedHand);
    setDrawnCardId(null); // Clear drawn card tracking!

    // Add to discard pile
    setDiscardPile([selectedCard, ...discardPile]);
    const discardedName = formatCardName(selectedCard);
    
    // Clear selection
    setSelectedCard(null);

    // Swap Turn
    setCurrentTurn('ai');
    setPlayerHasDrawn(false);
    setRefereeCommentary(`You discarded ${discardedName}. Now Opponent is calculating...`);
    
    // Trigger AI Move
    triggerAiMove([selectedCard, ...discardPile]);
  };

  // AI Opponent Move Implementation
  const triggerAiMove = (currentDiscardPile: Card[]) => {
    if (gameType === 'crazy') {
      triggerCrazyAiMove(currentDiscardPile);
      return;
    }

    setIsAiThinking(true);

    setTimeout(() => {
      // 1. Draw card
      if (drawPile.length === 0) {
        setIsAiThinking(false);
        setRefereeCommentary("Draw Pile is empty! Game ends in draw.");
        return;
      }

      audio.playDraw();
      const drawnCard = drawPile[0];
      const nextDrawPile = drawPile.slice(1);
      setDrawPile(nextDrawPile);

      const combinedHand = [...aiHand, drawnCard];
      
      setRefereeCommentary(`Opponent draws a card.`);

      setTimeout(() => {
        // 2. Decide discard
        const decision = makeAiDecision(combinedHand, nextDrawPile.length === 0);
        
        // Check if AI wins
        if (decision.isWin) {
          audio.playLose();
          setAiHand(combinedHand.filter(c => c.id !== decision.discardCard.id));
          setAiWinningPartition(decision.bestPartition);
          setDiscardPile([decision.discardCard, ...currentDiscardPile]);
          setMatchWinner('ai');
          setScores(prev => ({ ...prev, ai: prev.ai + 1 }));
          setRefereeCommentary(`Unbelievable! The Opponent arranged all sequences and won!`);
          setTimeout(() => {
            setPhase('gameover');
          }, 2000);
          setIsAiThinking(false);
          return;
        }

        // Otherwise, execute discard
        audio.playDiscard();
        const nextAiHand = combinedHand.filter(c => c.id !== decision.discardCard.id);
        setAiHand(nextAiHand);
        setDiscardPile([decision.discardCard, ...currentDiscardPile]);

        // Finish AI Turn
        setIsAiThinking(false);
        setCurrentTurn('player');
        setPlayerHasDrawn(false);
        setRefereeCommentary(
          `Opponent discarded ${formatCardName(decision.discardCard)}. Draw a card to begin your turn!`
        );
      }, 1600);

    }, 1500);
  };

  // Declare Win (Manual trigger for player)
  const handleDeclareWin = () => {
    audio.playSelect();

    if (playerHand.length !== 10) {
      setRefereeCommentary(
        `A winning hand must consist of exactly 10 cards arranged into 3, 3, and 4! You currently have ${playerHand.length} cards. Discard first!`
      );
      audio.playError();
      return;
    }

    const group1 = playerHand.slice(0, 3);
    const group2 = playerHand.slice(3, 6);
    const group3 = playerHand.slice(6, 10);

    const v1 = validateSequence(group1, 3);
    const v2 = validateSequence(group2, 3);
    const v3 = validateSequence(group3, 4);

    if (v1.isValid && v2.isValid && v3.isValid) {
      // WINNER!
      audio.playWin();
      setMatchWinner('player');
      setScores(prev => ({ ...prev, player: prev.player + 1 }));
      setRefereeCommentary("VICTORY! All sequences verified by the referee! Outstanding match!");
      setTimeout(() => {
        setPhase('gameover');
      }, 2000);
    } else {
      // Invalid
      let errMsg = "Declaring Win failed! Let's check: ";
      if (!v1.isValid) errMsg += "Sequence 1 is invalid. ";
      if (!v2.isValid) errMsg += "Sequence 2 is invalid. ";
      if (!v3.isValid) errMsg += "Sequence 3 is invalid. ";
      setRefereeCommentary(errMsg);
      audio.playError();
    }
  };

  // Quit and return to menu
  const handleQuitToMenu = () => {
    audio.playSelect();
    setPhase('menu');
  };

  return (
    <div className="h-screen max-h-screen h-[100dvh] max-h-[100dvh] bg-slate-950 font-sans text-white select-none relative overflow-hidden">
      
      {/* Visual Splash Page */}
      <AnimatePresence>
        {phase === 'splash' && (
          <SplashScreen onComplete={() => setPhase('menu')} />
        )}
      </AnimatePresence>

      {/* Main menu Page */}
      {phase === 'menu' && (
        <MainMenu 
          settings={settings}
          onUpdateSettings={setSettings}
          gameType={gameType}
          onSelectGameType={setGameType}
          onStartGame={handleStartMatch}
        />
      )}

      {/* Gameplay Table Screen */}
      {phase === 'playing' && (
        <div className="game-play-container h-screen max-h-screen h-[100dvh] max-h-[100dvh] overflow-hidden bg-gradient-to-b from-emerald-900 via-emerald-950 to-slate-950 flex flex-col justify-between py-1 sm:py-2.5 px-2.5 sm:px-6 max-w-5xl mx-auto relative">
          
          {/* Subtle gold lines overlay for real poker table vibe */}
          <div className="absolute inset-2 sm:inset-4 border border-yellow-500/10 rounded-2xl sm:rounded-[32px] pointer-events-none z-0" />
          <div className="absolute top-12 left-1/2 -translate-x-1/2 text-[9px] font-mono tracking-[0.3em] text-yellow-500/10 uppercase pointer-events-none">
            ROYAL CASINO CLUB • PRESTIGE SERIES
          </div>

          {/* Header Bar */}
          <div className="relative z-10 flex items-center justify-between bg-slate-950/40 p-1.5 sm:p-2 rounded-xl border border-white/5 mb-1 sm:mb-2">
            <button
              onClick={handleQuitToMenu}
              className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg hover:border-slate-700 text-[10px] font-mono text-slate-400 active:scale-95 transition-transform flex items-center space-x-1 cursor-pointer"
            >
              <Menu className="w-3 h-3" />
              <span>QUIT</span>
            </button>

            {/* Scores & Count */}
            <div className="flex items-center space-x-2.5 text-xs font-mono font-bold tracking-wider text-slate-300">
              <span className="text-emerald-400">YOU: {scores.player}</span>
              <span className="text-slate-700">|</span>
              <span className="text-rose-400">AI: {scores.ai}</span>
            </div>

            {/* Sound & Help */}
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setShowRulesModal(true)}
                className="w-7 h-7 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-400 cursor-pointer active:scale-95 transition-transform"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setSettings({ ...settings, soundEnabled: !settings.soundEnabled })}
                className="w-7 h-7 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-400 cursor-pointer active:scale-95 transition-transform"
              >
                {settings.soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-600" />}
              </button>
            </div>
          </div>

          {/* Opponent Hand Panel */}
          <div className="game-opponent-panel relative z-10 flex flex-col items-center bg-slate-950/40 border border-white/5 rounded-xl p-1.5 mb-1 sm:mb-2">
            <div className="text-[8px] sm:text-[9px] font-mono tracking-widest text-slate-500 uppercase mb-0.5 sm:mb-1 flex items-center space-x-1">
              {isAiThinking && <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping mr-1 inline-block" />}
              <span>{isAiThinking ? 'AI OPPONENT IS THINKING...' : 'AI OPPONENT'}</span>
            </div>
            
            <div className="flex -space-x-3.5 justify-center py-1.5">
              {aiHand.map((_, idx) => (
                <motion.div 
                  key={`ai-card-${idx}`}
                  initial={isDealing ? { opacity: 0, scale: 0.2, y: -150, x: -50, rotate: 180 } : false}
                  animate={{ opacity: 1, scale: 1, y: 0, x: 0, rotate: 0 }}
                  transition={isDealing 
                    ? { type: "spring", stiffness: 80, damping: 14, delay: idx * 0.12 }
                    : { type: "spring", stiffness: 300, damping: 28 }
                  }
                  className="relative w-7 h-10 sm:w-9 sm:h-12 bg-red-600 rounded-md border border-red-500 shadow-md overflow-hidden flex flex-col items-center justify-center"
                >
                  {/* Miniature Coca-Cola back */}
                  <div className="absolute inset-0 bg-gradient-to-br from-red-600 via-red-700 to-red-800" />
                  <div className="absolute top-1/2 left-0 right-0 h-2 bg-white/25 -skew-y-12 transform -translate-y-1/2 pointer-events-none" />
                  <div className="absolute top-1/2 left-0 right-0 h-1 bg-white -skew-y-6 transform -translate-y-1/2 opacity-90 pointer-events-none" />
                  <div className="absolute top-[60%] left-0 right-0 h-0.5 bg-yellow-400/50 -skew-y-6 transform pointer-events-none" />
                  <span className="relative z-10 text-[6px] font-serif italic text-white leading-none rotate-[-6deg]">Enjoy</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* TURN POINTER INDICATOR */}
          <div className="game-turn-indicator relative z-20 flex justify-center my-1 sm:my-1.5">
            {currentTurn === 'player' ? (
              <motion.div 
                initial={{ y: -5, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="flex flex-col items-center space-y-0.5 sm:space-y-1"
              >
                <div className="px-3 py-1 sm:px-4 sm:py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full text-[9px] sm:text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-white shadow-[0_0_10px_rgba(16,185,129,0.3)] border border-emerald-400 flex items-center space-x-1 sm:space-x-1.5">
                  <span className="w-1 sm:w-1.5 h-1 sm:h-1.5 rounded-full bg-white animate-ping" />
                  <span>YOUR TURN</span>
                </div>
                <motion.div 
                  animate={{ y: [0, 3, 0] }} 
                  transition={{ repeat: Infinity, duration: 1.2 }}
                  className="text-emerald-400 text-[10px] sm:text-xs font-black drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]"
                >
                  ▼
                </motion.div>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ y: 5, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="flex flex-col items-center space-y-0.5 sm:space-y-1"
              >
                <motion.div 
                  animate={{ y: [0, -3, 0] }} 
                  transition={{ repeat: Infinity, duration: 1.2 }}
                  className="text-amber-400 text-[10px] sm:text-xs font-black drop-shadow-[0_0_5px_rgba(251,191,36,0.5)]"
                >
                  ▲
                </motion.div>
                <div className="px-3 py-1 sm:px-4 sm:py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full text-[9px] sm:text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-white shadow-[0_0_10px_rgba(245,158,11,0.3)] border border-amber-400 flex items-center space-x-1 sm:space-x-1.5">
                  <span className="w-1 sm:w-1.5 h-1 sm:h-1.5 rounded-full bg-white animate-pulse" />
                  <span>OPPONENT'S TURN</span>
                </div>
              </motion.div>
            )}
          </div>
          {/* POKER FELT TABLE SECTION (Luxurious Mahogany wood rim style) */}
          <div className="game-felt-table relative z-10 flex-1 my-0.5 sm:my-1.5 border-4 sm:border-[10px] border-amber-950/95 bg-gradient-to-b from-emerald-800 to-emerald-900 shadow-[0_12px_24px_rgba(0,0,0,0.5),inset_0_0_30px_rgba(0,0,0,0.8)] rounded-2xl sm:rounded-[40px] p-1.5 sm:p-3 flex flex-col justify-between relative min-h-[100px] sm:min-h-[130px] touch-none">
            
            {/* Table layout inner dashed gold line */}
            <div className="absolute inset-1 sm:inset-2 border border-dashed border-yellow-500/15 rounded-xl sm:rounded-[32px] pointer-events-none" />
 
            {/* Piles (Center) */}
            <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto w-full my-auto z-10">
              
              {/* Draw Pile Slot */}
              <div className="flex flex-col items-center text-center">
                <button
                  onClick={handleDrawCard}
                  disabled={currentTurn !== 'player' || playerHasDrawn}
                  className={`
                    relative w-14 sm:w-16 aspect-[5/7] rounded-xl cursor-pointer active:scale-95 transition-all flex items-center justify-center overflow-hidden
                    ${(currentTurn === 'player' && !playerHasDrawn) 
                      ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-emerald-900 shadow-[0_0_15px_rgba(234,179,8,0.6)] animate-pulse' 
                      : 'border border-red-500 shadow-lg'
                    }
                  `}
                >
                  {/* Premium Coca-Cola brand card back */}
                  <div className="absolute inset-0 bg-gradient-to-br from-red-600 via-red-700 to-red-800 flex flex-col justify-between p-1.5 sm:p-2">
                    <div className="absolute top-1/2 left-0 right-0 h-4 bg-white/20 -skew-y-12 transform -translate-y-1/2 pointer-events-none" />
                    <div className="absolute top-1/2 left-0 right-0 h-2 bg-white -skew-y-6 transform -translate-y-1/2 opacity-95 pointer-events-none" />
                    <div className="absolute top-[58%] left-0 right-0 h-[3px] bg-yellow-400 -skew-y-6 transform pointer-events-none" />
                    
                    <div className="relative z-10 flex flex-col h-full justify-between items-center text-white w-full">
                      <span className="text-[6px] sm:text-[7px] font-serif italic text-red-100 uppercase tracking-widest font-black leading-none mt-0.5">CLASSIC</span>
                      <span className="text-xs sm:text-sm font-serif italic font-extrabold text-white select-none drop-shadow-md tracking-tight leading-none rotate-[-8deg] my-auto">
                        Enjoy
                      </span>
                      <span className="text-[9px] sm:text-xs font-mono font-black text-white bg-red-950/40 px-1.5 py-0.5 rounded-md border border-white/10 mt-auto leading-none">
                        {drawPile.length}
                      </span>
                    </div>
                  </div>
                </button>
                <span className="text-[8px] font-mono text-emerald-400/80 tracking-wider uppercase mt-1">
                  DRAW ({drawPile.length})
                </span>
              </div>
 
              {/* Discard Pile Slot */}
              <div className="flex flex-col items-center text-center">
                {discardPile.length > 0 ? (
                  <div 
                    className={`relative cursor-pointer transition-all duration-200 ${
                      (currentTurn === 'player' && !playerHasDrawn && gameType === 'sequence') 
                        ? 'scale-105 filter drop-shadow-[0_0_8px_rgba(234,179,8,0.7)]' 
                        : ''
                    }`}
                  >
                    <CardComponent 
                      card={discardPile[0]} 
                      isMini={true} 
                      draggable={currentTurn === 'player' && !playerHasDrawn && gameType === 'sequence'}
                      onDragStart={(e) => {
                        if (gameType !== 'sequence') return;
                        e.dataTransfer.setData("text/plain", "discard");
                        setDraggedIndex(-100);
                      }}
                      onDragEnd={handleDragEnd}
                      onClick={handleDrawFromDiscard}
                    />
                    {discardPile.length > 1 && (
                      <div className="absolute -bottom-0.5 -right-0.5 -z-10 w-10 h-14 rounded-xl bg-slate-900 border border-slate-800 rotate-3 opacity-60" />
                    )}
 
                    {/* Floating guide indicator above the discard pile card */}
                    {gameType === 'sequence' && currentTurn === 'player' && !playerHasDrawn && (
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-yellow-400 text-slate-950 px-1 py-0.5 text-[7px] font-mono font-bold uppercase rounded border border-white whitespace-nowrap shadow-md pointer-events-none animate-bounce">
                        DRAG OR TAP
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-10 h-14 rounded-lg border border-dashed border-emerald-850/60 flex items-center justify-center text-emerald-800 bg-emerald-950/10">
                    <span className="text-[8px] font-mono uppercase">EMPTY</span>
                  </div>
                )}
                <span className="text-[8px] font-mono text-emerald-400/80 tracking-wider uppercase mt-1">
                  DISCARD ({discardPile.length})
                </span>
              </div>
 
            </div>

            {/* Crazy Active Suit Overlay HUD */}
            {gameType === 'crazy' && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-slate-950/85 border border-slate-800/80 px-3.5 py-1.5 rounded-full z-20 flex items-center space-x-2 shadow-xl">
                <span className="text-[8px] font-mono tracking-wider text-slate-400">ACTIVE SUIT:</span>
                {activeCrazySuit ? (
                  <span className={`text-[10px] font-black uppercase font-mono flex items-center gap-1.5 ${
                    activeCrazySuit === 'hearts' || activeCrazySuit === 'diamonds' ? 'text-rose-400' : 'text-slate-100'
                  }`}>
                    <span className="text-sm">
                      {activeCrazySuit === 'hearts' && '♥'}
                      {activeCrazySuit === 'diamonds' && '♦'}
                      {activeCrazySuit === 'clubs' && '♣'}
                      {activeCrazySuit === 'spades' && '♠'}
                    </span>
                    <span>{activeCrazySuit}</span>
                  </span>
                ) : (
                  <span className={`text-[10px] font-black uppercase font-mono flex items-center gap-1.5 ${
                    discardPile[0]?.suit === 'hearts' || discardPile[0]?.suit === 'diamonds' ? 'text-rose-400' : 'text-slate-100'
                  }`}>
                    <span className="text-sm">
                      {discardPile[0]?.suit === 'hearts' && '♥'}
                      {discardPile[0]?.suit === 'diamonds' && '♦'}
                      {discardPile[0]?.suit === 'clubs' && '♣'}
                      {discardPile[0]?.suit === 'spades' && '♠'}
                    </span>
                    <span>{discardPile[0]?.suit}</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Unified My Hand Row */}
          <div className="game-my-hand-container relative z-10 my-0.5 sm:my-1.5 bg-slate-950/40 border border-white/5 rounded-2xl p-1 sm:p-2 space-y-0.5 sm:space-y-1.5 touch-none">
            <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase text-slate-400">
              <span className="flex items-center space-x-1">
                <span>MY HAND ({playerHand.length} CARDS)</span>
              </span>
              <span className="text-emerald-400 animate-pulse text-[9px] sm:text-[10px]">
                {gameType === 'crazy' 
                  ? (selectedCard ? "TAP PLAY CARD AT THE BOTTOM TO SUBMIT!" : "SELECT A VALID CARD TO PLAY!")
                  : (selectedCard ? "TAP ANOTHER CARD TO SWAP!" : "DRAG CARDS TO REORDER OR TAP TO SELECT")
                }
              </span>
            </div>

            {/* Hand row of cards - FANNED HELD-IN-HAND LAYOUT */}
            <div className="flex items-center justify-center -space-x-3.5 sm:-space-x-5 overflow-visible py-1 sm:py-2 w-full h-[12vh] max-h-[105px] min-h-[75px] touch-none">
              {/* Front drop target zone spacer */}
              <div
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, 0)}
                className="w-8 sm:w-11 aspect-[5/7] border border-dashed border-white/5 hover:border-yellow-400/40 rounded-lg flex items-center justify-center text-[7px] sm:text-[9px] font-mono text-yellow-500/40 transition-all -mr-4 sm:-mr-5 relative z-30 group"
                title="Drop here to make first card"
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-20 group-hover:opacity-100 bg-yellow-400/0 group-hover:bg-yellow-400/5 rounded-lg transition-all">
                  <span className="text-[7px] sm:text-[9px] font-bold tracking-tight">FRONT</span>
                  <span className="text-xs">←</span>
                </div>
              </div>

              {playerHand.map((card, idx) => {
                const isSelected = selectedCard?.id === card.id;
                const isDrawn = card.id === drawnCardId;

                // Fanning calculations
                const totalCards = playerHand.length;
                const midIdx = (totalCards - 1) / 2;
                const rotationAngle = (idx - midIdx) * 4.2; // fanning angle spread
                const verticalOffset = Math.pow(Math.abs(idx - midIdx), 1.8) * 1.8; // beautiful arched curve offset

                return (
                  <motion.div 
                    key={card.id} 
                    className="flex flex-col items-center"
                    layout
                    initial={isDealing ? { opacity: 0, scale: 0.2, y: 250, x: -100, rotate: -180 } : false}
                    animate={{ 
                      opacity: 1, 
                      scale: isSelected ? 1.1 : (isDrawn ? 1.08 : 1), 
                      y: isSelected ? -28 : (isDrawn ? verticalOffset - 15 : verticalOffset),
                      x: 0,
                      rotate: isSelected ? 0 : rotationAngle
                    }}
                    transition={isDealing 
                      ? { type: "spring", stiffness: 80, damping: 14, delay: idx * 0.12 }
                      : { type: "spring", stiffness: 300, damping: 28 }
                    }
                    style={{
                      zIndex: isSelected ? 50 : (isDrawn ? 45 : idx + 10),
                      transformOrigin: 'bottom center',
                    }}
                  >
                    <CardComponent
                      card={card}
                      isSelected={isSelected}
                      onClick={() => handleCardTap(card)}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, idx)}
                      onDragEnd={handleDragEnd}
                      isDrawn={isDrawn}
                    />
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Responsive Bottom Controls */}
          <div className="game-bottom-controls relative w-full bg-slate-950/90 border border-slate-900 py-1 sm:py-2 px-3 sm:px-4 flex items-center justify-between gap-2 z-45 backdrop-blur-md rounded-xl mt-0.5 sm:mt-1">
            {gameType === 'sequence' ? (
              <>
                {/* Auto-Arrange */}
                <button
                  onClick={handlePlayerAutoArrange}
                  className="flex-1 h-10 sm:h-12 bg-slate-900 border border-slate-800 rounded-xl font-mono text-[10px] sm:text-[11px] font-bold text-slate-300 flex items-center justify-center space-x-1 cursor-pointer active:scale-95 transition-transform"
                >
                  <Sparkles className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
                  <span>AUTO SORT</span>
                </button>

                {/* Discard */}
                <button
                  onClick={handleDiscard}
                  disabled={currentTurn !== 'player' || !playerHasDrawn || !selectedCard}
                  className={`
                    flex-1 h-10 sm:h-12 rounded-xl font-bold text-[10px] sm:text-xs tracking-wider flex items-center justify-center space-x-1 cursor-pointer active:scale-95 transition-all
                    ${(currentTurn === 'player' && playerHasDrawn && selectedCard)
                      ? 'bg-rose-600 text-white border border-rose-400/40 shadow-[0_0_15px_rgba(220,38,38,0.4)]'
                      : 'bg-slate-900/50 text-slate-500 border border-slate-950 cursor-not-allowed'
                    }
                  `}
                >
                  <span>DISCARD CARD</span>
                </button>

                {/* Declare Win */}
                <button
                  onClick={handleDeclareWin}
                  disabled={currentTurn !== 'player'}
                  className="flex-1 h-10 sm:h-12 bg-gradient-to-r from-amber-500 to-yellow-600 border border-amber-300/30 rounded-xl font-bold text-[10px] sm:text-xs tracking-wider text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.3)] flex items-center justify-center space-x-1 active:scale-95 transition-transform cursor-pointer"
                >
                  <Trophy className="w-3.5 h-3.5 fill-slate-950" />
                  <span>DECLARE WIN</span>
                </button>
              </>
            ) : (
              <>
                {/* Play Card */}
                <button
                  onClick={handleCrazyPlayCard}
                  disabled={currentTurn !== 'player' || !selectedCard}
                  className={`
                    flex-[2] h-10 sm:h-12 rounded-xl font-bold text-[10px] sm:text-xs tracking-wider flex items-center justify-center space-x-1 sm:space-x-1.5 cursor-pointer active:scale-95 transition-all
                    ${(currentTurn === 'player' && selectedCard)
                      ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white border border-amber-400/20 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                      : 'bg-slate-900/50 text-slate-500 border border-slate-950 cursor-not-allowed'
                    }
                  `}
                >
                  <Flame className="w-4 h-4 text-white" />
                  <span>PLAY SELECTED CARD</span>
                </button>

                {/* PASS Turn */}
                <button
                  onClick={handleCrazyPassTurn}
                  disabled={currentTurn !== 'player' || !playerHasDrawn}
                  className={`
                    flex-1 h-10 sm:h-12 rounded-xl font-bold text-[10px] sm:text-xs tracking-wider flex items-center justify-center space-x-1 cursor-pointer active:scale-95 transition-all
                    ${(currentTurn === 'player' && playerHasDrawn)
                      ? 'bg-slate-800 text-slate-100 border border-slate-700 hover:border-slate-600 shadow-[0_0_10px_rgba(255,255,255,0.05)]'
                      : 'bg-slate-900/30 text-slate-650 border border-slate-950 cursor-not-allowed'
                    }
                  `}
                >
                  <span>PASS</span>
                </button>
              </>
            )}
          </div>

        </div>
      )}

        {/* Game Over Screen */}
      {phase === 'gameover' && (
        <div className="game-over-container h-screen max-h-screen h-[100dvh] max-h-[100dvh] bg-slate-950 flex flex-col items-center justify-center py-4 sm:py-8 px-4 sm:px-6 overflow-hidden text-white select-none relative">
          {/* Neon BG rays */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.12)_0%,transparent_60%)] pointer-events-none" />

          <motion.div
            className={`flex flex-col items-center text-center space-y-3 sm:space-y-6 w-full ${matchWinner === 'ai' ? 'max-w-xl' : 'max-w-sm'}`}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 100 }}
          >
            {/* Crown or Sad icon depending on winner */}
            <div className="relative">
              <div className={`w-14 h-14 sm:w-18 sm:h-18 rounded-2xl flex items-center justify-center border shadow-xl ${
                matchWinner === 'player' 
                  ? 'bg-gradient-to-tr from-amber-500 to-yellow-500 border-yellow-300 shadow-yellow-500/10' 
                  : 'bg-slate-900 border-slate-800'
              }`}>
                {matchWinner === 'player' ? (
                  <Trophy className="w-7 sm:w-9 h-7 sm:h-9 text-slate-950 fill-slate-950 animate-bounce" />
                ) : (
                  <span className="text-2xl sm:text-3xl">💀</span>
                )}
              </div>
            </div>

            {/* Winner text */}
            <div className="space-y-1">
              <h2 className="text-[9px] sm:text-xs font-mono tracking-[0.4em] text-emerald-400 uppercase font-bold">
                MATCH OVER
              </h2>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                {matchWinner === 'player' ? (
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-400 drop-shadow-[0_0_10px_rgba(234,179,8,0.4)]">
                    YOU WIN!
                  </span>
                ) : (
                  <span className="text-rose-500 font-black tracking-wide">
                    AI VICTORY
                  </span>
                )}
              </h1>
              
              <p className="text-[10px] sm:text-xs text-slate-400 max-w-xs leading-normal">
                {matchWinner === 'player' 
                  ? "Outstanding sequence arrangement! All three of your consecutive same-suit card sequences have been validated."
                  : "The opponent arranged all of their cards into valid consecutive sequences before you did. Better luck next time!"
                }
              </p>
            </div>

            {/* Opponent's Winning Cards Proof */}
            {matchWinner === 'ai' && aiWinningPartition && (
              <div className="w-full bg-slate-900/80 border border-slate-800 rounded-xl p-2.5 sm:p-4 space-y-2 sm:space-y-4 shadow-xl">
                <div className="text-[8px] sm:text-[10px] font-mono tracking-widest text-yellow-400 uppercase font-bold flex items-center justify-center space-x-1">
                  <ShieldCheck className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-yellow-400" />
                  <span>OPPONENT'S WINNING HAND PROOF</span>
                </div>
                <div className="flex flex-row gap-1.5 sm:gap-3 justify-center items-stretch w-full">
                  {/* Sequence 1 */}
                  <div className="flex-1 bg-slate-950/40 p-1.5 sm:p-3 rounded-lg border border-slate-800/50 flex flex-col items-center space-y-1">
                    <span className="text-[7px] sm:text-[8px] font-mono text-slate-400 uppercase tracking-wider">Seq 1</span>
                    <div className="flex -space-x-3 justify-center">
                      {aiWinningPartition.group1.map((card) => (
                        <div key={card.id} className="scale-[0.75] sm:scale-100 origin-center">
                          <CardComponent card={card} isMini={true} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sequence 2 */}
                  <div className="flex-1 bg-slate-950/40 p-1.5 sm:p-3 rounded-lg border border-slate-800/50 flex flex-col items-center space-y-1">
                    <span className="text-[7px] sm:text-[8px] font-mono text-slate-400 uppercase tracking-wider">Seq 2</span>
                    <div className="flex -space-x-3 justify-center">
                      {aiWinningPartition.group2.map((card) => (
                        <div key={card.id} className="scale-[0.75] sm:scale-100 origin-center">
                          <CardComponent card={card} isMini={true} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sequence 3 */}
                  <div className="flex-1 bg-slate-950/40 p-1.5 sm:p-3 rounded-lg border border-slate-800/50 flex flex-col items-center space-y-1">
                    <span className="text-[7px] sm:text-[8px] font-mono text-slate-400 uppercase tracking-wider">Seq 3</span>
                    <div className="flex -space-x-3 justify-center">
                      {aiWinningPartition.group3.map((card) => (
                        <div key={card.id} className="scale-[0.75] sm:scale-100 origin-center">
                          <CardComponent card={card} isMini={true} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Score Summary Panel */}
            <div className="w-full bg-slate-900/60 border border-slate-850 rounded-xl p-2.5 sm:p-4 space-y-2">
              <div className="text-[8px] sm:text-[10px] font-mono tracking-widest text-slate-500 uppercase">
                MATCH SCOREBOARD
              </div>
              <div className="flex justify-around items-center">
                <div className="text-center">
                  <div className="text-[8px] sm:text-[10px] font-mono text-slate-400">PLAYER</div>
                  <div className="text-xl sm:text-2xl font-black text-emerald-400">{scores.player}</div>
                </div>
                <div className="text-base sm:text-lg font-bold text-slate-700">:</div>
                <div className="text-center">
                  <div className="text-[8px] sm:text-[10px] font-mono text-slate-400">OPPONENT</div>
                  <div className="text-xl sm:text-2xl font-black text-rose-400">{scores.ai}</div>
                </div>
              </div>
            </div>

            {/* Action buttons - Large & Touch Friendly */}
            <div className="w-full space-y-2">
              <button
                onClick={handleStartMatch}
                className="w-full h-11 sm:h-14 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl sm:rounded-2xl font-bold tracking-widest text-xs sm:text-sm shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-95 transition-transform duration-100 flex items-center justify-center space-x-2 text-white border border-emerald-400/20 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>PLAY AGAIN</span>
              </button>

              <button
                onClick={handleQuitToMenu}
                className="w-full h-9 sm:h-11 bg-slate-900 border border-slate-850 rounded-lg sm:rounded-xl font-mono text-[10px] sm:text-xs text-slate-400 flex items-center justify-center space-x-1 cursor-pointer transition-colors active:bg-slate-800"
              >
                <span>BACK TO MAIN MENU</span>
              </button>
            </div>

          </motion.div>
        </div>
      )}

      {/* Interactive Rules Guide Modal Overlay */}
      <AnimatePresence>
        {showRulesModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-sm w-full space-y-4"
            >
              <div className="flex items-center space-x-2 text-emerald-400 font-black font-mono tracking-widest text-sm uppercase">
                <Layers className="w-5 h-5 text-emerald-400" />
                <span>OFFICIAL RULES</span>
              </div>

              <div className="text-xs text-slate-300 space-y-3 leading-relaxed max-h-[300px] overflow-y-auto pr-1">
                <p>
                  Arrange your 10 active cards into three distinct sets of consecutive, same-suit sequences:
                </p>
                
                <div className="space-y-1.5 p-2.5 bg-slate-950/60 rounded-xl border border-slate-850">
                  <div className="text-emerald-400 font-bold font-mono">REQUIRED SECTIONS:</div>
                  <ul className="list-disc pl-4 space-y-1 text-[11px]">
                    <li><span className="text-white font-medium">Sequence A:</span> First 3 cards in your hand must be consecutive of the same suit.</li>
                    <li><span className="text-white font-medium">Sequence B:</span> Next 3 cards in your hand must be consecutive of the same suit.</li>
                    <li><span className="text-white font-medium">Sequence C:</span> Next 4 cards in your hand must be consecutive of the same suit.</li>
                  </ul>
                </div>

                <div className="space-y-1 p-2 bg-amber-500/5 rounded-xl border border-amber-500/10">
                  <div className="text-amber-400 font-bold font-mono">🃏 WILD JOKERS:</div>
                  <p className="text-[11px] text-slate-400">
                    Jokers are wild! They can act as any missing card to complete a sequence.
                  </p>
                </div>

                <p className="text-[11px] text-rose-400/90 font-mono">
                  ⚠️ NOT ALLOWED: Duplicates, different-suit sequences, and multi-suit group rankings (e.g. three 7s of different suits) are 100% invalid.
                </p>
              </div>

              <button
                onClick={() => {
                  audio.playSelect();
                  setShowRulesModal(false);
                }}
                className="w-full h-11 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl font-mono text-xs text-slate-400 cursor-pointer active:scale-95 transition-all"
              >
                CLOSE REGULATIONS
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
