import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { REGENMON_NFT_ADDRESS, REGENMON_NFT_ABI } from "../lib/contracts";
import { regenmonTypes } from "../data/regenmonTypes";
import { supabase } from "../lib/supabase";

export function MintButton({ regenmon }) {
  const { address, isConnected } = useAccount();
  const [justMinted, setJustMinted] = useState(false);

  // Check on-chain if already minted
  const { data: tokenId } = useReadContract({
    address: REGENMON_NFT_ADDRESS,
    abi: REGENMON_NFT_ABI,
    functionName: "regenmonToToken",
    args: [regenmon.id],
  });

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  if (isSuccess && !justMinted) {
    setJustMinted(true);
    // Save NFT info to Supabase
    supabase
      .from("regenmons")
      .update({ nft_tx_hash: hash })
      .eq("id", regenmon.id);
  }

  const alreadyMinted = justMinted || (tokenId && tokenId > 0n) || !!regenmon.nftTxHash;

  const handleMint = () => {
    const type = regenmonTypes[regenmon.type];
    const metadata = {
      name: regenmon.name,
      description: `${type.name} type Regenmon from Aetheria`,
      image: `${window.location.origin}/sprites/regenmon/${regenmon.type}.png`,
      attributes: [
        { trait_type: "Type", value: type.name },
        { trait_type: "HP", value: regenmon.stats.hp },
        { trait_type: "ATK", value: regenmon.stats.atk },
        { trait_type: "DEF", value: regenmon.stats.def },
        { trait_type: "SPD", value: regenmon.stats.spd },
      ],
    };
    const tokenURI = `data:application/json;base64,${btoa(JSON.stringify(metadata))}`;

    writeContract({
      address: REGENMON_NFT_ADDRESS,
      abi: REGENMON_NFT_ABI,
      functionName: "mintCreature",
      args: [address, regenmon.id, tokenURI],
    });
  };

  if (!isConnected) return null;

  if (alreadyMinted) {
    return <span className="mint-status minted">NFT Minted ✓</span>;
  }

  return (
    <button
      className="btn-mint"
      onClick={handleMint}
      disabled={isPending || isConfirming}
    >
      {isPending ? "Firmando..." : isConfirming ? "Confirmando..." : "Mint NFT"}
    </button>
  );
}
