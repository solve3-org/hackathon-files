//SPDX-License-Identifier: MIT

pragma solidity 0.8.7;

import "./ISolve3Verifier.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

contract Solve3Verifier is ISolve3Verifier, Initializable, OwnableUpgradeable {

    using SafeERC20 for IERC20;
    using EnumerableSet for EnumerableSet.Bytes32Set;

    IERC20 public token;

    struct Ad {
        bytes32 id;
        address creator;
        string ipfs;
        uint256 totalSolves;
        uint256 amountPerSolve;
    }

    mapping(address => uint256) public nonces;
    mapping(address => bool) public signer;
    mapping(address => bool) public tester;
    mapping(bytes32 => Ad) public ads;    
    uint256 public noAdAmount;

    EnumerableSet.Bytes32Set private adSet;

    function initialize(address _signer, address _token) public override initializer {
        __Ownable_init();
        _setSigner(_signer, true);
        token = IERC20(_token);
        noAdAmount = 1e17;
    }

    function addAd(address _creator, string memory _ipfs, uint256 _totalSolves, uint256 _amountPerSolve) external onlyOwner {
        require(_totalSolves > 0, "Total solves must be greater than 0");
        require(_amountPerSolve > 0, "Amount per solve must be greater than 0");

        bytes32 identifier = keccak256(abi.encodePacked(_ipfs));

        require(ads[identifier].creator == address(0) || ads[identifier].creator == _creator, "Ad already exists or wrong creator");
  
        token.safeTransferFrom(msg.sender, address(this), _amountPerSolve*_totalSolves);

        Ad storage ad = ads[identifier];

        ad.id = identifier;
        ad.creator = _creator;
        ad.ipfs = _ipfs;
        ad.totalSolves += _totalSolves;
        ad.amountPerSolve += _amountPerSolve;

        adSet.add(identifier);

        emit AdAdded(identifier, _creator, _ipfs, _totalSolves, _amountPerSolve);
    }

    function removeAd(bytes32 _id) external onlyOwner {
        require(adSet.contains(_id), "Ad does not exist");

        Ad storage ad = ads[_id];
        token.safeTransfer(msg.sender, ad.totalSolves*ad.amountPerSolve);

        delete ads[_id];
        adSet.remove(_id);

        emit AdRemoved(_id);        
    }

    function verifyMessage(Message memory _msg) public override returns (bool) {
        require(
            tester[msg.sender],
            "Solve3Verifier: Only tester can call this function"
        );
        address signerAddress = recoverSigner(
            msg.sender,
            _msg
        );
        
        if (nonces[_msg.account] != _msg.nonce || _msg.timestamp > block.timestamp || !signer[signerAddress]) {
            return false;
        }
        nonces[_msg.account]++;

        _transferToken(_msg.account, _msg.data);

        return true;
    }

    function _transferToken(address _account, bytes memory _data) internal {
        Ad storage ad = ads[bytes32(_data)];
        uint256 transferAmount = 0;

        if(ad.totalSolves > 0) {
            transferAmount = ad.amountPerSolve;
            ad.totalSolves -= 1;
            if(ad.totalSolves == 0) {
                delete ads[bytes32(_data)];
                adSet.remove(bytes32(_data));
            }
        } else {
            transferAmount = noAdAmount;
        }
        if(token.balanceOf(address(this)) >= transferAmount) {
           token.safeTransfer(_account, transferAmount); 
        }
            
    }

    function getTokenAmount(bytes32 _id) public view returns (uint256) {
        Ad storage ad = ads[_id];
        if(ad.totalSolves > 0) {
            return ad.amountPerSolve;
        } else {
            return noAdAmount;
        }
    }

    function recoverSigner(
        address _contract,
        Message memory _msg
    ) public pure override returns (address) {
        bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        bytes32 prefixedHashMessage = keccak256(
            abi.encodePacked(
                prefix,
                createMessage(_msg.account, _contract, _msg.timestamp, _msg.nonce, _msg.data)
            )
        );
        return ecrecover(prefixedHashMessage, _msg.v, _msg.r, _msg.s);
    }

    function createMessage(
        address _account,
        address _contract,
        uint256 _timestamp,
        uint256 _nonce,
        bytes memory _data
    ) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    keccak256("SOLVE3.V0"),
                    _account,
                    _contract,
                    _timestamp,
                    _nonce,
                    _data
                )
            );
    }

    function getTimestamp() external view override returns (uint256) {
        return block.timestamp;
    }

    function getTimestampAndNonce(address _account)
        external
        view
        override
        returns (uint256, uint256)
    {
        return (block.timestamp, nonces[_account]);
    }

    function getNonce(address _account)
        external
        view
        override
        returns (uint256)
    {
        return nonces[_account];
    }

    function getId(string memory _ipfs) external pure returns(bytes32) {
        return keccak256(abi.encodePacked(_ipfs));
    }

    function getAd(bytes32 _id) external view returns (Ad memory) {
        return ads[_id];
    }

    function getAdSet() external view returns (bytes32[] memory) {
        return adSet._inner._values;
    }

    function isSigner(address _account) external view override returns (bool) {
        return signer[_account];
    }

    function setSigner(address _account, bool _flag)
        external
        override
        onlyOwner
    {
        _setSigner(_account, _flag);
    }

    function _setSigner(address _account, bool _flag) internal {
        signer[_account] = _flag;
        emit SignerChanged(_account, _flag);
    }

    function isTester(address _account) external view returns (bool) {
        return tester[_account];
    }

    function setTester(address _account, bool _flag)
        external
        onlyOwner
    {
        _setTester(_account, _flag);
    }

    function setMultipleTester(address[] memory _account, bool _flag)
        external
        onlyOwner
    {
        for(uint256 i = 0; i < _account.length; i++) {
            _setTester(_account[i], _flag);
        }
    }

    function _setTester(address _account, bool _flag) internal {
        tester[_account] = _flag;
        emit TesterChanged(_account, _flag);
    }

    function setNoAdAmount(uint256 _amount)
        external
        onlyOwner
    {
        noAdAmount = _amount;
        emit NoAdAmountChanged(_amount);
    }

    event TesterChanged(address _account, bool _flag);
    event SignerChanged(address indexed signer, bool flag);
    event AdAdded(bytes32 id, address creator, string ipfs, uint256 totalSolves, uint256 amountPerSolve);
    event AdRemoved(bytes32 id);
    event NoAdAmountChanged(uint256 amount);
}
