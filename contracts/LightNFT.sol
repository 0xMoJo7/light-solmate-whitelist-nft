//SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;


import "./LilOwnable.sol";
import "./Strings.sol";
import "@rari-capital/solmate/src/tokens/ERC721.sol";
import "@rari-capital/solmate/src/utils/SafeTransferLib.sol";
import "@rari-capital/solmate/src/utils/FixedPointMathLib.sol";

error DoesNotExist();
error NoTokensLeft();
error NotEnoughETH();
error TooManyMintAtOnce();
error NotOnWhitelist();
error WhitelistMintNotStarted();
error MintNotStarted();
error EmptyBalance();
error NoReserveTokensLeft();

contract LightNFT is LilOwnable, ERC721 {
    using Strings for uint256;

    uint256 public constant TOTAL_SUPPLY = 7777;
    uint256 public constant PRICE_PER_WHITELIST_MINT = 0.05 ether;
    uint256 public constant PRICE_PER_PUBLIC_MINT = 0.07 ether;
    uint256 public maxWhitelistMintAmount = 10;
    uint256 public maxPublicMintAmount = 20;

    bool public whitelistMintStarted = false;
    bool public mintStarted = false;
    bool public revealed = false;

    uint256 public totalSupply;

    bytes32 private _merkleRoot;

    string public baseURI;
    string public nonRevealedURI;
    string public baseExtension = ".json";

    address[4] private _royaltyAddresses;

    mapping(address => uint256) private _royaltyShares;

    constructor(
        string memory _nonRevealedURI,
        bytes32 _initMerkleRoot,
        address[4] memory _contributorAddresses
    ) payable ERC721("Poker Dogs Club", "PDGC") {
        nonRevealedURI = _nonRevealedURI;
        _merkleRoot = _initMerkleRoot;

        _royaltyAddresses[0] = _contributorAddresses[0];
        _royaltyAddresses[1] = _contributorAddresses[1];
        _royaltyAddresses[2] = _contributorAddresses[2];
        _royaltyAddresses[3] = _contributorAddresses[3];

        _royaltyShares[_royaltyAddresses[0]] = 515;
        _royaltyShares[_royaltyAddresses[1]] = 400;
        _royaltyShares[_royaltyAddresses[2]] = 75;
        _royaltyShares[_royaltyAddresses[3]] = 10;
        for (uint256 i=0; i < 50; i++) {
            _mint(msg.sender, totalSupply + 1);
            totalSupply++;
        }
    }
    
    modifier onlyOwner() {
        require(msg.sender == _owner, "Ownable: caller is not the owner");
        _;
    }

    function _leaf(address account) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(account));
    }

    function verifyWhitelist(bytes32 leaf, bytes32[] memory proof)
        private
        view
        returns (bool)
    {
        bytes32 computedHash = leaf;

        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 proofElement = proof[i];

            if (computedHash < proofElement) {
                computedHash = keccak256(
                    abi.encodePacked(computedHash, proofElement)
                );
            } else {
                computedHash = keccak256(
                    abi.encodePacked(proofElement, computedHash)
                );
            }
        }

        return computedHash == _merkleRoot;
    }

    function mint(uint16 amount) external payable {
        if (totalSupply + amount > TOTAL_SUPPLY) revert NoTokensLeft();
        if (!mintStarted) revert MintNotStarted();
        if (msg.value < amount * PRICE_PER_PUBLIC_MINT) revert NotEnoughETH();
        if (amount > maxPublicMintAmount) revert TooManyMintAtOnce();

        unchecked {
            for (uint16 index = 0; index < amount; index++) {
                _mint(msg.sender, totalSupply + 1);
                totalSupply++;
            }
        }
    }

    function whitelistMint(uint16 amount, bytes32[] memory _proof) external payable {
        if (totalSupply + amount > TOTAL_SUPPLY) revert NoTokensLeft();
        if (!whitelistMintStarted) revert WhitelistMintNotStarted();
        if (msg.value < amount * PRICE_PER_WHITELIST_MINT) revert NotEnoughETH();
        if (amount > maxWhitelistMintAmount) revert TooManyMintAtOnce();
        if (verifyWhitelist(_leaf(msg.sender), _proof) == false) revert NotOnWhitelist();
        
        unchecked {
            for (uint16 index = 0; index < amount; index++) {
                _mint(msg.sender, totalSupply + 1);
                totalSupply++;
            }
        }
    }

    function tokenURI(uint256 id) public view virtual override returns (string memory) {
        if (ownerOf[id] == address(0)) revert DoesNotExist();

        if (revealed == false) {
            return nonRevealedURI;
        }
        return string(abi.encodePacked(baseURI, id.toString(), baseExtension));
    }

    function setBaseURI(string memory _newBaseURI) public onlyOwner {
        baseURI = _newBaseURI;
    }

    function startWhitelistMint() public onlyOwner {
        whitelistMintStarted = true;
    }
    
    function startMint() public onlyOwner {
        mintStarted = true;
    }

    function pauseMint() public onlyOwner {
        whitelistMintStarted = false;
        mintStarted = false;
    }

    function reveal(string memory _baseUri) public onlyOwner {
        setBaseURI(_baseUri);
        revealed = true;
    }

    function setMerkleRoot(bytes32 _merkleRootValue) external onlyOwner returns (bytes32) {
        _merkleRoot = _merkleRootValue;
        return _merkleRoot;
    }

    function withdraw() external onlyOwner {
        if (address(this).balance == 0) revert EmptyBalance();
        uint256 balance = address(this).balance;

        for (uint256 i = 0; i < _royaltyAddresses.length; i++) {
            payable(_royaltyAddresses[i]).transfer(
                balance / 1000 * _royaltyShares[_royaltyAddresses[i]]
            );
        }
    }

    function supportsInterface(bytes4 interfaceId)
        public
        pure
        override(LilOwnable, ERC721)
        returns (bool)
    {
        return
            interfaceId == 0x7f5828d0 || // ERC165 Interface ID for ERC173
            interfaceId == 0x80ac58cd || // ERC165 Interface ID for ERC721
            interfaceId == 0x5b5e139f || // ERC165 Interface ID for ERC165
            interfaceId == 0x01ffc9a7; // ERC165 Interface ID for ERC721Metadata
    }
}
