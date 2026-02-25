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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Auth check
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

  const { battleId, walletAddress } = req.body || {};
  if (!battleId || !walletAddress) {
    return res.status(400).json({ error: "Missing battleId or walletAddress" });
  }

  // Verify battle exists, user won, and reward not claimed
  const { data: battle } = await supabase
    .from("battles")
    .select("*")
    .eq("id", battleId)
    .eq("winner_id", user.id)
    .eq("reward_claimed", false)
    .single();

  if (!battle) {
    return res
      .status(404)
      .json({ error: "Battle not found or reward already claimed" });
  }

  // Check if deployer key is configured
  if (!process.env.DEPLOYER_PRIVATE_KEY || !process.env.VITE_REGEN_TOKEN_ADDRESS) {
    // Fallback: just mark as claimed without on-chain mint (for demo/testing)
    await supabase
      .from("battles")
      .update({ reward_claimed: true })
      .eq("id", battleId);
    return res.status(200).json({ txHash: "demo-mode", amount: battle.reward_amount });
  }

  try {
    const account = privateKeyToAccount(process.env.DEPLOYER_PRIVATE_KEY);
    const walletClient = createWalletClient({
      account,
      chain: monadTestnet,
      transport: http("https://testnet-rpc.monad.xyz/"),
    });

    const rewardAmount = parseUnits(String(battle.reward_amount), 18);
    const hash = await walletClient.writeContract({
      address: process.env.VITE_REGEN_TOKEN_ADDRESS,
      abi: REGEN_TOKEN_ABI,
      functionName: "mintReward",
      args: [walletAddress, rewardAmount],
    });

    // Mark reward as claimed
    await supabase
      .from("battles")
      .update({ reward_claimed: true })
      .eq("id", battleId);

    return res.status(200).json({ txHash: hash, amount: battle.reward_amount });
  } catch (err) {
    console.error("Minting failed:", err);
    return res.status(500).json({ error: "Minting failed" });
  }
}
