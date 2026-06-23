export interface User {
  id: number;
  email: string;
  name: string;
  role: 'rider' | 'driver';
  phone?: string;
}

export interface Driver {
  id: number;
  user_id: number;
  name: string;
  email: string;
  phone?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  license_plate?: string;
  is_online: boolean;
  rating: number;
  total_rides: number;
  total_earnings: number;
}

export type RideStatus = 'requested' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';

export interface Ride {
  id: number;
  rider_id: number;
  driver_id?: number;
  pickup_address: string;
  dropoff_address: string;
  status: RideStatus;
  distance_miles: number;
  duration_minutes: number;
  base_fare: number;
  total_fare: number;
  driver_earnings: number;
  platform_fee: number;
  surge_multiplier: number;
  driver_name?: string;
  driver_phone?: string;
  driver_rating?: number;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  license_plate?: string;
  rider_name?: string;
  rider_phone?: string;
  created_at: string;
  accepted_at?: string;
  started_at?: string;
  completed_at?: string;
}

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

export interface Earnings {
  total: { earnings: number; rides: number };
  today: { earnings: number; rides: number };
  thisWeek: { earnings: number; rides: number };
  thisMonth: { earnings: number; rides: number };
  savedVsUber: number;
}
