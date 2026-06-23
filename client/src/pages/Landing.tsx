import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <span className="text-2xl font-bold text-brand-600">FairRide</span>
          <div className="flex gap-3">
            <Link to="/login" className="btn-secondary text-sm">Sign in</Link>
            <Link to="/register" className="btn-primary text-sm">Get started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
          <span>🚗</span> Drivers keep <strong>90%</strong> of every fare
        </div>
        <h1 className="text-5xl font-extrabold text-gray-900 leading-tight mb-4">
          Ride-sharing that's<br />
          <span className="text-brand-600">fair for everyone</span>
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10">
          FairRide gives drivers the majority of every fare — not a token cut.
          Same great ride experience, better economics for the people doing the work.
        </p>
        <div className="flex justify-center gap-4 flex-wrap">
          <Link to="/register" className="btn-primary text-base px-8 py-3">Request a ride</Link>
          <Link to="/register?role=driver" className="btn-secondary text-base px-8 py-3">Drive with us</Link>
        </div>
      </section>

      {/* Commission Comparison */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-10">See the difference</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card border-2 border-brand-500">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-brand-600">FairRide</h3>
                <span className="badge-green">Our platform</span>
              </div>
              <div className="mb-4">
                <div className="text-4xl font-extrabold text-brand-600 mb-1">90%</div>
                <div className="text-gray-600">goes to the driver</div>
              </div>
              <div className="bg-brand-50 rounded-lg p-3 text-sm">
                <div className="flex justify-between mb-1">
                  <span className="text-gray-600">$20 fare example</span>
                </div>
                <div className="flex justify-between font-semibold text-brand-700">
                  <span>Driver earns</span><span>$18.00</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Platform fee</span><span>$2.00</span>
                </div>
              </div>
            </div>

            <div className="card opacity-75">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-700">Typical Competitor</h3>
                <span className="badge-red">Industry average</span>
              </div>
              <div className="mb-4">
                <div className="text-4xl font-extrabold text-gray-700 mb-1">~75%</div>
                <div className="text-gray-600">goes to the driver</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <div className="flex justify-between mb-1">
                  <span className="text-gray-600">Same $20 fare</span>
                </div>
                <div className="flex justify-between font-semibold text-gray-700">
                  <span>Driver earns</span><span>$15.00</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Platform fee</span><span>$5.00</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-brand-50 rounded-xl text-center">
            <p className="text-brand-700 font-semibold">
              On 200 rides per month, a FairRide driver earns <strong>$600 more</strong> than on competing platforms
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">How it works</h2>
        <div className="grid md:grid-cols-2 gap-12">
          <div>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center text-sm font-bold">R</span>
              For Riders
            </h3>
            <ol className="space-y-3 text-gray-600">
              <li className="flex gap-3"><span className="text-brand-600 font-bold">1.</span> Enter your pickup and dropoff locations</li>
              <li className="flex gap-3"><span className="text-brand-600 font-bold">2.</span> See the fare estimate with full transparency</li>
              <li className="flex gap-3"><span className="text-brand-600 font-bold">3.</span> Request your ride — drivers nearby will see it</li>
              <li className="flex gap-3"><span className="text-brand-600 font-bold">4.</span> Get picked up and enjoy the ride</li>
            </ol>
          </div>
          <div>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center text-sm font-bold">D</span>
              For Drivers
            </h3>
            <ol className="space-y-3 text-gray-600">
              <li className="flex gap-3"><span className="text-brand-600 font-bold">1.</span> Create your driver account and add your vehicle</li>
              <li className="flex gap-3"><span className="text-brand-600 font-bold">2.</span> Go online when you're ready to drive</li>
              <li className="flex gap-3"><span className="text-brand-600 font-bold">3.</span> Accept ride requests in real-time</li>
              <li className="flex gap-3"><span className="text-brand-600 font-bold">4.</span> <strong>Keep 90%</strong> of every fare, every time</li>
            </ol>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 text-center text-gray-400 text-sm">
        <p>FairRide — Ride-sharing built on fairness. Drivers keep 90% of every fare.</p>
      </footer>
    </div>
  );
}
