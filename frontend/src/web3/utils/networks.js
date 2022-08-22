import chains from './chains.json'

export const getChainName = (chainId) => {
  let network;
  if(chainId == 137) return "polygon"
  if(chainId == 80001) return "mumbai" 
  for(let i = 0; i < chains.length; i++) {
    if(chains[i]["networkId"] == chainId) network = chains[i]["network"]
  }
  return network;
}