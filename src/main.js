'use strict';

//
// YOUR CODE GOES HERE...
//
// ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
// ░░░░░░░░░░▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄░░░░░░░░░░░
// ░░░░░░░░▄▀░░░░░░░░░░░░▄░░░░░░░▀▄░░░░░░░░
// ░░░░░░░░█░░▄░░░░▄░░░░░░░░░░░░░░█░░░░░░░░
// ░░░░░░░░█░░░░░░░░░░░░▄█▄▄░░▄░░░█░▄▄▄░░░░
// ░▄▄▄▄▄░░█░░░░░░▀░░░░▀█░░▀▄░░░░░█▀▀░██░░░
// ░██▄▀██▄█░░░▄░░░░░░░██░░░░▀▀▀▀▀░░░░██░░░
// ░░▀██▄▀██░░░░░░░░▀░██▀░░░░░░░░░░░░░▀██░░
// ░░░░▀████░▀░░░░▄░░░██░░░▄█░░░░▄░▄█░░██░░
// ░░░░░░░▀█░░░░▄░░░░░██░░░░▄░░░▄░░▄░░░██░░
// ░░░░░░░▄█▄░░░░░░░░░░░▀▄░░▀▀▀▀▀▀▀▀░░▄▀░░░
// ░░░░░░█▀▀█████████▀▀▀▀████████████▀░░░░░░
// ░░░░░░████▀░░███▀░░░░░░▀███░░▀██▀░░░░░░░
// ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
//
// Nyan cat lies here...
//
let game = null;

const SERVER_PORT = '8000';

const fs = require('fs');
const io = require('socket.io')
const https = require('https');
const LifeGameVirtualDom = require('../lib/LifeGameVirtualDom');

const options = {
  key: fs.readFileSync('ssl/key.key'),
  cert: fs.readFileSync('ssl/cert.crt')
};

const server = https.createServer(options).listen(SERVER_PORT, () => console.log('HTTPS server started!'));
const socket = new io(server, {
  transports: ['websocket'],
  path: '/'
});

initGame({});
addHandlers();

function addHandlers() {
  socket.use((sio, next) => {
    const token = sio.handshake.query.token;
    if (token && token !== '') {
      return next();
    }
    return next(new Error('Authentication error'));
  });

  socket.of('/api').on('connection', function connection(sio, req) {
    const ip = getIp(sio);
    console.log(`Connected client: ${ip} with token ${sio.handshake.query.token}`);

    sendInitialData(sio);

    sio.on('message', incoming);
  });

  socket.of('/api').on('error', (e) => {
    console.log(`Error happened :( \n${e}`);
  });

  socket.of('/api').on('close', () => {
    console.log(`Closed WebSocket Server`);
  });
}

function getIp(req) {
  const ipAfterProxy = req.handshake.headers['x-forwarded-for'];
  const ipDirect = req.handshake.address;
  return ipAfterProxy ? ipAfterProxy : ipDirect;
}

function incoming(message) {
  let received = {};
  try {
    received = JSON.parse(message);
  } catch(err) {
    console.log(`Incorrect message came - parsing error \n${err}`);
    return;
  }

  if (received
    && Object.prototype.hasOwnProperty.call(received, 'type')
    && Object.prototype.hasOwnProperty.call(received, 'data')) {
      if (received.type === 'ADD_POINT') {
        game.applyUpdates(received.data);
      }
    }
}

function initGame({updateInterval, pointSize, fieldX, fieldY}) {
	game = new LifeGameVirtualDom(updateInterval, pointSize, fieldX, fieldY);
	game.sendUpdates = sendUpdates;
  game.userInit = userInit;
}

function sendUpdates(data) {
  socket.of('/api').send(JSON.stringify({
    type: 'UPDATE_STATE',
    data
  }));
}

function sendInitialData(sio) {
  sio.send(JSON.stringify({
  	type: 'INITIALIZE',
  	data: {
  		state: game.state,
  		settings: game.settings,
  		user: game.userInit(sio.handshake.query.token)
      // {
  		// 	token: sio.handshake.query.token,
  		// 	color: game.getUserColor(sio.handshake.query.token)
  		// }
  	}
  }));
}

function userInit(token) {
  for (let i = 0; i < this.userList.length; i++) {
    if (this.userList[i].token === token) {
      return {
        token: this.userList[i].token,
        color: this.userList[i].color
      };
    }
  }
  const newUser = {
    token,
    color: getRandomColor()
  };
  this.userList.push(newUser);
  return newUser;
}

function getRandomColor() {
  return `#${getHexDigit()}${getHexDigit()}${getHexDigit()}`;
}

function getHexDigit() {
  return getRandomInt(0, 16).toString(16);
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}
