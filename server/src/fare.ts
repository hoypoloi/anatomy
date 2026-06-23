export const FARE_CONFIG = {
  BASE_FARE: 2.50,
  PER_MILE_RATE: 1.50,
  PER_MINUTE_RATE: 0.25,
  MIN_FARE: 5.00,
  DRIVER_SHARE: 0.90,   // Drivers keep 90%
  PLATFORM_SHARE: 0.10, // Platform takes 10%
  // Uber comparison: ~75% driver / ~25% platform
  UBER_DRIVER_SHARE: 0.75,
};

export interface FareEstimate {
  distanceMiles: number;
  durationMinutes: number;
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  subtotal: number;
  surgeMultiplier: number;
  totalFare: number;
  driverEarnings: number;
  platformFee: number;
  uberDriverWouldEarn: number;
  driverSavings: number;
}

export function calculateFare(
  distanceMiles: number,
  durationMinutes: number,
  surgeMultiplier = 1.0
): FareEstimate {
  const baseFare = FARE_CONFIG.BASE_FARE;
  const distanceFare = distanceMiles * FARE_CONFIG.PER_MILE_RATE;
  const timeFare = durationMinutes * FARE_CONFIG.PER_MINUTE_RATE;
  const subtotal = baseFare + distanceFare + timeFare;
  const totalFare = Math.max(
    FARE_CONFIG.MIN_FARE,
    parseFloat((subtotal * surgeMultiplier).toFixed(2))
  );
  const driverEarnings = parseFloat((totalFare * FARE_CONFIG.DRIVER_SHARE).toFixed(2));
  const platformFee = parseFloat((totalFare * FARE_CONFIG.PLATFORM_SHARE).toFixed(2));
  const uberDriverWouldEarn = parseFloat((totalFare * FARE_CONFIG.UBER_DRIVER_SHARE).toFixed(2));
  const driverSavings = parseFloat((driverEarnings - uberDriverWouldEarn).toFixed(2));

  return {
    distanceMiles,
    durationMinutes,
    baseFare,
    distanceFare: parseFloat(distanceFare.toFixed(2)),
    timeFare: parseFloat(timeFare.toFixed(2)),
    subtotal: parseFloat(subtotal.toFixed(2)),
    surgeMultiplier,
    totalFare,
    driverEarnings,
    platformFee,
    uberDriverWouldEarn,
    driverSavings,
  };
}

// Simulate realistic distance/duration from address strings
export function estimateRideParams(pickup: string, dropoff: string) {
  const seed = [...pickup, ...dropoff].reduce((a, c) => a + c.charCodeAt(0), 0);
  const distanceMiles = parseFloat((2 + (seed % 180) / 10).toFixed(1)); // 2–20 miles
  const speedMph = 18 + (seed % 12); // 18–30 mph (city traffic)
  const durationMinutes = parseFloat(((distanceMiles / speedMph) * 60).toFixed(0));
  return { distanceMiles, durationMinutes };
}
