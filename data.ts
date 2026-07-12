"use server"

import { prisma } from "./prisma"
import { Vehicle, Driver, Trip, FuelLog, FleetKPIs, FraudAnalysis } from "@/types"

// ==================== VEHICLE OPERATIONS ====================
export async function getVehicles(): Promise<Vehicle[]> {
  const vehicles = await prisma.vehicle.findMany({
    orderBy: { created_at: "desc" },
  })
  return vehicles.map(v => ({
    ...v,
    max_load_capacity: Number(v.max_load_capacity),
    current_odometer: Number(v.current_odometer),
    acquisition_cost: Number(v.acquisition_cost),
  }))
}

export async function getVehicleById(id: string): Promise<Vehicle | null> {
  const v = await prisma.vehicle.findUnique({ where: { id } })
  if (!v) return null
  return {
    ...v,
    max_load_capacity: Number(v.max_load_capacity),
    current_odometer: Number(v.current_odometer),
    acquisition_cost: Number(v.acquisition_cost),
  }
}

export async function updateVehicleStatus(id: string, status: string): Promise<Vehicle | null> {
  const v = await prisma.vehicle.update({
    where: { id },
    data: { status },
  })
  return {
    ...v,
    max_load_capacity: Number(v.max_load_capacity),
    current_odometer: Number(v.current_odometer),
    acquisition_cost: Number(v.acquisition_cost),
  }
}

// ==================== DRIVER OPERATIONS ====================
export async function getDrivers(): Promise<Driver[]> {
  const drivers = await prisma.driver.findMany({
    include: { user: true },
    orderBy: { created_at: "desc" },
  })
  return drivers.map(d => ({
    id: d.id,
    name: d.user.full_name,
    license_number: d.license_number,
    license_category: d.license_category,
    license_expiry: d.license_expiry.toISOString().split("T")[0],
    safety_score: Number(d.safety_score),
    status: d.status,
    years_experience: d.years_experience,
  }))
}

export async function getDriverById(id: string): Promise<Driver | null> {
  const d = await prisma.driver.findUnique({
    where: { id },
    include: { user: true },
  })
  if (!d) return null
  return {
    id: d.id,
    name: d.user.full_name,
    license_number: d.license_number,
    license_category: d.license_category,
    license_expiry: d.license_expiry.toISOString().split("T")[0],
    safety_score: Number(d.safety_score),
    status: d.status,
    years_experience: d.years_experience,
  }
}

export async function updateDriverStatus(id: string, status: string): Promise<Driver | null> {
  const d = await prisma.driver.update({
    where: { id },
    data: { status },
    include: { user: true },
  })
  return {
    id: d.id,
    name: d.user.full_name,
    license_number: d.license_number,
    license_category: d.license_category,
    license_expiry: d.license_expiry.toISOString().split("T")[0],
    safety_score: Number(d.safety_score),
    status: d.status,
    years_experience: d.years_experience,
  }
}

// ==================== TRIP OPERATIONS ====================
export async function getTrips(): Promise<Trip[]> {
  const trips = await prisma.trip.findMany({
    include: { vehicle: true, driver: { include: { user: true } } },
    orderBy: { created_at: "desc" },
  })
  return trips.map(t => ({
    id: t.id,
    trip_number: t.trip_number,
    vehicle_id: t.vehicle_id,
    driver_id: t.driver_id,
    cargo_weight: Number(t.cargo_weight),
    source: t.source,
    destination: t.destination,
    planned_distance: Number(t.planned_distance),
    actual_distance: Number(t.actual_distance),
    status: t.status,
    started_at: t.started_at?.toISOString(),
    completed_at: t.completed_at?.toISOString(),
    estimated_duration: t.estimated_duration,
    actual_duration: t.actual_duration,
    revenue: Number(t.revenue),
  }))
}

