import { cleanupExpiredSessions } from '../apps/active-sse-sessions';

export async function runSeed() {
  console.log('🌱 Starting database seeding...');

  try {
    // Clean up any expired sessions on startup
    const cleanedUp = await cleanupExpiredSessions();
    console.log(`🧹 Cleaned up ${cleanedUp} expired sessions`);
    
    console.log('✅ Database seeding completed successfully');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

  await runSeed();
