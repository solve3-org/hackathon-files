// web3
require('dotenv').config()
var { ethers, Wallet } = require("ethers");
var verifierAbi = require('../data/Verifier.abi.json');
const { error } = require('./helper');

const rpcMap = new Map();
rpcMap.set("rinkeby", process.env.RINKEBY_RPC);
rpcMap.set("mumbai", process.env.MUMBAI_RPC);

const contractMap = new Map();
contractMap.set("rinkeby", process.env.RINKEBY_CONTRACT);
contractMap.set("mumbai", process.env.MUMBAI_CONTRACT);

String.prototype.pad = function (size) {
  var s = String(this);
  while (s.length < (size || 2)) { s = "0" + s; }
  return s;
}

const signMsg = async (network, msg) => {
  try {
    const { signer } = ethInstance(network);
    if (!signer) return { "error": "Internal: invalid eth instance" };
    const signature = await signer.signMessage(msg);
    return signature;
  } catch (error) {
    return { "error": error };
  }
}

const ethInstance = (network) => {
  try {
    const provider = new ethers.providers.JsonRpcProvider(rpcMap.get(network));
    const signer = new Wallet(process.env.PRIVATE_KEY).connect(provider);
    const contract = new ethers.Contract(contractMap.get(network), verifierAbi, signer);

    return {
      provider: provider,
      signer: signer,
      contract: contract,
    }
  } catch (error) {
    return {
      provider: 'undefined',
      signer: 'undefined',
      contract: 'undefined',
    }
  }
}

const id = (text) => {
  return ethers.utils.id(text)
}

const verifySigner = (data) => {
  if (!data.msg) return error("msg is required");
  if (!data.sig) return error("sig is required");
  if (!data.network) return error("network is required");

  const { signer } = ethInstance(data.network);
  const splitSig = ethers.utils.splitSignature(data.sig);
  const signingAddress = ethers.utils.verifyMessage(data.msg, splitSig);

  console.log(signer.address)

  return { "result": signingAddress === signer.address };
}

const verifyWeb3Signer = (data) => {
  if (!data.msg) return error("msg is required");
  if (!data.sig) return error("sig is required");
  if (!data.account) return error("account is required");

  let splitSignedMsg = ethers.utils.splitSignature(data.sig)
  let msgSigner = ethers.utils.recoverAddress(
    ethers.utils.id(
      data.msg
    ),
    splitSignedMsg
  )

  return { "result": msgSigner === data.account };
}

const createMessage = async (data) => {
  const eth = ethInstance(data.network);

  let timestamp, nonce;

  let tsNonce = await eth.contract.getTimestampAndNonce(data.account);
  timestamp = tsNonce[0];
  nonce = tsNonce[1];

  const hash = await encodeAndHash({
    version: 'SOLVE3.V0',
    account: data.account,
    contract: data.destination,
    timestamp: timestamp,
    nonce: nonce,
    data: data.data,
  })

  const signedMsg = await signMsg(data.network, ethers.utils.arrayify(hash));
  let sig = ethers.utils.splitSignature(signedMsg);
  let result = {
    verified: true,
    message: {
      account: data.account,
      timestamp: timestamp.toString(),
      nonce: nonce.toString(),
      data: data.data,
      v: sig.v,
      r: sig.r,
      s: sig.s,
    }
  }

  return result;
}

const encodeAndHash = async (obj) => {
  const versionHash = id(obj.version);

  let result = (new ethers.utils.AbiCoder).encode(
    ['bytes32', 'address', 'address', 'uint256', 'uint256', 'bytes'],
    [versionHash, obj.account, obj.contract, obj.timestamp, obj.nonce, obj.data]);

  const hash = ethers.utils.keccak256(result.toLowerCase())

  return hash;
}

module.exports = {
  signMsg,
  ethInstance,
  id,
  verifySigner,
  verifyWeb3Signer,
  createMessage,
}