export async function createTrip(data: {
  vehicle_id: string
  driver_id: string
  cargo_weight: number
  destination: string
  source?: string
  planned_distance?: number
  estimated_duration?: number
}): Promise<{ trip: Trip | null; errors: string[] }> {
  const errors: string[] = []

  const vehicle = await prisma.vehicle.findUnique({ where: { id: data.vehicle_id } })
  const driver = await prisma.driver.findUnique({
    where: { id: data.driver_id },
    include: { user: true },
  })

  if (!vehicle) errors.push("Vehicle not found")
  if (!driver) errors.push("Driver not found")

  if (vehicle) {
    if (vehicle.status === "retired") errors.push(`Vehicle ${vehicle.registration_number} is retired`)
    if (vehicle.status === "in_shop") errors.push(`Vehicle ${vehicle.registration_number} is in shop`)
    if (vehicle.status === "on_trip") errors.push(`Vehicle ${vehicle.registration_number} is already on a trip`)
    if (data.cargo_weight > Number(vehicle.max_load_capacity)) {
      errors.push(`Cargo ${data.cargo_weight}kg exceeds capacity ${vehicle.max_load_capacity}kg`)
    }
  }

  if (driver) {
    if (driver.status === "suspended") errors.push(`Driver ${driver.user.full_name} is suspended`)
    if (driver.status === "on_trip") errors.push(`Driver ${driver.user.full_name} is already on a trip`)
    if (driver.license_expiry < new Date()) {
      errors.push(`Driver ${driver.user.full_name}'s license expired on ${driver.license_expiry.toISOString().split("T")[0]}`)
    }
  }

  if (errors.length > 0) return { trip: null, errors }

  // Generate trip number
  const tripCount = await prisma.trip.count()
  const tripNumber = `TRIP-2026-${String(tripCount + 1).padStart(3, "0")}`

  const trip = await prisma.trip.create({
    data: {
      org_id: vehicle!.org_id,
      vehicle_id: data.vehicle_id,
      driver_id: data.driver_id,
      trip_number: tripNumber,
      source: data.source || "Warehouse A - Chicago",
      destination: data.destination,
      cargo_weight: data.cargo_weight,
      planned_distance: data.planned_distance || 150,
      status: "dispatched",
      started_at: new Date(),
      estimated_duration: data.estimated_duration || 180,
      revenue: Math.round(data.cargo_weight * 0.3 + 50),
    },
  })

  // Side effects: update vehicle and driver status
  await prisma.vehicle.update({ where: { id: data.vehicle_id }, data: { status: "on_trip" } })
  await prisma.driver.update({ where: { id: data.driver_id }, data: { status: "on_trip" } })

  // Create alert
  await prisma.alert.create({
    data: {
      org_id: vehicle!.org_id,
      vehicle_id: data.vehicle_id,
      driver_id: data.driver_id,
      alert_type: "trip_dispatched",
      severity: "low",
      title: `Trip ${tripNumber} dispatched`,
      description: `${vehicle!.registration_number} + ${driver!.user.full_name} → ${data.destination}`,
    },
  })

  return {
    trip: {
      id: trip.id,
      trip_number: trip.trip_number,
      vehicle_id: trip.vehicle_id,
      driver_id: trip.driver_id,
      cargo_weight: Number(trip.cargo_weight),
      source: trip.source,
      destination: trip.destination,
      planned_distance: Number(trip.planned_distance),
      actual_distance: Number(trip.actual_distance),
      status: trip.status,
      started_at: trip.started_at?.toISOString(),
      completed_at: trip.completed_at?.toISOString(),
      estimated_duration: trip.estimated_duration,
      actual_duration: trip.actual_duration,
      revenue: Number(trip.revenue),
    },
    errors: [],
  }
}

