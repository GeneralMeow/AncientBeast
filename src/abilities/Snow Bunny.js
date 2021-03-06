/*
 *
 *	Snow Bunny abilities
 *
 */
G.abilities[12] = [

	// 	First Ability: Bunny Hop
	{
		//	Type : Can be "onQuery", "onStartPhase", "onDamage"
		trigger: "onOtherCreatureMove",

		require: function(fromHex) {
			if (!this.testRequirements()) {
				return false;
			}

			// If enough uses, jump away when an enemy has entered our trigger area, and
			// we have a space to jump back to
			return (
				this.timesUsedThisTurn < this._getUsesPerTurn() &&
				fromHex && fromHex.creature &&
				isTeam(fromHex.creature, this.creature, Team.enemy) &&
				this._getTriggerHexId(fromHex) >= 0 &&
				this._getHopHex(fromHex) !== undefined);
		},

		//	activate() :
		activate: function(destHex) {
			var ability = this;
			ability.end();

			this.creature.moveTo(
				this._getHopHex(destHex), {
					callbackStepIn: function() {
						G.activeCreature.queryMove();
					},
					ignorePath: true,
					ignoreMovementPoint: true
				}
			);
		},

		_getUsesPerTurn: function() {
			// If upgraded, useable twice per turn
			return this.isUpgraded() ? 2 : 1;
		},

		_getTriggerHexId: function(fromHex) {
			var hexes = this.creature.getHexMap(front1hex);

			// Find which hex we are hopping from
			var id = -1;
			fromHex.creature.hexagons.each(function() {
				id = hexes.indexOf(this) > id ? hexes.indexOf(this) : id;
			});

			return id;
		},

		_getHopHex: function(fromHex) {
			var id = this._getTriggerHexId(fromHex);

			// Try to hop away
			var hex;
			switch (id) {
				case 0:
					hex = this.creature.getHexMap(backbottom1hex)[0];
					break;
				case 1:
					hex = this.creature.getHexMap(inlineback1hex)[0];
					break;
				case 2:
					hex = this.creature.getHexMap(backtop1hex)[0];
					break;
			}

			// If we can't hop away, try hopping backwards
			if (id !== 1 &&
				(hex === undefined ||
					!hex.isWalkable(this.creature.size, this.creature.id, true))) {
				hex = this.creature.getHexMap(inlineback1hex)[0];
			}

			if (hex !== undefined &&
				!hex.isWalkable(this.creature.size, this.creature.id, true)) {
				return undefined;
			}
			return hex;
		}
	},



	// 	Second Ability: Big Pliers
	{
		//	Type : Can be "onQuery", "onStartPhase", "onDamage"
		trigger: "onQuery",

		_targetTeam: Team.enemy,

		// 	require() :
		require: function() {
			if (!this.testRequirements()) return false;

			if (!this.atLeastOneTarget(
					this.creature.adjacentHexs(1), {
						team: this._targetTeam
					})) {
				return false;
			}
			return true;
		},

		// 	query() :
		query: function() {

			var ability = this;
			var snowBunny = this.creature;

			G.grid.queryCreature({
				fnOnConfirm: function() {
					ability.animation.apply(ability, arguments);
				},
				team: this._targetTeam,
				id: snowBunny.id,
				flipped: snowBunny.player.flipped,
				hexs: snowBunny.adjacentHexs(1),
			});
		},


		//	activate() :
		activate: function(target, args) {
			var ability = this;
			ability.end();

			var damages = ability.damages;
			// If upgraded, do pure damage against frozen targets
			if (this.isUpgraded() && target.stats.frozen) {
				damages = {
					pure: 0
				};
				for (var type in ability.damages) {
					damages.pure += ability.damages[type];
				}
			}

			var damage = new Damage(
				ability.creature, // Attacker
				damages, // Damage Type
				1, // Area
				[] // Effects
			);
			target.takeDamage(damage);
		},
	},



	// 	Third Ability: Blowing Wind
	{
		//	Type : Can be "onQuery", "onStartPhase", "onDamage"
		trigger: "onQuery",

		directions: [1, 1, 1, 1, 1, 1],
		_targetTeam: Team.both,

		// 	require() :
		require: function() {
			if (!this.testRequirements()) return false;

			if (!this.testDirection({
					team: this._targetTeam,
					directions: this.directions
				})) {
				return false;
			}
			return true;
		},

		// 	query() :
		query: function() {
			var ability = this;
			var snowBunny = this.creature;

			G.grid.queryDirection({
				fnOnConfirm: function() {
					ability.animation.apply(ability, arguments);
				},
				flipped: snowBunny.player.flipped,
				team: this._targetTeam,
				id: snowBunny.id,
				requireCreature: true,
				x: snowBunny.x,
				y: snowBunny.y,
				directions: this.directions,
			});
		},


		//	activate() :
		activate: function(path, args) {
			var ability = this;
			ability.end();

			var target = path.last().creature;
			// No blow size penalty if upgraded and target is frozen
			var dist = 5 - (this.isUpgraded() && target.stats.frozen ? 0 : target.size);
			var dir = [];
			switch (args.direction) {
				case 0: // Upright
					dir = G.grid.getHexMap(target.x, target.y - 8, 0, target.flipped, diagonalup).reverse();
					break;
				case 1: // StraitForward
					dir = G.grid.getHexMap(target.x, target.y, 0, target.flipped, straitrow);
					break;
				case 2: // Downright
					dir = G.grid.getHexMap(target.x, target.y, 0, target.flipped, diagonaldown);
					break;
				case 3: // Downleft
					dir = G.grid.getHexMap(target.x, target.y, -4, target.flipped, diagonalup);
					break;
				case 4: // StraitBackward
					dir = G.grid.getHexMap(target.x, target.y, 0, !target.flipped, straitrow);
					break;
				case 5: // Upleft
					dir = G.grid.getHexMap(target.x, target.y - 8, -4, target.flipped, diagonaldown).reverse();
					break;
				default:
					break;
			}

			dir = dir.slice(0, dist + 1);

			var hex = target.hexagons[0];
			for (var j = 0; j < dir.length; j++) {
				if (dir[j].isWalkable(target.size, target.id, true)) {
					hex = dir[j];
				} else {
					break;
				}
			}

			target.moveTo(hex, {
				ignoreMovementPoint: true,
				ignorePath: true,
				callback: function() {
					G.activeCreature.queryMove();
				},
				animation: "push",
			});
		},
	},



	// 	Fourth Ability: Freezing Spit
	{
		//	Type : Can be "onQuery", "onStartPhase", "onDamage"
		trigger: "onQuery",

		_targetTeam: Team.enemy,

		// 	require() :
		require: function() {
			if (!this.testRequirements()) return false;

			if (!this.testDirection({
					team: this._targetTeam,
					directions: this.directions
				})) {
				return false;
			}
			return true;
		},

		// 	query() :
		query: function() {

			var ability = this;
			var snowBunny = this.creature;

			G.grid.queryDirection({
				fnOnConfirm: function() {
					ability.animation.apply(ability, arguments);
				},
				flipped: snowBunny.player.flipped,
				team: this._targetTeam,
				id: snowBunny.id,
				requireCreature: true,
				x: snowBunny.x,
				y: snowBunny.y,
				directions: [1, 1, 1, 1, 1, 1],
			});
		},


		//	activate() :
		activate: function(path, args) {
			var ability = this;
			ability.end();

			var target = path.last().creature;
			var dist = path.slice(0).filterCreature(false, false).length;

			var emissionPoint = {
				x: ability.creature.grp.x + 52,
				y: ability.creature.grp.y - 20
			};
			var targetPoint = {
				x: target.grp.x + 52,
				y: target.grp.y - 20
			};
			var sprite = G.grid.creatureGroup.create(
				emissionPoint.x, emissionPoint.y, 'effects_freezing-spit');
			sprite.anchor.setTo(0.5);
			sprite.rotation = -Math.PI / 3 + args.direction * Math.PI / 3;
			var duration = dist * 75;
			var tween = G.Phaser.add.tween(sprite)
				.to({
					x: targetPoint.x,
					y: targetPoint.y
				}, duration, Phaser.Easing.Linear.None)
				.start();
			tween.onComplete.add(function() {
				this.destroy();

				// Copy to not alter ability strength
				var dmg = $j.extend({}, ability.damages);
				dmg.crush += 3 * dist; // Add distance to crush damage

				var damage = new Damage(
					ability.creature, // Attacker
					dmg, // Damage Type
					1, // Area
					[]
				);
				var damageResult = target.takeDamage(damage);

				// If upgraded and melee range, freeze the target
				if (ability.isUpgraded() && damageResult.damageObj.melee) {
					target.stats.frozen = true;
					target.updateHealth();
					G.UI.updateFatigue();
				}
			}, sprite);
		},

		getAnimationData: function(path, args) {
			var dist = path.slice(0).filterCreature(false, false).length;
			return {
				duration: 500,
				delay: 0,
				activateAnimation: false
			};
		}
	}

];
