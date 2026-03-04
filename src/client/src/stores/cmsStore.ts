import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/* ═══════════════════════════════════════════════════════
   SHEBLOOM CMS — Complete Content Management System
   Secure admin, products, articles, doctors, targeting
   ═══════════════════════════════════════════════════════ */

export type TargetAudience = 'all' | 'periods' | 'fertility' | 'pregnancy' | 'wellness';
export type ProductCategory = 'hair_oil' | 'body_lotion' | 'face_wash' | 'body_wash' | 'hair_treatment' | 'supplement' | 'skincare';
export type ArticleCategory = 'Periods' | 'Pregnancy' | 'PCOD' | 'Wellness' | 'Nutrition' | 'Mental Health' | 'Fertility' | 'Ayurveda' | 'Skin & Hair';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  discountPrice?: number;
  description: string;
  ingredients: string[];
  benefits: string[];
  howToUse: string;
  size: string;
  emoji: string;
  rating: number;
  reviews: number;
  inStock: boolean;
  isPublished: boolean;
  isFeatured: boolean;
  targetAudience: TargetAudience[];
  tags: string[];
  preparationMethod?: string;
  doctorNote?: string;
  createdAt: string;
}

export interface Article {
  id: string;
  title: string;
  category: ArticleCategory;
  content: string;
  summary: string;
  author: string;
  readTime: string;
  emoji: string;
  isPublished: boolean;
  isFeatured: boolean;
  targetAudience: TargetAudience[];
  createdAt: string;
}

export interface Doctor {
  id: string;
  name: string;
  title: string;
  qualification: string;
  experience: string;
  specialization: string[];
  about: string;
  philosophy?: string;
  consultationFee: string;
  freeForPoor: boolean;
  rating: number;
  reviews: number;
  languages: string[];
  isChief: boolean;
  isPublished: boolean;
  emoji: string;
  phone?: string;
}

export interface DIYRecipe {
  id: string;
  title: string;
  emoji: string;
  description: string;
  ingredients: { name: string; amount: string }[];
  steps: string[];
  benefits: string[];
  targetAudience: TargetAudience[];
  isPublished: boolean;
  prepTime: string;
  difficulty: 'Easy' | 'Medium' | 'Advanced';
}

// ─── Admin Config ────────────────────────────────
const ADMIN_PIN = '2580';  // Change this to your secure PIN

// ─── Default Data ────────────────────────────────
const defaultDoctors: Doctor[] = [
  {
    id: 'doc_chief', name: 'Dr. SheBloom', title: 'Chief Ayurveda Physician & Founder',
    qualification: 'BAMS, MD (Ayurveda), PhD (Dravyaguna)',
    experience: '12+ years', rating: 4.9, reviews: 847, emoji: '\u{1F469}\u200D\u2695\uFE0F',
    specialization: ["Women's Health", 'PCOD/PCOS', 'Fertility', 'Hair & Skin', 'Pregnancy Care', 'Hormonal Balance', 'Ayurvedic Medicine'],
    about: "Passionate about making genuine Ayurvedic healthcare accessible to every woman. I personally source herbs from organic farms and handcraft each product in small batches. For patients who cannot afford treatment, consultations are completely free — because health is a right, not a privilege.",
    philosophy: "I believe in treating the root cause, not just symptoms. Modern medicine has its place, but ancient Ayurvedic wisdom combined with modern science creates the most effective, side-effect-free healing.",
    consultationFee: '\u20B9200 (Free for those in need)',
    freeForPoor: true, isChief: true, isPublished: true,
    languages: ['Hindi', 'English', 'Marathi', 'Kannada'],
  },
  {
    id: 'doc_2', name: 'Dr. Priya Sharma', title: 'Senior Gynecologist',
    qualification: 'MBBS, MS (OB-GYN)', experience: '15 years',
    rating: 4.8, reviews: 1203, emoji: '\u{1F469}\u200D\u2695\uFE0F',
    specialization: ['Gynecology', 'PCOD', 'High-Risk Pregnancy'],
    about: 'Expert in women\'s reproductive health with special focus on PCOD management and high-risk pregnancies.',
    consultationFee: '\u20B9500', freeForPoor: false,
    isChief: false, isPublished: true, languages: ['English', 'Hindi'],
  },
  {
    id: 'doc_3', name: 'Dr. Meera Nair', title: 'Fertility Specialist',
    qualification: 'MBBS, MD, Fellowship (Reproductive Medicine)', experience: '10 years',
    rating: 4.9, reviews: 632, emoji: '\u{1F469}\u200D\u2695\uFE0F',
    specialization: ['Fertility', 'IVF', 'Hormonal Therapy'],
    about: 'Dedicated to helping couples achieve their dream of parenthood through evidence-based fertility treatments.',
    consultationFee: '\u20B9600', freeForPoor: false,
    isChief: false, isPublished: true, languages: ['English', 'Tamil', 'Malayalam'],
  },
];

