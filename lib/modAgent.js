var socket = require('socket.io-client'),
	pty = require('pty.js'),
	os = require('os');

var master = process.argv[2] || '127.0.0.1',
	port = process.argv[3] || 8082,
	nsp = process.argv[4] || 'admin';

io = socket('http://' + master + ':' + port + '/' + nsp);

io.on('connect', function(){
	console.log('io connected...');
	io.emit('auth', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwidXNlcm5hbWUiOiJhZG1pbiIsIm5zcCI6ImFkbWluIn0.CjVLTOLcEOL8ltb13-SjWgt48GYvdOuMvRjRqHgybCo');
	io.emit('join', os.hostname() + '-SSH');
	//io.emit('message', 'set anonymous true');
});

io.on('connect-back', function(data) {
	console.log('message:', data);
	//data = JSON.parse(data);
	var term;
	var pid;
	var io_1 = socket('http://' + master + ':' + port + '/' + nsp);
	var disconnectClient;

	io_1.on('connect', function() {
		io_1.emit('auth', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwidXNlcm5hbWUiOiJhZG1pbiIsIm5zcCI6ImFkbWluIn0.CjVLTOLcEOL8ltb13-SjWgt48GYvdOuMvRjRqHgybCo');
		term = pty.spawn('/bin/login', [], {
			name: 'xterm-256color',
			cols: 80,
			rows: 30
		});
		pid = term.pid;
		var roomId = data.sender.toUpperCase() + '-' + os.hostname() + '-' + pid + '-TTY';

		io_1.emit('join', roomId);

		console.log(data.sender + ': ' + (new Date()) + " PID=" + pid + " STARTED");

		term.on('data', function(data) {
			io_1.emit('tty', data);
		});

		term.on('exit', function(code) {
			console.log(data.sender + ': ' + (new Date()) + " PID=" + pid + " ENDED");
			//term.end();
			term = undefined;
			io_1.disconnect();
		});

		disconnectClient = setInterval(function() {
			io_1.emit('tty', 'session closed due to inactivity');
			console.log('disconnecting client:', pid, 'due to inactivity');
		    io_1.disconnect();
			term.end();
			term = undefined;
			clearInterval(disconnectClient);
	    }, 60000);
	});

	io_1.on('resize', function(data) {
		term.resize(data.col, data.row);
	});

	io_1.on('message', function(data) {
		clearInterval(disconnectClient);
		if(term) {
			if(data.sender != 'server') term.write(data.message);
		}

		disconnectClient = setInterval(function() {
			io_1.emit('tty', 'session closed due to inactivity');
			console.log('disconnecting client:', pid, 'due to inactivity');
		    io_1.disconnect();
			term.end();
			term = undefined;
			clearInterval(disconnectClient);
	    }, 600000);
	});

	return;
});

io.on('error', function(err) {
	console.log(err);
});

io.on('disconnect', function() {
	console.log('disconnected...');
	io = socket('http://' + master + ':' + port);
});
