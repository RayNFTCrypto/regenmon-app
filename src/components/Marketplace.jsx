import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import { REGEN_TOKEN_ADDRESS, REGEN_TOKEN_ABI } from "../lib/contracts";
import { MARKETPLACE_ITEMS, RARITY_COLORS } from "../data/marketplaceItems";

// Deployer address (marketplace treasury) — receives REGEN payments
const TREASURY = "0x2Fb895820Bc38CA2ea35C08426dD9a436e6Da73D";

// Transfer ABI fragment
const TRANSFER_ABI = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
];

export function Marketplace({ onBack, onPurchase }) {
  const { address, isConnected } = useAccount();
  const [buyingId, setBuyingId] = useState(null);
  const [purchased, setPurchased] = useState(new Set());

  // Read REGEN balance
  const { data: rawBalance } = useReadContract({
    address: REGEN_TOKEN_ADDRESS,
    abi: REGEN_TOKEN_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  const balance = rawBalance ? Number(rawBalance / 10n ** 18n) : 0;

  const [error, setError] = useState("");
  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  if (isSuccess && buyingId && !purchased.has(buyingId)) {
    const item = MARKETPLACE_ITEMS.find((i) => i.id === buyingId);
    setPurchased((prev) => new Set([...prev, buyingId]));
    if (item && onPurchase) onPurchase(item);
    setBuyingId(null);
    setError("");
  }

  if (writeError && error !== writeError.shortMessage) {
    setError(writeError.shortMessage || writeError.message);
    setBuyingId(null);
  }

  const handleBuy = (item) => {
    if (!isConnected || balance < item.price) return;
    setError("");
    setBuyingId(item.id);

    writeContract({
      address: REGEN_TOKEN_ADDRESS,
      abi: TRANSFER_ABI,
      functionName: "transfer",
      args: [TREASURY, parseUnits(String(item.price), 18)],
    });
  };

  const isBuying = isPending || isConfirming;

  return (
    <div className="marketplace fade-in">
      <div className="marketplace-header">
        <h2>Marketplace</h2>
        <span className="marketplace-balance">
          {balance} REGEN
        </span>
      </div>
      <p className="marketplace-subtitle">Gasta tus REGEN en items unicos</p>
      {error && <p className="auth-error" style={{ marginBottom: 8 }}>{error}</p>}

      <div className="marketplace-grid">
        {MARKETPLACE_ITEMS.map((item) => {
          const rarityColor = RARITY_COLORS[item.rarity];
          const owned = purchased.has(item.id);
          const canAfford = balance >= item.price;

          return (
            <div
              key={item.id}
              className="marketplace-item"
              style={{ "--rarity-color": rarityColor }}
            >
              <span className="item-emoji">{item.emoji}</span>
              <div className="item-details">
                <span className="item-name">{item.name}</span>
                <span className="item-desc">{item.description}</span>
                <div className="item-meta">
                  <span className="item-rarity" style={{ color: rarityColor }}>
                    {item.rarity.toUpperCase()}
                  </span>
                  <span className="item-price">{item.price} REGEN</span>
                </div>
              </div>

              {owned ? (
                <span className="item-owned">✓</span>
              ) : (
                <button
                  className="btn-buy"
                  onClick={() => handleBuy(item)}
                  disabled={isBuying || !canAfford || !isConnected}
                  style={{ "--rarity-color": rarityColor }}
                >
                  {buyingId === item.id && isBuying
                    ? "..."
                    : !isConnected
                    ? "Wallet"
                    : !canAfford
                    ? "Sin REGEN"
                    : "Comprar"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <button className="btn-secondary" onClick={onBack} style={{ marginTop: 20 }}>
        Volver
      </button>
    </div>
  );
}