export async function updateTripStatus(
  id: string,
  status: string
): Promise<{ trip: Trip | null; errors: string[] }> {
  const trip = await prisma.trip.findUnique({
    where: { id },
    include: { vehicle: true, driver: { include: { user: true } } },
  })

  if (!trip) return { trip: null, errors: ["Trip not found"] }

  const validTransitions: Record<string, string[]> = {
    draft: ["dispatched", "cancelled"],
    dispatched: ["in_progress", "cancelled"],
    in_progress: ["completed", "cancelled"],
    completed: [],
    cancelled: [],
  }

  if (!validTransitions[trip.status]?.includes(status)) {
    return { trip: null, errors: [`Cannot transition from ${trip.status} to ${status}`] }
  }

  const updateData: any = { status }

  if (status === "in_progress") {
    // No additional data needed
  } else if (status === "completed") {
    updateData.completed_at = new Date()
    updateData.actual_distance = Number(trip.planned_distance) + Math.round(Math.random() * 20 - 10)
    updateData.actual_duration = trip.estimated_duration + Math.round(Math.random() * 30 - 15)
  }

  const updated = await prisma.trip.update({
    where: { id },
    data: updateData,
  })

  // Side effects for completed or cancelled
  if (status === "completed" || status === "cancelled") {
    await prisma.vehicle.update({ where: { id: trip.vehicle_id }, data: { status: "available" } })
    await prisma.driver.update({ where: { id: trip.driver_id }, data: { status: "available" } })

    if (status === "completed") {
      await prisma.vehicle.update({
        where: { id: trip.vehicle_id },
        data: { current_odometer: { increment: Number(updateData.actual_distance) || 0 } },
      })
    }
  }

  return {
    trip: {
      id: updated.id,
      trip_number: updated.trip_number,
      vehicle_id: updated.vehicle_id,
      driver_id: updated.driver_id,
      cargo_weight: Number(updated.cargo_weight),
      source: updated.source,
      destination: updated.destination,
      planned_distance: Number(updated.planned_distance),
      actual_distance: Number(updated.actual_distance),
      status: updated.status,
      started_at: updated.started_at?.toISOString(),
      completed_at: updated.completed_at?.toISOString(),
      estimated_duration: updated.estimated_duration,
      actual_duration: updated.actual_duration,
      revenue: Number(updated.revenue),
    },
    errors: [],
  }
}

// ==================== FUEL FRAUD DETECTION ====================
export async function analyzeFuelFraud(data: {
  vehicle_id: string
  liters: number
  cost_per_liter: number
  total_cost: number
  odometer_reading: number
  fuel_station?: string
}): Promise<{ analysis: FraudAnalysis; log: FuelLog }> {
  const vehicle = await prisma.vehicle.findUnique({ where: { id: data.vehicle_id } })
  const anomalies: string[] = []
  let score = 0

  if (data.cost_per_liter < 0.8) anomalies.push(`Suspiciously low price: $${data.cost_per_liter}/L`)
  if (data.cost_per_liter > 2.5) anomalies.push(`Suspiciously high price: $${data.cost_per_liter}/L`)

  const expectedCost = data.liters * data.cost_per_liter
  if (Math.abs(data.total_cost - expectedCost) > 1) {
    anomalies.push(`Cost mismatch: expected $${expectedCost.toFixed(2)}, got $${data.total_cost.toFixed(2)}`)
  }

  if (data.liters > 500) anomalies.push(`Excessive fuel: ${data.liters}L exceeds max tank capacity (500L)`)

  const history = await prisma.fuelLog.findMany({
    where: { vehicle_id: data.vehicle_id },
    orderBy: { logged_at: "desc" },
    take: 10,
  })

  if (history.length > 0) {
    const last = history[0]
    if (data.odometer_reading < Number(last.odometer_reading)) {
      anomalies.push(`Odometer rollback: ${data.odometer_reading} < previous ${last.odometer_reading}`)
    }
    const recent = history.filter(h => {
      const diff = new Date().getTime() - h.logged_at.getTime()
      return diff < 86400000
    })
    if (recent.length >= 2) anomalies.push(`Too many fillups: ${recent.length + 1} in 24 hours`)
  }

  score = Math.min(anomalies.length * 25, 100)
  if (Math.abs(data.total_cost - expectedCost) > 100) score += 20
  score = Math.min(score, 100)

  const riskLevel = score >= 80 ? "critical" : score >= 60 ? "high" : score >= 40 ? "medium" : "low"

  const analysis: FraudAnalysis = {
    is_suspected: score >= 50 || anomalies.length >= 2,
    confidence_score: score,
    anomalies,
    risk_level: riskLevel,
    ai_reasoning: anomalies.length
      ? `Fraud suspicion: ${score}% confidence. ${anomalies.slice(0, 3).join("; ")}${anomalies.length > 3 ? ` and ${anomalies.length - 3} more.` : ""}`
      : `No fraud indicators detected. Transaction appears normal for ${vehicle?.vehicle_name || "vehicle"}.`,
  }

  const log = await prisma.fuelLog.create({
    data: {
      vehicle_id: data.vehicle_id,
      org_id: vehicle?.org_id || "",
      liters: data.liters,
      cost_per_liter: data.cost_per_liter,
      total_cost: data.total_cost,
      odometer_reading: data.odometer_reading,
      fuel_station: data.fuel_station || "Unknown Station",
      is_fraud_suspected: analysis.is_suspected,
      fraud_reason: analysis.ai_reasoning,
      ai_confidence_score: score,
    },
  })

  if (analysis.is_suspected) {
    await prisma.alert.create({
      data: {
        org_id: vehicle?.org_id || "",
        vehicle_id: data.vehicle_id,
        alert_type: "fuel_fraud",
        severity: riskLevel === "critical" ? "critical" : riskLevel === "high" ? "high" : "medium",
        title: `Fuel Fraud Alert: ${vehicle?.registration_number}`,
        description: analysis.ai_reasoning,
      },
    })
  }

  return {
    analysis,
    log: {
      id: log.id,
      vehicle_id: log.vehicle_id,
      liters: Number(log.liters),
      cost_per_liter: Number(log.cost_per_liter),
      total_cost: Number(log.total_cost),
      odometer_reading: Number(log.odometer_reading),
      fuel_station: log.fuel_station,
      is_fraud_suspected: log.is_fraud_suspected,
      fraud_confidence: Number(log.ai_confidence_score),
      fraud_reason: log.fraud_reason,
      logged_at: log.logged_at.toISOString(),
    },
  }
}

