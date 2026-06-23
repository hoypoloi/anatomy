import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import socket from '../socket';
import { useAuth } from '../context/AuthContext';
import FareBreakdown from '../components/FareBreakdown';
import { Ride, FareEstimate } from '../types';

export default function RiderDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [estimate, setEstimate] = useState<FareEstimate | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [history, setHistory] = useState<Ride[]>([]);
  const [requesting, setRequesting] = useState(false);
  const [notification, setNotification] = useState('');
  const [tab, setTab] = useState<'book' | 'history'>('book');

  useEffect(() => {
    loadActiveRide();
    loadHistory();
  }, []);

  useEffect(() => {
    socket.on('ride:accepted', ({ driverName }: { driverName: string }) => {
      setNotification(`${driverName} is on their way!`);
      loadActiveRide();
    });
    socket.on('ride:started', () => {
      setNotification('Your ride has started!');
      loadActiveRide();
    });
    socket.on('ride:completed', () => {
      setNotification('Ride complete. Thanks for riding with FairRide!');
      setActiveRide(null);
      loadHistory();
    });
    socket.on('ride:cancelled', () => {
      setNotification('Ride was cancelled.');
      setActiveRide(null);
    });
    return () => {
      socket.off('ride:accepted');
      socket.off('ride:started');
      socket.off('ride:completed');
      socket.off('ride:cancelled');
    };
  }, []);

  async function loadActiveRide() {
    try {
      const res = await api.get('/rides/active');
      setActiveRide(res.data);
    } catch { /* ignore */ }
  }

  async function loadHistory() {
    try {
      const res = await api.get('/rides/history');
      setHistory(res.data);
    } catch { /* ignore */ }
  }

  async function getEstimate() {
    if (!pickup || !dropoff) return;
    setEstimating(true);
    try {
      const res = await api.post('/rides/estimate', { pickupAddress: pickup, dropoffAddress: dropoff });
      setEstimate(res.data);
    } finally {
      setEstimating(false);
    }
  }

  async function requestRide() {
    if (!estimate) return;
    setRequesting(true);
    try {
      const res = await api.post('/rides/request', { pickupAddress: pickup, dropoffAddress: dropoff });
      setActiveRide(res.data.ride);
      socket.emit('ride:requested', {
        rideId: res.data.ride.id,
        pickupAddress: pickup,
        dropoffAddress: dropoff,
        totalFare: res.data.fareDetails.totalFare,
        driverEarnings: res.data.fareDetails.driverEarnings,
        riderId: user!.id,
      });
      setEstimate(null);
      setPickup('');
      setDropoff('');
    } finally {
      setRequesting(false);
    }
  }

  async function cancelRide() {
    if (!activeRide) return;
    await api.put(`/rides/${activeRide.id}/cancel`);
    setActiveRide(null);
    setNotification('Ride cancelled.');
  }

  const statusColors: Record<string, string> = {
    requested: 'badge-yellow',
    accepted: 'badge-green',
    in_progress: 'badge-green',
    completed: 'badge-green',
    cancelled: 'badge-red',
  };

  const statusLabels: Record<string, string> = {
    requested: 'Looking for driver…',
    accepted: 'Driver on the way',
    in_progress: 'Ride in progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex justify-between items-center">
          <span className="text-xl font-bold text-brand-600">FairRide</span>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 hidden sm:inline">{user?.name}</span>
            <button onClick={() => { logout(); navigate('/'); }} className="text-sm text-gray-400 hover:text-gray-600">Sign out</button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {notification && (
          <div className="bg-brand-50 border border-brand-200 text-brand-700 px-4 py-3 rounded-lg flex justify-between">
            <span>{notification}</span>
            <button onClick={() => setNotification('')} className="text-brand-400 ml-2">×</button>
          </div>
        )}

        {/* Active ride card */}
        {activeRide && (
          <div className="card border-l-4 border-brand-500">
            <div className="flex justify-between items-start mb-3">
              <h2 className="font-bold text-lg">Active Ride</h2>
              <span className={statusColors[activeRide.status]}>{statusLabels[activeRide.status]}</span>
            </div>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex gap-2">
                <span className="w-4 h-4 mt-0.5 rounded-full bg-brand-500 flex-shrink-0"></span>
                <span className="text-gray-700">{activeRide.pickup_address}</span>
              </div>
              <div className="flex gap-2">
                <span className="w-4 h-4 mt-0.5 rounded-full bg-gray-800 flex-shrink-0"></span>
                <span className="text-gray-700">{activeRide.dropoff_address}</span>
              </div>
            </div>
            <FareBreakdown fare={{
              distanceMiles: activeRide.distance_miles,
              durationMinutes: activeRide.duration_minutes,
              baseFare: activeRide.base_fare,
              distanceFare: parseFloat((activeRide.distance_miles * 1.5).toFixed(2)),
              timeFare: parseFloat((activeRide.duration_minutes * 0.25).toFixed(2)),
              subtotal: activeRide.total_fare,
              surgeMultiplier: activeRide.surge_multiplier,
              totalFare: activeRide.total_fare,
              driverEarnings: activeRide.driver_earnings,
              platformFee: activeRide.platform_fee,
              uberDriverWouldEarn: parseFloat((activeRide.total_fare * 0.75).toFixed(2)),
              driverSavings: parseFloat((activeRide.driver_earnings - activeRide.total_fare * 0.75).toFixed(2)),
            }} />
            {activeRide.driver_name && (
              <div className="mt-3 pt-3 border-t text-sm text-gray-600">
                Driver: <strong>{activeRide.driver_name}</strong>
                {activeRide.vehicle_make && (
                  <span className="ml-2 text-gray-400">
                    · {activeRide.vehicle_year} {activeRide.vehicle_make} {activeRide.vehicle_model}
                    {activeRide.license_plate && ` · ${activeRide.license_plate}`}
                  </span>
                )}
              </div>
            )}
            {activeRide.status === 'requested' || activeRide.status === 'accepted' ? (
              <button onClick={cancelRide} className="btn-danger mt-4 text-sm py-2">Cancel ride</button>
            ) : null}
          </div>
        )}

        {/* Tabs */}
        {!activeRide && (
          <>
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setTab('book')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  tab === 'book' ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500'
                }`}
              >Book a ride</button>
              <button
                onClick={() => setTab('history')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  tab === 'history' ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500'
                }`}
              >Ride history</button>
            </div>

            {tab === 'book' && (
              <div className="card space-y-4">
                <h2 className="font-bold">Where to?</h2>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pickup location</label>
                    <input
                      className="input"
                      placeholder="123 Main St, San Francisco"
                      value={pickup}
                      onChange={e => { setPickup(e.target.value); setEstimate(null); }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dropoff location</label>
                    <input
                      className="input"
                      placeholder="456 Market St, San Francisco"
                      value={dropoff}
                      onChange={e => { setDropoff(e.target.value); setEstimate(null); }}
                    />
                  </div>
                  <button
                    onClick={getEstimate}
                    disabled={!pickup || !dropoff || estimating}
                    className="btn-secondary w-full"
                  >
                    {estimating ? 'Calculating…' : 'Get fare estimate'}
                  </button>
                </div>

                {estimate && (
                  <div className="border-t pt-4">
                    <FareBreakdown fare={estimate} />
                    <button
                      onClick={requestRide}
                      disabled={requesting}
                      className="btn-primary w-full mt-4"
                    >
                      {requesting ? 'Requesting…' : `Request ride · $${estimate.totalFare.toFixed(2)}`}
                    </button>
                  </div>
                )}
              </div>
            )}

            {tab === 'history' && (
              <div className="space-y-3">
                {history.length === 0 ? (
                  <div className="card text-center text-gray-400 py-10">No completed rides yet</div>
                ) : history.map(ride => (
                  <div key={ride.id} className="card">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-sm text-gray-500">{new Date(ride.completed_at!).toLocaleDateString()}</div>
                      <span className="font-semibold">${ride.total_fare.toFixed(2)}</span>
                    </div>
                    <div className="text-sm space-y-1">
                      <div className="flex gap-2">
                        <span className="text-brand-500">●</span>
                        <span className="text-gray-700 truncate">{ride.pickup_address}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-gray-800">●</span>
                        <span className="text-gray-700 truncate">{ride.dropoff_address}</span>
                      </div>
                    </div>
                    {ride.driver_name && (
                      <div className="mt-2 text-xs text-gray-400">Driver: {ride.driver_name}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
