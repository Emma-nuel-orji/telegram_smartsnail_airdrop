// pages/api/socket.ts or similar
import { Server } from 'socket.io';

const ioHandler = (req: any, res: any) => {
  if (!res.socket.server.io) {
    const io = new Server(res.socket.server, {
      path: '/socket.io',
    });
    
    res.socket.server.io = io;

    io.on('connection', socket => {
      socket.on('initialize', (data) => {
        // Handle initialization
        console.log('Client initialized with:', data);
      });
    });
  }
  res.end();
};

export default ioHandler;