const { encryptJson, decryptJson } = require('./scripts/crypt');
const { getCaptchaObject } = require('./scripts/emojiAscii');
const { str, error, isTimestampValid } = require('./scripts/helper');
const { id, signMsg, verifySigner, verifyWeb3Signer, createMessage } = require('./scripts/web3-func');

const https = require('https')
// const http = require('http')
const fs = require('fs')
const express = require('express')
const expressWs = require('express-ws')

var ejs = require('ejs')

const serverOptions = {
  pfx: fs.readFileSync('cert.pfx'),
  passphrase: process.env.SECRET
}

var app = express();
var cors = require('cors')

app.use(cors())
app.use("/public", express.static("./public"));

const server = https.createServer(serverOptions, app)
// const server = http.createServer(app)

expressWs(app, server)

const SALT = process.env.SALT;
var NONCE = 0;
var userArray = [];

app.get('/', function (req, res, next) {
  res.end("hello world");
});

app.ws('/', async function connection(ws, req) {
  //ws.id = getRandomID();
  var ip = (req.headers['x-forwarded-for'] || '').split(',').pop().trim();
  ws.ip = ip;

  if (!req.headers.upgrade) {
    ws.close();
    return;
  }

  if (ip ? userArray.indexOf(ws.ip) > -1 : false) {
    // Cancel adding them to number of users
    console.log(("ip blocked: " + ws.ip))
    ws.close();
    return;
  } else {
    // Add IP to the array
    if (ws.ip) userArray.push(ws.ip);

    ws.on('close', function close() {
      // Remove IP from the array
      if (ws.ip)
        userArray.splice(userArray.indexOf(ws.ip), 1);
    })

    ws.on('message', async function message(data) {

      try {
        const dataObj = JSON.parse(data.toString());
        if (!dataObj.data) return ws.send(str("error", error("data is required")));
        switch (dataObj.command) {
          case "handshake":
            const hs = await handshake(dataObj.data);
            ws.send(str("re-handshake", hs));
            break;

          case "popup":
            const vh = validateHandshake(dataObj.data);
            if (vh.error) {
              ws.send(str("re-popup", vh));
              break;
            } else {

              const popup = await createPopup(dataObj.data);
              ws.send(str("re-popup", popup));
              break;
            }

          case "validate":
            const isValid = await verifySolution(dataObj);
            if (isValid.error) {
              ws.send(str("re-validate", isValid.error));
              break;
            }
            if (!isValid.result) {
              ws.send(str("re-validate", { verified: false }));
              break;
            }
            const message = await createMessage(decryptHandshake(dataObj.data));
            ws.send(str("re-validate", message))
            break;

          case "ping":
            ws.send(str("pong", { result: true }));
            break;

          default:
            ws.send(str(error("unknown command")));
            break;
        }
      } catch (error) {
        ws.send(str("error", { error: error }))
      }

    });
    // Do what you want here.
  }

});

// handshake

// param:
// data {
//   handshake: "",
//   singedMsg: "",
// }

// return
// { result: true }
const validateHandshake = (data) => {
  if (!data.handshake) return error("handshake is required");

  const { account, destination, network, timestamp, sig } = decryptHandshake(data.handshake)
  const message = account + destination + network + timestamp + SALT;

  const sigResult = verifySigner({ msg: message, sig: sig, network: network });
  const web3SigResult = verifyWeb3Signer({ msg: data.handshake, sig: data.signedMsg, account: account });
  const hasValidTimestamp = isTimestampValid({ timestamp: timestamp });

  if (sigResult.error) return sigResult;
  if (web3SigResult.error) return web3SigResult;
  if (hasValidTimestamp.error) return hasValidTimestamp;

  if (!sigResult.result) return error("invalid signature");
  if (!web3SigResult.result) return error("invalid web3 signature");
  if (!hasValidTimestamp.result) return error("invalid timestamp");

  return { result: true };
}

// param:
// data {
//   account: "",
//   destination: "",
//   network: "",
// }

// return:
// data {
//   handshake: "",
//   singedMsg: "",
// }

