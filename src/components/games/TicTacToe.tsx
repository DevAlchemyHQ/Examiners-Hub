import React, { useState, useCallback, useEffect } from 'react';
import { RotateCcw, Users, Cpu } from 'lucide-react';

type Player = 'X' | 'O';
type Board = (Player | null)[];
type GameMode = 'singleplayer' | 'multiplayer';
type Difficulty = 'easy' | 'medium' | 'hard';

export const TicTacToe: React.FC = () => {
  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState<Player>('X');
  const [winner, setWinner] = useState<Player | 'draw' | null>(null);
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [scores, setScores] = useState({ X: 0, O: 0 });
  const [boardSize, setBoardSize] = useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Calculate responsive board size
  useEffect(() => {
    const updateBoardSize = () => {
      if (!containerRef.current) return;
      const container = containerRef.current;
      const minDimension = Math.min(container.clientWidth, container.clientHeight);
      setBoardSize(Math.min(minDimension - 40, 400)); // Max size of 400px
    };

    updateBoardSize();
    window.addEventListener('resize', updateBoardSize);
    return () => window.removeEventListener('resize', updateBoardSize);
  }, []);

  const checkWinner = useCallback((squares: Board): Player | 'draw' | null => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
      [0, 4, 8], [2, 4, 6] // Diagonals
    ];

    for (const [a, b, c] of lines) {
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a] as Player;
      }
    }

    if (squares.every(square => square !== null)) {
      return 'draw';
    }

    return null;
  }, []);

  const getAvailableMoves = (squares: Board): number[] => {
    return squares.reduce<number[]>((moves, cell, index) => {
      if (cell === null) moves.push(index);
      return moves;
    }, []);
  };

  const minimax = (squares: Board, depth: number, isMaximizing: boolean): number => {
    const result = checkWinner(squares);
    if (result === 'O') return 10 - depth;
    if (result === 'X') return depth - 10;
    if (result === 'draw') return 0;

    const moves = getAvailableMoves(squares);
    
    if (isMaximizing) {
      let bestScore = -Infinity;
      for (const move of moves) {
        squares[move] = 'O';
        bestScore = Math.max(bestScore, minimax(squares, depth + 1, false));
        squares[move] = null;
      }
      return bestScore;
    } else {
      let bestScore = Infinity;
      for (const move of moves) {
        squares[move] = 'X';
        bestScore = Math.min(bestScore, minimax(squares, depth + 1, true));
        squares[move] = null;
      }
      return bestScore;
    }
  };

  const getAIMove = (squares: Board): number => {
    const availableMoves = getAvailableMoves(squares);
    
    if (difficulty === 'easy') {
      return availableMoves[Math.floor(Math.random() * availableMoves.length)];
    }

    if (difficulty === 'medium' && Math.random() < 0.3) {
      return availableMoves[Math.floor(Math.random() * availableMoves.length)];
    }

    let bestScore = -Infinity;
    let bestMove = availableMoves[0];

    for (const move of availableMoves) {
      squares[move] = 'O';
      const score = minimax(squares, 0, false);
      squares[move] = null;

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  };

  const handleClick = (index: number) => {
    if (board[index] || winner) return;

    const newBoard = [...board];
    newBoard[index] = currentPlayer;
    setBoard(newBoard);

    const gameWinner = checkWinner(newBoard);
    if (gameWinner) {
      setWinner(gameWinner);
      if (gameWinner !== 'draw') {
        setScores(prev => ({
          ...prev,
          [gameWinner]: prev[gameWinner] + 1
        }));
      }
    } else {
      setCurrentPlayer(currentPlayer === 'X' ? 'O' : 'X');
    }
  };

  useEffect(() => {
    if (gameMode === 'singleplayer' && currentPlayer === 'O' && !winner) {
      const timer = setTimeout(() => {
        const aiMove = getAIMove([...board]);
        handleClick(aiMove);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentPlayer, gameMode, winner, board]);

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setCurrentPlayer('X');
    setWinner(null);
  };

  const resetScores = () => {
    setScores({ X: 0, O: 0 });
  };

  if (!gameMode) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#1A1D24] text-white p-4">
        <h2 className="text-3xl font-bold mb-8">Tic Tac Toe</h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => setGameMode('singleplayer')}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-500 rounded-lg hover:bg-indigo-600 transition-colors"
          >
            <Cpu size={20} />
            Single Player
          </button>
          <button
            onClick={() => setGameMode('multiplayer')}
            className="flex items-center gap-2 px-6 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
          >
            <Users size={20} />
            Multi Player
          </button>
        </div>
      </div>
    );
  }

  const cellSize = boardSize / 3;

  return (
    <div className="h-full flex flex-col items-center justify-center bg-[#1A1D24] text-white p-4" ref={containerRef}>
      <h2 className="text-3xl font-bold mb-8">Tic Tac Toe</h2>

      {gameMode === 'singleplayer' && (
        <div className="mb-6">
          <div className="text-gray-400 mb-2">AI Level</div>
          <div className="flex gap-2">
            {(['easy', 'medium', 'hard'] as const).map((level) => (
              <button
                key={level}
                onClick={() => setDifficulty(level)}
                className={`px-4 sm:px-6 py-2 rounded-lg font-medium capitalize transition-colors ${
                  difficulty === level
                    ? 'bg-indigo-500 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6">
        <div className="text-gray-400 mb-2">Next player: {currentPlayer}</div>
        <div className="flex gap-4 text-lg">
          <div>Player X: {scores.X}</div>
          <div>Player O: {scores.O}</div>
        </div>
      </div>

      <div 
        className="grid grid-cols-3 gap-2 bg-[#0F1115] p-2 rounded-lg mb-6"
        style={{ width: boardSize, height: boardSize }}
      >
        {board.map((square, index) => (
          <button
            key={index}
            onClick={() => handleClick(index)}
            disabled={!!winner || (gameMode === 'singleplayer' && currentPlayer === 'O')}
            className={`flex items-center justify-center text-3xl font-bold rounded-lg transition-all ${
              square
                ? `bg-gray-800 ${
                    square === 'X' ? 'text-indigo-500' : 'text-green-500'
                  }`
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
            style={{ width: cellSize - 8, height: cellSize - 8 }}
          >
            {square}
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={resetGame}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-500 rounded-lg hover:bg-indigo-600 transition-colors"
        >
          <RotateCcw size={20} />
          Reset Game
        </button>
        <button
          onClick={() => {
            resetScores();
            setGameMode(null);
          }}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
        >
          <Users size={20} />
          Change Mode
        </button>
      </div>

      {winner && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-[#1A1D24] p-8 rounded-lg text-center">
            <h3 className="text-2xl font-bold mb-4">
              {winner === 'draw' ? "It's a Draw!" : `Player ${winner} Wins!`}
            </h3>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={resetGame}
                className="px-6 py-3 bg-indigo-500 rounded-lg hover:bg-indigo-600 transition-colors"
              >
                Play Again
              </button>
              <button
                onClick={() => {
                  resetScores();
                  setGameMode(null);
                }}
                className="px-6 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
              >
                New Game
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};