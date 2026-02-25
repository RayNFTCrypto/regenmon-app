import { useState, useEffect, useCallback, useRef } from "react";

const GRID = 20;
const CELL = 16;
const SPEED_INITIAL = 150;
const SPEED_MIN = 70;

const DIR = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
};

function randomPos(snake) {
  let pos;
  do {
    pos = {
      x: Math.floor(Math.random() * GRID),
      y: Math.floor(Math.random() * GRID),
    };
  } while (snake.some((s) => s.x === pos.x && s.y === pos.y));
  return pos;
}

export function SnakeGame({ onBack, onGameOver }) {
  const [snake, setSnake] = useState([{ x: 10, y: 10 }]);
  const [food, setFood] = useState({ x: 5, y: 5 });
  const [dir, setDir] = useState({ x: 1, y: 0 });
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(
    () => parseInt(localStorage.getItem("snake-high") || "0")
  );
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);

  const dirRef = useRef(dir);
  const snakeRef = useRef(snake);
  const foodRef = useRef(food);
  const scoreRef = useRef(score);

  dirRef.current = dir;
  snakeRef.current = snake;
  foodRef.current = food;
  scoreRef.current = score;

  const speed = Math.max(SPEED_MIN, SPEED_INITIAL - score * 3);

  // Keyboard controls
  useEffect(() => {
    const handleKey = (e) => {
      if (DIR[e.key]) {
        e.preventDefault();
        const newDir = DIR[e.key];
        // Prevent reversing
        if (
          newDir.x !== -dirRef.current.x ||
          newDir.y !== -dirRef.current.y
        ) {
          setDir(newDir);
        }
        if (!started) setStarted(true);
      }
      if (e.key === " ") {
        e.preventDefault();
        if (gameOver) restart();
        else setPaused((p) => !p);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [started, gameOver]);

  // Game loop
  useEffect(() => {
    if (!started || gameOver || paused) return;

    const interval = setInterval(() => {
      const s = snakeRef.current;
      const d = dirRef.current;
      const f = foodRef.current;

      const head = {
        x: (s[0].x + d.x + GRID) % GRID,
        y: (s[0].y + d.y + GRID) % GRID,
      };

      // Self collision
      if (s.some((seg) => seg.x === head.x && seg.y === head.y)) {
        setGameOver(true);
        const sc = scoreRef.current;
        if (sc > highScore) {
          setHighScore(sc);
          localStorage.setItem("snake-high", String(sc));
        }
        if (onGameOver && sc > 0) onGameOver(sc);
        return;
      }

      const newSnake = [head, ...s];

      if (head.x === f.x && head.y === f.y) {
        setScore((prev) => prev + 1);
        setFood(randomPos(newSnake));
      } else {
        newSnake.pop();
      }

      setSnake(newSnake);
    }, speed);

    return () => clearInterval(interval);
  }, [started, gameOver, paused, speed, highScore, onGameOver]);

  const restart = () => {
    setSnake([{ x: 10, y: 10 }]);
    setFood(randomPos([{ x: 10, y: 10 }]));
    setDir({ x: 1, y: 0 });
    setScore(0);
    setGameOver(false);
    setStarted(true);
    setPaused(false);
  };

  // Touch controls
  const touchRef = useRef(null);
  const handleTouchStart = (e) => {
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const handleTouchEnd = (e) => {
    if (!touchRef.current) return;
    const dx = e.changedTouches[0].clientX - touchRef.current.x;
    const dy = e.changedTouches[0].clientY - touchRef.current.y;
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;

    let newDir;
    if (Math.abs(dx) > Math.abs(dy)) {
      newDir = dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 };
    } else {
      newDir = dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 };
    }
    if (newDir.x !== -dirRef.current.x || newDir.y !== -dirRef.current.y) {
      setDir(newDir);
    }
    if (!started) setStarted(true);
    touchRef.current = null;
  };

  return (
    <div className="snake-game fade-in">
      <div className="snake-header">
        <h2>Snake REGEN</h2>
        <div className="snake-scores">
          <span className="snake-score">🪙 {score}</span>
          <span className="snake-high">👑 {highScore}</span>
        </div>
      </div>

      <div
        className="snake-board"
        style={{ width: GRID * CELL, height: GRID * CELL }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Grid lines */}
        {Array.from({ length: GRID * GRID }).map((_, i) => (
          <div
            key={i}
            className="snake-cell"
            style={{
              left: (i % GRID) * CELL,
              top: Math.floor(i / GRID) * CELL,
              width: CELL,
              height: CELL,
            }}
          />
        ))}

        {/* Food */}
        <div
          className="snake-food"
          style={{
            left: food.x * CELL,
            top: food.y * CELL,
            width: CELL,
            height: CELL,
          }}
        />

        {/* Snake */}
        {snake.map((seg, i) => (
          <div
            key={i}
            className={`snake-seg ${i === 0 ? "snake-head" : ""}`}
            style={{
              left: seg.x * CELL,
              top: seg.y * CELL,
              width: CELL,
              height: CELL,
              opacity: 1 - i * 0.03,
            }}
          />
        ))}

        {/* Overlays */}
        {!started && !gameOver && (
          <div className="snake-overlay">
            <p>Usa las flechas o desliza</p>
            <p className="snake-hint">para empezar</p>
          </div>
        )}

        {paused && (
          <div className="snake-overlay">
            <p>PAUSA</p>
            <p className="snake-hint">Espacio para continuar</p>
          </div>
        )}

        {gameOver && (
          <div className="snake-overlay game-over">
            <p className="snake-go-title">Game Over</p>
            <p className="snake-go-score">🪙 {score} REGEN</p>
            <button className="btn-earn" onClick={restart}>
              Jugar de nuevo
            </button>
          </div>
        )}
      </div>

      {/* Mobile D-pad */}
      <div className="snake-dpad">
        <button className="dpad-btn dpad-up" onClick={() => { setDir({ x: 0, y: -1 }); if (!started) setStarted(true); }}>▲</button>
        <div className="dpad-row">
          <button className="dpad-btn dpad-left" onClick={() => { setDir({ x: -1, y: 0 }); if (!started) setStarted(true); }}>◀</button>
          <button className="dpad-btn dpad-right" onClick={() => { setDir({ x: 1, y: 0 }); if (!started) setStarted(true); }}>▶</button>
        </div>
        <button className="dpad-btn dpad-down" onClick={() => { setDir({ x: 0, y: 1 }); if (!started) setStarted(true); }}>▼</button>
      </div>

      <button className="btn-secondary" onClick={onBack} style={{ marginTop: 12 }}>
        Volver
      </button>
    </div>
  );
}
