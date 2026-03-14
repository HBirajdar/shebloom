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
          fullName: 'Dr. Shruthi R',
          specialization: 'Ayurvedic Women\'s Health & Wellness',
          qualifications: ['BAMS', 'MD (Ayurveda — Streeroga & Prasuti Tantra)', 'Panchakarma Specialist', 'Certified Yoga Therapist'],
          experienceYears: 10,
          consultationFee: 500,
          hospitalName: 'VedaClue Ayurveda Clinic',
          bio: 'Dr. Shruthi R is the founder and chief Ayurvedic physician at VedaClue. With over 10 years of experience in Streeroga (Ayurvedic Gynecology), she specializes in PCOD/PCOS management, menstrual health, fertility support, and prenatal care through traditional Ayurvedic protocols. She personally formulates every product in the VedaClue range using herbs sourced from organic farms in Kerala and Karnataka. Her mission is to make authentic, science-backed Ayurveda accessible to every woman.',
          tags: ['Ayurveda', 'PCOD', 'Fertility', 'Menstrual Health', 'Pregnancy', 'Panchakarma', 'Dosha', 'Herbal Medicine'],
          languages: ['ENGLISH', 'HINDI', 'KANNADA', 'MARATHI'],
          rating: 4.9,
          totalReviews: 312,
          isVerified: true,
          isAvailable: true,
          isPublished: true,
          isChief: true,
          isPromoted: true,
          status: 'active',
          location: 'Pune, Maharashtra',
        },
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
          isPublished: true,
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
          isPublished: true,
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
          isPublished: true,
        },
      ],
    })
    console.log('✅ 4 doctors inserted (Dr. Shruthi R as Chief)')
  } else {
    console.log(`⏭  Skipping doctors (${doctorCount} already exist)`)
  }

  // ─── ENSURE CHIEF DOCTOR EXISTS ────────────────────
  // If doctors already existed but Dr. Shruti R isn't there yet, upsert her
  const chiefExists = await prisma.doctor.findFirst({ where: { isChief: true } })
  if (!chiefExists) {
    console.log('Adding Dr. Shruthi R as Chief Doctor...')
    await prisma.doctor.create({
      data: {
        fullName: 'Dr. Shruthi R',
        specialization: 'Ayurvedic Women\'s Health & Wellness',
        qualifications: ['BAMS', 'MD (Ayurveda — Streeroga & Prasuti Tantra)', 'Panchakarma Specialist', 'Certified Yoga Therapist'],
        experienceYears: 10,
        consultationFee: 500,
        hospitalName: 'VedaClue Ayurveda Clinic',
        bio: 'Dr. Shruthi R is the founder and chief Ayurvedic physician at VedaClue. With over 10 years of experience in Streeroga (Ayurvedic Gynecology), she specializes in PCOD/PCOS management, menstrual health, fertility support, and prenatal care through traditional Ayurvedic protocols. She personally formulates every product in the VedaClue range using herbs sourced from organic farms in Kerala and Karnataka. Her mission is to make authentic, science-backed Ayurveda accessible to every woman.',
        tags: ['Ayurveda', 'PCOD', 'Fertility', 'Menstrual Health', 'Pregnancy', 'Panchakarma', 'Dosha', 'Herbal Medicine'],
        languages: ['ENGLISH', 'HINDI', 'KANNADA', 'MARATHI'],
        rating: 4.9,
        totalReviews: 312,
        isVerified: true,
        isAvailable: true,
        isPublished: true,
        isChief: true,
        isPromoted: true,
        status: 'approved',
        location: 'Pune, Maharashtra',
      },
    })
    console.log('✅ Dr. Shruthi R added as Chief Doctor')
  } else {
    console.log(`⏭  Chief doctor already exists: ${chiefExists.fullName}`)
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

  // ─── DOSHA PHASE GUIDANCE (12 entries) ──────────────
  console.log('Seeding dosha phase guidance...')
  const phaseGuidanceData = [
    // ── Vata ──
    {
      dosha: 'Vata', phase: 'menstrual',
      dominantDosha: 'Apana Vata governs downward flow (Charaka Samhita)',
      imbalanceRisk: 'Irregular flow, cramping, scanty bleeding, anxiety',
      dietTips: [
        'Warm sesame oil-cooked foods — grounding & Vata-pacifying',
        'Iron-rich: dates, pomegranate, black sesame, jaggery',
        'Ghee with warm milk + pinch of turmeric (Haldi Doodh)',
        'Moong dal khichdi — easy to digest, nourishing',
        'Avoid raw/cold foods, salads, iced drinks',
      ],
      herbTips: [
        'Dashmool Kwath — 10-root decoction, calms Vata, relieves cramps (Charaka Chi.30)',
        'Ashoka bark (Saraca indica) — Artava Sthapana, regulates flow',
        'Shatavari — nourishes Rasa dhatu, balances hormones',
        'Ajwain water — relieves bloating and spasmodic pain',
      ],
      yogaTips: [
        'Supta Baddha Konasana (reclined butterfly) — opens pelvis',
        'Balasana (child pose) — calms Vata, relieves lower back',
        'Gentle Pranayama: Nadi Shodhana (alternate nostril) — balances Vata',
        'Avoid inversions, intense cardio during menstruation',
      ],
      lifestyleTips: [
        'Abhyanga (warm sesame oil massage) on lower abdomen & feet',
        'Warm castor oil pack on lower belly for cramp relief',
        'Early sleep by 10 PM — Vata aggravates in late night (2-6 AM)',
        'Rest and reduce workload — Rajahsvala Paricharya (menstrual regimen)',
      ],
      avoidList: ['Cold beverages', 'Intense exercise', 'Fasting', 'Late nights', 'Excessive travel'],
      modernCorrelation: 'Prostaglandins peak → uterine contractions. Warm foods ↑ blood flow, reduce spasm (matches Vata-pacifying approach). Magnesium + iron supplementation clinically proven for dysmenorrhea.',
    },
    {
      dosha: 'Vata', phase: 'follicular',
      dominantDosha: 'Kapha rises as endometrium rebuilds (anabolic phase)',
      imbalanceRisk: 'Low energy, sluggishness if Vata depleted from menstruation',
      dietTips: [
        'Gradually increase protein: paneer, legumes, nuts, seeds',
        'Ashwagandha milk — adaptogenic, rebuilds Ojas (vitality)',
        'Seasonal fruits, warm soups, cooked vegetables',
        'Flaxseeds — phytoestrogens support follicular development',
      ],
      herbTips: [
        'Ashwagandha (standardized root extract, as directed by practitioner) — adaptogenic, reduces cortisol (Withania somnifera)',
        'Shatavari — phytoestrogenic, supports follicle maturation',
        'Guduchi (Tinospora) — Rasayana, builds immunity post-period',
        'Triphala at night — gentle detox, supports digestion',
      ],
      yogaTips: [
        'Sun Salutations (Surya Namaskar) — building energy',
        'Standing poses: Virabhadrasana I & II — strength & grounding',
        'Kapalabhati Pranayama — stimulates metabolism',
        'Gradually increase intensity as energy returns',
      ],
      lifestyleTips: [
        'Rise before sunrise (Brahma Muhurta) — peak Vata time for creativity',
        'Warm oil massage before bath — nourishes Vata',
        'Start new projects — estrogen rising = peak creativity & confidence',
        'Socialize — this is your most extroverted phase',
      ],
      avoidList: ['Excessive fasting', 'Irregular meal times', 'Cold/dry foods'],
      modernCorrelation: 'Rising estradiol stimulates follicular growth. Phytoestrogens (flax, shatavari) may support FSH sensitivity. Ashwagandha reduces cortisol by 28% (Chandrasekhar 2012 IJAM).',
    },
    {
      dosha: 'Vata', phase: 'ovulation',
      dominantDosha: 'Pitta peaks — Artava (ovum) is Agneya (fiery) in nature',
      imbalanceRisk: 'Excess heat, irritability, skin breakouts',
      dietTips: [
        'Cooling foods: cucumber, coconut water, mint chutney, fennel',
        'Rose petal jam (Gulkand) — cools Pitta, supports Shukra dhatu',
        'Pomegranate — Pitta-pacifying, rich in antioxidants',
        'Light meals — Agni (digestive fire) is moderate',
      ],
      herbTips: [
        'Shatavari — peak fertility support, nourishes Artava',
        'Yashtimadhu (Licorice) — cooling, anti-inflammatory (avoid if hypertensive; limit to 4-6 weeks)',
        'Gulkand (rose petal preserve) or food-grade rose water (Arq-e-Gulab) — cools Pitta, calms mind',
        'Kumari (Aloe vera) — Pitta-pacifying, supports cervical mucus',
      ],
      yogaTips: [
        'Hip openers: Pigeon pose, Malasana (garland) — pelvic circulation',
        'Sheetali Pranayama (cooling breath) — cools excess Pitta',
        'Moderate cardio — peak strength window',
        'Partner yoga if TTC — bonding hormone release',
      ],
      lifestyleTips: [
        'Moonlight walks — cooling, romantic (Chandra Namaskar energy)',
        'Wear white/light colors — reflects heat, calms Pitta',
        'If TTC: this is Ritu Kala — optimal conception window (Ashtanga Hridaya)',
        'Intercourse timing: egg-white CM + positive LH = peak 24-48h window',
      ],
      avoidList: ['Spicy food', 'Excessive sun', 'Hot baths', 'Anger/arguments'],
      modernCorrelation: 'LH surge triggers ovulation within 24-48h. Egg viable 12-24h. Body temp rises 0.2-0.5°C (BBT shift). Cervical mucus becomes egg-white consistency — 94.5% ovulation sensitivity (Bigelow 2004).',
    },
    {
      dosha: 'Vata', phase: 'luteal',
      dominantDosha: 'Vata begins to accumulate, Pitta sustains corpus luteum',
      imbalanceRisk: 'PMS: anxiety (Vata), irritability (Pitta), water retention (Kapha)',
      dietTips: [
        'Complex carbs: sweet potato, whole grains — serotonin support',
        'Magnesium-rich: pumpkin seeds, dark chocolate, spinach',
        'Warm turmeric latte — anti-inflammatory, Pitta-calming',
        'Sesame-jaggery laddoo — iron + warmth for Vata',
      ],
      herbTips: [
        'Ashoka bark — Pitta-Kapha balance, prevents heavy upcoming flow',
        'Shankhpushpi — calms anxiety, supports progesterone (Vata-Pitta)',
        'Brahmi — reduces mental agitation, improves sleep',
        'Lodhra (Symplocos) — Kapha-pacifying, prevents water retention',
      ],
      yogaTips: [
        'Restorative: Viparita Karani (legs up wall) — calms nervous system',
        'Yin yoga — slow, grounding, Vata-pacifying',
        'Yoga Nidra — deep relaxation, reduces PMS symptoms',
        'Reduce intensity gradually as period approaches',
      ],
      lifestyleTips: [
        'Journal/reflect — progesterone = introspective energy',
        'Warm baths with Epsom salt — magnesium absorption through skin',
        'Digital sunset by 8 PM — blue light disrupts melatonin',
        'Prepare for upcoming period: stock warm foods, plan lighter schedule',
      ],
      avoidList: ['Caffeine excess', 'Sugar binges', 'Late nights', 'Over-scheduling'],
      modernCorrelation: 'Progesterone dominates: ↑ body temp, ↑ appetite, ↓ serotonin. If no implantation, corpus luteum degrades → progesterone crash → PMS. Magnesium reduces PMS severity by 40% (Quaranta 2007).',
    },
    // ── Pitta ──
    {
      dosha: 'Pitta', phase: 'menstrual',
      dominantDosha: 'Pitta dominant — Rakta (blood) is Pitta\'s seat',
      imbalanceRisk: 'Heavy bleeding, clots, headaches, hot flashes, irritability',
      dietTips: [
        'Cooling: coconut water, cucumber raita, coriander water',
        'Iron replenishment: beetroot juice, pomegranate, dates',
        'Gulkand (rose petal preserve) — classic Pitta coolant',
        'Avoid spicy, fermented, sour foods during bleeding',
      ],
      herbTips: [
        'Ashoka bark — primary herb for Pittaja Yoniroga (heavy periods)',
        'Ushira (Vetiver) water — cools Rakta dhatu, reduces heavy flow',
        'Durva grass (Cynodon) — Raktastambhana (stops excess bleeding)',
        'Chandanadi Vati — sandalwood-based, cools internal heat',
      ],
      yogaTips: [
        'Sheetali/Sheetkari Pranayama — cooling breaths for Pitta',
        'Supta Virasana (reclined hero) — cools abdomen',
        'Gentle forward bends — calming without heating',
        'Chandra Namaskar (moon salutation) — cooling alternative to Surya',
      ],
      lifestyleTips: [
        'Cool compress on forehead if headaches occur',
        'Coconut oil massage instead of sesame (too heating for Pitta)',
        'Sleep in cool, well-ventilated room',
        'Practice Pitta-calming meditation: visualization of moonlight/water',
      ],
      avoidList: ['Spicy food', 'Sun exposure', 'Hot baths', 'Competitive activities', 'Alcohol'],
      modernCorrelation: 'Pitta prakriti correlates with higher estradiol levels and shorter cycles (Priyanka 2020). Heavy menstrual bleeding (menorrhagia) is clinical when >80ml/cycle. Iron deficiency risk is real — supplement with Vitamin C for absorption.',
    },
    {
      dosha: 'Pitta', phase: 'follicular',
      dominantDosha: 'Kapha rebuilding phase, Pitta cooling naturally',
      imbalanceRisk: 'Skin inflammation, acid reflux if Pitta still elevated',
      dietTips: [
        'Bitter greens: neem juice (small dose), bitter gourd, methi',
        'Sweet fruits: grapes, melons, pears — naturally Pitta-cooling',
        'Moderate protein: mung beans, tofu, cooling fish',
        'Fresh mint + fennel water throughout the day',
      ],
      herbTips: [
        'Amalaki (Indian Gooseberry) — Pitta Rasayana, vitamin C rich',
        'Neem — blood purifier, skin-clearing (Pitta tends to breakouts)',
        'Shatavari — supports estrogen rise without overheating',
        'Aloe vera juice — cools digestive Pitta',
      ],
      yogaTips: [
        'Moderate Vinyasa — channel Pitta energy productively',
        'Twists for detox: Ardha Matsyendrasana — liver/digestion support',
        'Swimming — ideal for Pitta (cooling exercise)',
        'Trataka (candle gazing) — focuses Pitta mind without agitation',
      ],
      lifestyleTips: [
        'Channel ambition into creative projects — Pitta peak productivity',
        'Eat meals on schedule — Pitta needs regular Agni management',
        'Nature walks near water — rivers, lakes cool Pitta',
        'Practice compassion meditation — Pitta tends toward criticism',
      ],
      avoidList: ['Skipping meals', 'Over-working', 'Excessive competition'],
      modernCorrelation: 'Follicular phase: estradiol rises → skin improves, energy peaks. For Pitta types with acne: zinc + neem shown to reduce inflammatory acne by 50% (Yee 2020 Dermatol Ther).',
    },
    {
      dosha: 'Pitta', phase: 'ovulation',
      dominantDosha: 'Peak Pitta — ovulation itself is an Agneya (fiery) event',
      imbalanceRisk: 'Ovulation pain (mittelschmerz), excess heat, skin flares',
      dietTips: [
        'Maximum cooling: raw coconut, watermelon, khus sherbet',
        'Rose sherbet with sabja seeds — classic Pitta recipe',
        'Fennel + coriander seed tea — digestive cooling',
        'Light meals — strong Agni needs less fuel',
      ],
      herbTips: [
        'Shatavari (peak dose during fertile window, as directed by practitioner)',
        'Kumari (Aloe) — cools uterine Pitta, supports CM quality',
        'Rose water — internal cooling, emotional balance',
        'Brahmi — calms Pitta mind, reduces over-thinking',
      ],
      yogaTips: [
        'Dynamic flow — Pitta has maximum power at ovulation',
        'Hip openers with breath focus — pelvic energy flow',
        'Cooling Pranayama after exercise — Sheetali + Brahmari',
        'Dance/creative movement — express Pitta fire constructively',
      ],
      lifestyleTips: [
        'If TTC: peak window — Ritu Kala (Ashtanga Hridaya Sha.1)',
        'Keep emotions cool — Pitta temper peaks with hormones',
        'Apply sandalwood paste on pulse points — Pitta cooling ritual',
        'Evening walks — avoid midday sun',
      ],
      avoidList: ['Arguments', 'Spicy food', 'Midday sun', 'Over-exercising'],
      modernCorrelation: 'Pitta types may experience stronger mittelschmerz (ovulation pain) due to inflammatory tendency. NSAIDs work but cooling herbs offer gentler approach. Cervical mucus quality peaks — egg-white CM is the fertility gold standard.',
    },
    {
      dosha: 'Pitta', phase: 'luteal',
      dominantDosha: 'Pitta sustains corpus luteum, Vata begins rising',
      imbalanceRisk: 'Anger, migraines, skin breakouts, acid reflux, insomnia',
      dietTips: [
        'Anti-inflammatory: turmeric + black pepper, omega-3 rich foods',
        'Bitter + sweet tastes: kale, dates, almonds, milk',
        'Chamomile + lavender tea before bed',
        'Small frequent meals — prevent Pitta acid spikes',
      ],
      herbTips: [
        'Shankhpushpi — calms Pitta-aggravated mind',
        'Brahmi — neuroprotective, reduces PMS irritability',
        'Yashtimadhu — soothes digestive Pitta (avoid if hypertensive; limit to 4-6 weeks)',
        'Triphala — gentle detox, prepare for upcoming flow',
      ],
      yogaTips: [
        'Cooling Yin yoga — long holds, surrender',
        'Forward folds — calms nervous system',
        'Supported backbends — open chest without strain',
        'Brahmari Pranayama (humming bee) — immediate Pitta calm',
      ],
      lifestyleTips: [
        'Early dinner by 7 PM — allow digestive rest',
        'Moonlight meditation — cooling, Pitta-balancing',
        'Cool room for sleep — Pitta insomnia worsens in heat',
        'Creative outlet: painting, music — channel PMS intensity positively',
      ],
      avoidList: ['Spicy food', 'Alcohol', 'Late dinners', 'Heated arguments', 'Overworking'],
      modernCorrelation: 'Progesterone is thermogenic — Pitta types feel this more intensely. Migraines linked to estrogen withdrawal pre-menstrually. Magnesium + riboflavin shown to reduce menstrual migraines by 50% (Mauskop 2012).',
    },
    // ── Kapha ──
    {
      dosha: 'Kapha', phase: 'menstrual',
      dominantDosha: 'Kapha tendency — heavier, longer, more mucoid flow',
      imbalanceRisk: 'Heavy flow with clots, lethargy, water retention, emotional eating',
      dietTips: [
        'Light, warm, stimulating: ginger tea, pepper, dry foods',
        'Avoid dairy, sweets, heavy foods during period',
        'Warm water with lemon + honey — Kapha-reducing morning drink',
        'Spiced mung soup — light, warm, easy to digest',
      ],
      herbTips: [
        'Lodhra (Symplocos racemosa) — #1 herb for Kaphaja Yoniroga',
        'Trikatu (ginger-pepper-pippali) — kindles Agni, reduces Kapha',
        'Guggulu — anti-inflammatory, reduces water retention',
        'Triphala — prevents sluggish elimination',
        'Manjistha (Rubia cordifolia) — Rakta Shodhaka, blood purifier, reduces clots',
      ],
      yogaTips: [
        'Gentle Surya Namaskar — keep energy moving (Kapha stagnates)',
        'Twist poses — squeeze out Kapha from tissues',
        'Kapalabhati (skull-shining breath) — energizing, Kapha-reducing',
        'Even during period, light movement prevents Kapha buildup',
      ],
      lifestyleTips: [
        'Dry brush (Garshana) before shower — stimulates lymphatic flow',
        'Warm herbal steam — reduces congestion (Kapha = mucus)',
        'Don\'t oversleep — Kapha people tend to excess sleep during period',
        'Stay warm — cold increases Kapha and worsens water retention',
      ],
      avoidList: ['Cold foods', 'Dairy', 'Oversleeping', 'Inactivity', 'Heavy meals'],
      modernCorrelation: 'Kapha prakriti associated with higher BMI, longer cycles, heavier flow (Priyanka 2020). Water retention is prostaglandin-mediated. Light exercise during menstruation reduces bloating by 30% (Daley 2009 BJOG).',
    },
    {
      dosha: 'Kapha', phase: 'follicular',
      dominantDosha: 'Kapha naturally dominant — endometrium rebuilding (anabolic)',
      imbalanceRisk: 'Weight gain, sluggishness, congestion',
      dietTips: [
        'Stimulating spices: turmeric, black pepper, cumin, mustard seeds',
        'Light proteins: chickpeas, sprouts, grilled vegetables',
        'Honey in warm water — Kapha-reducing (never heat honey directly)',
        'Cruciferous vegetables: broccoli, cauliflower — support estrogen metabolism',
      ],
      herbTips: [
        'Guggulu — thyroid support, weight management (Kapha tendency)',
        'Punarnava — kidney tonic, reduces water retention',
        'Chitrak (Plumbago) — kindles digestive fire',
        'Tulsi — adaptogenic, lightens Kapha heaviness',
      ],
      yogaTips: [
        'Vigorous Vinyasa or Ashtanga — peak time to challenge Kapha',
        'Backbends: Ustrasana, Bhujangasana — open chest, reduce Kapha',
        'Running, HIIT — Kapha benefits from intense cardio',
        'Bhastrika Pranayama (bellows breath) — ignites Agni',
      ],
      lifestyleTips: [
        'Wake before 6 AM — avoid Kapha time (6-10 AM = sluggishness)',
        'Dry sauna or steam — reduces Kapha and water weight',
        'Start challenging projects — estrogen energy + Kapha stability = productivity',
        'Reduce screen time — increase physical activity',
      ],
      avoidList: ['Oversleeping', 'Heavy breakfast', 'Dairy', 'Sedentary behavior'],
      modernCorrelation: 'Follicular estrogen rise in Kapha types may cause more fluid retention. Cruciferous vegetables contain DIM (diindolylmethane) which supports healthy estrogen metabolism — clinically relevant for PCOS-prone Kapha types.',
    },
    {
      dosha: 'Kapha', phase: 'ovulation',
      dominantDosha: 'Pitta temporarily peaks — ovulation is universal Pitta event',
      imbalanceRisk: 'Bloating, mild acne from hormone surge',
      dietTips: [
        'Balance Kapha-Pitta: warm but not too spicy',
        'Moderate portions — resist Kapha urge to overeat',
        'Fresh ginger before meals — supports Agni',
        'Bitter salads with warm dressing — Kapha + Pitta pacifying',
      ],
      herbTips: [
        'Shatavari — fertility support (universal for all doshas at ovulation)',
        'Ashwagandha — adaptogenic, supports Shukra dhatu',
        'Pippali (long pepper) — stimulates without overheating',
        'Brahmi — focus and clarity',
      ],
      yogaTips: [
        'Power yoga or sport — peak physical performance',
        'Hip openers with dynamic movement — not static',
        'Team sports — Kapha thrives with social energy',
        'Agni Sara — abdominal churning, stimulates Kapha center',
      ],
      lifestyleTips: [
        'If TTC: be consistent with timing — Kapha benefits from routine',
        'Social activities — Kapha ovulation = peak charm and warmth',
        'Reduce sugar and dairy — prevent Kapha-related CM mucus issues',
        'Short, energizing showers — not long soaks',
      ],
      avoidList: ['Heavy meals', 'Excessive dairy', 'Napping', 'Sugar'],
      modernCorrelation: 'Ovulation window for Kapha types: cervical mucus may be thicker/more opaque than textbook egg-white. Track CM changes relative to YOUR baseline, not generic descriptions.',
    },
    {
      dosha: 'Kapha', phase: 'luteal',
      dominantDosha: 'Kapha increases pre-menstrually — water + earth elements',
      imbalanceRisk: 'Severe water retention, emotional eating, depression, lethargy',
      dietTips: [
        'Anti-Kapha: warm, light, spiced — no comfort food binging',
        'Warm spiced apple or pear — sweet taste without Kapha increase',
        'Ginger-lemon water throughout day — metabolism support',
        'Avoid: cheese, ice cream, bread, pasta (worst Kapha foods)',
      ],
      herbTips: [
        'Punarnava — #1 for Kapha water retention',
        'Trikatu — maintains Agni as Kapha rises',
        'Guggulu — mood support, thyroid balance',
        'Jatamansi (Nardostachys jatamansi) — clears Kapha mental fog',
      ],
      yogaTips: [
        'Maintain exercise — DON\'T give in to Kapha lethargy',
        'Backbends and chest openers — counter Kapha heaviness',
        'Ujjayi Pranayama — warming, focusing breath',
        'Group classes — accountability prevents Kapha avoidance',
      ],
      lifestyleTips: [
        'Don\'t comfort eat — recognize it as Kapha PMS pattern',
        'Morning exercise non-negotiable — prevents spiraling lethargy',
        'Dry brushing daily — moves lymph, reduces bloating',
        'Plan social commitments — Kapha PMS = isolation tendency',
      ],
      avoidList: ['Comfort food', 'Isolation', 'Sleeping past 7 AM', 'Skipping exercise', 'Dairy'],
      modernCorrelation: 'Kapha PMS is dominated by water retention (up to 3-5 lbs) and emotional eating driven by serotonin drop. Regular exercise maintains serotonin. Dandelion tea (similar to Punarnava) clinically reduces water retention.',
    },
  ]
  for (const g of phaseGuidanceData) {
    await prisma.doshaPhaseGuidance.upsert({
      where: { dosha_phase: { dosha: g.dosha, phase: g.phase } },
      update: { dietTips: g.dietTips, herbTips: g.herbTips, yogaTips: g.yogaTips, lifestyleTips: g.lifestyleTips, avoidList: g.avoidList, dominantDosha: g.dominantDosha, imbalanceRisk: g.imbalanceRisk, modernCorrelation: g.modernCorrelation },
      create: g,
    })
  }
  console.log('✅ 12 dosha phase guidance entries seeded')

  // ─── AI CHAT RESPONSES ──────────────────────────────
  console.log('Seeding AI chat responses...')
  const chatResponses = [
    {
      patternName: 'cramps',
      regexPattern: 'cramp|pain|period pain|dysmenorrhea',
      responseText: 'For period cramps, try: 1) Apply heat to your lower abdomen for 20 minutes 2) Ginger tea with honey reduces prostaglandins 3) Gentle child\'s pose yoga 4) Magnesium glycinate supplements (consult your doctor first). If pain is severe, please see a healthcare provider.',
      category: 'wellness',
      priority: 10,
    },
    {
      patternName: 'pcos',
      regexPattern: 'pcod|pcos|polycystic',
      responseText: 'For PCOS management: focus on a low-glycaemic diet (whole grains, legumes, vegetables), regular moderate exercise, stress reduction (yoga works brilliantly), and adequate sleep. Always work with your gynaecologist to tailor a plan for your specific hormone profile.',
      category: 'wellness',
      priority: 10,
    },
    {
      patternName: 'fertility',
      regexPattern: 'pregnant|pregnancy|conceive|fertility|trying to conceive|ttc',
      responseText: 'When trying to conceive, track your fertile window (5 days before + day of ovulation). Folic acid (400mcg daily), maintaining a healthy weight, and reducing stress all improve fertility. I recommend consulting a fertility specialist if you\'ve been trying for 12+ months (or 6 months if over 35).',
      category: 'fertility',
      priority: 10,
    },
    {
      patternName: 'stress',
      regexPattern: 'stress|anxiety|mood|mental health|depressed|sad',
      responseText: 'Hormonal fluctuations throughout your cycle directly affect mood. Some strategies: 1) Track your mood daily to spot patterns 2) Try 4-7-8 breathing during anxiety spikes 3) Omega-3s and B vitamins support brain chemistry 4) Adequate sleep (7-9 hours) is crucial. Reach out to a mental health professional if you feel persistently low.',
      category: 'wellness',
      priority: 9,
    },
    {
      patternName: 'sleep',
      regexPattern: 'sleep|insomnia|tired|fatigue|exhausted',
      responseText: 'Hormones affect sleep quality throughout your cycle — progesterone in the luteal phase can cause fatigue while pre-period estrogen drops disturb sleep. Tips: maintain a consistent sleep schedule, avoid screens 1 hour before bed, try magnesium glycinate, and keep your bedroom cool (18-20°C is ideal).',
      category: 'wellness',
      priority: 8,
    },
    {
      patternName: 'diet',
      regexPattern: 'diet|food|eat|nutrition|weight',
      responseText: 'Eating in sync with your cycle is powerful: Menstrual — iron-rich foods; Follicular — fermented foods, sprouts; Ovulation — antioxidant-rich foods (berries, leafy greens); Luteal — complex carbs, magnesium. Avoid ultra-processed foods and excess sugar throughout, as they worsen hormonal imbalance.',
      category: 'wellness',
      priority: 7,
    },
    {
      patternName: 'exercise',
      regexPattern: 'exercise|workout|yoga|gym|fitness',
      responseText: 'Cycle-syncing your workouts: Menstrual — gentle stretching, walking, yin yoga; Follicular — increasing cardio, pilates, dance; Ovulation — HIIT, strength training, running; Luteal — moderate yoga, swimming, light weights. Listen to your body — it knows what it needs!',
      category: 'wellness',
      priority: 7,
    },
    {
      patternName: 'ayurveda',
      regexPattern: 'ayurveda|herb|natural|home remedy|dosha',
      responseText: 'Ayurvedic support for cycles: Shatavari (hormone balance), Ashwagandha (stress adaptogen), Triphala (digestion), and Turmeric (anti-inflammatory). Please consult an Ayurvedic practitioner before starting supplements — dosage and combinations matter for your specific constitution (dosha).',
      category: 'ayurveda',
      priority: 8,
    },
    {
      patternName: 'late_period',
      regexPattern: 'late period|missed period|irregular|spotting|delayed period|period delay|period late|not getting period',
      responseText: 'Late or irregular periods can be caused by stress, sleep disruption, significant weight changes, thyroid issues, PCOS, or early pregnancy. A single late period is often stress-related.\n\n\u{1F33F} Ayurvedic remedies: Shatavari (hormone balance), Ashoka bark (uterine health), Ashwagandha (stress relief). Try warm ginger-jaggery water twice daily, sesame seeds with honey, and warm oil self-massage (Abhyanga). Yoga poses like Baddha Konasana and Supta Virasana help stimulate pelvic blood flow.\n\n\u26A0\uFE0F See a doctor if: period is 2+ weeks late, you have severe pain or unusual discharge, there\'s a possibility of pregnancy, or you have a history of PCOS/thyroid issues.\n\nCheck your Dashboard and Tracker for personalized dosha-specific guidance!',
      category: 'medical',
      priority: 10,
    },
  ]
  for (const r of chatResponses) {
    await prisma.aIChatResponse.upsert({
      where: { patternName: r.patternName },
      update: { responseText: r.responseText, regexPattern: r.regexPattern, category: r.category, priority: r.priority },
      create: r,
    })
  }
  console.log('✅ AI chat responses seeded')

  // ─── AYURVEDIC REMEDIES ─────────────────────────────
  console.log('Seeding Ayurvedic remedies...')
  const remedies = [
    {
      condition: 'general', dosha: 'all',
      herbNameSanskrit: 'Shatavari', herbNameEnglish: 'Asparagus racemosus',
      botanicalName: 'Asparagus racemosus',
      benefitText: 'Premier female reproductive tonic. Supports hormonal balance, follicular development, and fertility.',
      safetyNote: 'Traditionally considered safe in pregnancy (Garbhini Paricharya). However, consult your OB-GYN before use. May have phytoestrogenic effects.',
      pregnancySafety: 'caution',
      sourceReference: 'Charaka Su. 4/18; Joshi 2016 J Ayurveda Integr Med; API monograph',
    },
    {
      condition: 'general', dosha: 'all',
      herbNameSanskrit: 'Ashwagandha', herbNameEnglish: 'Winter Cherry',
      botanicalName: 'Withania somnifera',
      benefitText: 'Adaptogenic herb that reduces cortisol, supports stress response, and improves female sexual function.',
      safetyNote: 'AVOID during pregnancy. Classified as Garbhapata (abortifacient) in some classical texts. May stimulate uterine contractions.',
      pregnancySafety: 'avoid',
      sourceReference: 'Charaka Chi. 1; Chandrasekhar 2012 IJAM; Lopresti 2019; KSM-66 standardized extract',
    },
    {
      condition: 'heavy_flow', dosha: 'Pitta',
      herbNameSanskrit: 'Ashoka', herbNameEnglish: 'Ashoka Tree Bark',
      botanicalName: 'Saraca indica (Saraca asoca)',
      benefitText: 'Primary herb for Raktapradar (menorrhagia) and Shvetapradar (leucorrhea). Has oxytocin-like uterine activity.',
      safetyNote: 'STRICTLY AVOID during pregnancy. Has oxytocin-like uterine stimulant activity. Can induce contractions and is an abortifacient.',
      pregnancySafety: 'contraindicated',
      sourceReference: 'Bhavaprakasha; Sharma 2018 J Ethnopharmacol; Ashokarishta classical preparation',
    },
    {
      condition: 'general', dosha: 'Vata',
      herbNameSanskrit: 'Brahmi', herbNameEnglish: 'Brahmi',
      botanicalName: 'Bacopa monnieri',
      benefitText: 'Medhya Rasayana (brain tonic). First-line for anxiety, memory, and cognitive function. Reduces PMS-related mental agitation.',
      safetyNote: 'Limited pregnancy safety data. Traditional use suggests caution. Consult healthcare provider before use during pregnancy.',
      pregnancySafety: 'caution',
      sourceReference: 'Charaka Su. 1; Stough 2001; Roodenrys 2002',
    },
    {
      condition: 'heavy_flow', dosha: 'Kapha',
      herbNameSanskrit: 'Lodhra', herbNameEnglish: 'Lodh Tree Bark',
      botanicalName: 'Symplocos racemosa',
      benefitText: 'Grahi (absorbent), Stambhana (astringent) — stops excessive menstrual flow. Used in Pushyanuga Churna for menorrhagia.',
      safetyNote: 'Not recommended during pregnancy. Primarily used for menorrhagia and leucorrhea — not appropriate in pregnancy context.',
      pregnancySafety: 'avoid',
      sourceReference: 'Bhavaprakasha Nighantu; API Monograph; Pushyanuga Churna classical formulation',
    },
    {
      condition: 'general', dosha: 'all',
      herbNameSanskrit: 'Triphala', herbNameEnglish: 'Three Fruits',
      botanicalName: 'Amalaki + Bibhitaki + Haritaki',
      benefitText: 'Tridoshahara — balances all three doshas. Universal Rasayana with antioxidant, anti-inflammatory, and gentle laxative properties.',
      safetyNote: 'Haritaki component is traditionally avoided in pregnancy (mild uterine stimulant). Use only under practitioner guidance.',
      pregnancySafety: 'caution',
      sourceReference: 'Charaka Su. 5; Peterson 2017 J Altern Complement Med; WHO Traditional Medicine monograph',
    },
    {
      condition: 'general', dosha: 'Kapha',
      herbNameSanskrit: 'Guggulu', herbNameEnglish: 'Indian Bdellium',
      botanicalName: 'Commiphora mukul',
      benefitText: 'Medoroga (obesity) treatment cornerstone. Anti-inflammatory, reduces water retention, supports thyroid function.',
      safetyNote: 'AVOID in pregnancy. Uterine stimulant activity. May cause miscarriage. Also avoid if planning conception.',
      pregnancySafety: 'contraindicated',
      sourceReference: 'Sushruta Guggulu Panchapala; Urizar & Moore 2003; Singh 1994',
    },
  ]
  for (const r of remedies) {
    const id = r.herbNameSanskrit.toLowerCase().replace(/\s/g, '-') + '-' + r.condition
    await prisma.ayurvedicRemedy.upsert({
      where: { id },
      update: {},
      create: { ...r, id },
    })
  }
  console.log('✅ Ayurvedic remedies seeded')

  // ─── SUBSCRIPTION PLANS ────────────────────────────
  const planCount = await prisma.subscriptionPlan.count()
  if (planCount === 0) {
    console.log('Inserting subscription plans...')
    await prisma.subscriptionPlan.createMany({
      data: [
        {
          name: 'Free',
          slug: 'free',
          description: 'Basic cycle tracking and wellness features',
          interval: 'MONTHLY',
          basePrice: 0,
          trialDays: 0,
          gracePeriodDays: 0,
          emoji: '🌱',
          highlights: ['Basic cycle tracking (3 months)', 'Dosha quiz', 'Community access', 'Articles', 'Product browsing'],
          sortOrder: 0,
          isActive: true,
          isFree: true,
          isPublished: true,
        },
        {
          name: 'Premium Monthly',
          slug: 'premium-monthly',
          description: 'Full access to all premium features, billed monthly',
          interval: 'MONTHLY',
          basePrice: 149,
          goalPricing: { track_periods: 99, fertility: 199, pregnancy: 149, wellness: 99 },
          trialDays: 7,
          gracePeriodDays: 3,
          emoji: '✨',
          highlights: ['12-month predictions', 'BBT & fertility tracking', 'Ayurvedic insights', 'Premium programs', 'Priority doctor booking', 'Ad-free', 'Data export'],
          badge: 'POPULAR',
          sortOrder: 1,
          isActive: true,
          isFree: false,
          isPublished: true,
        },
        {
          name: 'Premium Yearly',
          slug: 'premium-yearly',
          description: 'Full access to all premium features, billed yearly. Save 44%!',
          interval: 'YEARLY',
          basePrice: 999,
          goalPricing: { track_periods: 699, fertility: 1299, pregnancy: 999, wellness: 699 },
          trialDays: 7,
          gracePeriodDays: 7,
          emoji: '💎',
          highlights: ['Everything in Monthly', 'Save 44% vs monthly', 'Extended grace period'],
          badge: 'BEST VALUE',
          sortOrder: 2,
          isActive: true,
          isFree: false,
          isPublished: true,
        },
        {
          name: 'Lifetime',
          slug: 'lifetime',
          description: 'One-time payment for lifetime access to all premium features',
          interval: 'LIFETIME',
          basePrice: 2999,
          goalPricing: { track_periods: 1999, fertility: 3999, pregnancy: 2999, wellness: 1999 },
          trialDays: 0,
          gracePeriodDays: 0,
          emoji: '👑',
          highlights: ['Everything in Premium', 'One-time payment', 'Lifetime access', 'All future features included'],
          sortOrder: 3,
          isActive: true,
          isFree: false,
          isPublished: true,
        },
      ],
    })
    console.log('4 subscription plans seeded')
  }

  // ─── DEFAULT WELCOME BONUS ────────────────────────
  const promoCount = await prisma.subscriptionPromotion.count()
  if (promoCount === 0) {
    console.log('Inserting welcome bonus promotion...')
    await prisma.subscriptionPromotion.create({
      data: {
        name: 'Welcome to VedaClue!',
        type: 'WELCOME_BONUS',
        discountType: 'PERCENTAGE',
        discountValue: 100,
        isWelcomeBonus: true,
        newUserWindowDays: 30,
        isActive: true,
        maxPerUser: 1,
      },
    })
    console.log('Welcome bonus promotion seeded')
  }

  // ─── WELLNESS CONTENT ─────────────────────────────
  const wcCount = await prisma.wellnessContent.count()
  if (wcCount === 0) {
    console.log('Inserting wellness content (~377 items)...')

    const wcData: Array<{
      type: string; key: string; phase?: string; goal?: string; dosha?: string;
      week?: number; category?: string; emoji?: string; title?: string;
      body: string; metadata?: any; sortOrder?: number; sourceReference?: string;
    }> = []

    // ═══════════════════════════════════════════════════
    // 1. PHASE TIPS — Fertility goal (16 items)
    // ═══════════════════════════════════════════════════
    const fertilityPhaseTips: Record<string, string[]> = {
      menstrual: ['🌡️ Warm compress relieves cramps', '🥬 Eat iron-rich foods (spinach, dates)', '😴 Extra rest is completely valid', '🫖 Ginger tea helps inflammation'],
      follicular: ['⚡ Great phase to build up workout intensity', '🚀 Start new projects now', '🥑 Load up on healthy fats', '💃 Your social energy is high'],
      ovulation: ['💜 Peak fertility window — highest chance 1-2 days before ovulation', '💧 Check egg-white cervical mucus', '🌸 Libido naturally peaks', '🔥 Peak energy — try your most challenging workout'],
      luteal: ['🌰 Magnesium reduces PMS (almonds)', '🍠 Complex carbs stabilize mood', '😴 Body needs extra sleep now', '🚫 Reduce caffeine and salt'],
    }
    for (const [phase, tips] of Object.entries(fertilityPhaseTips)) {
      tips.forEach((tip, i) => {
        const emoji = tip.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/u)?.[0] || ''
        wcData.push({
          type: 'phase_tip', key: `fertility_${phase}_${i}`, phase, goal: 'fertility',
          emoji, body: tip, sortOrder: i, sourceReference: `DashboardPage.tsx:phaseTips.${phase}[${i}]`,
        })
      })
    }

    // ═══════════════════════════════════════════════════
    // 2. PHASE TIPS — Periods goal (16 items)
    // ═══════════════════════════════════════════════════
    const periodPhaseTips: Record<string, string[]> = {
      menstrual: ['🌡️ Warm compress relieves cramps', '🥬 Eat iron-rich foods (spinach, dates)', '😴 Extra rest is completely valid', '🫖 Ginger tea helps inflammation'],
      follicular: ['⚡ Great phase to build up workout intensity', '🚀 Start new projects now', '🥑 Load up on healthy fats', '💃 Your social energy is high'],
      ovulation: ['🌸 You may feel more confident today', '🔥 Peak energy — try intense workouts', '💧 Stay extra hydrated', '🧘 Great time for challenging goals'],
      luteal: ['🌰 Magnesium reduces PMS (almonds)', '🍠 Complex carbs stabilize mood', '😴 Body needs extra sleep now', '🚫 Reduce caffeine and salt'],
    }
    for (const [phase, tips] of Object.entries(periodPhaseTips)) {
      tips.forEach((tip, i) => {
        const emoji = tip.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/u)?.[0] || ''
        wcData.push({
          type: 'phase_tip', key: `periods_${phase}_${i}`, phase, goal: 'periods',
          emoji, body: tip, sortOrder: i, sourceReference: `DashboardPage.tsx:periodTips.${phase}[${i}]`,
        })
      })
    }

    // ═══════════════════════════════════════════════════
    // 3. WELLNESS TIPS (8 items)
    // ═══════════════════════════════════════════════════
    const wellnessTipsList = [
      '💧 Stay well hydrated throughout the day — your skin and energy will thank you',
      '🧘 Even 5 minutes of deep breathing can measurably reduce stress hormones',
      '😴 Blue light before bed delays melatonin — try reading instead',
      '🏃 A 20-minute walk can boost mood for several hours',
      '🥗 Nutrient-rich lunches with greens may help sustain afternoon energy',
      '🌅 Morning sunlight for 10 min resets your circadian rhythm',
      '📵 Screen breaks every 45 min reduce eye strain and stress',
      '🫖 Chamomile or lavender tea before bed may help improve sleep quality',
    ]
    wellnessTipsList.forEach((tip, i) => {
      const emoji = tip.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/u)?.[0] || ''
      wcData.push({
        type: 'wellness_tip', key: `wellness_${i}`, goal: 'wellness',
        emoji, body: tip, sortOrder: i, sourceReference: `DashboardPage.tsx:wellnessTips[${i}]`,
      })
    })

    // ═══════════════════════════════════════════════════
    // 4. PHASE ROUTINES — WellnessPage (4 phases × 3 times × ~5 items = ~49)
    // ═══════════════════════════════════════════════════
    const phaseRoutines: Record<string, { morning: string[]; afternoon: string[]; evening: string[] }> = {
      menstrual: {
        morning: ['🌅 Gentle stretch (5 min)', '🫖 Warm ginger tea', '🧘 Child\'s Pose yoga', '💊 Iron supplement (if doctor-recommended)', '🥬 Iron-rich breakfast (spinach, dates)'],
        afternoon: ['🌡️ Warm compress for cramps', '😴 10-min rest if needed', '🥣 Light, warm meal', '💧 Extra hydration (2.5L)'],
        evening: ['🛁 Warm bath with Epsom salt', '📖 Light journaling', '🫖 Chamomile tea', '🌙 Early bedtime — rest is healing'],
      },
      follicular: {
        morning: ['☀️ Sun salutations (10 min)', '🥑 Nutrient-dense breakfast', '🧠 Set weekly intentions', '💪 Start a new healthy habit', '🚀 Best time for bold decisions'],
        afternoon: ['🏃 Ideal for intense workout', '🥗 Antioxidant-rich lunch', '📚 Learn something new', '🤝 Connect with people'],
        evening: ['🧘 Energizing vinyasa flow', '📓 Journal progress', '😴 8h sleep for optimal recovery'],
      },
      ovulation: {
        morning: ['💜 High-intensity workout', '🥜 Protein-rich breakfast', '🤸 Challenge your body', '💧 Stay well hydrated today', '🌟 You\'re at peak confidence'],
        afternoon: ['🥗 Zinc & fiber-rich lunch', '👥 Social energy is high', '🎯 Tackle hardest tasks now', '💼 Best day for negotiations'],
        evening: ['🧘 Hip-opening yoga flow', '🛀 Luxurious self-care', '💜 Connect deeply with loved ones'],
      },
      luteal: {
        morning: ['🌅 Gentle yoga (15 min)', '🌰 Magnesium-rich breakfast', '😮‍💨 Box breathing (5 min)', '📓 Journal feelings — don\'t suppress'],
        afternoon: ['🥗 Complex carbs (sweet potato, oats)', '😴 Power nap if needed', '🚶 Slow walk in nature', '🚫 Limit caffeine'],
        evening: ['🛁 Calming lavender bath', '🫖 Ashwagandha or chamomile tea', '📵 No screens after 9pm', '🌙 Sleep by 10pm'],
      },
    }
    for (const [phase, times] of Object.entries(phaseRoutines)) {
      for (const [timeOfDay, items] of Object.entries(times)) {
        items.forEach((item, i) => {
          const emoji = item.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/u)?.[0] || ''
          wcData.push({
            type: 'phase_routine', key: `${phase}_${timeOfDay}_${i}`, phase,
            category: timeOfDay, emoji, body: item, sortOrder: i,
            sourceReference: `WellnessPage.tsx:PHASE_DATA.${phase}.routine.${timeOfDay}[${i}]`,
          })
        })
      }
    }

    // ═══════════════════════════════════════════════════
    // 5. PHASE YOGA — WellnessPage (4 phases × 4 poses = 16)
    // ═══════════════════════════════════════════════════
    const phaseYoga: Record<string, { name: string; emoji: string; dur: string; benefit: string }[]> = {
      menstrual: [
        { name: "Child's Pose", emoji: '🧎', dur: '3 min', benefit: 'Relieves cramps' },
        { name: 'Supine Twist', emoji: '🔄', dur: '2 min', benefit: 'Relaxes lower back' },
        { name: 'Butterfly Pose', emoji: '🦋', dur: '3 min', benefit: 'Opens hips' },
        { name: 'Legs Up Wall', emoji: '🦵', dur: '5 min', benefit: 'Reduces fatigue' },
      ],
      follicular: [
        { name: 'Sun Salutation', emoji: '☀️', dur: '10 min', benefit: 'Energizes body' },
        { name: 'Warrior I & II', emoji: '💪', dur: '5 min', benefit: 'Builds strength' },
        { name: 'Dancer Pose', emoji: '💃', dur: '3 min', benefit: 'Balance & focus' },
        { name: 'Vinyasa Flow', emoji: '🌊', dur: '20 min', benefit: 'Full body energy' },
      ],
      ovulation: [
        { name: 'Camel Pose', emoji: '🐪', dur: '3 min', benefit: 'Opens heart' },
        { name: 'Bridge Pose', emoji: '🌉', dur: '3 min', benefit: 'Hip flexors' },
        { name: 'Pigeon Pose', emoji: '🕊️', dur: '5 min', benefit: 'Hip release' },
        { name: 'Wheel Pose', emoji: '⭕', dur: '2 min', benefit: 'Peak energy' },
      ],
      luteal: [
        { name: 'Yin Yoga', emoji: '🌙', dur: '20 min', benefit: 'Deep tissue release' },
        { name: 'Forward Fold', emoji: '🙇', dur: '5 min', benefit: 'Calms nervous system' },
        { name: 'Spinal Twist', emoji: '🌀', dur: '3 min', benefit: 'Aids digestion & spinal mobility' },
        { name: 'Corpse Pose', emoji: '😴', dur: '10 min', benefit: 'Deep restoration' },
      ],
    }
    for (const [phase, poses] of Object.entries(phaseYoga)) {
      poses.forEach((pose, i) => {
        wcData.push({
          type: 'phase_yoga', key: `${phase}_yoga_${i}`, phase,
          emoji: pose.emoji, title: pose.name, body: pose.benefit,
          metadata: { duration: pose.dur }, sortOrder: i,
          sourceReference: `WellnessPage.tsx:PHASE_DATA.${phase}.yoga[${i}]`,
        })
      })
    }

    // ═══════════════════════════════════════════════════
    // 6. PHASE TIP WISDOM — WellnessPage (4 items)
    // ═══════════════════════════════════════════════════
    const phaseWisdom: Record<string, string> = {
      menstrual: 'Rest is your superpower right now. Your body is doing extraordinary work.',
      follicular: 'Your energy is rising! This is the best time to start new goals and challenges.',
      ovulation: 'Peak fertility and confidence. You\'re literally glowing — use this energy wisely!',
      luteal: 'Progesterone peaks then drops — mood changes are real. Practice radical self-compassion.',
    }
    for (const [phase, tip] of Object.entries(phaseWisdom)) {
      wcData.push({
        type: 'phase_tip_wisdom', key: `wisdom_${phase}`, phase,
        body: tip, sortOrder: 0, sourceReference: `WellnessPage.tsx:PHASE_DATA.${phase}.tip`,
      })
    }

    // ═══════════════════════════════════════════════════
    // 7. CHALLENGES — WellnessPage (4 items)
    // ═══════════════════════════════════════════════════
    const challenges = [
      { id: 'iron', title: '7-Day Iron Boost', emoji: '🌿', days: 7, desc: 'Eat iron-rich foods daily', color: '#E11D48', bg: '#FFF1F2', badge: '🏅' },
      { id: 'stress', title: '14-Day Stress-Free', emoji: '🧘', days: 14, desc: 'Meditate 5 minutes daily', color: '#7C3AED', bg: '#F5F3FF', badge: '🥇' },
      { id: 'sync', title: '21-Day Cycle Sync', emoji: '🌸', days: 21, desc: 'Phase-aligned living', color: '#EC4899', bg: '#FDF2F8', badge: '🏆' },
      { id: 'water', title: '8-Glass Water', emoji: '💧', days: 7, desc: '8 glasses every day', color: '#3B82F6', bg: '#EFF6FF', badge: '💎' },
    ]
    challenges.forEach((c, i) => {
      wcData.push({
        type: 'challenge', key: `challenge_${c.id}`,
        emoji: c.emoji, title: c.title, body: c.desc,
        metadata: { days: c.days, color: c.color, bg: c.bg, badge: c.badge },
        sortOrder: i, sourceReference: `WellnessPage.tsx:CHALLENGES[${i}]`,
      })
    })

    // ═══════════════════════════════════════════════════
    // 8. AFFIRMATIONS — SelfCarePage (4 items)
    // ═══════════════════════════════════════════════════
    const affirmations: Record<string, { title: string; emoji: string; affirmation: string }> = {
      menstrual: { title: 'Rest & Restore', emoji: '🩸', affirmation: 'I honor my body\'s need for rest. I am allowed to slow down.' },
      follicular: { title: 'Create & Explore', emoji: '🌱', affirmation: 'I am full of creative energy. Today I start something new.' },
      ovulation: { title: 'Shine & Connect', emoji: '✨', affirmation: 'I am confident, radiant, and worthy of all good things.' },
      luteal: { title: 'Nurture & Complete', emoji: '🍃', affirmation: 'I am enough exactly as I am. My feelings are valid.' },
    }
    for (const [phase, a] of Object.entries(affirmations)) {
      wcData.push({
        type: 'affirmation', key: `affirmation_${phase}`, phase,
        emoji: a.emoji, title: a.title, body: a.affirmation,
        sortOrder: 0, sourceReference: `SelfCarePage.tsx:phaseWellness.${phase}.affirmation`,
      })
    }

    // ═══════════════════════════════════════════════════
    // 9. BREATHING EXERCISES — SelfCarePage (4 items)
    // ═══════════════════════════════════════════════════
    const breathExercises: Record<string, string> = {
      menstrual: '4-7-8 Relaxation: Inhale 4s, hold 7s, exhale 8s',
      follicular: 'Energizing Breath (Kapalabhati): Quick inhale-exhale through nose, 30 rounds. Avoid during menstruation or pregnancy.',
      ovulation: 'Box Breathing: Inhale 4s, hold 4s, exhale 4s, hold 4s',
      luteal: 'Nadi Shodhana: Alternate nostril breathing, 10 rounds',
    }
    for (const [phase, desc] of Object.entries(breathExercises)) {
      wcData.push({
        type: 'self_care_breath', key: `breath_${phase}`, phase,
        body: desc, sortOrder: 0, sourceReference: `SelfCarePage.tsx:phaseWellness.${phase}.breath`,
      })
    }

    // ═══════════════════════════════════════════════════
    // 10. JOURNAL PROMPTS — SelfCarePage (4 items)
    // ═══════════════════════════════════════════════════
    const journalPrompts: Record<string, string> = {
      menstrual: 'What does my body need most right now? How can I be gentle with myself this week?',
      follicular: 'What new project or goal excites me? What would I do if I couldn\'t fail?',
      ovulation: 'What conversation have I been avoiding? Today I have the courage to speak my truth.',
      luteal: 'What am I grateful for today? What can I let go of that no longer serves me?',
    }
    for (const [phase, prompt] of Object.entries(journalPrompts)) {
      wcData.push({
        type: 'journal_prompt', key: `journal_${phase}`, phase,
        body: prompt, sortOrder: 0, sourceReference: `SelfCarePage.tsx:phaseWellness.${phase}.journalPrompt`,
      })
    }

    // ═══════════════════════════════════════════════════
    // 11. SELF-CARE IDEAS — SelfCarePage (4 phases × 5 items = 20)
    // ═══════════════════════════════════════════════════
    const selfCareIdeas: Record<string, string[]> = {
      menstrual: ['Warm bath with essential oils', 'Gentle stretching or yin yoga', 'Hot tea and a good book', 'Say no to one extra commitment', 'Eat your favorite comfort food guilt-free'],
      follicular: ['Try a new workout or class', 'Plan something social', 'Start a creative project', 'Meal prep healthy foods', 'Explore somewhere new'],
      ovulation: ['Have that important conversation', 'Dress up and feel good', 'Connect deeply with someone', 'Dance or move joyfully', 'Express yourself creatively'],
      luteal: ['Dark chocolate (guilt-free magnesium!)', 'Early bedtime with calming music', 'Warm oil self-massage', 'Organize or clean one space', 'Call someone who makes you smile'],
    }
    for (const [phase, ideas] of Object.entries(selfCareIdeas)) {
      ideas.forEach((idea, i) => {
        wcData.push({
          type: 'self_care', key: `selfcare_${phase}_${i}`, phase,
          body: idea, sortOrder: i, sourceReference: `SelfCarePage.tsx:phaseWellness.${phase}.selfCare[${i}]`,
        })
      })
    }

    // ═══════════════════════════════════════════════════
    // 12. DOSHA REMEDIES — DashboardPage ayurvedic (3 doshas × 4 phases × 3 items = 36)
    // ═══════════════════════════════════════════════════
    const doshaRemedies: Record<string, Record<string, string[]>> = {
      vata: {
        menstrual: ['Warm sesame oil massage (Abhyanga)', 'Ashwagandha tea for calm', 'Warm, grounding foods (soups, root veggies)'],
        follicular: ['Warming spices (ginger, cinnamon)', 'Routine-based daily schedule', 'Nourishing fats (ghee, avocado)'],
        ovulation: ['Stay warm and grounded', 'Gentle movement, avoid overexertion', 'Warm milk with saffron before bed'],
        luteal: ['Oil self-massage before bed', 'Avoid cold, raw foods', 'Calming herbs (Brahmi, Jatamansi)'],
      },
      pitta: {
        menstrual: ['Coconut oil cooling massage', 'Rose water face mist', 'Cooling foods (cucumber, mint)'],
        follicular: ['Aloe vera juice morning drink', 'Avoid excess spicy/sour foods', 'Moderate exercise in cool environment'],
        ovulation: ['Sandalwood cooling paste', 'Sweet fruits (grapes, pomegranate)', 'Moonlight meditation'],
        luteal: ['Pitta-balancing herbs (Shatavari)', 'Cooling pranayama (Shitali)', 'Avoid competitive activities'],
      },
      kapha: {
        menstrual: ['Dry brushing before bath', 'Warming herbal tea (Trikatu)', 'Light, warm meals — avoid dairy'],
        follicular: ['Vigorous exercise (best phase!)', 'Honey in warm water morning', 'Pungent spices stimulate metabolism'],
        ovulation: ['Stay active and social', 'Light, dry foods preferred', 'Triphala for digestive balance'],
        luteal: ['Avoid heavy, oily comfort foods', 'Energizing aromatherapy (eucalyptus)', 'Stimulating yoga (Surya Namaskar)'],
      },
    }
    for (const [dosha, phases] of Object.entries(doshaRemedies)) {
      for (const [phase, items] of Object.entries(phases)) {
        items.forEach((item, i) => {
          wcData.push({
            type: 'dosha_remedy', key: `dosha_${dosha}_${phase}_${i}`, phase, dosha,
            body: item, sortOrder: i,
            sourceReference: `DashboardPage.tsx:doshaRemedies.${dosha}.${phase}[${i}]`,
          })
        })
      }
    }

    // ═══════════════════════════════════════════════════
    // 13. PREGNANCY WEEK DATA (10 weeks × 5 categories × ~4 items = ~200)
    // ═══════════════════════════════════════════════════
    const pregWeekData: Record<number, { size: string; emoji: string; len: string; wt: string; tri: number; baby: string[]; mom: string[]; tips: string[]; nutrition: string[]; exercise: string[] }> = {
      4: { size: 'Poppy Seed', emoji: '🌾', len: '0.1 cm', wt: '<1g', tri: 1,
        baby: ['Embryo implants in uterus wall', 'Neural tube beginning to form', 'Tiny heart starts to develop', 'Amniotic sac forming around embryo'],
        mom: ['Missed period — first sign!', 'Fatigue and breast tenderness', 'Possible light spotting (implantation)', 'Heightened sense of smell'],
        tips: ['Start prenatal vitamins with 400µg folic acid', 'Avoid alcohol, smoking & raw fish', 'Schedule your first prenatal appointment', 'Begin tracking symptoms in a journal'],
        nutrition: ['Folic acid (leafy greens, fortified cereals)', 'Iron (red meat, spinach, lentils)', 'Stay hydrated — 8–10 glasses/day', 'Small frequent meals if nauseated'],
        exercise: ['Walking 20–30 min daily', 'Gentle yoga & stretching', 'Avoid contact sports', 'Listen to your body — rest when tired'] },
      8: { size: 'Raspberry', emoji: '🫐', len: '1.6 cm', wt: '1g', tri: 1,
        baby: ['All major organs forming', 'Tiny fingers and toes appear', 'Heart beats at 150–170 BPM', 'Eyelids starting to fuse shut'],
        mom: ['Morning sickness at its peak', 'Frequent urination begins', 'Breast size increasing', 'Extreme fatigue is normal'],
        tips: ['Eat small meals every 2–3 hours', 'Ginger tea helps with nausea', 'Get 8–9 hours of sleep', 'First ultrasound may happen now'],
        nutrition: ['Vitamin B6 helps nausea (bananas, nuts)', 'Protein at every meal', 'Avoid unpasteurized dairy', 'Calcium-rich foods (yogurt, cheese)'],
        exercise: ['Prenatal swimming', 'Light pilates', 'Kegel exercises — start now!', 'Rest on your side when possible'] },
      12: { size: 'Lime', emoji: '🍋', len: '5.4 cm', wt: '14g', tri: 1,
        baby: ['Reflexes developing — can kick!', 'Fingernails and toenails growing', 'Vocal cords beginning to form', 'Kidneys start producing urine'],
        mom: ['Nausea often starts improving', 'Energy returning gradually', 'Slight baby bump may show', 'Skin may glow or break out'],
        tips: ['First trimester screening (NT scan)', 'Share news with close family', 'Start moisturizing belly daily', 'Begin researching birthing classes'],
        nutrition: ['Omega-3 fatty acids (salmon, walnuts)', 'Fiber-rich foods prevent constipation', 'Vitamin D (sunlight, fortified milk)', 'Limit caffeine to 200mg/day'],
        exercise: ['Prenatal yoga classes', 'Stationary cycling', 'Arm exercises with light weights', 'Pelvic floor exercises'] },
      16: { size: 'Avocado', emoji: '🥑', len: '11.6 cm', wt: '100g', tri: 2,
        baby: ['Can make facial expressions!', 'Bones hardening (ossifying)', 'Can hear your heartbeat', 'Eyebrows and eyelashes growing'],
        mom: ['Baby bump clearly visible', 'May feel first flutters ("quickening")', 'Round ligament pain possible', 'Nasal congestion is common'],
        tips: ['Schedule anomaly scan (18–20 weeks)', 'Start sleeping on your left side', 'Plan a babymoon trip', 'Begin thinking about baby names'],
        nutrition: ['Increase protein intake to 75g/day', 'Calcium: 1000mg/day (dairy, tofu)', 'Vitamin C (oranges, bell peppers)', 'Iron supplements if prescribed'],
        exercise: ['Swimming is excellent now', 'Prenatal dance classes', 'Walking 30–45 min daily', 'Avoid high-altitude exercise'] },
      20: { size: 'Banana', emoji: '🍌', len: '16.5 cm', wt: '300g', tri: 2,
        baby: ['Developing sleep/wake cycles', 'Can swallow amniotic fluid', 'Vernix (waxy coating) on skin', 'Gender visible on ultrasound'],
        mom: ['Regular kicks felt daily', 'Skin stretching — possible itching', 'Linea nigra may appear', 'Hair and nails growing faster'],
        tips: ['HALFWAY THERE! Celebrate! 🎉', 'Anatomy scan this week', 'Start a kick count journal', 'Research childbirth education classes'],
        nutrition: ['DHA supplement for brain development', 'Zinc (pumpkin seeds, chickpeas)', 'Magnesium (dark chocolate, avocado)', 'Drink 3 liters of water daily'],
        exercise: ['Aqua aerobics', 'Modified yoga poses', 'Gentle back stretches', 'Avoid exercises lying flat on back'] },
      24: { size: 'Corn Cob', emoji: '🌽', len: '30 cm', wt: '600g', tri: 2,
        baby: ['Lungs developing surfactant', 'Face fully formed', 'Responds to your voice', 'Taste buds are functional'],
        mom: ['Braxton Hicks may start', 'Swelling in feet and ankles', 'Glucose screening test due', 'Back pain increasing'],
        tips: ['Take glucose tolerance test', 'Elevate feet when resting', 'Practice relaxation techniques', 'Start planning the nursery'],
        nutrition: ['Monitor sugar intake for GD test', 'Potassium (bananas, sweet potatoes)', 'Fiber to prevent hemorrhoids', 'Small meals to reduce heartburn'],
        exercise: ['Prenatal pilates', 'Side-lying exercises', 'Shoulder and neck stretches', 'Pelvic tilts for back pain'] },
      28: { size: 'Eggplant', emoji: '🍆', len: '37.5 cm', wt: '1 kg', tri: 3,
        baby: ['Eyes can open and close', 'Brain developing rapidly', 'Can dream (REM sleep!)', 'Responds to light through belly'],
        mom: ['Third trimester begins!', 'Shortness of breath', 'Trouble sleeping at night', 'Frequent Braxton Hicks'],
        tips: ['Start counting kicks daily (10 in 2hrs)', 'Prepare your hospital bag', 'Discuss birth plan with doctor', 'Take a hospital tour'],
        nutrition: ['Increase calorie intake by 450/day', 'Vitamin K (broccoli, kale)', 'Evening primrose oil (after 36w, discuss with doctor)', 'Probiotic foods for gut health'],
        exercise: ['Gentle walking only', 'Birthing ball exercises', 'Deep breathing practice', 'Perineal massage preparation'] },
      32: { size: 'Coconut', emoji: '🥥', len: '42 cm', wt: '1.7 kg', tri: 3,
        baby: ['Practicing breathing movements', 'Bones hardening (skull stays soft)', 'All five senses are functional', 'Gaining ~250g per week'],
        mom: ['Frequent bathroom trips', 'Heartburn and indigestion', 'Nesting instinct kicks in', 'Difficulty finding comfortable sleep position'],
        tips: ['Finalize birth plan', 'Install car seat', 'Wash baby clothes & bedding', 'Practice labor breathing exercises'],
        nutrition: ['Dates (6/day from 36w helps labor)', 'Red raspberry leaf tea (discuss with doctor first)', 'High-protein snacks', 'Limit salty foods for swelling'],
        exercise: ['Squats for labor preparation', 'Cat-cow stretches', 'Ankle circles for swelling', 'Visualization & meditation'] },
      36: { size: 'Honeydew', emoji: '🍈', len: '47 cm', wt: '2.6 kg', tri: 3,
        baby: ['Head may engage in pelvis', 'Lungs nearly mature', 'Fat layer developing', 'Gaining 30g every day'],
        mom: ['Increased pelvic pressure', 'Lightning crotch pain', '"Dropping" — baby moves lower', 'Cervix may start softening'],
        tips: ['Hospital bag should be packed', 'Know the signs of labor', 'Group B strep test this week', 'Rest as much as possible'],
        nutrition: ['Energy-boosting snacks for labor', 'Continue prenatal vitamins', 'Hydration is critical', 'Complex carbs for sustained energy'],
        exercise: ['Walking to encourage engagement', 'Hip circles on birthing ball', 'Relaxation exercises', 'Partner massage techniques'] },
      40: { size: 'Watermelon', emoji: '🍉', len: '51 cm', wt: '3.4 kg', tri: 3,
        baby: ['Fully developed!', 'Lungs ready for first breath', 'Immune system boosted by antibodies', 'Average 51cm long, 3.4kg'],
        mom: ['Cervix dilating', 'Mucus plug may pass', 'Extreme nesting urge', 'Contractions may begin anytime'],
        tips: ['Baby can arrive any day!', 'Time contractions (5-1-1 rule)', 'Stay calm — you are ready', 'Call doctor when water breaks'],
        nutrition: ['Light, easily digestible meals', 'Energy bars for early labor', 'Coconut water for electrolytes', 'Honey for quick energy'],
        exercise: ['Walking to stay active and comfortable', 'Nipple stimulation (with doctor OK)', 'Stair climbing', 'Gentle bouncing on birth ball'] },
    }
    for (const [weekNum, data] of Object.entries(pregWeekData)) {
      const w = parseInt(weekNum)
      // Store week metadata
      wcData.push({
        type: 'pregnancy_week', key: `preg_week_${w}_meta`, week: w,
        emoji: data.emoji, title: data.size,
        body: `Size: ${data.size} | Length: ${data.len} | Weight: ${data.wt}`,
        metadata: { size: data.size, length: data.len, weight: data.wt, trimester: data.tri },
        sortOrder: 0, sourceReference: `PregnancyPage.tsx:weekData[${w}]`,
      })
      // Baby development
      data.baby.forEach((item, i) => {
        wcData.push({
          type: 'pregnancy_week', key: `preg_week_${w}_baby_${i}`, week: w,
          category: 'baby', body: item, sortOrder: i,
          sourceReference: `PregnancyPage.tsx:weekData[${w}].baby[${i}]`,
        })
      })
      // Mom symptoms
      data.mom.forEach((item, i) => {
        wcData.push({
          type: 'pregnancy_week', key: `preg_week_${w}_mom_${i}`, week: w,
          category: 'mom', body: item, sortOrder: i,
          sourceReference: `PregnancyPage.tsx:weekData[${w}].mom[${i}]`,
        })
      })
      // Tips
      data.tips.forEach((item, i) => {
        wcData.push({
          type: 'pregnancy_week', key: `preg_week_${w}_tips_${i}`, week: w,
          category: 'tips', body: item, sortOrder: i,
          sourceReference: `PregnancyPage.tsx:weekData[${w}].tips[${i}]`,
        })
      })
      // Nutrition
      data.nutrition.forEach((item, i) => {
        wcData.push({
          type: 'pregnancy_week', key: `preg_week_${w}_nutrition_${i}`, week: w,
          category: 'nutrition', body: item, sortOrder: i,
          sourceReference: `PregnancyPage.tsx:weekData[${w}].nutrition[${i}]`,
        })
      })
      // Exercise
      data.exercise.forEach((item, i) => {
        wcData.push({
          type: 'pregnancy_week', key: `preg_week_${w}_exercise_${i}`, week: w,
          category: 'exercise', body: item, sortOrder: i,
          sourceReference: `PregnancyPage.tsx:weekData[${w}].exercise[${i}]`,
        })
      })
    }

    // Batch insert in chunks of 50 to avoid huge queries
    const chunkSize = 50
    for (let i = 0; i < wcData.length; i += chunkSize) {
      const chunk = wcData.slice(i, i + chunkSize)
      await prisma.wellnessContent.createMany({ data: chunk })
    }
    console.log(`✅ Seeded ${wcData.length} wellness content items`)
  } else {
    console.log(`Wellness content already exists (${wcCount} items), skipping...`)
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
