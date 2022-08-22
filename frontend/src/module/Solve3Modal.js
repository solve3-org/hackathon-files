import { server } from './data/server';
import pWaitFor from 'p-wait-for';
import logo from './data/solve3-logo.png';
import styles from './styles'

require('isomorphic-fetch');

const WebSocket = require('isomorphic-ws');
const EventEmitter = require('events');
const ethers = require('ethers');

class Solve3Modal extends EventEmitter {

  socket; captchaData; error; solution; secInterval; validate;
  account; contract; network; handshake; handshakeHash; msg; verified;
  modal; checkModal;

  constructor(obj) {
    super();
    this.socket = obj;
    document.body.insertAdjacentHTML('beforeend', `<div class='solve3-modal' id="solve3-modal"></div>`);
  }

  timeout2 = {
    timeout: {
      milliseconds: 2000,
      fallback: () => {
        console.log('Time’s up! executed the fallback function! (2)');
        console.log("Solve3 timeout")
      },
    }
  }

  timeout10 = {
    timeout: {
      milliseconds: 10000,
      fallback: () => {
        console.log('Time’s up! executed the fallback function! (1)');
        console.log("Solve3 timeout")
      },
    }
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
      // todo: error window
      console.log(this.error)
      return;
    }
    return this.handshakeHash;
  }

  async open(msg) {
    this.msg = msg;
    if (document.getElementById("solve3-modal").innerHTML !== "" && document.getElementById("solve3-modal").innerHTML !== 'undefined') this.removeContent();
    try {
      if (ethers.utils.isAddress(this.account)
        && ethers.utils.isAddress(this.contract) && msg) {
        // this.createWindow()
        this.onLoad();
      } else {
        this.emit("error", "signed msg or account or contract incorrect")
      }
    } catch (error) {
      this.emit("error", error)
    }
  }

  onClose = () => {
    if (this.secInterval) clearInterval(this.secInterval);
    this.modal.style.display = "none";
  }

  loadCaptcha = async () => {
    this.captchaData = undefined;
    this.solution = -1;
    this.error = undefined;

    var payload = {
      "data": {
        "handshake": this.handshake,
        "signedMsg": this.msg
      }
    }

    await pWaitFor(() => {
      console.log("wait for socket")
      return (this.socket.readyState === 1)
    }, this.timeout2)

    this.socket.send(str("getCaptchaData", payload));

    await pWaitFor(() => {
      console.log("wait for captchadata")
      return (this.captchaData != undefined || this.error != undefined)
    }, this.timeout10)
  }

  setCaptchaData(data) {
    this.captchaData = data;
  }

  setSolution(sol) {
    this.solution = sol;
  }

  setHandshake(obj) {
    if (obj.error) {
      this.error = obj.error;
      return;
    }
    this.handshake = obj.handshake;
    this.handshakeHash = obj.hash;
  }

  setVerified(obj) {
    this.verified = obj;
  }

  clearSecInterval = () => {
    clearInterval(this.secInterval);
  }

  onLoad = async () => {
    if (this.secInterval) clearInterval(this.secInterval);
    await this.loadCaptcha();
    this.secInterval = this.createSecInterval();
    this.modal = document.getElementById("solve3-modal");
    this.modal.innerHTML = this.createModal();
    this.modal.style.display = "block";

    this.checkModal = document.getElementById("solve3-check-modal");
  }

  createSecInterval = () => {
    var i = 14;
    var interval = setInterval(function () {
      document.getElementById("solve3-secs").innerHTML = "(" + i + "s)";
      i--;
      if (i < 0) {
        window.onRefresh();
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

  async validate(payload) {
    this.socket.send(str("validate", payload));

    this.verified = undefined;

    await pWaitFor(() => {
      console.log("wait for validate")
      return (this.verified != undefined)
    }, this.timeout10)
    return this.verified;
  }

  sendSolution = async () => {
    this.checkModal.style.display = "block";

    if (this.secInterval) {
      clearInterval(this.secInterval);
    }

    var payload = {
      solution: this.solution,
      data: this.captchaData.data,
    }

    try {
      let result = await this.validate(payload)

      if (result.verified) {
        document.getElementById('solve3-modal-content').innerHTML = `<div style=${this.jstr(styles.solve3Result)}><div style=${this.jstr(styles.solve3Green)}><span style=${this.jstr(styles.solve3Medium)}>&check;&nbsp;Success</span></div><div style=${this.jstr(styles.solve3Small)}>Window closes automatically. <span id="solve3-countdown">(3s)</span></div</div>`
        this.secTimer(2, "solve3-countdown", () => { window.onSuccess(result) });
      } else {
        document.getElementById('solve3-modal-content').innerHTML = `<div style=${this.jstr(styles.solve3Result)}><div style=${this.jstr(styles.solve3Red)}><span style=${this.jstr(styles.solve3Medium)}>&cross; Failed</span></div><div style=${this.jstr(styles.solve3Small)}>Please try again. <span id="solve3-countdown">(3s)</span></div</div>`
        this.secTimer(2, "solve3-countdown", () => { window.onRefresh() });
      }
    } catch (error) {
      console.log(error);
    }
  }

  onSuccess(obj) {
    this.emit("success", obj.message);
    removeContent();
    this.onClose();
  }

  jstr(string) {
    return JSON.stringify(string);
  }

  createModal() {

  return `
    <div style=${this.jstr(styles.modalWrapper)}>
    <center>
    <div>
        <div style=${this.jstr(styles.checkModal)} id="solve3-check-modal">
          <div id="solve3-modal-content" style=${this.jstr(styles.checkModalContent)}>
            <div style=${this.jstr(styles.solve3Result)}>
              <div style=${this.jstr(styles.solve3Small)}>loading..</div>
            </div>
          </div>
        </div>
      <div style="${this.jstr(styles.modalHeaderWrapper)}">                                                     
        <div style=${this.jstr(styles.modalHeader)}>
          <div style=${this.jstr(styles.modalLogoCell)}>
            <img src="${logo}" style=${this.jstr(styles.logo)}>
          </div>
          <div style=${this.jstr(styles.headingWrapper)}>
            <div style=${this.jstr(styles.heading)}>
              <p style=${this.jstr(styles.headingMain)}>SOLVE3</p>
              <p style="${this.jstr(styles.headingSub)}">Web3 Captcha</p>
            </div>
          </div>
        </div>
      </div> 
      <div style=${this.jstr(styles.captchaImageWrapper)}>
        <div style=${this.jstr(styles.captchaImage + ` background-image: url(${this.captchaData.image})`)}></div>
        <div style=${this.jstr(styles.puzzleImage +` top: ${this.captchaData.posY + 1}px; background-image: url(${this.captchaData.puzzle});`)} 
          id="solve3-puzzle"></div>
        <div style=${this.jstr(styles.sliderWrapper)}>
          <span style=${this.jstr(styles.smallOpacity)}>Slide to complete the puzzle</span>
          <input oninput="onSlide(this.value)" 
            style=${this.jstr(styles.slider)} 
            type="range" 
            min="0" 
            max="1000" 
            value="0">
        </div>
        <div style=${this.jstr(styles.buttonWrapper)}>
          <div style=${this.jstr(styles.buttonRow)}>
            <div onclick="onClickHandlerClose()" style=${this.jstr(styles.closeButton)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" class="bi bi-x-circle" viewBox="0 0 16 16">
                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
              </svg>
              <div style=${this.jstr(styles.closeText)}>close</div>
            </div>
            <div style="width: 100%;">
              <div onclick="onSend()" style=${this.jstr(styles.sendButton)}>
                send
              </div>
            </div>
            <div onclick="onRefresh()" 
              style=${this.jstr(styles.refreshButton)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" class="bi bi-arrow-repeat" viewBox="0 0 16 16">
                <path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41zm-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9z"/>
                <path fill-rule="evenodd" d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5.002 5.002 0 0 0 8 3zM3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9H3.1z"/>
              </svg>
              <div style=${this.jstr(styles.refreshText)} id="solve3-secs">(15s)</div>
            </div>
          </div>
        </div>
      </div>
    </center>
  </div>
    `
  }

}


const ws = new WebSocket.default('wss://api.solve3.org:4000');

var solve3 = new Solve3Modal(ws);

ws.onopen = function open() {
  // ws.send(str("handshake", {}));
  console.log("connected to ws")
};

ws.onclose = function close() {
  console.log('disconnected');
};

ws.onmessage = function incoming(response) {
  var data = response.data;
  const dataObj = JSON.parse(data.toString());
  switch (dataObj.command) {
    case "pong":
      console.log("pong");
      break;
    case "re-handshake":
      solve3.setHandshake(dataObj.data);
      break;
    case "captchaData":
      console.log("captchaData");
      solve3.setCaptchaData(dataObj.data)
      break;
    case "re-validate":
      solve3.setVerified(dataObj.data);
      break;
    case "default":
      console.log("default");
      break;
  }
  // setTimeout(function timeout() {
  //   ws.send(Date.now());
  // }, 500);
};

const str = (command, obj) => {
  return JSON.stringify({ command: command, ...obj });
}

window.onbeforeunload = function (e) {
  ws.close()
};

window.onClickHandlerClose = () => {
  solve3.onClose();
  removeContent();
}

const removeContent = () => {
  document.getElementById("solve3-modal").innerHTML = "";
}

window.onSlide = (value) => {
  var val = parseInt(value / 10 * 2)
  var pos = 10 + val;
  solve3.setSolution(parseInt(val) - 31);
  document.getElementById("solve3-puzzle").style.left = pos.toString() + "px";
}

window.onSend = async () => {
  await solve3.sendSolution();
}

window.onRefresh = async () => {
  await solve3.onLoad();
}


window.onSuccess = async function (obj) {
  solve3.onSuccess(obj)
}


export default solve3;