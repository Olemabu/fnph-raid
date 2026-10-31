/*==============================================================================
FNPH Raid core: adapted from Radius Raid's game.js (c) 2014 Jack Rugile, MIT licence.
Changes: full-window canvas, FNPH map battlefield, station-driven levels,
DOM menus instead of canvas menus, controller and lock-on aiming hooks.
==============================================================================*/
$.init = function() {
	$.setupStorage();
	$.cmg = document.getElementById( 'cmg' );
	$.cfg = document.getElementById( 'cfg' );
	$.ctxmg = $.cmg.getContext( '2d' );
	$.ctxfg = $.cfg.getContext( '2d' );
	$.ww = 1920;
	$.wh = 1200;
	$.mute = 0;
	$.autofire = 0;
	$.slowEnemyDivider = 3;
	$.keys = { state: { up:0, down:0, left:0, right:0, f:0, m:0, p:0 }, pressed: { up:0, down:0, left:0, right:0, f:0, m:0, p:0 } };
	$.okeys = {};
	$.mouse = { x: $.ww / 2, y: $.wh / 2, sx: 0, sy: 0, ax: 0, ay: 0, down: 0 };
	$.pad = { mx: 0, my: 0, fire: 0, aim: null };
	$.aimLock = null;
	$.buttons = [];
	$.levelCount = $.definitions.levels.length;
	$.states = {};
	$.state = '';
	$.enemies = []; $.bullets = []; $.explosions = []; $.powerups = []; $.particleEmitters = [];
	$.textPops = []; $.levelPops = []; $.powerupTimers = []; $.carriers = [];
	$.screen = { x: 0, y: 0 };
	$.resizecb();
	$.bindEvents();
	$.setupStates();
	$.reset();
	$.setState( 'idle' );
	$.loop();
};

$.reset = function() {
	$.indexGlobal = 0; $.dt = 1; $.lt = Date.now(); $.elapsed = 0; $.tick = 0;
	$.levelDiffOffset = 0; $.enemyOffsetMod = 0; $.slow = 0;
	$.rumble = { x: 0, y: 0, level: 0, decay: 0.4 };
	$.mouse.down = 0;
	$.level = { current: 0, kills: 0, killsToLevel: 1, distribution: $.definitions.levels[ 0 ].distribution, distributionCount: $.definitions.levels[ 0 ].distribution.length };
	$.enemies.length = 0; $.bullets.length = 0; $.explosions.length = 0; $.powerups.length = 0;
	$.particleEmitters.length = 0; $.textPops.length = 0; $.levelPops.length = 0; $.powerupTimers.length = 0; $.carriers.length = 0;
	for( var i = 0; i < $.definitions.powerups.length; i++ ) { $.powerupTimers.push( 0 ); }
	$.kills = 0; $.bulletsFired = 0; $.powerupsCollected = 0; $.score = 0;
	$.hero = new $.Hero();
};

$.setDifficulty = function( stationIndex ) {
	var li = Math.min( $.levelCount - 1, stationIndex ), def = $.definitions.levels[ li ];
	$.level.current = li;
	$.level.distribution = def.distribution.map( function( v ) { return Math.round( v * 1.7 ); } );
	$.level.distributionCount = $.level.distribution.length;
};

/*==============================================================================
Foreground (vignette + scanlines) and HUD
==============================================================================*/
$.renderForeground = function() {
	$.ctxfg.clearRect( 0, 0, $.cw, $.ch );
	var gradient = $.ctxfg.createRadialGradient( $.cw / 2, $.ch / 2, $.ch / 3, $.cw / 2, $.ch / 2, Math.max( $.cw, $.ch ) * 0.8 );
	gradient.addColorStop( 0, 'hsla(0, 0%, 0%, 0)' );
	gradient.addColorStop( 1, 'hsla(0, 0%, 0%, 0.55)' );
	$.ctxfg.fillStyle = gradient;
	$.ctxfg.fillRect( 0, 0, $.cw, $.ch );
	$.ctxfg.fillStyle = 'hsla(0, 0%, 50%, 0.06)';
	var i = Math.round( $.ch / 2 );
	while( i-- ) { $.ctxfg.fillRect( 0, i * 2, $.cw, 1 ); }
};

