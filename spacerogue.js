var map_data = [
  ",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
	",################################,    ",
	",#@......#..............#.......#,    ",
	",#.......#.......#......#.......#,,,,,,",
	",#....####.......#..............######,",
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
	"                                                       ,#....................#,",
	"                                                       ,######################,",
	"               ,,,,,,,,,,,,,,,,,,,,,                   ,,,,,,,,,,,,,,,,,,,,,,,,",
	"                #############.#####                                            ",
	"               ,#.................#,",                     
	"               ,#.................#,",
	"               ,###################,",
	"               ,,,,,,,,,,,,,,,,,,,,,",
];

var Util = {
	clamp: function(val, min, max) {
		return val < min ? min : val > max ? max : val;
	}
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

	var player = (function (x, y) {
		var move_key = {};
		move_key[ROT.VK_UP] = { x: 0, y: -1 };
        move_key[ROT.VK_PAGE_UP] = { x: 1, y: -1 };
		move_key[ROT.VK_RIGHT] = { x: 1, y: 0 };
        move_key[ROT.VK_PAGE_DOWN] = { x: 1, y: 1 };
		move_key[ROT.VK_DOWN] = { x: 0, y: 1 };
        move_key[ROT.VK_END] = { x: -1, y: 1 };
		move_key[ROT.VK_LEFT] = { x: -1, y: 0 };
        move_key[ROT.VK_HOME] = { x: -1, y: -1 };

		var last_dir = { x: 1, y: 0 };

		var teleport = function (new_x, new_y) {
			x = new_x;
			y = new_y;
		};

		var draw = function () {
			display.draw(x, y, '@', '#3f3');
		};

		var move = function (dir) {
			var new_x = x + (dir.x || 0);
			var new_y = y + (dir.y || 0);
			if (new_x < 0 || new_x >= MAP_WIDTH ||
					new_y < 0 || new_y >= MAP_HEIGHT) {
				alert("You are dead. And off the map. And stuff.");
				location.reload();
			}

			if (map[new_y][new_x].walkable) {
				last_dir = dir;
				teleport(new_x, new_y);
			}
		};

		var act = function () {
			if (map[y][x].slide) {
				sleep(300, function () {
					move(last_dir);
					Game.drawWholeMap();
				});
			} else {
				waitForKey(function (e) {
					var key = e.keyCode;
					if (key in move_key) {
						move(move_key[key]);
					} else {
						return false;
					}
					Game.drawWholeMap();
					return true;
				});
			}
		};

		return {
			teleport: teleport,
			move: move,
			act: act,
			draw: draw,
		};
	})(1, 1);

	var loadMap = function (data) {
		for (var y = 0; y < MAP_HEIGHT; y++) {
			map.push([]);
			for (var x = 0; x < MAP_WIDTH; x++) {
				tile = (data[y] || [])[x] || ' ';
				if (tile == '@') {
					player.teleport(x, y);
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

		player.draw();
	};

	var init = function() {
		display = new ROT.Display();
		document.body.appendChild(display.getContainer());

		loadMap(map_data);
		sparkle.act();
		drawWholeMap();
		scheduler.add(player, true);
		scheduler.add(sparkle, true);
		engine.start();
	};

	return {
		init: init,
		drawWholeMap: drawWholeMap
	};
})();;

