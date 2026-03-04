import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create sample doctors
  const doctors = [
    { fullName: 'Dr. Priya Sharma', specialization: 'Gynecologist', experienceYears: 12, consultationFee: 300, rating: 4.9, totalReviews: 847, tags: ['PCOD Expert'], languages: ['ENGLISH' as const, 'HINDI' as const], isAvailable: true, isVerified: true },
    { fullName: 'Dr. Anita Desai', specialization: 'Obstetrician', experienceYears: 18, consultationFee: 500, rating: 4.8, totalReviews: 1203, tags: ['High Risk Pregnancy'], languages: ['ENGLISH' as const], isAvailable: true, isVerified: true },
    { fullName: 'Dr. Meera Nair', specialization: 'Fertility Specialist', experienceYears: 15, consultationFee: 450, rating: 4.9, totalReviews: 632, tags: ['IVF'], languages: ['ENGLISH' as const, 'TAMIL' as const], isAvailable: true, isVerified: true },
    { fullName: 'Dr. Kavitha Rao', specialization: 'Dermatologist', experienceYears: 10, consultationFee: 250, rating: 4.7, totalReviews: 489, tags: ['Hormonal Acne'], languages: ['ENGLISH' as const, 'KANNADA' as const], isAvailable: true, isVerified: true },
    { fullName: 'Dr. Sunita Gupta', specialization: 'Nutritionist', experienceYears: 8, consultationFee: 200, rating: 4.8, totalReviews: 356, tags: ['PCOS Diet'], languages: ['ENGLISH' as const, 'HINDI' as const], isAvailable: true, isVerified: true },
  ];

  for (const doc of doctors) {
    await prisma.doctor.upsert({
      where: { id: doc.fullName.replace(/\s/g, '-').toLowerCase() },
      update: doc,
      create: { id: doc.fullName.replace(/\s/g, '-').toLowerCase(), ...doc },
    });
  }

  // Create sample articles
  const articles = [
    { slug: 'understanding-pcod', title: 'Understanding PCOD: A Complete Guide', category: 'pcod', content: 'PCOD is one of the most common hormonal disorders...', readTimeMinutes: 8, status: 'PUBLISHED' as const, isFeatured: true, publishedAt: new Date() },
    { slug: 'period-pain-remedies', title: '5 Natural Remedies for Period Pain', category: 'periods', content: 'Period pain affects most women...', readTimeMinutes: 5, status: 'PUBLISHED' as const, publishedAt: new Date() },
    { slug: 'first-trimester', title: 'First Trimester: What to Expect', category: 'pregnancy', content: 'The first trimester is a time of incredible change...', readTimeMinutes: 10, status: 'PUBLISHED' as const, publishedAt: new Date() },
    { slug: 'yoga-menstrual-relief', title: 'Yoga Poses for Menstrual Relief', category: 'wellness', content: 'Yoga is one of the most effective natural remedies...', readTimeMinutes: 6, status: 'PUBLISHED' as const, publishedAt: new Date() },
    { slug: 'hormonal-imbalance-signs', title: 'Hormonal Imbalance: 7 Warning Signs', category: 'health', content: 'Hormonal imbalances can affect everything...', readTimeMinutes: 7, status: 'PUBLISHED' as const, publishedAt: new Date() },
  ];

  for (const art of articles) {
    await prisma.article.upsert({ where: { slug: art.slug }, update: art, create: art });
  }

  console.log('Seed complete!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