$.renderInterface = function() {
	var y0 = $.ch - 26;
	for( var i = 0; i < $.definitions.powerups.length; i++ ) {
		var powerup = $.definitions.powerups[ i ], on = ( $.powerupTimers[ i ] > 0 );
		if( !on ) { continue; }
		$.ctxmg.beginPath();
		var t = $.text( { ctx: $.ctxmg, x: $.cw - 140, y: y0 - i * 12, text: powerup.title, hspacing: 1, vspacing: 1, halign: 'right', valign: 'top', scale: 1, snap: 1, render: 1 } );
		$.ctxmg.fillStyle = 'hsla(0, 0%, 100%, 0.85)';
		$.ctxmg.fill();
		$.ctxmg.fillStyle = 'hsl(' + powerup.hue + ', ' + powerup.saturation + '%, ' + powerup.lightness + '%)';
		$.ctxmg.fillRect( t.ex + 6, t.sy, ( $.powerupTimers[ i ] / 300 ) * 110, 5 );
	}
	if( $.powerupTimers[ 1 ] > 0 ) {
		$.ctxmg.fillStyle = 'hsla(200, 100%, 20%, 0.05)';
		$.ctxmg.fillRect( 0, 0, $.cw, $.ch );
	}
};

$.renderMinimap = function() {
	var m = $.minimap;
	$.ctxmg.fillStyle = m.color;
	$.ctxmg.fillRect( m.x, m.y, m.width, m.height );
	if( $.miniMapImage ) { $.ctxmg.globalAlpha = 0.55; $.ctxmg.drawImage( $.miniMapImage, m.x, m.y, m.width, m.height ); $.ctxmg.globalAlpha = 1; }
	$.ctxmg.fillStyle = 'hsla(0, 0%, 100%, 0.1)';
	$.ctxmg.fillRect( Math.floor( m.x + -$.screen.x * m.scale ), Math.floor( m.y + -$.screen.y * m.scale ), Math.floor( $.cw * m.scale ), Math.floor( $.ch * m.scale ) );
	for( var i = 0; i < $.enemies.length; i++ ) {
		var e = $.enemies[ i ], x = m.x + Math.floor( e.x * m.scale ), y = m.y + Math.floor( e.y * m.scale );
		if( $.util.pointInRect( x + 1, y + 1, m.x, m.y, m.width, m.height ) ) { $.ctxmg.fillStyle = 'hsl(' + e.hue + ', ' + e.saturation + '%, 50%)'; $.ctxmg.fillRect( x, y, 2, 2 ); }
	}
	if( $.raid && $.raid.minimap ) { $.raid.minimap( m ); }
	$.ctxmg.fillStyle = '#fff';
	$.ctxmg.fillRect( m.x + Math.floor( $.hero.x * m.scale ) - 1, m.y + Math.floor( $.hero.y * m.scale ) - 1, 3, 3 );
	$.ctxmg.strokeStyle = m.strokeColor;
	$.ctxmg.strokeRect( m.x - 0.5, m.y - 0.5, m.width + 1, m.height + 1 );
};

