require("@nomiclabs/hardhat-waffle");
require('dotenv').config({path: ".env"})
require("@nomiclabs/hardhat-etherscan");

const KOVAN_INFURA_ENDPOINT = process.env.KOVAN_INFURA_ENDPOINT;
const RINKEBY_INFURA_ENDPOINT = process.env.RINKEBY_INFURA_ENDPOINT;
const ETHERSCAN_API = process.env.ETHERSCAN_API;
const PRIVATE_KEY1 = process.env.PRIVATE_KEY1;
const PRIVATE_KEY2 = process.env.PRIVATE_KEY2;

module.exports = {
  defaultNetwork: "localhost",
  networks: {
    mainnet: {
      url: MAINNET_INFURA_ENDPOINT,
      accounts: [PRIVATE_KEY1],
      gas: "auto",
    }
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    kovan: {
      url: KOVAN_INFURA_ENDPOINT,
      accounts: [PRIVATE_KEY1, PRIVATE_KEY2]
    },
    rinkeby: {
      url: RINKEBY_INFURA_ENDPOINT,
      accounts: [PRIVATE_KEY1, PRIVATE_KEY2],
      gas: "auto",
    }
  },
  solidity: {
    version: "0.8.10",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  etherscan: {
    apiKey: ETHERSCAN_API
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  mocha: {
    timeout: 2000000
  }
}
