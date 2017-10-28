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

const SERVER_PORT = '8080';

const fs = require('fs');
const url = require('url');
const WebSocket = require('ws');
const io = require('socket.io')
const http = require('http');
const LifeGameVirtualDom = require('../lib/LifeGameVirtualDom');

const options = {
  key: fs.readFileSync('ssl/key.pem'),
  cert: fs.readFileSync('ssl/cert.pem')
};
// const server = https.createServer(options);
const server = http.createServer().listen(SERVER_PORT);
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

  socket.of('/').on('connection', function connection(sio, req) {
    const ip = getIp(sio);
    console.log(`Connected client: ${ip} with token ${sio.handshake.query.token}`);

    sendInitialData(sio);

    sio.on('message', incoming);
  });

  socket.of('/').on('error', (e) => {
    console.log(`Error happened :( \n${e}`);
  });

  socket.of('/').on('close', () => {
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
}

function sendUpdates(data) {
  socket.of('/').send(JSON.stringify({
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
  		user: {
  			token: sio.handshake.query.token,
  			color: getRandomColor()
  		}
  	}
  }));
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
