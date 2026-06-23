import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import ridesRoutes from './routes/rides';
import driversRoutes from './routes/drivers';
import db from './db';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true },
});

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/rides', ridesRoutes);
app.use('/api/drivers', driversRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', app: 'FairRide' }));

// Socket.IO: real-time ride events
const driverSockets = new Map<number, string>(); // driverId -> socketId
const riderSockets = new Map<number, string>();   // userId -> socketId

io.on('connection', (socket) => {
  socket.on('auth', ({ userId, role }: { userId: number; role: string }) => {
    if (role === 'driver') {
      driverSockets.set(userId, socket.id);
      db.prepare('UPDATE drivers SET socket_id = ? WHERE user_id = ?').run(socket.id, userId);
    } else {
      riderSockets.set(userId, socket.id);
    }
  });

  // Rider requests a ride → notify all online drivers
  socket.on('ride:requested', ({ rideId, pickupAddress, dropoffAddress, totalFare, driverEarnings, riderId }: {
    rideId: number; pickupAddress: string; dropoffAddress: string;
    totalFare: number; driverEarnings: number; riderId: number;
  }) => {
    riderSockets.set(riderId, socket.id);
    const onlineDrivers = db.prepare(
      'SELECT socket_id FROM drivers WHERE is_online = 1 AND socket_id IS NOT NULL'
    ).all() as { socket_id: string }[];

    onlineDrivers.forEach(({ socket_id }) => {
      io.to(socket_id).emit('ride:new', {
        rideId, pickupAddress, dropoffAddress, totalFare, driverEarnings
      });
    });
  });

  // Driver accepts → notify rider
  socket.on('ride:accepted', ({ rideId, driverName, riderId }: {
    rideId: number; driverName: string; riderId: number;
  }) => {
    const riderSocket = riderSockets.get(riderId);
    if (riderSocket) {
      io.to(riderSocket).emit('ride:accepted', { rideId, driverName });
    }
    // Notify other drivers this ride is gone
    driverSockets.forEach((sid) => {
      if (sid !== socket.id) {
        io.to(sid).emit('ride:taken', { rideId });
      }
    });
  });

  // Driver starts ride
  socket.on('ride:started', ({ riderId }: { riderId: number }) => {
    const riderSocket = riderSockets.get(riderId);
    if (riderSocket) io.to(riderSocket).emit('ride:started', {});
  });

  // Driver completes ride
  socket.on('ride:completed', ({ riderId, driverEarnings }: { riderId: number; driverEarnings: number }) => {
    const riderSocket = riderSockets.get(riderId);
    if (riderSocket) io.to(riderSocket).emit('ride:completed', { driverEarnings });
  });

  // Cancellation
  socket.on('ride:cancelled', ({ riderId, driverId }: { riderId?: number; driverId?: number }) => {
    if (riderId) {
      const rSocket = riderSockets.get(riderId);
      if (rSocket) io.to(rSocket).emit('ride:cancelled', {});
    }
    if (driverId) {
      const dSocket = driverSockets.get(driverId);
      if (dSocket) io.to(dSocket).emit('ride:cancelled', {});
    }
  });

  socket.on('disconnect', () => {
    driverSockets.forEach((sid, userId) => {
      if (sid === socket.id) {
        driverSockets.delete(userId);
        db.prepare('UPDATE drivers SET socket_id = NULL WHERE user_id = ?').run(userId);
      }
    });
    riderSockets.forEach((sid, userId) => {
      if (sid === socket.id) riderSockets.delete(userId);
    });
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`FairRide server running on http://localhost:${PORT}`);
  console.log(`Drivers keep ${90}% of every fare`);
});
