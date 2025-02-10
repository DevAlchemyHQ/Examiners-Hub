import React, { useState, useEffect, useCallback } from 'react';
import { Play, RotateCcw, ChevronDown, ChevronLeft, ChevronRight, RotateCw } from 'lucide-react';

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const CELL_SIZE = 25;

type Tetromino = {
  shape: number[][];
  color: string;
};

const TETROMINOES: Tetromino[] = [
  { // I
    shape: [[1, 1, 1, 1]],
    color: 'bg-cyan-500'
  },
  { // O
    shape: [[1, 1], [1, 1]],
    color: 'bg-yellow-500'
  },
  { // T
    shape: [[0, 1, 0], [1, 1, 1]],
    color: 'bg-purple-500'
  },
  { // L
    shape: [[1, 0], [1, 0], [1, 1]],
    color: 'bg-orange-500'
  },
  { // J
    shape: [[0, 1], [0, 1], [1, 1]],
    color: 'bg-blue-500'
  },
  { // S
    shape: [[0, 1, 1], [1, 1, 0]],
    color: 'bg-green-500'
  },
  { // Z
    shape: [[1, 1, 0], [0, 1, 1]],
    color: 'bg-red-500'
  }
];

export const Tetris: React.FC = () => {
  const [board, setBoard] = useState<string[][]>(
    Array(BOARD_HEIGHT).fill(Array(BOARD_WIDTH).fill(''))
  );
  const [currentPiece, setCurrentPiece] = useState<Tetromino | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const createNewPiece = useCallback(() => {
    const piece = TETROMINOES[Math.floor(Math.random() * TETROMINOES.length)];
    setCurrentPiece(piece);
    setPosition({
      x: Math.floor((BOARD_WIDTH - piece.shape[0].length) / 2),
      y: 0
    });
  }, []);

  const checkCollision = useCallback(
    (newX: number, newY: number, rotatedShape?: number[][]) => {
      if (!currentPiece) return true;

      const shape = rotatedShape || currentPiece.shape;
      for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
          if (shape[y][x]) {
            const boardX = newX + x;
            const boardY = newY + y;

            if (
              boardX < 0 ||
              boardX >= BOARD_WIDTH ||
              boardY >= BOARD_HEIGHT ||
              (boardY >= 0 && board[boardY][boardX])
            ) {
              return true;
            }
          }
        }
      }
      return false;
    },
    [board, currentPiece]
  );

  const rotatePiece = () => {
    if (!currentPiece) return;

    const rotated = currentPiece.shape[0].map((_, i) =>
      currentPiece.shape.map(row => row[i]).reverse()
    );

    if (!checkCollision(position.x, position.y, rotated)) {
      setCurrentPiece({ ...currentPiece, shape: rotated });
    }
  };

  const movePiece = (dx: number) => {
    if (!currentPiece || checkCollision(position.x + dx, position.y)) return;
    setPosition(prev => ({ ...prev, x: prev.x + dx }));
  };

  const dropPiece = () => {
    if (!currentPiece || checkCollision(position.x, position.y + 1)) {
      mergePiece();
      return;
    }
    setPosition(prev => ({ ...prev, y: prev.y + 1 }));
  };

  const mergePiece = useCallback(() => {
    if (!currentPiece) return;

    const newBoard = board.map(row => [...row]);
    let linesCleared = 0;

    for (let y = 0; y < currentPiece.shape.length; y++) {
      for (let x = 0; x < currentPiece.shape[y].length; x++) {
        if (currentPiece.shape[y][x]) {
          const boardY = position.y + y;
          if (boardY < 0) {
            setGameOver(true);
            setIsPlaying(false);
            return;
          }
          newBoard[boardY][position.x + x] = currentPiece.color;
        }
      }
    }

    // Check for completed lines
    for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
      if (newBoard[y].every(cell => cell !== '')) {
        newBoard.splice(y, 1);
        newBoard.unshift(Array(BOARD_WIDTH).fill(''));
        linesCleared++;
        y++;
      }
    }

    setScore(prev => prev + linesCleared * 100);
    setBoard(newBoard);
    createNewPiece();
  }, [board, currentPiece, position, createNewPiece]);

  useEffect(() => {
    if (!isPlaying || gameOver) return;

    const gameLoop = setInterval(dropPiece, 1000);
    return () => clearInterval(gameLoop);
  }, [isPlaying, gameOver, dropPiece]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isPlaying || gameOver) return;

      switch (e.key) {
        case 'ArrowLeft':
          movePiece(-1);
          break;
        case 'ArrowRight':
          movePiece(1);
          break;
        case 'ArrowDown':
          dropPiece();
          break;
        case 'ArrowUp':
          rotatePiece();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isPlaying, gameOver, movePiece, dropPiece]);

  const startGame = () => {
    setBoard(Array(BOARD_HEIGHT).fill(Array(BOARD_WIDTH).fill('')));
    setScore(0);
    setGameOver(false);
    createNewPiece();
    setIsPlaying(true);
  };

  const renderBoard = () => {
    const displayBoard = board.map(row => [...row]);

    if (currentPiece && !gameOver) {
      currentPiece.shape.forEach((row, y) => {
        row.forEach((cell, x) => {
          if (cell && position.y + y >= 0) {
            displayBoard[position.y + y][position.x + x] = currentPiece.color;
          }
        });
      });
    }

    return displayBoard.map((row, y) => (
      <div key={y} className="flex">
        {row.map((cell, x) => (
          <div
            key={`${x}-${y}`}
            className={`w-[${CELL_SIZE}px] h-[${CELL_SIZE}px] border border-slate-300 dark:border-gray-600 ${
              cell || 'bg-slate-100 dark:bg-gray-700'
            }`}
          />
        ))}
      </div>
    ));
  };

  return (
    <div className="h-full flex flex-col items-center justify-center">
      <div className="flex items-center justify-between w-full max-w-lg mb-6">
        <div className="text-gray-300">
          <div className="text-2xl mb-1">Score: {score}</div>
          <div>Level: {Math.floor(score / 1000) + 1}</div>
          <div>Lines: {Math.floor(score / 100)}</div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => isPlaying ? setIsPlaying(false) : startGame()}
            className="p-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
          >
            <Play size={24} />
          </button>
          <button
            onClick={startGame}
            className="p-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
          >
            <RotateCcw size={24} />
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="bg-[#0F1115] p-2 rounded-lg">
          {renderBoard()}
        </div>

        <div className="space-y-6">
          <div className="bg-[#0F1115] p-4 rounded-lg">
            <div className="text-gray-400 mb-2">Next Piece</div>
            {/* Add next piece preview here */}
          </div>

          <div className="bg-[#0F1115] p-4 rounded-lg space-y-2">
            <div className="text-gray-400">Controls</div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => movePiece(-1)}
                className="p-3 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={dropPiece}
                className="p-3 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700"
              >
                <ChevronDown size={24} />
              </button>
              <button
                onClick={() => movePiece(1)}
                className="p-3 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700"
              >
                <ChevronRight size={24} />
              </button>
              <button
                onClick={rotatePiece}
                className="p-3 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 col-span-3"
              >
                <RotateCw size={24} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {gameOver && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center">
          <div className="bg-[#1A1D24] p-8 rounded-lg text-center">
            <h3 className="text-2xl font-bold text-white mb-4">Game Over!</h3>
            <p className="text-gray-400 mb-6">Final Score: {score}</p>
            <button
              onClick={startGame}
              className="px-6 py-3 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};