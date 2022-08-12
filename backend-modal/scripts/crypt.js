require('dotenv').config()
const Cryptr = require('cryptr');
const crypt = new Cryptr(process.env.SECRET);


const encryptJson = (text) => {
  return crypt.encrypt(JSON.stringify(text));
}

const decryptJson = (text) => {
  return JSON.parse(crypt.decrypt(text));
}

module.exports = {
  encryptJson,
  decryptJson,
}