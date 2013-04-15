var Game = {
	display: null, 
	map: {},

	init: function() {
		this.display = new ROT.Display();
		document.body.appendChild(this.display.getContainer());

		this._generateMap();
	},

	_generateMap: function() {
		var digger = new ROT.Map.Digger();

		var freeCells = [];

		var digCallback = function(x, y, value) {
			if (value) return;

			var key = x + ',' + y;
			freeCells.push(key);
			this.map[key] = '.';
		};

		digger.create(digCallback.bind(this));

		this._generateBoxes(freeCells);

		this._drawWholeMap();
	},

	_generateBoxes: function(cells) {
		for (var i = 0; i < 10; i++) {
			var index = Math.floor(ROT.RNG.getUniform() * cells.length);
			this.map[cells[index]] = '*';
			cells.splice(index, 1);
		}
	},

	_drawWholeMap: function() {
		for (var key in this.map) {
			var parts = key.split(',');
			var x = parseInt(parts[0]);
			var y = parseInt(parts[1]);
			this.display.draw(x, y, this.map[key]);
		}
	}
};
