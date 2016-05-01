var express = require('express'),
	app = express(),
	http = require('http').createServer(app),
	io = require('socket.io')(http),
	bodyParser = require('body-parser'),
	net = require('net'),
	emitter = require('events').EventEmitter,
	Exchange = require('./exchange'),
	serverExchange = new Exchange();

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

app.post('/room/:room', function(req, res) {
	console.log(req.body.message);
	serverExchange.emit('post', req.connection.remoteAddress, [req.params.room], req.body.message);
	res.writeHead(200);
	res.end('message posted to room:', req.params.room);
});

io.on('connection', function(ws) {
	ws.type = 'ws';
	serverExchange.emit('add', ws);
	ws.emit('message', 'hi...from exchange...');
	ws.on('message', function(d) {
		d = d.toString().trim();
		console.log(d);
		serverExchange.emit('post', ws.id, [], d);
	});

	ws.on('disconnect', function() {
		console.log('ws client dropped...');
		serverExchange.emit('clean', ws.id);
	});

	ws.on('error', function(err) {
		console.log('ws error:', err, err.stack);
	});
});

http.listen(8000, function() {
	console.log('listening on port 8000...');
});

net.createServer(function(tcp) {
	tcp.type = 'tcp';
	serverExchange.emit('add', tcp);

	tcp.on('data', function(d) {
		d = d.toString().trim();
		console.log(d);
		serverExchange.emit('post', tcp.id, [], d);
	});

	tcp.on('end', function() {
		console.log('tcp client dropped...');
		serverExchange.emit('clean', tcp.id);
	});

	tcp.on('error', function(err) {
		console.log('error:', err);
	});
})

.listen(8001, function() {
	console.log('tcp server listening on 8001...');
});