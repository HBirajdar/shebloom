import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ─── Articles ─────────────────────────────────────
  const articleCount = await prisma.article.count();
  if (articleCount === 0) {
    console.log('Inserting sample articles...');
    await prisma.article.createMany({
      data: [
        {
          title: 'Understanding Your Menstrual Cycle: A Complete Guide',
          slug: 'understanding-menstrual-cycle-guide-' + Date.now(),
          content: 'Your menstrual cycle is much more than just your period. It is a complex interplay of hormones that affects your energy, mood, and overall health throughout the month. The average cycle lasts 28 days, but anywhere from 21 to 35 days is considered normal.\n\n**Phase 1: Menstrual Phase (Days 1-5)**\nThis is when your period occurs. Hormone levels are at their lowest, and you may feel tired or experience cramps.\n\n**Phase 2: Follicular Phase (Days 1-13)**\nEstrogen rises, helping the uterine lining thicken. You may feel more energetic and optimistic during this time.\n\n**Phase 3: Ovulation (Day 14)**\nAn egg is released from the ovary. This is your most fertile time.\n\n**Phase 4: Luteal Phase (Days 15-28)**\nProgesterone rises. PMS symptoms may appear in the days before your next period.\n\nTracking your cycle helps you understand these patterns and make informed decisions about your health.',
          excerpt: 'Learn about the four phases of your menstrual cycle and how they affect your daily life.',
          category: 'periods',
          tags: ['menstrual cycle', 'periods', 'health', 'hormones'],
          emoji: '\u{1F33A}',
          targetAudience: ['periods', 'wellness'],
          readTimeMinutes: 8,
          isFeatured: true,
          status: 'PUBLISHED',
          publishedAt: new Date(),
          authorName: 'Dr. Ananya Gupta',
          approvedBy: 'admin',
          approvedAt: new Date(),
        },
        {
          title: 'PCOD vs PCOS: What Every Woman Should Know',
          slug: 'pcod-vs-pcos-differences-' + Date.now(),
          content: 'PCOD (Polycystic Ovarian Disease) and PCOS (Polycystic Ovary Syndrome) are often used interchangeably, but they are different conditions.\n\n**PCOD** is a condition where ovaries produce many immature or partially mature eggs due to poor lifestyle, obesity, stress, and hormonal imbalance. It is more common and less severe.\n\n**PCOS** is a metabolic disorder and a more serious condition. The ovaries produce higher quantities of male hormones (androgens), which leads to the formation of more than ten follicular cysts in the ovary every month.\n\n**Key Differences:**\n- PCOD is not a disease; PCOS is a metabolic disorder\n- PCOD does not cause infertility in all cases; PCOS can make conception difficult\n- PCOD can be managed with lifestyle changes; PCOS may require medical treatment\n\n**Ayurvedic Approach:**\nBoth conditions respond well to Ayurvedic treatments including Shatavari, Ashoka, and Lodhra along with dietary modifications and yoga.',
          excerpt: 'Understanding the key differences between PCOD and PCOS, and how Ayurveda can help.',
          category: 'pcod',
          tags: ['PCOD', 'PCOS', 'women health', 'ayurveda'],
          emoji: '\u{1F49C}',
          targetAudience: ['periods', 'fertility', 'wellness'],
          readTimeMinutes: 6,
          isFeatured: true,
          status: 'PUBLISHED',
          publishedAt: new Date(),
          authorName: 'VedaClue Team',
          approvedBy: 'admin',
          approvedAt: new Date(),
        },
        {
          title: 'Ayurvedic Herbs for Better Period Health',
          slug: 'ayurvedic-herbs-period-health-' + Date.now(),
          content: 'Ayurveda offers a treasure trove of herbs that can help manage period-related discomfort and promote reproductive health.\n\n**1. Shatavari (Asparagus racemosus)**\nKnown as the "Queen of Herbs" for women, Shatavari helps balance hormones, reduce PMS symptoms, and support fertility.\n\n**2. Ashwagandha (Withania somnifera)**\nThis adaptogenic herb helps manage stress-related menstrual irregularities and supports adrenal health.\n\n**3. Lodhra (Symplocos racemosa)**\nTraditionally used to treat menstrual disorders, Lodhra helps regulate the menstrual cycle.\n\n**4. Ashoka (Saraca indica)**\nThe bark of this sacred tree has been used for centuries to manage heavy periods and uterine disorders.\n\n**5. Turmeric (Curcuma longa)**\nA natural anti-inflammatory that helps reduce period pain and bloating.\n\n**How to Use:**\nConsult an Ayurvedic practitioner before starting any herbal regimen. These herbs are typically taken as churna (powder), kashayam (decoction), or in tablet form.',
          excerpt: 'Discover five powerful Ayurvedic herbs that can transform your period health naturally.',
          category: 'wellness',
          tags: ['ayurveda', 'herbs', 'periods', 'natural remedies'],
          emoji: '\u{1F33F}',
          targetAudience: ['periods', 'wellness'],
          readTimeMinutes: 5,
          isFeatured: false,
          status: 'PUBLISHED',
          publishedAt: new Date(),
          authorName: 'VedaClue Team',
          approvedBy: 'admin',
          approvedAt: new Date(),
        },
      ],
    });
    console.log('Inserted 3 sample articles.');
  } else {
    console.log(`Skipping articles seed (${articleCount} already exist).`);
  }

  // ─── Doctors ──────────────────────────────────────
  const doctorCount = await prisma.doctor.count();
  if (doctorCount === 0) {
    console.log('Inserting sample doctors...');
    await prisma.doctor.createMany({
      data: [
        {
          fullName: 'Dr. Priya Sharma',
          specialization: 'Gynecologist & Obstetrician',
          qualifications: ['MBBS', 'MS (OBG)', 'Fellowship in Reproductive Medicine'],
          experienceYears: 15,
          consultationFee: 800,
          bio: 'Dr. Priya Sharma is a renowned gynecologist with over 15 years of experience. She specializes in high-risk pregnancies, PCOD management, and fertility treatments. She combines modern medicine with Ayurvedic wisdom for holistic care.',
          tags: ['PCOD', 'Pregnancy', 'Fertility', 'High-Risk'],
          languages: ['ENGLISH', 'HINDI'],
          isPublished: true,
          isChief: true,
          isPromoted: true,
          isAvailable: true,
          isVerified: true,
          rating: 4.9,
          totalReviews: 234,
          hospitalName: 'VedaClue Wellness Center',
          status: 'active',
          approvedBy: 'admin',
          approvedAt: new Date(),
          publishedAt: new Date(),
          location: 'Mumbai, Maharashtra',
        },
        {
          fullName: 'Dr. Kavita Reddy',
          specialization: 'Ayurvedic Gynecologist',
          qualifications: ['BAMS', 'MD (Ayurveda)', 'Panchakarma Specialist'],
          experienceYears: 12,
          consultationFee: 600,
          bio: 'Dr. Kavita Reddy is an expert in Ayurvedic women\'s health. She specializes in treating menstrual disorders, infertility, and menopausal symptoms using traditional Ayurvedic methods combined with modern diagnostics.',
          tags: ['Ayurveda', 'Menstrual Health', 'Infertility', 'Panchakarma'],
          languages: ['ENGLISH', 'HINDI', 'TELUGU'],
          isPublished: true,
          isChief: false,
          isPromoted: true,
          isAvailable: true,
          isVerified: true,
          rating: 4.7,
          totalReviews: 156,
          hospitalName: 'Ayush Wellness Clinic',
          status: 'active',
          approvedBy: 'admin',
          approvedAt: new Date(),
          publishedAt: new Date(),
          location: 'Hyderabad, Telangana',
        },
        {
          fullName: 'Dr. Meena Iyer',
          specialization: 'Reproductive Endocrinologist',
          qualifications: ['MBBS', 'DNB (OBG)', 'Fellowship in IVF'],
          experienceYears: 10,
          consultationFee: 1200,
          bio: 'Dr. Meena Iyer is a fertility specialist with expertise in IVF, IUI, and hormonal disorders. She is passionate about helping couples achieve their dream of parenthood through evidence-based treatments.',
          tags: ['IVF', 'Fertility', 'Hormones', 'Endocrinology'],
          languages: ['ENGLISH', 'HINDI', 'TAMIL'],
          isPublished: true,
          isChief: false,
          isPromoted: false,
          isAvailable: true,
          isVerified: true,
          rating: 4.8,
          totalReviews: 89,
          hospitalName: 'Bloom Fertility Center',
          status: 'active',
          approvedBy: 'admin',
          approvedAt: new Date(),
          publishedAt: new Date(),
          location: 'Bangalore, Karnataka',
        },
      ],
    });
    console.log('Inserted 3 sample doctors.');
  } else {
    console.log(`Skipping doctors seed (${doctorCount} already exist).`);
  }

  // ─── Products ─────────────────────────────────────
  const productCount = await prisma.product.count();
  if (productCount === 0) {
    console.log('Inserting sample products...');
    await prisma.product.createMany({
      data: [
        {
          name: 'Shatavari Capsules',
          category: 'supplement',
          price: 499,
          discountPrice: 399,
          description: 'Pure Shatavari (Asparagus racemosus) capsules to support hormonal balance, fertility, and overall women\'s wellness. Each capsule contains 500mg of organic Shatavari root extract.',
          ingredients: ['Shatavari Root Extract', 'Vegetable Cellulose Capsule'],
          benefits: ['Supports hormonal balance', 'Promotes fertility', 'Reduces PMS symptoms', 'Boosts immunity', 'Improves energy levels'],
          howToUse: 'Take 1-2 capsules daily with warm milk or water after meals. Best results when used consistently for 3 months.',
          size: '60 capsules',
          emoji: '\u{1F33F}',
          tags: ['ayurveda', 'hormones', 'fertility', 'organic'],
          targetAudience: ['periods', 'fertility', 'wellness'],
          isPublished: true,
          isFeatured: true,
          inStock: true,
          rating: 4.8,
          reviews: 127,
          status: 'published',
          publishedAt: new Date(),
          approvedBy: 'admin',
          approvedAt: new Date(),
          stock: 250,
          unit: 'bottle',
        },
        {
          name: 'Kumkumadi Face Oil',
          category: 'skincare',
          price: 899,
          discountPrice: 749,
          description: 'Traditional Ayurvedic Kumkumadi Tailam for radiant, glowing skin. This luxurious face oil is crafted with saffron, sandalwood, and 16 other potent herbs following ancient Ayurvedic formulations.',
          ingredients: ['Saffron', 'Sandalwood Oil', 'Vetiver', 'Lotus', 'Manjistha', 'Sesame Oil Base'],
          benefits: ['Gives natural glow', 'Reduces dark spots', 'Anti-aging properties', 'Evens skin tone', 'Hydrates deeply'],
          howToUse: 'Apply 3-4 drops on clean face before bedtime. Gently massage in upward circular motions. Leave overnight.',
          size: '30ml',
          emoji: '\u2728',
          tags: ['skincare', 'ayurveda', 'face oil', 'saffron'],
          targetAudience: ['all', 'wellness'],
          isPublished: true,
          isFeatured: true,
          inStock: true,
          rating: 4.6,
          reviews: 89,
          status: 'published',
          publishedAt: new Date(),
          approvedBy: 'admin',
          approvedAt: new Date(),
          stock: 150,
          unit: 'bottle',
        },
        {
          name: 'Bhringraj Hair Oil',
          category: 'hair_oil',
          price: 599,
          discountPrice: 499,
          description: 'Premium cold-pressed Bhringraj hair oil enriched with Amla, Brahmi, and Hibiscus. Strengthens hair roots, reduces hairfall, and promotes thick, lustrous hair naturally.',
          ingredients: ['Bhringraj Extract', 'Amla', 'Brahmi', 'Hibiscus', 'Coconut Oil Base', 'Fenugreek'],
          benefits: ['Reduces hairfall', 'Strengthens roots', 'Promotes hair growth', 'Prevents premature greying', 'Nourishes scalp'],
          howToUse: 'Warm slightly and massage into scalp for 10 minutes. Leave for at least 1 hour or overnight. Wash with mild shampoo.',
          size: '200ml',
          emoji: '\u{1F9F4}',
          tags: ['hair care', 'ayurveda', 'bhringraj', 'natural'],
          targetAudience: ['all', 'wellness'],
          isPublished: true,
          isFeatured: false,
          inStock: true,
          rating: 4.7,
          reviews: 203,
          status: 'published',
          publishedAt: new Date(),
          approvedBy: 'admin',
          approvedAt: new Date(),
          stock: 300,
          unit: 'bottle',
        },
      ],
    });
    console.log('Inserted 3 sample products.');
  } else {
    console.log(`Skipping products seed (${productCount} already exist).`);
  }

  console.log('Seed completed.');
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => {
    console.error('Seed error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
