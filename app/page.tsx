"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Vehicle, Driver, Trip, FleetKPIs, FraudAnalysis } from "@/types"
import { formatCurrency } from "@/lib/utils"
import {
  Truck, Users, Route, Fuel, AlertTriangle, TrendingUp, 
  Shield, Clock, MapPin, CheckCircle, XCircle, Play, Flag
} from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts"

const STATUS_COLORS: Record<string, string> = {
  available: "#10b981",
  on_trip: "#3b82f6",
  in_shop: "#f59e0b",
  retired: "#ef4444",
}

export default function Dashboard() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [trips, setTrips] = useState<Trip[]>([])
  const [kpis, setKpis] = useState<FleetKPIs | null>(null)
  const [loading, setLoading] = useState(true)

  const [selectedVehicle, setSelectedVehicle] = useState("")
  const [selectedDriver, setSelectedDriver] = useState("")
  const [cargoWeight, setCargoWeight] = useState("800")
  const [destination, setDestination] = useState("Distribution Center B - Milwaukee")

  const [fuelVehicle, setFuelVehicle] = useState("")
  const [fuelLiters, setFuelLiters] = useState("45")
  const [fuelPrice, setFuelPrice] = useState("1.45")
  const [fuelCost, setFuelCost] = useState("65.25")
  const [fraudResult, setFraudResult] = useState<FraudAnalysis | null>(null)

  const [logs, setLogs] = useState<string[]>([])

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString()
    setLogs(prev => [`[${time}] ${msg}`, ...prev].slice(0, 50))
  }

  const fetchData = useCallback(async () => {
    try {
      const [vRes, dRes, tRes, kRes] = await Promise.all([
        fetch("/api/fleet"),
        fetch("/api/drivers"),
        fetch("/api/trips"),
        fetch("/api/kpi"),
      ])

      const vData = await vRes.json()
      const dData = await dRes.json()
      const tData = await tRes.json()
      const kData = await kRes.json()

      setVehicles(vData.vehicles)
      setDrivers(dData.drivers)
      setTrips(tData.trips)
      setKpis(kData)
    } catch (err) {
      addLog(`Error fetching data: ${err}`)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 3000)
    return () => clearInterval(interval)
  }, [fetchData])

  useEffect(() => {
    if (vehicles.length > 0 && !selectedVehicle) {
      const available = vehicles.find(v => v.status === "available")
      if (available) setSelectedVehicle(available.id)
    }
    if (drivers.length > 0 && !selectedDriver) {
      const available = drivers.find(d => d.status === "available")
      if (available) setSelectedDriver(available.id)
    }
    if (vehicles.length > 0 && !fuelVehicle) {
      setFuelVehicle(vehicles[0].id)
    }
  }, [vehicles, drivers])

  const dispatchTrip = async () => {
    const v = vehicles.find(x => x.id === selectedVehicle)
    const d = drivers.find(x => x.id === selectedDriver)
    if (!v || !d) return

    addLog(`Attempting dispatch: ${v.registration_number} + ${d.name} → ${destination}`)

    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicle_id: selectedVehicle,
          driver_id: selectedDriver,
          cargo_weight: parseFloat(cargoWeight),
          destination,
          source: "Warehouse A - Chicago",
        }),
      })

      const data = await res.json()

      if (res.ok) {
        addLog(`✓ ${data.trip.trip_number} DISPATCHED — ${v.registration_number} + ${d.name}`)
        addLog(`  Side effects: ${v.registration_number} → on_trip, ${d.name} → on_trip`)
        fetchData()
      } else {
        data.errors.forEach((err: string) => addLog(`✗ ${err}`))
      }
    } catch (err) {
      addLog(`✗ Network error: ${err}`)
    }
  }

  const updateTrip = async (tripId: string, status: string) => {
    try {
      const res = await fetch(`/api/trips/${tripId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })

      const data = await res.json()
      if (res.ok) {
        const trip = data.trip
        const v = vehicles.find(x => x.id === trip.vehicle_id)
        const d = drivers.find(x => x.id === trip.driver_id)

        if (status === "in_progress") addLog(`→ ${trip.trip_number} is now IN PROGRESS`)
        else if (status === "completed") {
          addLog(`✓ ${trip.trip_number} COMPLETED — ${v?.registration_number} + ${d?.name} restored`)
          addLog(`  Revenue: $${trip.revenue} | Distance: ${trip.actual_distance}km`)
        } else if (status === "cancelled") addLog(`✗ ${trip.trip_number} CANCELLED`)

        fetchData()
      }
    } catch (err) {
      addLog(`✗ Error: ${err}`)
    }
  }

  const analyzeFuel = async () => {
    try {
      const res = await fetch("/api/fuel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicle_id: fuelVehicle,
          liters: parseFloat(fuelLiters),
          cost_per_liter: parseFloat(fuelPrice),
          total_cost: parseFloat(fuelCost),
          odometer_reading: vehicles.find(v => v.id === fuelVehicle)?.current_odometer || 0,
        }),
      })

      const data = await res.json()
      setFraudResult(data.analysis)

      const v = vehicles.find(x => x.id === fuelVehicle)
      if (data.analysis.is_suspected) {
        addLog(`🚨 FRAUD ALERT: ${v?.registration_number} — ${data.analysis.confidence_score}% confidence, ${data.analysis.risk_level.toUpperCase()} risk`)
      } else {
        addLog(`✓ Fuel transaction for ${v?.registration_number} — ${data.analysis.confidence_score}% fraud confidence`)
      }

      fetchData()
    } catch (err) {
      addLog(`✗ Error: ${err}`)
    }
  }

  const vehicleStatusData = vehicles.reduce((acc: any[], v) => {
    const existing = acc.find(x => x.name === v.status)
    if (existing) existing.value++
    else acc.push({ name: v.status, value: 1, color: STATUS_COLORS[v.status] || "#94a3b8" })
    return acc
  }, [])

  const tripStatusData = [
    { name: "Completed", value: trips.filter(t => t.status === "completed").length },
    { name: "In Progress", value: trips.filter(t => t.status === "in_progress").length },
    { name: "Dispatched", value: trips.filter(t => t.status === "dispatched").length },
    { name: "Cancelled", value: trips.filter(t => t.status === "cancelled").length },
  ].filter(d => d.value > 0)

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Truck className="mx-auto h-12 w-12 animate-pulse text-primary" />
          <p className="mt-4 text-muted-foreground">Loading TransitOps Fleet Command...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
          TransitOps Fleet Command
        </h1>
        <p className="text-muted-foreground mt-1">Real-time fleet operations dashboard — PostgreSQL + Prisma</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-8">
        <KpiCard title="Utilization" value={`${kpis?.utilization_rate || 0}%`} icon={<Truck className="h-4 w-4" />} color="text-blue-400" />
        <KpiCard title="On-Time" value={`${kpis?.on_time_delivery || 100}%`} icon={<Clock className="h-4 w-4" />} color="text-emerald-400" />
        <KpiCard title="Efficiency" value={`${kpis?.fuel_efficiency || 3.2} km/L`} icon={<Fuel className="h-4 w-4" />} color="text-amber-400" />
        <KpiCard title="Fraud Alerts" value={`${kpis?.fraud_alerts || 0}`} icon={<AlertTriangle className="h-4 w-4" />} color="text-red-400" />
        <KpiCard title="Fleet ROI" value={`${kpis?.fleet_roi || 12.4}%`} icon={<TrendingUp className="h-4 w-4" />} color="text-emerald-400" />
        <KpiCard title="Safety Score" value={`${kpis?.avg_safety_score || 94.2}`} icon={<Shield className="h-4 w-4" />} color="text-blue-400" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3 mb-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              Fleet Status
            </CardTitle>
            <CardDescription>{vehicles.length} vehicles in fleet</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 text-muted-foreground font-medium">Vehicle</th>
                    <th className="text-left py-3 px-2 text-muted-foreground font-medium">Reg #</th>
                    <th className="text-left py-3 px-2 text-muted-foreground font-medium">Type</th>
                    <th className="text-left py-3 px-2 text-muted-foreground font-medium">Capacity</th>
                    <th className="text-left py-3 px-2 text-muted-foreground font-medium">Status</th>
                    <th className="text-left py-3 px-2 text-muted-foreground font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map(v => (
                    <tr key={v.id} className="border-b border-border/50 hover:bg-accent/5 transition-colors">
                      <td className="py-3 px-2 font-medium">{v.vehicle_name}</td>
                      <td className="py-3 px-2 text-muted-foreground">{v.registration_number}</td>
                      <td className="py-3 px-2 text-muted-foreground capitalize">{v.vehicle_type}</td>
                      <td className="py-3 px-2 text-muted-foreground">{v.max_load_capacity.toLocaleString()} kg</td>
                      <td className="py-3 px-2">
                        <Badge status={v.status}>{v.status.replace("_", " ")}</Badge>
                      </td>
                      <td className="py-3 px-2">
                        {v.status === "available" && (
                          <Button size="sm" onClick={() => { setSelectedVehicle(v.id); dispatchTrip() }}>
                            Dispatch
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Route className="h-5 w-5 text-primary" />
              Create Trip
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Vehicle</label>
              <Select value={selectedVehicle} onChange={e => setSelectedVehicle(e.target.value)}>
                {vehicles.filter(v => v.status === "available").map(v => (
                  <option key={v.id} value={v.id}>{v.registration_number} - {v.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Driver</label>
              <Select value={selectedDriver} onChange={e => setSelectedDriver(e.target.value)}>
                {drivers.filter(d => d.status === "available").map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.license_number})</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Cargo Weight (kg)</label>
              <Input type="number" value={cargoWeight} onChange={e => setCargoWeight(e.target.value)} min="0" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Destination</label>
              <Input value={destination} onChange={e => setDestination(e.target.value)} />
            </div>
            <Button className="w-full" onClick={dispatchTrip}>
              <Play className="mr-2 h-4 w-4" />
              Dispatch Trip
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 mb-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Active Trips
            </CardTitle>
            <CardDescription>{trips.length} total trips</CardDescription>
          </CardHeader>
          <CardContent>
            {trips.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Route className="mx-auto h-10 w-10 mb-3 opacity-50" />
                <p>No active trips. Create one above.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {trips.map(trip => {
                  const v = vehicles.find(x => x.id === trip.vehicle_id)
                  const d = drivers.find(x => x.id === trip.driver_id)
                  const progress = trip.status === "completed" ? 100 : trip.status === "in_progress" ? 60 : trip.status === "dispatched" ? 20 : 0

                  return (
                    <div key={trip.id} className="rounded-lg border border-border p-4 hover:bg-accent/5 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{trip.trip_number}</span>
                          <Badge status={trip.status}>{trip.status.replace("_", " ")}</Badge>
                        </div>
                        <div className="flex gap-2">
                          {trip.status === "dispatched" && (
                            <Button size="sm" variant="outline" onClick={() => updateTrip(trip.id, "in_progress")}>
                              <Play className="mr-1 h-3 w-3" /> Start
                            </Button>
                          )}
                          {trip.status === "in_progress" && (
                            <Button size="sm" onClick={() => updateTrip(trip.id, "completed")}>
                              <CheckCircle className="mr-1 h-3 w-3" /> Complete
                            </Button>
                          )}
                          {(trip.status === "dispatched" || trip.status === "in_progress") && (
                            <Button size="sm" variant="destructive" onClick={() => updateTrip(trip.id, "cancelled")}>
                              <XCircle className="mr-1 h-3 w-3" /> Cancel
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        {v?.registration_number} + {d?.name} → {trip.destination}
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-primary h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{progress}% complete</div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Fuel Fraud Shield
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Vehicle</label>
              <Select value={fuelVehicle} onChange={e => setFuelVehicle(e.target.value)}>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.registration_number}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Liters</label>
              <Input type="number" value={fuelLiters} onChange={e => setFuelLiters(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Price per Liter ($)</label>
              <Input type="number" step="0.01" value={fuelPrice} onChange={e => setFuelPrice(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Total Cost ($)</label>
              <Input type="number" step="0.01" value={fuelCost} onChange={e => setFuelCost(e.target.value)} />
            </div>
            <Button className="w-full" onClick={analyzeFuel}>
              <Flag className="mr-2 h-4 w-4" />
              Analyze Transaction
            </Button>

            {fraudResult && (
              <div className="mt-4 p-4 rounded-lg bg-muted/50">
                <div className="text-xs text-muted-foreground mb-1">Fraud Confidence</div>
                <div className="w-full bg-muted rounded-full h-2 mb-2">
                  <div className="h-2 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${fraudResult.confidence_score}%`,
                      backgroundColor: fraudResult.confidence_score >= 70 ? "#ef4444" : fraudResult.confidence_score >= 40 ? "#f59e0b" : "#10b981"
                    }} />
                </div>
                <div className="text-sm font-semibold" style={{ 
                  color: fraudResult.confidence_score >= 70 ? "#ef4444" : fraudResult.confidence_score >= 40 ? "#f59e0b" : "#10b981"
                }}>
                  {fraudResult.risk_level.toUpperCase()} RISK — {fraudResult.confidence_score}%
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  {fraudResult.anomalies.map((a, i) => (
                    <div key={i}>• {a}</div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 mb-8">
        <Card>
          <CardHeader><CardTitle>Vehicle Status</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={vehicleStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {vehicleStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }} itemStyle={{ color: "#f1f5f9" }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Trip Overview</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={tripStatusData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }} itemStyle={{ color: "#f1f5f9" }} />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>System Log</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[200px] overflow-y-auto font-mono text-xs space-y-1">
              {logs.length === 0 ? (
                <div className="text-muted-foreground py-8 text-center">No events yet. Start dispatching trips.</div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className={`py-1 ${log.includes("✓") ? "text-emerald-400" : log.includes("✗") ? "text-red-400" : log.includes("🚨") ? "text-red-400 font-semibold" : "text-blue-400"}`}>
                    {log}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function KpiCard({ title, value, icon, color }: { title: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
          <div className="text-muted-foreground">{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}
