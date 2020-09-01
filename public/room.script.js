const socket = io('/');
const myVideo = document.createElement('video');
myVideo.muted = true;
const myMessage = document.getElementById('chat_messages');
const myAudioBtn = document.getElementById('audio-btn');
const myVideoBtn = document.getElementById('video-btn');
const input = document.getElementById('chat_message');

const myMessageWindow = document.getElementById('chat_window');
const videoGrid = document.getElementById('video-grid');

let myVideoStream;
const peers = {};

const myPeer = new Peer({
  host: '/',
  port: '9000',
  path: '/',
  config: {
    iceServers: [
      { url: 'stun:stun1.l.google.com:19302' },
      {
        url: 'turn:numb.viagenie.ca',
        credential: 'muazkh',
        username: 'webrtc@live.com',
      },
    ],
  },

  debug: 3,
});

//=============================Stream=============================

navigator.getUserMedia =
  navigator.mediaDevices.getUserMedia ||
  navigator.getUserMedia ||
  navigator.webkitGetUserMedia ||
  navigator.mozGetUserMedia ||
  navigator.msGetUserMedia;

navigator
  .getUserMedia({
    video: true,
    audio: true,
  })
  .then((stream, e) => {
    myVideoStream = stream;
    addVideoStream(myVideo, stream);

    myPeer.on('call', (call) => {
      call.answer(stream);
      const video = document.createElement('video');
      call.on('stream', (userVideoStream) => {
        addVideoStream(video, userVideoStream);
      });
      call.on('close', () => {
        video.remove();
      });
      peers[call.peer] = { call };
    });

    socket.on('user-connected', (userId, nickname) => {
      connectToNewUser({ userId, nickname }, stream);
    });
  })
  .catch((e) => {
    // location.replace('/');
  });

//=============================Functions=============================

function addVideoStream(video, stream) {
  video.srcObject = stream;
  video.addEventListener('loadedmetadata', () => {
    video.play();
  });
  videoGrid.append(video);
}

function connectToNewUser({ userId, nickname }, stream) {
  const call = myPeer.call(userId, stream);
  const video = document.createElement('video');
  call.on('stream', (userVideoStream) => {
    addVideoStream(video, userVideoStream);
  });

  call.on('close', () => {
    video.remove();
  });
  createMessage({ user: nickname + ' - connected' });
  peers[userId] = { call, nickname };
}
function scrollToBttom(window) {
  if (window.scrollHeight > window.clientHeight) {
    window.scrollTo(0, window.scrollHeight);
  }
}
function createMessage({ message, user }) {
  const li = document.createElement('li');
  if (NICKNAME === user) li.classList.add('me_message');

  li.innerHTML = `<div><b class='message__author'>${user}</b><br/>${
    message ? '<div class="message__text">' + message + '</div>' : ''
  }</div>`;
  myMessage.append(li);
  scrollToBttom(myMessageWindow);
}

function toggleAudio() {
  const enabled = myVideoStream.getAudioTracks()[0].enabled;
  enabled
    ? (myVideoStream.getAudioTracks()[0].enabled = false)
    : (myVideoStream.getAudioTracks()[0].enabled = true);
  toggleAudioButton(enabled);
}
function toggleVideo() {
  const enabled = myVideoStream.getVideoTracks()[0].enabled;
  enabled
    ? (myVideoStream.getVideoTracks()[0].enabled = false)
    : (myVideoStream.getVideoTracks()[0].enabled = true);

  toggleVideoButton(enabled);
}
function toggleAudioButton(enabled) {
  const html = ` 
  <i class="fas fa-microphone${enabled ? '-slash warning' : ''}"></i>
  <span> ${enabled ? 'Unmute' : 'Mute'}</span>`;
  myAudioBtn.innerHTML = html;
}
function toggleVideoButton(enabled) {
  const html = ` 
  <i class="fas fa-video${enabled ? '-slash warning' : ''}"></i>
  <span>${enabled ? 'Start' : 'Stop'} Video</span>
  `;
  myVideoBtn.innerHTML = html;
}
function disconnectHandle() {
  socket.emit('leave-room');
  myVideoStream.getTracks().forEach((track) => track.stop());
  location.replace('/');
}
function participantsHandle(e) {
  console.log(e);
}
function chatHandler() {
  const $main = document.querySelector('main');
  $main.classList.toggle('open');
}
function participantsHandler() {
  const users = Object.keys(peers).map((user) => `${peers[user].nickname}`);
  createModal(users.join('<br>'));
}
function securityHandler() {
  createModal('All right reserved');
}

function createModal(data) {
  const $el = document.createElement('div');
  $el.classList.add('backdrop');
  $el.id = 'backdrop-modal';
  $el.setAttribute('data-type', 'backdrop');
  $el.innerHTML = ` <div class="modal">${data}</div>`;

  $el.addEventListener('click', (e) => {
    const { type } = e.target.dataset;
    if (type === 'backdrop') {
      document.body.removeChild($el);
    }
  });

  $el.innerHTML = ` <div class="modal">${data}</div>`;
  document.body.appendChild($el);
}
//=============================Socket|Peer=============================

myPeer.on('open', (id) => {
  console.log('open');
  socket.emit('join-room', ROOM_ID, id, NICKNAME);
});

socket.on('message', (message) => {
  createMessage(message);
});

socket.on('user-disconnected', (userId) => {
  if (peers[userId]) {
    peers[userId].call.close();
    createMessage({
      user:
        (peers[userId].nickname ? peers[userId].nickname : 'User') +
        ' - disconnected',
    });
    delete peers[userId];
  }
});
//=============================Messages=============================

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && input.value) {
    socket.emit('message', { message: input.value, user: NICKNAME });
    input.value = '';
  }
});
