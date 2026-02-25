export const REGEN_TOKEN_ADDRESS = import.meta.env.VITE_REGEN_TOKEN_ADDRESS;
export const REGENMON_NFT_ADDRESS = import.meta.env.VITE_REGENMON_NFT_ADDRESS;

export const REGEN_TOKEN_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
];

export const REGENMON_NFT_ABI = [
  {
    name: "mintCreature",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "regenmonId", type: "string" },
      { name: "tokenURI_", type: "string" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "regenmonToToken",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "string" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "ownerOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "tokenURI",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
];
