import Web3 from "web3";

export const toFixed2 = (value) => {
  return Number.parseFloat(Web3.utils.fromWei(value, 'ether')).toFixed(2);
}

export const toFixed5 = (value) => {
  return Number.parseFloat(Web3.utils.fromWei(value, 'ether')).toFixed(5);
}

export const toFixed8 = (value) => {
  return Number.parseFloat(Web3.utils.fromWei(value, 'ether')).toFixed(8);
}

export const toWei = (value) => {
  if(!value) return '0'
  return Web3.utils.toWei(value, 'ether');
}

export const fromWeiToFixed = (value, n) => {
  if(!value) return '0'
  return Number.parseFloat(Web3.utils.fromWei(value, 'ether')).toFixed(n);
}

export const isAddress = (value) => {
  return Web3.utils.isAddress(value);
}

export const isWalletConnect = (w3) => {
  return (w3.eth.accounts._provider.bridge ? true : false)
}

export const wait = (s) => { 
  return new Promise(res => setTimeout(res, s*1000));
}

export const makeHash = (value) => {
  return Web3.utils.soliditySha3(value.toString());
}

export const decodeBool = (value) => {
  if(value == "0x0000000000000000000000000000000000000000000000000000000000000001" 
    || value == "true" 
    || value == true
    || value == "1") return true;
  return false
}