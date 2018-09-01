'use strict';
(() => {
	const __INV_VIEW = 4, __INV_COUNT = 12, __INV_SIZE = 48,
		MOUSE_EVENT = {
			lup: 1,
			ldown: 2
		};


	class Mouse { // мышь:
		constructor() {
			this.x = 0;
			this.y = 0;
			this.event = 0;
			this.item = {
				id: 0,
				count: 0
			}
		}
		set(e) {
			this.x = e.pageX;
			this.y = e.pageY;
		}
		draw() {
			if (this.item.id != 0 && this.item.count > 0) { // рисование предмета:
				canvas.fillStyle = '#f00';
				canvas.fillRect(this.x + 8, this.y + 8, __INV_SIZE - 8, __INV_SIZE - 8);
			}
		}
	}
	let mouse = new Mouse();


	let canvas_id = document.querySelector('canvas');
	canvas_id.height = canvas_id.clientHeight;
	canvas_id.width = canvas_id.clientWidth;
	let canvas = canvas_id.getContext('2d'), player_list = [], gravity = .5, inventory = [], item_list = [], current_time = 0, inv_select = 0,
		camera = {
			x: 0,
			y: 0
		};
	canvas.imageSmoothingEnabled = false;
	let object_list = [];
	let distance = (x1, y1, x2, y2, dist) => { return (Math.abs(x1-x2) <= dist && Math.abs(y1-y2) <= dist); }
	
	let _window = 1,
		window_list = {
			inventory: 1,
			shop: 2,
			death: 4
		};

	class Obj {
		constructor(x, y) {
			this.x = x || 0;
			this.y = y || 0;
			this.hspd = 0;
			this.vspd = 0;
		}
	}
	class Item extends Obj {
		constructor(x, y, id) {
			super(x, y);
			this.id = id;
			this.animate = false;
			this.give = false;
		}
		update() {
			if (!distance(this.x, this.y, player.x, player.y, 16)) {
				this.vspd += gravity;
				if (world.grid[Math.floor(this.x / world.size)][Math.floor((this.y + 8 + this.vspd) / world.size)] != 0) {
					while(!world.grid[Math.floor(this.x / world.size)][Math.floor((this.y + 8 + Math.sign(this.vspd)) / 32)]) this.y += Math.sign(this.vspd);
					this.vspd = 0;
					this.animate = true;
				} else this.animate = false;
				this.y += this.vspd;
			} else {
				if (!this.give) {
					let find = false;
					for (let i = 0; i < inventory.length; i++) {
						if (inventory[i].id == this.id) {
							inventory[i].count++;
							find = true;
							break;
						}
					}
					if (!find) {
						for (let i = 0; i < inventory.length; i++) {
							if (!inventory[i].id) {
								inventory[i].id = this.id;
								inventory[i].count++;
								break;
							}
						}
					}
					this.give = true;
				}
			}
		}
		draw(nx, ny) {
			let xx = nx || this.x, yy = ny || this.y;
			canvas.fillStyle = '#f00';
			canvas.fillRect(xx - 8 - camera.x, yy - 8 - camera.y - Math.abs(Math.sin(current_time * .25 * Math.PI / 180)) * 8, 16, 16);
		}
	}
	class Slot {
		constructor(type, id, count) {
			this.id = id || 0;
			this.type = type || '';
			this.count = count || 0;
			this.replace = false;
		}
		update(x, y) {
			if (mouse.x >= x && mouse.x <= x + __INV_SIZE && mouse.y >= y && mouse.y <= y + __INV_SIZE) {
				if ((mouse.event & MOUSE_EVENT.lup) && this.id == 0 && mouse.item.id != 0) { // принять предмет от мышки:
					this.id = mouse.item.id;
					this.count = mouse.item.count;
					for (let i = 0; i < __INV_COUNT; i++) {
						if (inventory[i].replace) {
							inventory[i].id = 0;
							inventory[i].count = 0;
							inventory[i].replace = false;
							break;
						}
					}
					mouse.item = {
						id: 0,
						count: 0
					};
					mouse.event &=~ MOUSE_EVENT.lup;
				}
				if ((mouse.event & MOUSE_EVENT.ldown) && this.id != 0 && mouse.item.id == 0) {
					mouse.item = {
						id: this.id,
						count: this.count
					};
					this.replace = true;
					//this.id = 0;
					//this.count = 0;
					mouse.event &=~ MOUSE_EVENT.ldown;
				}
			}
		}
		draw(x, y, select) {
			let size = __INV_SIZE;
			if (select) canvas.fillStyle = '#444';
				else canvas.fillStyle = '#666';
			canvas.fillRect(x, y, size, size);
			if (this.id != 0) { // рисование предмета:
				canvas.fillStyle = '#ff0033';
				canvas.fillRect(x + size * .2, y + size * .2, size * .6, size * .6);
				if (this.count > 1) {
					canvas.font = 'bold 15px Arial';
					canvas.fillStyle = '#fff';
					canvas.strokeStyle = '#000';
					canvas.textAlign = 'right';
					canvas.textBaseLine = 'bottom';
					canvas.strokeText('x' + this.count, x + size - 4, y + size - 4);
					canvas.fillText('x' + this.count, x + size - 4, y + size - 4);
					canvas.textBaseLine = 'top';
					canvas.textAlign = 'left';
				}
			}
		}
	}
	class Bullet {
		constructor(type, x, y, dir, damage) {
			this.type = type;
			this.x = x;
			this.y = y;
			this.dir = dir || 0;
			this.damage = damage || 1;
		}
		update() {
			this.x += this.dir * 4;
			//this.y -= Math.sin(this.dir) * 4;
		}
		draw() {
			canvas.fillStyle = '#f0f';
			canvas.fillRect(this.x - camera.x, this.y - camera.y, 8, 8);
		}
	}
	class Player extends Obj {
		constructor(username, id) {
			super();
			this.max_hp = 10;
			this.hp = this.max_hp;
			this.speed = 3;
			this.xscale = 1;
			this.armor = 0;
			this.damage = 0;
			this.id = id || -1;
			this.jump = 0;
			this.username = username;
			this.event = 0;
			this.event_list = {
				action: 1,
				damage: 2,
				death: 4,
				jump: 8
			}
			this.time_action = 0;
			this.damage_time = 0;
		}
		draw(nx, ny, mode) {
			let xx = nx || this.x, yy = ny || this.y, xoffset = 0, yoffset = 0;
			
			let zoom = 2, w = 17, h = 21, src = images.player.default;
			if (this.event & this.event_list.jump) src = images.player.jump;
			if (this.event & this.event_list.action) {
				src = images.player.action;
				w = 19;
				xoffset = 3;
			}
			if (this.event & this.event_list.death) {
				src = images.player.death;
				w = 25;
				h = 10;
				yoffset = 6;
			}
			if (this.event & this.event_list.damage) {
				src = images.player.damage;
				w = 17;
				h = 23;
				xoffset = -1;
			}
			canvas.drawImage(src, 0, 0, w, h, xx - w - camera.x + xoffset * zoom, yy - h - camera.y + yoffset * zoom, w * zoom, h * zoom);

			// рисование предмета в руке:
			w = 19;
			h = 7;
			canvas.drawImage(images.weapons.health_gun, 0, 0, w, h, xx - camera.x - w, yy - camera.y, w * zoom, h * zoom);

			if (mode) { // ники игроков:
				canvas.font = '12px Arial';
				canvas.fillStyle = '#00f';
				canvas.textAlign = 'center';
				canvas.textBaseLine = 'bottom';

				canvas.fillText(this.username, xx - camera.x, yy - 32 - camera.y);

				canvas.textBaseLine = 'top';
				canvas.textAlign = 'left';
			}
		}
		control(world, sys) {
			try {
				this.vspd += gravity;
				if (this.hp > 0) {
					this.hspd += (Math.sign((sys.key & sys.keys.right) - (sys.key & sys.keys.left)) * this.speed - this.hspd) * .125;
					if (Math.sign(this.hspd) != 0) this.xscale = Math.sign(this.hspd);
					if (this.jump && (sys.key & sys.keys.up)) { // прыжок:
						sys.key &=~ sys.keys.up;
						this.jump--;
						this.vspd = -8;
						this.speed *= 1.5;
					}
					if (world.grid[Math.floor((this.x + (world.size * .5) * Math.sign(this.hspd) + this.hspd) / world.size)][Math.floor(this.y / world.size)] == 1) {
						while(world.grid[Math.floor((this.x + (world.size * .5 + 1) * Math.sign(this.hspd)) / world.size)][Math.floor(this.y / world.size)] != 1) this.x += Math.sign(this.hspd);
						this.hspd = 0;
					}
				} else { // смерть игрока:
					this.hspd = 0;
					_window |= window_list.death;
					this.event |= this.event_list.death;
				}
				if (world.grid[Math.floor(this.x / world.size)][Math.floor((this.y + 21 + this.vspd) / world.size)] == 1) {
					while(world.grid[Math.floor(this.x / world.size)][Math.floor((this.y + 21 + Math.sign(this.vspd)) / world.size)] != 1) this.y += Math.sign(this.vspd);
					this.vspd = 0;
					this.jump = 1;
					this.speed = 3;
					this.event &=~ this.event_list.jump;
				} else this.event |= this.event_list.jump;
				this.x += this.hspd;
				this.y += this.vspd;

				network.send('move', {
					x: this.x,
					y: this.y,
					event: this.event
				});

				if (this.time_action > 0) this.time_action--;
					else {
						this.event &=~ this.event_list.action;
					}
			}
			catch(err) {
				this.x = 0;
				this.y = 0;
				this.hspd = 0;
				this.vspd = 0;
				this.jump = false;
			}
		}
	}
	class World {
		constructor(width, height) {
			this.grid = [];
			this.size = 32;
			for (let i = 0; i < width; i++) {
				this.grid.push([]);
				for (let j = 0; j < height; j++) {
					this.grid[i][j] = 0;
				}
			}
		}
	}
	class Region {
		constructor(x, y, width, height) {
			this.width = width || Math.floor(600 / 32) * 32;
			this.height = height || Math.floor(400 / 32) * 32;
			this.x = Math.floor(x / 32) * 32;
			this.y = Math.floor(y / 32) * 32;
		}
		draw(world, nx, ny) {
			let xx = nx || this.x, yy = ny || this.y;
			if (xx + this.width >= camera.x && xx <= camera.x + canvas_id.width) {
			let dx = 0, dy = 0;
			let x = this.x / 32, y = this.y / 32, w = this.width / 32, h = this.height / 32;
			for (let i = x; i < x + w; i++) {
				dy = 0;
				for (let j = y; j < y + h; j++) {
					switch(world.grid[i][j]) {
						case 1:
							if (j - 1 >= 0) {
								
								canvas.fillStyle = '#3E2F39';
								canvas.fillRect(xx + dx * 32 - camera.x, yy + dy * 32 - camera.y, 32, 32);
								if (world.grid[i][j - 1] != 1) canvas.drawImage(images.grass, xx + dx * 32 - camera.x, yy + dy * 32 - camera.y - 4);
							}
							
						break;
						case 2: // дерево:

							if (j - 1 >= 0) {
								let left = 0, top = 0;
								if (world.grid[i][j - 1] == 3) left = 32;
								//if (world.grid[i][j - 1] == 2 || world.grid[i][j + 1] == 2) {

									canvas.drawImage(images.wood, left, top, 32, 32, xx + dx * 32 - camera.x, yy + dy * 32 - camera.y, 32, 32);
								//}
							}
							//canvas.fillStyle ='#883377';
							//canvas.fillRect(xx + dx * 32 - camera.x, yy + dy * 32 - camera.y, 32, 32);
						break;
						case 3: // трава:
							canvas.fillStyle = '#7BAD72';
							canvas.fillRect(xx + dx * 32 - camera.x, yy + dy * 32 - camera.y, 32, 32);
						break;
					}
					dy++;
				}
				dx++;
			}
			//canvas.strokeStyle = '#f00';
			//canvas.strokeRect(xx - camera.x, yy - camera.y, this.width, this.height);
			if (nx || ny) { // рисование масок объектов:
				player_list.forEach(e => {
					if (e.x >= this.x && e.x <= this.x + this.width) {
						let xx = Math.floor(e.x / (Math.floor(600 / 32) * 32)) * (Math.floor(600 / 32) * 32);
						if (e.x - xx != 0 && nx) e.draw(nx + (e.x - xx), undefined, 1);
					}
				});
				item_list.forEach(e => {
					if (e.x >= this.x && e.x <= this.x + this.width) {
						let xx = Math.floor(e.x / (Math.floor(600 / 32) * 32)) * (Math.floor(600 / 32) * 32);
						if (e.x - xx != 0 && nx) e.draw(nx + (e.x - xx));
					}
				});
			}
			}
		}
	}
	class Network {
		constructor() { this.socket = io(); }
		send(key, data) { this.socket.emit(key, data || 1); }
		get(key, func) { this.socket.on(key, msg => func(msg)); }
	}
	class Keyboard {
		constructor() {
			this.key = 0;
			this.keys = {
				up: 1,
				left: 2,
				right: 4,

				num1: 8,
				num2: 16,
				num3: 32,
				num4: 64
			};
			window.onkeydown = e => {
				e.preventDefault();
				switch(e.keyCode) {
					case 87: this.key |= this.keys.up; break;
					case 65: this.key |= this.keys.left; break;
					case 68: this.key |= this.keys.right; break;
				}
			};
			window.onkeyup = e => {
				e.preventDefault();
				switch(e.keyCode) {
					case 87: this.key &=~ this.keys.up; break;
					case 65: this.key &=~ this.keys.left; break;
					case 68: this.key &=~ this.keys.right; break;

					case 49: case 50:
					case 51: case 52:
						this.key |= this.keys['num' + (4 - (52 - e.keyCode))];
					break;
				}
			}
			
		}
	}
	canvas_id.onmousemove = e => mouse.set(e);
	canvas_id.onmouseup = e => {
		mouse.set(e);
		mouse.event |= MOUSE_EVENT.lup;
	}
	canvas_id.onmousedown = e => {
		mouse.set(e);
		mouse.event |= MOUSE_EVENT.ldown;
	}
	canvas_id.oncontextmenu = e => e.preventDefault();

	let images = {
		player: {
			default: new Image(),
			damage: new Image(),
			jump: new Image(),
			death: new Image(),
			action: new Image()
		},
		weapons: {
			health_gun: new Image()
		},
		grass: new Image(),
		wood: new Image()
	},
	dcookie = document.cookie.split(';').map(e => e.split('=')), cookie = {};
	cookie[dcookie[0][0].replace(' ', '')] = dcookie[0][1];
	cookie[dcookie[1][0].replace(' ', '')] = dcookie[1][1];
	if (cookie.length < 2) document.location = '/login';
	images.player.default.src = '/img/player/default.png';
	images.player.jump.src = '/img/player/jump.png';
	images.player.death.src = '/img/player/death.png';
	images.player.damage.src = '/img/player/damage.png';
	images.player.action.src = '/img/player/action.png';

	images.grass.src = '/img/grass.png';
	images.wood.src = '/img/wood.png';

	images.weapons.health_gun.src = '/img/weapons/health-gun.png';
	let network = new Network(), keyboard = new Keyboard(),
		player = new Player(cookie.username), world = new World(10, 10), region_list = [];


	for (let i = 0; i < __INV_COUNT; i++) { // создание инвентаря:
		inventory.push(new Slot());
	}
	inventory[5].id = 1;
	inventory[5].count = 3;
	network.send('auth', {
		username: player.username,
		password: cookie.password
	});
	network.get('login', msg => {
		if (!msg.error) {
			player.x = msg.x;
			player.y = msg.y;
			// загрузка мира:
			document.title = msg.server_name;
			world.grid = msg.world;
			for (let i = 0; i < msg.items.length; i++) 
				item_list.push(new Item(msg.items[i].x, msg.items[i].y, msg.items[i].id));
			for (let i = 0; i < 5; i++) {
				region_list.push([]);
				for (let j = 0; j < 5; j++) 
					region_list[i][j] = new Region(Math.floor(600 / 32) * 32 * i, Math.floor(400 / 32) * 32 * j);
			}
		} else document.location = '/login';
	});
	network.get('auth', msg => {
		let find = false;
		player_list.forEach(e => {
			if (e.id == msg.id) {
				find = true;
				return;
			}
		});
		if (!find) {
			player_list.push(new Player(msg.username, msg.id));
			player_list[player_list.length - 1].x = msg.x;
			player_list[player_list.length - 1].y = msg.y;
			network.send('user', {
				id: msg.id,
				username: cookie.username,
				x: player.x,
				y: player.y
			});
		}
	})
	network.get('item', msg => {
		switch(msg.action) {
			case 'drop':
				item_list.push(new Item(msg.x, msg.y, msg.id));
			break;
			case 'give':
				item_list.splice(msg.index, 1);
			break;
		}
	});
	network.get('move', msg => {
		player_list.forEach(e => {
			if (e.id == msg.id) {
				e.x = msg.x;
				e.y = msg.y;
				e.event = msg.event;
			}
		});
	});
	network.get('destroy', msg => {
		world.grid[msg.i][msg.j] = 0;
	});
	network.get('exit', msg => {
		player_list.forEach((e, i) => {
			if (e.id == msg) {
				player_list.splice(i, 1);
				return;
			}
		});
	});
	network.get('create', msg => { world.grid[msg.i][msg.j] = 1; });
	network.get('max', msg => console.log('max!'));
	let update = t => {
		current_time = t;
		//world.draw();
		canvas.clearRect(0, 0, canvas_id.width, canvas_id.height);
		camera.x = Math.floor(player.x - canvas_id.width / 2);
		camera.y = Math.floor(player.y - canvas_id.height / 2);
		if (region_list.length != 0) {
			for (let i = 0; i < region_list.length; i++) {
				region_list[i].forEach(e => {
					e.draw(world);
				});
				if (!i) {
					region_list[region_list.length -1].forEach((e, j) => e.draw(world, -Math.floor(600 / 32) * 32, Math.floor(400 / 32) * 32 * j));
				}
				if (i == region_list.length - 1) region_list[0].forEach((e, j) => e.draw(world, Math.floor(600 / 32) * 32 * region_list.length, Math.floor(400 / 32) * 32 * j));
			}
		}
		player_list.forEach(e => e.draw(undefined, undefined, 1));
		player.draw();
		player.control(world, keyboard);
		object_list.forEach(e => {
			e.draw();
			e.update();
		})
		item_list.forEach((e, i) => {
			e.draw();
			e.update();
			if (e.give) {
				network.send('item', {
					index: i,
					action: 'give'
				});
				item_list.splice(i, 1);
			}
		});
		gui();
		window.requestAnimationFrame(update);
	},
	gui = () => {
		if (!(_window & window_list.death)) {
			// инвентарь:
			let offset = 8, xx = canvas_id.width / 2 - (__INV_SIZE + offset) * __INV_VIEW / 2,
				yy = canvas_id.height - (offset + __INV_SIZE);
			for (let i = 0; i < __INV_VIEW; i++) {
				inventory[i].update(xx + (__INV_SIZE + offset) * i, yy, inv_select == i)
				inventory[i].draw(xx + (__INV_SIZE + offset) * i, yy, inv_select == i);
			}
			if (_window & window_list.inventory) {
				for (let i = __INV_VIEW; i < __INV_COUNT; i++) {
					inventory[i].update(xx + (offset + __INV_SIZE) * ((i - __INV_VIEW) % 4), yy - (offset + __INV_SIZE) * (Math.floor((i - __INV_VIEW) / 4) + 1));	
					inventory[i].draw(xx + (offset + __INV_SIZE) * ((i - __INV_VIEW) % 4), yy - (offset + __INV_SIZE) * (Math.floor((i - __INV_VIEW) / 4) + 1), false);
				
				}
			}
			if (mouse.event & MOUSE_EVENT.ldown) mouse.event &=~ MOUSE_EVENT.ldown;
			if (mouse.event & MOUSE_EVENT.lup) {
				mouse.event &=~ MOUSE_EVENT.lup;
				mouse.item = {
					id: 0,
					count: 0
				}
			}
			if (keyboard.key & keyboard.keys.num1) {
				inv_select = 0;
				keyboard.key &=~ keyboard.keys.num1;
			}
			if (keyboard.key & keyboard.keys.num2) {
				inv_select = 1;
				keyboard.key &=~ keyboard.keys.num2;
			}
			if (keyboard.key & keyboard.keys.num3) {
				inv_select = 2;
				keyboard.key &=~ keyboard.keys.num3;
			}
			if (keyboard.key & keyboard.keys.num4) {
				inv_select = 3;
				keyboard.key &=~ keyboard.keys.num4;
			}
			// рисовать курсор:
			mouse.draw();


			//let icon_size = 48, xx = canvas_id.width / 2 - (icon_size + 4) * __INV_VIEW / 2;
			/*canvas.fillStyle = '#666';
			for (let i = 0; i < __INV_VIEW; i++) {
				inventory[i].draw(xx + (icon_size + 4) * i, 10, icon_size, inv_select == i);
			}
			if (_window & window_list.inventory) {
				for (let i = __INV_VIEW; i < __INV_COUNT; i++) {
					inventory[i].draw(xx + (icon_size + 4) * ((i - __INV_VIEW) % 4), 10 + (icon_size + 4) * (Math.floor((i - __INV_VIEW) / 4) + 1), icon_size, false);
				}
			}
			if (add_button(xx + (icon_size + 4) * 4, 10, icon_size, icon_size)) {
				alert('ok!');
			}*/
			/*xx = canvas_id.width / 2 - 32 * 5 / 2;
			let hp = Math.floor(player.max_hp / player.hp);
			for (let i = 0; i < Math.floor(player.max_hp / 2); i++) {
				if (i * 2 + 1 <= player.hp) canvas.fillStyle = '#f00';
					else canvas.fillStyle = '#882222';
				canvas.fillRect(xx + 32 * i, canvas_id.height - 48, 24, 24);
			}*/
		} else {
			// экран смерти:
			canvas.globalAlpha = .8;
			canvas.fillStyle = '#600';
			canvas.fillRect(0, 0, canvas_id.width, canvas_id.height);
			canvas.globalAlpha = 1;
			if (add_button(canvas_id.width * .5 - 100, canvas_id.height * .8 - 16, 200, 32)) { // воскрешение:
				document.location = '/';
			}
		}
	};
	let add_button = (x, y, w, h) => {
		let turn = false;
		canvas.fillStyle = '#666';
		if (mouse.x - camera.x >= x && mouse.x - camera.x <= x + w && mouse.y - camera.y >= y && mouse.y - camera.y <= y + h) {
			if (mouse.event & mouse_event.lclick) {
				mouse.event &=~ mouse_event.lclick;
				turn = true;
			}
		}
		canvas.fillRect(x, y, w, h);
		return turn;
	}
	update();
})();
