import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ProductCategory = 'hair_oil' | 'body_lotion' | 'face_wash' | 'body_wash' | 'hair_treatment' | 'supplement' | 'skincare';
export type TargetAudience = 'all' | 'periods' | 'fertility' | 'pregnancy' | 'wellness';

export interface AyurvedaProduct {
  id: string; name: string; category: ProductCategory;
  price: number; discountPrice?: number; description: string;
  ingredients: string[]; benefits: string[]; howToUse: string;
  size: string; emoji: string; rating: number; reviews: number;
  inStock: boolean; isPublished: boolean; isFeatured: boolean;
  targetAudience: TargetAudience[]; tags: string[];
  preparationMethod?: string; doctorNote?: string; createdAt: string;
}

export interface Article {
  id: string; title: string; content: string; category: string;
  author: string; readTime: string; emoji: string;
  isPublished: boolean; isFeatured: boolean;
  targetAudience: TargetAudience[]; createdAt: string;
}

export interface DIYRecipe {
  id: string; title: string; emoji: string; description: string;
  ingredients: { name: string; amount: string }[]; steps: string[];
  benefits: string[]; targetAudience: TargetAudience[];
  isPublished: boolean; prepTime: string; difficulty: 'Easy' | 'Medium' | 'Advanced';
}

export interface DoctorListing {
  id: string; name: string; specialization: string; experience: number;
  rating: number; reviews: number; fee: number; feeFreeForPoor: boolean;
  tags: string[]; languages: string[]; about: string;
  isChief: boolean; isPublished: boolean; phone?: string; qualification: string;
}

