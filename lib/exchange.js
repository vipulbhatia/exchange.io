var express = require('express'),
	app = express(),
	http = require('http').createServer(app),
	io = require('socket.io')(http),
	bodyParser = require('body-parser'),
	net = require('net'),
	emitter = require('events').EventEmitter,
	uuid = require('base64id');

//storage variables
var clients = {},
	rooms = {};

//middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));

//routes
app.use('/', express.static(__dirname + '/public/views'));
app.use('/js', express.static(__dirname + '/public/js'));
app.use('/css', express.static(__dirname + '/public/css'));

app.get('/', function(req, res) {
	res.sendFile('index.html');
});

io.on('connection', function(ws) {
	ws.token = addToClients(ws);
	ws.emit('message', 'hi...from exchange...');
	ws.on('message', function(msg) {
		//console.log('got message:', msg);
	});
});

http.listen(8000, function() {
	console.log('listening on port 8000...');
});


net.createServer(function(tcp) {
	addToClients(tcp);

	tcp.on('data', function(d) {
		d = d.toString().trim();
		//broadcast(tcp.token, d);
		console.log(d);
		if(/^create$/i.test(d)) {
			createRoom(tcp.cuid);
			return;
		}

		if(/^join\s+(.*?)$/i.test(d)) {
			var match = /^join\s+(.*?)$/i.exec(d);
			joinRoom(tcp.cuid, match[1]);
			return;
		}

		send(tcp.cuid, d);
	});

	tcp.on('end', function() {
		console.log('tcp client dropped...');
		clean(tcp.cuid);
	});

	tcp.on('error', function(err) {
		console.log('error:', err);
	});
})

.listen(8001, function() {
	console.log('tcp server listening on 8001...');
});

var clean = function(client) {
	for(var i=0; i<clients[client].rooms.length; i++) {
		for(var j=0; j<rooms[clients[client].rooms[i]].length; j++) {
			console.log('removing client from room:', clients[client].rooms[i]);
			rooms[clients[client].rooms[i]].splice(rooms[clients[client].rooms[i]].indexOf(client), 1);
		}
		console.log(rooms[clients[client].rooms[i]].length);
		if(rooms[clients[client].rooms[i]].length === 0) {
			console.log('deleting empty room:', rooms[clients[client].rooms[i]]);
			delete rooms[clients[client].rooms[i]];
		}
	}
	delete clients[client];
	console.log('clients:', Object.keys(clients));
	console.log('rooms:', Object.keys(rooms));
};

var send = function(client, msg) {
	for(var i=0; i<clients[client].rooms.length; i++) {
		console.log(i, client);
		for(var j=0; j<rooms[clients[client].rooms[i]].length; j++) {
			if(rooms[clients[client].rooms[i]][j] === client) continue;
			if(clients[rooms[clients[client].rooms[i]][j]].emit != undefined) clients[rooms[clients[client].rooms[i]][j]].emit('message', msg + '\n');
			if(clients[rooms[clients[client].rooms[i]][j]].write != undefined) clients[rooms[clients[client].rooms[i]][j]].write(msg + '\n');
		}
	}
	return;	
};

var sendToClient = function(client, msg) {
	if(clients[client].emit !== undefined) clients[client].emit('message', msg + '\n');
	if(clients[client].write !== undefined) clients[client].write(msg + '\n');
	return;
};

var createRoom = function(client) {
	room = getRoom();
	console.log('creating new room:', room);
	sendToClient(client, 'creating new room: ' + room);
	if(rooms[room] === undefined) rooms[room] = [];
	rooms[room].push(client);
	clients[client].rooms.push(room);
	return;
};

var joinRoom = function(client, room) {
	console.log('joining room:', room);
	sendToClient(client, 'joining room: ' + room);
	if(rooms[room] !== undefined) {
		if(rooms[room].indexOf(client) <= -1) rooms[room].push(client);
		if(clients[client].rooms.indexOf(room) <= -1) clients[client].rooms.push(room);
	} else {
		createRoom(client);
	}
	return;
};

var broadcast = function(room, msg) {
	for(var i=0; i<rooms[room].length; i++) {
		if(clients[i].emit != undefined) clients[i].emit('message', msg);
		if(clients[i].write != undefined) clients[i].write(msg);
	}
};

var addToClients = function(client) {
	var cuid = 'client-'.concat(uuid.generateId());
	if(clients[cuid] === undefined) {
		console.log('adding client:', cuid);
		clients[cuid] = client;
		client.rooms = [];
		client.cuid = cuid;
	}
	return;
};

var getRoom = function() {
	var ruid = 'room-'.concat(uuid.generateId());
	return ruid;
};