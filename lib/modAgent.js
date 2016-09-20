var socket = require('socket.io-client'),
	pty = require('pty.js'),
	os = require('os');

io = socket('http://127.0.0.1:8000');

io.on('connect', function(){
	console.log('io connected...');
	io.emit('message', 'join room ' + os.hostname());
	io.emit('message', 'set anonymous true');
});

io.on('message', function(data) {
	console.log('message:', data);
	data = JSON.parse(data);
	if(/^connect\s+(.*)$/.test(data.message.trim())) {
		var match;
		match = /^connect\s+(.*)$/.exec(data.message.trim());
		var term;
		var io_1 = socket('http://127.0.0.1:8000');
		io_1.on('connect', function() {
			term = pty.spawn('/bin/login', [], {
				name: 'xterm-256color',
				cols: 80,
				rows: 30
			});

			io_1.emit('message', 'connection ' + os.hostname() + '-' + term.pid + '-TTY' + ' for ' + match[1]);
			io_1.emit('message', 'set anonymous true');

			console.log((new Date()) + " PID=" + term.pid + " STARTED");

			term.on('data', function(data) {
				io_1.emit('message', data);
			});

			term.on('exit', function(code) {
				console.log((new Date()) + " PID=" + term.pid + " ENDED");
				term.end();
				term = undefined;
			});
		});
		io_1.on('message', function(data) {
			console.log('message on io_1:', data);
			data = JSON.parse(data);
			if(term) {
				if(data.message.col != undefined) {
					console.log('resizing...');
					term.resize(data.col, data.row);
					return;
				}
				if(data.sender != 'server') term.write(data.message);
			}
		});

		return;
	}
});

io.on('error', function(err) {
	console.log(err);
});

io.on('disconnect', function() {
	console.log('disconnected...');
	io = socket('http://127.0.0.1:8000');
});
