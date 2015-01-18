var REALTIME = false;

var map_data = [

	",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,         ,#,                ,,,,,,,,,,,,,,,",
	",###################################,         ,,,                ,#############,",
	",#@......#.........#............p..#,                            ,#p..........#,",
	",#.......#.........#.##.##########..,                            ,............#,",
	",#....####....#.......#.#........###,       ,,,                  ,#...........#,",
	",#....#.......#.......#.#..........#,       ,#,                  ,#g..........#,",
	",#....#.......#.......#.#..........#,       ,,,                  ,#####.####.##,",
	",#....#.......#.......#.#..........#,                    ,,,,,   ,,,,,,,,,,,,,,,",
	",#....#.......#.......#.#..........#,                  ,,,###,                  ",
	",#....#.......#.......#.#..........#,                  ,#####,                  ",
	",#....###..############.########..##,                  ,,,,,,,                  ",
	",#....#............................#,                                   ,,,,,,,,",
	",#....#.............................,                                   ,###.##,",
	",######.............................                                    ,#g...#,",
	",#..................................          d                         ,#....#,",
	",#..................................                   ,,,   ,,,,,,     ,#....#,",
	",#..................................,                  ,#.....####,     ,#....#,",
	",#.................................#,                  ,#.........,     ,.....#,",
	",#......................############,                  ,#........#,     ,######,",
	",#......................#g.........#,                  ,#........#,     ,,,,,,,,",
	",#......................#..........#,                  ,#........#,             ",
	",#.................................#,                  ,.........#,  ,,,        ",
	",#..................................,                   .........#,  ,#,,,,,,,,,",
	",###################################,        ,,,       ,..########,  ,#.####.###",
	",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,        ,#,       ,##,,,,,,,,,  ,#.....p...",
];

Number.prototype.sign = function() {
	return this > 0 ? 1 :
				 this < 0 ? -1 :
				 0;
};