/*==============================================================================
Enemy Spawning (original logic, spawn ring around the player so swarms arrive)
==============================================================================*/
$.getSpawnCoordinates = function( radius ) {
	var a = $.util.rand( 0, $.twopi ), d = Math.max( $.cw, $.ch ) * 0.62 + radius;
	var x = $.hero.x + Math.cos( a ) * d, y = $.hero.y + Math.sin( a ) * d;
	x = Math.max( -radius, Math.min( $.ww + radius, x ) ); y = Math.max( -radius, Math.min( $.wh + radius, y ) );
	var start = Math.abs( Math.cos( a ) ) > Math.abs( Math.sin( a ) ) ? ( Math.cos( a ) > 0 ? 'right' : 'left' ) : ( Math.sin( a ) > 0 ? 'bottom' : 'top' );
	return { x: x, y: y, start: start };
};
$.spawnEnemy = function( type ) {
	var params = $.definitions.enemies[ type ], c = $.getSpawnCoordinates( params.radius );
	params.x = c.x; params.y = c.y; params.start = c.start; params.type = type;
	return new $.Enemy( params );
};
$.spawnEnemies = function() {
	if( $.raid && !$.raid.swarmOn() ) { return; }
	var mult = $.raid ? $.raid.swarmRate() : 1;
	var floorTick = Math.floor( $.tick );
	for( var i = 0; i < $.level.distributionCount; i++ ) {
		var timeCheck = Math.max( 1, Math.round( $.level.distribution[ i ] * mult ) );
		$.spawnMark = $.spawnMark || [];
		if( floorTick % timeCheck === 0 && $.spawnMark[ i ] !== floorTick ) {
			$.spawnMark[ i ] = floorTick;
			if( $.enemies.length < 40 ) { $.enemies.push( $.spawnEnemy( i ) ); }
		}
	}
};

/*==============================================================================
Events
==============================================================================*/
$.mousemovecb = function( e ) { $.mouse.ax = e.clientX; $.mouse.ay = e.clientY; $.mouse.moved = 1; $.mousescreen(); if( $.raid ) { $.raid.onMouseMove(); } };
$.mousescreen = function() {
	$.mouse.sx = $.mouse.ax - $.cOffset.left; $.mouse.sy = $.mouse.ay - $.cOffset.top;
	$.mouse.x = $.mouse.sx - $.screen.x; $.mouse.y = $.mouse.sy - $.screen.y;
};
$.mousedowncb = function( e ) { if( e.button === 0 || e.pointerType === 'touch' ) { $.mouse.down = 1; $.mouse.ax = e.clientX; $.mouse.ay = e.clientY; $.mousescreen(); if( $.raid ) { $.raid.onMouseMove(); } } };
$.mouseupcb = function( e ) { $.mouse.down = 0; };
$.keydowncb = function( e ) {
	if( e.target && /INPUT|TEXTAREA/.test( e.target.tagName ) ) { return; }
	var k = e.keyCode || e.which;
	if( k === 38 || k === 87 ) { $.keys.state.up = 1; }
	if( k === 39 || k === 68 ) { $.keys.state.right = 1; }
	if( k === 40 || k === 83 ) { $.keys.state.down = 1; }
	if( k === 37 || k === 65 ) { $.keys.state.left = 1; }
	if( k === 70 ) { $.keys.state.f = 1; }
	if( k === 77 ) { $.keys.state.m = 1; }
	if( k === 80 ) { $.keys.state.p = 1; }
	if( [ 32, 37, 38, 39, 40 ].indexOf( k ) > -1 && $.state === 'play' ) { e.preventDefault(); }
};
$.keyupcb = function( e ) {
	var k = e.keyCode || e.which;
	if( k === 38 || k === 87 ) { $.keys.state.up = 0; }
	if( k === 39 || k === 68 ) { $.keys.state.right = 0; }
	if( k === 40 || k === 83 ) { $.keys.state.down = 0; }
	if( k === 37 || k === 65 ) { $.keys.state.left = 0; }
	if( k === 70 ) { $.keys.state.f = 0; }
	if( k === 77 ) { $.keys.state.m = 0; }
	if( k === 80 ) { $.keys.state.p = 0; }
};
$.resizecb = function() {
	var stage = document.getElementById( 'stage' ), r = stage.getBoundingClientRect();
	$.cw = $.cmg.width = $.cfg.width = Math.max( 320, Math.round( r.width ) );
	$.ch = $.cmg.height = $.cfg.height = Math.max( 240, Math.round( r.height ) );
	$.cOffset = { left: r.left, top: r.top };
	var mw = Math.round( Math.min( 220, $.cw * 0.22 ) ), mh = Math.round( mw * $.wh / $.ww );
	$.minimap = { x: 14, y: $.ch - mh - 14, width: mw, height: mh, scale: mw / $.ww, color: 'hsla(0, 0%, 0%, 0.75)', strokeColor: '#3a3a3a' };
	$.renderForeground();
};
$.blurcb = function() { if( $.state === 'play' && $.raid ) { $.raid.pause(); } };
$.bindEvents = function() {
	var c = document.getElementById( 'cfg' );
	c.addEventListener( 'pointermove', $.mousemovecb );
	c.addEventListener( 'pointerdown', $.mousedowncb );
	window.addEventListener( 'pointerup', $.mouseupcb );
	window.addEventListener( 'keydown', $.keydowncb );
	window.addEventListener( 'keyup', $.keyupcb );
	window.addEventListener( 'resize', function() { $.resizecb(); } );
	window.addEventListener( 'blur', $.blurcb );
	c.addEventListener( 'contextmenu', function( e ) { e.preventDefault(); } );
};

