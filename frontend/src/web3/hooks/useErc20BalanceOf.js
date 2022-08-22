import { useEffect, useState } from "react";
import { useCallContract } from ".";
import { fromWeiToFixed, isAddress } from "../utils/func";
import useTriggerEvent from './internal/useTriggerEvent'
import Erc20Abi from '../utils/Erc20Abi.json'
import useEmptyWeb3 from "./internal/useEmptyWeb3";

const useErc20BalanceOf = (token, user, n) => {
  const call = useCallContract();
  const [balance, setBalance] = useState('');
  const { event, trigger} = useTriggerEvent();
  const web3 = useEmptyWeb3();

  const checkAddress = (address) => {
    return isAddress(address);
  }

  const func = async () => {
    if (!token || !user || !checkAddress(token) || !checkAddress(user)) {
      setBalance('0.00');
    } else {
      let result = await call({
        address: token,
        abi: Erc20Abi,
        method: 'balanceOf',
        args: [user]
      })
      setBalance(fromWeiToFixed(web3.eth.abi.decodeParameter("uint256", result.toString()), n ? n : 3));

    }

  }
  useEffect(() => {
    func();
  });

  return (
    balance
  );
}

export default useErc20BalanceOf;