const handshake = async (data) => {
  if (!data.account) return error("account is required");
  if (!data.destination) return error("destination is required");
  if (!data.network) return error("network is required");

  const timestamp = Date.now() + 3 * 60 * 10000;
  const message = data.account + data.destination + data.network + timestamp + SALT;
  const sig = await signMsg(data.network, message);

  if (!sig.error) {
    const handshake = encryptJson({
      account: data.account,
      destination: data.destination,
      network: data.network,
      timestamp: timestamp,
      sig: sig,
    })

    return ({
      handshake: handshake,
      hash: id(handshake)
    });
  } else {
    return error(sig.error);
  }
}

const decryptHandshake = (handshake) => {
  const decryptedHandshake = decryptJson(handshake);
  return decryptedHandshake;
}

// popup

const createPopup = async (data) => {
  let internalNonce = NONCE;
  NONCE++;

  const captchaObj = await getCaptchaObject(5)

  //create solution
  var solutionHash = parseInt(id(captchaObj.solution + internalNonce).substring(0, 9))
  const { account, destination, network, timestamp, sig } = decryptHandshake(data.handshake)
  //create signature
  const valid = Date.now() + 20000;
  return signMsg(network, solutionHash + SALT + account + destination + valid)
    .then(async (signature) => {

      var data = {
        signature: signature,
        account: account,
        destination: destination,
        valid: valid,
        network: network,
      }

      // render html
      var render = await ejs.renderFile('./views/popup/index.ejs', {
        captcha: captchaObj.ascii,
        emojis: htmlifySVGs(captchaObj.selection, internalNonce, encryptJson(data)),
        data: encryptJson(data),
        logo: process.env.SERVER + process.env.LOGO,
        validate: process.env.SERVER + process.env.VALIDATE,
        twitterUrl: process.env.TWITTER_URL,
        twitterLogo: process.env.SERVER + process.env.TWITTER_LOGO,
      })

      return {
        html: render
      }

    })
    .catch(err => {
      return error(err)
    })
}

const htmlifySVGs = (svgs, nonce, data) => {
  let html = '';
  for (let i = 0; i < svgs.length; i++) {
    let solution = parseInt(id(svgs[i] + nonce).substring(0, 9));
    let send = "\"" + data + '\",' + solution;
    html += `<div class="solve3-emoji-wrapper"><img class="solve3-emoji" onclick={onSendSolution(${send})} src="${process.env.SERVER}/public/openmoji-svg/${svgs[i]}.svg" /></div>`;
  }
  return html;
}

// validate
// data: {
//     data,
//     solution
// }
const isNotSolved = async (data) => {
  const { signature, account, destination, valid, network } = decryptJson(data.data);
  const notSolvedYet = await createSolutionFile({ valid: valid, signature: signature, account: account })
  if (notSolvedYet.error) return (notSolvedYet)
  if (!notSolvedYet.result) return (error("captcha already solved"))

  return ({ result: true })
}


// data {
//  data
//  network,
//  solution,
//  signature,
//  timestamp
// }
const verifySolution = async (data) => {
  const notSolved = await isNotSolved(data)
  if (!notSolved.result) return (notSolved)

  const { account, destination, network, valid, signature } = decryptJson(data.data)
  const solutionSig = await signMsg(network, data.solution + SALT + account + destination + valid)

  const solutionMatch = signature == solutionSig;
  const sigResult = verifySigner({ msg: data.solution + SALT + account + destination + valid, sig: signature, network: network })
  const hasValidTimestamp = isTimestampValid({ timestamp: valid });

  if (sigResult.error) return sigResult;
  if (hasValidTimestamp.error) return hasValidTimestamp;

  if (!sigResult.result) return error("invalid signature");
  if (!hasValidTimestamp.result) return error("invalid timestamp");

  return ({ result: solutionMatch && sigResult.result && hasValidTimestamp.result })
}

// if file exist: solution already solved (or tried to), return {result: false}
// if file not exist: create new file, return {result: true}
// if error: return {error: errormsg}
const createSolutionFile = async (data) => {
  const date = new Date(parseInt(data.valid));
  const dateString = date.getFullYear() + "-" + date.getMonth() + "-" + date.getDate();
  const dir = "./data/txtdb/" + dateString;

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

  const filename = data.signature + ".txt";

  if (fs.existsSync(dir + "/" + filename)) {
    return ({ result: false });
  } else {
    fs.writeFile(dir + "/" + filename, data.account, function (err) {
      if (err) return (error(err));
    })
    return ({ result: true });
  }
}

console.log("server.listen(",process.env.PORT,");")
server.listen(process.env.PORT);