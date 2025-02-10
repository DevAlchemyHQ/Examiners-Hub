import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, RotateCcw, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Position = { x: number; y: number };

const GRID_SIZE = 20;
const INITIAL_SPEED = 150;

export const Snake: React.FC = () => {
  const [snake, setSnake] = useState<Position[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Position>({ x: 15, y: 10 });
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const gameLoopRef = useRef<number>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState(20);

  // Calculate responsive cell size
  useEffect(() => {
    const updateCellSize = () => {
      if (!containerRef.current) return;
      const container = containerRef.current;
      const minDimension = Math.min(container.clientWidth, container.clientHeight);
      const newCellSize = Math.floor((minDimension - 40) / GRID_SIZE); // 40px for padding
      setCellSize(newCellSize);
    };

    updateCellSize();
    window.addEventListener('resize', updateCellSize);
    return () => window.removeEventListener('resize', updateCellSize);
  }, []);

  const generateFood = useCallback(() => {
    const newFood = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE)
    };
    setFood(newFood);
  }, []);

  const resetGame = () => {
    setSnake([{ x: 10, y: 10 }]);
    setDirection('RIGHT');
    setScore(0);
    setGameOver(false);
    generateFood();
    setIsPlaying(false);
  };

  const checkCollision = (head: Position): boolean => {
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
      return true;
    }
    return snake.some(segment => segment.x === head.x && segment.y === head.y);
  };

  const moveSnake = useCallback(() => {
    setSnake(prevSnake => {
      const head = { ...prevSnake[0] };

      switch (direction) {
        case 'UP':
          head.y -= 1;
          break;
        case 'DOWN':
          head.y += 1;
          break;
        case 'LEFT':
          head.x -= 1;
          break;
        case 'RIGHT':
          head.x += 1;
          break;
      }

      if (checkCollision(head)) {
        setGameOver(true);
        setIsPlaying(false);
        return prevSnake;
      }

      const newSnake = [head, ...prevSnake];

      if (head.x === food.x && head.y === food.y) {
        setScore(prev => prev + 1);
        generateFood();
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [direction, food, generateFood]);

  // Handle keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      e.preventDefault(); // Prevent page scrolling
      switch (e.key) {
        case 'ArrowUp':
          if (direction !== 'DOWN') setDirection('UP');
          break;
        case 'ArrowDown':
          if (direction !== 'UP') setDirection('DOWN');
          break;
        case 'ArrowLeft':
          if (direction !== 'RIGHT') setDirection('LEFT');
          break;
        case 'ArrowRight':
          if (direction !== 'LEFT') setDirection('RIGHT');
          break;
        case ' ':
          setIsPlaying(prev => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [direction]);

  // Handle touch controls
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const touchStartX = touch.clientX;
    const touchStartY = touch.clientY;

    const handleTouchEnd = (e: TouchEvent) => {
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX > 0 && direction !== 'LEFT') {
          setDirection('RIGHT');
        } else if (deltaX < 0 && direction !== 'RIGHT') {
          setDirection('LEFT');
        }
      } else {
        if (deltaY > 0 && direction !== 'UP') {
          setDirection('DOWN');
        } else if (deltaY < 0 && direction !== 'DOWN') {
          setDirection('UP');
        }
      }
    };

    document.addEventListener('touchend', handleTouchEnd, { once: true });
  }, [direction]);

  useEffect(() => {
    if (isPlaying && !gameOver) {
      gameLoopRef.current = window.setInterval(moveSnake, INITIAL_SPEED);
    } else {
      clearInterval(gameLoopRef.current);
    }

    return () => clearInterval(gameLoopRef.current);
  }, [isPlaying, gameOver, moveSnake]);

  return (
    <div className="h-full flex flex-col items-center justify-center" ref={containerRef}>
      <div className="mb-4 flex items-center gap-4">
        <div className="text-2xl font-bold text-slate-800 dark:text-white">
          Score: {score}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsPlaying(prev => !prev)}
            disabled={gameOver}
            className="p-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50"
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>
          <button
            onClick={resetGame}
            className="p-2 bg-slate-200 dark:bg-gray-700 text-slate-700 dark:text-gray-300 rounded-lg hover:bg-slate-300 dark:hover:bg-gray-600 transition-colors"
          >
            <RotateCcw size={20} />
          </button>
        </div>
      </div>

      <div
        className="relative bg-slate-200 dark:bg-gray-700 rounded-lg overflow-hidden touch-none"
        style={{
          width: GRID_SIZE * cellSize,
          height: GRID_SIZE * cellSize
        }}
        onTouchStart={handleTouchStart}
      >
        {/* Snake */}
        {snake.map((segment, index) => (
          <div
            key={index}
            className="absolute bg-indigo-500 rounded-sm"
            style={{
              width: cellSize - 1,
              height: cellSize - 1,
              left: segment.x * cellSize,
              top: segment.y * cellSize
            }}
          />
        ))}

        {/* Food */}
        <div
          className="absolute bg-red-500 rounded-full"
          style={{
            width: cellSize - 1,
            height: cellSize - 1,
            left: food.x * cellSize,
            top: food.y * cellSize
          }}
        />

        {/* Game Over Overlay */}
        {gameOver && (
          <div className="absolute inset-0 bg-black/75 flex items-center justify-center">
            <div className="text-center p-4">
              <h3 className="text-2xl font-bold text-white mb-4">Game Over!</h3>
              <p className="text-white mb-4">Final Score: {score}</p>
              <button
                onClick={resetGame}
                className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
              >
                Play Again
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Touch Controls */}
      <div className="mt-8 grid grid-cols-3 gap-2 md:hidden">
        <div />
        <button
          onClick={() => direction !== 'DOWN' && setDirection('UP')}
          className="p-4 bg-slate-200 dark:bg-gray-700 rounded-lg active:bg-slate-300 dark:active:bg-gray-600"
        >
          <ChevronUp size={24} />
        </button>
        <div />
        <button
          onClick={() => direction !== 'RIGHT' && setDirection('LEFT')}
          className="p-4 bg-slate-200 dark:bg-gray-700 rounded-lg active:bg-slate-300 dark:active:bg-gray-600"
        >
          <ChevronLeft size={24} />
        </button>
        <button
          onClick={() => direction !== 'UP' && setDirection('DOWN')}
          className="p-4 bg-slate-200 dark:bg-gray-700 rounded-lg active:bg-slate-300 dark:active:bg-gray-600"
        >
          <ChevronDown size={24} />
        </button>
        <button
          onClick={() => direction !== 'LEFT' && setDirection('RIGHT')}
          className="p-4 bg-slate-200 dark:bg-gray-700 rounded-lg active:bg-slate-300 dark:active:bg-gray-600"
        >
          <ChevronRight size={24} />
        </button>
      </div>
    </div>
  );
};