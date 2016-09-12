var	net = require('net'),
	spawn = require('child_process').spawn,
	on_death = require('death'),
	Tail = require('file-tail'),
	events = require('events').EventEmitter,
	Parser = require('jsonparse'),
	p = new Parser(),
	util = require('util'),
	os = require('os'),
	pty = require('pty.js'),
	term,
	masterServer = 'localhost';

var agent = net.connect({port: 8001, host: masterServer}, function(){
		console.log('connected to master...');
		agent.write('set anonymous true\n');
		agent.write('set response-type JSON\r\n');
		agent.write('join room ' + os.hostname() + '\r\n');
	});

	agent.on('data', function(chunk) {
		p.write(chunk);
		p.onValue = function(json) {
			if(this.stack.length <= 0) {
				agent.emit('json', json);
			}
		}
	});

	agent.on('end', function(){
		console.log('connection ended...');
		//res.write(res.data);
		//res.end();
	});

	agent.on('json', function(data){
		console.log('got message: ' + data.message);
		if(data.sender === 'server') return;
		if(/^connect\s+(.*)$/.test(data.message)) {
			var match = /^connect\s+(.*)$/.exec(data.message);
			var child_1, child_2;
			var conn = net.connect({port: 8001, host: masterServer}, function(){
				console.log('created child connection back to master...');
				conn.write('set anonymous true\n');
				conn.write('set response-type JSON\r\n');
				conn.write('join room lol\r\n');
				//console.log(child_1.pid);
				term = pty.spawn('sh', [], {
				  name: 'xterm-color',
				  cols: 80,
				  rows: 30,
				  cwd: process.env.HOME,
				  env: process.env
				});

				term.on('data', function(data) {
				  console.log(data);
				  conn.write(data);
				});
				/*child_1 = spawn('/bin/sh', [], { stdio: [ 'pipe', 'pipe', 'pipe' ], shell: true });
				conn.write('set anonymous true\n');
				conn.write('set response-type JSON\r\n');
				conn.write('join room ' + os.hostname() + '-' + child_1.pid + '\r\n');
				console.log(child_1.pid);
				child_1.stdout.pipe(conn);
				child_1.stderr.pipe(conn);
				child_1.on('error', function(err){
					console.log(err);
				});
				child_1.on('close', function(err){
					console.log(err);
				});
				child_1.on('exit', function(code, signal) {
					console.log('child_1 exited:', code, signal);
				});*/
			});

			/*on_death(function(sig, err){
				console.log('got signal: ' + sig);
				console.log(err);
			});*/

			conn.on('data', function(chunk) {
				p.write(chunk);
				p.onValue = function(json) {
					if(this.stack.length <= 0) {
						conn.emit('json', json);
					}
				}
			});

			conn.on('json', function(d){
				console.log('got command: ' + d.message);
				term.write(d.message + '\r');
				//child_1.stdin.write(d.message + '\n');
			});

			conn.on('end', function(){
				console.log('connection ended...');
			});
			conn.on('close', function(){
				console.log('connection closed...');
			});
			conn.on('error', function(){
				console.log('connection ended with error...');
			});
			return;
		}

		var child = spawn(data.message, [], {shell:true});
		console.log('after ');
		//child.pipe(agent);
		child.stdout.on('data', function(d){
			d = d.toString();
			console.log('data: ' + d);
			//agent.write(d);
		});
		child.on('close', function(){
			//console.log('connection closed...');
			//agent.write('token:' + data.token + ':zzz');
		});
		child.on('error', function(err){
			console.log('connection threw error: ' + err);
		});
		child.stderr.on('data', function(d){
			console.log(d.toString());
			//agent.write(d);
		});
	});

console.log("waiting for callbacks");