/*==============================================================================
Miscellaneous
==============================================================================*/
$.clearScreen = function() { $.ctxmg.clearRect( 0, 0, $.cw, $.ch ); };
$.updateDelta = function() {
	var now = Date.now();
	$.dt = ( now - $.lt ) / ( 1000 / 60 );
	$.dt = ( $.dt < 0 ) ? 0.001 : $.dt;
	$.dt = ( $.dt > 4 ) ? 4 : $.dt;
	$.lt = now;
	$.elapsed += $.dt;
};
$.updateScreen = function() {
	var xModify, yModify;
	if( $.hero.x < $.cw / 2 ) { xModify = $.hero.x / $.cw; } else if( $.hero.x > $.ww - $.cw / 2 ) { xModify = 1 - ( $.ww - $.hero.x ) / $.cw; } else { xModify = 0.5; }
	if( $.hero.y < $.ch / 2 ) { yModify = $.hero.y / $.ch; } else if( $.hero.y > $.wh - $.ch / 2 ) { yModify = 1 - ( $.wh - $.hero.y ) / $.ch; } else { yModify = 0.5; }
	if( $.cw >= $.ww ) { xModify = $.hero.x / $.ww; }
	if( $.ch >= $.wh ) { yModify = $.hero.y / $.wh; }
	$.screen.x += ( ( $.cw * xModify - $.hero.x ) - $.screen.x ) / 18 * $.dt;
	$.screen.y += ( ( $.ch * yModify - $.hero.y ) - $.screen.y ) / 18 * $.dt;
	if( $.rumble.level > 0 ) {
		$.rumble.level -= $.rumble.decay; $.rumble.level = Math.max( 0, $.rumble.level );
		$.rumble.x = $.util.rand( -$.rumble.level, $.rumble.level ); $.rumble.y = $.util.rand( -$.rumble.level, $.rumble.level );
	} else { $.rumble.x = 0; $.rumble.y = 0; }
	$.mousescreen();
};
$.updatePowerupTimers = function() {
	if( $.powerupTimers[ 0 ] > 0 ) { if( $.hero.life < 1 ) { $.hero.life += 0.001; } if( $.hero.life > 1 ) { $.hero.life = 1; } $.powerupTimers[ 0 ] -= $.dt; }
	if( $.powerupTimers[ 1 ] > 0 ) { $.slow = 1; $.powerupTimers[ 1 ] -= $.dt; } else { $.slow = 0; }
	if( $.powerupTimers[ 2 ] > 0 ) { $.hero.weapon.fireRate = 2; $.hero.weapon.bullet.speed = 14; $.powerupTimers[ 2 ] -= $.dt; } else { $.hero.weapon.fireRate = 5; $.hero.weapon.bullet.speed = 10; }
	if( $.powerupTimers[ 3 ] > 0 ) { $.hero.weapon.count = 3; $.powerupTimers[ 3 ] -= $.dt; } else { $.hero.weapon.count = 1; }
	if( $.powerupTimers[ 4 ] > 0 ) { $.hero.weapon.bullet.piercing = 1; $.powerupTimers[ 4 ] -= $.dt; } else { $.hero.weapon.bullet.piercing = 0; }
};
$.spawnPowerup = function( x, y, force ) {
	if( force || Math.random() < 0.1 ) {
		var min = ( $.hero.life < 0.9 ) ? 0 : 1,
			type = Math.floor( $.util.rand( min, $.definitions.powerups.length ) ),
			params = $.definitions.powerups[ type ];
		params.type = type; params.x = x; params.y = y;
		$.powerups.push( new $.Powerup( params ) );
	}
};

