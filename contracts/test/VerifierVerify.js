const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { abiEncodeS3Values, keccak256, signMsg, createSigStruct } = require("../lib/sign");

describe("Solve3", function () {
  async function deployVerifierFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner, account1, account2, account3] = await ethers.getSigners();

    const tokenFactory = await ethers.getContractFactory("Token");
    const token = await tokenFactory.deploy("Solve3","SLV");

    const verifierFactory = await ethers.getContractFactory("Solve3Verifier");
    const verifier = await verifierFactory.deploy();
    await verifier.initialize(account1.address, token.address);

    await token.transfer(verifier.address, ethers.utils.parseEther("1000000"));

    const example1Factory = await ethers.getContractFactory("Example");
    const example1 = await example1Factory.deploy(verifier.address);

    const example2Factory = await ethers.getContractFactory("Example2");
    const example2 = await example2Factory.deploy(verifier.address);

    return { verifier, example1, example2, owner, account1, account2, account3, token };
  }

  let verifier, example1, example2, owner, account1, account2, account3, token;

  beforeEach(async function () {
    ({ verifier, example1, example2, owner, account1, account2, account3, token } = await loadFixture(
      deployVerifierFixture
    ));
  });

  describe("Verifier", function () {

    it("should have the right owner", async () => {
      expect(await verifier.owner()).to.equal(owner.address);
    })

    it("should fail when try to initialize a second time", async () => {
      await expect(verifier.initialize(account1.address, token.address)).to.be.revertedWith("Initializable: contract is already initialized");
    })

    it("should return the right nonce", async function () {
      const timestampAndNonce = await verifier.getTimestampAndNonce(account2.address);
      expect(timestampAndNonce[1]).to.equal(0);
    })

    it("should return true for signer", async function () {
      const isSigner = await verifier.isSigner(account1.address);
      expect(isSigner).to.equal(true);
    })

    it("should return false for non-signer", async function () {
      const isSigner = await verifier.isSigner(account2.address);
      expect(isSigner).to.equal(false);
    })

    it("should revert if sender is not a tester", async () => {
      let timestamp, nonce;
      let tsNonce = await verifier.getTimestampAndNonce(account2.address);

      timestamp = tsNonce[0];
      nonce = tsNonce[1];

      const encoded = await abiEncodeS3Values({ version: "SOLVE3.V0", account: account2.address, contract: owner.address, timestamp, nonce, data: "0x" });
      const msg = await keccak256(encoded);

      const signature = await signMsg(account1, msg);
      const sig = ethers.utils.splitSignature(signature);
      await expect(verifier.verifyMessage({ account: account2.address, timestamp: timestamp, nonce: nonce, data: "0x", v: sig.v, r: sig.r, s: sig.s })).to.be.revertedWith("Solve3Verifier: Only tester can call this function");
    })

    it("should verify the message correct", async () => {
      let timestamp, nonce;
      let tsNonce = await verifier.getTimestampAndNonce(account2.address);

      timestamp = tsNonce[0];
      nonce = tsNonce[1];

      const data = await verifier.getId("0x");

      const encoded = await abiEncodeS3Values({ version: "SOLVE3.V0", account: account2.address, contract: owner.address, timestamp, nonce, data });
      const msg = await keccak256(encoded);

      const signature = await signMsg(account1, msg);
      const sig = ethers.utils.splitSignature(signature);
      await verifier.setTester(owner.address, true);
      const isVerified = await verifier.callStatic.verifyMessage({ account: account2.address, timestamp: timestamp, nonce: nonce, data, v: sig.v, r: sig.r, s: sig.s });

      expect(isVerified).to.equal(true);
    })

    it("should verify the message incorrect with wrong value", async () => {
      let timestamp, nonce;
      let tsNonce = await verifier.getTimestampAndNonce(account2.address);

      timestamp = tsNonce[0];
      nonce = tsNonce[1];

      const data = await verifier.getId("0x");

      const encoded = await abiEncodeS3Values({ version: "SOLVE3.V0", account: account2.address, contract: owner.address, timestamp, nonce, data });
      const msg = await keccak256(encoded);

      const signature = await signMsg(account1, msg);
      const sig = ethers.utils.splitSignature(signature);
      await verifier.setTester(owner.address, true);
      //wrong account
      let isVerified = await verifier.callStatic.verifyMessage({ account: account3.address, timestamp: timestamp, nonce: nonce, data, v: sig.v, r: sig.r, s: sig.s });
      expect(isVerified).to.equal(false);
      //wrong timestamp
      isVerified = await verifier.callStatic.verifyMessage({ account: account2.address, timestamp: 1111111, nonce: nonce, data, v: sig.v, r: sig.r, s: sig.s });
      expect(isVerified).to.equal(false);
      //wrong nonce
      isVerified = await verifier.callStatic.verifyMessage({ account: account2.address, timestamp: timestamp, nonce: 3, data, v: sig.v, r: sig.r, s: sig.s });
      expect(isVerified).to.equal(false);
    })

    it("should increment nonce", async () => {
      let timestamp, nonce;
      let tsNonce = await verifier.getTimestampAndNonce(account2.address);

      timestamp = tsNonce[0];
      nonce = tsNonce[1];

      expect(nonce).to.equal(0);

      const data = await verifier.getId("0x");

      const encoded = await abiEncodeS3Values({ version: "SOLVE3.V0", account: account2.address, contract: owner.address, timestamp, nonce, data });
      const msg = await keccak256(encoded);

      const signature = await signMsg(account1, msg);
      const sig = ethers.utils.splitSignature(signature);
      await verifier.setTester(owner.address, true);
      await verifier.verifyMessage({ account: account2.address, timestamp: timestamp, nonce: nonce, data, v: sig.v, r: sig.r, s: sig.s });

      tsNonce = await verifier.getTimestampAndNonce(account2.address);
      nonce = tsNonce[1];

      expect(nonce).to.equal(1);
    })

  })

  describe("Verify - Example", function () {

    it("should have the correct owner", async () => {
      expect(await example1.owner()).to.equal(owner.address);
    })

    it("should have number == 0", async () => {
      expect(await example1.number()).to.equal(0);
    })

    it("should fail when try to set number when solve3 is enabled", async () => {
      await expect(example1.setNumber2(1)).to.be.revertedWith("Solution3Verify: Verification is not disabled")
    })

    it("should success when try to set number when solve3 is disabled", async () => {
      await example1.disableSolve3(true);
      await example1.setNumber2(1);
      expect(await example1.number()).to.eq(1)
    })

    it("should be able to set number with signed message", async () => {
      // < backend stuff
      let timestamp, nonce;
      let tsNonce = await verifier.getTimestampAndNonce(account2.address);
      timestamp = tsNonce[0];
      nonce = tsNonce[1];

      const data = await verifier.getId("0x");

      const encoded = await abiEncodeS3Values({ version: "SOLVE3.V0", account: account2.address, contract: example1.address, timestamp, nonce, data });
      const msg = await keccak256(encoded);
      const signature = await signMsg(account1, msg);
      const sig = ethers.utils.splitSignature(signature);
      await verifier.setTester(example1.address, true);
      // backend stuff />

      const struct = await createSigStruct(account1, msg, account2.address, timestamp, nonce, data)

      await example1.connect(account2).setNumber(struct, 2);
      expect(await example1.number()).to.eq(2)
    })

    it("should fail to set number with wrong timestamp", async () => {
      // < backend stuff
      let timestamp, nonce;
      let tsNonce = await verifier.getTimestampAndNonce(account2.address);
      timestamp = tsNonce[0];
      nonce = tsNonce[1];
      const data = await verifier.getId("0x");

      const encoded = await abiEncodeS3Values({ version: "SOLVE3.V0", account: account2.address, contract: example1.address, timestamp, nonce, data });
      const msg = await keccak256(encoded);
      const signature = await signMsg(account1, msg);
      const sig = ethers.utils.splitSignature(signature);
      await verifier.setTester(example1.address, true);
      // backend stuff />

      const struct = await createSigStruct(account1, msg, account2.address, timestamp, nonce, data)

      await example1.connect(account2).setNumber(struct, 2);
      expect(await example1.number()).to.eq(2)
    })

    it("should fail to set number with wrong timestamp or nonce", async () => {
      // < backend stuff
      let timestamp, nonce;
      let tsNonce = await verifier.getTimestampAndNonce(account2.address);
      timestamp = tsNonce[0];
      nonce = tsNonce[1];
      const data = await verifier.getId("0x");

      const encoded = await abiEncodeS3Values({ version: "SOLVE3.V0", account: account2.address, contract: example1.address, timestamp, nonce, data });
      const msg = await keccak256(encoded);
      const signature = await signMsg(account1, msg);
      const sig = ethers.utils.splitSignature(signature);
      await verifier.setTester(example1.address, true);
      // backend stuff />

      let struct = await createSigStruct(account1, msg, account2.address, timestamp + 1, nonce, data)
      await expect(example1.connect(account2).setNumber(struct, 2)).to.be.revertedWith("Solve3Verify: Unable to verify message");

      struct = await createSigStruct(account1, msg, account2.address, timestamp, nonce + 1, data)
      await expect(example1.connect(account2).setNumber(struct, 2)).to.be.revertedWith("Solve3Verify: Unable to verify message");
    })

    it("should fail to set number when using two times same msg", async () => {
      // < backend stuff
      let timestamp, nonce;
      let tsNonce = await verifier.getTimestampAndNonce(account2.address);
      timestamp = tsNonce[0];
      nonce = tsNonce[1];

      const data = await verifier.getId("0x");

      const encoded = await abiEncodeS3Values({ version: "SOLVE3.V0", account: account2.address, contract: example1.address, timestamp, nonce, data });
      const msg = await keccak256(encoded);
      const signature = await signMsg(account1, msg);
      const sig = ethers.utils.splitSignature(signature);
      await verifier.setTester(example1.address, true);
      // backend stuff />

      let struct = await createSigStruct(account1, msg, account2.address, timestamp, nonce, data)

      await example1.connect(account2).setNumber(struct, 2);
      expect(await example1.number()).to.eq(2)

      await expect(example1.connect(account2).setNumber(struct, 3)).to.be.revertedWith("Solve3Verify: Unable to verify message");
    })

    it("should fail to set number when increasing time by 6min", async () => {
      // < backend stuff
      let timestamp, nonce;
      let tsNonce = await verifier.getTimestampAndNonce(account2.address);
      timestamp = tsNonce[0];
      nonce = tsNonce[1];

      const data = await verifier.getId("0x");

      const encoded = await abiEncodeS3Values({ version: "SOLVE3.V0", account: account2.address, contract: example1.address, timestamp, nonce, data });
      const msg = await keccak256(encoded);
      const signature = await signMsg(account1, msg);
      const sig = ethers.utils.splitSignature(signature);
      await verifier.setTester(example1.address, true);
      // backend stuff />

      let min = 60;

      await ethers.provider.send('evm_increaseTime', [6 * min]);
      await ethers.provider.send('evm_mine');

      let struct = await createSigStruct(account1, msg, account2.address, timestamp, nonce, data)

      await expect(example1.connect(account2).setNumber(struct, 3)).to.be.revertedWith("Solve3Verify: Signature is no longer valid");
    })

    it("should success when increasing time by 6min after increasing validPeriod", async () => {
      // < backend stuff
      let timestamp, nonce;
      let tsNonce = await verifier.getTimestampAndNonce(account2.address);
      timestamp = tsNonce[0];
      nonce = tsNonce[1];

      const data = await verifier.getId("0x");

      const encoded = await abiEncodeS3Values({ version: "SOLVE3.V0", account: account2.address, contract: example1.address, timestamp, nonce, data });
      const msg = await keccak256(encoded);
      const signature = await signMsg(account1, msg);
      const sig = ethers.utils.splitSignature(signature);
      await verifier.setTester(example1.address, true);
      // backend stuff />

      let min = 60;

      await example1.set((await example1.validFromTimestamp()), 7 * min);

      await ethers.provider.send('evm_increaseTime', [6 * min]);
      await ethers.provider.send('evm_mine');

      let struct = await createSigStruct(account1, msg, account2.address, timestamp, nonce, data)

      await example1.connect(account2).setNumber(struct, 3);
      expect(await example1.number()).to.eq(3)
    })

    it("should fail to set number when timestamp in future", async () => {
      // < backend stuff
      let timestamp, nonce;
      let tsNonce = await verifier.getTimestampAndNonce(account2.address);
      timestamp = tsNonce[0] + 10000000;
      nonce = tsNonce[1];
      const data = await verifier.getId("0x");
      const encoded = await abiEncodeS3Values({ version: "SOLVE3.V0", account: account2.address, contract: example1.address, timestamp, nonce, data });
      const msg = await keccak256(encoded);
      const signature = await signMsg(account1, msg);
      const sig = ethers.utils.splitSignature(signature);
      await verifier.setTester(example1.address, true);
      // backend stuff />

      let struct = await createSigStruct(account1, msg, account2.address, timestamp, nonce, data)

      await expect(example1.connect(account2).setNumber(struct, 3)).to.be.revertedWith("Solve3Verify: Unable to verify message");
    })

    it("should fail to set number when msg was signed too early", async () => {
      // < backend stuff
      let timestamp, nonce;
      let tsNonce = await verifier.getTimestampAndNonce(account2.address);
      timestamp = tsNonce[0] - 100;
      nonce = tsNonce[1];
      const data = await verifier.getId("0x");
      const encoded = await abiEncodeS3Values({ version: "SOLVE3.V0", account: account2.address, contract: example1.address, timestamp, nonce, data });
      const msg = await keccak256(encoded);
      const signature = await signMsg(account1, msg);
      const sig = ethers.utils.splitSignature(signature);
      await verifier.setTester(example1.address, true);
      // backend stuff />

      let struct = await createSigStruct(account1, msg, account2.address, timestamp, nonce, data)

      await expect(example1.connect(account2).setNumber(struct, 3)).to.be.revertedWith("Solve3Verify: Message was signed too early");
    })

    it("should success when msg was signed early after changing validFromTimestamp", async () => {
      // < backend stuff
      let timestamp, nonce;
      let tsNonce = await verifier.getTimestampAndNonce(account2.address);
      timestamp = tsNonce[0] - 100;
      nonce = tsNonce[1];
      const data = await verifier.getId("0x");
      const encoded = await abiEncodeS3Values({ version: "SOLVE3.V0", account: account2.address, contract: example1.address, timestamp, nonce, data });
      const msg = await keccak256(encoded);
      const signature = await signMsg(account1, msg);
      const sig = ethers.utils.splitSignature(signature);
      await verifier.setTester(example1.address, true);
      // backend stuff />

      await example1.set((await example1.validFromTimestamp() - 100), 300);
      let struct = await createSigStruct(account1, msg, account2.address, timestamp, nonce, data)

      await example1.connect(account2).setNumber(struct, 3)
      expect(await example1.number()).to.eq(3)
    })

  })

  describe("Verify - Example2", function () {
    it("should success when validFrom() returns timestamp from past", async () => {
      // < backend stuff
      let timestamp, nonce;
      let tsNonce = await verifier.getTimestampAndNonce(account2.address);
      timestamp = tsNonce[0];
      nonce = tsNonce[1];
      const data = await verifier.getId("0x");
      const encoded = await abiEncodeS3Values({ version: "SOLVE3.V0", account: account2.address, contract: example2.address, timestamp, nonce, data });
      const msg = await keccak256(encoded);
      const signature = await signMsg(account1, msg);
      const sig = ethers.utils.splitSignature(signature);
      await verifier.setTester(example2.address, true);
      // backend stuff />

      await example2.toggleIt()
      let struct = await createSigStruct(account1, msg, account2.address, timestamp, nonce, data)

      await example2.connect(account2).setNumber(struct, 4);
      expect(await example2.number()).to.eq(4)
    })

    it("should fail when validFrom() returns timestamp from future", async () => {
      // < backend stuff
      let timestamp, nonce;
      let tsNonce = await verifier.getTimestampAndNonce(account2.address);
      timestamp = tsNonce[0];
      nonce = tsNonce[1];
      const data = await verifier.getId("0x");
      const encoded = await abiEncodeS3Values({ version: "SOLVE3.V0", account: account2.address, contract: example2.address, timestamp, nonce, data });
      const msg = await keccak256(encoded);
      const signature = await signMsg(account1, msg);
      const sig = ethers.utils.splitSignature(signature);
      await verifier.setTester(example2.address, true);
      // backend stuff />

      let struct = await createSigStruct(account1, msg, account2.address, timestamp, nonce, data)

      await expect(example2.connect(account2).setNumber(struct, 4)).to.be.revertedWith("Solve3Verify: Message was signed too early");
    })

    it("should fail to set number when increasing time by 100s", async () => {
      // < backend stuff
      let timestamp, nonce;
      let tsNonce = await verifier.getTimestampAndNonce(account2.address);
      timestamp = tsNonce[0];
      nonce = tsNonce[1];
      const data = await verifier.getId("0x");
      const encoded = await abiEncodeS3Values({ version: "SOLVE3.V0", account: account2.address, contract: example2.address, timestamp, nonce, data });
      const msg = await keccak256(encoded);
      const signature = await signMsg(account1, msg);
      const sig = ethers.utils.splitSignature(signature);
      await verifier.setTester(example2.address, true);
      // backend stuff />

      await example2.toggleIt()

      await ethers.provider.send('evm_increaseTime', [100]);
      await ethers.provider.send('evm_mine');

      let struct = await createSigStruct(account1, msg, account2.address, timestamp, nonce, data)

      await expect(example2.connect(account2).setNumber(struct, 3)).to.be.revertedWith("Solve3Verify: Message was signed too early");
    })

  })

  describe("Verify - Ads", function () {

    let _ID = "0x02b95aae64d92daf4dc7a044b7fa8362dfed496017a7352fe6864dba0faff72c";
    
    beforeEach(async () => {
      await token.approve(verifier.address, ethers.utils.parseEther("100000000000000"));
      await verifier.addAd(owner.address, "ABCDEFG", 2, "20000000000000000");
    })

    it("should have added a new ad", async () => {
      expect(await verifier.getAdSet()).to.have.lengthOf(1);
      let id = (await verifier.getAdSet())[0]
      let ad = await verifier.getAd(id);

      expect(ad[0]).to.eq(id);
      expect(ad[1]).to.eq(owner.address);
      expect(ad[2]).to.eq("ABCDEFG");
      expect(ad[3]).to.eq(2);
      expect(ad[4]).to.eq("20000000000000000");
    })

    it("should transfer token and decrease totalSolves", async () => {
      let timestamp, nonce;
      let tsNonce = await verifier.getTimestampAndNonce(account2.address);
      timestamp = tsNonce[0];
      nonce = tsNonce[1];

      const data = _ID;

      let balanceVerifier = await token.balanceOf(verifier.address);
      let balanceAcc2 = await token.balanceOf(account2.address);

      expect(balanceAcc2).to.eq(0);

      const encoded = await abiEncodeS3Values({ version: "SOLVE3.V0", account: account2.address, contract: example1.address, timestamp, nonce, data });
      const msg = await keccak256(encoded);
      const signature = await signMsg(account1, msg);
      const sig = ethers.utils.splitSignature(signature);
      await verifier.setTester(example1.address, true);
      // backend stuff />

      const struct = await createSigStruct(account1, msg, account2.address, timestamp, nonce, data)

      await example1.connect(account2).setNumber(struct, 2);
      expect(await example1.number()).to.eq(2)

      let balanceVerifierAfter = await token.balanceOf(verifier.address);
      let balanceAcc2After = await token.balanceOf(account2.address);

      expect(balanceAcc2After).to.eq("20000000000000000")
      expect(balanceVerifier.sub(balanceVerifierAfter)).to.eq("20000000000000000")
      
      let ad = await verifier.getAd(_ID);

      expect(ad[0]).to.eq(_ID);
      expect(ad[1]).to.eq(owner.address);
      expect(ad[2]).to.eq("ABCDEFG");
      expect(ad[3]).to.eq(1);
      expect(ad[4]).to.eq("20000000000000000");


      tsNonce = await verifier.getTimestampAndNonce(account2.address);
      timestamp = tsNonce[0];
      nonce = tsNonce[1];

      const encoded2 = await abiEncodeS3Values({ version: "SOLVE3.V0", account: account2.address, contract: example1.address, timestamp, nonce, data });
      const msg2 = await keccak256(encoded2);
      const signature2 = await signMsg(account1, msg2);
      const sig2 = ethers.utils.splitSignature(signature2);
      await verifier.setTester(example1.address, true);
      // backend stuff />

      const struct2 = await createSigStruct(account1, msg2, account2.address, timestamp, nonce, data)

      await example1.connect(account2).setNumber(struct2, 2);
      
      expect(await verifier.getAdSet()).to.have.lengthOf(0);
    })
   })

})