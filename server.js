const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const server = require('http').Server(app);
const { v4: uuidv4 } = require('uuid');
const io = require('socket.io')(server);
const { ExpressPeerServer } = require('peer');
const peerServer = ExpressPeerServer(server, {
  debug: true,
});

const users = {};
app.set('view engine', 'ejs');

app.use(express.static('public'));
app.use('/peerjs', peerServer);
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.render('home');
});
app.post('/auth', (req, res) => {
  console.log(users);
  if (!users[req.body.nickname]) {
    res.redirect(
      `/flesh?room=${req.body.roomId ? req.body.roomId : uuidv4()}&nickname=${
        req.body.nickname
      }`
    );
  } else {
    res.redirect('/');
  }
});

app.get('/flesh', (req, res) => {
  if (!req.query.nickname || !req.query.room || users[req.query.nickname]) {
    res.redirect('/');
  } else {
    res.render('room', {
      roomId: req.query.room,
      nickname: req.query.nickname,
    });
  }
});

io.on('connection', (socket) => {
  socket.on('join-room', (ROOM_ID, userId, NICKNAME) => {
    users[NICKNAME] = NICKNAME;
    socket.join(ROOM_ID);
    socket.to(ROOM_ID).broadcast.emit('user-connected', userId, NICKNAME);

    socket.on('message', (message) => {
      io.to(ROOM_ID).emit('message', message);
    });
    socket.on('disconnect', () => {
      delete users[NICKNAME];
      socket.to(ROOM_ID).broadcast.emit('user-disconnected', userId);
    });
    socket.on('leave-room', () => {
      socket.to(ROOM_ID).broadcast.emit('user-disconnected', userId);
    });
  });
});

server.listen(process.env.PORT || '3000');
