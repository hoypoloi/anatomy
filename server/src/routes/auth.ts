import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db';
import { signToken, requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

router.post('/register', (req, res: Response) => {
  const { email, password, name, phone, role, vehicleMake, vehicleModel, vehicleYear, licensePlate } = req.body;

  if (!email || !password || !name || !role) {
    return res.status(400).json({ error: 'email, password, name, and role are required' });
  }
  if (!['rider', 'driver'].includes(role)) {
    return res.status(400).json({ error: 'role must be rider or driver' });
  }

  try {
    const hash = bcrypt.hashSync(password, 10);
    const user = db.prepare(
      'INSERT INTO users (email, password_hash, name, phone, role) VALUES (?, ?, ?, ?, ?)'
    ).run(email, hash, name, phone || null, role);

    if (role === 'driver') {
      db.prepare(
        `INSERT INTO drivers (user_id, vehicle_make, vehicle_model, vehicle_year, license_plate)
         VALUES (?, ?, ?, ?, ?)`
      ).run(user.lastInsertRowid, vehicleMake || null, vehicleModel || null, vehicleYear || null, licensePlate || null);
    }

    const token = signToken({ id: user.lastInsertRowid as number, email, role });
    res.status(201).json({ token, user: { id: user.lastInsertRowid, email, name, role } });
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', (req, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as {
    id: number; email: string; password_hash: string; name: string; role: string;
  } | undefined;

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = signToken({ id: user.id, email: user.email, role: user.role });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

router.get('/me', requireAuth, (req: AuthRequest, res: Response) => {
  const user = db.prepare(
    'SELECT id, email, name, phone, role, created_at FROM users WHERE id = ?'
  ).get(req.user!.id);
  res.json(user);
});

export default router;
