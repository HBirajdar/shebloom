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
