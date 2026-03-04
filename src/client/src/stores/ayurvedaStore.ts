import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ProductCategory = 'hair_oil' | 'body_lotion' | 'face_wash' | 'body_wash' | 'hair_treatment' | 'supplement' | 'skincare';
export type TargetAudience = 'all' | 'periods' | 'fertility' | 'pregnancy' | 'wellness';

export interface AyurvedaProduct {
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

export interface DoctorProfile {
  name: string;
  title: string;
  qualification: string;
  experience: string;
  specialization: string[];
  about: string;
  philosophy: string;
  consultationFee: string;
  freeForPoor: boolean;
  phone?: string;
  languages: string[];
}

// ─── Default Products ────────────────────────────
const defaultProducts: AyurvedaProduct[] = [
  {
    id: 'p1', name: 'Bhringraj Hair Growth Oil', category: 'hair_oil',
    price: 450, discountPrice: 349, size: '200ml', emoji: '\u{1F33F}',
    description: 'Handcrafted Ayurvedic hair oil with Bhringraj, Amla, and Brahmi. Cold-pressed with coconut oil base. Made fresh in small batches for maximum potency.',
    ingredients: ['Bhringraj (Eclipta alba)', 'Amla (Indian Gooseberry)', 'Brahmi', 'Virgin Coconut Oil', 'Curry Leaves', 'Fenugreek Seeds', 'Hibiscus Petals', 'Neem Leaves'],
    benefits: ['Reduces hair fall by 60% in 3 months', 'Promotes new hair growth', 'Prevents premature greying', 'Strengthens hair roots', 'Conditions scalp naturally'],
    howToUse: 'Warm slightly and massage into scalp for 10 minutes. Leave overnight or minimum 2 hours. Wash with mild shampoo. Use 2-3 times per week for best results.',
    rating: 4.8, reviews: 127, inStock: true, isPublished: true, isFeatured: true,
    targetAudience: ['all'], tags: ['bestseller', 'handmade'],
    preparationMethod: 'Each batch is slow-cooked for 72 hours using traditional Ayurvedic "Taila Paka" method. No preservatives, no chemicals.',
    doctorNote: 'I personally source each herb from organic farms in Kerala. This oil follows the same formulation used in traditional Ayurvedic clinics for centuries.',
    createdAt: '2024-01-15',
  },
  {
    id: 'p2', name: 'Kumkumadi Night Face Oil', category: 'skincare',
    price: 650, discountPrice: 499, size: '30ml', emoji: '\u2728',
    description: 'Premium Kumkumadi Tailam for radiant skin. Contains 16 potent herbs including Saffron. Reduces dark spots, pigmentation, and gives a natural glow.',
    ingredients: ['Saffron (Kumkuma)', 'Sandalwood', 'Manjistha', 'Licorice Root', 'Lotus Petals', 'Vetiver', 'Indian Madder', 'Sesame Oil Base'],
    benefits: ['Fades dark spots & pigmentation', 'Natural glow in 2 weeks', 'Anti-aging properties', 'Evens skin tone', 'Reduces acne scars'],
    howToUse: 'Apply 4-5 drops on cleansed face at night. Massage in upward circular motions for 2 minutes. Leave overnight.',
    rating: 4.9, reviews: 89, inStock: true, isPublished: true, isFeatured: true,
    targetAudience: ['all'], tags: ['premium', 'handmade'],
    doctorNote: 'Kumkumadi is the gold standard of Ayurvedic skincare. Our saffron is sourced from Kashmir — each bottle uses 0.5g of real saffron strands.',
    createdAt: '2024-02-10',
  },
  {
    id: 'p3', name: 'Neem & Tulsi Face Wash', category: 'face_wash',
    price: 280, discountPrice: 220, size: '150ml', emoji: '\u{1F33B}',
    description: 'Gentle, sulfate-free face wash with Neem and Tulsi. Controls acne, removes impurities without stripping natural oils. Safe for sensitive skin.',
    ingredients: ['Neem Extract', 'Tulsi (Holy Basil)', 'Aloe Vera Gel', 'Turmeric', 'Rose Water', 'Honey', 'Glycerin (Plant-based)'],
    benefits: ['Controls acne & pimples', 'Anti-bacterial properties', 'Gentle deep cleansing', 'Does not dry skin', 'Reduces inflammation'],
    howToUse: 'Wet face, take coin-sized amount, massage gently for 60 seconds. Rinse with water. Use twice daily.',
    rating: 4.7, reviews: 203, inStock: true, isPublished: true, isFeatured: false,
    targetAudience: ['all'], tags: ['bestseller'], createdAt: '2024-01-20',
  },
  {
    id: 'p4', name: 'Shatavari Body Lotion', category: 'body_lotion',
    price: 380, discountPrice: 299, size: '200ml', emoji: '\u{1F338}',
    description: 'Deeply moisturizing body lotion enriched with Shatavari — the queen of herbs for women. Nourishes skin and balances hormones through topical absorption.',
    ingredients: ['Shatavari Extract', 'Shea Butter', 'Almond Oil', 'Rose Extract', 'Vitamin E', 'Aloe Vera', 'Jojoba Oil'],
    benefits: ['Deep 24-hour moisturization', 'Hormonal balance support', 'Reduces stretch marks', 'Anti-aging nutrients', 'Pleasant natural fragrance'],
    howToUse: 'Apply generously on damp skin after shower. Focus on dry areas. Safe during pregnancy.',
    rating: 4.6, reviews: 156, inStock: true, isPublished: true, isFeatured: false,
    targetAudience: ['all', 'pregnancy'], tags: ['pregnancy-safe'],
    doctorNote: 'Shatavari is especially beneficial during pregnancy and post-partum. This lotion is 100% safe for expecting mothers.',
    createdAt: '2024-03-05',
  },
  {
    id: 'p5', name: 'Triphala & Shikakai Body Wash', category: 'body_wash',
    price: 320, discountPrice: 249, size: '250ml', emoji: '\u{1F4A7}',
    description: 'Gentle sulfate-free body wash with Triphala and Shikakai. Cleanses without chemicals, maintains skin pH, and leaves skin soft.',
    ingredients: ['Triphala (Amla, Haritaki, Bibhitaki)', 'Shikakai', 'Coconut Milk', 'Neem', 'Turmeric', 'Natural Saponins'],
    benefits: ['Chemical-free cleansing', 'Maintains natural skin pH', 'Anti-fungal properties', 'Softens and smoothens skin', 'Eco-friendly formula'],
    howToUse: 'Use on wet skin with loofah or hands. Lather gently and rinse. Safe for daily use.',
    rating: 4.5, reviews: 98, inStock: true, isPublished: true, isFeatured: false,
    targetAudience: ['all'], tags: ['eco-friendly'], createdAt: '2024-04-12',
  },
  {
    id: 'p6', name: 'Hairfall Rescue Treatment Kit', category: 'hair_treatment',
    price: 1200, discountPrice: 899, size: 'Complete Kit', emoji: '\u{1F489}',
    description: 'Complete 90-day Ayurvedic hairfall treatment. Includes medicated oil, herbal powder, and dietary supplement. Clinically observed results.',
    ingredients: ['Bhringraj Oil (100ml)', 'Herbal Hair Pack Powder (150g)', 'Ashwagandha + Biotin Capsules (90)', 'Scalp Massage Comb'],
    benefits: ['Comprehensive 90-day treatment', 'Reduces hairfall by up to 70%', 'Strengthens from root to tip', 'Includes diet plan', 'Doctor consultation included'],
    howToUse: 'Follow the 90-day protocol card included in kit. Oil 3x/week, hair pack 2x/week, capsule daily after meals.',
    rating: 4.9, reviews: 67, inStock: true, isPublished: true, isFeatured: true,
    targetAudience: ['all'], tags: ['bestseller', 'treatment'],
    doctorNote: 'This is my signature treatment protocol. I have personally seen 200+ patients recover from severe hairfall using this exact combination. Results visible from week 4.',
    createdAt: '2024-05-01',
  },
  {
    id: 'p7', name: 'Fertility Support Tonic', category: 'supplement',
    price: 550, discountPrice: 449, size: '500ml (30-day)', emoji: '\u{1F33A}',
    description: 'Traditional Ayurvedic fertility tonic with Shatavari, Ashwagandha, and Lodhra. Supports reproductive health and hormonal balance naturally.',
    ingredients: ['Shatavari', 'Ashwagandha', 'Lodhra', 'Dashmool', 'Jatamansi', 'Guduchi', 'Honey', 'Ghee Base'],
    benefits: ['Supports fertility naturally', 'Regulates menstrual cycle', 'Reduces PCOD symptoms', 'Balances hormones', 'Boosts energy & vitality'],
    howToUse: 'Take 15ml twice daily with warm milk, 30 minutes before meals. Continue for minimum 3 months for best results.',
    rating: 4.7, reviews: 45, inStock: true, isPublished: true, isFeatured: true,
    targetAudience: ['fertility', 'periods'], tags: ['fertility', 'tonic'],
    doctorNote: 'This formulation follows the classical "Shatavari Ghrita" with modern adaptations. Especially effective for women with irregular cycles or PCOD.',
    createdAt: '2024-06-15',
  },
  {
    id: 'p8', name: 'Prenatal Glow Cream', category: 'skincare',
    price: 480, discountPrice: 399, size: '100g', emoji: '\u{1F930}',
    description: 'Safe, chemical-free moisturizer specially formulated for pregnancy. Prevents stretch marks and keeps skin supple during all trimesters.',
    ingredients: ['Shea Butter', 'Cocoa Butter', 'Almond Oil', 'Vitamin E', 'Saffron', 'Sandalwood', 'Manjistha'],
    benefits: ['Prevents stretch marks', '100% pregnancy-safe', 'Deep nourishment', 'Reduces itching', 'Natural fragrance'],
    howToUse: 'Apply on belly, breasts, thighs twice daily. Massage in circular motions. Safe from first trimester.',
    rating: 4.8, reviews: 112, inStock: true, isPublished: true, isFeatured: false,
    targetAudience: ['pregnancy'], tags: ['pregnancy-safe', 'premium'],
    doctorNote: 'Every ingredient is verified pregnancy-safe. I recommend this to all my expecting patients from week 12 onwards.',
    createdAt: '2024-07-01',
  },
];

const defaultRecipes: DIYRecipe[] = [
  {
    id: 'r1', title: 'Anti-Hairfall Hair Mask', emoji: '\u{1F33F}',
    description: 'Powerful Ayurvedic hair mask you can make at home to stop hairfall naturally.',
    ingredients: [
      { name: 'Fenugreek seeds (soaked overnight)', amount: '2 tbsp' },
      { name: 'Curd / Yogurt', amount: '3 tbsp' },
      { name: 'Curry leaves (ground)', amount: '10-12 leaves' },
      { name: 'Coconut oil', amount: '1 tbsp' },
      { name: 'Amla powder', amount: '1 tsp' },
    ],
    steps: [
      'Soak fenugreek seeds overnight in water',
      'Grind into a smooth paste with curry leaves',
      'Mix in curd, coconut oil, and amla powder',
      'Apply on scalp and hair from root to tip',
      'Leave for 45 minutes, then wash with mild shampoo',
      'Use twice a week for 2 months for visible results',
    ],
    benefits: ['Strengthens hair roots', 'Reduces hairfall significantly', 'Adds volume and shine', 'Conditions naturally'],
    targetAudience: ['all'], isPublished: true, prepTime: '15 min + 45 min', difficulty: 'Easy',
  },
  {
    id: 'r2', title: 'Glowing Skin Ubtan', emoji: '\u2728',
    description: 'Traditional Indian ubtan for bridal-like glow. Chemical-free and suitable for all skin types.',
    ingredients: [
      { name: 'Besan (Gram flour)', amount: '3 tbsp' },
      { name: 'Turmeric powder', amount: '1/2 tsp' },
      { name: 'Raw milk', amount: '2 tbsp' },
      { name: 'Honey', amount: '1 tsp' },
      { name: 'Saffron strands (soaked in milk)', amount: '4-5 strands' },
      { name: 'Rose water', amount: '1 tsp' },
    ],
    steps: [
      'Soak saffron in warm milk for 10 minutes',
      'Mix besan and turmeric in a bowl',
      'Add saffron milk, honey, and rose water',
      'Make a smooth paste (not too thick)',
      'Apply on face and neck in upward strokes',
      'Let dry for 20 minutes, scrub off gently with water',
    ],
    benefits: ['Instant glow', 'Removes tan', 'Exfoliates dead skin', 'Evens skin tone'],
    targetAudience: ['all'], isPublished: true, prepTime: '10 min + 20 min', difficulty: 'Easy',
  },
  {
    id: 'r3', title: 'Fertility Boosting Drink', emoji: '\u{1F33A}',
    description: 'Ancient Ayurvedic drink that supports reproductive health. Best taken during follicular phase.',
    ingredients: [
      { name: 'Shatavari powder', amount: '1 tsp' },
      { name: 'Warm milk (A2 cow milk preferred)', amount: '1 glass' },
      { name: 'Ashwagandha powder', amount: '1/2 tsp' },
      { name: 'Ghee (clarified butter)', amount: '1 tsp' },
      { name: 'Honey', amount: '1 tsp' },
      { name: 'Cardamom powder', amount: '1 pinch' },
    ],
    steps: [
      'Warm the milk (do not boil)',
      'Add Shatavari and Ashwagandha powder',
      'Stir in ghee and cardamom',
      'Let it cool slightly, then add honey',
      'Drink before bedtime, daily for 3 months',
      'Best during Days 5-14 of your cycle (follicular phase)',
    ],
    benefits: ['Supports ovulation', 'Balances hormones', 'Improves egg quality', 'Reduces stress'],
    targetAudience: ['fertility'], isPublished: true, prepTime: '5 min', difficulty: 'Easy',
  },
  {
    id: 'r4', title: 'Period Pain Relief Oil', emoji: '\u{1FA78}',
    description: 'Warm this oil and massage on lower abdomen for natural period cramp relief.',
    ingredients: [
      { name: 'Sesame oil', amount: '50ml' },
      { name: 'Ajwain (Carom seeds)', amount: '1 tbsp' },
      { name: 'Ginger (grated)', amount: '1 inch piece' },
      { name: 'Garlic cloves', amount: '2' },
      { name: 'Castor oil', amount: '1 tsp' },
    ],
    steps: [
      'Heat sesame oil on low flame',
      'Add ajwain, ginger, and garlic',
      'Cook on low for 10 minutes until golden',
      'Strain and add castor oil',
      'Store in glass bottle (lasts 3 months)',
      'Warm slightly before use, massage on lower abdomen clockwise',
    ],
    benefits: ['Relieves menstrual cramps', 'Improves blood circulation', 'Reduces bloating', 'Calms muscles naturally'],
    targetAudience: ['periods'], isPublished: true, prepTime: '15 min', difficulty: 'Easy',
  },
];

const defaultDoctor: DoctorProfile = {
  name: 'Dr. SheBloom',
  title: 'Chief Ayurveda Physician',
  qualification: 'BAMS, MD (Ayurveda)',
  experience: '10+ years',
  specialization: ['Women\'s Health', 'PCOD/PCOS', 'Fertility', 'Hair & Skin', 'Pregnancy Care', 'Hormonal Balance'],
  about: 'Passionate about making genuine Ayurvedic healthcare accessible to every woman. Each product is handcrafted with love, using herbs sourced directly from organic farms. For patients who cannot afford treatment, consultations are completely free.',
  philosophy: 'I believe in treating the root cause, not just symptoms. Every woman deserves access to pure, chemical-free wellness solutions — regardless of her financial situation.',
  consultationFee: '\u20B9200 (Free for those in need)',
  freeForPoor: true,
  languages: ['Hindi', 'English', 'Marathi', 'Kannada'],
};

interface AyurvedaState {
  products: AyurvedaProduct[];
  recipes: DIYRecipe[];
  doctor: DoctorProfile;
  isAdmin: boolean;
  setAdmin: (v: boolean) => void;
  addProduct: (p: AyurvedaProduct) => void;
  updateProduct: (id: string, data: Partial<AyurvedaProduct>) => void;
  deleteProduct: (id: string) => void;
  togglePublish: (id: string) => void;
  toggleFeatured: (id: string) => void;
  addRecipe: (r: DIYRecipe) => void;
  updateRecipe: (id: string, data: Partial<DIYRecipe>) => void;
  deleteRecipe: (id: string) => void;
  updateDoctor: (data: Partial<DoctorProfile>) => void;
}

export const useAyurvedaStore = create<AyurvedaState>()(
  persist(
    (set) => ({
      products: defaultProducts,
      recipes: defaultRecipes,
      doctor: defaultDoctor,
      isAdmin: false,
      setAdmin: (isAdmin) => set({ isAdmin }),
      addProduct: (p) => set((s) => ({ products: [...s.products, p] })),
      updateProduct: (id, data) => set((s) => ({ products: s.products.map(p => p.id === id ? { ...p, ...data } : p) })),
      deleteProduct: (id) => set((s) => ({ products: s.products.filter(p => p.id !== id) })),
      togglePublish: (id) => set((s) => ({ products: s.products.map(p => p.id === id ? { ...p, isPublished: !p.isPublished } : p) })),
      toggleFeatured: (id) => set((s) => ({ products: s.products.map(p => p.id === id ? { ...p, isFeatured: !p.isFeatured } : p) })),
      addRecipe: (r) => set((s) => ({ recipes: [...s.recipes, r] })),
      updateRecipe: (id, data) => set((s) => ({ recipes: s.recipes.map(r => r.id === id ? { ...r, ...data } : r) })),
      deleteRecipe: (id) => set((s) => ({ recipes: s.recipes.filter(r => r.id !== id) })),
      updateDoctor: (data) => set((s) => ({ doctor: { ...s.doctor, ...data } })),
    }),
    { name: 'shebloom-ayurveda' }
  )
);
