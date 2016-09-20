var events = require('events').EventEmitter,
	util = require('util'),
	uuid = require('base64id'),
	Room = require('./room');

var Exchange = function() {
	var clients = {},
		rooms = {},
		configs = {};
		configs['response-type'] = ['JSON', 'TEXT'],
		configs['anonymous'] = ['TRUE', 'FALSE'];

	var getOutgoing = function(client, sender, message) {
		if(clients[client].socket.config['response-type'] === 'JSON') {
			if(sender !== 'server' && clients[sender].socket.config['anonymous'] === 'TRUE') sender = '';
			return JSON.stringify({'sender':sender,'message':message});// + '\n';
		} else {
			if(sender !== 'server' && clients[sender].socket.config['anonymous'] === 'TRUE') return message; //+ '\n';
			else return sender + ': ' + message;// + '\n';
		}
	}

	var send = function(sender, receiver, message) {
		console.log('sending...:', receiver);
		var outgoing;
		if(receiver.length > 0) {
			console.log('tcp send to', receiver[0]);
			for(var i=0; i<receiver.length; i++) {
				if(/^room\-/.test(receiver[i])) {
					console.log('broadcasting to room:', receiver);
					rooms[receiver[i]].broadcast(sender, message);
				} else {
					outgoing = getOutgoing(receiver, sender, message);
					if(clients[receiver[i]].socket.type === 'tcp') clients[receiver[i]].socket.write(outgoing);
					else clients[receiver[i]].socket.emit('message', outgoing);
				}
			}
		}
		else if(receiver[0] === 'everyone') {
			for(var i in clients) {
				outgoing = getOutgoing(i, sender, message);
				if(clients[i].socket.emit !== undefined) clients[i].socket.emit('message', JSON.stringify(data));
				if(clients[i].socket.write !== undefined) clients[i].socket.write(sender + ': ' + message);// + '\n');
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

	var createRoom = function(client, roomId=null) {
		var room = new Room(roomId);
		console.log('creating new room:', room.getId());
		send('server', [client], 'creating new room: ' + room.getId());
		room.addClient(clients[client].socket);
		rooms[room.getId()] = room;
		clients[client].rooms[room.getId()] = room;
		return room.getId();
	};

	var joinRoom = function(client, roomId) {
		console.log('joining room:', roomId);
		var room = 'room-'.concat(roomId);
		if(roomId.trim() === null) return 0;
		if(rooms[room] !== undefined) {
			rooms[room].addClient(clients[client].socket);
			if(clients[client].rooms[room] === undefined) clients[client].rooms[room] = rooms[room];
		} else {
			room = createRoom(client, roomId);
		}
		rooms[room].broadcast('server', client + ' joining room ' + roomId);
		//send('server', [client], 'creating new room: ' + room.getId());
		return;
	};

	var leaveRoom = function(client, room) {
		console.log('leaving room:', room);
		if(rooms[room] !== undefined) {
			rooms[room].removeClient(client);
			rooms[room].broadcast('server', client + ' leaving room ' + room);
		}
		if(clients[client].rooms[room] !== undefined) delete clients[client].rooms[room];
		//send('server', [client], 'creating new room: ' + room.getId());
		return;
	};

	var setConfig = function(client, key, newVal) {
		console.log('setting config:', key);
		newVal = newVal.toUpperCase();
		if(clients[client].socket.config[key] === newVal) {
			console.log(key, 'is already', newVal);
		}
		else if(configs[key].indexOf(newVal) !== -1) {
			console.log('changing', key, 'to', newVal);
			clients[client].socket.config[key] = newVal;
		}
		send('server', [client], key + ' is now ' + newVal);
		return;
	}

	var connectClient = function(client1, roomId, client2) {
		console.log('connectClient:', client1, client2);
		joinRoom(client1, roomId);
		joinRoom(client2, roomId);
		return;
	}

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
		client.config = {};
		if(client.type == 'tcp') client.config['response-type'] = 'TEXT';
		else client.config['response-type'] = 'JSON';
		client.config['anonymous'] = 'FALSE';
		clients[id] = {};
		clients[id].rooms = {};
		clients[id].socket = client;
		send('server', [id], id);
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
		var match;
		if(/^create\s+room\s+(.*?)$/i.test(message)) {
			match = /^create\s+room\s+(.*?)$/i.exec(message);
			createRoom(sender, match[1]);
			return;
		}

		if(/^join\s+room\s+(.*?)$/i.test(message)) {
			match = /^join\s+room\s+(.*?)$/i.exec(message);
			joinRoom(sender, match[1]);
			return;
		}

		if(/^leave\s+room\s+(.*)$/i.test(message)) {
			match = /^leave\s+room\s+(.*)$/i.exec(message);
			leaveRoom(sender, match[1]);
			return;
		}

		if(/^set\s+(.*)\s+(.*)$/i.test(message)) {
			match = /^set\s+(.*)\s+(.*)$/i.exec(message);
			console.log(match[1]);
			setConfig(sender, match[1], match[2]);
			return;
		}

		if(/^connect\s+(.*)$/i.test(message)) {
			match = /^connect\s+(.*)$/i.exec(message);
			send('server', ['room-'+match[1]], 'connect '+sender);
			return;
		}

		if(/^connection\s+(.*)\s+for\s+(.*)$/i.test(message)) {
			match = /^connection\s+(.*)\s+for\s+(.*)$/i.exec(message);
			connectClient(sender, match[1], match[2]);
			return;
		}

		if(clients[sender].socket.type == 'tcp') message += '\r';
		send(sender, receiver, message);
	});

	this.getrooms = function() {
		console.log(Object.keys(rooms));
		return Object.keys(rooms);
	}

	return this;
};

util.inherits(Exchange, events);

module.exports = Exchange;
