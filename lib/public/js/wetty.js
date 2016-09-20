var term;
var socket = io(location.origin, {path: ''})
var buf = '';

function Wetty(argv) {
    this.argv_ = argv;
    this.io = null;
    this.pid_ = -1;
}

Wetty.prototype.run = function() {
    this.io = this.argv_.io.push();

    this.io.onVTKeystroke = this.sendString_.bind(this);
    this.io.sendString = this.sendString_.bind(this);
    this.io.onTerminalResize = this.onTerminalResize.bind(this);
}

Wetty.prototype.sendString_ = function(str) {
    console.log('sendString_:', str);
    socket.emit('message', str);
};

Wetty.prototype.onTerminalResize = function(col, row) {
    console.log('resize:', col, row);
    socket.emit('message', { col: col, row: row });
};

socket.on('connect', function() {
    console.log('connected to exchange...');
    //socket.emit('message', 'set response-type text');
    socket.emit('message', 'connect vipul-Dell-Precision-M3800');

    lib.init(function() {
        hterm.defaultStorage = new lib.Storage.Local();
        term = new hterm.Terminal();
        window.term = term;
        term.decorate(document.getElementById('terminal'));

        term.setCursorPosition(0, 0);
        term.setCursorVisible(true);
        term.prefs_.set('ctrl-c-copy', true);
        term.prefs_.set('ctrl-v-paste', true);
        term.prefs_.set('use-default-window-copy', true);

        term.runCommandClass(Wetty, document.location.hash.substr(1));
        console.log('resizing...');
        socket.emit('message', {
            col: term.screenSize.width,
            row: term.screenSize.height
        });

        if (buf && buf != '')
        {
            term.io.writeUTF16(buf);
            buf = '';
        }
    });
});

socket.on('message', function(data) {
    console.log('received:', data);
    data = JSON.parse(data);
    if(data.sender == '') {
        if (!term) {
            buf += data.message;
            return;
        }
        term.io.writeUTF16(data.message);
    }
});

socket.on('disconnect', function() {
    console.log("Socket.io connection closed");
});
