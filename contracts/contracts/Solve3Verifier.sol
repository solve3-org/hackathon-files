//SPDX-License-Identifier: MIT

pragma solidity 0.8.7;

import "./ISolve3Verifier.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract Solve3Verifier is ISolve3Verifier, Initializable, OwnableUpgradeable {
    mapping(address => uint256) public nonces;
    mapping(address => bool) public signer;
    mapping(address => bool) public tester;

    function initialize(address _signer) public override initializer {
        __Ownable_init();
        _setSigner(_signer, true);
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
        if (nonces[_msg.account] != _msg.nonce || _msg.timestamp > block.timestamp) {
            return false;
        }
        nonces[_msg.account]++;
        return signer[signerAddress];
    }

    function recoverSigner(
        address _contract,
        Message memory _msg
    ) public pure override returns (address) {
        bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        bytes32 prefixedHashMessage = keccak256(
            abi.encodePacked(
                prefix,
                createMessage(_msg.account, _contract, _msg.timestamp, _msg.nonce)
            )
        );
        return ecrecover(prefixedHashMessage, _msg.v, _msg.r, _msg.s);
    }

    function createMessage(
        address _account,
        address _contract,
        uint256 _timestamp,
        uint256 _nonce
    ) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    keccak256("SOLVE3.V0"),
                    _account,
                    _contract,
                    _timestamp,
                    _nonce
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

    event TesterChanged(address _account, bool _flag);
    event SignerChanged(address indexed signer, bool flag);
}
