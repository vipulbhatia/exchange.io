var express = require('express'),
	app = express(),
	http = require('http').createServer(app),
	io = require('socket.io')(http),
	bodyParser = require('body-parser'),
	net = require('net'),
	Exchange = require('./exchange'),
	serverExchange = new Exchange();

var master = process.argv[2] || 'localhost';

//middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));

//routes
//app.use('/', express.static(__dirname + '/public/views'));
app.set('views', __dirname + '/public/views');
app.set('view engine', 'pug');

app.use('/js', express.static(__dirname + '/public/js'));
app.use('/css', express.static(__dirname + '/public/css'));
app.use('/wetty', express.static(__dirname + '/public/wetty'));

app.get('/', function(req, res) {
	res.render('index', {'master':master});
});

app.get('/term', function(req, res) {
	res.sendFile(__dirname + '/public/views/wetty.html');
});

app.get('/api/getrooms', function(req, res) {
	res.header('Access-Control-Allow-Origin', '*')
	res.json({'results':serverExchange.getrooms()});
});

app.route('/room/:room')
	.get(function(req, res) {
		res.render('index', {'room':req.params.room, 'master':master});
	})
	.post(function(req, res) {
		console.log(req.body.message);
		serverExchange.emit('post', req.connection.remoteAddress, [req.params.room], req.body.message);
		res.writeHead(200);
		res.end('message posted to room:', req.params.room);
	});

io.on('connection', function(ws) {
	ws.type = 'ws';
	serverExchange.emit('add', ws);
	ws.on('message', function(d) {
		/*d = d.toString().trim();
		console.log(d);
		var msg = d.split(/\r\n|\n|\r/);
		for(var i=0; i<msg.length; i++) {
			serverExchange.emit('post', ws.id, [], msg[i]);
		}*/
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
	console.log('listening on port 8000 on', master);
});

var tcpServer = net.createServer(function(tcp) {
	tcp.type = 'tcp';
	serverExchange.emit('add', tcp);

	tcp.on('data', function(d) {
		d = d.toString().trim();
		console.log(d);
		var msg = d.split(/\r\n|\n|\r/);
		for(var i=0; i<msg.length; i++) {
			if(msg[i].trim() !== '') serverExchange.emit('post', tcp.id, [], msg[i]);
		}
	});

	tcp.on('end', function() {
		console.log('tcp connection ended...', tcp.id);
		//serverExchange.emit('clean', tcp.id);
	});

	tcp.on('close', function() {
		console.log('tcp client closed after error...', tcp.id);
		serverExchange.emit('clean', tcp.id);
	});

	tcp.on('error', function(err) {
		console.log('error:', err);
	});
})

tcpServer.listen(8001, function() {
	console.log('tcp server listening on port 8001');
});

module.exports.tcpServer = tcpServer;
module.exports.httpServer = http;
