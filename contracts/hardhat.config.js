require("@nomicfoundation/hardhat-toolbox");
require("@nomiclabs/hardhat-waffle");
const dotenv = require("dotenv");
dotenv.config();

/** @type import('hardhat/config').HardhatUserConfig */
const DEFAULT_RINKEBY_RPC = "https://rinkeby-light.eth.linkpool.io"
const DEFAULT_POLYGON_RPC = "https://polygon-rpc.com"

const config = {
  // Your type-safe config goes here
  solidity: {
    compilers: [
      {
        version: "0.8.7",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000,
          },
        },
      },
    ],
  },
  networks: {
    hardhat: {
      gasPrice: 8000000000,
      initialBaseFeePerGas: 1
    },
    rinkeby: {
      url: process.env.ALCHEMY_RINKEBY_RPC || DEFAULT_RINKEBY_RPC,
      accounts: [process.env.DEPLOYER_PRIVATE_KEY],
    },
    polygon: {
      url: process.env.ALCHEMY_POLYGON_RPC || DEFAULT_POLYGON_RPC,
      accounts: [process.env.DEPLOYER_PRIVATE_KEY],
      initialBaseFeePerGas: 500e-5,
      // gas: 3000,
      gasPrice: 8000000000,
    },
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: process.env.ETHERSCAN_API_KEY,
  },

};

module.exports = config;
