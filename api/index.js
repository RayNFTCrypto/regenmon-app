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

function verifyAuth(req) {
  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}

function getSupabase(token) {
  return createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
}

// ── Earn handler ──
async function handleEarn(req, res, supabase, user) {
  const { action, walletAddress, stakeAmount } = req.body || {};
  if (!action || !walletAddress) {
    return res.status(400).json({ error: "Missing action or walletAddress" });
  }

  const { data: profile } = await supabase
    .from("profiles").select("*").eq("id", user.id).single();
  if (!profile) return res.status(404).json({ error: "Profile not found" });

  // Daily Check-in
  if (action === "daily") {
    const lastClaim = profile.last_daily_claim ? new Date(profile.last_daily_claim) : null;
    const now = new Date();
    if (lastClaim) {
      const hoursSince = (now - lastClaim) / (1000 * 60 * 60);
      if (hoursSince < 24) {
        return res.status(400).json({ error: `Disponible en ${Math.ceil(24 - hoursSince)}h` });
      }
    }
    const result = await mintTokens(walletAddress, 50);
    await supabase.from("profiles").update({ last_daily_claim: now.toISOString() }).eq("id", user.id);
    return res.status(200).json({ ...result, type: "daily" });
  }

  // Care Reward
  if (action === "care") {
    const lastClaim = profile.last_care_claim ? new Date(profile.last_care_claim) : null;
    const now = new Date();
    if (lastClaim) {
      const hoursSince = (now - lastClaim) / (1000 * 60 * 60);
      if (hoursSince < 4) {
        return res.status(400).json({ error: `Disponible en ${Math.ceil((4 - hoursSince) * 60)} min` });
      }
    }
    const { data: regenmon } = await supabase
      .from("regenmons").select("hunger, energy, happiness, health").eq("user_id", user.id).single();
    if (!regenmon) return res.status(404).json({ error: "No creature found" });
    const avg = (regenmon.hunger + regenmon.energy + regenmon.happiness + regenmon.health) / 4;
    let reward = 0;
    if (avg >= 80) reward = 30;
    else if (avg >= 60) reward = 20;
    else if (avg >= 40) reward = 10;
    else return res.status(400).json({ error: "Stats muy bajos (min 40% promedio)" });
    const result = await mintTokens(walletAddress, reward);
    await supabase.from("profiles").update({ last_care_claim: now.toISOString() }).eq("id", user.id);
    return res.status(200).json({ ...result, type: "care" });
  }

  // Stake
  if (action === "stake") {
    const amount = parseInt(stakeAmount);
    if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid stake amount" });
    const currentStake = profile.staked_amount || 0;
    await supabase.from("profiles").update({
      staked_amount: currentStake + amount,
      staked_at: profile.staked_at || new Date().toISOString(),
    }).eq("id", user.id);
    return res.status(200).json({ staked: currentStake + amount, type: "stake" });
  }

  // Claim Staking Rewards
  if (action === "claim-stake") {
    const staked = profile.staked_amount || 0;
    const stakedAt = profile.staked_at ? new Date(profile.staked_at) : null;
    if (!staked || !stakedAt) return res.status(400).json({ error: "No tienes REGEN stakeados" });
    const daysPassed = (Date.now() - stakedAt.getTime()) / (1000 * 60 * 60 * 24);
    const reward = Math.floor(staked * 0.05 * daysPassed);
    if (reward < 1) return res.status(400).json({ error: "Aun no hay rewards (min 1 REGEN)" });
    const result = await mintTokens(walletAddress, reward);
    await supabase.from("profiles").update({ staked_at: new Date().toISOString() }).eq("id", user.id);
    return res.status(200).json({ ...result, type: "claim-stake" });
  }

  // Unstake
  if (action === "unstake") {
    const staked = profile.staked_amount || 0;
    if (!staked) return res.status(400).json({ error: "No tienes REGEN stakeados" });
    const stakedAt = profile.staked_at ? new Date(profile.staked_at) : new Date();
    const daysPassed = (Date.now() - stakedAt.getTime()) / (1000 * 60 * 60 * 24);
    const reward = Math.floor(staked * 0.05 * daysPassed);
    const result = await mintTokens(walletAddress, staked + reward);
    await supabase.from("profiles").update({ staked_amount: 0, staked_at: null }).eq("id", user.id);
    return res.status(200).json({ ...result, unstaked: staked, reward, type: "unstake" });
  }

  // Claim Mission
  if (action === "claim-mission") {
    const { missionId, reward } = req.body;
    if (!missionId || !reward) return res.status(400).json({ error: "Missing missionId or reward" });
    const claimed = profile.claimed_missions || [];
    if (claimed.includes(missionId)) return res.status(400).json({ error: "Mision ya reclamada" });
    const result = await mintTokens(walletAddress, reward);
    await supabase.from("profiles").update({ claimed_missions: [...claimed, missionId] }).eq("id", user.id);
    return res.status(200).json({ ...result, type: "mission", missionId });
  }

  return res.status(400).json({ error: "Unknown action" });
}

// ── Airdrop handler ──
async function handleAirdrop(req, res, supabase, user) {
  const { walletAddress } = req.body || {};
  if (!walletAddress) return res.status(400).json({ error: "Missing walletAddress" });

  const { data: profile } = await supabase
    .from("profiles").select("airdrop_claimed").eq("id", user.id).single();
  if (profile?.airdrop_claimed) return res.status(400).json({ error: "Airdrop ya reclamado" });

  const result = await mintTokens(walletAddress, 2000);
  await supabase.from("profiles").update({ airdrop_claimed: true }).eq("id", user.id);
  return res.status(200).json({ ...result, type: "airdrop" });
}

// ── Battle Reward handler ──
async function handleBattleReward(req, res, supabase, user) {
  const { battleId, walletAddress } = req.body || {};
  if (!battleId || !walletAddress) return res.status(400).json({ error: "Missing battleId or walletAddress" });

  const { data: battle } = await supabase
    .from("battles").select("*").eq("id", battleId).eq("winner_id", user.id).eq("reward_claimed", false).single();
  if (!battle) return res.status(404).json({ error: "Battle not found or reward already claimed" });

  const result = await mintTokens(walletAddress, battle.reward_amount);
  await supabase.from("battles").update({ reward_claimed: true }).eq("id", battleId);
  return res.status(200).json({ ...result, type: "battle-reward" });
}

// ── Main router ──
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const token = verifyAuth(req);
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const supabase = getSupabase(token);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return res.status(401).json({ error: "Unauthorized" });

  const { route } = req.body || {};

  try {
    if (route === "earn") return await handleEarn(req, res, supabase, user);
    if (route === "airdrop") return await handleAirdrop(req, res, supabase, user);
    if (route === "battle-reward") return await handleBattleReward(req, res, supabase, user);
    return res.status(400).json({ error: "Unknown route" });
  } catch (err) {
    console.error("API error:", err);
    return res.status(500).json({ error: "Operation failed" });
  }
}