// ─── Default Data ────────────────────────────────
const defaultProducts: AyurvedaProduct[] = [
  { id: 'p1', name: 'Bhringraj Hair Growth Oil', category: 'hair_oil', price: 450, discountPrice: 349, size: '200ml', emoji: '\u{1F33F}',
    description: 'Handcrafted Ayurvedic hair oil with Bhringraj, Amla, and Brahmi. Cold-pressed with coconut oil base. Made fresh in small batches.',
    ingredients: ['Bhringraj (Eclipta alba)', 'Amla (Indian Gooseberry)', 'Brahmi', 'Virgin Coconut Oil', 'Curry Leaves', 'Fenugreek Seeds', 'Hibiscus Petals'],
    benefits: ['Reduces hair fall by 60% in 3 months', 'Promotes new hair growth', 'Prevents premature greying', 'Strengthens hair roots'],
    howToUse: 'Warm slightly, massage into scalp 10 min. Leave overnight or 2+ hours. Wash with mild shampoo. Use 2-3x/week.',
    rating: 4.8, reviews: 127, inStock: true, isPublished: true, isFeatured: true,
    targetAudience: ['all'], tags: ['bestseller', 'handmade'],
    preparationMethod: 'Slow-cooked 72 hours using traditional Ayurvedic "Taila Paka" method. No preservatives.',
    doctorNote: 'I personally source each herb from organic farms in Kerala. This follows formulations used in traditional clinics for centuries.',
    createdAt: '2024-01-15' },
  { id: 'p2', name: 'Kumkumadi Night Face Oil', category: 'skincare', price: 650, discountPrice: 499, size: '30ml', emoji: '\u2728',
    description: 'Premium Kumkumadi Tailam with 16 herbs including real Saffron. Reduces dark spots and gives natural glow.',
    ingredients: ['Saffron (Kumkuma)', 'Sandalwood', 'Manjistha', 'Licorice Root', 'Lotus Petals', 'Sesame Oil Base'],
    benefits: ['Fades dark spots & pigmentation', 'Natural glow in 2 weeks', 'Anti-aging', 'Evens skin tone'],
    howToUse: 'Apply 4-5 drops on cleansed face at night. Massage upward 2 min. Leave overnight.',
    rating: 4.9, reviews: 89, inStock: true, isPublished: true, isFeatured: true,
    targetAudience: ['all'], tags: ['premium'], createdAt: '2024-02-10',
    doctorNote: 'Our saffron is sourced from Kashmir \u2014 each bottle uses 0.5g of real saffron strands.' },
  { id: 'p3', name: 'Neem & Tulsi Face Wash', category: 'face_wash', price: 280, discountPrice: 220, size: '150ml', emoji: '\u{1F33B}',
    description: 'Gentle, sulfate-free face wash. Controls acne without stripping natural oils.',
    ingredients: ['Neem Extract', 'Tulsi (Holy Basil)', 'Aloe Vera', 'Turmeric', 'Rose Water', 'Honey'],
    benefits: ['Controls acne', 'Anti-bacterial', 'Gentle cleansing', 'Does not dry skin'],
    howToUse: 'Wet face, massage coin-sized amount 60 sec. Rinse. Use twice daily.',
    rating: 4.7, reviews: 203, inStock: true, isPublished: true, isFeatured: false,
    targetAudience: ['all'], tags: ['bestseller'], createdAt: '2024-01-20' },
  { id: 'p4', name: 'Shatavari Body Lotion', category: 'body_lotion', price: 380, discountPrice: 299, size: '200ml', emoji: '\u{1F338}',
    description: 'Deeply moisturizing with Shatavari \u2014 queen of herbs for women. Reduces stretch marks.',
    ingredients: ['Shatavari Extract', 'Shea Butter', 'Almond Oil', 'Rose Extract', 'Vitamin E', 'Aloe Vera'],
    benefits: ['24-hour moisturization', 'Hormonal balance support', 'Reduces stretch marks', 'Anti-aging'],
    howToUse: 'Apply on damp skin after shower. Safe during pregnancy.',
    rating: 4.6, reviews: 156, inStock: true, isPublished: true, isFeatured: false,
    targetAudience: ['all', 'pregnancy'], tags: ['pregnancy-safe'], createdAt: '2024-03-05',
    doctorNote: 'Shatavari is especially beneficial during pregnancy. 100% safe for expecting mothers.' },
  { id: 'p5', name: 'Hairfall Rescue Kit (90-Day)', category: 'hair_treatment', price: 1200, discountPrice: 899, size: 'Complete Kit', emoji: '\u{1F489}',
    description: 'Complete 90-day treatment: medicated oil + herbal powder + supplements. Doctor consultation included.',
    ingredients: ['Bhringraj Oil (100ml)', 'Herbal Hair Pack (150g)', 'Ashwagandha+Biotin Capsules (90)', 'Scalp Massage Comb'],
    benefits: ['Reduces hairfall up to 70%', 'Strengthens root to tip', 'Includes diet plan', 'Doctor consultation included'],
    howToUse: 'Follow 90-day protocol card. Oil 3x/week, hair pack 2x/week, capsule daily.',
    rating: 4.9, reviews: 67, inStock: true, isPublished: true, isFeatured: true,
    targetAudience: ['all'], tags: ['bestseller', 'treatment'], createdAt: '2024-05-01',
    doctorNote: 'My signature protocol. 200+ patients recovered from severe hairfall. Results from week 4.' },
  { id: 'p6', name: 'Fertility Support Tonic', category: 'supplement', price: 550, discountPrice: 449, size: '500ml', emoji: '\u{1F33A}',
    description: 'Traditional fertility tonic with Shatavari, Ashwagandha, Lodhra. Supports reproductive health.',
    ingredients: ['Shatavari', 'Ashwagandha', 'Lodhra', 'Dashmool', 'Guduchi', 'Honey', 'Ghee Base'],
    benefits: ['Supports fertility', 'Regulates cycles', 'Reduces PCOD symptoms', 'Balances hormones'],
    howToUse: '15ml twice daily with warm milk, 30 min before meals. Continue 3+ months.',
    rating: 4.7, reviews: 45, inStock: true, isPublished: true, isFeatured: true,
    targetAudience: ['fertility', 'periods'], tags: ['fertility'], createdAt: '2024-06-15',
    doctorNote: 'Classical "Shatavari Ghrita" with modern adaptations. Effective for irregular cycles or PCOD.' },
  { id: 'p7', name: 'Prenatal Glow Cream', category: 'skincare', price: 480, discountPrice: 399, size: '100g', emoji: '\u{1F930}',
    description: 'Chemical-free moisturizer for pregnancy. Prevents stretch marks across all trimesters.',
    ingredients: ['Shea Butter', 'Cocoa Butter', 'Almond Oil', 'Vitamin E', 'Saffron', 'Sandalwood'],
    benefits: ['Prevents stretch marks', '100% pregnancy-safe', 'Deep nourishment', 'Reduces itching'],
    howToUse: 'Apply on belly, breasts, thighs twice daily. Safe from first trimester.',
    rating: 4.8, reviews: 112, inStock: true, isPublished: true, isFeatured: false,
    targetAudience: ['pregnancy'], tags: ['pregnancy-safe'], createdAt: '2024-07-01',
    doctorNote: 'Every ingredient is pregnancy-safe. I recommend this from week 12 onwards.' },
];

