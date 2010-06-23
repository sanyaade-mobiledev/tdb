var TiDebug = {}
TiDebug.Debug = function(connection) {
	this._listeners = {};
	this._breakpoints = [];
	this._connected = false;
	
	if (connection) {
		this.setConnection(connection);
	}
	return this;
};
TiDebug.Debug.prototype = {
	get isConnected() {
		return this._connected;
	},
	
	setConnection: function(conn) {
		this.conn = conn;
		var self = this;
		conn.setOnConnect(function() { self._connected = true; self._fireEvent("connect"); });
		conn.setOnData(function() { self._receive.apply(self, arguments); });
		conn.setOnDisconnect(function() { self._connected = false; self._fireEvent("end"); });
		// conn.addListener("connect", function() { self._fireEvent("connect"); });
		// conn.addListener("end", function() { self._fireEvent("end"); });
		// conn.addListener("data", function() { self._receive.apply(self, arguments); });
	},
	
	_fireEvent: function(type, data) {
		var list = this._listeners[type];
		if (list) {
			for (var i=0, len=list.length; i < len; i++) {
				list[i](data);
			}
		}
	},
	
	_receive: function(data) {
		// Process data and make it nice
		this._fireEvent("data", data);
	},
	
	addListener: function(type, callback) {
		if (!this._listeners[type]) {
			this._listeners[type] = [];
		}
		if (this._listeners[type].indexOf(callback) === -1) {
			this._listeners[type].push(callback);
		}
		return callback;
	},
	
	removeListener: function(type, callback) {
		var list = this._listeners[type] || [],
		    idx = -1;
		if ((idx = list.indexOf(callback)) > -1) {
			list.splice(idx);
			return true;
		}
		return false;
	},
	
	play: function() {
		this.conn.send({"next":"continue"});
	},
	
	pause: function() {
		this.conn.send({"next":"pause"});
	},
	
	clearBreakpoint: function(file, line) {
		throw "Not Implemented!";
	},
	
	clearBreakpoints: function() {
		this._breakpoints = [];
		this.conn.send({"next":"clearbreakpoints"});
	},
	
	setBreakpoint: function(file, line) {
		this._breakpoints.push({source:file,line:line});
		this.conn.send({"next":"setbreakpoint","source":file,"line":line});
	},
	
	breakpoints: function() {
		var points = this._breakpoints.slice(0);
		points.toString = function() {
			var str = "";
			for (var c=0;c<this.length;c++) {
				str += this[c].source+" : " +this[c].line + "\n";
			}
			return str;
		};
		return points;
	},
	
	stepOver: function() {
		this.conn.send({"next":"stepover"});
	},
	
	stepIn: function() {
		this.conn.send({"next":"stepin"});
	},
	
	stepOut: function() {
		this.conn.send({"next":"stepout"});
	},
	
	evaluate: function(expr) {
		this.conn.send({"next":"evaluate","expression":expr});
	}
};

// Just abstracts how the raw connection is handled
TiDebug.NodeConnection = function(stream) {
	stream.setEncoding('utf8');
	this.connection = stream;
};
TiDebug.NodeConnection.prototype = {
	send: function(obj) {
		this.connection.write(JSON.stringify(obj)+"\r\n");
	},
	
	setOnConnect: function(callback) {
		this.connection.addListener("connect", callback);
	},
	
	setOnData: function(callback) {
		var _buffer = "",
		    _buffer2 = "";
		var self = this;
		this.connection.addListener("data", function(data) {
			var idx;
			_buffer += data;
			var result;
			while ((idx = _buffer.indexOf("\r\n")) > -1) {
				_buffer2 += _buffer.substring(0, idx);
				_buffer = _buffer.substring(idx + 2);
				try {
					result = JSON.parse(_buffer2);
					_buffer2 = "";
					callback(result);
				}
				catch (ex) {}
			}
		});
	},
	
	setOnDisconnect: function(callback) {
		this.connection.addListener("end", callback);
	},
	
	close: function() {
		this.connection.end();
	}
};

TiDebug.TiConnection = function() {
	var self = this;
	var server = Titanium.Network.createTCPServerSocket(function(client) {
		self.connection = client;
		if (self.connectCallback) {
			self.connectCallback();
		}
		if (self.readCallback) {
			self.connection.onRead(self.readCallback);
		}
		if (self.disconnectCallback) {
			self.connection.onReadComplete(self.disconnectCallback);
		}
	});
	server.listen(9988);
	this.server = server;
	this._buffer = "";
};
TiDebug.TiConnection.prototype = {
	send: function(obj) {
		this.connection.write(JSON.stringify(obj) + "\r\n");
	},
	
	setOnConnect: function(callback) {
		this.connectCallback = callback;
	},
	
	setOnData: function(callback) {
		var _buffer = "",
		    _buffer2 = "";
		var self = this;
		this.readCallback = function(data) {
			var idx;
			_buffer += data;
			var result;
			while ((idx = _buffer.indexOf("\r\n")) > -1) {
				_buffer2 += _buffer.substring(0, idx);
				_buffer = _buffer.substring(idx + 2);
				try {
					result = JSON.parse(_buffer2);
					_buffer2 = "";
					callback(result);
				}
				catch (ex) {}
			}
		};
		if (this.connection) {
			this.connection.onRead = this.readCallback;
		}
	},
	
	setOnDisconnect: function(callback) {
		this.disconnectCallback = callback;
		if (this.connection) {
			this.connection.onReadComplete(callback);
		}
	},
	
	close: function() {
		if (this.connection) {
			this.connection.close();
		}
		this.server.close();
	}
};

TiDebug.connection = {
	throwErrors: true,
	
	send: function() {
		if (this.throwErrors) {
			throw "No debugger connection!";
		}
	},
	
	setOnConnect: function() {},
	setOnData: function() {},
	setOnDisconnect: function() {},
	close: function() {}
};

// CommonJS
if (typeof(exports) != "undefined") {
	for (var item in TiDebug) {
		exports[item] = TiDebug[item];
	}
}