import { Router, Response } from 'express';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { calculateFare, estimateRideParams } from '../fare';
import db from '../db';

const router = Router();

router.post('/estimate', requireAuth, (req: AuthRequest, res: Response) => {
  const { pickupAddress, dropoffAddress, surgeMultiplier } = req.body;
  if (!pickupAddress || !dropoffAddress) {
    return res.status(400).json({ error: 'pickup and dropoff addresses required' });
  }
  const { distanceMiles, durationMinutes } = estimateRideParams(pickupAddress, dropoffAddress);
  const estimate = calculateFare(distanceMiles, durationMinutes, surgeMultiplier || 1.0);
  res.json(estimate);
});

router.post('/request', requireAuth, requireRole('rider'), (req: AuthRequest, res: Response) => {
  const { pickupAddress, dropoffAddress } = req.body;
  if (!pickupAddress || !dropoffAddress) {
    return res.status(400).json({ error: 'pickup and dropoff addresses required' });
  }

  const { distanceMiles, durationMinutes } = estimateRideParams(pickupAddress, dropoffAddress);
  const fare = calculateFare(distanceMiles, durationMinutes);

  const result = db.prepare(`
    INSERT INTO rides (rider_id, pickup_address, dropoff_address, distance_miles,
      duration_minutes, base_fare, total_fare, driver_earnings, platform_fee, surge_multiplier)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.user!.id, pickupAddress, dropoffAddress,
    fare.distanceMiles, fare.durationMinutes, fare.baseFare,
    fare.totalFare, fare.driverEarnings, fare.platformFee, fare.surgeMultiplier
  );

  const ride = db.prepare('SELECT * FROM rides WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ ride, fareDetails: fare });
});

router.get('/active', requireAuth, (req: AuthRequest, res: Response) => {
  const { role, id } = req.user!;
  let ride;
  if (role === 'rider') {
    ride = db.prepare(`
      SELECT r.*, u.name as driver_name, u.phone as driver_phone,
             d.vehicle_make, d.vehicle_model, d.vehicle_year, d.license_plate, d.rating as driver_rating
      FROM rides r
      LEFT JOIN drivers d ON r.driver_id = d.id
      LEFT JOIN users u ON d.user_id = u.id
      WHERE r.rider_id = ? AND r.status NOT IN ('completed', 'cancelled')
      ORDER BY r.created_at DESC LIMIT 1
    `).get(id);
  } else {
    const driver = db.prepare('SELECT id FROM drivers WHERE user_id = ?').get(id) as { id: number } | undefined;
    if (!driver) return res.json(null);
    ride = db.prepare(`
      SELECT r.*, u.name as rider_name, u.phone as rider_phone
      FROM rides r
      JOIN users u ON r.rider_id = u.id
      WHERE r.driver_id = ? AND r.status NOT IN ('completed', 'cancelled')
      ORDER BY r.created_at DESC LIMIT 1
    `).get(driver.id);
  }
  res.json(ride || null);
});

router.get('/pending', requireAuth, requireRole('driver'), (req: AuthRequest, res: Response) => {
  const rides = db.prepare(`
    SELECT r.*, u.name as rider_name, u.phone as rider_phone
    FROM rides r
    JOIN users u ON r.rider_id = u.id
    WHERE r.status = 'requested' AND r.driver_id IS NULL
    ORDER BY r.created_at ASC
  `).all();
  res.json(rides);
});

router.put('/:id/accept', requireAuth, requireRole('driver'), (req: AuthRequest, res: Response) => {
  const driver = db.prepare('SELECT * FROM drivers WHERE user_id = ?').get(req.user!.id) as { id: number } | undefined;
  if (!driver) return res.status(404).json({ error: 'Driver profile not found' });

  const activeRide = db.prepare(
    "SELECT id FROM rides WHERE driver_id = ? AND status NOT IN ('completed', 'cancelled')"
  ).get(driver.id);
  if (activeRide) return res.status(409).json({ error: 'You already have an active ride' });

  const result = db.prepare(`
    UPDATE rides SET driver_id = ?, status = 'accepted', accepted_at = CURRENT_TIMESTAMP
    WHERE id = ? AND status = 'requested' AND driver_id IS NULL
  `).run(driver.id, req.params.id);

  if (result.changes === 0) {
    return res.status(409).json({ error: 'Ride no longer available' });
  }

  const ride = db.prepare(`
    SELECT r.*, u.name as rider_name, u.phone as rider_phone
    FROM rides r JOIN users u ON r.rider_id = u.id WHERE r.id = ?
  `).get(req.params.id);
  res.json(ride);
});

router.put('/:id/start', requireAuth, requireRole('driver'), (req: AuthRequest, res: Response) => {
  const driver = db.prepare('SELECT id FROM drivers WHERE user_id = ?').get(req.user!.id) as { id: number } | undefined;
  if (!driver) return res.status(404).json({ error: 'Driver not found' });

  const result = db.prepare(`
    UPDATE rides SET status = 'in_progress', started_at = CURRENT_TIMESTAMP
    WHERE id = ? AND driver_id = ? AND status = 'accepted'
  `).run(req.params.id, driver.id);

  if (result.changes === 0) return res.status(409).json({ error: 'Cannot start this ride' });
  res.json({ success: true });
});

router.put('/:id/complete', requireAuth, requireRole('driver'), (req: AuthRequest, res: Response) => {
  const driver = db.prepare('SELECT * FROM drivers WHERE user_id = ?').get(req.user!.id) as {
    id: number; total_rides: number; total_earnings: number;
  } | undefined;
  if (!driver) return res.status(404).json({ error: 'Driver not found' });

  const ride = db.prepare('SELECT * FROM rides WHERE id = ? AND driver_id = ?').get(req.params.id, driver.id) as {
    id: number; driver_earnings: number; status: string;
  } | undefined;
  if (!ride || ride.status !== 'in_progress') {
    return res.status(409).json({ error: 'Cannot complete this ride' });
  }

  db.prepare(`
    UPDATE rides SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(ride.id);

  db.prepare(`
    UPDATE drivers SET total_rides = total_rides + 1,
      total_earnings = total_earnings + ? WHERE id = ?
  `).run(ride.driver_earnings, driver.id);

  const updatedRide = db.prepare('SELECT * FROM rides WHERE id = ?').get(ride.id);
  res.json(updatedRide);
});

router.put('/:id/cancel', requireAuth, (req: AuthRequest, res: Response) => {
  const { id, role } = req.user!;
  let result;

  if (role === 'rider') {
    result = db.prepare(`
      UPDATE rides SET status = 'cancelled'
      WHERE id = ? AND rider_id = ? AND status IN ('requested', 'accepted')
    `).run(req.params.id, id);
  } else {
    const driver = db.prepare('SELECT id FROM drivers WHERE user_id = ?').get(id) as { id: number } | undefined;
    if (!driver) return res.status(404).json({ error: 'Driver not found' });
    result = db.prepare(`
      UPDATE rides SET status = 'requested', driver_id = NULL, accepted_at = NULL
      WHERE id = ? AND driver_id = ? AND status = 'accepted'
    `).run(req.params.id, driver.id);
  }

  if (result.changes === 0) return res.status(409).json({ error: 'Cannot cancel this ride' });
  res.json({ success: true });
});

router.get('/history', requireAuth, (req: AuthRequest, res: Response) => {
  const { id, role } = req.user!;
  const limit = parseInt(req.query.limit as string) || 20;
  let rides;

  if (role === 'rider') {
    rides = db.prepare(`
      SELECT r.*, u.name as driver_name, d.rating as driver_rating
      FROM rides r
      LEFT JOIN drivers d ON r.driver_id = d.id
      LEFT JOIN users u ON d.user_id = u.id
      WHERE r.rider_id = ? AND r.status = 'completed'
      ORDER BY r.completed_at DESC LIMIT ?
    `).all(id, limit);
  } else {
    const driver = db.prepare('SELECT id FROM drivers WHERE user_id = ?').get(id) as { id: number } | undefined;
    if (!driver) return res.json([]);
    rides = db.prepare(`
      SELECT r.*, u.name as rider_name
      FROM rides r JOIN users u ON r.rider_id = u.id
      WHERE r.driver_id = ? AND r.status = 'completed'
      ORDER BY r.completed_at DESC LIMIT ?
    `).all(driver.id, limit);
  }
  res.json(rides);
});

export default router;
