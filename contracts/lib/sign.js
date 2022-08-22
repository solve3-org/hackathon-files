const { ethers, Wallet } = require("ethers");

// add leading zeros to a string
// size: length of the string after adding zeros
String.prototype.pad = function (size) {
  var s = String(this);
  while (s.length < (size || 2)) { s = "0" + s; }
  return s;
}


// encode the solve3 sign values
// {version, account, contract, timestamp}
const abiEncodeS3Values = async (obj) => {
  const versionHash = ethers.utils.id(obj.version);

  let result = (new ethers.utils.AbiCoder).encode(
    ['bytes32', 'address', 'address', 'uint256', 'uint256', 'bytes'],
    [versionHash, obj.account, obj.contract, obj.timestamp, obj.nonce, obj.data]);

  return result.toLowerCase();
}

const keccak256 = async (string) => {
  const hash = ethers.utils.keccak256(string);
  return hash;
}

const signMsg = async (signer, msg) => {
//const signature = await signer.signMessage(msg); // wrong
  const signature = await signer.signMessage(ethers.utils.arrayify(msg));
  return signature;
}

const createSigStruct = async (signer, msg, account, timestamp, nonce, data) => {
  const signedMsg = await signMsg(signer, msg);
  let sig = ethers.utils.splitSignature(signedMsg);
  let result = {
    account: account,
    timestamp: timestamp,
    nonce: nonce,
    data: data,
    v: sig.v,
    r: sig.r,
    s: sig.s,
  }
  return result;
}


module.exports = {
  abiEncodeS3Values,
  keccak256,
  signMsg,
  createSigStruct,
}