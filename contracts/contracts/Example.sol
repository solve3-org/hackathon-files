//SPDX-License-Identifier: MIT

pragma solidity 0.8.7;

import "./Solve3Verify.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Example is Ownable, Solve3Verify {
    uint256 public number;

    constructor(address _verifier) Solve3Verify(_verifier) {}

    function _setNumber(uint256 _number) internal {
        number = _number;
    }

    function setNumber(ISolve3Verifier.Message memory _msg, uint256 _number)
        public
        verify(_msg)
    {
        _setNumber(_number);
    }

    function setNumber2(uint256 _number) public solve3IsDisabled {
        _setNumber(_number);
    }

    function disableSolve3(bool _flag) external override onlyOwner {
        _disableSolve3(_flag);
    }

    function set(uint256 _validFromTimestamp, uint256 _validPeriodSeconds)
        external onlyOwner
    {
        _setValidFromTimestamp(_validFromTimestamp);
        _setValidPeriodSeconds(_validPeriodSeconds);
    }

    function setValidPeriodSeconds(uint256 _validPeriodSeconds) external override onlyOwner {
        validPeriodSeconds = _validPeriodSeconds;
    }
}

contract Example2 is Example {
    bool public toggle;

    constructor(address _verifier) Example(_verifier) {}

    function validFrom() public view override returns(uint256) {
        if(toggle) {
            return block.timestamp - 100;
        } else {
            return block.timestamp + 100;
        }
    }

    function validPeriod() public pure override returns(uint256) {
        return 100;
    }

    function toggleIt() public onlyOwner {
        toggle = !toggle;
    }
}
