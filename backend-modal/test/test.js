import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:4001');
const ws2 = new WebSocket('ws://localhost:4001');
const ws3 = new WebSocket('ws://localhost:4001');


ws.on('open', async function open() {
  console.log("open")
  ws.send('id');
  ws.send('ip');
  
  ws.send('amount')
});

ws.on('message', async function message(data) {
  console.log('received: %s', data);
});





const main = async () => {
  let polling = true;

  // while(polling) {
  //   if(ws.OPEN) {
  //     ws.send('id');
  //     polling = false;
  //   }
  // }
}

main().then(() => {
  // process.exit(1)
});
