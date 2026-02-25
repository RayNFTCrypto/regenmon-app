import { createClient } from "@supabase/supabase-js";
import { createWalletClient, http, parseUnits, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: ["https://testnet-rpc.monad.xyz/"] } },
  testnet: true,
});

const REGEN_TOKEN_ABI = [
  {
    name: "mintReward",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
];

async function mintTokens(walletAddress, amount) {
  if (!process.env.DEPLOYER_PRIVATE_KEY || !process.env.VITE_REGEN_TOKEN_ADDRESS) {
    return { txHash: "demo-mode", amount };
  }

  const account = privateKeyToAccount(process.env.DEPLOYER_PRIVATE_KEY);
  const walletClient = createWalletClient({
    account,
    chain: monadTestnet,
    transport: http("https://testnet-rpc.monad.xyz/"),
  });

  const hash = await walletClient.writeContract({
    address: process.env.VITE_REGEN_TOKEN_ADDRESS,
    abi: REGEN_TOKEN_ABI,
    functionName: "mintReward",
    args: [walletAddress, parseUnits(String(amount), 18)],
  });

  return { txHash: hash, amount };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.slice(7);
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { action, walletAddress, stakeAmount } = req.body || {};
  if (!action || !walletAddress) {
    return res.status(400).json({ error: "Missing action or walletAddress" });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return res.status(404).json({ error: "Profile not found" });
  }

  try {
    // ── Daily Check-in ──
    if (action === "daily") {
      const lastClaim = profile.last_daily_claim
        ? new Date(profile.last_daily_claim)
        : null;
      const now = new Date();

      if (lastClaim) {
        const hoursSince = (now - lastClaim) / (1000 * 60 * 60);
        if (hoursSince < 24) {
          const hoursLeft = Math.ceil(24 - hoursSince);
          return res
            .status(400)
            .json({ error: `Disponible en ${hoursLeft}h` });
        }
      }

      const result = await mintTokens(walletAddress, 50);

      await supabase
        .from("profiles")
        .update({ last_daily_claim: now.toISOString() })
        .eq("id", user.id);

      return res.status(200).json({ ...result, type: "daily" });
    }

    // ── Care Reward ──
    if (action === "care") {
      const lastClaim = profile.last_care_claim
        ? new Date(profile.last_care_claim)
        : null;
      const now = new Date();

      if (lastClaim) {
        const hoursSince = (now - lastClaim) / (1000 * 60 * 60);
        if (hoursSince < 4) {
          const minsLeft = Math.ceil((4 - hoursSince) * 60);
          return res
            .status(400)
            .json({ error: `Disponible en ${minsLeft} min` });
        }
      }

      // Get creature care stats
      const { data: regenmon } = await supabase
        .from("regenmons")
        .select("hunger, energy, happiness, health")
        .eq("user_id", user.id)
        .single();

      if (!regenmon) {
        return res.status(404).json({ error: "No creature found" });
      }

      const avg =
        (regenmon.hunger + regenmon.energy + regenmon.happiness + regenmon.health) / 4;

      let reward = 0;
      if (avg >= 80) reward = 30;
      else if (avg >= 60) reward = 20;
      else if (avg >= 40) reward = 10;
      else {
        return res
          .status(400)
          .json({ error: "Stats muy bajos (min 40% promedio)" });
      }

      const result = await mintTokens(walletAddress, reward);

      await supabase
        .from("profiles")
        .update({ last_care_claim: now.toISOString() })
        .eq("id", user.id);

      return res.status(200).json({ ...result, type: "care" });
    }

    // ── Stake ──
    if (action === "stake") {
      const amount = parseInt(stakeAmount);
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Invalid stake amount" });
      }

      const currentStake = profile.staked_amount || 0;

      await supabase
        .from("profiles")
        .update({
          staked_amount: currentStake + amount,
          staked_at: profile.staked_at || new Date().toISOString(),
        })
        .eq("id", user.id);

      return res.status(200).json({ staked: currentStake + amount, type: "stake" });
    }

    // ── Claim Staking Rewards ──
    if (action === "claim-stake") {
      const staked = profile.staked_amount || 0;
      const stakedAt = profile.staked_at
        ? new Date(profile.staked_at)
        : null;

      if (!staked || !stakedAt) {
        return res.status(400).json({ error: "No tienes REGEN stakeados" });
      }

      const daysPassed = (Date.now() - stakedAt.getTime()) / (1000 * 60 * 60 * 24);
      const reward = Math.floor(staked * 0.05 * daysPassed); // 5% daily

      if (reward < 1) {
        return res.status(400).json({ error: "Aun no hay rewards (min 1 REGEN)" });
      }

      const result = await mintTokens(walletAddress, reward);

      // Reset staked_at to now (rewards claimed up to this point)
      await supabase
        .from("profiles")
        .update({ staked_at: new Date().toISOString() })
        .eq("id", user.id);

      return res.status(200).json({ ...result, type: "claim-stake" });
    }

    // ── Unstake ──
    if (action === "unstake") {
      const staked = profile.staked_amount || 0;
      if (!staked) {
        return res.status(400).json({ error: "No tienes REGEN stakeados" });
      }

      // Mint back the staked amount + any pending rewards
      const stakedAt = profile.staked_at ? new Date(profile.staked_at) : new Date();
      const daysPassed = (Date.now() - stakedAt.getTime()) / (1000 * 60 * 60 * 24);
      const reward = Math.floor(staked * 0.05 * daysPassed);
      const total = staked + reward;

      const result = await mintTokens(walletAddress, total);

      await supabase
        .from("profiles")
        .update({ staked_amount: 0, staked_at: null })
        .eq("id", user.id);

      return res.status(200).json({ ...result, unstaked: staked, reward, type: "unstake" });
    }

    // ── Claim Mission ──
    if (action === "claim-mission") {
      const { missionId, reward } = req.body;
      if (!missionId || !reward) {
        return res.status(400).json({ error: "Missing missionId or reward" });
      }

      const claimed = profile.claimed_missions || [];
      if (claimed.includes(missionId)) {
        return res.status(400).json({ error: "Mision ya reclamada" });
      }

      const result = await mintTokens(walletAddress, reward);

      await supabase
        .from("profiles")
        .update({ claimed_missions: [...claimed, missionId] })
        .eq("id", user.id);

      return res.status(200).json({ ...result, type: "mission", missionId });
    }

    return res.status(400).json({ error: "Unknown action" });
  } catch (err) {
    console.error("Earn action failed:", err);
    return res.status(500).json({ error: "Operation failed" });
  }
}
