require('dotenv').config()
const { encryptJson, decryptJson } = require('./scripts/crypt');
const { str, error, isTimestampValid } = require('./scripts/helper');
const { id, signMsg, verifySigner, verifyWeb3Signer, createMessage } = require('./scripts/web3-func');

// const http = require('http')
const https = require('https')
const fs = require('fs')
const express = require('express')
const expressWs = require('express-ws')
var imageToSlices = require('image-to-slices');
const mergeImages = require('merge-base64');

var placeholder = 'data:image/png;base64,/9j/4AAQSkZJRgABAQAAAQABAAD//gAfQ29tcHJlc3NlZCBieSBqcGVnLXJlY29tcHJlc3P/2wCEAAQEBAQEBAQEBAQGBgUGBggHBwcHCAwJCQkJCQwTDA4MDA4MExEUEA8QFBEeFxUVFx4iHRsdIiolJSo0MjRERFwBBAQEBAQEBAQEBAYGBQYGCAcHBwcIDAkJCQkJDBMMDgwMDgwTERQQDxAUER4XFRUXHiIdGx0iKiUlKjQyNEREXP/CABEIADIAKAMBIgACEQEDEQH/xAAaAAACAwEBAAAAAAAAAAAAAAAABAIDBQYI/9oACAEBAAAAAPc0QlRlKT3aeVYe1rUVU+jtxczV2CNF8ngD/8QAGAEAAwEBAAAAAAAAAAAAAAAAAQIDBAD/2gAIAQIQAAAA0idL5VDjh//EABgBAAIDAAAAAAAAAAAAAAAAAAEEAAID/9oACAEDEAAAAGDkU27Y3En/xAAtEAACAAUCBQMCBwAAAAAAAAABAgADBBESMpEhIkFScRMxYRCxBRQzQnLB4f/aAAgBAQABPwB3fN+c+56xm/ed49RvbM7xm/ed4R3zTnPuOsVE0SmbhxJMTamY3C/9CJnrIubI2P8ADhEn8QdCLsSPm5EU04TsGAtzCK/MB2SWXILcBEwzZjETCRY6fYCJFRUU9gkw4j9p4rAelqf1E9Kb3LpPmKKWZYVTbULEcQRFQWGbKbWYmGm087kqZYuOv+9In0UtEadJmgoASQTfYxLUPbGKVcFlD5B3MPrfyYrKZluyaft8GDKmM2NooqQLzsOH3hNaeRD638n6fl5WV7cO3p9E1p5EFEvpG0YJ2DaME7BtGCdg2gIl9I2j/8QAHhEAAgMAAQUAAAAAAAAAAAAAAQIAAxEQEiExQUL/2gAIAQIBAT8AWssNyMqr9DhbgmI06arRCAOw8CMocYYilfcPJn//xAAfEQACAgICAwEAAAAAAAAAAAABAgADESESQRMgIlL/2gAIAQMBAT8ASovvqGn8kGEYOCIVsdMKdDoTyXUNomci/wBMNmI7JtZxZnL2HJh9P//Z';

const serverOptions = {
  pfx: fs.readFileSync('cert.pfx'),
  passphrase: process.env.SECRET
}


imageToSlices.configure({
  clipperOptions: {
    canvas: require('canvas')
  }
});

var app = express();
var cors = require("cors")

app.use(cors());
app.use("/public", express.static("./public"));

// const server = http.createServer(app)
const server = https.createServer(serverOptions, app)

expressWs(app, server)

const SALT = process.env.SALT;
var NONCE = 0;

app.get('/', function (req, res, next) {
  res.end("hello world");
});

