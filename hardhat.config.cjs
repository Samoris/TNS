require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  paths: {
    sources: "./contracts",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  networks: {
    intuition: {
      url: "https://rpc.intuition.systems",
      chainId: 1155
    }
  },
  etherscan: {
    apiKey: {
      intuition: "abc" // Blockscout doesn't require a real API key
    },
    customChains: [
      {
        network: "intuition",
        chainId: 1155,
        urls: {
          apiURL: "https://explorer.intuition.systems/api",
          browserURL: "https://explorer.intuition.systems"
        }
      }
    ]
  }
};
