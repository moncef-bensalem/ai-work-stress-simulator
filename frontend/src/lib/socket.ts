import { io, type Socket } from 'socket.io-client'

const SOCKET_URL = import.meta.env.DEV ? 'http://localhost:8000' : window.location.origin

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    const token = localStorage.getItem('access_token') ?? ''
    socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: false,
    })
  }
  return socket
}

export function connectSocket(): Socket {
  const s = getSocket()
  if (!s.connected) s.connect()
  return s
}

export function disconnectSocket() {
  if (socket?.connected) socket.disconnect()
}

/** Recrée le socket avec un token frais (après login) */
export function resetSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
