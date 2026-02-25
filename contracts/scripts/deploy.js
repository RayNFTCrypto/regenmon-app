const hre = require("hardhat");

async function main() {
  console.log("Deploying contracts to", hre.network.name, "...\n");

  // Deploy RegenToken (ERC-20)
  const RegenToken = await hre.ethers.getContractFactory("RegenToken");
  const token = await RegenToken.deploy();
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("RegenToken deployed to:", tokenAddress);

  // Deploy RegenmonNFT (ERC-721)
  const RegenmonNFT = await hre.ethers.getContractFactory("RegenmonNFT");
  const nft = await RegenmonNFT.deploy();
  await nft.waitForDeployment();
  const nftAddress = await nft.getAddress();
  console.log("RegenmonNFT deployed to:", nftAddress);

  console.log("\n--- Add to .env.local ---");
  console.log(`VITE_REGEN_TOKEN_ADDRESS=${tokenAddress}`);
  console.log(`VITE_REGENMON_NFT_ADDRESS=${nftAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
