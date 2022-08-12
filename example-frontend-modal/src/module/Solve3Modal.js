import { server } from './data/server';
import pWaitFor from 'p-wait-for';
require('isomorphic-fetch');

const WebSocket = require('isomorphic-ws');
const EventEmitter = require('events');
const ethers = require('ethers');


class Solve3Modal extends EventEmitter {

  account; contract; network; handshake; handshakeHash;
  win; msg; socket; html; verified; error;

  secInterval;
  modal;

  constructor(obj) {
    super();
    this.socket = obj;
    document.body.insertAdjacentHTML('beforeend', `<div class='solve3-modal' id="solve3-modal"></div>`);
  }

  onLoad = () => {
    if (this.secInterval) clearInterval(this.secInterval);
    this.secInterval = this.createSecInterval();
  }

  onClose = () => {
    if (this.secInterval) clearInterval(this.secInterval);
    this.modal.style.display = "none";
  }

  clearSecInterval = () => {
    clearInterval(this.secInterval);
  }

  createSecInterval = () => {
    var i = 14;
    var interval = setInterval(function () {
      document.getElementById("solve3-secs").innerHTML = "(" + i + "s)";
      i--;
      if (i < 0) {
        window.onClickHandlerReload();
        // clearInterval(secInterval);
      }
    }, 1000);
    return interval;
  }

  secTimer(time, elem, func) {
    var i = time;
    var that = this;
    var doc = document;
    var myInterval = setInterval(function () {
      doc.getElementById(elem).innerHTML = "(" + i + "s)";
      i--;
      if (i < 0) {
        that.modal.style.display = "none";
        func();
        clearInterval(myInterval);
      }
    }, 1000);
  }

  sendSolution = async (data, solution) => {
    this.modal.style.display = "block";

    console.log("data")
    console.log(data)

    if (this.secInterval) {
      clearInterval(this.secInterval);
    }

    var payload = {
      solution: solution,
      data: data
    }

    try {
      let result = await this.validate(payload)

      if (result.verified) {
        document.getElementById('solve3-modal-content').innerHTML = '<div class="solve3-result"><div class="solve3-green"><span class="solve3-medium">&check;&nbsp;Success</span></div><div class="solve3-small">Window closes automatically. <span id="solve3-countdown">(3s)</span></div</div>'
        this.secTimer(2, "solve3-countdown", () => { window.onSuccess(result) });
      } else {
        const myTimeout = setTimeout(() => {
          document.getElementById('solve3-modal-content').innerHTML = '<div class="solve3-result"><div class="solve3-red"><span class="solve3-medium">&cross; Failed</span></div><div class="solve3-small">Please try again. <span id="solve3-countdown">(3s)</span></div</div>'
          this.secTimer(2, "solve3-countdown", () => { window.onClickHandlerReload() });
        }, 3000);
      }
    } catch (error) {
      console.log(error);
    }
  }

  timeout10 = {
    timeout: {
      milliseconds: 10000,
      fallback: () => {
        console.log('Time’s up! executed the fallback function! (1)');
        alert("Solve3 timeout")
      },
    }
  }

  timeout2 = {
    timeout: {
      milliseconds: 2000,
      fallback: () => {
        console.log('Time’s up! executed the fallback function! (2)');
        alert("Solve3 timeout")
      },
    }
  }



  async createContent() {
    this.html = undefined;
    this.error = undefined;

    var payload = {
      "data": {
        "handshake": this.handshake,
        "signedMsg": this.msg
      }
    }

    this.socket.send(str("popup", payload));

    pWaitFor(() => {
      console.log("wait for modal")
      return (this.html != undefined || this.error != undefined)
    }, this.timeout2).then(() => {
      setContent(this.html ? this.html : `<h1>${this.error}</h1>`)
      this.onLoad();
      this.modal = document.getElementById("solve3-check-modal");
    })
  }

  setHandshake(obj) {
    this.handshake = obj.handshake;
    this.handshakeHash = obj.hash;
  }

  async validate(payload) {
    this.socket.send(str("validate", payload));

    this.verified = undefined;

    await pWaitFor(() => {
      console.log("wait for validate")
      return (this.verified != undefined)
    }, this.timeout10)
    return this.verified;
  }

  setHtml(obj) {
    this.html = obj.html;
  }

  setVerified(obj) {
    this.verified = obj;
  }

  setError(obj) {
    this.error = obj;
  }

  async close() {
    this.socket.close();
  }

  async init(obj) {
    this.account = obj.account;
    this.contract = obj.contract;
    this.network = obj.network;

    this.handshakeHash = undefined;
    this.error = undefined;

    var payload = {
      "data": {
        "account": this.account,
        "destination": this.contract,
        "network": this.network
      }
    }

    this.socket.send(str("handshake", payload));

    await pWaitFor(() => {
      console.log("wait for handshake")
      return (this.handshakeHash != undefined || this.error != undefined)
    }, this.timeout2)

    if (this.error) {
      console.log("error oO")
      this.createWindow()
      this.createContent();
      return;
    }
    return this.handshakeHash;
  }

  onSuccess(obj) {
    this.emit("success", obj.message);
    removeContent();
    solve3.clearSecInterval();
  }

  async open(msg) {
    this.msg = msg;
    if (document.getElementById("solve3-modal").innerHTML !== "" && document.getElementById("solve3-modal").innerHTML !== 'undefined') this.removeContent();
    try {
      if (ethers.utils.isAddress(this.account)
        && ethers.utils.isAddress(this.contract) && msg) {
        // this.createWindow()
        this.createContent();
      } else {
        this.emit("error", "signed msg or account or contract incorrect")
      }
    } catch (error) {
      this.emit("error", error)
    }
  }
}

const setContent = (c) => {
  document.getElementById("solve3-modal").innerHTML = c;
}

const removeContent = () => {
  document.getElementById("solve3-modal").innerHTML = "";
}

const ws = new WebSocket.default('wss://api.solve3.org:8888');

var solve3 = new Solve3Modal(ws);

ws.onopen = function open() {
  // ws.send(str("handshake", {}));
};

ws.onclose = function close() {
  console.log('disconnected');
};

ws.onmessage = function incoming(response) {
  var data = response.data;
  const dataObj = JSON.parse(data.toString());
  switch (dataObj.command) {
    case "re-handshake":
      solve3.setHandshake(dataObj.data);
      break;
    case "re-popup":
      solve3.setHtml(dataObj.data);
      break;

    case "re-validate":
      solve3.setVerified(dataObj.data);
      break;

    case "error":
      solve3.setError(dataObj);
      break;

    default:
      console.log(dataObj)
      break;
  }
  // setTimeout(function timeout() {
  //   ws.send(Date.now());
  // }, 500);
};

const str = (command, obj) => {
  return JSON.stringify({ command: command, ...obj });
}

window.onClickHandlerReload = () => {
  solve3.createContent();
}

window.onClickHandlerClose = () => {
  solve3.onClose();
  removeContent();
}

window.onSuccess = async function (obj) {
  solve3.onSuccess(obj)
}

window.onSendSolution = async (data, solution) => {
  await solve3.sendSolution(data, solution);
}


export default solve3;