const defaultProducts: Product[] = [
  { id: 'p1', name: 'Bhringraj Hair Growth Oil', category: 'hair_oil', price: 450, discountPrice: 349, size: '200ml', emoji: '\u{1F33F}',
    description: 'Handcrafted Ayurvedic hair oil with Bhringraj, Amla, and Brahmi. Cold-pressed with coconut oil base. Made fresh in small batches.',
    ingredients: ['Bhringraj (Eclipta alba)', 'Amla (Indian Gooseberry)', 'Brahmi', 'Virgin Coconut Oil', 'Curry Leaves', 'Fenugreek Seeds', 'Hibiscus Petals', 'Neem Leaves'],
    benefits: ['Reduces hair fall by 60% in 3 months', 'Promotes new hair growth', 'Prevents premature greying', 'Strengthens roots', 'Conditions scalp'],
    howToUse: 'Warm slightly and massage into scalp for 10 min. Leave overnight or minimum 2 hours. Wash with mild shampoo. Use 2-3x/week.',
    rating: 4.8, reviews: 127, inStock: true, isPublished: true, isFeatured: true,
    targetAudience: ['all'], tags: ['bestseller', 'handmade'],
    preparationMethod: 'Slow-cooked 72 hours using traditional "Taila Paka" method. No preservatives.',
    doctorNote: 'I personally source each herb from organic farms in Kerala. This follows centuries-old Ayurvedic formulation.', createdAt: '2024-01-15' },
  { id: 'p2', name: 'Kumkumadi Night Face Oil', category: 'skincare', price: 650, discountPrice: 499, size: '30ml', emoji: '\u2728',
    description: 'Premium Kumkumadi Tailam with 16 herbs including real Kashmir Saffron. Fades dark spots, gives natural glow.',
    ingredients: ['Saffron (Kumkuma)', 'Sandalwood', 'Manjistha', 'Licorice Root', 'Lotus Petals', 'Vetiver', 'Sesame Oil'],
    benefits: ['Fades dark spots', 'Natural glow in 2 weeks', 'Anti-aging', 'Evens skin tone', 'Reduces acne scars'],
    howToUse: 'Apply 4-5 drops on cleansed face at night. Massage upward for 2 min. Leave overnight.',
    rating: 4.9, reviews: 89, inStock: true, isPublished: true, isFeatured: true,
    targetAudience: ['all'], tags: ['premium'],
    doctorNote: 'Each bottle uses 0.5g of real Kashmir saffron. Kumkumadi is the gold standard of Ayurvedic skincare.', createdAt: '2024-02-10' },
  { id: 'p3', name: 'Neem & Tulsi Face Wash', category: 'face_wash', price: 280, discountPrice: 220, size: '150ml', emoji: '\u{1F33B}',
    description: 'Gentle sulfate-free face wash. Controls acne without stripping natural oils. Safe for sensitive skin.',
    ingredients: ['Neem Extract', 'Tulsi (Holy Basil)', 'Aloe Vera', 'Turmeric', 'Rose Water', 'Honey'],
    benefits: ['Controls acne', 'Anti-bacterial', 'Gentle cleansing', 'Doesn\'t dry skin', 'Reduces inflammation'],
    howToUse: 'Wet face, coin-sized amount, massage 60 seconds, rinse. Twice daily.',
    rating: 4.7, reviews: 203, inStock: true, isPublished: true, isFeatured: false,
    targetAudience: ['all'], tags: ['bestseller'], createdAt: '2024-01-20' },
  { id: 'p4', name: 'Shatavari Body Lotion', category: 'body_lotion', price: 380, discountPrice: 299, size: '200ml', emoji: '\u{1F338}',
    description: 'Deep moisturizer with Shatavari \u2014 queen of herbs for women. Nourishes skin, supports hormonal balance.',
    ingredients: ['Shatavari', 'Shea Butter', 'Almond Oil', 'Rose Extract', 'Vitamin E', 'Jojoba Oil'],
    benefits: ['24hr moisturization', 'Hormonal support', 'Reduces stretch marks', 'Anti-aging', 'Pleasant fragrance'],
    howToUse: 'Apply on damp skin after shower. Focus on dry areas. Pregnancy-safe.',
    rating: 4.6, reviews: 156, inStock: true, isPublished: true, isFeatured: false,
    targetAudience: ['all', 'pregnancy'], tags: ['pregnancy-safe'],
    doctorNote: 'Shatavari is especially beneficial during pregnancy and post-partum. 100% safe for expecting mothers.', createdAt: '2024-03-05' },
  { id: 'p5', name: 'Triphala Body Wash', category: 'body_wash', price: 320, discountPrice: 249, size: '250ml', emoji: '\u{1F4A7}',
    description: 'Sulfate-free body wash with Triphala and Shikakai. Chemical-free cleansing, maintains pH.',
    ingredients: ['Triphala', 'Shikakai', 'Coconut Milk', 'Neem', 'Turmeric', 'Natural Saponins'],
    benefits: ['Chemical-free', 'Maintains skin pH', 'Anti-fungal', 'Softens skin', 'Eco-friendly'],
    howToUse: 'Use on wet skin with loofah. Lather and rinse. Daily use safe.',
    rating: 4.5, reviews: 98, inStock: true, isPublished: true, isFeatured: false,
    targetAudience: ['all'], tags: ['eco-friendly'], createdAt: '2024-04-12' },
  { id: 'p6', name: 'Hairfall Rescue Kit (90-Day)', category: 'hair_treatment', price: 1200, discountPrice: 899, size: 'Complete Kit', emoji: '\u{1F489}',
    description: 'Complete 90-day treatment: medicated oil + herbal powder + supplements + diet plan + free doctor consultation.',
    ingredients: ['Bhringraj Oil (100ml)', 'Hair Pack Powder (150g)', 'Ashwagandha+Biotin Capsules (90)', 'Scalp Massage Comb'],
    benefits: ['90-day comprehensive treatment', 'Up to 70% hairfall reduction', 'Root to tip strengthening', 'Includes diet plan', 'Free doctor consultation'],
    howToUse: 'Follow 90-day protocol. Oil 3x/week, hair pack 2x/week, capsule daily after meals.',
    rating: 4.9, reviews: 67, inStock: true, isPublished: true, isFeatured: true,
    targetAudience: ['all'], tags: ['bestseller', 'treatment'],
    doctorNote: 'My signature protocol. 200+ patients recovered from severe hairfall. Results from week 4.', createdAt: '2024-05-01' },
  { id: 'p7', name: 'Fertility Support Tonic', category: 'supplement', price: 550, discountPrice: 449, size: '500ml (30-day)', emoji: '\u{1F33A}',
    description: 'Traditional fertility tonic with Shatavari, Ashwagandha, Lodhra. Supports reproductive health naturally.',
    ingredients: ['Shatavari', 'Ashwagandha', 'Lodhra', 'Dashmool', 'Guduchi', 'Honey', 'Ghee Base'],
    benefits: ['Supports fertility', 'Regulates cycles', 'Reduces PCOD symptoms', 'Balances hormones', 'Boosts vitality'],
    howToUse: '15ml twice daily with warm milk, 30 min before meals. Continue 3+ months.',
    rating: 4.7, reviews: 45, inStock: true, isPublished: true, isFeatured: true,
    targetAudience: ['fertility', 'periods'], tags: ['fertility'],
    doctorNote: 'Classical "Shatavari Ghrita" with modern adaptations. Especially effective for irregular cycles or PCOD.', createdAt: '2024-06-15' },
  { id: 'p8', name: 'Prenatal Glow Cream', category: 'skincare', price: 480, discountPrice: 399, size: '100g', emoji: '\u{1F930}',
    description: 'Chemical-free moisturizer for pregnancy. Prevents stretch marks, keeps skin supple all trimesters.',
    ingredients: ['Shea Butter', 'Cocoa Butter', 'Almond Oil', 'Vitamin E', 'Saffron', 'Sandalwood'],
    benefits: ['Prevents stretch marks', '100% pregnancy-safe', 'Deep nourishment', 'Reduces itching'],
    howToUse: 'Apply on belly, breasts, thighs twice daily. Circular motions. Safe from 1st trimester.',
    rating: 4.8, reviews: 112, inStock: true, isPublished: true, isFeatured: false,
    targetAudience: ['pregnancy'], tags: ['pregnancy-safe'],
    doctorNote: 'Every ingredient verified pregnancy-safe. I recommend to all expecting patients from week 12.', createdAt: '2024-07-01' },
];

