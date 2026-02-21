import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./contexts/AuthContext";
import { supabase } from "./lib/supabase";
import { CreationFlow } from "./components/CreationFlow";
import { RegenmonCard } from "./components/RegenmonCard";
import { SplineBackground } from "./components/SplineBackground";
import { AuthPage } from "./components/AuthPage";
import { MusicPlayer } from "./components/MusicPlayer";
import { INITIAL_CARE_STATS, DECAY_RATES } from "./data/moods";
import "./App.css";

function App() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [regenmon, setRegenmon] = useState(null);
  const [careStats, setCareStats] = useState(null);
  const [lastTick, setLastTick] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const intervalRef = useRef(null);
  const saveCounterRef = useRef(0);

  // ── Guardar care stats a Supabase ──
  const saveCareStats = useCallback(async (stats, tickTime) => {
    if (!regenmon?.id) return;
    await supabase
      .from("regenmons")
      .update({
        hunger: stats.hunger,
        energy: stats.energy,
        happiness: stats.happiness,
        health: stats.health,
        last_tick: new Date(tickTime).toISOString(),
      })
      .eq("id", regenmon.id);
  }, [regenmon?.id]);

  // ── Cargar regenmon desde Supabase ──
  const loadRegenmon = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);

    const { data } = await supabase
      .from("regenmons")
      .select("*")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (data) {
      setRegenmon({
        id: data.id,
        name: data.name,
        type: data.type,
        stats: data.stats,
        createdAt: data.created_at,
      });
      const care = {
        hunger: data.hunger,
        energy: data.energy,
        happiness: data.happiness,
        health: data.health,
      };
      const tick = new Date(data.last_tick).getTime();

      // Aplicar catch-up decay
      const elapsed = Date.now() - tick;
      const minutesPassed = Math.min(elapsed / 60000, 480);
      if (minutesPassed > 1) {
        Object.entries(DECAY_RATES).forEach(([stat, rate]) => {
          care[stat] = Math.max(0, Math.min(100, care[stat] + rate * minutesPassed));
        });
      }

      setCareStats(care);
      setLastTick(Date.now());
    } else {
      // Intentar migrar desde localStorage
      const localRegenmon = localStorage.getItem("my-regenmon");
      const localCare = localStorage.getItem("my-regenmon-care");

      if (localRegenmon && localCare) {
        try {
          const parsed = JSON.parse(localRegenmon);
          const parsedCare = JSON.parse(localCare);
          const localTick = localStorage.getItem("my-regenmon-tick");
          const parsedTick = localTick ? JSON.parse(localTick) : Date.now();

          const { data: migrated } = await supabase
            .from("regenmons")
            .insert({
              user_id: user.id,
              name: parsed.name,
              type: parsed.type,
              stats: parsed.stats,
              hunger: parsedCare.hunger,
              energy: parsedCare.energy,
              happiness: parsedCare.happiness,
              health: parsedCare.health,
              last_tick: new Date(parsedTick).toISOString(),
            })
            .select()
            .single();

          if (migrated) {
            localStorage.removeItem("my-regenmon");
            localStorage.removeItem("my-regenmon-care");
            localStorage.removeItem("my-regenmon-tick");
            setRegenmon({
              id: migrated.id,
              name: migrated.name,
              type: migrated.type,
              stats: migrated.stats,
              createdAt: migrated.created_at,
            });
            setCareStats({
              hunger: migrated.hunger,
              energy: migrated.energy,
              happiness: migrated.happiness,
              health: migrated.health,
            });
            setLastTick(Date.now());
          }
        } catch {
          // Migración fallida, ignorar
        }
      }
    }
    setDataLoading(false);
  }, [user]);

  // Cargar cuando el user cambie
  useEffect(() => {
    if (!user) {
      setRegenmon(null);
      setCareStats(null);
      setLastTick(null);
      setDataLoading(false);
      return;
    }
    loadRegenmon();
  }, [user, loadRegenmon]);

  // ── Decay cada minuto ──
  const applyDecay = useCallback(() => {
    setCareStats((prev) => {
      if (!prev) return prev;
      const newStats = { ...prev };
      Object.entries(DECAY_RATES).forEach(([stat, rate]) => {
        newStats[stat] = Math.max(0, Math.min(100, newStats[stat] + rate));
      });
      // Guardar a Supabase cada 5 ticks (5 minutos)
      saveCounterRef.current++;
      if (saveCounterRef.current >= 5) {
        saveCounterRef.current = 0;
        saveCareStats(newStats, Date.now());
      }
      return newStats;
    });
    setLastTick(Date.now());
  }, [saveCareStats]);

  useEffect(() => {
    if (!regenmon) return;
    intervalRef.current = setInterval(applyDecay, 60000);
    return () => clearInterval(intervalRef.current);
  }, [regenmon, applyDecay]);

  // Guardar al cerrar/ocultar tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && regenmon?.id && careStats) {
        saveCareStats(careStats, Date.now());
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [regenmon, careStats, saveCareStats]);

  // ── Crear criatura ──
  const handleCreate = async (newRegenmon) => {
    const initialStats = { ...INITIAL_CARE_STATS };
    const now = Date.now();

    const { data } = await supabase
      .from("regenmons")
      .insert({
        user_id: user.id,
        name: newRegenmon.name,
        type: newRegenmon.type,
        stats: newRegenmon.stats,
        hunger: initialStats.hunger,
        energy: initialStats.energy,
        happiness: initialStats.happiness,
        health: initialStats.health,
        last_tick: new Date(now).toISOString(),
      })
      .select()
      .single();

    if (data) {
      setRegenmon({
        id: data.id,
        name: data.name,
        type: data.type,
        stats: data.stats,
        createdAt: data.created_at,
      });
      setCareStats(initialStats);
      setLastTick(now);
    }
  };

  // ── Usar item ──
  const handleUseItem = (item) => {
    setCareStats((prev) => {
      if (!prev) return prev;
      const newStats = { ...prev };
      Object.entries(item.effects).forEach(([stat, value]) => {
        newStats[stat] = Math.max(0, Math.min(100, (newStats[stat] || 0) + value));
      });
      // Guardar inmediatamente al usar item
      saveCareStats(newStats, Date.now());
      return newStats;
    });
  };

  // ── Liberar criatura ──
  const handleRelease = async () => {
    if (!regenmon?.id) return;
    await supabase.from("regenmons").delete().eq("id", regenmon.id);
    setRegenmon(null);
    setCareStats(null);
    setLastTick(null);
  };

  // ── Render ──
  if (authLoading) {
    return (
      <div className="app">
        <SplineBackground />
        <div className="app-loading">AETHERIA</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app">
        <SplineBackground />
        <AuthPage />
      </div>
    );
  }

  return (
    <div className="app">
      <SplineBackground />
      <header className="app-header">
        <MusicPlayer />
        <span className="logo">Aetheria</span>
        <button className="btn-signout" onClick={signOut}>
          Salir
        </button>
      </header>

      <main className="app-main">
        {dataLoading ? (
          <div className="app-loading">Cargando...</div>
        ) : regenmon && careStats ? (
          <RegenmonCard
            regenmon={regenmon}
            careStats={careStats}
            onUseItem={handleUseItem}
            onRelease={handleRelease}
          />
        ) : (
          <CreationFlow onCreate={handleCreate} />
        )}
      </main>

      <footer className="app-footer">
        <p>Aetheria — Sesion 2</p>
      </footer>
    </div>
  );
}

export default App;
