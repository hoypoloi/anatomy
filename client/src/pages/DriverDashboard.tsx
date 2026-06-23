import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import socket from '../socket';
import { useAuth } from '../context/AuthContext';
import { Driver, Ride, Earnings } from '../types';

interface PendingRide {
  rideId: number;
  pickupAddress: string;
  dropoffAddress: string;
  totalFare: number;
  driverEarnings: number;
}

export default function DriverDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [pendingRides, setPendingRides] = useState<PendingRide[]>([]);
  const [history, setHistory] = useState<Ride[]>([]);
  const [tab, setTab] = useState<'dashboard' | 'history'>('dashboard');
  const [toggling, setToggling] = useState(false);
  const [notification, setNotification] = useState('');

  useEffect(() => {
    loadDriver();
    loadEarnings();
    loadActiveRide();
    loadHistory();
  }, []);

  useEffect(() => {
    socket.on('ride:new', (ride: PendingRide) => {
      setPendingRides(prev => {
        if (prev.some(r => r.rideId === ride.rideId)) return prev;
        return [ride, ...prev];
      });
    });
    socket.on('ride:taken', ({ rideId }: { rideId: number }) => {
      setPendingRides(prev => prev.filter(r => r.rideId !== rideId));
    });
    socket.on('ride:cancelled', () => {
      setNotification('Rider cancelled the ride.');
      setActiveRide(null);
      loadPendingFromServer();
    });
    return () => {
      socket.off('ride:new');
      socket.off('ride:taken');
      socket.off('ride:cancelled');
    };
  }, []);

  async function loadDriver() {
    const res = await api.get('/drivers/me');
    setDriver(res.data);
  }

  async function loadEarnings() {
    const res = await api.get('/drivers/earnings');
    setEarnings(res.data);
  }

  async function loadActiveRide() {
    const res = await api.get('/rides/active');
    setActiveRide(res.data);
    if (!res.data) loadPendingFromServer();
  }

  async function loadPendingFromServer() {
    const res = await api.get('/rides/pending');
    setPendingRides(res.data.map((r: Ride) => ({
      rideId: r.id,
      pickupAddress: r.pickup_address,
      dropoffAddress: r.dropoff_address,
      totalFare: r.total_fare,
      driverEarnings: r.driver_earnings,
    })));
  }

  async function loadHistory() {
    const res = await api.get('/rides/history');
    setHistory(res.data);
  }

  async function toggleOnline() {
    if (!driver) return;
    setToggling(true);
    try {
      const isOnline = !driver.is_online;
      await api.put('/drivers/status', { isOnline });
      setDriver({ ...driver, is_online: isOnline });
      if (isOnline) loadPendingFromServer();
      else setPendingRides([]);
    } finally {
      setToggling(false);
    }
  }

  async function acceptRide(rideId: number) {
    try {
      const res = await api.put(`/rides/${rideId}/accept`);
      setActiveRide(res.data);
      setPendingRides([]);
      const riderId = res.data.rider_id;
      socket.emit('ride:accepted', { rideId, driverName: user!.name, riderId });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setNotification(e.response?.data?.error || 'Failed to accept ride');
      setPendingRides(prev => prev.filter(r => r.rideId !== rideId));
    }
  }

  async function startRide() {
    if (!activeRide) return;
    await api.put(`/rides/${activeRide.id}/start`);
    setActiveRide({ ...activeRide, status: 'in_progress' });
    socket.emit('ride:started', { riderId: activeRide.rider_id });
  }

  async function completeRide() {
    if (!activeRide) return;
    const res = await api.put(`/rides/${activeRide.id}/complete`);
    socket.emit('ride:completed', {
      riderId: activeRide.rider_id,
      driverEarnings: activeRide.driver_earnings,
    });
    setNotification(`Ride complete! You earned $${activeRide.driver_earnings.toFixed(2)}`);
    setActiveRide(null);
    loadEarnings();
    loadHistory();
    loadDriver();
    if (driver?.is_online) loadPendingFromServer();
  }

  async function cancelRide() {
    if (!activeRide) return;
    await api.put(`/rides/${activeRide.id}/cancel`);
    setActiveRide(null);
    socket.emit('ride:cancelled', { riderId: activeRide.rider_id });
    setNotification('You cancelled the ride.');
    if (driver?.is_online) loadPendingFromServer();
  }

  const fmt = (n: number) => `$${n.toFixed(2)}`;

  const statusLabels: Record<string, string> = {
    requested: 'Pending',
    accepted: 'Heading to pickup',
    in_progress: 'Ride in progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };

  return (
    <div className="min-h-screen bg-gray-50">
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

        {/* Online toggle */}
        <div className="card flex items-center justify-between">
          <div>
            <div className="font-semibold">{driver?.is_online ? 'You\'re online' : 'You\'re offline'}</div>
            <div className="text-sm text-gray-500">
              {driver?.is_online ? 'Accepting ride requests' : 'Toggle to start earning'}
            </div>
          </div>
          <button
            onClick={toggleOnline}
            disabled={toggling || !!activeRide}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
              driver?.is_online ? 'bg-brand-500' : 'bg-gray-300'
            } disabled:opacity-60`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
              driver?.is_online ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setTab('dashboard')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'dashboard' ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500'
            }`}
          >Dashboard</button>
          <button
            onClick={() => setTab('history')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'history' ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500'
            }`}
          >Ride history</button>
        </div>

        {tab === 'dashboard' && (
          <>
            {/* Earnings summary */}
            {earnings && (
              <div className="grid grid-cols-2 gap-3">
                <div className="card text-center">
                  <div className="text-2xl font-bold text-brand-600">{fmt(earnings.today.earnings)}</div>
                  <div className="text-xs text-gray-500 mt-1">Today · {earnings.today.rides} rides</div>
                </div>
                <div className="card text-center">
                  <div className="text-2xl font-bold text-brand-600">{fmt(earnings.thisWeek.earnings)}</div>
                  <div className="text-xs text-gray-500 mt-1">This week · {earnings.thisWeek.rides} rides</div>
                </div>
                <div className="card text-center col-span-2">
                  <div className="text-sm text-gray-500 mb-1">Total all-time earnings</div>
                  <div className="text-3xl font-bold text-brand-600">{fmt(earnings.total.earnings)}</div>
                  <div className="text-xs text-gray-400 mt-1">{earnings.total.rides} rides completed</div>
                  {earnings.savedVsUber > 0 && (
                    <div className="mt-2 text-xs font-medium text-brand-600 bg-brand-50 rounded px-2 py-1 inline-block">
                      +{fmt(earnings.savedVsUber)} more than you'd earn driving for Uber
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Active ride */}
            {activeRide && (
              <div className="card border-l-4 border-brand-500">
                <div className="flex justify-between items-start mb-3">
                  <h2 className="font-bold text-lg">Current ride</h2>
                  <span className="badge-green">{statusLabels[activeRide.status]}</span>
                </div>
                <div className="space-y-2 text-sm mb-3">
                  <div className="flex gap-2">
                    <span className="text-brand-500">●</span>
                    <span>{activeRide.pickup_address}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-gray-800">●</span>
                    <span>{activeRide.dropoff_address}</span>
                  </div>
                </div>
                <div className="flex justify-between text-sm mb-3">
                  <span className="text-gray-500">Rider</span>
                  <span className="font-medium">{activeRide.rider_name}</span>
                </div>
                <div className="flex justify-between items-center text-sm bg-brand-50 rounded-lg p-3">
                  <span className="text-brand-700 font-medium">Your earnings (90%)</span>
                  <span className="text-xl font-bold text-brand-600">{fmt(activeRide.driver_earnings)}</span>
                </div>
                <div className="flex gap-2 mt-4">
                  {activeRide.status === 'accepted' && (
                    <button onClick={startRide} className="btn-primary flex-1 text-sm py-2">
                      Arrived at pickup — Start ride
                    </button>
                  )}
                  {activeRide.status === 'in_progress' && (
                    <button onClick={completeRide} className="btn-primary flex-1 text-sm py-2">
                      Complete ride
                    </button>
                  )}
                  {(activeRide.status === 'accepted') && (
                    <button onClick={cancelRide} className="btn-danger text-sm py-2 px-4">Cancel</button>
                  )}
                </div>
              </div>
            )}

            {/* Pending rides */}
            {!activeRide && driver?.is_online && (
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">
                  Available rides {pendingRides.length > 0 && `(${pendingRides.length})`}
                </h3>
                {pendingRides.length === 0 ? (
                  <div className="card text-center text-gray-400 py-8">
                    <div className="text-2xl mb-2">🔍</div>
                    Waiting for ride requests…
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingRides.map(ride => (
                      <div key={ride.rideId} className="card">
                        <div className="space-y-2 text-sm mb-3">
                          <div className="flex gap-2">
                            <span className="text-brand-500">●</span>
                            <span className="text-gray-700">{ride.pickupAddress}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-gray-800">●</span>
                            <span className="text-gray-700">{ride.dropoffAddress}</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center mb-3">
                          <div>
                            <div className="text-xs text-gray-400">Total fare</div>
                            <div className="font-semibold">{fmt(ride.totalFare)}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-brand-600 font-medium">You earn (90%)</div>
                            <div className="text-xl font-bold text-brand-600">{fmt(ride.driverEarnings)}</div>
                          </div>
                        </div>
                        <button onClick={() => acceptRide(ride.rideId)} className="btn-primary w-full text-sm py-2">
                          Accept ride
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!activeRide && !driver?.is_online && (
              <div className="card text-center text-gray-400 py-10">
                <div className="text-3xl mb-2">🚗</div>
                <p>Go online to start accepting rides</p>
                <p className="text-sm mt-1">You'll keep 90% of every fare</p>
              </div>
            )}
          </>
        )}

        {tab === 'history' && (
          <div className="space-y-3">
            {history.length === 0 ? (
              <div className="card text-center text-gray-400 py-10">No completed rides yet</div>
            ) : history.map(ride => (
              <div key={ride.id} className="card">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-sm text-gray-500">{new Date(ride.completed_at!).toLocaleDateString()}</div>
                  <div className="text-right">
                    <div className="font-bold text-brand-600">{fmt(ride.driver_earnings)}</div>
                    <div className="text-xs text-gray-400">of {fmt(ride.total_fare)}</div>
                  </div>
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
                {ride.rider_name && (
                  <div className="mt-2 text-xs text-gray-400">Rider: {ride.rider_name}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
