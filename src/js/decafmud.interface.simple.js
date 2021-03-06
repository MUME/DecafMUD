/*!
 * DecafMUD v0.9.0
 * http://decafmud.stendec.me
 *
 * Copyright 2010, Stendec <stendec365@gmail.com>
 */

/**
 * @fileOverview DecafMUD User Interface: Simple
 * @author Stendec <stendec365@gmail.com>
 * @version 0.9.0
 */

(function(DecafMUD) {

var addEvent = function(node, etype, func) {
		if ( node.addEventListener ) {
			node.addEventListener(etype, func, false); return; }
		
		etype = 'on' + etype;
		if ( node.attachEvent ) {
			node.attachEvent(etype, func); }
		else {
			node[etype] = func; }
	},
	delEvent = function(node, etype, func) {
		if ( node.removeEventListener ) {
			node.removeEventListener(etype, func, false); }
	};

var bodyHack = /Firefox\//.test(navigator.userAgent);

/** <p>This is a minimal user interface for DecafMUD, only providing a basic
 *  input handler if an input element is provided and rendering output to a
 *  display.</p>
 *  <p>Generally, you'll want to use the full interface for a richer user
 *  experience.</p>
 * @name SimpleInterface
 * @class DecafMUD User Interface: Simple
 * @exports SimpleInterface as DecafMUD.plugins.Interface.simple
 * @param {DecafMUD} decaf The instance of DecafMUD using this plugin. */
var SimpleInterface = function(decaf) {
	var si = this;
	
	// Store the instance of DecafMUD.
	this.decaf = decaf;
	
	// If we have elements, get them.
	this.container	= decaf.options.set_interface.container;

	// If the element is a string, querySelector it.
	if ( typeof this.container === 'string' ) {
		this.container = document.querySelector(this.container); }
	
	// Only allow us to use elements for these.
	if (!( 'nodeType' in this.container )) {
		throw "The container must be a node in the DOM!"; }
	
	// Build our element tree.
	this.container.setAttribute('role', 'application');
	this.container.className += ' decafmud mud interface';
	
	// Make the display container
	this.el_display = document.createElement('div');
	this.el_display.className = 'decafmud mud-pane primary-pane';
	this.el_display.setAttribute('role', 'log');
	this.el_display.setAttribute('aria-live', 'assertive');
	this.el_display.setAttribute('tabIndex','0');
	this.container.appendChild(this.el_display);
	
	// Handle keypresses in scrollback.
	addEvent(this.el_display,'keydown',function(e){si.displayKey(e)});
	
	// Put the input in a container.
	this._input = document.createElement('div');
	this._input.className = 'decafmud input-cont';
	
	// Create a container for the icons.
	this.tray = document.createElement('div');
	this.tray.className = 'decafmud icon-tray';
	this._input.appendChild(this.tray);
	
	// A variable for storing toolbar buttons.
	this.toolbuttons = {};
	
	// A variable for storing queued information bars.
	this.infobars = [];
	
	// A variable for storing notification icons.
	this.icons = [];
	
	// Create the toolbar. Don't attach it yet though.
	this.toolbar = document.createElement('div');
	this.toolbar.className = 'decafmud toolbar';
	this.toolbar.setAttribute('role','toolbar');
	var h = function(){if(!this.className){return;}this.className = this.className.replace(' visible','');}
	addEvent(this.toolbar,'mousemove', h);
	addEvent(this.toolbar,'blur', h);
	
	// Make the input element.
	this.input = document.createElement('input');
	this.input.title = "MUD Input".tr(this.decaf);
	this.input.setAttribute('role','textbox');
	this.input.setAttribute('aria-label', this.input.title);
	this.input.type = 'text';
	this.input.className = 'decafmud input';
	this._input.insertBefore(this.input, this._input.firstChild);
	this.container.appendChild(this._input);
	
	// Listen to input.
	addEvent(this.input,'keydown', function(e){si.handleInput(e);});
	
	var helper = function(e) { si.handleBlur(e); };
	addEvent(this.input, 'blur', helper);
	addEvent(this.input, 'focus', helper);
	
	// Reset the interface state.
	this.reset();
	
	// Listen to window resizing
	addEvent(window,'resize',function() { si.resizeScreen(); });
	
	return this;
};
SimpleInterface.prototype.toString = function() {
	return '<DecafMUD Interface: Simple' + (this.container.id ? ' (#'+this.container.id+')' : '') + '>'; }

// Defaults	
SimpleInterface.prototype.toolbutton_id = -1;
SimpleInterface.prototype.echo = true;
SimpleInterface.prototype.inpFocus = false;
SimpleInterface.prototype.old_parent = undefined;
SimpleInterface.prototype.next_sib = undefined;
SimpleInterface.prototype.input = undefined;
SimpleInterface.prototype.display = undefined;
SimpleInterface.prototype.splash = null;
SimpleInterface.prototype.splash_st = null;
SimpleInterface.prototype.splash_pgi = null;
SimpleInterface.prototype.splash_pgt = null;
SimpleInterface.prototype.splash_old = null;
SimpleInterface.prototype.scrollButton = undefined;
SimpleInterface.supports = {
	'tabComplete'	: true,
	'multipleOut'	: false,
	'fullscreen'	: true,
	'editor'		: false,
	'splash'		: true
};

///////////////////////////////////////////////////////////////////////////////
// Splash Functionality
///////////////////////////////////////////////////////////////////////////////

/** Initialize the splash screen and display an initial message.
 * @param {Number} [percentage] The initial percent to display the progress
 *    bar at.
 * @param {String} [message] The initial message for the splash screen to
 *    display. */
SimpleInterface.prototype.initSplash = function(percentage,message) {
	if ( percentage === undefined ) { percentage = 0; }
	if ( message === undefined ) { message = 'Discombobulating interface recipient...'.tr(this.decaf); }
	
	// Disable scrolling
	this.old_y = this.el_display.style.overflowY;
	this.el_display.style.overflowY = 'hidden';
	
	// Create a <div> to serve as the splash.
	this.splash = document.createElement('div');
	this.splash.className = 'decafmud splash';
	
	// Build the contents.
	this.splash.innerHTML  = '<h2 class="decafmud heading"><a href="https://github.com/MUME/DecafMUD">DecafMUD</a> <span class="version">v'+DecafMUD.version+'</span></h2>';
	
	// Create a <div> to act as the progress indicator.
	this.splash_pg = document.createElement('div');
	this.splash_pg.className = 'decafmud progress';
	this.splash_pg.setAttribute('role','progressbar');
	this.splash_pg.setAttribute('aria-valuemax', 100);
	this.splash_pg.setAttribute('aria-valuemin', 0);
	this.splash_pg.setAttribute('aria-valuenow', percentage);
	this.splash_pg.setAttribute('aria-valuetext', '{0}%'.tr(this.decaf,percentage));
	
	this.splash_pgi = document.createElement('div');
	this.splash_pgi.className = 'decafmud inner-progress';
	this.splash_pgi.style.cssText = 'width:'+percentage+'%;';
	this.splash_pg.appendChild(this.splash_pgi);
	
	this.splash_pgt = document.createElement('div');
	this.splash_pgt.className = 'decafmud progress-text';
	this.splash_pgt.innerHTML = '{0}%'.tr(this.decaf,percentage);
	this.splash_pg.appendChild(this.splash_pgt);
	
	this.splash.appendChild(this.splash_pg);
	
	// Create a <div> to contain the status line.
	this.splash_st = document.createElement('div');
	this.splash_st.className = 'decafmud status';
	this.splash_st.innerHTML = message;
	
	this.splash.appendChild(this.splash_st);
	
	// Add another element for old status messages
	this.splash_old = document.createElement('div');
	this.splash_old.className = 'decafmud old';
	this.splash_old.innerHTML = '';
	this.splash.appendChild(this.splash_old);
	
	// Add the splash to the display.
	this.container.appendChild(this.splash);
}

/** Destroy the splash screen. */
SimpleInterface.prototype.endSplash = function() {
	// Rip it apart.
	this.container.removeChild(this.splash);
	
	this.el_display.style.overflowY = this.old_y;
	
	this.splash_err = false;
	this.splash = this.splash_pg = this.splash_pgi = this.splash_pgt = this.splash_st = null;
}	

/** Update the splash screen with the provided percentage and text.
 * @param {Number} [percentage] If provided, the percentage will be changed to
 *    this value.
 * @param {String} [message] If provided, this message will be displayed. */
SimpleInterface.prototype.updateSplash = function(percentage,message) {
	if ( this.splash === null || this.splash_err ) { return; }
	if ( percentage !== undefined ) {
		var t = '{0}%'.tr(this.decaf, percentage);
		this.splash_pg.setAttribute('aria-valuenow', percentage);
		this.splash_pg.setAttribute('aria-valuetext', t);
		
		this.splash_pgt.innerHTML = t;
		this.splash_pgi.style.cssText = 'width:'+percentage+'%;';
	}
	if (! message) { return; }
	
	// Append the current message to old.
	var e = document.createElement('div'),
		t = this.splash_st.innerHTML;
	if ( t.endsWith('...') ) { t += 'done.'; }
	e.innerHTML = t;
	this.splash_old.insertBefore(e, this.splash_old.firstChild);
	
	this.splash_st.innerHTML = message;
}

/** Show an error with the splash message so it doesn't need to be presented as
 *  an alert dialog.
 * @param {String} message The error to display. This can have HTML.
 * @returns {boolean} True if the error was displayed, else false. */
SimpleInterface.prototype.splashError = function(message) {
	if ( this.splash === null ) { return false; }
	
	this.splash_pgt.innerHTML = '<b>Error</b>';
	this.splash_pgi.className += ' error';
	this.splash_st.innerHTML = message;
	this.splash_err = true;
	
	return true;
}

SimpleInterface.prototype.sizeel = undefined;
SimpleInterface.prototype.sizetm = undefined;

/** Show the current size of the primary display, if we can. Fade out over time
 *  too. */
SimpleInterface.prototype.showSize = function() {
	clearTimeout(this.sizetm);
	
	// If we don't have a display, quit.
	if ( this.display === undefined ) { return; }
	
	// If the element doesn't exist, create it.
	if ( this.sizeel === undefined ) {
		this.sizeel = document.createElement('div');
		this.sizeel.className = 'decafmud note center';
		this.container.appendChild(this.sizeel);
	}
	
	var sz = this.display.getSize();
	this.sizeel.style.cssText = 'opacity:1';
	this.sizeel.innerHTML = "{0}x{1}".tr(this.decaf, sz[0], sz[1]);
	
	// Set a timer for hiding.
	var si = this;
	this.sizetm = setTimeout(function(){si.hideSize()},500);
}

/** Hide the element, with a CSS fade. */
SimpleInterface.prototype.hideSize = function(fnl) {
	clearTimeout(this.sizetm);
	
	if ( fnl === true ) {
		// Don't try to NAWS until this happens, to avoid socket spam.
		if ( this.decaf.telopt[DecafMUD.TN.NAWS] !== undefined ) {
			try { this.decaf.telopt[DecafMUD.TN.NAWS].send(); }
			catch(err) { }
		}
	
		this.container.removeChild(this.sizeel);
		this.sizeel = undefined;
		return;
	}
	
	// Still here? Show the transition.
	this.sizeel.style.cssText  = '-webkit-transition: opacity 0.25s linear;';
	this.sizeel.style.cssText += '-moz-transition: opacity 0.25s linear;';
	this.sizeel.style.cssText += '-o-transition: opacity 0.25s linear;';
	this.sizeel.style.cssText += 'transition: opacity 0.25s linear;';
	
	// Set a timer for hiding.
	var si = this;
	setTimeout(function(){si.sizeel.style.opacity=0;},0);
	this.sizetm = setTimeout(function(){si.hideSize(true)},250);
}

///////////////////////////////////////////////////////////////////////////////
// Status Notifications (and Stuff)
///////////////////////////////////////////////////////////////////////////////

/** Called by Decaf upon connection to let us know. */
SimpleInterface.prototype.connected = function() {
	this.updateIcon(this.ico_connected, "DecafMUD is currently connected.".tr(this.decaf),
		'', 'connectivity connected');
}

/** Called by Decaf when it's trying to connect. */
SimpleInterface.prototype.connecting = function() {
	this.updateIcon(this.ico_connected, "DecafMUD is attempting to connect.".tr(this.decaf),
		'', 'connectivity connecting');
}

/** Called by Decaf upon disconnection to let us know. */
SimpleInterface.prototype.disconnected = function() {
	this.updateIcon(this.ico_connected, "DecafMUD is currently disconnected.".tr(this.decaf),
		'', 'connectivity disconnected');
}

///////////////////////////////////////////////////////////////////////////////
// Initialization
///////////////////////////////////////////////////////////////////////////////

/** Load our dependencies. That's pretty much it. */
SimpleInterface.prototype.load = function() {
	// Require whatever display handler we use, and that's it.
	this.decaf.require('decafmud.display.'+this.decaf.options.display);
}

// Reset the interface to its default state.
SimpleInterface.prototype.reset = function() {
	// Reset the input handling state
	this.masked		= false;
	this.inputCtrl	= false;
	this.mruIndex	= 0;
	this.mruHistory	= [];
	this.mruSize	= this.decaf.options.set_interface.mru_size;
	this.mruTemp	= false;
	this.hasFocus	= false;
	
	// Tab Completion Data
	this.reqTab		= false;
	this.wantTab	= false;
	this.tabIndex	= -1;
	this.tabValues	= [];
	
	this.buffer		= '';
	
	// Update the input handler if it exists.
	if ( this.input !== undefined ) {
		this.updateInput(); }
	
	// Reset the display.
	if ( this.display !== undefined ) {
		this.display.reset(); }
}

/** Setup the UI plugin associated with this, this being a DecafMUD instance. */
SimpleInterface.prototype.setup = function() {
	// Get a settings object.
	this.store = this.decaf.store.sub('ui');
	this.storage = this.store;
	
	// Should the toolbar be on the left or the right?
	var tbar = this.store.get('toolbar-position','top-left');
	this.old_tbarpos = tbar;
	this.toolbar.className += ' ' + tbar;
	this.container.insertBefore(this.toolbar, this.container.firstChild);
	
	// Get the display type.
	var display = this.decaf.options.display;
	
	// Create the display.
	this.decaf.debugString('Initializing display plugin "'+display+'" in: #' + this.el_display.id,'info');
	this.display = new DecafMUD.plugins.Display[display](this.decaf, this, this.el_display);
	this.decaf.display = this.display;
	
	// Should we go fullscreen automatically?
	this.goFullOnResize = this.store.get('fullscreen-auto', true);
	
	// Should we be starting in fullscreen?
	var fs = this.store.get('fullscreen-start', this.decaf.options.set_interface.start_full);
	
	// Create the fullscreen button.
	this.fsbutton = this.tbNew(
		"Fullscreen".tr(this.decaf),
		undefined,
		"Click to enter fullscreen mode.".tr(this.decaf),
		1,
		true,
		fs,
		undefined,
		function(e){ this.click_fsbutton(e); }
	);
	
	// Create the log button.
	this.logbutton = this.tbNew(
		"Logs".tr(this.decaf),
		undefined,
		"Click to open a window containing this session's logs.".tr(this.decaf),
		0,
		true,
		false,
		undefined,
		function(e){ this.showLogs(); }
	);
	
	// Create a settings button.
	//this.stbutton = this.tbNew(
	//	"Settings".tr(this.decaf),
	//	undefined,
	//	"Click to change DecafMUD's settings.".tr(this.decaf),
	//	1, true, false, undefined,
	//	function(e){ this.showSettings(); }
	//);
	
	// Create the connected notification icon.
	this.ico_connected = this.addIcon("You are currently disconnected.".tr(this.decaf), '', 'connectivity disconnected');
	
	// Go directly to fullscreen if necessary.
	if ( fs ) {
		this.enter_fs(false);
	} else {
		// Still resize stuff.
		if ( ! this._resizeToolbar() ) {
			this.resizeScreen(false); }
	}
}

/** Quick and dirty function for saving logs. */
SimpleInterface.prototype.showLogs = function() {
	//var wd = win.document;
	
	// Build some CSS.
	var css = '', css2 = '';
	if ( window.getComputedStyle ) {
		var node = this.display.display, count=0;
		while(node) {
			count += 1;
			if(count>15){alert('Too high count!');return;}
			var style = getComputedStyle(node,null);
			if (!style.backgroundColor ||
				style.backgroundColor === 'transparent' ||
				style.backgroundColor.substr(0,5) === 'rgba(') {
				if(node === document.body) { break; }
				node = node.parentNode;
			} else {
				css = 'background-color:' + style.backgroundColor + ';';
				break;
			}
		}
		if(!css) { css = 'background-color:#000;'; }
		var style = getComputedStyle(this.display.display,null);
		css = 'body{'+css+'color:'+style.color+';}';
		
		css2 = 'div{font-family:'+style.fontFamily+';font-size:'+style.fontSize+';}';
	} else {
		css = 'body{background:#000;color:#C0C0C0;}';
		css2= 'div{font-family:monospace;}';
	}
	
	var url = 'data:text/html,';
	
	url += '<html><head><title>';
	url += 'DecafMUD Session Log'.tr(this.decaf);
	url += '</title><style>'+css+css2+'</style></head><body>';
	url += '<h1>';
	url += 'DecafMUD Session Log'.tr(this.decaf);
	url += '</h2>';
	url += '<div>' + this.display.display.innerHTML + '</div>';
	url += '</body></html>';
	
	var win = window.open(url,'log-window','width=700,height=400,directories=no,location=no,menubar=no,status=no,toolbar=no,scrollbars=yes');
}

///////////////////////////////////////////////////////////////////////////////
// Settings
///////////////////////////////////////////////////////////////////////////////

/** Storage for the settings div. */
SimpleInterface.prototype.settings = undefined;

/** Load the settings interface. */
SimpleInterface.prototype.showSettings = function() {
	/** Is there already a settings element? */
	if ( this.settings ) {
		this.settings.parentNode.removeChild(this.settings);
		this.settings = undefined;
		this.set_cont = undefined;
		this.tbPressed(this.stbutton,false);
		this.tbTooltip(this.stbutton,"Click to change DecafMUD's settings.".tr(this.decaf))
		this.el_display.setAttribute('tabIndex','0');
		
		return;
	}
	
	// Create the element.
	var set = document.createElement('div');
	set.className = 'decafmud window settings';
	
	// Apply top padding if the toolbar is visible
	if ( this.toolbarPadding ) {
		set.style.paddingTop = (this.toolbarPadding-5) + 'px';
	}
	
	// Create the secondary layer for pretty spacing.
	var seccont = document.createElement('div');
	seccont.className = 'decafmud window-middle';
	set.appendChild(seccont);
	
	// Create the actual holder.
	var cont = document.createElement('div');
	cont.className = 'decafmud window-inner';
	seccont.appendChild(cont);
	
	// Fill it with settings!
	var h = document.createElement('h2');
	h.innerHTML = "DecafMUD Settings".tr(this.decaf);
	cont.appendChild(h);
	
	var d = document.createElement('p');
	d.innerHTML = "Use the form below to adjust DecafMUD's settings, then click Apply when you're done.".tr(this.decaf);
	cont.appendChild(d);
	
	// Go through decaf.settings.
	for(var k in this.decaf.settings) {
		var setting = this.decaf.settings[k];
		// Create the container for this settings branch.
		var s = document.createElement('fieldset');
		s.className = 'decafmud settings';
		
		// Calculate the name.
		var n = k.substr(0,1).toUpperCase() + k.substr(1);
		if ( setting['_name'] !== undefined ) { n = setting['_name']; }
		
		// Create a header.
		var l = document.createElement('legend');
		l.innerHTML = n.tr(this.decaf);
		s.appendChild(l);
		
		// Is there a description?
		if ( setting['_desc'] !== undefined ) {
			var d = document.createElement('p');
			d.innerHTML = setting['_desc'].tr(this.decaf);
			s.appendChild(d);
		}
		
		// Get the path.
		var path = setting['_path'] || '/';
		if ( path.substr(-1) !== '/' ) { path += '/'; }
		
		// Go through the controls.
		for(var _k in setting) {
			if ( _k.substr(0,1) === '_' ) { continue; }
			var d = document.createElement('div'),
				sett = setting[_k];
			
			// Calculate the name.
			var n = _k.substr(0,1).toUpperCase() + _k.substr(1);
			if ( sett['_name'] !== undefined ) { n = sett['_name']; }
			
			// Calculate the ID.
			var id = path + _k;
			
			// Get the type of input element necessary.
			var t = sett['_type'] || 'text';
			
			// Create the label if not boolean.
			if ( t !== 'boolean' ) {
				var l = document.createElement('label');
				l.setAttribute('for', id);
				l.innerHTML = n.tr(this.decaf);
				d.appendChild(l);
			}
			
			// Create the input control
			if ( t === 'password' ) {
				var i = document.createElement('input');
				i.setAttribute('id',id);
				i.setAttribute('type','password');
				d.appendChild(i);
			} else if ( t === 'boolean' ) {
				var i = document.createElement('input');
				i.setAttribute('id',id);
				i.setAttribute('type','checkbox');
				d.appendChild(i);
			} else if ( t === 'nochance' ) {
				var i = document.createElement('select');
				i.setAttribute('id',id);
				var c = document.createElement('option');
				c.setAttribute('value','true');
				c.innerHTML = 'Yes';
				i.appendChild(c);
				c = document.createElement('option');
				c.setAttribute('value','false');
				c.innerHTML = 'No';
				i.appendChild(c);
				d.appendChild(i);
			} else {
				var i = document.createElement('input');
				i.setAttribute('id',id);
				d.appendChild(i);
			} 
			
			// Is there a desc?
			if ( sett['_desc'] !== undefined ) {
				var i;
				if ( t === 'boolean' ) {
					i = document.createElement('label');
					i.setAttribute('for',id);
				} else {
					i = document.createElement('p');
				}
				i.innerHTML = sett['_desc'].tr(this.decaf);
				d.appendChild(i);
			} else if ( t === 'boolean' ) {
				var i = document.createElement('label');
				i.setAttribute('for',id);
				i.innerHTML = n.tr(this.decaf);
				d.appendChild(i);
			}
			
			// Add this.
			s.appendChild(d);
		}
		
		
		// Append the fieldset to the document.
		cont.appendChild(s);
	}
	
	// Compute the height.
	var tot = this.container.offsetHeight - (this._input.offsetHeight + 17);
	if ( this.toolbarPadding ) { tot = tot - (this.toolbarPadding-12); }
	if ( tot < 0 ) { tot = 0; }
	seccont.style.height = tot + 'px';
	
	// Show the settings pane.
	this.el_display.setAttribute('tabIndex','-1');
	this.container.insertBefore(set, this.el_display);
	this.settings = set;
	this.set_cont = cont;
	this.set_mid  = seccont;
	this.tbPressed(this.stbutton,true);
	this.tbTooltip(this.stbutton,"Click to close the settings window.".tr(this.decaf));
}

///////////////////////////////////////////////////////////////////////////////
// Toolbar Functions
///////////////////////////////////////////////////////////////////////////////

/** Delete a toolbar button with the given ID.
 * @param {number} id The ID of the button to delete. */
SimpleInterface.prototype.tbDelete = function(id) {
	if ( this.toolbuttons[id] === undefined ) { return; }
	var btn = this.toolbuttons[id];
	btn[0].parentNode.removeChild(btn[0]);
	this.toolbuttons[id] = undefined;
	delete btn;
	
	// Resize the toolbar.
	this._resizeToolbar();
}

/** Change a toolbar button's text. */
SimpleInterface.prototype.tbText = function(id, text) {
	var btn = this.toolbuttons[id];
	if ( btn === undefined ) { throw "Invalid button ID."; }
	if ( !text ) { throw "Text can't be empty/false/null/whatever."; }
	btn[0].innerHTML = text;
	if ( btn[3] === undefined ) {
		btn[3] = text;
		btn[0].title = text; }
}

/** Change a toolbar button's tooltip. */
SimpleInterface.prototype.tbTooltip = function(id, tooltip) {
	var btn = this.toolbuttons[id];
	if ( btn === undefined ) { throw "Invalid button ID."; }
	btn[3] = tooltip;
	if ( tooltip ) { btn[0].title = tooltip; }
	else { btn[0].title = btn[1]; }
}

/** Enable or disable a toolbar button. */
SimpleInterface.prototype.tbEnabled = function(id, enabled) {
	var btn = this.toolbuttons[id];
	if ( btn === undefined ) { throw "Invalid button ID."; }
	enabled = !!(enabled);
	btn[5] = enabled;
	btn[0].setAttribute('aria-disabled', !enabled);
	if ( enabled ) { btn[0].className = btn[0].className.replace(' disabled',''); }
	else if (! /disabled/.test(btn[0].className) ) {
		btn[0].className += ' disabled'; }
}

/** Change a toolbar button's pressed state. */
SimpleInterface.prototype.tbPressed = function(id, pressed) {
	var btn = this.toolbuttons[id];
	if ( btn === undefined ) { throw "Invalid button ID."; }
	pressed = !!(pressed);
	btn[6] = pressed;
	btn[0].setAttribute('aria-pressed',pressed);
	if ( pressed ) {
		if ( /toggle-depressed/.test(btn[0].className) ) {
			btn[0].className = btn[0].className.replace(' toggle-depressed',' toggle-pressed'); }
	} else {
		if ( /toggle-pressed/.test(btn[0].className) ) {
			btn[0].className = btn[0].className.replace(' toggle-pressed',' toggle-depressed'); }
	}
}

/** Change a toolbar button's class. */
SimpleInterface.prototype.tbClass = function(id, clss) {
	var btn = this.toolbuttons[id];
	if ( btn === undefined ) { throw "Invalid button ID."; }
	var old_clss = btn[7];
	btn[7] = clss;
	if ( old_clss !== undefined ) { btn[0].className = btn[0].className.replace(' '+old_clss,''); }
	if ( clss ) { btn[0].className += ' ' + clss; }
}

/** Change a toolbar button's icon. */
SimpleInterface.prototype.tbIcon = function(id, icon) {
	var btn = this.toolbuttons[id];
	if ( btn === undefined ) { throw "Invalid button ID."; }
	btn[2] = icon;
	if ( icon ) {
		if (! / icon/.test(btn[0].className) ) { btn[0].className += ' icon'; }
		btn[0].style.cssText = 'background-image: url('+icon+');';
	} else {
		btn[0].className = btn[0].className.replace(' icon','');
		btn[0].style.cssText = ''; }
}

/** Create a new toolbar button.
 * @param {String} text The name of the button. Will be displayed if no icon is
 *    given, and also used as title text if no tooltip is given.
 * @param {String} [icon] The icon to display on the button.
 * @param {String} [tooltip] The tooltip text to associate with the button.
 * @param {number} [type=0] The type of button. 0 is normal, 1 is toggle.
 * @param {boolean} [enabled=true] Whether or not the button is enabled.
 * @param {boolean} [pressed=false] Whether or not a toggle button is pressed.
 * @param {String} [clss] Any additional class to set on the button.
 * @param {function} [onclick] The function to call when the button is clicked
 *    or toggled. */
SimpleInterface.prototype.tbNew = function(text,icon,tooltip,type,enabled,pressed,clss,onclick) {
	if ( typeof icon === 'function' ) {
		var onc = onclick;
		onclick = icon;
		icon = tooltip;
		tooltip = type;
		type = enabled;
		enabled = pressed;
		pressed = clss;
		clss = onc; }
	
	// Get this button's ID.
	var ind = ( ++this.toolbutton_id );
	
	var btn = document.createElement('a');
	btn.id = this.container.id + '-toolbar-button-' + ind;
	btn.className = 'decafmud button toolbar-button';
	if ( clss ) { btn.className += ' ' + clss; }
	if ( type === 1 ) { btn.className += ' toggle ' + (pressed ? 'toggle-pressed' : 'toggle-depressed'); }
	btn.innerHTML = text;
	if ( tooltip ) { btn.title = tooltip; }
	else { btn.title = text; }
	if ( enabled !== false ) { enabled = true; }
	if ( !enabled ) { btn.className += ' disabled'; }
	btn.setAttribute('tabIndex','0');
	
	// Set accessibility data
	btn.setAttribute('role','button');
	btn.setAttribute('aria-disabled', !enabled);
	if ( type === 1 ) {
		btn.setAttribute('aria-pressed', pressed); }
	
	// Is there an icon?
	if ( icon ) {
		btn.style.cssText = 'background-image: url('+icon+');';
		btn.className += ' icon'; }
	
	if ( onclick ) {
		var si = this;
		var helper = function(e) {
			if ( e.type === 'keydown' && e.keyCode !== 13 ) { return; }
			var btn = si.toolbuttons[ind];
			if ( btn[5] !== true ) { return; }
			
			onclick.call(si, e);
			if ( e.type && e.type !== 'keydown' ) { btn[0].blur(); }
		}
		addEvent(btn, 'click', helper);
		addEvent(btn, 'keydown', helper);
	}
	
	// Focus Helpers
	addEvent(btn,'focus',function(e) {
		if (! this.parentNode ) { return; }
		if (/toolbar/.test(this.parentNode.className)) {
			this.parentNode.setAttribute('aria-activedescendant', this.id);
			this.parentNode.className += ' visible'; }
	});
	addEvent(btn,'blur',function(e) {
		if (! this.parentNode ) { return; }
		if (/toolbar/.test(this.parentNode.className)) {
			if ( this.parentNode.getAttribute('aria-activedescendant') === this.id ) {
				this.parentNode.setAttribute('aria-activedescendant', ''); }
			this.parentNode.className = this.parentNode.className.replace(' visible',''); }
	});
	
	// Store the button.
	this.toolbuttons[ind] = [btn,text,icon,tooltip,type,enabled,pressed,clss,onclick];
	btn.setAttribute('button-id', ind);
	
	// Add it to the toolbar.
	this.toolbar.appendChild(btn);
	
	// Resize the toolbar.
	this._resizeToolbar();
	
	return ind;
}

/** Resize the toolbar when adding/changing/removing a button. */
SimpleInterface.prototype.toolbarPadding = undefined;
SimpleInterface.prototype._resizeToolbar = function() {
	var tbar = this.store.get('toolbar-position','top-left'),
		always = this.store.get('toolbar-always',2),
		css = this.toolbar.style.cssText,
		ret = false;
	
	if ( this.old_tbarpos !== tbar ) {
		// Move the toolbar.
		this.toolbar.className = this.toolbar.className.replace(' '+this.old_tbarpos,' '+tbar);
		
		// Remove the old class from the toolbar's CSS.
		if ( this.old_tbarpos === 'top-left' || this.old_tbarpos === 'top-right' ) {
			css = css.replace(/top:[\s\-0-9a-z]+;/g, '');
		} else if ( this.old_tbarpos === 'left' ) {
			css = css.replace(/left:[\s\-0-9a-z]+;/g, '');
		} else {
			css = css.replace(/right:[\s\-0-9a-z]+;/g, '');
		}
		
		// Store the new position.
		this.old_tbarpos = tbar;
	}
	
	// Do we need to add or remove always-on?
	if ( always === 0 ) { always = false; }
	else if ( always === 1 ) { always = true; }
	else { always = this.container.className.indexOf('fullscreen') !== -1; }
	
	if ( this.toolbar.className.indexOf(' always-on') === -1 && always ) {
		this.toolbar.className += ' always-on';
	} else if ( this.toolbar.className.indexOf(' always-on') !== -1 && !always ) {
		this.toolbar.className = this.toolbar.className.replace(' always-on','');
	}
	
	// If the toolbar is always-on and top-left or top-right...
	if ( / always-on/.test(this.toolbar.className) && / top-(?:left|right)/.test(this.toolbar.className) ) {
		if ( this.settings && this.toolbarPadding !== this.toolbar.clientHeight ) {
			this.settings.style.paddingTop = (this.toolbar.clientHeight-5) + 'px';
		}
		if ( this.display && this.toolbarPadding !== this.toolbar.clientHeight ) {
			// If we have a display, check its padding.
			this.display.shouldScroll();
			this.el_display.style.paddingTop = this.toolbar.clientHeight + 'px';
			this.toolbarPadding = this.toolbar.clientHeight;
			this.resizeScreen(false,true);
			this.display.doScroll();
			ret = true;
		} else {
			this.toolbarPadding = this.toolbar.clientHeight;
		}
	} else if ( this.toolbarPadding !== undefined ) {
		if ( this.settings ) {
			this.settings.style.paddingTop = '';
		}
		if ( this.display ) {
			this.display.shouldScroll();
			this.el_display.style.paddingTop = '0px';
			this.toolbarPadding = undefined;
			this.resizeScreen(false,true);
			this.display.doScroll();
			ret = true;
		}
	}
	
	// Get the toolbar width and height.
	var w = -1 * (this.toolbar.clientWidth - 15),
		h = -1 * (this.toolbar.clientHeight - 12);
	
	if ( / left/.test(this.toolbar.className) ) {
		css = css.replace(/left:[\s\-0-9a-z]+;/g, '') + 'left:'+w+'px;';
	} else if ( / right/.test(this.toolbar.className) ) {
		css = css.replace(/right:[\s\-0-9a-z]+;/g,'') + 'right:'+w+'px;';
	} else {
		css = css.replace(/top:[\s\-0-9a-z]+;/g, '') + 'top:'+h+'px;';
	}
	this.toolbar.style.cssText = css;
	
	return ret;
}

///////////////////////////////////////////////////////////////////////////////
// Scroll Button
///////////////////////////////////////////////////////////////////////////////

/** Create a scroll button for the main output pane. */
SimpleInterface.prototype.showScrollButton = function() {
	if ( this.scrollButton !== undefined ) { return; }
	
	var sb = document.createElement('div'), si = this;
	sb.className = 'button scroll-button';
	sb.setAttribute('tabIndex',0);
	sb.innerHTML = "More".tr(this.decaf);
	var helper = function(e) {
		if ( e.type == 'keydown' && e.keyCode !== 13 ) { return; }
		si.display.scrollNew(); }
	addEvent(sb, 'click', helper);
	addEvent(sb, 'keydown', helper);
	
	this.scrollButton = sb;
	
	// Add the button, then reflow.
	this.container.appendChild(sb);
	sb.style.cssText = 'bottom:' + (this._input.offsetHeight + 12) + 'px';
}

/** Destroy the scroll button. */
SimpleInterface.prototype.hideScrollButton = function() {
	if ( this.scrollButton === undefined ) { return; }
	this.scrollButton.parentNode.removeChild(this.scrollButton);
	this.scrollButton = undefined; }

///////////////////////////////////////////////////////////////////////////////
// Information Bar
///////////////////////////////////////////////////////////////////////////////

/** Create a new notification bar at the top of the interface for the user to
 *  take action on. Actions may be specified to be taken when the bar is clicked
 *  or closed, and buttons may be added as well.
 *  
 *  If the second parameter is a number instead of a string, it will be treated
 *  as though timeout and clss have swapped places.
 *  
 * @param {String} text The text to display on the bar.
 * @param {String} [clss="info"] Optionally, a class to add to the bar for more
 *    precise styling.
 * @param {Number} [timeout=0] The number of seconds after which the bar should
 *    automatically be closed.
 * @param {String} [icon] The URL of an image to display on the bar.
 * @param {Array}  [buttons] A list of buttons to be displayed.
 * @param {function} [click] A function to be called when the bar is clicked.
 * @param {function} [close] A function to be called when the bar is closed. */
SimpleInterface.prototype.infoBar = function(text, clss, timeout, icon, buttons, click, close) {
	if ( typeof clss === 'number' ) {
		var t = timeout;
		timeout = clss;
		clss = t; }
	
	if ( clss === undefined ) { clss = 'info'; }
	if ( timeout === undefined ) { timeout = 0; }
	
	var ibar = {
		'text'		: text,
		'class'		: clss,
		'timeout'	: timeout,
		'icon'		: icon,
		'buttons'	: buttons,
		'click'		: click,
		'close'		: close
	};
	this.infobars.push(ibar);

	// Is there a current information bar?
	if ( this.ibar !== undefined ) { return; }
	
	// Create a new infobar.
	this.createIBar();
}

/** Same as the regular infoBar function, but only adds an infoBar if it will
 *  be displayed immediately. */
SimpleInterface.prototype.immediateInfoBar = function(text, clss, timeout, icon, buttons, click, close) {
	if ( this.ibar !== undefined ) { return false; }
	this.infoBar(text, clss, timeout, icon, buttons, click, close);
	return true;
}

/** Helper for adding buttons to an IBar. */
var addButton = function(bar, btn, si) {
	var b = document.createElement('a');
	b.className = 'button';
	b.setAttribute('href','#');
	b.setAttribute('onclick','return false;');
	b.innerHTML = btn[0];
	addEvent(b, 'click', function(e) {
		si.closeIBar(true);
		setTimeout(function(){ btn[1].call(si,e); },0);
		
		// Stop it from propagating
		e.cancelBubble = true;
		if ( e.stopPropagation ) { e.stopPropagation() }
		
		return false; });
	bar.appendChild(b);
}

/** Handle the creation of showing of the info bar. Used internally. */
SimpleInterface.prototype.createIBar = function() {
	var si = this,
		ibar = this.infobars[0],
		obj = document.createElement('div');
	
	// Accessibility
	obj.setAttribute('role', 'alert');
	
	obj.className = 'decafmud infobar ' + ibar['class'];
	obj.innerHTML = ibar.text;
	obj.style.cssText = 'top: -26px;';
	
	// If it's clickable, make it focusable too.
	if ( ibar.click !== undefined ) {
		obj.className += ' clickable';
		obj.setAttribute('tabIndex','0');
	}
	
	// Create the close/click handlers.
	var closer = function(e) {
		if ( e === undefined || ( e.type === 'keydown' && e.keyCode !== 13 && e.keyCode !== 27 )) { return; }
		if ( e.type === 'click' && !ibar.click ) { return; }
		
		// Stop it from propagating
		e.cancelBubble = true;
		if ( e.stopPropagation ) { e.stopPropagation() }
		
		// Close it.
		si.closeIBar(true);
		
		if ( e.type === 'keydown' && e.keyCode === 27 ) {
			// Return before the click function can be called.
			if ( ibar.close ) {
				ibar.close.call(si, e); }
			return; }
		
		if ( ibar.click ) {
			ibar.click.call(si, e); }
	};
	
	// Add events.
	addEvent(obj, 'click', closer);
	addEvent(obj, 'keydown', closer);
	
	// Create the close button.
	var closebtn = document.createElement('div');
	closebtn.innerHTML = 'X';
	closebtn.className = 'close';
	closebtn.setAttribute('tabIndex','0');
	var helper = function(e) {
		if ( e === undefined || ( e.type === 'keydown' && e.keyCode !== 13 )) { return; }
		si.closeIBar(true);
		if ( ibar.close ) { ibar.close.call(si, e); }
		
		// Stop it from propagating
		e.cancelBubble = true;
		if ( e.stopPropagation ) { e.stopPropagation() }
	};
	addEvent(closebtn, 'click', helper);
	addEvent(closebtn, 'keydown', helper);
	obj.insertBefore(closebtn, obj.firstChild); //appendChild(closebtn);
	
	// Create the buttons.
	if ( ibar.buttons ) {
		var btncont = document.createElement('div');
		btncont.className = 'btncont';
		for(var i=0; i<ibar.buttons.length; i++) {
			addButton(btncont, ibar.buttons[i], this);
		}
		obj.insertBefore(btncont, closebtn);
	}
	
	// Add it to the document.
	this.ibar = obj;
	ibar.el = obj;
	this.container.insertBefore(obj, this.container.firstChild);
	
	// Add awesome styling.
	setTimeout(function(){
		var pt = 0;
		if ( window.getComputedStyle ) {
			pt = parseInt(getComputedStyle(obj,null).paddingTop); }
		else if ( obj.currentStyle ) {
			pt = parseInt(obj.currentStyle['paddingTop']); }
		if ( si.toolbarPadding ) { pt += si.toolbarPadding - 10; }
		obj.style.cssText = 'background-position: 5px '+pt+'px;' +
			'padding-top: '+pt+'px;' + 
			'-webkit-transition: top 0.1s linear;' +
			'-moz-transition: top 0.1s linear;' +
			'-o-transition: top 0.1s linear;' +
			'transition: top 0.1s linear; top: inherit';
		if ( ibar.icon ) {
			obj.style.cssText += 'background-image: url("'+ibar.icon+'")'; }
	},0);
	
	// If there's a timeout, create the timer.
	if ( ibar.timeout > 0 ) {
		this.ibartimer = setTimeout(function() {
			si.closeIBar(); }, 1000 * ibar.timeout);
	}
}

/** Close the info bar. If there's another one waiting, show it next. */
SimpleInterface.prototype.closeIBar = function(steptwo) {
	if ( this.ibar === undefined ) { return; }
	clearTimeout(this.ibartimer);
	if ( !steptwo ) {
		// Fade it nicely.
		this.ibar.style.cssText += '-webkit-transition: opacity 0.25s linear;' +
			'-moz-transition: opacity 0.25s linear;' +
			'-o-transition: opacity 0.25s linear;' +
			'transition: opacity 0.25s linear; opacity: 0';
		var si = this;
		this.ibartimer = setTimeout(function(){si.closeIBar(true)},250);
		return;
	}
	
	this.ibar.parentNode.removeChild(this.ibar);
	delete this.ibar;
	this.infobars.shift();
	
	// Is there a new one?
	if ( this.infobars.length > 0 ) {
		this.createIBar(); }
}

///////////////////////////////////////////////////////////////////////////////
// Notification Icons
///////////////////////////////////////////////////////////////////////////////

/** Create a new tray icon. These show up next to the text input and support
 *  click/key events. They can be changed dynamically too, but must remain at
 *  16x16 in size. */
SimpleInterface.prototype.addIcon = function(text, html, clss, onclick, onkey) {
	var ico = document.createElement('div');
	ico.className = 'decafmud status-icon ' + clss + ( onclick ? ' icon-click' : '' );
	ico.innerHTML = html;
	ico.setAttribute('title', text);
	
	// Accessibility.
	ico.setAttribute('role','status');
	ico.setAttribute('aria-label', text);
	
	// Make it selectable if necessary.
	if ( onclick || onkey ) { ico.setAttribute('tabIndex','0'); }
	
	// Add this to icons.
	var ind = this.icons.push([ico,onclick,onkey]) - 1;
	
	// Recalculate icon positions.
	for(var i=0; i < this.icons.length; i++) {
		this.icons[i][0].style.cssText = 'right:'+(((this.icons.length-i)-1)*21)+'px';
	}
	
	// Add to DOM.
	this.tray.appendChild(ico); //._input.appendChild(ico);
	
	// Add the event listeners.
	var si = this;
	if ( onclick ) { addEvent(ico, 'click', function(e) { onclick.call(si,e); }); }
	if ( onclick && !onkey ) { addEvent(ico, 'keydown', function(e) {
		if (e.keyCode !== 13) { return; }
		onclick.call(si,e); }); }
	if ( onkey ) { addEvent(ico, 'keydown', function(e) { onkey.call(si,e); }); }
	
	// Resize the tray now.
	this._resizeTray();
	
	// Return the index
	return ind;
}

/** Destroy the icon with the given index.
 * @param {Number} ind The index of the icon to destroy. */
SimpleInterface.prototype.delIcon = function(ind) {
	if ( ind < 0 || ind >= this.icons.length ) {
		throw "Invalid index for icon!"; }
	
	// Get the element and pop it off the list.
	var el = this.icons[ind][0];
	this.icons.splice(ind,1);
	
	// Remove the icon from DOM and delete.
	this._input.removeChild(el);
	delete el;
	
	// Recalculate icon positions.
	for(var i=0; i < this.icons.length; i++) {
		this.icons[i].style.cssText = 'right:'+(((this.icons.length-i)-1)*21)+'px';
	}
	
	// Resize the tray now.
	this._resizeTray();
}

/** Update an icon with a new class and/or text.
 * @param {Number} ind The index of the icon to update.
 * @param {String} [text] The title text to attach to the icon.
 * @param {String} [clss] The new class to set on the icon.
 * @param {String} [html] The innerHTML to set on the icon. */
SimpleInterface.prototype.updateIcon = function(ind, text, html, clss) {
	if ( ind < 0 || ind >= this.icons.length ) {
		throw "Invalid index for icon!"; }
	
	// Get the icon.
	var el = this.icons[ind];
	var onclick = el[1], onkey = el[2];
	el = el[0];
	
	if ( clss ) { el.className = 'decafmud status-icon ' + clss + ( onclick ? ' icon-click' : ''); }
	if ( html ) { el.innerHTML = html; }
	if ( text ) {
		el.setAttribute('title', text);
		el.setAttribute('aria-label', text);
	}
}

/** Helper. Resizes the input based on the number of icons. */
SimpleInterface.prototype._resizeTray = function() {
	var w = this.tray.clientWidth;
	//var w = 21 * this.icons.length;
	this._input.style.cssText = 'padding-right:'+w+'px';
}

///////////////////////////////////////////////////////////////////////////////
// Element Sizing
///////////////////////////////////////////////////////////////////////////////

/** For when you click the fullscreen div. */
SimpleInterface.prototype.click_fsbutton = function(e) {
	if ( this.container.className.indexOf('fullscreen') === -1 ) {
		this.enter_fs();
	} else {
		this.exit_fs();
	}
}

/** Scroll position for when leaving FS. */
SimpleInterface.prototype.oldscrollX = undefined;
SimpleInterface.prototype.oldscrollY = undefined;
SimpleInterface.prototype.old_children = [];
SimpleInterface.prototype.old_display = [];

/** Enter fullscreen mode. */
SimpleInterface.prototype.enter_fs = function(showSize) {
	if ( this.container.className.indexOf('fullscreen') !== -1 ) { return; }

	var has_focus = this.inpFocus;
	if ( this.display ) { this.display.shouldScroll(false); }
	
	// Scroll to it.
	this.oldscrollY = window.scrollY;
	this.oldscrollX = window.scrollX;
	
	// Store the old container position, then pop it.
	this.old_parent = this.container.parentNode;
	this.next_sib = this.container.nextElementSibling;
	if ( this.next_sib === undefined ) {
		// Try getting nextSibling for IE support
		if ( this.container.nextSibling && this.container.nextSibling.nodeType == this.container.nodeType ) {
			this.next_sib = this.container.nextSibling;
		}
	}
	this.old_parent.removeChild(this.container);
	
	// Set the className so it appears all big.
	this.container.className += ' fullscreen';
	
	// Adjust the fs button.
	this.tbPressed(this.fsbutton, true);
	this.tbTooltip(this.fsbutton, "Click to exit fullscreen mode.".tr(this.decaf));
	
	// Hide all the other body elements.
	for(var i=0;i<document.body.children.length;i++) {
		var child = document.body.children[i];
		if ( child.id !== '_firebugConsole' && child.id.indexOf('DecafFlashSocket') !== 0 ) {
			this.old_children.push(child);
			this.old_display.push(child.style.display);
			child.style.display = 'none';
		}
	}
	
	// Append the container to <body>.
	this.old_body_over = document.body.style.overflow;
	// Don't do in Firefox.
	if ( !bodyHack ) { document.body.style.overflow = 'hidden'; }
	document.body.appendChild(this.container);
	
	window.scroll(0,0);
	
	// Resize and show the size.
	this._resizeToolbar();
	if ( showSize !== false ) { this.showSize(); }
	
	// Refocus input?
	if ( has_focus ) { this.input.focus(); }
	if ( this.display ) { this.display.doScroll(); }
}

/** Exit fullscreen mode. */
SimpleInterface.prototype.exit_fs = function() {
	if ( this.old_parent === undefined ) { return; }
	
	var has_focus = this.inpFocus;
	if ( this.display ) { this.display.shouldScroll(false); }
	
	// Pop the container from body.
	this.container.parentNode.removeChild(this.container);
	
	// Restore all the body elements.
	for(var i=0; i<this.old_children.length;i++) {
		var child = this.old_children[i];
		child.style.display = this.old_display[i];
	}
	this.old_children = [];
	this.old_display = [];
	
	// Remove the fullscreen class.
	var classes = this.container.className.split(' '),i=0;
	while(i<classes.length){
		if ( classes[i] === 'fullscreen' ) {
			classes.splice(i,1);
			continue;
		}
		i++;
	}
	this.container.className = classes.join(' ');
	
	// Adjust the fs button.
	this.tbPressed(this.fsbutton, false);
	this.tbTooltip(this.fsbutton, "Click to enter fullscreen mode.".tr(this.decaf));
	
	// Add the container back to the parent element.
	if ( this.next_sib !== undefined && this.next_sib !== null ) {
		this.old_parent.insertBefore(this.container, this.next_sib);
	} else {
		// Just add to the end.
		this.old_parent.appendChild(this.container);
	}
	
	// Restore the body overflow style.
	document.body.style.overflow = this.old_body_over;
	
	// Return to where we were scrolled before.
	window.scroll(this.oldscrollX, this.oldscrollY);
	
	// Show the size.
	this._resizeToolbar()
	this.showSize();
	
	// Refocus input?
	if ( has_focus ) { this.input.focus(); }
	if ( this.display ) { this.display.doScroll(); }
}

/** Store the old size. */
SimpleInterface.prototype.old_height = -1;
SimpleInterface.prototype.old_width = -1;
SimpleInterface.prototype.old_fs = false;

/** Resize the screen elements to fit together nicely. */
SimpleInterface.prototype.goFullOnResize = true;
SimpleInterface.prototype.resizeScreen = function(showSize,force) {
	// Are we fullscreen now when we weren't before?
	if ( this.goFullOnResize ) {
		var fs = window.fullScreen === true;
		if ( !fs ) {
			if ( window.outerHeight ) { fs = (window.screen.height - window.outerHeight) <= 5; }
			else if ( window.innerHeight ) { fs = (window.screen.height - window.innerHeight <= 5); }
		}
		if ( fs && !this.old_fs ) {
			this.old_fs = fs;
			this.enter_fs();
			return;
		} else if ( !fs && this.old_fs ) {
			this.old_fs = fs;
			this.exit_fs();
			return;
		}
		this.old_fs = fs;
	}
	
	// Now, handle actually resizing things.
	if ( force !== true && this.old_height === this.container.offsetHeight && this.old_width === this.container.offsetWidth ) { return; }
	this.old_height = this.container.offsetHeight;
	this.old_width = this.container.offsetWidth;
	
	// Resize the display element.
	var tot = this.old_height - (this._input.offsetHeight + 17);
	if ( this.toolbarPadding ) { tot = tot - (this.toolbarPadding-12); }
	if ( tot < 0 ) { tot = 0; }
	
	if ( this.settings ) { this.set_mid.style.height = tot + 'px'; }
	if ( this.toolbarPadding ) {
		tot -= 12;
		if ( tot < 0 ) { tot = 0; }
	}
	
	this.el_display.style.height = tot + 'px'; //cssText = 'height:'+tot+'px';
	if ( force !== true && this.display ) { this.display.scroll(); }
	
	// Move the scrollButton if it exists.
	if ( this.scrollButton ) {
		this.scrollButton.style.cssText = 'bottom:' + (this._input.offsetHeight + 12) + 'px';
	}
	
	if ( showSize !== false ) {
		this.showSize(); }
};

///////////////////////////////////////////////////////////////////////////////
// The Input Element
///////////////////////////////////////////////////////////////////////////////

/** Display user input out to the display, if local echo is enabled.
 * @param {String} text The input to display. */
SimpleInterface.prototype.displayInput = function(text) {
	if ( (!this.display) || (!this.echo) ) { return; }
	this.display.message("<b>" + text + "</b>",'user-intput',false);
}

/** Enable or disable local echoing. This, in addition to preventing player
 *  input from being output to the display, changes the INPUT element to a
 *  password input element.
 * @param {boolean} echo True if we should be echoing locally. */
SimpleInterface.prototype.localEcho = function(echo) {
	if ( echo === this.echo ) { return; }
	this.echo = echo;
	
	this.updateInput();
}

/** Handle keypresses from the display element. */
SimpleInterface.prototype.displayKey = function(e) {
	if (e.altKey || e.ctrlKey || e.metaKey ) { return; }
	
	// Range: A-Z=65-90, 1-0=48-57
	if (!( (e.keyCode > 64 && e.keyCode < 91) || (e.keyCode > 47 && e.keyCode < 58) 
		|| (e.keyCode > 185 && e.keyCode < 193)||(e.keyCode > 218 && e.keyCode < 223) )) {
		return; }
	
	this.input.focus();
}

/** A simpler KeyDown handler for passwords. This only cares about the enter
 *  key, and doesn't support MRU or tab completion at all. For internal use. */
SimpleInterface.prototype.handleInputPassword = function(e) {
	if ( e.keyCode !== 13 ) { return; }
	this.inpFocus = true;
	
	this.decaf.sendInput(this.input.value);
	this.input.value = '';
}

/** Handle a key press in the INPUT element. For internal use. */
SimpleInterface.prototype.handleInput = function(e) {
	if ( e.type !== 'keydown' ) { return; }
	if ( e.keyCode === 13 ) {
		this.decaf.sendInput(this.input.value);
		this.input.select();
	}
	
	// PgUp
	else if ( e.keyCode === 33 ) {
		if ( this.display && this.display.scrollUp ) {
			this.display.scrollUp();
			e.preventDefault();
		}
	}
	
	// PgDwn
	else if ( e.keyCode === 34 ) {
		if ( this.display && this.display.scrollDown ) {
			this.display.scrollDown();
			e.preventDefault();
		}
	}
}

/** Handle blur and focus events on the INPUT element. */
SimpleInterface.prototype.handleBlur = function(e) {
	var inp = this.input,
		bc	= this.decaf.options.set_interface.blurclass;
	
	if ( e.type === 'blur' ) {
		if ( inp.value === '' ) {
			inp.className += ' ' + bc;
		}
		
		var si = this;
		setTimeout(function(){
			if ( si.settings ) {
				si.settings.style.top = '0px';
				si.set_mid.style.overflowY = 'scroll';
			}
		},100);
		
		this.inpFocus = false;
	}
	
	else if ( e.type === 'focus' ) {
		var parts = inp.className.split(' '), out = [];
		for(var i=0;i<parts.length;i++) {
			if ( parts[i] !== bc ) { out.push(parts[i]); } }
		inp.className = out.join(' ');
		
		if ( this.settings ) {
			var t = -1* (this.settings.clientHeight * 0.5);
			this.settings.style.top = t + 'px';
			this.set_mid.style.overflowY = 'hidden';
		}
		
		this.inpFocus = true;
	}
}

/** Update the INPUT element to reflect the current state. This exchanges the
 *  current element with a special element if needed, for password input or
 *  multi-line input. For internal use.
 * @param {boolean} force If true, always replace the input element with a new
 *    one. */
SimpleInterface.prototype.updateInput = function(force) {
	if ( !this.input ) return;
	
	// Cache input focus.
	var foc = this.inpFocus;
	
	var si = this, inp = this.input, type, tag = this.input.tagName;
	type = tag === 'TEXTAREA' ? 'text' : inp.type;
	
	// Exit if we've nothing to do.
	if ( force !== true && ( (!this.echo && type === 'password') || (this.echo && type !== 'password') ) ) {
		return; }
	
	var cl	= inp.className,
		st	= inp.getAttribute('style'),
		id	= inp.id,
		par	= inp.parentNode,
		pos;
	
	// Determine the position in the DOM.
	pos = inp.nextElementSibling;
	if ( pos === undefined ) {
		// Try getting nextSibling for IE support
		if ( inp.nextSibling && inp.nextSibling.nodeType === inp.nodeType ) {
			pos = inp.nextSibling; }
	}
	
	// Is this changing to a password?
	if ( !this.echo ) {
		// Store the current input value.
		this.inp_buffer = inp.value;
		
		// Replace the INPUT element.
		var new_inp = document.createElement('input');
		new_inp.type = 'password';
		if ( cl ) { new_inp.className = cl; }
		if ( st ) { new_inp.setAttribute('style', st); }
		
		// Remove input.
		par.removeChild(inp);
		delete inp;
		delete this.input;
		
		// Attach the new input.
		if ( id ) { new_inp.id = id; }
		if ( pos ) { par.insertBefore(new_inp, pos);
		} else { par.appendChild(new_inp); }
		this.input = new_inp;
		
		// Attach an event listener for onKeyDown.
		addEvent(new_inp, 'keydown', function(e) { si.handleInputPassword(e); });
		
	} else {
		// Not a password.
		var lines = 1, new_inp;
		
		// Determine the number of lines.
		if ( this.inp_buffer ) {
			lines = this.inp_buffer.substr_count('\n') + 1; }
		
		// If one line, we're dealing with basic input. If more than one, a
		// textarea.
		if ( lines === 1 ) {
			new_inp = document.createElement('input');
			new_inp.type = 'text';
		} else {
			new_inp = document.createElement('textarea');
			if ( bodyHack ) {
				new_inp.setAttribute('rows', lines-1);
			} else {
				new_inp.setAttribute('rows', lines); }
		}
		
		if ( cl ) { new_inp.className = cl; }
		if ( st ) { new_inp.setAttribute('style', st); }
		
		// Set the value of the input element.
		if ( this.inp_buffer ) {
			new_inp.value = this.inp_buffer; }
		
		// Remove input.
		par.removeChild(inp);
		delete inp;
		delete this.input;
		
		// Attach the new input.
		if ( id ) { new_inp.id = id; }
		if ( pos ) { par.insertBefore(new_inp, pos);
		} else { par.appendChild(new_inp); }
		this.input = new_inp;
		
		// Attach an event listener.
		addEvent(new_inp, 'keydown', function(e) { si.handleInput(e); });
	}
	
	// Uncache input focus.
	this.inpFocus = foc;
	
	// Attach handlers for keydown, blur, and focus.
	var helper = function(e) { si.handleBlur(e); };
	addEvent(this.input, 'blur', helper);
	addEvent(this.input, 'focus', helper);
	
	if ( this.inpFocus ) {
		setTimeout(function(){si.input.select();si.input.focus();},1);
	}
};

// Expose this to DecafMUD
DecafMUD.plugins.Interface.simple = SimpleInterface;
})(DecafMUD);
