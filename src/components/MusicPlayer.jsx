import { useState, useRef, useEffect } from "react";

export function MusicPlayer() {
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.3);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = new Audio("/medieval-celtic.mp3");
    audio.loop = true;
    audio.volume = volume;
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.pause();
    } else {
      audio.play().catch(() => {});
    }
    setPlaying(!playing);
  };

  return (
    <div className="music-player">
      <button
        className={`music-toggle ${playing ? "playing" : ""}`}
        onClick={toggle}
        title={playing ? "Pausar música" : "Reproducir música"}
      >
        <span className="music-icon">{playing ? "♫" : "♪"}</span>
      </button>

      {playing && (
        <input
          type="range"
          className="music-volume"
          min="0"
          max="1"
          step="0.05"
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          title={`Volumen: ${Math.round(volume * 100)}%`}
        />
      )}
    </div>
  );
}
