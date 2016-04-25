var express = require('express'),
	app = express(),
	http = require('http').createServer(app),
	io = require('socket.io')(http),
	bodyParser = require('body-parser');

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