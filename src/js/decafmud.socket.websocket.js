/*!
 * DecafMUD v0.9.0
 * http://decafmud.stendec.me
 *
 * Copyright 2010, Stendec <stendec365@gmail.com>
 * Licensed under the MIT license.
 */

/**
 * @fileOverview DecafMUD Socket Provider: WebSocket
 * @author Stendec <stendec365@gmail.com>
 * @version 0.9.0
 */

(function(DecafMUD) {

/** <p>This provides support for <a href="http://dev.w3.org/html5/websockets/">HTML5 WebSockets</a>
 *  to {@link DecafMUD} as a way to connect to servers. This, in theory,
 *  allows DecafMUD to connect without needing in-browser plugins such as
 *  Flash, Java, or Silverlight to supply a socket.</p>
 *
 *  <p>Unfortunately, WebSockets force us to use UTF-8 data, wrapped in a
 *  special protocol. And, while quite light, this extra protocol requires
 *  special software on the server to work.</p>
 *  
 *  <p>See Green Lantern for letting WebSockets work with existing MUD
 *  servers.</p>
 * @name DecafWebSocket
 * @class DecafMUD Socket Provider: WebSocket
 * @requires <a href="http://dev.w3.org/html5/websockets/#the-websocket-interface">WebSocket</a>
 * @property {boolean} connected This is true if the socket is connected to a
 *    remote host, otherwise it's false.
 * @exports DecafWebSocket as DecafMUD.plugins.Socket.websocket
 * @param {DecafMUD} decaf The instance of DecafMUD using this plugin.
 */
var DecafWebSocket = function DecafWebSocket(decaf) {
	// Store DecafMUD for later use.
	this.decaf = decaf;
}

// State Variables
DecafWebSocket.prototype.host = undefined;
DecafWebSocket.prototype.port = undefined;
DecafWebSocket.prototype.ssl = undefined;
DecafWebSocket.prototype.connected = false;
DecafWebSocket.prototype.ready = false;

/** This stores a reference to the WebSocket object used by this socket provider
 *  plugin instance.
 * @private
 * @type WebSocket */
DecafWebSocket.prototype.websocket = null;

// Prepare the socket provider for use.
/** This ensures that WebSockets are indeed available and calls the
 *  {@link DecafMUD#socketReady} method to tell DecafMUD to proceed
 *  to the next step of the startup procedure. */
DecafWebSocket.prototype.setup = function() {
	// If WebSockets are available, immediately call the socketReady event of
	// our DecafMUD instance. Otherwise, error out.
	if ( "WebSocket" in window ) {
		this.ready = true;
		this.decaf.socketReady(this);
		return; }
	
	clearTimeout(this.decaf.timer);
	this.decaf.error("Unable to create a WebSocket. Does your browser support them? If not, try {0}.".tr(
		this.decaf, '<a href="http://www.google.com/chrome" target="_blank">Google Chrome</a>'));
}

/** Connects to the remote server. All the necessary data is pulled from
 *  the {@link DecafMUD} instance's options, so there aren't any parameters. */
DecafWebSocket.prototype.connect = function() {
	// If we're connected, disconnect.
	if ( this.connected && this.websocket ) {
		this.websocket.close();
		this.websocket = null; }
	
	// Determine the port to connect on.
	var port = this.port;
	if ( port === undefined ) {
		port = this.decaf.options.set_socket.wsport;
		if ( port < 1 || port > 65535 ) {
			port = this.decaf.options.set_socket.policyport; }
		if ( port === undefined ) {
			port = 843; }
		
		this.port = port;
	}
	
	// Set the path variable
	var path = this.decaf.options.set_socket.wspath;
	if ( path === undefined ) {
		path = 'port_' + this.decaf.options.port; }
	
	// Get the hostname
	var host = this.host;
	if ( host === undefined ) {
		host = this.decaf.options.host;
		if ( ! host ) {
			host = document.location.host; }
		
		this.host = host;
	}

	// Get SSL setting
	var ssl = this.ssl;
	if ( ssl === undefined ) {
		ssl = this.decaf.options.set_socket.ssl;
		if ( ssl === undefined) {
			ssl = false; }
		this.ssl = ssl;
	}
	
	// Create the websocket and attach our events.
	var con = 'ws' + (ssl ? 's' : '') + '://' + host + ':' + port + '/' + path;
	this.decaf.debugString('WebSocket Connection String: ' + con);
	
	this.websocket = new WebSocket(con, 'binary');
	
	this.websocket.onopen		= this.onOpen.bind(this, this.websocket);
	this.websocket.onclose		= this.onClose.bind(this, this.websocket);
	this.websocket.onmessage	= this.onMessage.bind(this, this.websocket);
}

/** Closes the current connection and cleans up the WebSocket object. */
DecafWebSocket.prototype.close = function() {
	this.connected = false;
	if ( this.websocket ) {
		this.websocket.close();
		this.websocket = null; }
}

/** Ensure that the socket is connected to a remote server.
 * @example
 * // Make sure we're connected.
 * decaf.socket.assertConnected();
 * 
 * // Now do something.
 * decaf.socket.write("Blah blah blah...");
 * @private
 * @throws {String} If the socket is not connected. */
DecafWebSocket.prototype.assertConnected = function() {
	if ( ! this.connected || ! this.websocket ) {
		throw "DecafMUD is not currently connected."; }
}

/** Send data to the remote server.
 * @example
 * decaf.socket.write("This is my message!\n");
 * @param {String} data The data to send to the remote server. This must be a
 *    string consisting only of the bytes 0 to 255.
 * @throws {String} If the data cannot be written for any reason. */
DecafWebSocket.prototype.write = function(data) {
	this.assertConnected();
	var text = new Array(data.length);
	for(var i=0; i< data.length; i++)
	    text[i] = data.charCodeAt(i);
	var arr = (new Uint8Array(text)).buffer;
	this.websocket.send(arr);
}

/** Called when the WebSocket's onOpen event fires. If the WebSocket's readyState
 *  is <abbr title="1">OPEN</abbr>, then we set {@link DecafWebSocket#connected}
 *  to true and call {@link DecafMUD#socketConnected}.
 * @private
 * @event */
DecafWebSocket.prototype.onOpen = function(websocket, event) {
	
	// Are we connected?
	if ( websocket.readyState === 1 ) {
		this.connected = true;
		this.decaf.socketConnected(); }
}

/** Called when the WebSocket's onClose event fires. If the socket was
 *  previously connected, then set {@link DecafWebSocket@connected} to
 *  false, clean up the WebSocket, and call {@link DecafMUD#socketClosed}.
 * @private
 * @event */
DecafWebSocket.prototype.onClose = function(websocket, event) {
	
	// Were we connected?
	if ( this.connected ) {
		this.connected = false;
		this.decaf.socketClosed();
		if ( this.websocket == websocket )
			this.websocket = null;
	}
}

/** Called when the WebSocket's onMessage event fires. Simply pass the data
 *  along to the proper instance of {@link DecafMUD}.
 * @private
 * @event
 * @param {Object} event An event containing the received data.*/
DecafWebSocket.prototype.onMessage = function(websocket, event) {
	// Chrome and Mozilla work great with this
	var reader = new FileReader();
	reader.onload = function(e) {
		var u8array = new Uint8Array(e.target.result);
		var binstr = '';
		var i;

		for (i = 0; i < u8array.length; ++i)
			binstr += String.fromCharCode(u8array[i]);

		this.decaf.socketData(binstr);
	}.bind(this);
	reader.readAsArrayBuffer(event.data);
}

// Add this to DecafMUD
DecafMUD.plugins.Socket.websocket = DecafWebSocket;

})(DecafMUD);
