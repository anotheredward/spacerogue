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
		'#': { walkable: false, ch: '#' },
		'.': { walkable: true, ch: '.'},
		' ': { walkable: true, slide: true, ch: ' '},
		',': { walkable: true, ch: ' '}
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

	var player = (function (x, y) {
		var move_key = {};
		move_key[38] = { x: 0, y: -1 };
		move_key[39] = { x: 1, y: 0 };
		move_key[40] = { x: 0, y: 1 };
		move_key[37] = { x: -1, y: 0 };

		var last_dir = { x: 1, y: 0 };

		var teleport = function (new_x, new_y) {
			x = new_x;
			y = new_y;
		};

		var draw = function () {
			display.draw(x, y, '@', '#0ff');
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
			for (var x = 0; x < MAP_WIDTH; x++) 
				display.draw(x, y, map[y][x].ch);

		player.draw();
	};

	var init = function() {
		display = new ROT.Display();
		document.body.appendChild(display.getContainer());

		loadMap(map_data);
		drawWholeMap();
		scheduler.add(player, true);
		engine.start();
	};

	return {
		init: init,
		drawWholeMap: drawWholeMap
	};
})();;

