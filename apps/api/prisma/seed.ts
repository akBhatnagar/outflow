/* eslint-disable no-console */
// Seeds the global category list. Idempotent — safe to run on every deploy.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CATEGORIES = [
  { slug: 'streaming-video', name: 'Streaming (video)', icon: 'tv', color: '#ef4444', sortKey: 10 },
  {
    slug: 'streaming-audio',
    name: 'Streaming (audio)',
    icon: 'music',
    color: '#f59e0b',
    sortKey: 20,
  },
  { slug: 'productivity', name: 'Productivity', icon: 'briefcase', color: '#3b82f6', sortKey: 30 },
  { slug: 'cloud-dev', name: 'Cloud / Dev tools', icon: 'cloud', color: '#10b981', sortKey: 40 },
  { slug: 'ai', name: 'AI', icon: 'sparkles', color: '#8b5cf6', sortKey: 50 },
  { slug: 'fitness', name: 'Fitness', icon: 'dumbbell', color: '#84cc16', sortKey: 60 },
  { slug: 'news', name: 'News & reading', icon: 'newspaper', color: '#06b6d4', sortKey: 70 },
  { slug: 'gaming', name: 'Gaming', icon: 'gamepad-2', color: '#ec4899', sortKey: 80 },
  { slug: 'utilities', name: 'Utilities', icon: 'zap', color: '#64748b', sortKey: 90 },
  { slug: 'other', name: 'Other', icon: 'package', color: '#6b7280', sortKey: 999 },
];

async function main() {
  for (const c of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, icon: c.icon, color: c.color, sortKey: c.sortKey },
      create: c,
    });
  }
  console.info(`Seeded ${CATEGORIES.length} categories`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
