const { expect } = require("chai");
const { ethers, waffle } = require("hardhat");
const { constants, BigNumber, utils } = require("ethers");
const { default: accounts } = require("@openzeppelin/cli/lib/scripts/accounts");
const { deployMockContract, provider } = waffle;
const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');
const fs = require('fs');

function verifyWhitelist(address) {

  let whitelistData = fs.readFileSync("./data/whitelist.json")
  let whitelistArray = JSON.parse(whitelistData);

  const leaves = whitelistArray.map((v) => keccak256(v));

  const tree = new MerkleTree(leaves, keccak256, { sort: true });
  const root = tree.getHexRoot();
  const leaf = keccak256(address);
  const proof = tree.getHexProof(leaf);
  const verified = tree.verify(proof, leaf, root);

  return { proof };
};

describe("LightNFT", function () {
  let owner;
  let user1;
  let user2;
  let user3;
  let lnftContract;
  let accounts
  const FIRST_ID = 51

  beforeEach(async function() {
    [owner, user1, user2, user3, user4, ...accounts] = await ethers.getSigners();
    const LNFT = await hre.ethers.getContractFactory("LightNFT");
    lnftContract = await LNFT.deploy(
      "https://ipfs.io/ipfs/<your-hidden-ipfs-folder>/",
      "0x7f5abc2e3139c9674289755ec40ea6e5d021a023dd49efaee5f03edc6ce8e6db",
      [owner.address, user1.address, user2.address, user3.address]
    );
    await lnftContract.deployed();
  });

  it("Has correct initial conditions", async function () {
    expect(await lnftContract.TOTAL_SUPPLY()).to.equal(BigNumber.from(7777));
    expect(await lnftContract.PRICE_PER_PUBLIC_MINT()).to.equal(utils.parseEther('0.07'));
    expect(await lnftContract.PRICE_PER_WHITELIST_MINT()).to.equal(utils.parseEther('0.05'));
    expect(await lnftContract.totalSupply()).to.equal(50);
    expect(await lnftContract.maxWhitelistMintAmount()).to.equal(10);
    expect(await lnftContract.maxPublicMintAmount()).to.equal(20);
    expect(await lnftContract.whitelistMintStarted()).to.equal(false);
    expect(await lnftContract.mintStarted()).to.equal(false);
    expect(await lnftContract.balanceOf(owner.address)).to.equal(50);
  });

  it("Only allows owner to start whitelist mint or standard mint", async function () {
    expect(await lnftContract.whitelistMintStarted()).to.equal(false);
    await expect(lnftContract.connect(user1).startWhitelistMint()).to.be.reverted;
    await lnftContract.connect(owner).startWhitelistMint();
    expect(await lnftContract.whitelistMintStarted()).to.equal(true);
    
    expect(await lnftContract.mintStarted()).to.equal(false);
    await expect(lnftContract.connect(user1).startMint()).to.be.reverted;
    await lnftContract.connect(owner).startMint();
    expect(await lnftContract.mintStarted()).to.equal(true);
  });

  it("Only allows owner to start whitelist mint / mint", async function () {
    expect(await lnftContract.mintStarted()).to.equal(false);
    await expect(lnftContract.connect(user1).startMint()).to.be.reverted;
    await lnftContract.connect(owner).startMint();
    expect(await lnftContract.mintStarted()).to.equal(true);
    
    expect(await lnftContract.whitelistMintStarted()).to.equal(false);
    await expect(lnftContract.connect(user1).startWhitelistMint()).to.be.reverted;
    await lnftContract.connect(owner).startWhitelistMint();
    expect(await lnftContract.whitelistMintStarted()).to.equal(true);
  });

  it("Only allows owner to pause mint", async function () {
    await lnftContract.connect(owner).startMint();
    expect(await lnftContract.mintStarted()).to.equal(true);
    
    await lnftContract.connect(owner).startWhitelistMint();
    expect(await lnftContract.whitelistMintStarted()).to.equal(true);

    await expect(lnftContract.connect(user1).pauseMint()).to.be.reverted;
    await lnftContract.connect(owner).pauseMint();

    expect(await lnftContract.mintStarted()).to.equal(false);
    expect(await lnftContract.whitelistMintStarted()).to.equal(false);
  });

  it("Can public mint 1 available NFT", async function () {
    const ownerAddress = await owner.getAddress();
    const amount = 1;

    expect(await lnftContract.balanceOf(ownerAddress)).to.equal(50);
    expect(await lnftContract.ownerOf(FIRST_ID)).to.equal(constants.AddressZero);

    // Mint not started
    await expect(lnftContract.mint(amount, { value: utils.parseEther('0.07') })).to.be.reverted;
    await lnftContract.startMint();

    // Not enough ETH
    await expect(lnftContract.mint(amount, { value: utils.parseEther('0') })).to.be.revertedWith("NotEnoughETH");
    let tx = await lnftContract.mint(amount, { value: utils.parseEther('0.07') });
    await tx.wait();

    expect(await lnftContract.balanceOf(ownerAddress)).to.equal(amount + 50);
    expect(await lnftContract.ownerOf(FIRST_ID)).to.equal(ownerAddress);
  });

  it("Can public mint multiple available NFTs", async function () {
    const ownerAddress = await owner.getAddress();
    const amount = 20;

    await lnftContract.startMint();
    expect(await lnftContract.balanceOf(ownerAddress)).to.equal(50);
    expect(await lnftContract.ownerOf(FIRST_ID)).to.equal(constants.AddressZero);

    await expect(lnftContract.mint(amount, { value: utils.parseEther('0.6') })).to.be.revertedWith("NotEnoughETH");
    let tx = await lnftContract.mint(amount, { value: utils.parseEther('1.4') });
    await tx.wait();

    expect(await lnftContract.balanceOf(ownerAddress)).to.equal(amount + 50);
    expect(await lnftContract.ownerOf(FIRST_ID)).to.equal(ownerAddress);
    expect(await lnftContract.ownerOf(59)).to.equal(ownerAddress);
    expect(await lnftContract.ownerOf(70)).to.equal(ownerAddress);
  });

  it("Can whitelist mint 1 available NFT", async function () {
    const ownerAddress = await owner.getAddress();
    const amount = 1;

    expect(await lnftContract.balanceOf(ownerAddress)).to.equal(50);
    expect(await lnftContract.ownerOf(FIRST_ID)).to.equal(constants.AddressZero);
    const proof = verifyWhitelist(owner.address)
    
    // Mint not started
    await expect(lnftContract.whitelistMint(amount, proof.proof, { value: utils.parseEther('0.05') })).to.be.reverted;
    await lnftContract.startWhitelistMint();

    // Not enough ETH
    await expect(lnftContract.connect(owner.address).whitelistMint(amount, proof.proof, { value: utils.parseEther('0') })).to.be.revertedWith("NotEnoughETH");

    // Not on whitelist
    const badProof = verifyWhitelist(user4.address)
    await expect(lnftContract.connect(user4.address).whitelistMint(amount, badProof.proof, { value: utils.parseEther('0.05') })).to.be.revertedWith("NotOnWhitelist");
    
    // Correct 
    let tx = await lnftContract.whitelistMint(amount, proof.proof, { value: utils.parseEther('0.05') });
    await tx.wait();

    expect(await lnftContract.balanceOf(ownerAddress)).to.equal(amount + 50);
    expect(await lnftContract.ownerOf(FIRST_ID)).to.equal(ownerAddress);
  });

  it("Can whitelist mint multiple available NFTs", async function () {
    const ownerAddress = await owner.getAddress();
    const amount = 10;

    await lnftContract.startWhitelistMint();
    expect(await lnftContract.balanceOf(ownerAddress)).to.equal(50);
    
    const proof = verifyWhitelist(owner.address)

    await expect(lnftContract.whitelistMint(amount, proof.proof, { value: utils.parseEther('0.4') })).to.be.revertedWith("NotEnoughETH");
    let tx = await lnftContract.whitelistMint(amount, proof.proof, { value: utils.parseEther('1') });
    await tx.wait();

    expect(await lnftContract.balanceOf(ownerAddress)).to.equal(amount + 50);
    expect(await lnftContract.ownerOf(FIRST_ID)).to.equal(ownerAddress);
    expect(await lnftContract.ownerOf(FIRST_ID + 9)).to.equal(ownerAddress);
    expect(await lnftContract.ownerOf(60)).to.equal(ownerAddress);
  });

  it("Can't mint more than 20 NFTs at once", async function () {
    const ownerAddress = await owner.getAddress();
    const amount = 21;

    await lnftContract.startMint();
    expect(await lnftContract.balanceOf(ownerAddress)).to.equal(50);
    expect(await lnftContract.ownerOf(FIRST_ID)).to.equal(constants.AddressZero);
    await expect(lnftContract.mint(amount, { value: utils.parseEther('1.54') })).to.be.revertedWith("TooManyMintAtOnce")
  });

  it("Should return the unrevealed URI after minting", async function () {
    expect(await lnftContract.baseURI()).to.equal("");
    expect(await lnftContract.nonRevealedURI()).to.equal("https://ipfs.io/ipfs/<your-hidden-ipfs-folder>/");
    await lnftContract.startMint();
    let tx = await lnftContract.mint(5, { value: utils.parseEther('0.35') });
    await tx.wait();
    expect(await lnftContract.tokenURI(1)).to.equal("https://ipfs.io/ipfs/<your-hidden-ipfs-folder>/1.json")
    expect(await lnftContract.tokenURI(5)).to.equal("https://ipfs.io/ipfs/<your-hidden-ipfs-folder>/5.json")
  });

  it("Should return revealed URI after the reveal", async function () {
    expect(await lnftContract.baseURI()).to.equal("");
    expect(await lnftContract.nonRevealedURI()).to.equal("https://ipfs.io/ipfs/<your-hidden-ipfs-folder>/hidden.json");
    await lnftContract.startMint();
    let tx = await lnftContract.mint(5, { value: utils.parseEther('0.35') });
    await tx.wait();
    expect(await lnftContract.tokenURI(1)).to.equal("https://ipfs.io/ipfs/<your-hidden-ipfs-folder>/hidden.json")
    expect(await lnftContract.tokenURI(5)).to.equal("https://ipfs.io/ipfs/<your-hidden-ipfs-folder>/hidden.json")

    await lnftContract.reveal("https://ipfs.io/ipfs/<your-revealed-ipfs-folder>/");
    expect(await lnftContract.tokenURI(1)).to.equal("https://ipfs.io/ipfs/<your-revealed-ipfs-folder>/1.json")
    expect(await lnftContract.tokenURI(5)).to.equal("https://ipfs.io/ipfs/<your-revealed-ipfs-folder>/5.json")
  });

  it("Should allow the team to withdraw in the right allocations", async function () {
    await lnftContract.startMint();
    // Send a bunch more eth
    let tx = await lnftContract.mint(4, { value: utils.parseEther('100') });
    await tx.wait();
    
    // Only team wallet can call it
    await expect(lnftContract.connect(user1).withdraw()).to.be.reverted;
    
    // Fetch balances before withdraw
    const initialOwnerBalance = await provider.getBalance(owner.address);
    const initialUser1Balance = await provider.getBalance(user1.address);
    const initialUser2Balance = await provider.getBalance(user2.address);
    const initialUser3Balance = await provider.getBalance(user3.address);
    
    await lnftContract.connect(owner).withdraw();

    // Split % are 51.5, 40, 7.5, 1
    // Allow for gas by taking .05 off respective percentages
    expect(await provider.getBalance(owner.address)).to.be.above(initialOwnerBalance.add(utils.parseEther('51.45')));
    expect(await provider.getBalance(user1.address)).to.be.above(initialUser1Balance.add(utils.parseEther('39.95')));
    expect(await provider.getBalance(user2.address)).to.be.above(initialUser2Balance.add(utils.parseEther('7.45')));
    expect(await provider.getBalance(user3.address)).to.be.above(initialUser3Balance.add(utils.parseEther('.95')));
    
    // Failing examples
    expect(await provider.getBalance(owner.address)).to.be.below(initialOwnerBalance.add(utils.parseEther('51.55')));
    expect(await provider.getBalance(user1.address)).to.be.below(initialUser1Balance.add(utils.parseEther('40.05')));
    expect(await provider.getBalance(user2.address)).to.be.below(initialUser2Balance.add(utils.parseEther('7.55')));
    expect(await provider.getBalance(user3.address)).to.be.below(initialUser3Balance.add(utils.parseEther('1.05')));
  });

  it("Can mint the whole collection and id's are correct", async function () {
     console.log("Be patient on this one...");
     const ownerAddress = await owner.getAddress();
     await lnftContract.startMint();
    
     // Mint id 50-7777
     for (let i=0; i < 7727; i++) {
       console.log(i);
       let tx = await lnftContract.mint(1, { value: utils.parseEther('0.07') });
       await tx.wait();
     }
     expect(await lnftContract.ownerOf(0)).to.equal(constants.AddressZero);
     expect(await lnftContract.ownerOf(7778)).to.equal(constants.AddressZero);
     expect(await lnftContract.ownerOf(1)).to.equal(ownerAddress);
     expect(await lnftContract.ownerOf(7777)).to.equal(ownerAddress);

     // Can't mint anymore now that they are all gone
     await expect(lnftContract.mint(1, { value: utils.parseEther('0.05') })).to.be.revertedWith("NoTokensLeft");
  });
})
