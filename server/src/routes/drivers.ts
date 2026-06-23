import { Router, Response } from 'express';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import db from '../db';

const router = Router();

router.get('/me', requireAuth, requireRole('driver'), (req: AuthRequest, res: Response) => {
  const driver = db.prepare(`
    SELECT d.*, u.name, u.email, u.phone
    FROM drivers d JOIN users u ON d.user_id = u.id
    WHERE d.user_id = ?
  `).get(req.user!.id);
  if (!driver) return res.status(404).json({ error: 'Driver profile not found' });
  res.json(driver);
});

router.put('/status', requireAuth, requireRole('driver'), (req: AuthRequest, res: Response) => {
  const { isOnline } = req.body;
  if (typeof isOnline !== 'boolean') {
    return res.status(400).json({ error: 'isOnline (boolean) required' });
  }
  db.prepare('UPDATE drivers SET is_online = ? WHERE user_id = ?').run(isOnline ? 1 : 0, req.user!.id);
  res.json({ isOnline });
});

router.put('/vehicle', requireAuth, requireRole('driver'), (req: AuthRequest, res: Response) => {
  const { vehicleMake, vehicleModel, vehicleYear, licensePlate } = req.body;
  db.prepare(`
    UPDATE drivers SET vehicle_make = ?, vehicle_model = ?, vehicle_year = ?, license_plate = ?
    WHERE user_id = ?
  `).run(vehicleMake, vehicleModel, vehicleYear, licensePlate, req.user!.id);
  res.json({ success: true });
});

router.get('/earnings', requireAuth, requireRole('driver'), (req: AuthRequest, res: Response) => {
  const driver = db.prepare('SELECT * FROM drivers WHERE user_id = ?').get(req.user!.id) as {
    id: number; total_earnings: number; total_rides: number;
  } | undefined;
  if (!driver) return res.status(404).json({ error: 'Driver not found' });

  const today = db.prepare(`
    SELECT COALESCE(SUM(driver_earnings), 0) as earnings, COUNT(*) as rides
    FROM rides WHERE driver_id = ? AND status = 'completed'
    AND date(completed_at) = date('now')
  `).get(driver.id) as { earnings: number; rides: number };

  const thisWeek = db.prepare(`
    SELECT COALESCE(SUM(driver_earnings), 0) as earnings, COUNT(*) as rides
    FROM rides WHERE driver_id = ? AND status = 'completed'
    AND completed_at >= datetime('now', '-7 days')
  `).get(driver.id) as { earnings: number; rides: number };

  const thisMonth = db.prepare(`
    SELECT COALESCE(SUM(driver_earnings), 0) as earnings, COUNT(*) as rides
    FROM rides WHERE driver_id = ? AND status = 'completed'
    AND strftime('%Y-%m', completed_at) = strftime('%Y-%m', 'now')
  `).get(driver.id) as { earnings: number; rides: number };

  const uberWouldHaveEarned = db.prepare(`
    SELECT COALESCE(SUM(total_fare * 0.75), 0) as amount
    FROM rides WHERE driver_id = ? AND status = 'completed'
  `).get(driver.id) as { amount: number };

  res.json({
    total: {
      earnings: driver.total_earnings,
      rides: driver.total_rides,
    },
    today,
    thisWeek,
    thisMonth,
    savedVsUber: parseFloat((driver.total_earnings - uberWouldHaveEarned.amount).toFixed(2)),
  });
});

export default router;
