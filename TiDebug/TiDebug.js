var TiDebug = {}
TiDebug.Debug = function(connection) {
	if (connection) {
		this.setConnection(connection);
	}
	this._listeners = {};
	this.breakpoints = [];
	return this;
};
TiDebug.Debug.prototype = {
	setConnection: function(conn) {
		this.conn = conn;
		var self = this;
		conn.setOnConnect(function() { self._fireEvent("connect"); });
		conn.setOnData(function() { self._receive.apply(self, arguments); });
		conn.setOnDisconnect(function() { self._fireEvent("end"); });
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
	
	"continue": function() {
		this.conn.send({"next":"continue"});
	},
	
	pause: function() {
		this.conn.send({"next":"pause"});
	},
	
	clear: function(file, line) {
		throw "Not Implemented!";
	},
	
	clearAll: function() {
		this._breakpoints = [];
		this.conn.send({"next":"clearbreakpoints"});
	},
	
	breakpoint: function(file, line) {
		sys.debug("adding breakpoint to "+file+" at line: "+line);
		this._breakpoints.push({source:file,line:line});
		this.conn.send({"next":"setbreakpoint","source":file,"line":line});
	},
	
	breakpoints: function() {
		if (this._breakpoints.length == 0) {
			sys.debug("No breakpoints set");
			return;
		}
		for (var c=0;c<this._breakpoints.length;c++) {
			sys.debug(this._breakpoints[c].source+" : " +this._breakpoints[c].line);
		}
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
	}
};

TiDebug.TiConnection = function() {
	var self = this;
	var server = Titanium.Network.createTCPServerSocket(function(client) {
		self.connection = client;
		if (self.connectCallback) {
			self.connectCallback();
		}
	});
	server.listen(9988);
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
		this.connection.onRead(function(data) {
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
		this.connection.onReadComplete(callback);
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
	setOnDisconnect: function() {}
};

// CommonJS
if (typeof(exports) != "undefined") {
	for (var item in TiDebug) {
		exports[item] = TiDebug[item];
	}
}