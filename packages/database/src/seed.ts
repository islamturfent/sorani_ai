import { getConfig } from '@sorani/shared';
import { seedRestaurants } from '@sorani/restaurants';
import { demoUsers } from '@sorani/users';

async function main() {
  const { PrismaClient } = await import('@prisma/client');
  const client = new PrismaClient({ datasources: { db: { url: getConfig().databaseUrl } } });

  const tenant = await client.tenant.upsert({
    where: { slug: 'platform' },
    create: { slug: 'platform', name: 'Sorani Platform', status: 'ACTIVE', plan: 'enterprise' },
    update: {},
  });

  for (const r of seedRestaurants()) {
    await client.restaurant.upsert({
      where: { id: r.id },
      create: {
        id: r.id,
        tenantId: tenant.id,
        name: r.name,
        description: r.description,
        cuisineTypes: r.cuisineTypes,
        priceRange: r.priceRange,
        rating: r.rating,
        features: r.features,
        website: r.website,
        phoneNumbers: r.phoneNumbers,
        directBookingEnabled: r.directBookingEnabled,
        phoneBookingEnabled: r.phoneBookingEnabled,
        status: r.status,
        reservationProvider: r.reservationProvider,
        locations: {
          create: r.locations.map((l) => ({
            id: l.id,
            name: l.name,
            address: l.address,
            city: l.city,
            country: l.country,
            latitude: l.latitude,
            longitude: l.longitude,
            phone: l.phone,
            timezone: l.timezone,
            hours: {
              create: l.openingHours.map((h) => ({
                dayOfWeek: h.dayOfWeek,
                open: h.open,
                close: h.close,
                closed: h.closed ?? false,
              })),
            },
          })),
        },
      },
      update: {},
    });
  }

  for (const u of demoUsers()) {
    await client.user.upsert({
      where: { email: u.email },
      create: { tenantId: tenant.id, email: u.email, name: u.name, role: u.role, restaurantIds: u.restaurantIds || [] },
      update: {},
    });
  }

  console.log('Seeded tenant, restaurants and users.');
  await client.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