// ==================== KPI CALCULATION ====================
export async function getKPIs(): Promise<FleetKPIs> {
  const [
    vehicles,
    drivers,
    trips,
    fuelLogs,
    expenses,
  ] = await Promise.all([
    prisma.vehicle.findMany(),
    prisma.driver.findMany(),
    prisma.trip.findMany(),
    prisma.fuelLog.findMany(),
    prisma.expense.findMany(),
  ])

  const completedTrips = trips.filter(t => t.status === "completed")
  const onTimeTrips = completedTrips.filter(t => {
    if (!t.actual_duration || !t.estimated_duration) return true
    return t.actual_duration <= t.estimated_duration * 1.1
  })

  const totalRevenue = completedTrips.reduce((s, t) => s + Number(t.revenue), 0)
  const totalDistance = completedTrips.reduce((s, t) => s + Number(t.actual_distance || 0), 0)
  const totalFuelCost = fuelLogs.reduce((s, f) => s + Number(f.total_cost), 0)
  const totalLiters = fuelLogs.reduce((s, f) => s + Number(f.liters), 0)
  const fraudAlerts = fuelLogs.filter(f => f.is_fraud_suspected).length

  const totalAcquisition = vehicles.reduce((s, v) => s + Number(v.acquisition_cost), 0)
  const opCost = totalFuelCost + expenses.reduce((s, e) => s + Number(e.amount), 0)

  return {
    utilization_rate: Math.round((vehicles.filter(v => v.status === "on_trip").length / Math.max(vehicles.length, 1)) * 100),
    on_time_delivery: completedTrips.length > 0 ? Math.round((onTimeTrips.length / completedTrips.length) * 100) : 100,
    fuel_efficiency: totalLiters > 0 ? parseFloat((totalDistance / totalLiters).toFixed(2)) : 3.2,
    cost_per_mile: totalDistance > 0 ? parseFloat((totalFuelCost / (totalDistance * 0.621371)).toFixed(2)) : 4.15,
    fleet_roi: totalAcquisition > 0 ? parseFloat((((totalRevenue - opCost) / totalAcquisition) * 100).toFixed(1)) : 12.4,
    fraud_alerts: fraudAlerts,
    avg_safety_score: drivers.length > 0 ? parseFloat((drivers.reduce((s, d) => s + Number(d.safety_score), 0) / drivers.length).toFixed(1)) : 0,
    total_vehicles: vehicles.length,
    active_vehicles: vehicles.filter(v => v.status === "available" || v.status === "on_trip").length,
    on_trip_vehicles: vehicles.filter(v => v.status === "on_trip").length,
    total_trips: trips.length,
    completed_trips: completedTrips.length,
    total_revenue: totalRevenue,
    total_fuel_cost: totalFuelCost,
  }
}
