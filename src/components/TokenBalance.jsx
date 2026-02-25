import { useAccount, useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { REGEN_TOKEN_ADDRESS, REGEN_TOKEN_ABI } from "../lib/contracts";

export function TokenBalance() {
  const { address, isConnected } = useAccount();

  const { data: balance } = useReadContract({
    address: REGEN_TOKEN_ADDRESS,
    abi: REGEN_TOKEN_ABI,
    functionName: "balanceOf",
    args: [address],
    query: { enabled: isConnected && !!address },
  });

  if (!isConnected) return null;

  const formatted = balance ? parseFloat(formatUnits(balance, 18)).toFixed(0) : "0";

  return (
    <div className="token-balance">
      <span className="token-icon">REGEN</span>
      <span className="token-amount">{formatted}</span>
    </div>
  );
}
