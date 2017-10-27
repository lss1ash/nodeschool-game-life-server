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

const SERVER_PORT = '80';

const url = require('url');
const WebSocket = require('ws');
const LifeGameVirtualDom = require('../lib/LifeGameVirtualDom');

const wss = new WebSocket.Server({ port: SERVER_PORT }, () => console.log('Server started!'));

initGame({});
addHandlers();

function addHandlers() {
  wss.on('connection', function connection(ws, req) {
    ws.token = getToken(req);
    ws.ip = getIp(req);

    console.log(`Connected client: ${ws.ip} with token ${ws.token}`);

    sendInitialData(ws);

    ws.on('message', incoming);
  });

  wss.on('error', (e) => {
    console.log(`Error happened :( \n${e}`);
  });

  wss.on('close', () => {
    console.log(`Closed WebSocket Server`);
  });
}

function getToken(req) {
  const location = url.parse(req.url, true);
  if (location
    && Object.prototype.hasOwnProperty.call(location, 'query')
    && Object.prototype.hasOwnProperty.call(location.query, 'token')
    && location.query.token.length > 0) {
      return location.query.token;
    }
  return;
}

function getIp(req) {
  const ipAfterProxy = req.headers['x-forwarded-for'];
  const ipDirect = req.connection.remoteAddress;
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
  wss.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'UPDATE_STATE',
        data
      }));
    }
  });
}

function sendInitialData(ws) {
  ws.send(JSON.stringify({
  	type: 'INITIALIZE',
  	data: {
  		state: game.state,
  		settings: game.settings,
  		user: {
  			token: ws.token,
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
