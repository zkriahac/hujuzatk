import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create a demo super admin
  const adminEmail = 'admin@prohost.local';
  const adminPassword = 'Admin@12345';
  
  const existing = await prisma.tenant.findUnique({
    where: { email: adminEmail },
  });

  if (existing) {
    console.log('✅ Admin already exists');
    return;
  }

  const passwordHash = await bcryptjs.hash(adminPassword, 10);
  const validUntil = new Date();
  validUntil.setFullYear(validUntil.getFullYear() + 1); // 1 year access

  const admin = await prisma.tenant.create({
    data: {
      name: 'ProHost Admin',
      email: adminEmail,
      passwordHash,
      language: 'en',
      currency: 'OMR',
      timezone: 'Asia/Muscat',
      rooms: [
        { id: 'A1', name: 'A1' },
        { id: 'A2', name: 'A2' },
        { id: 'A3', name: 'A3' },
        { id: 'A4', name: 'A4' },
        { id: 'A5', name: 'A5' },
      ],
      subscriptionStatus: 'active',
      validUntil,
      isAdmin: true,
      isActive: true,
      settings: {
        create: {
          defaultNightPrice: 50,
          defaultTax: 5,
          notifyOnBooking: true,
          notifyOnCancellation: true,
        },
      },
    },
    include: { settings: true },
  });

  console.log('✅ Admin tenant created:');
  console.log(`   Email: ${adminEmail}`);
  console.log(`   Password: ${adminPassword}`);
  console.log('   (Change this password after first login!)');

  // Create a demo tenant
  const demoEmail = 'demo@prohost.local';
  const demoPassword = 'Demo@12345';

  const demoDays = 14;
  const demoValidUntil = new Date();
  demoValidUntil.setDate(demoValidUntil.getDate() + demoDays);

  const demoPasswordHash = await bcryptjs.hash(demoPassword, 10);

  const demo = await prisma.tenant.create({
    data: {
      name: 'Demo Workspace',
      email: demoEmail,
      passwordHash: demoPasswordHash,
      language: 'en',
      currency: 'OMR',
      timezone: 'Asia/Muscat',
      rooms: [
        { id: '101', name: '101 - Suite' },
        { id: '102', name: '102 - Double' },
        { id: '103', name: '103 - Single' },
        { id: '201', name: '201 - Suite' },
        { id: '202', name: '202 - Double' },
      ],
      subscriptionStatus: 'trial',
      validUntil: demoValidUntil,
      isAdmin: false,
      isActive: true,
      settings: {
        create: {
          defaultNightPrice: 75,
          defaultTax: 10,
          notifyOnBooking: true,
          notifyOnCancellation: true,
        },
      },
    },
    include: { settings: true },
  });

  console.log('\\n✅ Demo tenant created:');
  console.log(`   Email: ${demoEmail}`);
  console.log(`   Password: ${demoPassword}`);
  console.log(`   Trial expires in: ${demoDays} days`);

  // Add some sample bookings
  const checkIn = new Date();
  checkIn.setDate(checkIn.getDate() + 5);

  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + 3);

  const sampleBooking = await prisma.booking.create({
    data: {
      tenantId: demo.id,
      guestName: 'John Doe',
      guestEmail: 'john@example.com',
      guestPhone: '+96891234567',
      city: 'Muscat',
      room: '101',
      checkIn,
      checkOut,
      nights: 3,
      nightPrice: 75,
      totalPrice: 225,
      tax: 22.5,
      deposit: 100,
      remaining: 147.5,
      status: 'upcoming',
      notes: 'VIP guest - prefer high floor',
    },
  });

  console.log('\\n✅ Sample booking created');

  console.log('\\n🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