/*==============================================================================
States: 'idle' (menus are HTML), 'play', 'freeze' (a teaching card is open)
==============================================================================*/
$.setState = function( state ) {
	if( state === 'play' ) { $.lt = Date.now(); }
	$.state = state;
};
$.setupStates = function() {
	$.states[ 'idle' ] = function() {};
	$.states[ 'freeze' ] = function() { $.lt = Date.now(); };
	$.states[ 'play' ] = function() {
		$.updateDelta();
		$.updateScreen();
		$.updatePowerupTimers();
		$.spawnEnemies();
		$.enemyOffsetMod += ( $.slow ) ? $.dt / 3 : $.dt;
		if( $.raid ) { $.raid.input(); }
		var i = $.enemies.length; while( i-- ) { $.enemies[ i ].update( i ); }
		i = $.carriers.length; while( i-- ) { $.carriers[ i ].update( i ); }
		i = $.explosions.length; while( i-- ) { $.explosions[ i ].update( i ); }
		i = $.powerups.length; while( i-- ) { $.powerups[ i ].update( i ); }
		i = $.particleEmitters.length; while( i-- ) { $.particleEmitters[ i ].update( i ); }
		i = $.textPops.length; while( i-- ) { $.textPops[ i ].update( i ); }
		i = $.levelPops.length; while( i-- ) { $.levelPops[ i ].update( i ); }
		i = $.bullets.length; while( i-- ) { $.bullets[ i ].update( i ); }
		$.hero.update();
		if( $.raid ) { $.raid.update(); }

		$.clearScreen();
		if( $.raid ) { $.raid.renderMap(); }
		$.ctxmg.save();
		$.ctxmg.translate( Math.round( $.screen.x - $.rumble.x ), Math.round( $.screen.y - $.rumble.y ) );
		if( $.raid ) { $.raid.renderWorld(); }
		i = $.enemies.length; while( i-- ) { $.enemies[ i ].render( i ); }
		i = $.explosions.length; while( i-- ) { $.explosions[ i ].render( i ); }
		i = $.powerups.length; while( i-- ) { $.powerups[ i ].render( i ); }
		i = $.particleEmitters.length; while( i-- ) { $.particleEmitters[ i ].render( i ); }
		i = $.textPops.length; while( i-- ) { $.textPops[ i ].render( i ); }
		i = $.bullets.length; while( i-- ) { $.bullets[ i ].render( i ); }
		i = $.carriers.length; while( i-- ) { $.carriers[ i ].render( i ); }
		$.hero.render();
		if( $.raid ) { $.raid.renderAim(); }
		if( $.raid && $.raid.renderLighting ) { $.raid.renderLighting(); }
		$.ctxmg.restore();
		i = $.levelPops.length; while( i-- ) { $.levelPops[ i ].render( i ); }
		$.renderInterface();
		$.renderMinimap();
		$.tick += $.dt;
		if( $.keys.pressed.p && $.raid ) { $.raid.pause(); }
		if( $.keys.pressed.f ) { $.autofire = ~~!$.autofire; if( $.raid ) { $.raid.toast( $.autofire ? 'Autofire ON. Careful: stray shots can hit answers.' : 'Autofire off', !$.autofire ); } }
	};
};

/*==============================================================================
Loop
==============================================================================*/
$.loop = function() {
	requestAnimFrame( $.loop );
	for( var k in $.keys.state ) { $.keys.pressed[ k ] = ( $.keys.state[ k ] && !$.okeys[ k ] ) ? 1 : 0; }
	if( $.raid ) { $.raid.pollPad(); }
	$.states[ $.state ]();
	if( $.keys.pressed.m && $.raid ) { $.raid.toggleSound(); }
	$.okeys = {};
	for( var k2 in $.keys.state ) { $.okeys[ k2 ] = $.keys.state[ k2 ]; }
};