const defaultArticles: Article[] = [
  { id: 'a1', title: 'Understanding PCOD: Complete Ayurvedic Guide', content: 'PCOD (Polycystic Ovarian Disease) affects 1 in 5 women in India. In Ayurveda, it is linked to Kapha and Pitta imbalance...',
    category: 'PCOD', author: 'chief', readTime: '8 min', emoji: '\u{1F33F}', isPublished: true, isFeatured: true, targetAudience: ['all'], createdAt: '2024-08-01' },
  { id: 'a2', title: '5 Ayurvedic Remedies for Period Pain', content: 'Menstrual cramps are caused by prostaglandins. Ayurveda offers natural alternatives...',
    category: 'Periods', author: 'chief', readTime: '5 min', emoji: '\u{1FA78}', isPublished: true, isFeatured: false, targetAudience: ['periods'], createdAt: '2024-08-05' },
  { id: 'a3', title: 'Fertility Boosting Foods in Ayurveda', content: 'Shatavari, Ashwagandha, and specific dietary practices can improve fertility naturally...',
    category: 'Fertility', author: 'chief', readTime: '7 min', emoji: '\u{1F495}', isPublished: true, isFeatured: true, targetAudience: ['fertility'], createdAt: '2024-08-10' },
  { id: 'a4', title: 'Pregnancy Nutrition: Trimester-wise Guide', content: 'Each trimester has different nutritional needs. First trimester focuses on folic acid...',
    category: 'Pregnancy', author: 'chief', readTime: '10 min', emoji: '\u{1F930}', isPublished: true, isFeatured: false, targetAudience: ['pregnancy'], createdAt: '2024-08-15' },
  { id: 'a5', title: 'Hair Fall? Try These Ayurvedic Solutions', content: 'Hair fall in women is often linked to iron deficiency, hormonal imbalance, or stress...',
    category: 'Hair Care', author: 'chief', readTime: '6 min', emoji: '\u{1F33F}', isPublished: true, isFeatured: false, targetAudience: ['all'], createdAt: '2024-08-20' },
  { id: 'a6', title: 'Yoga Poses for Menstrual Relief', content: 'Gentle yoga during periods can reduce cramps and improve mood...',
    category: 'Wellness', author: 'chief', readTime: '5 min', emoji: '\u{1F9D8}', isPublished: true, isFeatured: false, targetAudience: ['all'], createdAt: '2024-09-01' },
  { id: 'a7', title: 'Hormonal Imbalance: 7 Warning Signs', content: 'Irregular periods, weight gain, fatigue, acne, and mood swings can all indicate hormonal issues...',
    category: 'Health', author: 'chief', readTime: '7 min', emoji: '\u{1F4CB}', isPublished: true, isFeatured: true, targetAudience: ['all'], createdAt: '2024-09-10' },
];

