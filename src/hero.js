/*==============================================================================
Init
==============================================================================*/
$.Hero = function() {
	this.x = $.ww / 2;
	this.y = $.wh / 2;
	this.vx = 0;
	this.vy = 0;
	this.vmax = 4;
	this.vmax = 6;
	this.direction = 0;
	this.accel = 0.5;
	this.radius = 10;
	this.life = 1;
	this.takingDamage = 0;
	this.fillStyle = '#fff';
	this.weapon = {
		fireRate: 5,
		fireRateTick: 5,
		spread: 0.3,
		count: 1,
		bullet: {
			size: 24,
			lineWidth: 2.6,
			damage: 1,
			speed: 10,
			piercing: 0,
			strokeStyle: '#ffd27a'
		},
		fireFlag: 0
	};	
};

/*==============================================================================
Update
==============================================================================*/
$.Hero.prototype.update = function() {
	if( this.life > 0 ) {
		/*==============================================================================
		Apply Forces
		==============================================================================*/
		if( $.keys.state.up ) {
			this.vy -= this.accel * $.dt;
			if( this.vy < -this.vmax ) {
				this.vy = -this.vmax;
			}
		} else if( $.keys.state.down ) {
			this.vy += this.accel * $.dt;
			if( this.vy > this.vmax ) {
				this.vy = this.vmax;
			}
		}
		if( $.keys.state.left ) {
			this.vx -= this.accel * $.dt;
			if( this.vx < -this.vmax ) {
				this.vx = -this.vmax;
			}
		} else if( $.keys.state.right ) {
			this.vx += this.accel * $.dt;
			if( this.vx > this.vmax ) {
				this.vx = this.vmax;
			}
		}

		if( $.pad.mx || $.pad.my ) {
			this.vx += ( $.pad.mx * this.vmax * 1.6 - this.vx ) * 0.3 * $.dt;
			this.vy += ( $.pad.my * this.vmax * 1.6 - this.vy ) * 0.3 * $.dt;
		}
		this.vy *= 0.9;
		this.vx *= 0.9;	
		
		this.x += this.vx * $.dt;
		this.y += this.vy * $.dt;

		/*==============================================================================
		Lock Bounds
		==============================================================================*/
		if( this.x >= $.ww - this.radius ) {
			this.x = $.ww - this.radius;
		}
		if( this.x <= this.radius ) {
			this.x = this.radius;
		}
		if( this.y >= $.wh - this.radius ) {
			this.y = $.wh - this.radius;
		}
		if( this.y <= this.radius ) {
			this.y = this.radius;
		}

		/*==============================================================================
		Update Direction
		==============================================================================*/
		var lock = ( $.aimLock && $.aimLock.alive ) ? $.aimLock : null;
		if( lock ) {
			this.direction = Math.atan2( lock.y - this.y, lock.x - this.x );
		} else if( $.pad.aim !== null && $.pad.aim !== undefined ) {
			this.direction = $.pad.aim;
		} else {
			var dx = $.mouse.x - this.x,
				dy = $.mouse.y - this.y;
			this.direction = Math.atan2( dy, dx );
		}

		/*==============================================================================
		Fire Weapon
		==============================================================================*/
		if( this.weapon.fireRateTick < this.weapon.fireRate ){
			this.weapon.fireRateTick += $.dt;
		} else {
			if( $.autofire || $.mouse.down || $.pad.fire || $.keyFire ){
				$.audio.play( 'shoot' );
				if( $.powerupTimers[ 2 ] > 0 || $.powerupTimers[ 3 ] > 0 || $.powerupTimers[ 4 ] > 0) {
					$.audio.play( 'shootAlt' );
				}

				this.weapon.fireRateTick = this.weapon.fireRateTick - this.weapon.fireRate;
				this.weapon.fireFlag = 6;
				if( $.onShot ) { $.onShot( this ); }

				if( this.weapon.count > 1 ) {
					var spreadStart = -this.weapon.spread / 2;
					var spreadStep = this.weapon.spread / ( this.weapon.count - 1 );
				} else {
					var spreadStart = 0;
					var spreadStep = 0;
				}

				var gunX = this.x + Math.cos( this.direction ) * ( 44 + this.weapon.bullet.size );
				var gunY = this.y + Math.sin( this.direction ) * ( 44 + this.weapon.bullet.size );

				for( var i = 0; i < this.weapon.count; i++ ) {
					$.bulletsFired++;
					var color = this.weapon.bullet.strokeStyle;
					if( $.powerupTimers[ 2 ] > 0 || $.powerupTimers[ 3 ] > 0 || $.powerupTimers[ 4 ] > 0) {
						var colors = [];
						if( $.powerupTimers[ 2 ] > 0 ) { colors.push( 'hsl(' + $.definitions.powerups[ 2 ].hue + ', ' + $.definitions.powerups[ 2 ].saturation + '%, ' + $.definitions.powerups[ 2 ].lightness + '%)' ); }
						if( $.powerupTimers[ 3 ] > 0 ) { colors.push( 'hsl(' + $.definitions.powerups[ 3 ].hue + ', ' + $.definitions.powerups[ 3 ].saturation + '%, ' + $.definitions.powerups[ 3 ].lightness + '%)' ); }
						if( $.powerupTimers[ 4 ] > 0 ) { colors.push( 'hsl(' + $.definitions.powerups[ 4 ].hue + ', ' + $.definitions.powerups[ 4 ].saturation + '%, ' + $.definitions.powerups[ 4 ].lightness + '%)' ); }
						color = colors[ Math.floor( $.util.rand( 0, colors.length ) ) ];
					}
					$.bullets.push( new $.Bullet( {					
						x: gunX,
						y: gunY,
						speed: this.weapon.bullet.speed,
						direction: this.direction + spreadStart + i * spreadStep,
						damage: this.weapon.bullet.damage,
						size: this.weapon.bullet.size,
						lineWidth: this.weapon.bullet.lineWidth,
						strokeStyle: color,
						piercing: this.weapon.bullet.piercing					
					} ) );
				}
			}
		}

		/*==============================================================================
		Check Collisions
		==============================================================================*/
		this.takingDamage = 0;
		var ei = $.enemies.length;
		while( ei-- ) {
			var enemy = $.enemies[ ei ];
			if( enemy.inView && $.util.distance( this.x, this.y, enemy.x, enemy.y ) <= this.radius + enemy.radius ) {
				$.particleEmitters.push( new $.ParticleEmitter( {
					x: this.x,
					y: this.y,
					count: 2,
					spawnRange: 0,
					friction: 0.85,
					minSpeed: 2,
					maxSpeed: 15,
					minDirection: 0,
					maxDirection: $.twopi,
					hue: 0,
					saturation: 0
				} ) );
				this.takingDamage = 1;
				this.life -= 0.0075;
				$.rumble.level = 3;
				if( Math.floor( $.tick ) % 5 == 0 ){
					$.audio.play( 'takingDamage' );
				}
			}
		}		
	}
};

