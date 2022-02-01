const hre = require("hardhat");
const { constants, utils } = require( "ethers");

async function main() {
  const LNFT = await hre.ethers.getContractFactory("LightNFT");
  const lnftContract = await LNFT.deploy(
    "https://ipfs.io/ipfs/<your-hidden-ipfs-hash>/",
    "<your-merkle-root>",
    ["address1", "address2", "address3", "address4"]
  );

  await lnftContract.deployed();
  console.log(lnftContract.address);

  let gasUsed = lnftContract.deployTransaction.gasLimit;
  console.log('Gas limit', gasUsed.toString());
  console.log('Deployment cost @ 100gwei', utils.formatEther(gasUsed.mul(utils.parseUnits('100', 'gwei'))))
  console.log('Deployment cost @ 150gwei', utils.formatEther(gasUsed.mul(utils.parseUnits('150', 'gwei'))))
  console.log('Deployment cost @ 200gwei', utils.formatEther(gasUsed.mul(utils.parseUnits('200', 'gwei'))))

  // Verify the contract (we wait a minute for a few blocks to pass)
  await new Promise(resolve => setTimeout(resolve, 60000));
  try {await hre.run("verify:verify", {
    address: lnftContract.address,
    constructorArguments: [
      "https://ipfs.io/ipfs/<your-hidden-ipfs-hash>/",
      "<your-merkle-root>",
      ["address1", "address2", "address3", "address4"]
    ],
  }); } catch (e) {
    console.log(e);
  }
}


main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
