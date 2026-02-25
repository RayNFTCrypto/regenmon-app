// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RegenmonNFT is ERC721, ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;

    mapping(string => uint256) public regenmonToToken;
    mapping(uint256 => string) public tokenToRegenmon;

    constructor() ERC721("RegenmonNFT", "RMON") Ownable(msg.sender) {}

    /// @notice Mint a creature NFT. Callable by anyone for their own creature.
    function mintCreature(
        address to,
        string calldata regenmonId,
        string calldata tokenURI_
    ) external returns (uint256) {
        require(regenmonToToken[regenmonId] == 0, "Already minted");
        uint256 tokenId = ++_nextTokenId;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI_);
        regenmonToToken[regenmonId] = tokenId;
        tokenToRegenmon[tokenId] = regenmonId;
        return tokenId;
    }

    // Required overrides
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