/*==============================================================================
Render
==============================================================================*/
$.Hero.prototype.render = function() {
	if( this.life <= 0 ) { return; }
	var c = $.ctxmg, t = $.tick / 60;
	var speed = Math.hypot( this.vx, this.vy );
	var isThrusting = ( speed > 0.4 || $.keys.state.up || $.keys.state.down || $.keys.state.left || $.keys.state.right || $.pad.mx || $.pad.my );

	/*==============================================================================
	1. Headlight Cone (cast onto terrain ahead of ship)
	==============================================================================*/
	c.save();
	c.translate( this.x, this.y );
	c.rotate( this.direction );

	var beamDist = 260;
	var beamGrad = c.createRadialGradient( 10, 0, 12, 130, 0, beamDist );
	beamGrad.addColorStop( 0, 'rgba(180, 235, 255, 0.24)' );
	beamGrad.addColorStop( 0.45, 'rgba(110, 210, 255, 0.10)' );
	beamGrad.addColorStop( 1, 'rgba(90, 180, 255, 0)' );
	c.fillStyle = beamGrad;
	c.beginPath();
	c.moveTo( 14, -8 );
	c.lineTo( beamDist, -80 );
	c.arc( 0, 0, beamDist, -0.32, 0.32 );
	c.lineTo( 14, 8 );
	c.closePath();
	c.fill();

	/* Central tighter bright beam */
	var coreGrad = c.createRadialGradient( 14, 0, 6, 80, 0, 160 );
	coreGrad.addColorStop( 0, 'rgba(230, 250, 255, 0.35)' );
	coreGrad.addColorStop( 0.5, 'rgba(160, 230, 255, 0.12)' );
	coreGrad.addColorStop( 1, 'rgba(160, 230, 255, 0)' );
	c.fillStyle = coreGrad;
	c.beginPath();
	c.moveTo( 16, -4 );
	c.lineTo( 160, -32 );
	c.arc( 0, 0, 160, -0.20, 0.20 );
	c.lineTo( 16, 4 );
	c.closePath();
	c.fill();
	c.restore();

	/*==============================================================================
	2. Thruster Plasma Plumes (behind the ship)
	==============================================================================*/
	if( isThrusting ) {
		c.save();
		c.translate( this.x, this.y );
		c.rotate( this.direction );

		var plumeLen = 14 + ( speed / this.vmax ) * 22 + Math.random() * 6;
		var nozzles = [ -6.5, 6.5 ];

		for( var n = 0; n < nozzles.length; n++ ) {
			var ny = nozzles[ n ];
			// Outer flame
			var flameGrad = c.createLinearGradient( -14, ny, -14 - plumeLen, ny );
			flameGrad.addColorStop( 0, 'rgba(255, 255, 255, 0.95)' );
			flameGrad.addColorStop( 0.25, 'rgba(98, 230, 255, 0.85)' );
			flameGrad.addColorStop( 0.7, 'rgba(255, 130, 40, 0.55)' );
			flameGrad.addColorStop( 1, 'rgba(255, 60, 20, 0)' );
			c.fillStyle = flameGrad;
			c.beginPath();
			c.moveTo( -14, ny - 3.5 );
			c.lineTo( -14 - plumeLen, ny );
			c.lineTo( -14, ny + 3.5 );
			c.closePath();
			c.fill();

			// Bright inner needle
			c.fillStyle = 'rgba(240, 255, 255, 0.95)';
			c.beginPath();
			c.moveTo( -14, ny - 1.5 );
			c.lineTo( -14 - plumeLen * 0.5, ny );
			c.lineTo( -14, ny + 1.5 );
			c.closePath();
			c.fill();
		}
		c.restore();

		// Spawn occasional ember particle
		if( Math.random() < 0.35 && $.particleEmitters ) {
			var rx = this.x - Math.cos( this.direction ) * 16 + ( Math.random() - 0.5 ) * 8;
			var ry = this.y - Math.sin( this.direction ) * 16 + ( Math.random() - 0.5 ) * 8;
			$.particleEmitters.push( new $.ParticleEmitter( {
				x: rx,
				y: ry,
				count: 1,
				spawnRange: 2,
				friction: 0.88,
				minSpeed: 1,
				maxSpeed: 4,
				minDirection: this.direction + $.pi - 0.3,
				maxDirection: this.direction + $.pi + 0.3,
				hue: Math.random() < 0.6 ? 195 : 30,
				saturation: 100
			} ) );
		}
	}

	/*==============================================================================
	3. Interceptor Ship Hull
	==============================================================================*/
	c.save();
	c.translate( this.x, this.y );
	c.rotate( this.direction );

	// Drop shadow under ship for elevation
	c.save();
	c.translate( 3, 5 );
	c.fillStyle = 'rgba(0, 0, 0, 0.45)';
	c.beginPath();
	c.moveTo( 22, 0 );
	c.lineTo( 6, -7 );
	c.lineTo( -4, -18 );
	c.lineTo( -13, -17 );
	c.lineTo( -9, -9 );
	c.lineTo( -14, -7 );
	c.lineTo( -14, 7 );
	c.lineTo( -9, 9 );
	c.lineTo( -13, 17 );
	c.lineTo( -4, 18 );
	c.lineTo( 6, 7 );
	c.closePath();
	c.fill();
	c.restore();

	// Main Wings & Fuselage Outer Silhouette
	c.beginPath();
	c.moveTo( 22, 0 );
	c.lineTo( 6, -7 );
	c.lineTo( -4, -18 );
	c.lineTo( -13, -17 );
	c.lineTo( -9, -9 );
	c.lineTo( -14, -7 );
	c.lineTo( -14, -2 );
	c.lineTo( -11, 0 );
	c.lineTo( -14, 2 );
	c.lineTo( -14, 7 );
	c.lineTo( -9, 9 );
	c.lineTo( -13, 17 );
	c.lineTo( -4, 18 );
	c.lineTo( 6, 7 );
	c.closePath();

	// Hull gradient (dark interceptor armor with edge sheen)
	var hullGrad = c.createLinearGradient( -14, 0, 22, 0 );
	hullGrad.addColorStop( 0, '#151c24' );
	hullGrad.addColorStop( 0.45, '#222d38' );
	hullGrad.addColorStop( 0.8, '#2e3d4c' );
	hullGrad.addColorStop( 1, '#485d72' );
	c.fillStyle = hullGrad;
	c.fill();

	// Glowing hull perimeter outline
	c.strokeStyle = this.takingDamage ? '#ff5468' : '#62e6ff';
	c.lineWidth = 1.6;
	c.stroke();

	// Wing Plating & Inset Details
	c.fillStyle = '#2d3b49';
	// Port wing panel
	c.beginPath();
	c.moveTo( 4, -6 );
	c.lineTo( -3, -15 );
	c.lineTo( -10, -14 );
	c.lineTo( -7, -8 );
	c.closePath();
	c.fill();
	c.strokeStyle = 'rgba(98, 230, 255, 0.4)';
	c.lineWidth = 1;
	c.stroke();

	// Starboard wing panel
	c.beginPath();
	c.moveTo( 4, 6 );
	c.lineTo( -3, 15 );
	c.lineTo( -10, 14 );
	c.lineTo( -7, 8 );
	c.closePath();
	c.fill();
	c.stroke();

	// Wingtip Navigation Strobe Lights
	// Port (Red)
	c.fillStyle = '#ff3344';
	c.beginPath();
	c.arc( -9, -17, 1.8, 0, $.twopi );
	c.fill();
	c.fillStyle = 'rgba(255, 50, 70, 0.45)';
	c.beginPath();
	c.arc( -9, -17, 4, 0, $.twopi );
	c.fill();

	// Starboard (Green)
	c.fillStyle = '#33ff77';
	c.beginPath();
	c.arc( -9, 17, 1.8, 0, $.twopi );
	c.fill();
	c.fillStyle = 'rgba(50, 255, 120, 0.45)';
	c.beginPath();
	c.arc( -9, 17, 4, 0, $.twopi );
	c.fill();

	// Engine Nozzle Rings (Glow)
	c.fillStyle = isThrusting ? '#62e6ff' : '#2a3542';
	c.fillRect( -14, -8, 2, 4 );
	c.fillRect( -14, 4, 2, 4 );

	// Central Fuselage Ridge Spine
	c.strokeStyle = 'rgba(242, 184, 75, 0.7)';
	c.lineWidth = 1.2;
	c.beginPath();
	c.moveTo( 15, 0 );
	c.lineTo( -8, 0 );
	c.stroke();

	// Cockpit Canopy (Glowing Cyan Gem / Glass)
	var canopyGrad = c.createLinearGradient( -2, 0, 13, 0 );
	canopyGrad.addColorStop( 0, '#093644' );
	canopyGrad.addColorStop( 0.45, '#127a96' );
	canopyGrad.addColorStop( 0.85, '#62e6ff' );
	canopyGrad.addColorStop( 1, '#d8f8ff' );

	c.beginPath();
	c.moveTo( 13, 0 );
	c.lineTo( 4, -3.5 );
	c.lineTo( -2, -3 );
	c.lineTo( -4, 0 );
	c.lineTo( -2, 3 );
	c.lineTo( 4, 3.5 );
	c.closePath();
	c.fillStyle = canopyGrad;
	c.fill();
	c.strokeStyle = '#c4f6ff';
	c.lineWidth = 1;
	c.stroke();

	// Canopy Glare Highlight
	c.strokeStyle = 'rgba(255, 255, 255, 0.85)';
	c.lineWidth = 1;
	c.beginPath();
	c.moveTo( 10, -1 );
	c.lineTo( 2, -2.5 );
	c.stroke();

	/*==============================================================================
	4. Muzzle Flash (When firing)
	==============================================================================*/
	if( this.weapon.fireFlag > 0 ) {
		this.weapon.fireFlag -= $.dt;
		var flashRadius = 7 + Math.random() * 5;
		var fGrad = c.createRadialGradient( 24, 0, 1, 24, 0, flashRadius );
		fGrad.addColorStop( 0, '#ffffff' );
		fGrad.addColorStop( 0.35, '#ffe27a' );
		fGrad.addColorStop( 0.8, 'rgba(255, 120, 40, 0.6)' );
		fGrad.addColorStop( 1, 'rgba(255, 80, 20, 0)' );
		c.fillStyle = fGrad;
		c.beginPath();
		c.arc( 24, 0, flashRadius, 0, $.twopi );
		c.fill();

		// Star spikes
		c.strokeStyle = 'rgba(255, 245, 200, 0.9)';
		c.lineWidth = 1.2;
		c.beginPath();
		c.moveTo( 24 - flashRadius * 1.3, 0 );
		c.lineTo( 24 + flashRadius * 1.3, 0 );
		c.moveTo( 24, -flashRadius * 0.9 );
		c.lineTo( 24, flashRadius * 0.9 );
		c.stroke();
	}

	c.restore();

	/*==============================================================================
	5. Shield Barrier Flare (when taking damage)
	==============================================================================*/
	if( this.takingDamage ) {
		c.save();
		c.translate( this.x, this.y );
		var shieldR = 26 + Math.random() * 3;
		var shHue = Math.random() < 0.5 ? 195 : 350;
		c.strokeStyle = 'hsla(' + shHue + ', 100%, 75%, ' + ( 0.6 + Math.random() * 0.4 ) + ')';
		c.lineWidth = 2.5;

		// Hexagonal shield lattice
		c.beginPath();
		for( var h = 0; h < 6; h++ ) {
			var ang = h * ( $.twopi / 6 ) + t * 4;
			var hx = Math.cos( ang ) * shieldR;
			var hy = Math.sin( ang ) * shieldR;
			if( h === 0 ) c.moveTo( hx, hy );
			else c.lineTo( hx, hy );
		}
		c.closePath();
		c.fillStyle = 'hsla(' + shHue + ', 100%, 50%, 0.12)';
		c.fill();
		c.stroke();

		// Shield hit ripple arcs
		c.lineWidth = 1.5;
		c.beginPath();
		c.arc( 0, 0, shieldR + 6, t * 8, t * 8 + 1.8 );
		c.stroke();
		c.beginPath();
		c.arc( 0, 0, shieldR + 6, t * 8 + $.pi, t * 8 + $.pi + 1.8 );
		c.stroke();

		c.restore();
	}
};