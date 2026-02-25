import { useState } from "react";
import { useAccount } from "wagmi";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

export function AirdropBanner() {
  const { address, isConnected } = useAccount();
  const { user } = useAuth();
  const [status, setStatus] = useState("idle"); // idle | loading | claimed | error
  const [error, setError] = useState("");

  const handleClaim = async () => {
    if (!isConnected || !address || !user) return;
    setStatus("loading");
    setError("");

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch("/api/airdrop", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ walletAddress: address }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "Airdrop ya reclamado") {
          setStatus("claimed");
        } else {
          setError(data.error || "Error");
          setStatus("error");
        }
        return;
      }

      setStatus("claimed");
    } catch (err) {
      setError("Error de conexion");
      setStatus("error");
    }
  };

  if (status === "claimed") return null;
  if (!isConnected) return null;

  return (
    <div className="airdrop-banner">
      <div className="airdrop-content">
        <span className="airdrop-emoji">🎁</span>
        <div className="airdrop-text">
          <strong>Bienvenido a Aetheria!</strong>
          <span>Reclama 2,000 REGEN gratis</span>
        </div>
      </div>
      {error && <p className="auth-error" style={{ margin: "4px 0", fontSize: 11 }}>{error}</p>}
      <button
        className="btn-airdrop"
        onClick={handleClaim}
        disabled={status === "loading"}
      >
        {status === "loading" ? "Reclamando..." : "Reclamar Airdrop"}
      </button>
    </div>
  );
}
