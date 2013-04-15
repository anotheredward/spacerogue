var map_data = [
	"################################     ",
	"#@......#..............#.......#     ",
	"#.......#.......#......#.......#     ",
	"#....####.......#..............######",
	"#....#..........#......#............#",
	"#...............#......#............#",
	"#....#....#######......########.....#",
	"#....#..........#####..#............#",
	"#....#.................#............#",
	"#####################################"
];


var Game = (function () {
	var MAP_WIDTH = 80;
	var MAP_HEIGHT = 25;
	var display = null;
	var map = [];
	var tiles = {
		'#': { walkable: false, ch: '#' },
		'.': { walkable: true, ch: '.'},
		' ': { walkable: false, ch: ' '}
	};
	var player_pos = {x: 1, y: 1};

	var loadMap = function (data) {
		for (var y = 0; y < MAP_HEIGHT; y++) {
			map.push([]);
			for (var x = 0; x < MAP_WIDTH; x++) {
				tile = (data[y] || [])[x] || ' ';
				if (tile == '@') {
					player_pos = { x: x, y: y };
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

		display.draw(player_pos.x, player_pos.y, '@');
	};

	var init = function() {
		display = new ROT.Display();
		document.body.appendChild(display.getContainer());

		loadMap(map_data);
		drawWholeMap();
	};

	return {
		init: init
	};
})();;