const defaultArticles: Article[] = [
  { id: 'a1', title: 'Understanding PCOD: Complete Ayurvedic Guide', category: 'PCOD', emoji: '\u{1F33A}',
    summary: 'PCOD affects 1 in 5 Indian women. Learn how Ayurveda can help manage symptoms naturally without side effects.',
    content: 'Polycystic Ovarian Disease (PCOD) is one of the most common hormonal disorders affecting women of reproductive age. In Ayurveda, PCOD is understood as a kapha-vata imbalance affecting the artava dhatu (reproductive tissue).\n\nKey Ayurvedic herbs for PCOD:\n\u2022 Shatavari: Balances female hormones\n\u2022 Ashwagandha: Reduces stress-induced hormonal imbalance\n\u2022 Lodhra: Supports ovarian health\n\u2022 Guduchi: Boosts immunity and metabolism\n\nLifestyle changes:\n\u2022 Wake up before sunrise\n\u2022 Practice yoga daily (especially Butterfly Pose, Supta Baddha Konasana)\n\u2022 Avoid processed foods and excess sugar\n\u2022 Include warm, freshly cooked meals\n\u2022 Manage stress through meditation\n\nDiet recommendations:\n\u2022 Anti-inflammatory foods: turmeric, ginger, garlic\n\u2022 Fiber-rich: whole grains, vegetables\n\u2022 Healthy fats: ghee, coconut oil, nuts\n\u2022 Avoid: dairy excess, refined carbs, cold foods',
    author: 'Dr. SheBloom', readTime: '8 min', isPublished: true, isFeatured: true,
    targetAudience: ['periods', 'fertility'], createdAt: '2024-01-20' },
  { id: 'a2', title: '5 Ayurvedic Remedies for Period Pain', category: 'Periods', emoji: '\u{1FA78}',
    summary: 'Natural, time-tested remedies for menstrual cramps that actually work, without any painkillers.',
    content: 'Menstrual cramps (dysmenorrhea) affect over 80% of women. Before reaching for painkillers, try these Ayurvedic solutions:\n\n1. Ajwain (Carom Seeds) Water\nBoil 1 tsp ajwain in a cup of water. Add jaggery. Drink warm. Ajwain has thymol which relaxes uterine muscles.\n\n2. Warm Sesame Oil Massage\nWarm sesame oil and massage lower abdomen clockwise. Sesame oil has anti-inflammatory properties that penetrate deep.\n\n3. Dashmool Kashayam\nThis classical Ayurvedic decoction of 10 roots is the gold standard for menstrual pain. Available as powder or tablets.\n\n4. Ginger-Turmeric Milk\nBoil grated ginger and turmeric in milk. Add honey. Anti-inflammatory and warming.\n\n5. Castor Oil Pack\nSoak a cloth in warm castor oil, place on lower abdomen. Cover with warm cloth. Rest 30 minutes.',
    author: 'Dr. SheBloom', readTime: '5 min', isPublished: true, isFeatured: false,
    targetAudience: ['periods'], createdAt: '2024-02-15' },
  { id: 'a3', title: 'First Trimester: Ayurvedic Pregnancy Care', category: 'Pregnancy', emoji: '\u{1F930}',
    summary: 'Ancient Ayurvedic wisdom for a healthy first trimester. What to eat, what to avoid, and daily rituals.',
    content: 'In Ayurveda, pregnancy care (Garbhini Paricharya) begins from conception. The first trimester is called "kalala" stage.\n\nMonthly Guidance:\n\nMonth 1: Nourish with sweet, cold foods. Drink milk with honey. Avoid heavy exercise.\n\nMonth 2: Include ghee in diet. Practice gentle walks. Shatavari milk is highly recommended.\n\nMonth 3: Rice cooked with milk and honey. Stay emotionally positive. Baby\'s organs begin forming.\n\nFoods to Include:\n\u2022 Fresh fruits (especially pomegranate)\n\u2022 Coconut water\n\u2022 Ghee (A2 cow ghee preferred)\n\u2022 Milk with saffron\n\u2022 Dates and figs\n\nFoods to Avoid:\n\u2022 Papaya (causes uterine contractions)\n\u2022 Pineapple (bromelain risk)\n\u2022 Excess spicy food\n\u2022 Raw/undercooked food\n\u2022 Caffeine (limit to 1 cup/day)',
    author: 'Dr. SheBloom', readTime: '7 min', isPublished: true, isFeatured: true,
    targetAudience: ['pregnancy'], createdAt: '2024-03-10' },
  { id: 'a4', title: 'Boost Fertility Naturally with Ayurveda', category: 'Fertility', emoji: '\u{1F495}',
    summary: 'How to improve egg quality, balance hormones, and boost fertility through Ayurvedic diet, herbs, and lifestyle.',
    content: 'Ayurveda views fertility as the result of healthy rasa dhatu (nutritional essence). When nutrition, digestion, and hormones are balanced, fertility follows naturally.\n\nTop Fertility Herbs:\n\u2022 Shatavari: Queen of fertility herbs. Supports egg quality and uterine health.\n\u2022 Ashwagandha: Reduces stress cortisol, which directly impacts fertility.\n\u2022 Lodhra: Strengthens ovarian function.\n\u2022 Phala Ghrita: Classical fertility-boosting ghee preparation.\n\nDaily Routine for Fertility:\n\u2022 Wake before 6 AM\n\u2022 Warm water with lemon on empty stomach\n\u2022 Yoga: Butterfly pose, Cobra pose, Bridge pose\n\u2022 Meditation for 15 minutes\n\u2022 Shatavari milk at bedtime\n\nTiming:\n\u2022 Best conception days: 2 days before ovulation\n\u2022 Ayurveda recommends intercourse on even days after period ends\n\u2022 Both partners should follow sattvic diet during fertile window',
    author: 'Dr. SheBloom', readTime: '9 min', isPublished: true, isFeatured: false,
    targetAudience: ['fertility'], createdAt: '2024-04-05' },
  { id: 'a5', title: 'Ayurvedic Hair Care: Stop Hairfall in 90 Days', category: 'Skin & Hair', emoji: '\u{1F33F}',
    summary: 'Complete Ayurvedic protocol for hairfall: oils, diet, herbs, and lifestyle changes that deliver real results.',
    content: 'Hair loss in women is often hormonal, stress-related, or nutritional. Ayurveda addresses all three root causes.\n\nThe 90-Day Protocol:\n\nWeek 1-4: Detox Phase\n\u2022 Triphala churna at bedtime (cleanses digestive system)\n\u2022 Bhringraj oil massage 3x/week\n\u2022 Reduce processed foods\n\nWeek 5-8: Nourish Phase\n\u2022 Ashwagandha + Shatavari daily\n\u2022 Add amla, sesame seeds to diet\n\u2022 Weekly hair mask: fenugreek + curd\n\nWeek 9-12: Strengthen Phase\n\u2022 Continue herbal supplements\n\u2022 Nasya (nasal oil drops) with Anu Taila\n\u2022 Shirobhyanga (head massage) weekly\n\nDiet Additions:\n\u2022 Soaked almonds (5 daily)\n\u2022 Coconut water\n\u2022 Iron-rich foods: dates, spinach, beetroot\n\u2022 Biotin-rich: eggs, sweet potatoes',
    author: 'Dr. SheBloom', readTime: '10 min', isPublished: true, isFeatured: false,
    targetAudience: ['all'], createdAt: '2024-05-20' },
  { id: 'a6', title: 'Mental Health & Your Cycle: The Ayurveda Connection', category: 'Mental Health', emoji: '\u{1F9D8}',
    summary: 'Why you feel different emotions at different cycle phases, and Ayurvedic tools to manage mood naturally.',
    content: 'Ayurveda recognizes that each menstrual phase has a dominant dosha:\n\nMenstrual Phase (Vata): Anxiety, restlessness\n\u2192 Remedy: Warm oil massage, warm foods, rest\n\nFollicular Phase (Kapha\u2192Pitta): Energy building\n\u2192 Remedy: Exercise, social activity, new projects\n\nOvulation (Pitta peak): Confidence, but irritability\n\u2192 Remedy: Cooling foods, moonlight walks, meditation\n\nLuteal Phase (Vata rising): Mood swings, sadness\n\u2192 Remedy: Ashwagandha milk, journaling, gentle yoga\n\nDaily Practices:\n\u2022 Abhyanga (self-massage) with sesame oil\n\u2022 Nasya (nasal oil) for mental clarity\n\u2022 Pranayama: Nadi Shodhana (alternate nostril breathing)\n\u2022 Brahmi tea for calm focus\n\u2022 Digital detox 1 hour before bed',
    author: 'Dr. SheBloom', readTime: '6 min', isPublished: true, isFeatured: false,
    targetAudience: ['all'], createdAt: '2024-06-10' },
];

