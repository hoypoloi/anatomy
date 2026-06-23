import { useState, FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [params] = useSearchParams();
  const [role, setRole] = useState<'rider' | 'driver'>(
    params.get('role') === 'driver' ? 'driver' : 'rider'
  );
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/register', {
        name, email, phone, password, role,
        ...(role === 'driver' ? { vehicleMake, vehicleModel, vehicleYear: parseInt(vehicleYear), licensePlate } : {}),
      });
      login(res.data.token, res.data.user);
      navigate(role === 'driver' ? '/drive' : '/ride');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <Link to="/" className="block text-center text-2xl font-bold text-brand-600 mb-8">FairRide</Link>
        <div className="card">
          <h1 className="text-xl font-bold mb-4">Create your account</h1>

          {/* Role toggle */}
          <div className="flex rounded-lg border border-gray-200 p-1 mb-6">
            <button
              type="button"
              onClick={() => setRole('rider')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                role === 'rider' ? 'bg-brand-600 text-white' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              I want to ride
            </button>
            <button
              type="button"
              onClick={() => setRole('driver')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                role === 'driver' ? 'bg-brand-600 text-white' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              I want to drive
            </button>
          </div>

          {role === 'driver' && (
            <div className="mb-4 p-3 bg-brand-50 rounded-lg text-sm text-brand-700">
              As a driver, you keep <strong>90%</strong> of every fare.
            </div>
          )}

          {error && <p className="text-red-600 text-sm mb-4 bg-red-50 p-3 rounded-lg">{error}</p>}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
              <input className="input" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
              <input className="input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
            </div>

            {role === 'driver' && (
              <>
                <div className="border-t pt-3 mt-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Vehicle details</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Make</label>
                    <input className="input" placeholder="Toyota" value={vehicleMake} onChange={e => setVehicleMake(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                    <input className="input" placeholder="Camry" value={vehicleModel} onChange={e => setVehicleModel(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                    <input className="input" type="number" placeholder="2020" value={vehicleYear} onChange={e => setVehicleYear(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">License plate</label>
                    <input className="input" placeholder="ABC123" value={licensePlate} onChange={e => setLicensePlate(e.target.value)} />
                  </div>
                </div>
              </>
            )}

            <button type="submit" className="btn-primary w-full mt-2" disabled={loading}>
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="mt-4 text-sm text-center text-gray-500">
            Have an account? <Link to="/login" className="text-brand-600 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
