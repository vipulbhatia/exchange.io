var uuid = require('base64id');

var Room = function(roomId=null) {
	var	id = 'room-'.concat(roomId || uuid.generateId()),
		clients = {};

	this.getId = function() {
		return id;
	};

	this.getClients = function() {
		return Object.keys(clients);
	};

	this.addClient = function(socket) {
		if(clients[socket.id] === undefined) clients[socket.id] = socket;
	};

	this.removeClient = function(client) {
		if(clients[client] !== undefined) delete clients[client];
	};

	this.broadcast = function(sender, message) {
		console.log(sender + ' broadcasting to:', id);
		var senderId = sender;
		var outgoing;
		for(var i in clients) {
			if(clients[i].id === sender) continue;
			if(clients[i].config['response-type'] === 'JSON') {
				if(sender !== 'server' && clients[sender].config['anonymous'] === 'TRUE') senderId = '';
				outgoing = JSON.stringify({'sender':senderId,'message':message});// + '\n';
			} else {
				if(sender !== 'server' && clients[sender].config['anonymous'] === 'TRUE') outgoing = message;// + '\n';
				else outgoing = sender + ': ' + message;// + '\n';
			}
			if(clients[i].type === 'tcp') clients[i].write(outgoing);
			else clients[i].emit('message', outgoing);
		}
	};

	return this;
};

module.exports = Room;
