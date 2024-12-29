import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

// import purchaseController from './controllers/purchaseController.js';
// import redeemController from './controllers/redeemController.js';
// import referralController from './controllers/referralController.ts';
// import taskController from './controllers/taskController.ts';


const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
});

// Middleware to parse JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/purchase', purchaseController);
app.use('/api/redeem', redeemController);
app.use('/api/referrals', referralController);
app.use('/api/tasks', taskController);

// Mock function to get stock data
const getCurrentStockData = () => ({
  fxckedUpBagsLimit: 5000,
  fxckedUpBagsUsed: Math.floor(Math.random() * 5000),
  humanRelationsLimit: 5000,
  humanRelationsUsed: Math.floor(Math.random() * 5000),
});

// WebSocket logic
io.on('connection', (socket) => {
  console.log('A user connected');

  socket.emit('stockUpdate', getCurrentStockData());

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Broadcast stock updates periodically
setInterval(() => {
  const stockData = getCurrentStockData();
  io.emit('stockUpdate', stockData);
}, 5000);

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