const defaultRecipes: DIYRecipe[] = [
  { id: 'r1', title: 'Anti-Hairfall Hair Mask', emoji: '\u{1F33F}', description: 'Powerful mask to stop hairfall naturally.',
    ingredients: [{ name: 'Fenugreek seeds (soaked overnight)', amount: '2 tbsp' }, { name: 'Curd / Yogurt', amount: '3 tbsp' }, { name: 'Curry leaves (ground)', amount: '10-12' }, { name: 'Coconut oil', amount: '1 tbsp' }, { name: 'Amla powder', amount: '1 tsp' }],
    steps: ['Soak fenugreek overnight', 'Grind into paste with curry leaves', 'Mix in curd, oil, amla', 'Apply scalp to tip', 'Leave 45 min, wash with mild shampoo', 'Use 2x/week for 2 months'],
    benefits: ['Strengthens roots', 'Reduces hairfall', 'Adds shine'], targetAudience: ['all'], isPublished: true, prepTime: '15 min + 45 min', difficulty: 'Easy' },
  { id: 'r2', title: 'Glowing Skin Ubtan', emoji: '\u2728', description: 'Traditional Indian ubtan for bridal glow.',
    ingredients: [{ name: 'Besan (Gram flour)', amount: '3 tbsp' }, { name: 'Turmeric', amount: '1/2 tsp' }, { name: 'Raw milk', amount: '2 tbsp' }, { name: 'Honey', amount: '1 tsp' }, { name: 'Saffron strands', amount: '4-5' }],
    steps: ['Soak saffron in warm milk 10 min', 'Mix besan + turmeric', 'Add saffron milk + honey', 'Apply on face + neck', 'Dry 20 min, scrub off gently'],
    benefits: ['Instant glow', 'Removes tan', 'Exfoliates', 'Evens tone'], targetAudience: ['all'], isPublished: true, prepTime: '10 min + 20 min', difficulty: 'Easy' },
  { id: 'r3', title: 'Fertility Boosting Drink', emoji: '\u{1F33A}', description: 'Ancient Ayurvedic drink for reproductive health.',
    ingredients: [{ name: 'Shatavari powder', amount: '1 tsp' }, { name: 'Warm A2 milk', amount: '1 glass' }, { name: 'Ashwagandha powder', amount: '1/2 tsp' }, { name: 'Ghee', amount: '1 tsp' }, { name: 'Honey', amount: '1 tsp' }],
    steps: ['Warm milk (don\'t boil)', 'Add Shatavari + Ashwagandha', 'Stir in ghee', 'Cool slightly, add honey', 'Drink before bed, daily 3 months'],
    benefits: ['Supports ovulation', 'Balances hormones', 'Improves egg quality'], targetAudience: ['fertility'], isPublished: true, prepTime: '5 min', difficulty: 'Easy' },
  { id: 'r4', title: 'Period Pain Relief Oil', emoji: '\u{1FA78}', description: 'Massage oil for natural cramp relief.',
    ingredients: [{ name: 'Sesame oil', amount: '50ml' }, { name: 'Ajwain (Carom seeds)', amount: '1 tbsp' }, { name: 'Ginger (grated)', amount: '1 inch' }, { name: 'Garlic cloves', amount: '2' }],
    steps: ['Heat sesame oil on low', 'Add ajwain, ginger, garlic', 'Cook low 10 min till golden', 'Strain, store in glass bottle', 'Warm before use, massage lower abdomen clockwise'],
    benefits: ['Relieves cramps', 'Improves circulation', 'Reduces bloating'], targetAudience: ['periods'], isPublished: true, prepTime: '15 min', difficulty: 'Easy' },
];

const defaultDoctors: DoctorListing[] = [
  { id: 'd_chief', name: 'Dr. SheBloom', specialization: 'Ayurveda & Women\'s Health', experience: 10, rating: 4.9, reviews: 847,
    fee: 200, feeFreeForPoor: true, tags: ['PCOD Expert', 'Fertility', 'Pregnancy Care', 'Hair & Skin'],
    languages: ['Hindi', 'English', 'Marathi', 'Kannada'], qualification: 'BAMS, MD (Ayurveda)',
    about: 'Passionate about genuine Ayurvedic healthcare for every woman. Each product is handcrafted with love. Free consultations for those who cannot afford.',
    isChief: true, isPublished: true },
  { id: 'd2', name: 'Dr. Priya Sharma', specialization: 'Gynecologist', experience: 12, rating: 4.9, reviews: 847,
    fee: 300, feeFreeForPoor: false, tags: ['PCOD Expert'], languages: ['English', 'Hindi'], qualification: 'MBBS, MS (OBG)',
    about: 'Specializes in PCOD management and menstrual disorders.', isChief: false, isPublished: true },
  { id: 'd3', name: 'Dr. Anita Desai', specialization: 'Obstetrician', experience: 18, rating: 4.8, reviews: 1203,
    fee: 500, feeFreeForPoor: false, tags: ['High Risk Pregnancy'], languages: ['English'], qualification: 'MBBS, DGO, DNB',
    about: 'Expert in high-risk pregnancies with 18 years of experience.', isChief: false, isPublished: true },
  { id: 'd4', name: 'Dr. Meera Nair', specialization: 'Fertility Specialist', experience: 15, rating: 4.9, reviews: 632,
    fee: 450, feeFreeForPoor: false, tags: ['IVF', 'IUI'], languages: ['English', 'Tamil'], qualification: 'MBBS, MS, Fellowship in Reproductive Medicine',
    about: 'Fertility expert helping couples achieve their dream of parenthood.', isChief: false, isPublished: true },
];

