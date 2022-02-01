import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";
import fs from "fs";

let whitelistData = fs.readFileSync("./data/whitelist.json")
let whitelistArray = JSON.parse(whitelistData);

const leaves = whitelistArray.map((v) => keccak256(v));

const tree = new MerkleTree(leaves, keccak256, { sort: true });
const root = tree.getHexRoot();
console.log(root)