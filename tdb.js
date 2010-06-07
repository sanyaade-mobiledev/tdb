/**
 * Appcelerator Titanium Mobile
 * Copyright (c) 2010 by Appcelerator, Inc. All Rights Reserved.
 * Licensed under the terms of the Apache Public License
 * Please see the LICENSE included with this distribution for details.
 */


var sys = require('sys'),
    net = require('net');


if (process.argv.length!=3)
{
  sys.puts("Usage: tdb [ipaddress]");
  process.exit()
}

var breakpoints = [];
var connection = null;


process.argv
var ipaddress = process.argv[2];

function SendCommand(obj)
{
    connection.write(JSON.stringify(obj)+"\r\n");
}

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

var commands = 
{
  'paused':PauseCommand
};

net.createServer(function(c){
  connection = c;
  c.setEncoding('utf8');
  c.addListener('connect',function() {
    sys.debug("connected");
  });
  c.addListener('end',function()
  {
    sys.debug("disconnected");
  });
  c.addListener("data", function (chunk) { 
    var input = JSON.parse(chunk);
    sys.debug("receiving data: "+JSON.stringify(input));
    var command = input['event'];
    var handler = commands[command];
    if (handler)
    {
      handler(input,c);
    }
  });
}).listen(9988,ipaddress);

sys.debug("debugger listening on 9988");

function QuitHandler(args)
{
  process.exit();
}

function SetBreakpointHandler(args)
{
  var source = args[0];
  var line = args[1];
  sys.debug("adding breakpoint to "+source+" at line: "+line);
  breakpoints.push({source:source,line:line});
  SendCommand({"next":"setbreakpoint","source":source,"line":line});
}

function ListBreakpointsHandler(args)
{
  if (breakpoints.length == 0)
  {
    sys.debug("No breakpoints set");
    return;
  }
  for (var c=0;c<breakpoints.length;c++)
  {
    sys.debug(breakpoints[c].source+" : " +breakpoints[c].line);
  }
}

function ClearBreakpointsHandler(args)
{
  breakpoints = [];
  SendCommand({"next":"clearbreakpoints"});
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

function ContinueHandler(args)
{
  SendCommand({"next":"continue"});
}

function StepOverHandler(args)
{
  SendCommand({"next":"stepover"});
}

function StepInHandler(args)
{
  SendCommand({"next":"stepin"});
}

function StepOutHandler(args)
{
  SendCommand({"next":"stepout"});
}

function EvaluateHandler(args)
{
  SendCommand({"next":"evaluate","expression":args[0]});
}


var handlers = 
{
  'quit': {'handler':QuitHandler,'help':'Exit this program'},
  'exit': {'handler':QuitHandler,'ignore':true},
  'breakpoint': {'handler':SetBreakpointHandler,'help':'Set a breakpoint: [source] [line]'},
  'breakpoints': {'handler':ListBreakpointsHandler,'help':'List breakpoints'},
  'clearall': {'handler':ClearBreakpointsHandler,'help':'Clear all breakpoints'},
  'continue': {'handler':ContinueHandler,'help':'Continue from paused execution'},
  'stepover': {'handler':StepOverHandler,'help':'Step over current execution'},
  'stepin': {'handler':StepInHandler,'help':'Step into from current execution'},
  'stepover': {'handler':StepOverHandler,'help':'Step over current execution'},
  'evaluate': {'handler':EvaluateHandler,'help':'Evaluate expression in current scope'},
  'help':{'handler':HelpHandler,'ignore':true}
};

function processCommand(d)
{
  var tok = String(d).replace('\n','').replace('\r','').split(' ');
  var cmd = tok[0];
  if (cmd=='') return;
  tok.shift();
  var handler = handlers[cmd];
  if (!handler)
  {
    sys.error("I don't understand: ["+cmd+"]");
    return;
  }
  handler.handler(tok);
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
