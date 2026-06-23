import { io } from 'socket.io-client';

const socket = io({ autoConnect: false });

export function connectSocket(userId: number, role: string) {
  if (!socket.connected) {
    socket.connect();
    socket.emit('auth', { userId, role });
  }
}

export function disconnectSocket() {
  socket.disconnect();
}

export default socket;
