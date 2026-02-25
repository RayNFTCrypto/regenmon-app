require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: "../.env.local" });

module.exports = {
  solidity: "0.8.20",
  networks: {
    "monad-testnet": {
      url: "https://testnet-rpc.monad.xyz/",
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
      chainId: 10143,
    },
    "base-sepolia": {
      url: process.env.BASE_SEPOLIA_RPC || "https://sepolia.base.org",
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
      chainId: 84532,
    },
  },
};