app.ws('/', async function connection(ws, req) {

  ws.on('close', function () {
    // console.log('closed')
  })

  ws.on('message', async function message(d) {
    let data = JSON.parse(d);

    switch (data.command) {
      case "ping":
        console.log("ping")
        ws.send(JSON.stringify({ command: "pong" }));
        break;

      case "handshake":
        const hs = await handshake(data.data);
        ws.send(str("re-handshake", hs));
        break;

      case "getCaptchaData":
        const vh = validateHandshake(data.data);
        if (!vh.error) {
          let dat = await getCaptchaData(data.data);
          ws.send(JSON.stringify(
            {
              command: "captchaData",
              data: dat
            }));
        }
        break;

      case "validate":
        const isValid = await verifySolution(data);
        if (isValid.error) {
          ws.send(str("re-validate", isValid.error));
          break;
        }
        if (!isValid.result) {
          ws.send(str("re-validate", { verified: false }));
          break;
        }
        // id:
        const id = "0xc9ac6b4e3e0bf36a505fd1fffc60ff0c0c6fa02dd4ff7229c56bf9318c1932d6";
        const message = await createMessage({ ...decryptHandshake(data.data), data: id });
        ws.send(str("re-validate", message))
        break;

      default:
        console.log("unknown command")
        break;
    }
  })
})

const decryptHandshake = (handshake) => {
  const decryptedHandshake = decryptJson(handshake);
  return decryptedHandshake;
}

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

// const readImage = async () => {
//   fs.readFile("./data/example.png", function(err, data) {
//     if (err) throw err; // Fail if the file can't be read.
//       return data; // Send the file data to the browser.
//   });
// }

const sliceImage = async (path) => {
  // expect image size: 200*250
  var lineYArray = [40, 80, 120, 160]; // 200 / 5 = 40
  var lineXArray = [50, 100, 150, 200]; // 250 / 5 = 50
  var source = path;

  return new Promise((resolve, reject) => {
    imageToSlices(source, lineXArray, lineYArray, {
      saveToDataUrl: true
    }, function (dataUrlList) {
      if (!dataUrlList) reject("error")
      resolve(dataUrlList);
    });
  });
}

const randomNumber = (min, max) => {
  var index = Math.floor(Math.random() * (max - min) + min);
  return index;
}

const mergeSlices = async (slices) => {
  var lines = [];

  // columns
  var i = 0;
  while (i < slices.length) {
    var line = [];
    var startIndex = i;
    for (var j = 0; j < 5; j++) {
      line.push(slices[j + startIndex].dataURI.replace("data:image/png;base64,", ""));
      i++;
    }
    lines.push((await mergeImages(line)).replace("data:image/jpeg;base64,", ""));
  }

  // rows
  const mergedImage = await mergeImages(lines, { direction: true });

  return mergedImage;
}

const getCaptchaData = async (data) => {
  let internalNonce = NONCE;
  NONCE++;

  var slices = await sliceImage("./data/example.png");
  var puzzleIndex = randomNumber(0, 24);
  const puzzleData = JSON.parse(JSON.stringify(slices[puzzleIndex]));
  slices[puzzleIndex].dataURI = placeholder;
  var image = await mergeSlices(slices);

  // console.log(puzzleData)

  const valid = Date.now() + 20000;
  const { account, destination, network, timestamp, sig } = decryptHandshake(data.handshake)

  var payload = {
    posX: puzzleData.x,
    nonce: internalNonce,
    valid: valid,
    account: account,
    destination: destination,
    network: network,
    timestamp: timestamp,
    signature: sig,
  }

  var captchaData = {
    image: image,
    puzzle: puzzleData.dataURI,
    posY: puzzleData.y,
    data: encryptJson(payload),
  }

  return captchaData;
}

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

const verifySolution = async (data) => {
  // var payload = {
  //   posX: puzzleData.x,
  //   nonce: internalNonce,
  //   valid: valid,
  //   account: account,
  //   destination: destination,
  //   network: network,
  //   timestamp: timestamp,
  //   sig: sig,
  // }
  const { posX, nonce, valid, account, destination, network, timestamp, signature } = decryptJson(data.data)

  const hasValidValid = isTimestampValid(valid);
  const hasValidTimestamp = isTimestampValid(timestamp);

  const isSolution = data.solution <= posX + 4 && data.solution >= posX - 4;

  if (hasValidTimestamp.error) return hasValidTimestamp;
  if (!hasValidTimestamp.result) return error("invalid timestamp");

  return ({ result: hasValidTimestamp.result && hasValidValid.result && isSolution })
}


console.log("server.listen(", process.env.PORT, ");")
server.listen(process.env.PORT);