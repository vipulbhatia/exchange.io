var uuid = require('base64id');

var Room = function() {
	var	id = 'room-'.concat(uuid.generateId()),
		clients = {};

	this.getId = function() {
		return id;
	};

	this.getClients = function() {
		return clients;
	};

	this.addClient = function(socket) {
		if(clients[socket.id] === undefined) clients[socket.id] = socket;
	};

	this.removeClient = function(client) {
		if(clients[client] !== undefined) delete clients[client];
	};

	this.broadcast = function(sender, message) {
		console.log('broadcast to:', id);		
		for(var i in clients) {
			if(clients[i].id === sender) continue;
			if(clients[i].type === 'tcp') clients[i].write(sender + ': ' + message + '\n');
			else clients[i].emit('message', sender + ': ' + message + '\n');
		}
	};

	return this;
};

module.exports = Room;