const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();

  const proxyAdmin = "0x1b52754922F527d6Ae1eE0b6Cd27beba6B5e986A"
  const signerWallet = "0x0b18447915D06d267A1bf9bDeC6Efe080a89f157"

  const nonceVerifier = {
    nonce: 11000
  };

  const nonceProxy = {
    nonce: 12000
  };
  

  console.log("Deploying contracts with address:", deployerAddress);
  console.log("Account balance:", (await deployer.getBalance()).toString());


  const verifierFactory = await ethers.getContractFactory("Solve3Verifier");
  let verifier = await verifierFactory.deploy(nonceVerifier);

  await verifier.deployed();
  console.log("Verifier deployed at", verifier.address);

  const proxyFactory = await ethers.getContractFactory("Solve3Proxy");
  const proxy = await proxyFactory.deploy(verifier.address, proxyAdmin, "0x");

  await proxy.deployed();
  console.log("Proxy deployed at", proxy.address);

  verifier = verifierFactory.attach(proxy.address);
  console.log("Verifier attached to proxy at ", verifier.address);

  await verifier.initialize(signerWallet);
  console.log("Verifier initialized");
  console.log("Signer registered successfully?");
  console.log(await verifier.isSigner(signerWallet));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });