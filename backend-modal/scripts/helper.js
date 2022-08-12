const str = (command, obj) => {
  return JSON.stringify({command: command, data: obj});
}

const error = (msg) => {
  return { "error": msg };
}

const isTimestampValid = (data) => {
  if(!data.timestamp) return error("timestamp is required");
  if(data.timestamp < Date.now()) return { result: false };
  return { result: true};
}

const getRandomFromArray = (arr) => {
  const random = Math.floor(Math.random() * arr.length);
  return arr[random];
}


module.exports = {
  str,
  error,
  isTimestampValid,
  getRandomFromArray,
}