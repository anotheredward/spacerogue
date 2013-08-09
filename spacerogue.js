var map_data = [

	",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
	",################################,    ",
	",#@...........g.........#.......#,    ",
	",#.......#.......#......#.......#,,,,,,",
	",#....####.......#..g...........######,",
	",#....#..........#......#............#,",
	",#...............#......#............#,",
	",#....#....#######......########.....#,",
	",#....#..........#####..#............#,",
	",#....#.................#............#,",
	",######################.##############,",
	",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,                ,,,,,,,          ,,,,,,,",
	"                                                       ,#####,          ,#####,",
	"                                                       ,#...#,          ,#...#,",
	"                                                       ,#...#,          ,#...#,",
	"                                                       ,#...#,,,,,,,,,,,,#...#,",
	"                                                       ,#...#.############...#,",
	"                                                       ,#....g...............#,",
	"                                                       ,######################,",
	"               ,,,,,,,,,,,,,,,,,,,,,                   ,,,,,,,,,,,,,,,,,,,,,,,,",
	"               ,#############.#####,                                           ",
	"               ,#.....g...........#,",
	"               ,#.................#,",
	"               ,###################,",
	"               ,,,,,,,,,,,,,,,,,,,,,",
];

var Util = {
	clamp: function(val, min, max) {
		return val < min ? min : val > max ? max : val;
	}
};

Number.prototype.sign = function () {
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
		'#': { name: '#', walkable: false, ch: '#' },
		'.': { name: '.', walkable: true, ch: '.'},
		' ': { name: ' ', walkable: true, slide: true, ch: ' '},
		',': { name: ',', walkable: true, ch: ' '},
		'*': { name: '*', walkable: true, slide: true, ch: '*', col: '#066'},
	};

	var enemies = [];
	var entities = [];

	var sleep = function(time, cb) {
		engine.lock();
		setTimeout(function () { engine.unlock(); if (cb) cb(); }, time);
	};

	var waitForKey = function(cb) {
		var listener = function (e) {
			if (cb(e)) {
				window.removeEventListener('keydown', listener);
				engine.unlock();
			}
		};

		engine.lock();
		window.addEventListener('keydown', listener);
	};

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

	var tileWalkable = function(x, y, who) {
		if (!map[y] || !map[y][x])
			return false;

		if (!map[y][x].walkable)
			return false;

		if (getEntityAtPosition(x, y) != null)
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
		var move = function (dir) {
			var new_x = x + (dir.x || 0);
			var new_y = y + (dir.y || 0);
			if (new_x < 0 || new_x >= MAP_WIDTH ||
				new_y < 0 || new_y >= MAP_HEIGHT) {
					if (this.onExitMap)
						this.onExitMap();
			}	
			if (tileWalkable(new_x, new_y)) {
				last_dir = dir;
				teleport(new_x, new_y);
				return true;
			}
		};

		return {
			teleport: teleport,
			move: move,
			draw: draw,
			x: function () { return x; },
			y: function () { return y; },
			last_dir: function () { return last_dir; },
			setColor: setColor,
			setChar: setChar,
		};
	});

	var player = (function (x, y) {
			var base = makeEntity(x, y);

			var move_key = {};
			move_key[ROT.VK_UP] = { x: 0, y: -1 };
			move_key[ROT.VK_PAGE_UP] = { x: 1, y: -1 };
			move_key[ROT.VK_RIGHT] = { x: 1, y: 0 };
			move_key[ROT.VK_PAGE_DOWN] = { x: 1, y: 1 };
			move_key[ROT.VK_DOWN] = { x: 0, y: 1 };
			move_key[ROT.VK_END] = { x: -1, y: 1 };
			move_key[ROT.VK_LEFT] = { x: -1, y: 0 };
			move_key[ROT.VK_HOME] = { x: -1, y: -1 };
			move_key[ROT.VK_PERIOD] = { x: 0, y: 0 };
			base.mode = "move";

			base.act = function() {
				Game.drawWholeMap();
				if (map[base.y()][base.x()].slide) {
					base.move(base.last_dir());
					sleep(300);
				} 
				else {
					waitForKey(function (e) {
						var key = e.keyCode;
						if (base.mode === "zap") {
							base.zap(key);
							base.mode = "move";
						} 
						else if(key === ROT.VK_Z) {
								base.mode = "zap";
						}
						else if (base.mode === "move") {
							base.move(move_key[key]);
							return true;
						}
					return false;
					});
				}
			};

			base.onExitMap = function() {
				alert("You are dead. And off the map. And stuff.");
				engine.lock();
				location.reload();
			}

			base.zap = function(key) {
				if (key in move_key) {
					dir = move_key[key];
					laz = new lazer(base.x() + dir.x, base.y() + dir.y, dir);
					entities.push(laz);
					scheduler.add(laz);
				}
			}

			return base;
	})(1, 1);

	var lazer = (function(x, y, dir) {
		var base = makeEntity(x, y, '-', '#f00');
		scheduler.add(base,  true);
		//display.draw(x, y, '-', '#f00');
		base.last_dir = dir;

		base.act = function() {
			if(!base.move(base.last_dir)){
				var lazeredEntity = getEntityAtPosition(base.x() + base.last_dir.x, base.y() + base.last_dir.y);
				if (lazeredEntity && lazeredEntity.onLazered)
					lazeredEntity.onLazered();

				for(var i=0; i < entities.length; i++) {
					if (entities[i].x == base.x && entities[i].y == base.y)
						entities.splice(i,1);
				}
				scheduler.remove(base);	
			}
		};

		return base;
	});

	var makeEnemy = (function (x, y) {
		var base = makeEntity(x, y, 'g', '#f00');
		var turns_until_move = 0;
		var state = "hunting";

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
				}

				map[y].push(tiles[tile]);
			}
		}
	};

	var drawWholeMap = function() {
		for (var y = 0; y < MAP_HEIGHT; y++) 
			for (var x = 0; x < MAP_WIDTH; x++) {
				var tile = map[y][x];
				display.draw(x, y, tile.ch, tile.col || '#ccc', tile.bg || '#000');
			}

		for (var key in entities)
			if (entities.hasOwnProperty(key))
				entities[key].draw();
	};

	var init = function() {
		display = new ROT.Display();
		document.body.appendChild(display.getContainer());

		loadMap(map_data);
		sparkle.act();
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
})();;

