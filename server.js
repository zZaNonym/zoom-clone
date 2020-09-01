const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const server = require('http').createServer(app);
const { v4: uuidv4 } = require('uuid');
const io = require('socket.io')(server);

// const { PeerServer } = require('peer');
// PeerServer({ port: 9000, path: '/peerjs' });
// const ExpressPeerServer = require('peer').ExpressPeerServer;
// app.use('/peerjs', ExpressPeerServer(server, { debug: true }));

const users = {};
app.set('view engine', 'ejs');

app.use(express.static('public'));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.render('home');
});
app.post('/auth', (req, res) => {
  res.redirect(
    `/flesh?room=${req.body.roomId ? req.body.roomId : uuidv4()}&nickname=${
      req.body.nickname
    }`
  );
});

app.get('/flesh', (req, res) => {
  if (!req.query.nickname || !req.query.room) {
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
    socket.join(ROOM_ID);
    socket.to(ROOM_ID).broadcast.emit('user-connected', userId, NICKNAME);
    socket.on('message', (message) => {
      io.to(ROOM_ID).emit('message', message);
    });
    socket.on('disconnect', () => {
      socket.to(ROOM_ID).broadcast.emit('user-disconnected', userId);
    });
    socket.on('leave-room', () => {
      socket.to(ROOM_ID).emit('user-disconnected', userId);
    });
  });
});

server.listen(process.env.PORT || '3000', (port) => {
  console.log(`Server started on ${port}`);
});
