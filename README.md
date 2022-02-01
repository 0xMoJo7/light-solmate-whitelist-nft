# NFT Whitelist using Solmate with Reveal Functionality

This is an example contract of a highly gas optimized NFT contract I recently used in production. While we all love OpenZeppelin, sometimes the functionality included in some of their contracts are unneccesary for something simple and we can save us gas in deployment and contract interaction by using a trusted alternative. Here we use Rari-Capital's Solmate. By using a combination of Solmate, reverts instead of requires (*test thoroughly if you are going to do this, this can provide a bad user experience if there are bugs*), and the EVM's built in `unchecked` functionality we were able to have the mint and whitelist functions come out to roughly ~$20 per transaction! (ETH at ~$2700 at the time of writing this). 

We can also save a bit of gas by not using SafeMath.sol since after Solidity version 0.8.0, under/overflows are accounted for by the EVM. There is an example in this contract of how to set up withdraw splits. This specific example has the allocations of 51.%, 40%, 7.5%, and 1% split between 4 wallets.

The actual whitelist checking took place off-chain by using a React app and AWS Lambda for generating our Merkle Proofs (not included in this repo). See my [Merkle Tree Tutorial](https://github.com/0xMoJo7/merkle-tree-example) for more details on the concepts and how to set this portion up.

This repo uses hardhat under the hood for testing, compilation and deployment. To run the tests, spin up your local node with `npx hardhat node` and run `npx hardhat test`.

Please reach out with any feedback or suggestions!
