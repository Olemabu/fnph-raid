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
		Update Direction & Turn Rate for Mecha RCS
		==============================================================================*/
		var lock = ( $.aimLock && $.aimLock.alive ) ? $.aimLock : null;
		// mouse aim: if the cursor is on (or near) an answer gunship, aim at it
		if( !lock && ( $.pad.aim === null || $.pad.aim === undefined ) && $.raid && $.raid.hover && $.raid.hover.alive ) { lock = $.raid.hover; }
		this.aimTarget = lock;
		if( lock ) {
			// lead the target so the shot meets it where it will be
			var lp = $.raid && $.raid.leadPoint ? $.raid.leadPoint( lock, this.x, this.y ) : lock;
			this.direction = Math.atan2( lp.y - this.y, lp.x - this.x );
		} else if( $.pad.aim !== null && $.pad.aim !== undefined ) {
			this.direction = $.pad.aim;
		} else {
			var dx = $.mouse.x - this.x,
				dy = $.mouse.y - this.y;
			this.direction = Math.atan2( dy, dx );
		}

		var dDir = this.direction - ( this.prevDirection !== undefined ? this.prevDirection : this.direction );
		while( dDir > Math.PI ) dDir -= Math.PI * 2;
		while( dDir < -Math.PI ) dDir += Math.PI * 2;
		this.turnRate = ( this.turnRate || 0 ) * 0.7 + dDir * 0.3;
		this.prevDirection = this.direction;

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
						piercing: this.weapon.bullet.piercing,
						homing: this.weapon.homing || 0,
						target: this.aimTarget || ( $.pad.aim != null && $.raid && $.raid.hover && $.raid.hover.alive ? $.raid.hover : null )
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
Render: Heavy Mecha Combat Interceptor (Mobile Frame)
==============================================================================*/
$.Hero.prototype.render = function() {
	if( this.life <= 0 ) { return; }
	var c = $.ctxmg, t = $.tick / 60;
	var speed = Math.hypot( this.vx, this.vy );
	var isThrusting = ( speed > 0.35 || $.keys.state.up || $.keys.state.down || $.keys.state.left || $.keys.state.right || $.pad.mx || $.pad.my );
	var turnRate = this.turnRate || 0;

	/*==============================================================================
	1. Dual High-Intensity Mecha Searchlight Projectors
	==============================================================================*/
	c.save();
	c.translate( this.x, this.y );
	c.rotate( this.direction );

	// Projector beams from wing hardpoints
	var searchBeams = [ -14, 14 ];
	for( var b = 0; b < searchBeams.length; b++ ) {
		var by = searchBeams[ b ];
		var beamDist = 280;
		var beamGrad = c.createRadialGradient( 16, by, 8, 120, by, beamDist );
		beamGrad.addColorStop( 0, 'rgba(180, 240, 255, 0.28)' );
		beamGrad.addColorStop( 0.45, 'rgba(100, 210, 255, 0.12)' );
		beamGrad.addColorStop( 1, 'rgba(80, 180, 255, 0)' );
		c.fillStyle = beamGrad;
		c.beginPath();
		c.moveTo( 18, by - 4 );
		c.lineTo( beamDist, by - 70 );
		c.arc( 0, by, beamDist, -0.26, 0.26 );
		c.lineTo( 18, by + 4 );
		c.closePath();
		c.fill();
	}
	c.restore();

	/*==============================================================================
	2. RCS Maneuvering Vernier Thrusters (Reaction Control System)
	==============================================================================*/
	c.save();
	c.translate( this.x, this.y );
	c.rotate( this.direction );

	// When turning right: fire Port-Front (outwards) & Starboard-Rear (outwards)
	// When turning left: fire Starboard-Front & Port-Rear
	var rcsPuff = Math.min( 1, Math.abs( turnRate ) * 18 );
	if( rcsPuff > 0.08 || speed > 1.8 ) {
		var rcsJets = [];
		if( turnRate > 0.015 ) {
			rcsJets.push( { x: 12, y: -13, dx: 0, dy: -1 } ); // Port-Front
			rcsJets.push( { x: -12, y: 13, dx: 0, dy: 1 } );  // Starboard-Rear
		} else if( turnRate < -0.015 ) {
			rcsJets.push( { x: 12, y: 13, dx: 0, dy: 1 } );   // Starboard-Front
			rcsJets.push( { x: -12, y: -13, dx: 0, dy: -1 } ); // Port-Rear
		}
		for( var r = 0; r < rcsJets.length; r++ ) {
			var rj = rcsJets[ r ], jLen = 6 + rcsPuff * 14 + Math.random() * 4;
			c.strokeStyle = 'rgba(190, 245, 255, 0.9)';
			c.lineWidth = 1.6;
			c.beginPath();
			c.moveTo( rj.x, rj.y );
			c.lineTo( rj.x + rj.dx * jLen, rj.y + rj.dy * jLen );
			c.stroke();
			c.strokeStyle = 'rgba(98, 230, 255, 0.4)';
			c.lineWidth = 3.5;
			c.beginPath();
			c.moveTo( rj.x, rj.y );
			c.lineTo( rj.x + rj.dx * ( jLen * 0.7 ), rj.y + rj.dy * ( jLen * 0.7 ) );
			c.stroke();
		}
	}

	/*==============================================================================
	3. Heavy Dual Plasma Rocket Engines & Shock Diamonds
	==============================================================================*/
	if( isThrusting ) {
		var plumeLen = 16 + ( speed / this.vmax ) * 26 + Math.random() * 7;
		var nozzles = [ -7, 7 ];

		for( var n = 0; n < nozzles.length; n++ ) {
			var ny = nozzles[ n ];
			// Supersonic shock diamond flame
			var flameGrad = c.createLinearGradient( -15, ny, -15 - plumeLen, ny );
			flameGrad.addColorStop( 0, '#ffffff' );
			flameGrad.addColorStop( 0.2, '#62e6ff' );
			flameGrad.addColorStop( 0.65, '#ff6a20' );
			flameGrad.addColorStop( 1, 'rgba(255, 60, 20, 0)' );
			c.fillStyle = flameGrad;
			c.beginPath();
			c.moveTo( -15, ny - 4.5 );
			c.lineTo( -15 - plumeLen, ny );
			c.lineTo( -15, ny + 4.5 );
			c.closePath();
			c.fill();

			// Supersonic Shock Diamond node
			c.fillStyle = '#ffffff';
			c.beginPath();
			c.moveTo( -15 - plumeLen * 0.28, ny - 1.8 );
			c.lineTo( -15 - plumeLen * 0.42, ny );
			c.lineTo( -15 - plumeLen * 0.28, ny + 1.8 );
			c.lineTo( -15 - plumeLen * 0.14, ny );
			c.closePath();
			c.fill();
		}

		// Trailing ember sparks
		if( Math.random() < 0.45 && $.particleEmitters ) {
			var rx = this.x - Math.cos( this.direction ) * 18 + ( Math.random() - 0.5 ) * 10;
			var ry = this.y - Math.sin( this.direction ) * 18 + ( Math.random() - 0.5 ) * 10;
			$.particleEmitters.push( new $.ParticleEmitter( {
				x: rx, y: ry, count: 1, spawnRange: 2, friction: 0.86, minSpeed: 2, maxSpeed: 5,
				minDirection: this.direction + $.pi - 0.25, maxDirection: this.direction + $.pi + 0.25,
				hue: Math.random() < 0.7 ? 195 : 28, saturation: 100
			} ) );
		}
	}

	/*==============================================================================
	4. Heavy Armored Mecha Frame Body
	==============================================================================*/
	// Ground drop shadow (chassis elevation)
	c.save();
	c.translate( 4, 6 );
	c.fillStyle = 'rgba(0, 0, 0, 0.52)';
	c.beginPath();
	c.moveTo( 24, 0 );
	c.lineTo( 10, -9 );
	c.lineTo( -6, -20 );
	c.lineTo( -16, -18 );
	c.lineTo( -11, -10 );
	c.lineTo( -16, -7 );
	c.lineTo( -16, 7 );
	c.lineTo( -11, 10 );
	c.lineTo( -16, 18 );
	c.lineTo( -6, 20 );
	c.lineTo( 10, 9 );
	c.closePath();
	c.fill();
	c.restore();

	// Main Armored Outer Silhouette
	c.beginPath();
	c.moveTo( 24, 0 );
	c.lineTo( 10, -9 );
	c.lineTo( -6, -20 );
	c.lineTo( -16, -18 );
	c.lineTo( -11, -10 );
	c.lineTo( -16, -7 );
	c.lineTo( -16, -3 );
	c.lineTo( -13, 0 );
	c.lineTo( -16, 3 );
	c.lineTo( -16, 7 );
	c.lineTo( -11, 10 );
	c.lineTo( -16, 18 );
	c.lineTo( -6, 20 );
	c.lineTo( 10, 9 );
	c.closePath();

	// Dark composite titanium armor
	var armorGrad = c.createLinearGradient( -16, -16, 24, 16 );
	armorGrad.addColorStop( 0, '#101720' );
	armorGrad.addColorStop( 0.4, '#1b2532' );
	armorGrad.addColorStop( 0.75, '#283648' );
	armorGrad.addColorStop( 1, '#3e5066' );
	c.fillStyle = armorGrad;
	c.fill();

	// Outer chassis armor bevel stroke
	c.strokeStyle = this.takingDamage ? '#ff5468' : '#62e6ff';
	c.lineWidth = 1.8;
	c.stroke();

	// Secondary Titanium Plating & Panel Lines
	c.fillStyle = '#263445';
	// Port wing armor plate
	c.beginPath();
	c.moveTo( 6, -8 );
	c.lineTo( -4, -18 );
	c.lineTo( -12, -16 );
	c.lineTo( -8, -9 );
	c.closePath();
	c.fill();
	c.strokeStyle = 'rgba(98, 230, 255, 0.45)';
	c.lineWidth = 1;
	c.stroke();

	// Starboard wing armor plate
	c.beginPath();
	c.moveTo( 6, 8 );
	c.lineTo( -4, 18 );
	c.lineTo( -12, 16 );
	c.lineTo( -8, 9 );
	c.closePath();
	c.fill();
	c.stroke();

	// Hazard Warning Chevrons on Wing Shoulder (Yellow / Black stripes)
	var hx = -2, hy = -12;
	c.save();
	c.translate( hx, hy );
	c.rotate( -0.3 );
	c.fillStyle = '#f2b84b';
	c.fillRect( 0, 0, 7, 2 );
	c.fillStyle = '#111';
	c.fillRect( 2, 0, 2, 2 );
	c.restore();

	c.save();
	c.translate( hx, -hy );
	c.rotate( 0.3 );
	c.fillStyle = '#f2b84b';
	c.fillRect( 0, -2, 7, 2 );
	c.fillStyle = '#111';
	c.fillRect( 2, -2, 2, 2 );
	c.restore();

	// Exposed Hydraulic Piston Struts (Chrome cylinder connecting fuselage to wings)
	c.strokeStyle = '#9eb2c6';
	c.lineWidth = 1.5;
	c.beginPath();
	c.moveTo( -2, -6 ); c.lineTo( -9, -12 );
	c.moveTo( -2, 6 ); c.lineTo( -9, 12 );
	c.stroke();

	// Twin Heavy Kinetic Railgun Barrels (Mounted on outer wing pylons)
	var isFiring = this.weapon.fireFlag > 0;
	var railguns = [ -15, 15 ];
	for( var g = 0; g < railguns.length; g++ ) {
		var gy = railguns[ g ];
		// Barrel tube
		c.fillStyle = '#151e28';
		c.fillRect( -4, gy - 1.5, 30, 3 );
		c.strokeStyle = '#485c72';
		c.lineWidth = 1;
		c.strokeRect( -4, gy - 1.5, 30, 3 );

		// Ventilated heat-sink slots (Glow red/orange under sustained fire!)
		c.fillStyle = isFiring ? '#ff6014' : '#28384a';
		c.fillRect( 2, gy - 1, 4, 2 );
		c.fillRect( 9, gy - 1, 4, 2 );
		c.fillRect( 16, gy - 1, 4, 2 );

		// Barrel muzzle brake compensator
		c.fillStyle = isFiring ? '#ffd880' : '#304254';
		c.fillRect( 26, gy - 2, 2, 4 );
	}

	// Armored Engine Bells
	c.fillStyle = isThrusting ? '#62e6ff' : '#222f3e';
	c.fillRect( -16, -9, 3, 4 );
	c.fillRect( -16, 5, 3, 4 );

	// Wingtip Navigation Strobe Lights
	c.fillStyle = '#ff3344'; // Port
	c.beginPath(); c.arc( -11, -17, 1.8, 0, $.twopi ); c.fill();
	c.fillStyle = '#33ff77'; // Starboard
	c.beginPath(); c.arc( -11, 17, 1.8, 0, $.twopi ); c.fill();

	// Central Armored Fuselage Spine & Stencil Marking
	c.strokeStyle = 'rgba(242, 184, 75, 0.8)';
	c.lineWidth = 1.2;
	c.beginPath();
	c.moveTo( 17, 0 ); c.lineTo( -9, 0 );
	c.stroke();

	// Mecha Cockpit Canopy with Tactical HUD Reticle
	var canopyGrad = c.createLinearGradient( -2, 0, 14, 0 );
	canopyGrad.addColorStop( 0, '#062630' );
	canopyGrad.addColorStop( 0.45, '#0e6d85' );
	canopyGrad.addColorStop( 0.85, '#5be0fa' );
	canopyGrad.addColorStop( 1, '#d0f6ff' );

	c.beginPath();
	c.moveTo( 15, 0 );
	c.lineTo( 5, -3.8 );
	c.lineTo( -2, -3.2 );
	c.lineTo( -4, 0 );
	c.lineTo( -2, 3.2 );
	c.lineTo( 5, 3.8 );
	c.closePath();
	c.fillStyle = canopyGrad;
	c.fill();
	c.strokeStyle = '#b8f2ff';
	c.lineWidth = 1;
	c.stroke();

	// Internal HUD Targeting Crosshair inside Canopy
	c.strokeStyle = 'rgba(93, 255, 160, 0.85)';
	c.lineWidth = 0.8;
	c.beginPath();
	c.moveTo( 4, -2 ); c.lineTo( 8, -2 );
	c.moveTo( 6, -3 ); c.lineTo( 6, -1 );
	c.stroke();

	// Canopy Glare Highlight
	c.strokeStyle = 'rgba(255, 255, 255, 0.9)';
	c.lineWidth = 1;
	c.beginPath();
	c.moveTo( 12, -0.8 ); c.lineTo( 3, -2.5 );
	c.stroke();

	/*==============================================================================
	5. Railgun Muzzle Flashes & Starburst Spikes
	==============================================================================*/
	if( isFiring ) {
		this.weapon.fireFlag -= $.dt;
		for( var f = 0; f < railguns.length; f++ ) {
			var fy = railguns[ f ];
			var fRad = 8 + Math.random() * 5;
			var fGrad = c.createRadialGradient( 27, fy, 1, 27, fy, fRad );
			fGrad.addColorStop( 0, '#ffffff' );
			fGrad.addColorStop( 0.4, '#ffe07a' );
			fGrad.addColorStop( 0.85, 'rgba(255, 100, 30, 0.65)' );
			fGrad.addColorStop( 1, 'rgba(255, 60, 10, 0)' );
			c.fillStyle = fGrad;
			c.beginPath(); c.arc( 27, fy, fRad, 0, $.twopi ); c.fill();

			c.strokeStyle = 'rgba(255, 245, 200, 0.95)';
			c.lineWidth = 1.2;
			c.beginPath();
			c.moveTo( 27 - fRad * 1.4, fy ); c.lineTo( 27 + fRad * 1.4, fy );
			c.moveTo( 27, fy - fRad * 0.9 ); c.lineTo( 27, fy + fRad * 0.9 );
			c.stroke();
		}
	}

	c.restore();

	/*==============================================================================
	6. Heavy Energy Shield Matrix (On damage)
	==============================================================================*/
	if( this.takingDamage ) {
		c.save();
		c.translate( this.x, this.y );
		var shieldR = 28 + Math.random() * 4;
		var shHue = Math.random() < 0.5 ? 195 : 350;
		c.strokeStyle = 'hsla(' + shHue + ', 100%, 75%, ' + ( 0.65 + Math.random() * 0.35 ) + ')';
		c.lineWidth = 2.5;

		// Hexagonal armor lattice
		c.beginPath();
		for( var h = 0; h < 6; h++ ) {
			var ang = h * ( $.twopi / 6 ) + t * 4;
			var hx = Math.cos( ang ) * shieldR, hy = Math.sin( ang ) * shieldR;
			if( h === 0 ) c.moveTo( hx, hy ); else c.lineTo( hx, hy );
		}
		c.closePath();
		c.fillStyle = 'hsla(' + shHue + ', 100%, 50%, 0.14)';
		c.fill();
		c.stroke();

		// Deflection quadrant arcs
		c.lineWidth = 1.8;
		c.beginPath(); c.arc( 0, 0, shieldR + 6, t * 8, t * 8 + 1.6 ); c.stroke();
		c.beginPath(); c.arc( 0, 0, shieldR + 6, t * 8 + $.pi, t * 8 + $.pi + 1.6 ); c.stroke();
		c.restore();
	}
};