interface StoreState {
  // Admin
  adminPin: string;
  isAdminUnlocked: boolean;
  unlockAdmin: (pin: string) => boolean;
  lockAdmin: () => void;
  changePin: (oldPin: string, newPin: string) => boolean;
  // Products
  products: AyurvedaProduct[];
  addProduct: (p: AyurvedaProduct) => void;
  updateProduct: (id: string, data: Partial<AyurvedaProduct>) => void;
  deleteProduct: (id: string) => void;
  togglePublish: (id: string) => void;
  toggleFeatured: (id: string) => void;
  // Articles
  articles: Article[];
  addArticle: (a: Article) => void;
  updateArticle: (id: string, data: Partial<Article>) => void;
  deleteArticle: (id: string) => void;
  toggleArticlePublish: (id: string) => void;
  toggleArticleFeatured: (id: string) => void;
  // Recipes
  recipes: DIYRecipe[];
  addRecipe: (r: DIYRecipe) => void;
  deleteRecipe: (id: string) => void;
  // Doctors
  doctors: DoctorListing[];
  addDoctor: (d: DoctorListing) => void;
  updateDoctor: (id: string, data: Partial<DoctorListing>) => void;
  deleteDoctor: (id: string) => void;
  toggleDoctorPublish: (id: string) => void;
}

export const useAyurvedaStore = create<StoreState>()(
  persist(
    (set, get) => ({
      adminPin: 'SheBloom@2024#Admin',
      isAdminUnlocked: false,
      unlockAdmin: (pin) => { if (pin === get().adminPin) { set({ isAdminUnlocked: true }); return true; } return false; },
      lockAdmin: () => set({ isAdminUnlocked: false }),
      changePin: (oldPin, newPin) => { if (oldPin === get().adminPin && newPin.length >= 8) { set({ adminPin: newPin }); return true; } return false; },
      products: defaultProducts, articles: defaultArticles, recipes: defaultRecipes, doctors: defaultDoctors,
      addProduct: (p) => set((s) => ({ products: [...s.products, p] })),
      updateProduct: (id, data) => set((s) => ({ products: s.products.map(p => p.id === id ? { ...p, ...data } : p) })),
      deleteProduct: (id) => set((s) => ({ products: s.products.filter(p => p.id !== id) })),
      togglePublish: (id) => set((s) => ({ products: s.products.map(p => p.id === id ? { ...p, isPublished: !p.isPublished } : p) })),
      toggleFeatured: (id) => set((s) => ({ products: s.products.map(p => p.id === id ? { ...p, isFeatured: !p.isFeatured } : p) })),
      addArticle: (a) => set((s) => ({ articles: [...s.articles, a] })),
      updateArticle: (id, data) => set((s) => ({ articles: s.articles.map(a => a.id === id ? { ...a, ...data } : a) })),
      deleteArticle: (id) => set((s) => ({ articles: s.articles.filter(a => a.id !== id) })),
      toggleArticlePublish: (id) => set((s) => ({ articles: s.articles.map(a => a.id === id ? { ...a, isPublished: !a.isPublished } : a) })),
      toggleArticleFeatured: (id) => set((s) => ({ articles: s.articles.map(a => a.id === id ? { ...a, isFeatured: !a.isFeatured } : a) })),
      addRecipe: (r) => set((s) => ({ recipes: [...s.recipes, r] })),
      deleteRecipe: (id) => set((s) => ({ recipes: s.recipes.filter(r => r.id !== id) })),
      addDoctor: (d) => set((s) => ({ doctors: [...s.doctors, d] })),
      updateDoctor: (id, data) => set((s) => ({ doctors: s.doctors.map(d => d.id === id ? { ...d, ...data } : d) })),
      deleteDoctor: (id) => set((s) => ({ doctors: s.doctors.filter(d => d.id !== id && d.isChief !== true) })),
      toggleDoctorPublish: (id) => set((s) => ({ doctors: s.doctors.map(d => d.id === id ? { ...d, isPublished: !d.isPublished } : d) })),
    }),
    { name: 'shebloom-ayurveda' }
  )
);
