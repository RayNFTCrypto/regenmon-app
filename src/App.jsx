import { useState, useEffect, useCallback, useRef } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { useAuth } from "./contexts/AuthContext";
import { supabase } from "./lib/supabase";
import { CreationFlow } from "./components/CreationFlow";
import { RegenmonCard } from "./components/RegenmonCard";
import { SplineBackground } from "./components/SplineBackground";
import { AuthPage } from "./components/AuthPage";
import { MusicPlayer } from "./components/MusicPlayer";
import { WalletButton } from "./components/WalletButton";
import { BattleView } from "./components/BattleView";
import { Marketplace } from "./components/Marketplace";
import { AirdropBanner } from "./components/AirdropBanner";
import { EarnView } from "./components/EarnView";
import { SnakeGame } from "./components/SnakeGame";
import { TokenomicsView } from "./components/TokenomicsView";
import { ManifestoView } from "./components/ManifestoView";
import { INITIAL_CARE_STATS, DECAY_RATES } from "./data/moods";
import "./App.css";

function App() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { address: walletAddress } = useAccount();
  const { disconnect } = useDisconnect();
  const [regenmon, setRegenmon] = useState(null);
  const [careStats, setCareStats] = useState(null);
  const [lastTick, setLastTick] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [view, setView] = useState("home"); // 'home' | 'battle' | 'marketplace' | 'earn' | 'snake'
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

  // ── Helper: cargar datos de criatura al state ──
  const applyRegenmonData = (data) => {
    setRegenmon({
      id: data.id,
      name: data.name,
      type: data.type,
      stats: data.stats,
      createdAt: data.created_at,
      nftTxHash: data.nft_tx_hash || null,
    });
    const care = {
      hunger: data.hunger,
      energy: data.energy,
      happiness: data.happiness,
      health: data.health,
    };
    const tick = new Date(data.last_tick).getTime();
    const elapsed = Date.now() - tick;
    const minutesPassed = Math.min(elapsed / 60000, 480);
    if (minutesPassed > 1) {
      Object.entries(DECAY_RATES).forEach(([stat, rate]) => {
        care[stat] = Math.max(0, Math.min(100, care[stat] + rate * minutesPassed));
      });
    }
    setCareStats(care);
    setLastTick(Date.now());
  };

  // ── Cargar regenmon desde Supabase ──
  const loadRegenmon = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);

    // 1. Buscar por user_id
    const { data } = await supabase
      .from("regenmons")
      .select("*")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (data) {
      // Si tiene wallet conectada, guardar la dirección
      if (walletAddress && !data.wallet_address) {
        await supabase
          .from("regenmons")
          .update({ wallet_address: walletAddress.toLowerCase() })
          .eq("id", data.id);
      }
      applyRegenmonData(data);
      setDataLoading(false);
      return;
    }

    // 2. Buscar por wallet_address (reconexión de wallet)
    if (walletAddress) {
      const { data: walletData } = await supabase
        .from("regenmons")
        .select("*")
        .eq("wallet_address", walletAddress.toLowerCase())
        .limit(1)
        .maybeSingle();

      if (walletData) {
        // Transferir criatura al nuevo user_id
        await supabase
          .from("regenmons")
          .update({ user_id: user.id })
          .eq("id", walletData.id);
        applyRegenmonData(walletData);
        setDataLoading(false);
        return;
      }
    }

    setDataLoading(false);
  }, [user, walletAddress]);

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
        wallet_address: walletAddress ? walletAddress.toLowerCase() : null,
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
        <WalletButton />
        <span className="logo">Aetheria</span>
        <button className="btn-signout" onClick={() => { disconnect(); signOut(); }}>
          Salir
        </button>
      </header>

      <main className="app-main">
        {dataLoading ? (
          <div className="app-loading">Cargando...</div>
        ) : regenmon && careStats ? (
          view === "home" ? (
            <>
              <AirdropBanner />
              <RegenmonCard
                regenmon={regenmon}
                careStats={careStats}
                onUseItem={handleUseItem}
                onRelease={handleRelease}
              />
              <div className="home-actions">
                <button
                  className="btn-battle-enter"
                  onClick={() => setView("battle")}
                >
                  ⚔️ Batalla
                </button>
                <button
                  className="btn-marketplace-enter"
                  onClick={() => setView("marketplace")}
                >
                  🏪 Marketplace
                </button>
              </div>
              <div className="home-actions">
                <button
                  className="btn-earn-enter"
                  onClick={() => setView("earn")}
                >
                  💰 Earn
                </button>
                <button
                  className="btn-snake-enter"
                  onClick={() => setView("snake")}
                >
                  🐍 Snake
                </button>
              </div>
              <div className="home-actions">
                <button
                  className="btn-tokenomics-enter"
                  onClick={() => setView("tokenomics")}
                >
                  📊 Tokenomics
                </button>
                <button
                  className="btn-manifesto-enter"
                  onClick={() => setView("manifesto")}
                >
                  📜 Manifiesto
                </button>
              </div>
            </>
          ) : view === "battle" ? (
            <BattleView
              regenmon={regenmon}
              onBack={() => setView("home")}
            />
          ) : view === "marketplace" ? (
            <Marketplace
              onBack={() => setView("home")}
            />
          ) : view === "earn" ? (
            <EarnView
              onBack={() => setView("home")}
              regenmon={regenmon}
              careStats={careStats}
            />
          ) : view === "snake" ? (
            <SnakeGame
              onBack={() => setView("home")}
            />
          ) : view === "tokenomics" ? (
            <TokenomicsView
              onBack={() => setView("home")}
            />
          ) : (
            <ManifestoView
              onBack={() => setView("home")}
            />
          )
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
