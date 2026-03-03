// ── SEED DATA (prisma/seeds/index.ts) ────────────────
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function seed() {
  console.log('Seeding SheBloom database...');

  // Hospitals
  const h1 = await prisma.hospital.create({
    data: {
      name: 'Motherhood Hospital', address: 'Indiranagar', city: 'Bangalore',
      state: 'Karnataka', pincode: '560038', rating: 4.6, totalBeds: 120,
      hasEmergency: true, category: 'mid_range', accreditation: ['NABH'],
      specialties: ['Gynecology','Obstetrics','Pediatrics'],
      prices: { create: [
        { serviceName: 'Consultation', minPrice: 300, maxPrice: 500 },
        { serviceName: 'Normal Delivery', minPrice: 40000, maxPrice: 60000 },
        { serviceName: 'C-Section', minPrice: 80000, maxPrice: 120000 },
      ]},
    },
  });
  const h2 = await prisma.hospital.create({
    data: {
      name: 'Cloudnine Hospital', address: 'Jayanagar', city: 'Bangalore',
      state: 'Karnataka', pincode: '560011', rating: 4.7, totalBeds: 80,
      hasEmergency: true, category: 'premium', accreditation: ['NABH','JCI'],
      prices: { create: [
        { serviceName: 'Consultation', minPrice: 500, maxPrice: 800 },
        { serviceName: 'Normal Delivery', minPrice: 70000, maxPrice: 100000 },
        { serviceName: 'IVF Cycle', minPrice: 150000, maxPrice: 250000 },
      ]},
    },
  });
  const h3 = await prisma.hospital.create({
    data: {
      name: 'Rainbow Hospital', address: 'Marathahalli', city: 'Bangalore',
      state: 'Karnataka', pincode: '560037', rating: 4.5, totalBeds: 200,
      hasEmergency: true, category: 'budget',
      prices: { create: [
        { serviceName: 'Consultation', minPrice: 200, maxPrice: 350 },
        { serviceName: 'Normal Delivery', minPrice: 25000, maxPrice: 40000 },
      ]},
    },
  });

  // Doctors
  await prisma.doctor.createMany({ data: [
    { fullName:'Dr. Priya Sharma', specialization:'Gynecologist', qualifications:['MBBS','MD OBG'], experienceYears:12, hospitalId:h1.id, consultationFee:300, rating:4.9, totalReviews:847, languages:['ENGLISH','HINDI'], tags:['PCOD Expert'], isVerified:true },
    { fullName:'Dr. Anita Desai', specialization:'Obstetrician', qualifications:['MBBS','MS OBG'], experienceYears:18, hospitalId:h2.id, consultationFee:500, rating:4.8, totalReviews:1203, languages:['ENGLISH','HINDI'], tags:['High Risk'], isVerified:true },
    { fullName:'Dr. Meera Nair', specialization:'Fertility Specialist', qualifications:['MBBS','MD','DRM'], experienceYears:15, hospitalId:h2.id, consultationFee:450, rating:4.9, totalReviews:632, languages:['ENGLISH','TAMIL'], tags:['IVF'], isVerified:true },
    { fullName:'Dr. Kavitha Rao', specialization:'Dermatologist', qualifications:['MBBS','MD Derm'], experienceYears:10, consultationFee:250, rating:4.7, totalReviews:489, languages:['ENGLISH','KANNADA'], tags:['Hormonal Acne'], isVerified:true },
    { fullName:'Dr. Sunita Gupta', specialization:'Nutritionist', qualifications:['MBBS','MSc Nutrition'], experienceYears:8, consultationFee:200, rating:4.8, totalReviews:356, languages:['ENGLISH','HINDI'], tags:['PCOS Diet'], isVerified:true },
  ]});

  // Articles
  const articles = [
    { title:'Understanding PCOD: Complete Guide', slug:'pcod-guide', category:'pcod', tags:['PCOD','hormones'], readTimeMinutes:8, isFeatured:true },
    { title:'Period Pain: 10 Natural Remedies', slug:'period-pain-remedies', category:'periods', tags:['cramps','natural'], readTimeMinutes:5 },
    { title:'First Trimester Guide', slug:'first-trimester', category:'pregnancy', tags:['pregnancy','prenatal'], readTimeMinutes:12 },
    { title:'Yoga for Menstrual Health', slug:'yoga-menstrual', category:'wellness', tags:['yoga','periods'], readTimeMinutes:6 },
    { title:'Hormonal Imbalance Signs', slug:'hormonal-imbalance', category:'health', tags:['hormones','symptoms'], readTimeMinutes:7 },
    { title:'Best Foods During Periods', slug:'foods-during-period', category:'nutrition', tags:['nutrition','diet'], readTimeMinutes:6 },
    { title:'Mental Health and PMS', slug:'mental-health-pms', category:'mental_health', tags:['mental health','PMS'], readTimeMinutes:9 },
    { title:'Safe Pregnancy Exercises', slug:'pregnancy-exercises', category:'pregnancy', tags:['exercise','fitness'], readTimeMinutes:10 },
  ];
  for (const a of articles) {
    await prisma.article.create({
      data: { ...a, content:`Expert content about ${a.title}.`, status:'PUBLISHED', publishedAt:new Date() },
    });
  }

  // Wellness Activities
  await prisma.wellnessActivity.createMany({ data: [
    { title:'Morning Calm Meditation', category:'meditation', durationMinutes:10, difficulty:'beginner', cyclePhases:['MENSTRUAL','FOLLICULAR','OVULATION','LUTEAL'] },
    { title:'Deep Breathing', category:'breathing', durationMinutes:5, difficulty:'beginner', cyclePhases:['MENSTRUAL','FOLLICULAR','OVULATION','LUTEAL'] },
    { title:'Period Relief Yoga', category:'yoga', durationMinutes:20, difficulty:'beginner', cyclePhases:['MENSTRUAL'] },
    { title:'Prenatal Yoga', category:'yoga', durationMinutes:25, difficulty:'intermediate', cyclePhases:[] },
    { title:'PCOS Yoga Flow', category:'yoga', durationMinutes:30, difficulty:'intermediate', cyclePhases:['FOLLICULAR','OVULATION'] },
    { title:'Sleep Meditation', category:'meditation', durationMinutes:15, difficulty:'beginner', cyclePhases:['MENSTRUAL','LUTEAL'] },
    { title:'Gratitude Journal', category:'stress_management', durationMinutes:5, difficulty:'beginner', cyclePhases:['MENSTRUAL','FOLLICULAR','OVULATION','LUTEAL'] },
  ]});

  console.log('Seed complete!');
}

seed().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