const defaultRecipes: DIYRecipe[] = [
  { id: 'r1', title: 'Anti-Hairfall Hair Mask', emoji: '\u{1F33F}', description: 'Powerful home hair mask to stop hairfall naturally.',
    ingredients: [{ name: 'Fenugreek seeds (soaked overnight)', amount: '2 tbsp' }, { name: 'Curd / Yogurt', amount: '3 tbsp' }, { name: 'Curry leaves (ground)', amount: '10-12' }, { name: 'Coconut oil', amount: '1 tbsp' }, { name: 'Amla powder', amount: '1 tsp' }],
    steps: ['Soak fenugreek overnight', 'Grind into paste with curry leaves', 'Mix curd, oil, amla powder', 'Apply scalp to tip', 'Leave 45 min, wash with mild shampoo', 'Use 2x/week for 2 months'],
    benefits: ['Strengthens roots', 'Reduces hairfall', 'Adds volume', 'Natural conditioning'],
    targetAudience: ['all'], isPublished: true, prepTime: '15 min + 45 min', difficulty: 'Easy' },
  { id: 'r2', title: 'Glowing Skin Ubtan', emoji: '\u2728', description: 'Traditional ubtan for bridal glow. Chemical-free, all skin types.',
    ingredients: [{ name: 'Besan (Gram flour)', amount: '3 tbsp' }, { name: 'Turmeric powder', amount: '1/2 tsp' }, { name: 'Raw milk', amount: '2 tbsp' }, { name: 'Honey', amount: '1 tsp' }, { name: 'Saffron strands', amount: '4-5' }, { name: 'Rose water', amount: '1 tsp' }],
    steps: ['Soak saffron in warm milk 10 min', 'Mix besan and turmeric', 'Add saffron milk, honey, rose water', 'Make smooth paste', 'Apply face and neck upward', 'Dry 20 min, scrub off gently'],
    benefits: ['Instant glow', 'Removes tan', 'Exfoliates', 'Evens tone'],
    targetAudience: ['all'], isPublished: true, prepTime: '10 min + 20 min', difficulty: 'Easy' },
  { id: 'r3', title: 'Fertility Boosting Drink', emoji: '\u{1F33A}', description: 'Ayurvedic drink for reproductive health. Best during follicular phase.',
    ingredients: [{ name: 'Shatavari powder', amount: '1 tsp' }, { name: 'Warm A2 cow milk', amount: '1 glass' }, { name: 'Ashwagandha powder', amount: '1/2 tsp' }, { name: 'Ghee', amount: '1 tsp' }, { name: 'Honey', amount: '1 tsp' }, { name: 'Cardamom powder', amount: '1 pinch' }],
    steps: ['Warm milk (don\'t boil)', 'Add Shatavari and Ashwagandha', 'Stir in ghee and cardamom', 'Cool slightly, add honey', 'Drink before bedtime daily', 'Best during Days 5-14 of cycle'],
    benefits: ['Supports ovulation', 'Balances hormones', 'Improves egg quality', 'Reduces stress'],
    targetAudience: ['fertility'], isPublished: true, prepTime: '5 min', difficulty: 'Easy' },
  { id: 'r4', title: 'Period Cramp Relief Oil', emoji: '\u{1FA78}', description: 'Massage this warm oil on abdomen for natural cramp relief.',
    ingredients: [{ name: 'Sesame oil', amount: '50ml' }, { name: 'Ajwain (Carom seeds)', amount: '1 tbsp' }, { name: 'Ginger (grated)', amount: '1 inch' }, { name: 'Garlic cloves', amount: '2' }, { name: 'Castor oil', amount: '1 tsp' }],
    steps: ['Heat sesame oil on low flame', 'Add ajwain, ginger, garlic', 'Cook low 10 min until golden', 'Strain and add castor oil', 'Store in glass bottle (3 months shelf life)', 'Warm before use, massage clockwise on abdomen'],
    benefits: ['Relieves cramps', 'Improves circulation', 'Reduces bloating', 'Calms muscles'],
    targetAudience: ['periods'], isPublished: true, prepTime: '15 min', difficulty: 'Easy' },
];

