/**
 * Appcelerator Titanium Mobile
 * Copyright (c) 2010 by Appcelerator, Inc. All Rights Reserved.
 * Licensed under the terms of the Apache Public License
 * Please see the LICENSE included with this distribution for details.
 */

var DEBUG_PORT = 9988;

var sys = require('sys'),
    net = require('net'),
    TiDebug = require('./TiDebug/TiDebug');


if (process.argv.length!=3)
{
  sys.puts("Usage: tdb [ipaddress]");
  process.exit()
}

var breakpoints = [];
var connection = null;


process.argv
var ipaddress = process.argv[2];

function PauseCommand(event,conn)
{
  /*
    var result = {"next":"step"};
    if (pendingBreakpoints.length > 0)
    {
      result = {"next":"addbreakpoints","breakpoints":pendingBreakpoints};  
      pendingBreakpoints = [];
    }
    return result;
  */
}

// FROM DEBUGGER
var commands = {
  'paused': PauseCommand
};

var debug;
net.createServer(function(stream) {
	var nodeConn = new TiDebug.NodeConnection(stream);
	debug = new TiDebug.Debug(nodeConn);
	debug.addListener("connect", function() {
		sys.debug("connected");
		sys.print("(tdb) ");
	});
	debug.addListener("end", function() {
		sys.debug("disconnected");
		sys.print("(tdb) ");
	});
	debug.addListener("data", function(chunk) {
		var input = JSON.parse(chunk);
		sys.debug("receiving data: " + JSON.stringify(input));
		var command = input["event"];
		var handler = commands[command];
		if (handler) {
			handler(input, nodeConn);
		}
		sys.print("(tdb) ");
	});
}).listen(DEBUG_PORT, ipaddress);
sys.debug("debugger listening on " + DEBUG_PORT);

function QuitHandler(args)
{
  process.exit();
}

function HelpHandler(args)
{
  for (var key in handlers)
  {
    var handler = handlers[key];
    if (handler.ignore) continue;  
    sys.debug(key+': '+handler.help);
  }
}


var handlers = 
{
  'quit': {'handler':QuitHandler,'help':'Exit this program'},
  'exit': {'handler':QuitHandler,'ignore':true},
  'help':{'handler':HelpHandler,'ignore':true},
  'breakpoint': {'handler':"setBreakpoint",'help':'Set a breakpoint: [source] [line]'},
  'breakpoints': {'handler':"listBreakpoints",'help':'List breakpoints'},
  'clearall': {'handler':"clearBreakpoints",'help':'Clear all breakpoints'},
  'continue': {'handler':"continue",'help':'Continue from paused execution'},
  'stepover': {'handler':"stepOver",'help':'Step over current execution'},
  'stepin': {'handler':"stepIn",'help':'Step into from current execution'},
  'stepover': {'handler':"stepOver",'help':'Step over current execution'},
  'evaluate': {'handler':"evaluate",'help':'Evaluate expression in current scope'}
};

function processCommand(d)
{
	var tok = String(d).replace('\n','').replace('\r','').split(' ');
	var cmd = tok.shift();
	if (cmd=='') return;
	var handler = handlers[cmd];
	if (handler) {
		if (typeof(handler.handler) === "string") {
			debug[handler.handler].apply(debug, tok);
		}
		else {
			handler.handler(tok);
		}
		return;
	}
	sys.error("I don't understand: ["+cmd+"]");
	return;
}

var st = process.openStdin();
st.addListener("data",function(d)
{
//  sys.debug("You said: "+d);
  processCommand(d);
  sys.print("(tdb) ");
});

sys.print("Appcelerator Titanium Command Line Debugger\n");
sys.print("(tdb) ");


