//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@solve3/contracts/Solve3Verify.sol";

contract Solve3NFT is
    ERC721Enumerable,
    Ownable,
    Solve3Verify
{
    using Strings for uint256;

    string public baseURI;
    string public baseExtension = ".json";
    uint256 public maxMintAmount = 2; // max allowed to mint at one time N.O.T.E must be => than line 1241 - mint(msg.sender, 10);
    bool public paused = false;
    bool public revealed = false;
    string public notRevealedUri;
    uint256 public lastToken = 0;

    constructor(
        string memory _name, // String are annoying and we will need an ABI code to verify contract because of this
        string memory _symbol, // you'll change these 3 strings next to your deployment button
        address _verifier
    ) ERC721(_name, _symbol) Solve3Verify(_verifier) {}

    function disableSolve3(bool _flag) external override onlyOwner {
        _disableSolve3(_flag);
    }

    function setValidPeriodSeconds(uint256 _validPeriodSeconds)
        external
        override
        onlyOwner
    {
        validPeriodSeconds = _validPeriodSeconds;
    }

    // internal
    function _baseURI() internal view virtual override returns (string memory) {
        return baseURI;
    }

    // public
    function mint(ISolve3Verifier.Message memory _msg, address _to) public verify(_msg) {
        require(!paused, "Minting is paused");
        require(balanceOf(_to) < maxMintAmount, "User already minted 2");
        lastToken++;
        _mint(_to, lastToken);
    }

    function mint(address _to) public solve3IsDisabled {
      require(!paused, "Minting is paused");
      require(balanceOf(_to) < maxMintAmount, "User already minted 2");
      lastToken++;
        _mint(_to, lastToken);
    }

    function tokenOfOwner(address _owner)
        public
        view
        returns (uint256[] memory)
    {
        uint256 ownerTokenCount = balanceOf(_owner);
        uint256[] memory tokenIds = new uint256[](ownerTokenCount);
        for (uint256 i; i < ownerTokenCount; i++) {
            tokenIds[i] = tokenOfOwnerByIndex(_owner, i);
        }
        return tokenIds;
    }

    function tokenURI(uint256 tokenId)
        public
        view
        virtual
        override
        returns (string memory)
    {
        require(
            _exists(tokenId),
            "ERC721Metadata: URI query for nonexistent token"
        );

        if (revealed == false) {
            return notRevealedUri;
        }

        string memory currentBaseURI = _baseURI();
        return
            bytes(currentBaseURI).length > 0
                ? string(
                    abi.encodePacked(
                        currentBaseURI,
                        tokenId.toString(),
                        baseExtension
                    )
                )
                : "";
    }

    //only owner
    function reveal() public onlyOwner {
        revealed = true;
    }

    function setNotRevealedURI(string memory _notRevealedURI) public onlyOwner {
        notRevealedUri = _notRevealedURI;
    }

    function setmaxMintAmount(uint256 _newmaxMintAmount) public onlyOwner {
        maxMintAmount = _newmaxMintAmount;
    }

    function setBaseURI(string memory _newBaseURI) public onlyOwner {
        baseURI = _newBaseURI;
    }

    function setBaseExtension(string memory _newBaseExtension)
        public
        onlyOwner
    {
        baseExtension = _newBaseExtension;
    }

    function pause(bool _state) public onlyOwner {
        paused = _state;
    }

    function withdraw() public payable onlyOwner {
        require(payable(msg.sender).send(address(this).balance));
    }
}