// ─── Store ───────────────────────────────────────
interface CMSState {
  // Admin
  isAdmin: boolean;
  adminPin: string;
  // Data
  products: Product[];
  articles: Article[];
  doctors: Doctor[];
  recipes: DIYRecipe[];
  // Admin actions
  loginAdmin: (pin: string) => boolean;
  logoutAdmin: () => void;
  // Products
  addProduct: (p: Product) => void;
  updateProduct: (id: string, data: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  toggleProductPublish: (id: string) => void;
  toggleProductFeatured: (id: string) => void;
  // Articles
  addArticle: (a: Article) => void;
  updateArticle: (id: string, data: Partial<Article>) => void;
  deleteArticle: (id: string) => void;
  toggleArticlePublish: (id: string) => void;
  toggleArticleFeatured: (id: string) => void;
  // Doctors
  addDoctor: (d: Doctor) => void;
  updateDoctor: (id: string, data: Partial<Doctor>) => void;
  deleteDoctor: (id: string) => void;
  setChiefDoctor: (id: string) => void;
  toggleDoctorPublish: (id: string) => void;
  // Recipes
  addRecipe: (r: DIYRecipe) => void;
  deleteRecipe: (id: string) => void;
  toggleRecipePublish: (id: string) => void;
}

export const useCMSStore = create<CMSState>()(
  persist(
    (set, get) => ({
      isAdmin: false,
      adminPin: ADMIN_PIN,
      products: defaultProducts,
      articles: defaultArticles,
      doctors: defaultDoctors,
      recipes: defaultRecipes,

      loginAdmin: (pin: string) => {
        if (pin === get().adminPin) { set({ isAdmin: true }); return true; }
        return false;
      },
      logoutAdmin: () => set({ isAdmin: false }),

      addProduct: (p) => set(s => ({ products: [...s.products, p] })),
      updateProduct: (id, data) => set(s => ({ products: s.products.map(p => p.id === id ? { ...p, ...data } : p) })),
      deleteProduct: (id) => set(s => ({ products: s.products.filter(p => p.id !== id) })),
      toggleProductPublish: (id) => set(s => ({ products: s.products.map(p => p.id === id ? { ...p, isPublished: !p.isPublished } : p) })),
      toggleProductFeatured: (id) => set(s => ({ products: s.products.map(p => p.id === id ? { ...p, isFeatured: !p.isFeatured } : p) })),

      addArticle: (a) => set(s => ({ articles: [...s.articles, a] })),
      updateArticle: (id, data) => set(s => ({ articles: s.articles.map(a => a.id === id ? { ...a, ...data } : a) })),
      deleteArticle: (id) => set(s => ({ articles: s.articles.filter(a => a.id !== id) })),
      toggleArticlePublish: (id) => set(s => ({ articles: s.articles.map(a => a.id === id ? { ...a, isPublished: !a.isPublished } : a) })),
      toggleArticleFeatured: (id) => set(s => ({ articles: s.articles.map(a => a.id === id ? { ...a, isFeatured: !a.isFeatured } : a) })),

      addDoctor: (d) => set(s => ({ doctors: [...s.doctors, d] })),
      updateDoctor: (id, data) => set(s => ({ doctors: s.doctors.map(d => d.id === id ? { ...d, ...data } : d) })),
      deleteDoctor: (id) => set(s => ({ doctors: s.doctors.filter(d => d.id !== id) })),
      setChiefDoctor: (id) => set(s => ({ doctors: s.doctors.map(d => ({ ...d, isChief: d.id === id })) })),
      toggleDoctorPublish: (id) => set(s => ({ doctors: s.doctors.map(d => d.id === id ? { ...d, isPublished: !d.isPublished } : d) })),

      addRecipe: (r) => set(s => ({ recipes: [...s.recipes, r] })),
      deleteRecipe: (id) => set(s => ({ recipes: s.recipes.filter(r => r.id !== id) })),
      toggleRecipePublish: (id) => set(s => ({ recipes: s.recipes.map(r => r.id === id ? { ...r, isPublished: !r.isPublished } : r) })),
    }),
    { name: 'shebloom-cms' }
  )
);
