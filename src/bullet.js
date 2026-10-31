/*==============================================================================
Init
==============================================================================*/
$.Bullet = function( opt ) {
	for( var k in opt ) {
		this[k] = opt[k];
	}
	this.enemiesHit = [];
	this.inView = 0;
	$.particleEmitters.push( new $.ParticleEmitter( {
		x: this.x,
		y: this.y,
		count: 1,
		spawnRange: 1,
		friction: 0.75,
		minSpeed: 2,
		maxSpeed: 10,
		minDirection: 0,
		maxDirection: $.twopi,
		hue: 0,
		saturation: 0
	} ) );
};

/*==============================================================================
Update
==============================================================================*/
$.Bullet.prototype.update = function( i ) {
	/*==============================================================================
	Apply Forces
	==============================================================================*/
	// Mk V seeker rounds curve towards the locked answer
	if( this.homing && this.target && this.target.alive ) {
		var want = Math.atan2( this.target.y - this.y, this.target.x - this.x ), dd = want - this.direction;
		while( dd > Math.PI ) dd -= Math.PI * 2;
		while( dd < -Math.PI ) dd += Math.PI * 2;
		this.direction += Math.max( -this.homing, Math.min( this.homing, dd ) ) * $.dt;
	}
	this.x += Math.cos( this.direction ) * ( this.speed * $.dt );
	this.y += Math.sin( this.direction ) * ( this.speed * $.dt );
	this.ex = this.x - Math.cos( this.direction ) * this.size;
	this.ey = this.y - Math.sin( this.direction ) * this.size;

	/*==============================================================================
	Check Collisions (enemies, then FNPH answer carriers)
	==============================================================================*/
	var removed = false;
	var ei = $.enemies.length;
	while( ei-- && !removed ) {
		var enemy = $.enemies[ ei ];
		if( $.util.distance( this.x, this.y, enemy.x, enemy.y ) <= enemy.radius ) {
			if( this.enemiesHit.indexOf( enemy.index ) == -1 ){
				$.particleEmitters.push( new $.ParticleEmitter( {
					x: this.x, y: this.y, count: Math.floor( $.util.rand( 1, 4 ) ), spawnRange: 0, friction: 0.85, minSpeed: 5, maxSpeed: 12,
					minDirection: ( this.direction - $.pi ) - $.pi / 5, maxDirection: ( this.direction - $.pi ) + $.pi / 5, hue: enemy.hue
				} ) );
				this.enemiesHit.push( enemy.index );
				enemy.receiveDamage( ei, this.damage );
				if( this.enemiesHit.length > 3 ) { removed = true; }
			}
			if( !this.piercing ) { removed = true; }
		}
	}
	var ci = $.carriers.length;
	while( ci-- && !removed ) {
		var carrier = $.carriers[ ci ];
		// a shot fired at a locked answer flies past the other answers, so you never hit a wrong one by accident
		if( this.target && this.target.alive && carrier !== this.target ) { continue; }
		if( carrier.alive && $.util.distance( this.x, this.y, carrier.x, carrier.y ) <= carrier.radius + 2 ) {
			if( this.enemiesHit.indexOf( 'c' + carrier.num ) == -1 ) {
				this.enemiesHit.push( 'c' + carrier.num );
				$.particleEmitters.push( new $.ParticleEmitter( {
					x: this.x, y: this.y, count: 3, spawnRange: 0, friction: 0.85, minSpeed: 5, maxSpeed: 12,
					minDirection: ( this.direction - $.pi ) - $.pi / 5, maxDirection: ( this.direction - $.pi ) + $.pi / 5, hue: 322
				} ) );
				carrier.hit( this.damage );
			}
			removed = true;
		}
	}
	if( removed ) { $.bullets.splice( i, 1 ); return; }

	/*==============================================================================
	Lock Bounds
	==============================================================================*/
	if( !$.util.pointInRect( this.ex, this.ey, 0, 0, $.ww, $.wh ) ) {
		$.bullets.splice( i, 1 );
		return;
	}

	/*==============================================================================
	Update View
	==============================================================================*/
	if( $.util.pointInRect( this.ex, this.ey, -$.screen.x, -$.screen.y, $.cw, $.ch ) ) {
		this.inView = 1;
	} else {
		this.inView = 0;
	}
};

/*==============================================================================
Render
==============================================================================*/
$.Bullet.prototype.render = function( i ) {
	if( this.inView ) {
		var c = $.ctxmg;
		// 1. Outer Neon Plasma Glow
		c.beginPath();
		c.moveTo( this.x, this.y );
		c.lineTo( this.ex, this.ey );
		c.lineWidth = this.lineWidth * 2.6;
		c.strokeStyle = this.strokeStyle;
		c.globalAlpha = 0.4;
		c.stroke();

		// 2. Mid Plasma Beam
		c.beginPath();
		c.moveTo( this.x, this.y );
		c.lineTo( this.ex, this.ey );
		c.lineWidth = this.lineWidth * 1.5;
		c.strokeStyle = this.strokeStyle;
		c.globalAlpha = 0.85;
		c.stroke();

		// 3. Superheated White Energy Core
		c.beginPath();
		c.moveTo( this.x, this.y );
		c.lineTo( this.ex, this.ey );
		c.lineWidth = Math.max( 1.2, this.lineWidth * 0.7 );
		c.strokeStyle = '#ffffff';
		c.globalAlpha = 0.95;
		c.stroke();
		c.globalAlpha = 1;

		// 4. Glowing Plasma Bullet Head
		c.fillStyle = '#ffffff';
		c.beginPath();
		c.arc( this.x, this.y, Math.max( 1.8, this.lineWidth * 0.75 ), 0, $.twopi );
		c.fill();
	}
};