var Game = (function () {
	var MAP_WIDTH = 80;
	var MAP_HEIGHT = 25;
	var display = new ROT.Display();
	var scheduler = new ROT.Scheduler.Simple();
	var engine = new ROT.Engine(scheduler);
	var map = [];
	var tiles = {
		'#': { name: '#', walkable: false, ch: '#', inside: true },
		'.': { name: '.', walkable: true, ch: '.', inside: true },
		' ': { name: ' ', walkable: true, ch: ' ', inside: false, slide: true },
		',': { name: ',', walkable: true, ch: '.', inside: true },
		'*': { name: '*', walkable: true, ch: '*', col: '#066', inside: false, slide: true },
	};

	var enemies = [];
	var partsCount = 0;
	var entities = [];

	/* Usage: waitForKey(handler[, timeout, timeoutCb])
	 *   handler - a function that gets keypress events and does something with
	 *     them. It returns whether the keypress was one it cared about (ie
	 *     should waitForKey stop now).
	 *   timeout - maximum time in milliseconds to wait for input. If no input
	 *     that handler cares about has been received in that time, timeoutCb
	 *     is called with no arguments, and waitForKey stops.
	 *  waitForKey can be called from inside the handler, but must be immediately
	 *  followed by return true; ie you can't decide whether to accept a keypress
	 *  based on another keypress.
	 */

	/* Here be re-entrant continuationy dragons */
	var waitForKey = (function () {
		var levels = 0;
		var callback = null;
		var timeoutCallback = null;
		var timeoutHandles = [null];

		var pop = function() {
			if (timeoutHandles[1])
				clearTimeout(timeoutHandles[1]);
			timeoutHandles.splice(0,1);
			levels--;
			if (levels == 0) {
				window.removeEventListener('keydown', listener);
				engine.unlock();
			}
		};

		var listener = function (e) {
			e.preventDefault();
			if (callback(e)) {
				pop();
			}
		};

		var doTimeout = function() {
			if (timeoutCallback)
				timeoutCallback();
			pop();
		}

		return function(cb, timeout, timeoutCb) {
			if (levels == 0) {
				window.addEventListener('keydown', listener);
				engine.lock();
			}
			timeoutHandles.push(timeout ? setTimeout(doTimeout, timeout) : null);
			levels++;
			callback = cb;
			timeoutCallback = timeoutCb;
		};
	})();

	var sparkle = (function (star_count) {
		var stars = [];

		var addStar = function() {
			while (true) {
				var x = Math.floor(ROT.RNG.getUniform() * MAP_WIDTH);
				var y = Math.floor(ROT.RNG.getUniform() * MAP_HEIGHT);
				if (map[y][x].name == ' ') {
					map[y][x] = tiles['*'];
					stars.push({ x: x, y: y});
					break;
				}
			}
		};

		var removeStar = function(id) {
			map[stars[id].y][stars[id].x] = tiles[' '];
			stars.splice(id, 1);
		};

		var act = function() {
			if (!stars.length)
				for (var i = 0; i < star_count; i++)
					addStar();

			if (ROT.RNG.getUniform() > 0.85) {
				var remove = Math.floor(ROT.RNG.getUniform() * stars.length);
				removeStar(remove);
				addStar();
			}
		};

		return {
			act: act
		};
	})(20);

	var tileWalkable = function(x, y) {
		if (!isPositionInsideMap(x,y))
			return false;

		if (!map[y][x].walkable)
			return false;

		if (getEntityAtPosition(x, y) != null && !getEntityAtPosition(x,y).walkable)
			return false;

		return true;
	};

	var getEntityAtPosition = function(x, y) {
		for (var key in entities) {
			if (entities.hasOwnProperty(key)) {
				var entity = entities[key];
				if (entity.x() == x && entity.y() == y)
					return entity;
			}
		}
		return null;
	}

	var isPositionInsideMap = function(x,y) {
		return map[y] && map[y][x];
	}

	var makeEntity = (function (x, y, ch, col) {
		var last_dir = { x: 1, y: 0 };
		var color = col;
		var character = ch;

		var teleport = function (new_x, new_y) {
			x = new_x;
			y = new_y;
		};

		var draw = function () {
			display.draw(x, y, character || '@', color || '#3f3');
		};

		var setColor = function (col) {
			color = col;
		};

		var setChar = function (ch) {
			character = ch;
		};

		var setLastDir = function(x,y) {
			last_dir = { x: x, y: y};
		};

		var move = function (dir) {
			var new_x = x + (dir.x || 0);
			var new_y = y + (dir.y || 0);
			if (!isPositionInsideMap(new_x,new_y)) {
				console.log(x,y);
				if (map[y][x].slide)
					if (this.onExitMap)
						this.onExitMap();
				return false;
			}

			var potentialEnemy = getEntityAtPosition(new_x, new_y);
			if (potentialEnemy) {
				if (potentialEnemy.isEnemy) {
					if (this.onHitGoblin) {
						this.onHitGoblin();
					}
				}
			}

			if (tileWalkable(new_x, new_y)) {
				var potentialPart = getEntityAtPosition(new_x,new_y);
				if (potentialPart != null && potentialPart.isPart)
					if (this.onFindPart)
						this.onFindPart(potentialPart);

				last_dir = dir;
				teleport(new_x, new_y);
				if (this.onMove)
					this.onMove(new_x, new_y);
				return true;
			}

			return false;
		};

		return {
			teleport: teleport,
			move: move,
			draw: draw,
			x: function () { return x; },
			y: function () { return y; },
			last_dir: function () { return last_dir; },
			setLastDir: setLastDir,
			setColor: setColor,
			setChar: setChar,
		};
	});

	var player = (function (x, y) {
			var base = makeEntity(x, y);

			var partsFound = 0;

			var move_key = {};
			move_key[ROT.VK_UP] = { x: 0, y: -1 };
			move_key[ROT.VK_PAGE_UP] = { x: 1, y: -1 };
			move_key[ROT.VK_RIGHT] = { x: 1, y: 0 };
			move_key[ROT.VK_PAGE_DOWN] = { x: 1, y: 1 };
			move_key[ROT.VK_DOWN] = { x: 0, y: 1 };
			move_key[ROT.VK_END] = { x: -1, y: 1 };
			move_key[ROT.VK_LEFT] = { x: -1, y: 0 };
			move_key[ROT.VK_HOME] = { x: -1, y: -1 };

			base.act = function() {
				Game.drawWholeMap();

				var sliding = map[base.y()][base.x()].slide;

				var timeout = !(sliding || REALTIME) ? null : 300;
				var timeoutCb = !sliding ? null
						: function () { base.move(base.last_dir()); };

				waitForKey(function (e) {
					var key = e.keyCode;

					REALTIME = true;
					document.getElementById('music').play();

					if (key == ROT.VK_PERIOD)
						return true;
					if (key === ROT.VK_Z) {
						waitForKey(function (e) {
							return base.zap(e.keyCode);
						});
						return true;
					}
					if (key in move_key && !sliding)
						return base.move(move_key[key]);
				}, timeout, timeoutCb);
			};

			base.onMove = function(x,y) {
				if (!map[y][x].inside) {
					if (document.getElementById('music').volume > 0)
						document.getElementById('pressure').play();
					document.getElementById('music').volume = 0;
				}
				else {
					document.getElementById('music').volume = 1;
				}
			};

			base.onFindPart = function(part) {
				entities.splice(entities.indexOf(part), 1);
				if (++partsFound >= partsCount) {
					document.getElementById('win').style.display = 'block';
					document.getElementById('display').style.display = 'none';
					document.getElementById('legend').style.display = 'none';
					engine.lock();
				} else {
					document.getElementById("partsLeft").innerHTML = partsCount - partsFound;
				}
			}

			base.onHitGoblin = function() {
				if (map[base.y()][base.x()].slide) {
					var lastDir = base.last_dir();
					base.setLastDir(-lastDir.x, -lastDir.y);
				}
			}

			base.onExitMap = function() {
				alert("You spin out in to space, accelerating endlessly. Game Over.");
				engine.lock();
				location.reload();
			}

			base.zap = function(key) {
				if (key in move_key) {
					dir = move_key[key];
					laz = new lazer(base.x(), base.y(), dir);
					entities.push(laz);

					if (map[base.y()][base.x()].slide)
						base.move(base.last_dir());
					return true;
				}
				return false;
			}

			return base;
	})(1, 1);

	var makePart = function (x, y) {
		var base = makeEntity(x, y, 'p', 'yellow');

		base.onLazered = function() {};
		base.act = function() {};
		base.walkable = true;
		base.isPart = true;

		return base;
	};

	var lazer = function(x, y, dir) {
		var sprite = dir.x == 0 ? '|' :
			dir.y == 0 ? '-' :
			dir.x.sign() == dir.y.sign() ? '\\' :
			'/';
		var base = makeEntity(x, y, sprite, '#f00');
		scheduler.add(base, true);
		base.last_dir = dir;

		base.act = function() {
			if(!base.move(base.last_dir)){
				var new_x = base.x() + base.last_dir.x;
				var new_y = base.y() + base.last_dir.y;
				var lazeredEntity = getEntityAtPosition(new_x,new_y);
				if (lazeredEntity) {
					if (lazeredEntity.onLazered)
						lazeredEntity.onLazered();
				}
				else {
					//Wall collision, walls should probably be entities of some sort
					if (isPositionInsideMap(new_x,new_y))
						map[new_y][new_x] = tiles['.'];
				}
				for (var i=0; i < entities.length; i++) {
					if (entities[i].x == base.x && entities[i].y == base.y)
						entities.splice(i,1);
				}
				scheduler.remove(base);
			}
		};

		return base;
	};

	var makeEnemy = (function (x, y) {
		var base = makeEntity(x, y, 'g', '#f00');
		var turns_until_move = 0;
		var state = "hunting";
		base.isEnemy = true;

		base.onLazered = function() {
			turns_until_move = 5;
			base.setDisplayStunned();
			state = "stunned";
		}

		base.act = function () {
			if (turns_until_move > 0) {
				turns_until_move -= 1;
			}
			else {
				state = "hunting";

				var xdiff = player.x() - base.x();
				var ydiff = player.y() - base.y();

				if (!base.move({x: xdiff.sign(), y: ydiff.sign()}))
					if (!base.move({x: 0, y: ydiff.sign()}))
						base.move({x: xdiff.sign(), y: 0});
				turns_until_move++;
			}

			if (state === "stunned") {
				base.setDisplayStunned();
			}
			else {
				base.setDisplayDefault();
			}
		};

		base.setDisplayStunned = function () {
			base.setColor("blue");
			base.setChar(turns_until_move.toString());
		};

		base.setDisplayDefault = function () {
			base.setColor("#f00");
			base.setChar("g");
		};

		return base;
	});

	var loadMap = function (data) {
		for (var y = 0; y < MAP_HEIGHT; y++) {
			map.push([]);
			for (var x = 0; x < MAP_WIDTH; x++) {
				tile = (data[y] || [])[x] || ' ';
				if (tile == '@') {
					player.teleport(x, y);
					entities.push(player);
					tile = '.';
				} else if (tile == 'g') {
					var enemy = makeEnemy(x, y);
					enemies.push(enemy);
					entities.push(enemy);
					tile = '.';
				} else if (tile == 'p') {
					var part = makePart(x, y);
					entities.push(part);
					partsCount++;
					tile = '.';
				} else if (tile == 'd') {
					var part = makePart(x, y);
					entities.push(part);
					partsCount++;
					tile = ' ';
				}

				map[y].push(tiles[tile]);
			}
		}
	};

	var drawTile = function(x, y) {
		if (!isPositionInsideMap(x,y))
			return false;

		var possibleEntity = getEntityAtPosition(x, y);
		if (possibleEntity)
			possibleEntity.draw();
		else {
			var tile = map[y][x];
			display.draw(x, y, tile.ch, tile.col || '#ccc', tile.bg || '#000');
		}
	}

	var doesTileLetLightPass = function(x, y) {
		//Defensive check, callback sometimes asks for negative indicies
		//Reverted back to not using isPositionInsideMap for performance
		if (y < 0 || x < 0 || y >= MAP_HEIGHT || x >= MAP_WIDTH)
			return false;

		return map[y][x] != tiles['#'];
	};

	var drawWholeMap = function() {
		display.clear();
		var fov = new ROT.FOV.RecursiveShadowcasting(doesTileLetLightPass);

		fov.compute(player.x(), player.y(), 50, drawTile);
	};

	var init = function() {
		display = new ROT.Display();
		document.getElementById("display").appendChild(display.getContainer());

		loadMap(map_data);
		sparkle.act();
		document.getElementById("partsLeft").innerHTML = partsCount;
		drawWholeMap();
		scheduler.add(player, true);
		scheduler.add(sparkle, true);
		for (var enemyId in enemies) {
			if (!enemies.hasOwnProperty(enemyId))
				continue;
			scheduler.add(enemies[enemyId], true);
		}
		engine.start();
	};

	return {
		init: init,
		drawWholeMap: drawWholeMap
	};
})();
