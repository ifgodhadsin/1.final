export type VehicleStatus = "available" | "on_trip" | "in_shop" | "retired";
export type DriverStatus = "available" | "on_trip" | "off_duty" | "suspended";
export type TripStatus = "draft" | "dispatched" | "in_progress" | "completed" | "cancelled";
export type AlertSeverity = "low" | "medium" | "high" | "critical";

export interface Vehicle {
  id: string;
  registration_number: string;
  vehicle_name: string;
  vehicle_type: string;
  max_load_capacity: number;
  current_odometer: number;
  acquisition_cost: number;
  status: VehicleStatus;
  year: number;
  make: string;
  model: string;
  vin: string;
  fuel_type: string;
}

export interface Driver {
  id: string;
  name: string;
  license_number: string;
  license_category: string;
  license_expiry: string;
  safety_score: number;
  status: DriverStatus;
  years_experience: number;
}

export interface Trip {
  id: string;
  trip_number: string;
  vehicle_id: string;
  driver_id: string;
  cargo_weight: number;
  source: string;
  destination: string;
  planned_distance: number;
  actual_distance: number;
  status: TripStatus;
  started_at?: string;
  completed_at?: string;
  estimated_duration: number;
  actual_duration: number;
  revenue: number;
}

export interface FuelLog {
  id: string;
  vehicle_id: string;
  liters: number;
  cost_per_liter: number;
  total_cost: number;
  odometer_reading: number;
  fuel_station: string;
  is_fraud_suspected: boolean;
  fraud_confidence: number;
  fraud_reason: string;
  logged_at: string;
}

export interface FleetKPIs {
  utilization_rate: number;
  on_time_delivery: number;
  fuel_efficiency: number;
  cost_per_mile: number;
  fleet_roi: number;
  fraud_alerts: number;
  avg_safety_score: number;
  total_vehicles: number;
  active_vehicles: number;
  on_trip_vehicles: number;
  total_trips: number;
  completed_trips: number;
  total_revenue: number;
  total_fuel_cost: number;
}

export interface FraudAnalysis {
  is_suspected: boolean;
  confidence_score: number;
  anomalies: string[];
  risk_level: string;
  ai_reasoning: string;
}
