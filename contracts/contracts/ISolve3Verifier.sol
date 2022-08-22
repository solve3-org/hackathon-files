//SPDX-License-Identifier: MIT

pragma solidity 0.8.7;

interface ISolve3Verifier {

    struct Message {
        address account;
        uint256 timestamp;
        uint256 nonce;
        bytes data;
        uint8 v;
        bytes32 r;
        bytes32 s;
    }
    
    function initialize(address _signer, address _token) external;

    function verifyMessage(Message memory _msg) external returns (bool);

    function recoverSigner(
        address _contract,
        Message memory _msg
    ) external pure returns (address);

    function getTimestamp() external view returns (uint256);

    function getTimestampAndNonce(address _account)
        external
        view
        returns (uint256, uint256);

    function getNonce(address _account) external view returns (uint256);

    function isSigner(address _account) external view returns (bool);

    function setSigner(address _account, bool _flag) external;
}
