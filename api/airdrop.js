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

const AIRDROP_AMOUNT = 2000;

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

  const { walletAddress } = req.body || {};
  if (!walletAddress) {
    return res.status(400).json({ error: "Missing walletAddress" });
  }

  // Check if already claimed
  const { data: profile } = await supabase
    .from("profiles")
    .select("airdrop_claimed")
    .eq("id", user.id)
    .single();

  if (profile?.airdrop_claimed) {
    return res.status(400).json({ error: "Airdrop ya reclamado" });
  }

  if (!process.env.DEPLOYER_PRIVATE_KEY || !process.env.VITE_REGEN_TOKEN_ADDRESS) {
    // Demo mode
    await supabase
      .from("profiles")
      .update({ airdrop_claimed: true })
      .eq("id", user.id);
    return res.status(200).json({ txHash: "demo-mode", amount: AIRDROP_AMOUNT });
  }

  try {
    const account = privateKeyToAccount(process.env.DEPLOYER_PRIVATE_KEY);
    const walletClient = createWalletClient({
      account,
      chain: monadTestnet,
      transport: http("https://testnet-rpc.monad.xyz/"),
    });

    const amount = parseUnits(String(AIRDROP_AMOUNT), 18);
    const hash = await walletClient.writeContract({
      address: process.env.VITE_REGEN_TOKEN_ADDRESS,
      abi: REGEN_TOKEN_ABI,
      functionName: "mintReward",
      args: [walletAddress, amount],
    });

    // Mark as claimed
    await supabase
      .from("profiles")
      .update({ airdrop_claimed: true })
      .eq("id", user.id);

    return res.status(200).json({ txHash: hash, amount: AIRDROP_AMOUNT });
  } catch (err) {
    console.error("Airdrop minting failed:", err);
    return res.status(500).json({ error: "Minting failed" });
  }
}
