import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // ─── ARTICLES ──────────────────────────────────────
  const articleCount = await prisma.article.count()
  if (articleCount === 0) {
    console.log('Inserting sample articles...')
    await prisma.article.createMany({
      data: [
        {
          title: 'Understanding Your Menstrual Cycle',
          slug: 'understanding-menstrual-cycle',
          content: 'Your menstrual cycle is a complex interplay of hormones. The average cycle lasts 28 days. Phase 1: Menstrual Phase (Days 1-5) — hormone levels are at their lowest. Phase 2: Follicular Phase (Days 1-13) — estrogen rises, you feel more energetic. Phase 3: Ovulation (Day 14) — egg is released. Phase 4: Luteal Phase (Days 15-28) — progesterone rises.',
          excerpt: 'Learn about the four phases of your menstrual cycle and how they affect your daily life.',
          category: 'periods',
          tags: ['menstrual cycle', 'periods', 'health', 'hormones'],
          isFeatured: true,
          status: 'PUBLISHED',
          publishedAt: new Date(),
        },
        {
          title: 'PCOD vs PCOS: What Every Woman Should Know',
          slug: 'pcod-vs-pcos-differences',
          content: 'PCOD and PCOS are often confused but are different conditions. PCOD is a condition where ovaries produce immature eggs due to poor lifestyle and hormonal imbalance. PCOS is a metabolic disorder where ovaries produce higher quantities of androgens. PCOD does not always cause infertility; PCOS can make conception difficult.',
          excerpt: 'Understanding the key differences between PCOD and PCOS, and how Ayurveda can help.',
          category: 'pcod',
          tags: ['PCOD', 'PCOS', 'women health', 'ayurveda'],
          isFeatured: true,
          status: 'PUBLISHED',
          publishedAt: new Date(),
        },
        {
          title: 'Ayurvedic Herbs for Better Period Health',
          slug: 'ayurvedic-herbs-period-health',
          content: 'Ayurveda offers herbs like Shatavari, Ashwagandha, Lodhra, Ashoka and Turmeric to manage period discomfort and promote reproductive health. Consult an Ayurvedic practitioner before starting any herbal regimen.',
          excerpt: 'Discover five powerful Ayurvedic herbs that can transform your period health naturally.',
          category: 'wellness',
          tags: ['ayurveda', 'herbs', 'periods', 'natural remedies'],
          isFeatured: false,
          status: 'PUBLISHED',
          publishedAt: new Date(),
        },
      ],
    })
    console.log('✅ 3 articles inserted')
  } else {
    console.log(`⏭  Skipping articles (${articleCount} already exist)`)
  }

  // ─── DOCTORS ───────────────────────────────────────
  const doctorCount = await prisma.doctor.count()
  if (doctorCount === 0) {
    console.log('Inserting sample doctors...')
    await prisma.doctor.createMany({
      data: [
        {
          fullName: 'Dr. Priya Sharma',
          specialization: 'Gynecologist & Obstetrician',
          qualifications: ['MBBS', 'MS (OBG)', 'Fellowship in Reproductive Medicine'],
          experienceYears: 15,
          consultationFee: 800,
          hospitalName: 'VedaClue Wellness Center',
          bio: 'Dr. Priya Sharma is a renowned gynecologist with over 15 years of experience. She specializes in high-risk pregnancies, PCOD management, and fertility treatments.',
          tags: ['PCOD', 'Pregnancy', 'Fertility', 'High-Risk'],
          languages: ['ENGLISH', 'HINDI'],
          rating: 4.9,
          totalReviews: 234,
          isVerified: true,
          isAvailable: true,
        },
        {
          fullName: 'Dr. Kavita Reddy',
          specialization: 'Ayurvedic Gynecologist',
          qualifications: ['BAMS', 'MD (Ayurveda)', 'Panchakarma Specialist'],
          experienceYears: 12,
          consultationFee: 600,
          hospitalName: 'Ayush Wellness Clinic',
          bio: "Dr. Kavita Reddy is an expert in Ayurvedic women's health. She specializes in treating menstrual disorders, infertility, and menopausal symptoms.",
          tags: ['Ayurveda', 'Menstrual Health', 'Infertility', 'Panchakarma'],
          languages: ['ENGLISH', 'HINDI', 'TELUGU'],
          rating: 4.7,
          totalReviews: 156,
          isVerified: true,
          isAvailable: true,
        },
        {
          fullName: 'Dr. Meena Iyer',
          specialization: 'Reproductive Endocrinologist',
          qualifications: ['MBBS', 'DNB (OBG)', 'Fellowship in IVF'],
          experienceYears: 10,
          consultationFee: 1200,
          hospitalName: 'Bloom Fertility Center',
          bio: 'Dr. Meena Iyer is a fertility specialist with expertise in IVF, IUI, and hormonal disorders.',
          tags: ['IVF', 'Fertility', 'Hormones', 'Endocrinology'],
          languages: ['ENGLISH', 'HINDI', 'TAMIL'],
          rating: 4.8,
          totalReviews: 89,
          isVerified: true,
          isAvailable: true,
        },
      ],
    })
    console.log('✅ 3 doctors inserted')
  } else {
    console.log(`⏭  Skipping doctors (${doctorCount} already exist)`)
  }

  // ─── PRODUCTS ──────────────────────────────────────
  const productCount = await prisma.product.count()
  if (productCount === 0) {
    console.log('Inserting sample products...')
    await prisma.product.createMany({
      data: [
        {
          name: 'Shatavari Capsules',
          description: 'Pure Shatavari (Asparagus racemosus) capsules to support hormonal balance, fertility, and overall women\'s wellness. Each capsule contains 500mg of organic Shatavari root extract.',
          price: 499,
          discountPrice: 399,
          category: 'supplement',
          howToUse: 'Take 1-2 capsules daily with warm milk or water after meals.',
          size: '60 capsules',
          ingredients: ['Shatavari Root Extract 500mg', 'Vegetable Cellulose Capsule'],
          benefits: ['Supports hormonal balance', 'Promotes fertility', 'Reduces PMS symptoms'],
          tags: ['ayurveda', 'hormones', 'fertility', 'organic'],
          targetAudience: ['periods', 'fertility', 'wellness'],
          isPublished: true,
          isFeatured: true,
          inStock: true,
          rating: 4.8,
          reviews: 127,
        },
        {
          name: 'Kumkumadi Face Oil',
          description: 'Traditional Ayurvedic Kumkumadi Tailam for radiant, glowing skin. Crafted with saffron, sandalwood, and 16 other potent herbs.',
          price: 899,
          discountPrice: 749,
          category: 'skincare',
          howToUse: 'Apply 3-4 drops on clean face before bedtime. Massage in upward circular motions. Leave overnight.',
          size: '30ml',
          ingredients: ['Saffron', 'Sandalwood Oil', 'Vetiver', 'Lotus', 'Manjistha', 'Sesame Oil Base'],
          benefits: ['Gives natural glow', 'Reduces dark spots', 'Anti-aging properties'],
          tags: ['skincare', 'ayurveda', 'face oil', 'saffron'],
          targetAudience: ['all', 'wellness'],
          isPublished: true,
          isFeatured: true,
          inStock: true,
          rating: 4.6,
          reviews: 89,
        },
        {
          name: 'Bhringraj Hair Oil',
          description: 'Premium cold-pressed Bhringraj hair oil enriched with Amla, Brahmi, and Hibiscus. Strengthens hair roots and reduces hairfall.',
          price: 599,
          discountPrice: 499,
          category: 'hair_care',
          howToUse: 'Warm slightly and massage into scalp for 10 minutes. Leave for at least 1 hour. Wash with mild shampoo.',
          size: '200ml',
          ingredients: ['Bhringraj Extract', 'Amla', 'Brahmi', 'Hibiscus', 'Coconut Oil Base'],
          benefits: ['Reduces hairfall', 'Strengthens roots', 'Promotes hair growth'],
          tags: ['hair care', 'ayurveda', 'bhringraj', 'natural'],
          targetAudience: ['all', 'wellness'],
          isPublished: true,
          isFeatured: false,
          inStock: true,
          rating: 4.7,
          reviews: 203,
        },
      ],
    })
    console.log('✅ 3 products inserted')
  } else {
    console.log(`⏭  Skipping products (${productCount} already exist)`)
  }

  // ─── DOSHA ASSESSMENT QUESTIONS (20+ Prakriti Assessment) ──────
  const doshaQCount = await prisma.doshaQuestion.count()
  if (doshaQCount === 0) {
    console.log('Inserting dosha assessment questions...')
    await prisma.doshaQuestion.createMany({
      data: [
        // ── Body Type (3 questions) ──
        {
          questionText: 'What best describes your body frame?',
          questionCategory: 'body_type',
          options: [
            { label: 'Thin, light, bony joints, hard to gain weight', vataScore: 3, pittaScore: 0, kaphaScore: 0 },
            { label: 'Medium build, athletic, moderate frame', vataScore: 0, pittaScore: 3, kaphaScore: 0 },
            { label: 'Broad, sturdy, gains weight easily, strong', vataScore: 0, pittaScore: 0, kaphaScore: 3 },
          ],
          weight: 1.5, orderIndex: 1,
        },
        {
          questionText: 'How would you describe your skin?',
          questionCategory: 'body_type',
          options: [
            { label: 'Dry, rough, thin, cracks easily, cool to touch', vataScore: 3, pittaScore: 0, kaphaScore: 0 },
            { label: 'Warm, oily in T-zone, sensitive, prone to rashes/acne', vataScore: 0, pittaScore: 3, kaphaScore: 0 },
            { label: 'Thick, smooth, moist, soft, rarely breaks out', vataScore: 0, pittaScore: 0, kaphaScore: 3 },
          ],
          weight: 1.2, orderIndex: 2,
        },
        {
          questionText: 'What is your hair like?',
          questionCategory: 'body_type',
          options: [
            { label: 'Dry, frizzy, thin, prone to split ends', vataScore: 3, pittaScore: 0, kaphaScore: 0 },
            { label: 'Fine, straight, oily, early graying or thinning', vataScore: 0, pittaScore: 3, kaphaScore: 0 },
            { label: 'Thick, lustrous, wavy, abundant, slow to gray', vataScore: 0, pittaScore: 0, kaphaScore: 3 },
          ],
          weight: 1.0, orderIndex: 3,
        },
        // ── Digestion (2 questions) ──
        {
          questionText: 'How is your appetite and digestion?',
          questionCategory: 'digestion',
          options: [
            { label: 'Irregular appetite, bloating, gas, constipation tendency', vataScore: 3, pittaScore: 0, kaphaScore: 0 },
            { label: 'Strong appetite, cannot skip meals, loose stools if stressed', vataScore: 0, pittaScore: 3, kaphaScore: 0 },
            { label: 'Moderate appetite, slow digestion, feel heavy after eating', vataScore: 0, pittaScore: 0, kaphaScore: 3 },
          ],
          weight: 1.3, orderIndex: 4,
        },
        {
          questionText: 'What happens when you skip a meal?',
          questionCategory: 'digestion',
          options: [
            { label: 'Anxious, shaky, lightheaded', vataScore: 3, pittaScore: 0, kaphaScore: 0 },
            { label: 'Irritable, angry, headache', vataScore: 0, pittaScore: 3, kaphaScore: 0 },
            { label: 'Can skip meals comfortably, no major issue', vataScore: 0, pittaScore: 0, kaphaScore: 3 },
          ],
          weight: 1.0, orderIndex: 5,
        },
        // ── Sleep (2 questions) ──
        {
          questionText: 'How is your sleep pattern?',
          questionCategory: 'sleep',
          options: [
            { label: 'Light sleeper, wake easily, difficulty falling asleep', vataScore: 3, pittaScore: 0, kaphaScore: 0 },
            { label: 'Moderate sleep, wake to urinate, vivid dreams', vataScore: 0, pittaScore: 3, kaphaScore: 0 },
            { label: 'Deep, heavy sleep, hard to wake up, love sleeping in', vataScore: 0, pittaScore: 0, kaphaScore: 3 },
          ],
          weight: 1.2, orderIndex: 6,
        },
        {
          questionText: 'How do you feel in the morning?',
          questionCategory: 'sleep',
          options: [
            { label: 'Takes time to wake up, stiff, need movement to feel alive', vataScore: 3, pittaScore: 0, kaphaScore: 0 },
            { label: 'Alert quickly, ready for action, purposeful', vataScore: 0, pittaScore: 3, kaphaScore: 0 },
            { label: 'Groggy, slow to start, need coffee/tea, not a morning person', vataScore: 0, pittaScore: 0, kaphaScore: 3 },
          ],
          weight: 0.8, orderIndex: 7,
        },
        // ── Stress Response (2 questions) ──
        {
          questionText: 'When stressed, you tend to:',
          questionCategory: 'stress',
          options: [
            { label: 'Worry, overthink, anxiety, racing thoughts', vataScore: 3, pittaScore: 0, kaphaScore: 0 },
            { label: 'Get angry, frustrated, confrontational, critical', vataScore: 0, pittaScore: 3, kaphaScore: 0 },
            { label: 'Withdraw, become quiet, comfort eat, avoid the issue', vataScore: 0, pittaScore: 0, kaphaScore: 3 },
          ],
          weight: 1.3, orderIndex: 8,
        },
        {
          questionText: 'How do you handle conflict?',
          questionCategory: 'stress',
          options: [
            { label: 'Avoid it, feel scared, want to run away', vataScore: 3, pittaScore: 0, kaphaScore: 0 },
            { label: 'Face it head-on, argue to win, get heated', vataScore: 0, pittaScore: 3, kaphaScore: 0 },
            { label: 'Stay calm, try to mediate, may suppress feelings', vataScore: 0, pittaScore: 0, kaphaScore: 3 },
          ],
          weight: 1.0, orderIndex: 9,
        },
        // ── Menstrual Pattern (3 questions) ──
        {
          questionText: 'How would you describe your menstrual cycle regularity?',
          questionCategory: 'menstrual',
          options: [
            { label: 'Irregular — cycles vary by 5+ days, sometimes skip months', vataScore: 3, pittaScore: 0, kaphaScore: 0 },
            { label: 'Regular — predictable cycle, rarely varies more than 1-2 days', vataScore: 0, pittaScore: 3, kaphaScore: 0 },
            { label: 'Long cycles — 30-40 days, consistent but delayed', vataScore: 0, pittaScore: 0, kaphaScore: 3 },
          ],
          weight: 1.5, orderIndex: 10,
        },
        {
          questionText: 'How is your menstrual flow typically?',
          questionCategory: 'menstrual',
          options: [
            { label: 'Scanty, dark/brownish, lasts 2-3 days, with cramps', vataScore: 3, pittaScore: 0, kaphaScore: 0 },
            { label: 'Medium to heavy, bright red, warm sensation, 4-5 days', vataScore: 0, pittaScore: 3, kaphaScore: 0 },
            { label: 'Heavy, with mucus/clots, pale/whitish, 5-7 days, dull ache', vataScore: 0, pittaScore: 0, kaphaScore: 3 },
          ],
          weight: 1.5, orderIndex: 11,
        },
        {
          questionText: 'What PMS symptoms do you most commonly experience?',
          questionCategory: 'menstrual',
          options: [
            { label: 'Anxiety, insomnia, lower back pain, constipation', vataScore: 3, pittaScore: 0, kaphaScore: 0 },
            { label: 'Irritability, headaches/migraines, acne, hot flashes', vataScore: 0, pittaScore: 3, kaphaScore: 0 },
            { label: 'Water retention, breast tenderness, cravings, lethargy', vataScore: 0, pittaScore: 0, kaphaScore: 3 },
          ],
          weight: 1.3, orderIndex: 12,
        },
        // ── Emotional Tendencies (2 questions) ──
        {
          questionText: 'Which emotional pattern resonates most?',
          questionCategory: 'emotional',
          options: [
            { label: 'Enthusiastic but changeable, creative, sometimes fearful', vataScore: 3, pittaScore: 0, kaphaScore: 0 },
            { label: 'Passionate, focused, can be judgmental or perfectionist', vataScore: 0, pittaScore: 3, kaphaScore: 0 },
            { label: 'Calm, loyal, nurturing, can be possessive or stubborn', vataScore: 0, pittaScore: 0, kaphaScore: 3 },
          ],
          weight: 1.0, orderIndex: 13,
        },
        {
          questionText: 'How do you make decisions?',
          questionCategory: 'emotional',
          options: [
            { label: 'Quickly but change mind often, impulsive', vataScore: 3, pittaScore: 0, kaphaScore: 0 },
            { label: 'Decisive, analytical, stick to the plan', vataScore: 0, pittaScore: 3, kaphaScore: 0 },
            { label: 'Take time, consult others, prefer not to rush', vataScore: 0, pittaScore: 0, kaphaScore: 3 },
          ],
          weight: 0.8, orderIndex: 14,
        },
        // ── Energy & Activity (2 questions) ──
        {
          questionText: 'How would you describe your energy throughout the day?',
          questionCategory: 'energy',
          options: [
            { label: 'Bursts of energy then crash, inconsistent, fatigue easily', vataScore: 3, pittaScore: 0, kaphaScore: 0 },
            { label: 'High sustained energy, driven, can push through fatigue', vataScore: 0, pittaScore: 3, kaphaScore: 0 },
            { label: 'Steady but low-moderate, endurance over speed, slow starter', vataScore: 0, pittaScore: 0, kaphaScore: 3 },
          ],
          weight: 1.2, orderIndex: 15,
        },
        {
          questionText: 'What type of exercise do you prefer?',
          questionCategory: 'energy',
          options: [
            { label: 'Walking, dancing, yoga — light and varied activities', vataScore: 3, pittaScore: 0, kaphaScore: 0 },
            { label: 'Competitive sports, HIIT, intense workouts', vataScore: 0, pittaScore: 3, kaphaScore: 0 },
            { label: 'Swimming, weight training, long walks — steady effort', vataScore: 0, pittaScore: 0, kaphaScore: 3 },
          ],
          weight: 0.8, orderIndex: 16,
        },
        // ── Appetite & Thirst (1 question) ──
        {
          questionText: 'How do you experience thirst?',
          questionCategory: 'appetite',
          options: [
            { label: 'Variable — sometimes forget to drink, dry mouth', vataScore: 3, pittaScore: 0, kaphaScore: 0 },
            { label: 'Strong thirst, need cold drinks, drink large quantities', vataScore: 0, pittaScore: 3, kaphaScore: 0 },
            { label: 'Mild thirst, can go long without water, prefer warm drinks', vataScore: 0, pittaScore: 0, kaphaScore: 3 },
          ],
          weight: 0.8, orderIndex: 17,
        },
        // ── Climate Preference (1 question) ──
        {
          questionText: 'Which climate makes you feel best?',
          questionCategory: 'climate',
          options: [
            { label: 'Warm, humid — I hate cold and wind', vataScore: 3, pittaScore: 0, kaphaScore: 0 },
            { label: 'Cool — I overheat easily, love AC and cold weather', vataScore: 0, pittaScore: 3, kaphaScore: 0 },
            { label: 'Warm and dry — I dislike cold, damp, rainy weather', vataScore: 0, pittaScore: 0, kaphaScore: 3 },
          ],
          weight: 1.0, orderIndex: 18,
        },
        // ── Mental Activity (1 question) ──
        {
          questionText: 'How is your learning and memory style?',
          questionCategory: 'mental',
          options: [
            { label: 'Quick to learn but quick to forget, scattered thinking', vataScore: 3, pittaScore: 0, kaphaScore: 0 },
            { label: 'Sharp, focused learner, good memory, analytical mind', vataScore: 0, pittaScore: 3, kaphaScore: 0 },
            { label: 'Slow to learn but never forget, steady, methodical', vataScore: 0, pittaScore: 0, kaphaScore: 3 },
          ],
          weight: 1.0, orderIndex: 19,
        },
        // ── Speech & Voice (1 question) ──
        {
          questionText: 'How do others describe your speech?',
          questionCategory: 'speech',
          options: [
            { label: 'Fast, talkative, jumps between topics, expressive', vataScore: 3, pittaScore: 0, kaphaScore: 0 },
            { label: 'Clear, sharp, precise, persuasive, sometimes cutting', vataScore: 0, pittaScore: 3, kaphaScore: 0 },
            { label: 'Slow, calm, measured, melodious, soothing voice', vataScore: 0, pittaScore: 0, kaphaScore: 3 },
          ],
          weight: 0.8, orderIndex: 20,
        },
        // ── Walking / Movement (1 question) ──
        {
          questionText: 'How do you walk?',
          questionCategory: 'movement',
          options: [
            { label: 'Fast, light steps, often in a hurry, look around a lot', vataScore: 3, pittaScore: 0, kaphaScore: 0 },
            { label: 'Purposeful, medium pace, goal-directed, confident', vataScore: 0, pittaScore: 3, kaphaScore: 0 },
            { label: 'Slow, steady, graceful, unhurried, heavy steps', vataScore: 0, pittaScore: 0, kaphaScore: 3 },
          ],
          weight: 0.8, orderIndex: 21,
        },
        // ── Sweating (1 question) ──
        {
          questionText: 'How much do you sweat?',
          questionCategory: 'body_type',
          options: [
            { label: 'Very little, even in heat — dry skin persists', vataScore: 3, pittaScore: 0, kaphaScore: 0 },
            { label: 'Profusely, even with moderate activity, body runs hot', vataScore: 0, pittaScore: 3, kaphaScore: 0 },
            { label: 'Moderate, mainly with exertion, pleasant body smell', vataScore: 0, pittaScore: 0, kaphaScore: 3 },
          ],
          weight: 0.8, orderIndex: 22,
        },
      ],
    })
    console.log('✅ 22 dosha assessment questions inserted')
  } else {
    console.log(`⏭  Skipping dosha questions (${doshaQCount} already exist)`)
  }

  console.log('🌿 Seed complete!')
}

main()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
