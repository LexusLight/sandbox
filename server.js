let app = require('express')(), http = require('http').Server(app),
	io = require('socket.io')(http), fs = require('fs'),
	bodyParser = require('body-parser'),

	users = {}, world = {}, item_list = [];


app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());

const __server__ = JSON.parse(fs.readFileSync('./config', "utf8"));

let file = JSON.parse(fs.readFileSync(__server__.world.backup, "utf8"));
world = file.world;

http.listen(__server__.port, () => console.log(__server__.name + ' запущен!'));

['/', '/*.(css|js|png)', '/login', '/reg'].forEach(e => { // маршрутизатор:
	app.get(e, (req, res) => {
		switch(e) {
			case '/': res.sendFile(__dirname + '/index.html'); break;
			case '/*.(css|js|png)': res.sendFile(__dirname + req.path); break;
			case '/login': res.sendFile(__dirname + '/login.html'); break;
			case '/reg': res.sendFile(__dirname + '/reg.html'); break;
		}
	});
	if (e == '/login' || e == '/reg') {
		app.post(e, (req, res) => {
			switch(e) {
				case '/login':
					fs.exists(__dirname + __server__.path + req.body.username, find => {
						let error = 0;
						if (find) { // вход в аккаунт:
							let password = JSON.parse(fs.readFileSync(__dirname + __server__.path + req.body.username, "utf8")).password;
							if (req.body.password == password) {
								res.redirect('/');
							} else error = 1;
						} else error = 1;
						if (error) {
							res.writeHead(404, {'Content-type': 'text/html'})
							res.end('<h1>Пользователь не найден!</h1><a href = "/login">назад</a>');
						}
					});
				break;
			}
		});
	}
});

io.on('connection', socket => {
	console.log('попытка подключиться: ' + socket.id + '...');
	socket.on('auth', msg => {
		if (Object.keys(users).length + 1 < __server__.max) {
			fs.exists(__dirname + __server__.path + msg.username, find => {
				users[socket.id] = {
					x: 10,
					y: 10,
					username: msg.username
				};
				if (find) {
					let content = JSON.parse(fs.readFileSync(__dirname + __server__.path + msg.username, "utf8"));
					if (content.password == msg.password) {
						io.sockets.sockets[socket.id].emit('login', {
							x: content.x,
							y: content.y,
							server_name: __server__.name,
							world: world,
							items: item_list,
							error: 0
						});
						for (let key in users) { // данные о игроках:
							if (users[key] != socket.id) {
								io.sockets.sockets[socket.id].emit('auth', {
									x: users[key].x,
									y: users[key].y,
									id: key,
									username: users[key].username
								});
							}
						}
						users[socket.id].x = content.x;
						users[socket.id].y = content.y;
						socket.broadcast.emit('auth', {
							x: msg.x,
							y: msg.y,
							id: socket.id,
							username: msg.username
						});
					} else io.sockets.sockets[socket.id].emit('login', { error: 1 });
				}
			}) ;
		} else io.sockets.sockets[socket.id].emit('max', 1);
	});
	socket.on('move', msg => {
		socket.broadcast.emit('move', {
			x: msg.x,
			y: msg.y,
			id: socket.id,
			event: msg.event
		});
		if (users[socket.id]) {
			users[socket.id].x = msg.x;
			users[socket.id].y = msg.y;
		}
	});
	socket.on('disconnect', () => {
		console.log(socket.id + ' вышел!');
		if (users[socket.id]) {
			let content = JSON.parse(fs.readFileSync(__dirname + __server__.path + users[socket.id].username, "utf8"));
			fs.writeFileSync(__dirname + __server__.path + users[socket.id].username, JSON.stringify({
				x: users[socket.id].x,
				y: users[socket.id].y,
				password: content.password
			}));
			socket.broadcast.emit('exit', socket.id);
			delete users[socket.id];
			console.log(users);
		}
	})
});
/*
let app = require('http').createServer((req, res) => {
	fs.readFile(__dirname + '/login.html', (err, data) => {
		if (err) {
		
		}
		res.writeHead(200);
		res.end(data);
	});
}), io = require('socket.io')(app), fs = require('fs'), exp = require('express')();
app.listen(3000, () => console.log('server run!'));



exp.get('/:path', (req, res) => {
	
	//res.sendFile(__dirname + '/login.html');
});
// события:
io.on('connection', socket => {
	console.log('user conenct!');
	// регистрация и вход:
	let action = ['login', 'reg'], func = [(msg, find) => {
		if (!find) console.log('пользователь ' + msg.login + ' не найден!');
	}, (msg, find) => {
		if (!find) {
			fs.writeFileSync('./users/' + msg.login, JSON.stringify({
				password: msg.password,
				x: 0,
				y: 0,
				diamond: 0,
				inv: []
			}));
		}
	}];
	action.forEach((e, i) => {
		socket.on(e, msg => {
			fs.exists('./users/' + msg.login, find => {
				func[i](msg, find);
			});
		});
	});
	/*socket.on('login', msg => {
		fs.exists('/users/' + msg.username, find => {
			if (find) {

			} else console.log('пользователя не существует!');
		});
	});
	socket.on('reg', msg => {
		fs.exists
	})
});
*/


/*// подключение библиотек:
let app = require('express')(), http = require('http').Server(app),
	io = require('socket.io')(http), fs = require('fs');

class Client {
	constructor(username, password, socket) {
		this.username = username;
		this.password = password;
		this.socket = socket;
		this.is_login = false;
	}
}
class Server {
	constructor(port) {
		this.client_list = [];
		this.port = port || 3000;
	}
	auth(socket, func) { // авторизация пользователя:
		socket.on('login', msg => {
			this.client_list.push(new Client(msg.username, msg.password, socket.id));
			console.log('пользователь ' + msg.username + ' ввел пароль: ' + msg.password);
			func(socket);
		});
	}
	update(func) {
		app.get('/:path', (req, res) => {
			switch(req.params.path) {
				case '': res.sendFile(__dirname + '/index.html'); break;
				case 'login': res.sendFile(__dirname + '/login.html'); break;
			}		
		});
		io.on('connection', socket => {
			console.log('попытка входа: ' + socket.id);
			this.auth(socket, func);
		});
		io.listen(this.port, () => console.log('server starting!'));
	}
}
let server = new Server();
server.update(socket => {
	console.log('вы вошли в систему!');
});*/
