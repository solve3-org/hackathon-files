//SPDX-License-Identifier: MIT

pragma solidity 0.8.7;
import "./ISolve3Verifier.sol";

abstract contract Solve3Verify {
    ISolve3Verifier public immutable verifier;
    bool public solve3Disabled = false;
    uint256 public validFromTimestamp;
    uint256 public validPeriodSeconds = 300;

    constructor(address _verifier) {
        verifier = ISolve3Verifier(_verifier);
        validFromTimestamp = block.timestamp;
    }

    modifier verify(ISolve3Verifier.Message memory _msg) {
        if (!solve3Disabled) {
            require(
                _msg.account == msg.sender,
                "Solve3Verify: Sender and solver do not match"
            );
            require(
                _msg.timestamp >= validFrom(),
                "Solve3Verify: Message was signed too early"
            );
            require(
                _msg.timestamp + validPeriod() >= block.timestamp,
                "Solve3Verify: Signature is no longer valid"
            );
            require(
                verifier.verifyMessage(_msg),
                "Solve3Verify: Unable to verify message"
            );
        }
        _;
    }

    modifier solve3IsDisabled() {
        require(solve3Disabled, "Solution3Verify: Verification is not disabled");
        _;
    }

    modifier solve3IsNotDisabled() {
        require(!solve3Disabled, "Solution3Verify: Verification is disabled");
        _;
    }

    function validFrom() public view virtual returns(uint256) {
        return validFromTimestamp;
    }

    function validPeriod() public view virtual returns(uint256) {
        return validPeriodSeconds;
    }

    function disableSolve3(bool _paused) external virtual;

    function _disableSolve3(bool _paused) internal {
        solve3Disabled = _paused;
        emit Paused(_paused);
    }

    function _setValidFromTimestamp(uint256 _validFromTimestamp) internal {
        validFromTimestamp = _validFromTimestamp;
    }

    function setValidPeriodSeconds(uint256 _validPeriodSeconds) external virtual;

    function _setValidPeriodSeconds(uint256 _validPeriodSeconds) internal {
        validPeriodSeconds = _validPeriodSeconds;
    }

    event Paused(bool _paused);
}
