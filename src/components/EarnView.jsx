import { useState, useEffect } from "react";
import { useAccount, useReadContract } from "wagmi";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { REGEN_TOKEN_ADDRESS, REGEN_TOKEN_ABI } from "../lib/contracts";
import { MISSIONS, DAILY_REWARD, STAKE_DAILY_RATE } from "../data/missions";

export function EarnView({ onBack, regenmon, careStats }) {
  const { address, isConnected } = useAccount();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [stakeInput, setStakeInput] = useState("");
  const [battlesWon, setBattlesWon] = useState(0);

  // REGEN balance
  const { data: rawBalance } = useReadContract({
    address: REGEN_TOKEN_ADDRESS,
    abi: REGEN_TOKEN_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });
  const balance = rawBalance ? Number(rawBalance / 10n ** 18n) : 0;

  // Load profile + battles data
  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (p) setProfile(p);

      const { count } = await supabase
        .from("battles")
        .select("*", { count: "exact", head: true })
        .eq("winner_id", user.id);
      setBattlesWon(count || 0);
    };

    loadData();
  }, [user]);

  const callEarn = async (action, extra = {}) => {
    if (!isConnected || !address || !user) return;
    setLoading(action);
    setError("");
    setMessage("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const res = await fetch("/api/earn", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action, walletAddress: address, ...extra }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error");
        setLoading("");
        return;
      }

      setMessage(
        data.amount
          ? `+${data.amount} REGEN reclamados!`
          : "Operacion exitosa!"
      );

      // Reload profile
      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (p) setProfile(p);
    } catch {
      setError("Error de conexion");
    }
    setLoading("");
  };

  // Mission progress calculation
  const getMissionProgress = (mission) => {
    if (mission.check === "battles_won") {
      return Math.min(battlesWon, mission.target);
    }
    if (mission.check === "nft_minted") {
      return regenmon?.nftTxHash ? 1 : 0;
    }
    if (mission.check === "care_stats") {
      if (!careStats) return 0;
      const avg = (careStats.hunger + careStats.energy + careStats.happiness + careStats.health) / 4;
      return avg >= mission.target ? 1 : 0;
    }
    if (mission.check === "marketplace_purchase") {
      return 0; // Track externally
    }
    return 0;
  };

  const isMissionComplete = (mission) => {
    const progress = getMissionProgress(mission);
    if (mission.check === "care_stats" || mission.check === "nft_minted" || mission.check === "marketplace_purchase") {
      return progress >= 1;
    }
    return progress >= mission.target;
  };

  const isMissionClaimed = (missionId) => {
    return (profile?.claimed_missions || []).includes(missionId);
  };

  // Time helpers
  const getDailyTimeLeft = () => {
    if (!profile?.last_daily_claim) return null;
    const last = new Date(profile.last_daily_claim);
    const diff = 24 * 60 * 60 * 1000 - (Date.now() - last.getTime());
    if (diff <= 0) return null;
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${h}h ${m}m`;
  };

  const getCareTimeLeft = () => {
    if (!profile?.last_care_claim) return null;
    const last = new Date(profile.last_care_claim);
    const diff = 4 * 60 * 60 * 1000 - (Date.now() - last.getTime());
    if (diff <= 0) return null;
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${h}h ${m}m`;
  };

  const getStakeReward = () => {
    if (!profile?.staked_amount || !profile?.staked_at) return 0;
    const days = (Date.now() - new Date(profile.staked_at).getTime()) / (1000 * 60 * 60 * 24);
    return Math.floor(profile.staked_amount * STAKE_DAILY_RATE * days);
  };

  const careAvg = careStats
    ? Math.round((careStats.hunger + careStats.energy + careStats.happiness + careStats.health) / 4)
    : 0;

  const careReward = careAvg >= 80 ? 30 : careAvg >= 60 ? 20 : careAvg >= 40 ? 10 : 0;

  const dailyTimeLeft = getDailyTimeLeft();
  const careTimeLeft = getCareTimeLeft();
  const stakeReward = getStakeReward();

  return (
    <div className="earn-view fade-in">
      <div className="earn-header">
        <h2>Earn REGEN</h2>
        <span className="earn-balance">{balance} REGEN</span>
      </div>

      {(error || message) && (
        <p className={error ? "auth-error" : "earn-success"}>
          {error || message}
        </p>
      )}

      {/* Daily Check-in */}
      <div className="earn-card">
        <div className="earn-card-header">
          <span className="earn-card-emoji">📅</span>
          <div>
            <h3>Daily Check-in</h3>
            <p className="earn-card-desc">Reclama {DAILY_REWARD} REGEN cada 24h</p>
          </div>
        </div>
        {dailyTimeLeft ? (
          <span className="earn-timer">Disponible en {dailyTimeLeft}</span>
        ) : (
          <button
            className="btn-earn"
            onClick={() => callEarn("daily")}
            disabled={!!loading}
          >
            {loading === "daily" ? "..." : `Reclamar ${DAILY_REWARD} REGEN`}
          </button>
        )}
      </div>

      {/* Care Rewards */}
      <div className="earn-card">
        <div className="earn-card-header">
          <span className="earn-card-emoji">💚</span>
          <div>
            <h3>Care Bonus</h3>
            <p className="earn-card-desc">
              Stats promedio: {careAvg}% → {careReward > 0 ? `${careReward} REGEN` : "Min 40%"}
            </p>
          </div>
        </div>
        {careTimeLeft ? (
          <span className="earn-timer">Disponible en {careTimeLeft}</span>
        ) : careReward > 0 ? (
          <button
            className="btn-earn"
            onClick={() => callEarn("care")}
            disabled={!!loading}
          >
            {loading === "care" ? "..." : `Reclamar ${careReward} REGEN`}
          </button>
        ) : (
          <span className="earn-timer">Sube tus stats para ganar</span>
        )}
      </div>

      {/* Staking */}
      <div className="earn-card">
        <div className="earn-card-header">
          <span className="earn-card-emoji">🔒</span>
          <div>
            <h3>Staking</h3>
            <p className="earn-card-desc">
              {profile?.staked_amount
                ? `${profile.staked_amount} REGEN stakeados · +${stakeReward} pendiente`
                : "Stakea REGEN y gana 5% diario"}
            </p>
          </div>
        </div>
        <div className="earn-stake-actions">
          {!profile?.staked_amount ? (
            <>
              <input
                type="number"
                className="earn-stake-input"
                placeholder="Cantidad"
                value={stakeInput}
                onChange={(e) => setStakeInput(e.target.value)}
                min="1"
              />
              <button
                className="btn-earn"
                onClick={() => {
                  callEarn("stake", { stakeAmount: stakeInput });
                  setStakeInput("");
                }}
                disabled={!!loading || !stakeInput}
              >
                {loading === "stake" ? "..." : "Stakear"}
              </button>
            </>
          ) : (
            <>
              {stakeReward > 0 && (
                <button
                  className="btn-earn"
                  onClick={() => callEarn("claim-stake")}
                  disabled={!!loading}
                >
                  {loading === "claim-stake" ? "..." : `Reclamar +${stakeReward}`}
                </button>
              )}
              <button
                className="btn-earn-secondary"
                onClick={() => callEarn("unstake")}
                disabled={!!loading}
              >
                {loading === "unstake" ? "..." : "Unstake Todo"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Missions */}
      <div className="earn-card">
        <div className="earn-card-header">
          <span className="earn-card-emoji">🎯</span>
          <div>
            <h3>Misiones</h3>
            <p className="earn-card-desc">Completa objetivos para ganar REGEN</p>
          </div>
        </div>
        <div className="earn-missions">
          {MISSIONS.map((mission) => {
            const complete = isMissionComplete(mission);
            const claimed = isMissionClaimed(mission.id);
            const progress = getMissionProgress(mission);

            return (
              <div key={mission.id} className={`earn-mission ${claimed ? "claimed" : ""}`}>
                <span className="mission-emoji">{mission.emoji}</span>
                <div className="mission-info">
                  <span className="mission-name">{mission.name}</span>
                  <span className="mission-desc">{mission.description}</span>
                  {!claimed && mission.check === "battles_won" && (
                    <div className="mission-progress">
                      <div
                        className="mission-progress-bar"
                        style={{ width: `${(progress / mission.target) * 100}%` }}
                      />
                      <span>{progress}/{mission.target}</span>
                    </div>
                  )}
                </div>
                <div className="mission-reward">
                  {claimed ? (
                    <span className="mission-claimed">✓</span>
                  ) : complete ? (
                    <button
                      className="btn-earn-sm"
                      onClick={() =>
                        callEarn("claim-mission", {
                          missionId: mission.id,
                          reward: mission.reward,
                        })
                      }
                      disabled={!!loading}
                    >
                      {loading === "claim-mission" ? "..." : `+${mission.reward}`}
                    </button>
                  ) : (
                    <span className="mission-reward-text">{mission.reward}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <button className="btn-secondary" onClick={onBack} style={{ marginTop: 16 }}>
        Volver
      </button>
    </div>
  );
}
