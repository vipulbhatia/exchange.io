var events = require('events').EventEmitter,
	util = require('util'),
	uuid = require('base64id');
	Room = require('./room');

var Exchange = function() {
	var clients = {},
		rooms = {};

	var send = function(sender, receiver, message) {
		console.log('sending...:');
		if(receiver.length > 0) {
			console.log('tcp send to', receiver[0]);
			for(var i=0; i<receiver.length; i++) {
				if(/^room\-/.test(receiver[i])) {
					console.log('broadcasting to room:', receiver);
					rooms[receiver[i]].broadcast(sender, message);
				}	
				else if(clients[receiver[i]].socket.type === 'tcp') clients[receiver[i]].socket.write(sender + ': ' + message + '\n');
				else clients[receiver[i]].socket.emit('message', sender + ': ' + message + '\n');
			}			
		}
		else if(receiver[0] === 'everyone') {
			for(var i in clients) {
				if(clients[i].socket.emit !== undefined) clients[i].socket.emit('message', sender + ': ' + message + '\n');
				if(clients[i].socket.write !== undefined) clients[i].socket.write(sender + ': ' + message + '\n');
			}
		} 
		else {
			console.log('broadcasting to all rooms for client');
			for(var i in clients[sender].rooms) {
				console.log('sending to room:', clients[sender].rooms[i].getId());
				clients[sender].rooms[i].broadcast(sender, message);
			}
		}
		return;
	};

	var createRoom = function(client) {
		var room = new Room();
		console.log('creating new room:', room.getId());
		send('server', [client], 'creating new room: ' + room.getId());
		room.addClient(clients[client].socket);
		rooms[room.getId()] = room;
		clients[client].rooms[room.getId()] = room;
		return;
	};

	var joinRoom = function(client, room) {
		console.log('joining room:', room);
		if(rooms[room] !== undefined) {
			rooms[room].addClient(clients[client].socket);
			if(clients[client].rooms[room] === undefined) clients[client].rooms[room] = rooms[room];
		} else {
			createRoom(client);
		}
		rooms[room].broadcast('server', client + ' joining room ' + room);
		//send('server', [client], 'creating new room: ' + room.getId());
		return;
	};

	//public interface for exchange
	this.on('add', function(client) {
		console.log('addClient');
		var id = "";
		if(client.id !== undefined) {
			id = client.id;
		} else {
			id = uuid.generateId();
			client.id = id;
		}
		clients[id] = {};
		clients[id].rooms = {};
		clients[id].socket = client;
		send('server', [client.id], client.id);
		return;
	});

	this.on('clean', function(client) {
		console.log('cleaning exchange');
		console.log('client rooms:', clients[client].rooms);
		for(var i in clients[client].rooms) {
			clients[client].rooms[i].removeClient(client);
			send('server', [i], client + ' removed from room ' + i);
			if(clients[client].rooms[i].getClients().length === 0) {
				console.log('deleting empty room:', i);
				delete rooms[i];
			}
		}
		delete clients[client];
		console.log('clients:', Object.keys(clients));
		console.log('rooms:', Object.keys(rooms));
	});

	this.on('post', function(sender, receiver, message) {
		if(/^create$/i.test(message)) {
			createRoom(sender);
			return;
		}

		if(/^join\s+room\s+(.*?)$/i.test(message)) {
			var match = /^join\s+room\s+(.*?)$/i.exec(message);
			joinRoom(sender, match[1]);
			return;
		}

		send(sender, receiver, message);
	});
	
	return this;
};

util.inherits(Exchange, events);

module.exports = Exchange;