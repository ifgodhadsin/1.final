import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Seeding database...")

  // Create organization
  const org = await prisma.organization.create({
    data: {
      name: "TransitOps Demo Fleet",
      subscription_plan: "pro",
    },
  })
  console.log(`✓ Created organization: ${org.name}`)

  // Create users
  const user1 = await prisma.user.create({
    data: {
      org_id: org.id,
      email: "john.martinez@transitops.com",
      full_name: "John Martinez",
      role: "driver",
    },
  })
  const user2 = await prisma.user.create({
    data: {
      org_id: org.id,
      email: "sarah.chen@transitops.com",
      full_name: "Sarah Chen",
      role: "driver",
    },
  })
  console.log("✓ Created 2 users")

  // Create vehicles
  const vehicles = await prisma.vehicle.createMany({
    data: [
      {
        org_id: org.id,
        registration_number: "VAN-001",
        vehicle_name: "Delivery Van Alpha",
        vehicle_type: "van",
        max_load_capacity: 1500,
        current_odometer: 45230,
        acquisition_cost: 35000,
        status: "available",
        year: 2022,
        make: "Ford",
        model: "Transit",
        vin: "1FTBW2XM2KKA12345",
        fuel_type: "diesel",
      },
      {
        org_id: org.id,
        registration_number: "TRK-002",
        vehicle_name: "Freightliner Cascadia",
        vehicle_type: "truck",
        max_load_capacity: 25000,
        current_odometer: 128500,
        acquisition_cost: 145000,
        status: "available",
        year: 2021,
        make: "Freightliner",
        model: "Cascadia",
        vin: "3AKJHHDR5KSJ12345",
        fuel_type: "diesel",
      },
      {
        org_id: org.id,
        registration_number: "VAN-003",
        vehicle_name: "Delivery Van Beta",
        vehicle_type: "van",
        max_load_capacity: 1200,
        current_odometer: 32100,
        acquisition_cost: 28000,
        status: "available",
        year: 2023,
        make: "Mercedes",
        model: "Sprinter",
        vin: "WD4PF0CD0JP123456",
        fuel_type: "diesel",
      },
      {
        org_id: org.id,
        registration_number: "TRK-004",
        vehicle_name: "Refrigerated Truck",
        vehicle_type: "refrigerated",
        max_load_capacity: 18000,
        current_odometer: 87600,
        acquisition_cost: 120000,
        status: "in_shop",
        year: 2020,
        make: "Kenworth",
        model: "T680",
        vin: "1XKYDP9X3KJ123456",
        fuel_type: "diesel",
      },
      {
        org_id: org.id,
        registration_number: "VAN-005",
        vehicle_name: "City Delivery Van",
        vehicle_type: "van",
        max_load_capacity: 800,
        current_odometer: 15600,
        acquisition_cost: 22000,
        status: "available",
        year: 2024,
        make: "Ram",
        model: "ProMaster",
        vin: "3C6TRVAG9KE123456",
        fuel_type: "petrol",
      },
    ],
  })
  console.log("✓ Created 5 vehicles")

  // Create drivers
  const drivers = await prisma.driver.createMany({
    data: [
      {
        user_id: user1.id,
        org_id: org.id,
        license_number: "DL-2024-001",
        license_category: "Class A CDL",
        license_expiry: new Date("2026-12-31"),
        contact_number: "+1-555-0101",
        safety_score: 94.5,
        status: "available",
        years_experience: 8,
      },
      {
        user_id: user2.id,
        org_id: org.id,
        license_number: "DL-2024-002",
        license_category: "Class B CDL",
        license_expiry: new Date("2025-08-15"),
        contact_number: "+1-555-0102",
        safety_score: 88.0,
        status: "available",
        years_experience: 5,
      },
    ],
  })
  console.log("✓ Created 2 drivers")

  console.log("\n🎉 Database seeded successfully!")
  console.log(`   Organization ID: ${org.id}`)
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
