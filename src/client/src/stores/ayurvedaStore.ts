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
  id: string; title: string; summary: string; content: string; category: string;
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
  isChief: boolean; isPublished: boolean; isPromoted: boolean; phone?: string; qualification: string;
  city?: string; availability?: string; minFee?: number;
}

// ─── Dr. Shruthi R - Chief Doctor ───────────────────
const CHIEF_DOCTOR: DoctorListing = {
  id: 'd_chief', name: 'Dr. Shruthi R', specialization: 'Ayurveda & Women\'s Health',
  experience: 10, rating: 4.9, reviews: 847, fee: 200, feeFreeForPoor: true,
  tags: ['PCOD Expert', 'Fertility', 'Pregnancy Care', 'Hair & Skin', 'Hormonal Balance'],
  languages: ['Hindi', 'English', 'Marathi', 'Kannada'],
  qualification: 'BAMS, MD (Ayurveda)',
  about: 'Passionate about making genuine Ayurvedic healthcare accessible to every woman. Each product is handcrafted with love using herbs sourced directly from organic farms. For patients who cannot afford treatment, consultations are completely free.',
  isChief: true, isPublished: true, isPromoted: true,
  city: 'Bangalore', availability: 'Mon-Sat, 10am-6pm',
};

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
    doctorNote: 'Our saffron is sourced from Kashmir — each bottle uses 0.5g of real saffron strands.' },
  { id: 'p3', name: 'Neem & Tulsi Face Wash', category: 'face_wash', price: 280, discountPrice: 220, size: '150ml', emoji: '\u{1F33B}',
    description: 'Gentle, sulfate-free face wash. Controls acne without stripping natural oils.',
    ingredients: ['Neem Extract', 'Tulsi (Holy Basil)', 'Aloe Vera', 'Turmeric', 'Rose Water', 'Honey'],
    benefits: ['Controls acne', 'Anti-bacterial', 'Gentle cleansing', 'Does not dry skin'],
    howToUse: 'Wet face, massage coin-sized amount 60 sec. Rinse. Use twice daily.',
    rating: 4.7, reviews: 203, inStock: true, isPublished: true, isFeatured: false,
    targetAudience: ['all'], tags: ['bestseller'], createdAt: '2024-01-20' },
  { id: 'p4', name: 'Shatavari Body Lotion', category: 'body_lotion', price: 380, discountPrice: 299, size: '200ml', emoji: '\u{1F338}',
    description: 'Deeply moisturizing with Shatavari — queen of herbs for women. Reduces stretch marks.',
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
  { id: 'a1', title: 'Understanding PCOD/PCOS: The Complete Ayurvedic Guide',
    summary: '1 in 5 Indian women suffer from PCOD. Learn how Ayurveda treats the root cause, not just symptoms.',
    content: 'Polycystic Ovarian Disease affects millions of women globally. Unlike conventional medicine that focuses on hormonal pills, Ayurveda treats PCOD by addressing the root imbalance — typically Kapha and Pitta dosha.\n\nKey Ayurvedic approaches:\n\n1. Shatavari & Ashwagandha for hormonal balance\n2. Triphala for detoxification\n3. Dietary changes: reduce dairy, sugar, and processed foods\n4. Yoga: Butterfly pose, Supta Baddha Konasana\n5. Lifestyle: sleep by 10 PM, morning sunlight\n\nMost patients see improvement in 3-6 months with consistent Ayurvedic treatment. Unlike hormonal pills, Ayurveda addresses the underlying metabolic dysfunction.',
    category: 'PCOD/PCOS', author: 'chief', readTime: '8 min', emoji: '\u{1F33F}', isPublished: true, isFeatured: true, targetAudience: ['all'], createdAt: '2024-08-01' },
  { id: 'a2', title: '5 Powerful Ayurvedic Remedies for Period Pain',
    summary: 'Natural alternatives to painkillers that actually work. Doctor-approved home remedies.',
    content: 'Menstrual cramps (dysmenorrhea) affect 80% of women at some point. Before reaching for ibuprofen, try these Ayurvedic remedies:\n\n1. Ajwain Water: Boil 1 tsp ajwain in water, sip warm. Relieves cramps in 15 minutes.\n\n2. Ginger-Jaggery Tea: Crush fresh ginger, add jaggery, brew. Anti-inflammatory powerhouse.\n\n3. Castor Oil Pack: Warm castor oil on lower abdomen with hot water bottle. Deeply relaxing.\n\n4. Dashmool Decoction: Traditional 10-root formula. Ask your Ayurvedic doctor.\n\n5. Sesame Oil Massage: Warm sesame oil on lower back and abdomen. The warmth and oil penetrate deep.\n\nWhen to see a doctor: If pain is severe enough to miss work/school, or if it worsens over time.',
    category: 'Period Care', author: 'chief', readTime: '5 min', emoji: '\u{1FA78}', isPublished: true, isFeatured: false, targetAudience: ['periods', 'all'], createdAt: '2024-08-05' },
  { id: 'a3', title: 'Fertility Boosting Foods: What Ayurveda Recommends',
    summary: 'Ancient wisdom meets modern science. The foods that actually improve your chances of conceiving.',
    content: 'Ayurveda has a specialized branch called Vajikarana dedicated to reproductive health. Here are the top fertility-boosting foods:\n\nFor Women:\n- Shatavari (Asparagus racemosus): The #1 herb for female fertility\n- Dates with ghee and saffron milk at bedtime\n- Pomegranate: Improves uterine blood flow\n- Black sesame seeds: Rich in iron and zinc\n\nFor Both Partners:\n- Ashwagandha: Reduces stress-related infertility\n- A2 cow milk with turmeric\n- Soaked almonds (7 daily)\n- Organic ghee: Nourishes reproductive tissues\n\nFoods to Avoid:\n- Excess caffeine (max 1 cup/day)\n- Processed/packaged foods\n- Excessive raw/cold foods\n- Alcohol and smoking\n\nBest time to conceive: Ayurveda recommends the Ritu Kala — days 12-16 of your cycle.',
    category: 'Fertility', author: 'chief', readTime: '7 min', emoji: '\u{1F495}', isPublished: true, isFeatured: true, targetAudience: ['fertility'], createdAt: '2024-08-10' },
  { id: 'a4', title: 'Pregnancy Nutrition: Trimester-by-Trimester Ayurvedic Guide',
    summary: 'What to eat in each trimester according to ancient Garbhini Paricharya (pregnancy care) texts.',
    content: 'Ayurveda has a month-by-month pregnancy diet plan called Garbhini Paricharya:\n\nFirst Trimester (Months 1-3):\n- Sweet, cold, liquid foods\n- Milk with honey and ghee\n- Coconut water daily\n- Avoid spicy, heavy foods\n- Folic acid-rich: spinach, lentils\n\nSecond Trimester (Months 4-6):\n- Ghee with rice (increases Ojas)\n- Sweet fruits: banana, mango, grapes\n- Protein: moong dal, paneer\n- Iron-rich: beetroot, pomegranate, dates\n\nThird Trimester (Months 7-9):\n- Light, easily digestible meals\n- Ghee (1 tsp daily from month 8)\n- Dates (6/day from week 36)\n- Red raspberry leaf tea (from week 37)\n\nSupplements: Prenatal vitamins, DHA, Calcium, Vitamin D, Iron.',
    category: 'Pregnancy', author: 'chief', readTime: '10 min', emoji: '\u{1F930}', isPublished: true, isFeatured: false, targetAudience: ['pregnancy'], createdAt: '2024-08-15' },
  { id: 'a5', title: 'Hair Fall in Women: 7 Ayurvedic Solutions That Actually Work',
    summary: 'From Bhringraj oil to diet changes — a complete protocol for stopping hair fall naturally.',
    content: 'Hair fall in women is often linked to iron deficiency, hormonal imbalance, thyroid issues, or stress. Ayurveda treats it as a Pitta imbalance:\n\n1. Bhringraj Oil Massage: 3x/week, leave overnight. The gold standard.\n\n2. Amla + Curry Leaves: Boil together in coconut oil. Apply weekly.\n\n3. Fenugreek Hair Mask: Soak overnight, grind, apply. Protein boost.\n\n4. Diet: Iron (dates, jaggery, spinach), Biotin (eggs, nuts), Zinc (pumpkin seeds).\n\n5. Scalp Detox: Mix neem powder + yogurt. Apply on scalp 30 min.\n\n6. Ashwagandha: 500mg daily. Reduces cortisol-related hairfall.\n\n7. Nasya: 2 drops Anu Taila in each nostril daily. Ancient technique.\n\nTimeline: Visible improvement in 4-6 weeks. Full results in 3-6 months.',
    category: 'Hair Care', author: 'chief', readTime: '6 min', emoji: '\u{1F33F}', isPublished: true, isFeatured: false, targetAudience: ['all'], createdAt: '2024-08-20' },
  { id: 'a6', title: 'Hormonal Imbalance: 10 Warning Signs Every Woman Should Know',
    summary: 'Your body sends clear signals when hormones are off. Learn to read them.',
    content: 'Hormonal imbalances are increasingly common due to stress, diet, and environmental toxins. Watch for these signs:\n\n1. Irregular periods (cycle < 21 or > 35 days)\n2. Unexplained weight gain, especially belly fat\n3. Persistent adult acne (jawline, chin)\n4. Hair thinning or excess facial/body hair\n5. Chronic fatigue despite adequate sleep\n6. Mood swings, anxiety, or depression\n7. Sleep disturbances\n8. Low libido\n9. Digestive issues (bloating, constipation)\n10. Brain fog and poor concentration\n\nIf you have 3+ of these, consult a doctor.\n\nAyurvedic approach: Balance your dosha through diet, herbs (Shatavari, Ashoka, Lodhra), yoga, and lifestyle changes. Most hormonal issues resolve in 3-6 months with consistent Ayurvedic treatment.',
    category: 'Women\'s Health', author: 'chief', readTime: '7 min', emoji: '\u{1F4CB}', isPublished: true, isFeatured: true, targetAudience: ['all'], createdAt: '2024-09-10' },
  { id: 'a7', title: 'Endometriosis: What Every Woman Needs to Know',
    summary: 'Affects 10% of women globally but takes 7-10 years to diagnose. Know the signs early.',
    content: 'Endometriosis is a condition where tissue similar to the uterine lining grows outside the uterus. It affects 190 million women worldwide.\n\nSymptoms:\n- Severe period pain that worsens over time\n- Pain during intercourse\n- Pain during bowel movements\n- Heavy periods or bleeding between periods\n- Difficulty getting pregnant\n- Chronic fatigue\n\nDiagnosis: Often takes 7-10 years. Ask for an ultrasound or laparoscopy if you suspect it.\n\nAyurvedic Management:\n- Castor oil packs on lower abdomen\n- Anti-inflammatory diet (turmeric, ginger, omega-3)\n- Shatavari and Ashoka bark\n- Yoga: Supta Baddha Konasana, Viparita Karani\n- Stress management (cortisol worsens inflammation)\n\nWhen to see a specialist: If pain affects daily life or you have difficulty conceiving.',
    category: 'Women\'s Health', author: 'chief', readTime: '8 min', emoji: '\u{1F3E5}', isPublished: true, isFeatured: false, targetAudience: ['all'], createdAt: '2024-09-15' },
  { id: 'a8', title: 'Mental Health & Your Cycle: The Connection Nobody Talks About',
    summary: 'Why you feel different each week and how to use your cycle as a superpower.',
    content: 'Your menstrual cycle isn\'t just about periods — it\'s a monthly hormonal symphony that affects your brain, mood, energy, and even creativity.\n\nWeek 1 (Period): Hormones lowest. Rest, reflect, journal. Don\'t push yourself.\n\nWeek 2 (Follicular): Estrogen rising. Energy UP. Best week for:\n- Starting projects\n- Job interviews\n- Socializing\n- Intense workouts\n\nWeek 3 (Ovulation): Peak confidence. Best for:\n- Public speaking\n- Difficult conversations\n- Creative work\n\nWeek 4 (Luteal): Progesterone dominant. Energy drops. Best for:\n- Finishing tasks\n- Organizing\n- Self-care\n- Saying no to extras\n\nPMDD (Premenstrual Dysphoric Disorder): If your PMS is severe enough to affect work or relationships, it might be PMDD. This is a real medical condition — talk to your doctor.\n\nGlobal note: In many cultures, discussing periods and mental health is still taboo. Breaking this silence helps every woman.',
    category: 'Mental Health', author: 'chief', readTime: '6 min', emoji: '\u{1F9E0}', isPublished: true, isFeatured: false, targetAudience: ['all'], createdAt: '2024-09-20' },
  { id: 'a9', title: 'Thyroid & Women: Why It Affects Us 8x More Than Men',
    summary: 'The silent epidemic affecting 1 in 8 women. Symptoms, testing, and natural management.',
    content: 'Thyroid disorders affect women 5-8 times more than men. The thyroid controls metabolism, energy, weight, mood, and fertility.\n\nHypothyroidism (Underactive) — More Common:\n- Weight gain despite diet\n- Fatigue and sluggishness\n- Hair loss\n- Feeling cold\n- Constipation\n- Irregular periods\n- Difficulty conceiving\n\nHyperthyroidism (Overactive):\n- Unexpected weight loss\n- Rapid heartbeat\n- Anxiety, trembling hands\n- Heat intolerance\n- Light or missed periods\n\nGet Tested: TSH, Free T3, Free T4, Anti-TPO antibodies.\n\nAyurvedic Support:\n- Ashwagandha (clinically proven for subclinical hypothyroidism)\n- Coconut oil (supports thyroid function)\n- Selenium-rich foods (Brazil nuts)\n- Avoid goitrogens when raw (broccoli, cabbage)\n- Morning sunlight for Vitamin D\n\nImportant: Ayurveda works alongside thyroid medication, not as a replacement. Always consult your doctor before changing medication.',
    category: 'Women\'s Health', author: 'chief', readTime: '9 min', emoji: '\u{1FA7A}', isPublished: true, isFeatured: false, targetAudience: ['all'], createdAt: '2024-10-01' },
  { id: 'a10', title: 'Self-Care Rituals from Ayurveda: A Daily Guide',
    summary: 'Simple daily practices from ancient India that transform your health and wellbeing.',
    content: 'Ayurveda prescribes a daily routine (Dinacharya) that modern science now validates:\n\nMorning:\n- Wake before sunrise (6 AM ideal)\n- Tongue scraping (removes toxins)\n- Oil pulling with coconut/sesame oil (10 min)\n- Warm lemon water\n- Abhyanga (self-massage with warm oil)\n- 15 min yoga or walk\n- Meditation (even 5 min helps)\n\nDaytime:\n- Largest meal at lunch (12-1 PM)\n- Walk after meals (100 steps)\n- Stay hydrated with warm/room temp water\n- Avoid snacking between meals\n\nEvening:\n- Light dinner before 7 PM\n- No screens 1 hour before bed\n- Warm milk with nutmeg\n- Gratitude journaling\n- Sleep by 10 PM\n\nWeekly:\n- Oil bath (Saturday traditionally)\n- Hair oiling (2-3x/week)\n- Face pack/ubtan\n- Digital detox (even 2 hours)\n\nThese aren\'t just Indian practices — they align with circadian rhythm science recognized globally.',
    category: 'Wellness', author: 'chief', readTime: '5 min', emoji: '\u{1F9D8}', isPublished: true, isFeatured: false, targetAudience: ['wellness', 'all'], createdAt: '2024-10-10' },
];

const defaultRecipes: DIYRecipe[] = [
  { id: 'r1', title: 'Anti-Hairfall Hair Mask', emoji: '\u{1F33F}', description: 'Powerful mask to stop hairfall naturally.',
    ingredients: [{ name: 'Fenugreek seeds (soaked overnight)', amount: '2 tbsp' }, { name: 'Curd / Yogurt', amount: '3 tbsp' }, { name: 'Curry leaves (ground)', amount: '10-12' }, { name: 'Coconut oil', amount: '1 tbsp' }, { name: 'Amla powder', amount: '1 tsp' }],
    steps: ['Soak fenugreek overnight', 'Grind into paste with curry leaves', 'Mix in curd, oil, amla', 'Apply scalp to tip', 'Leave 45 min, wash with mild shampoo', 'Use 2x/week for 2 months'],
    benefits: ['Strengthens roots', 'Reduces hairfall', 'Adds shine'], targetAudience: ['all'], isPublished: true, prepTime: '15 min + 45 min', difficulty: 'Easy' },
  { id: 'r2', title: 'Glowing Skin Ubtan', emoji: '\u2728', description: 'Traditional Indian ubtan for bridal glow.',
    ingredients: [{ name: 'Besan (Gram flour)', amount: '3 tbsp' }, { name: 'Turmeric', amount: '1/2 tsp' }, { name: 'Raw milk', amount: '2 tbsp' }, { name: 'Honey', amount: '1 tsp' }, { name: 'Saffron strands', amount: '4-5' }],
    steps: ['Soak saffron in warm milk 10 min', 'Mix besan + turmeric', 'Add saffron milk + honey', 'Apply on face + neck', 'Dry 20 min, scrub off gently'],
    benefits: ['Instant glow', 'Removes tan', 'Exfoliates'], targetAudience: ['all'], isPublished: true, prepTime: '10 min + 20 min', difficulty: 'Easy' },
  { id: 'r3', title: 'Fertility Boosting Drink', emoji: '\u{1F33A}', description: 'Ancient drink for reproductive health.',
    ingredients: [{ name: 'Shatavari powder', amount: '1 tsp' }, { name: 'Warm A2 milk', amount: '1 glass' }, { name: 'Ashwagandha', amount: '1/2 tsp' }, { name: 'Ghee', amount: '1 tsp' }, { name: 'Honey', amount: '1 tsp' }],
    steps: ['Warm milk (don\'t boil)', 'Add Shatavari + Ashwagandha', 'Stir in ghee', 'Cool slightly, add honey', 'Drink before bed daily'],
    benefits: ['Supports ovulation', 'Balances hormones', 'Improves egg quality'], targetAudience: ['fertility'], isPublished: true, prepTime: '5 min', difficulty: 'Easy' },
  { id: 'r4', title: 'Period Pain Relief Oil', emoji: '\u{1FA78}', description: 'Massage oil for natural cramp relief.',
    ingredients: [{ name: 'Sesame oil', amount: '50ml' }, { name: 'Ajwain seeds', amount: '1 tbsp' }, { name: 'Ginger (grated)', amount: '1 inch' }, { name: 'Garlic cloves', amount: '2' }],
    steps: ['Heat sesame oil on low', 'Add ajwain, ginger, garlic', 'Cook low 10 min', 'Strain, store in glass bottle', 'Warm before use, massage abdomen'],
    benefits: ['Relieves cramps', 'Improves circulation', 'Reduces bloating'], targetAudience: ['periods'], isPublished: true, prepTime: '15 min', difficulty: 'Easy' },
];

const defaultDoctors: DoctorListing[] = [
  CHIEF_DOCTOR,
  { id: 'd2', name: 'Dr. Priya Sharma', specialization: 'Gynecologist', experience: 12, rating: 4.9, reviews: 847,
    fee: 300, feeFreeForPoor: false, tags: ['PCOD Expert'], languages: ['English', 'Hindi'], qualification: 'MBBS, MS (OBG)',
    about: 'Specializes in PCOD management and menstrual disorders.', isChief: false, isPublished: true, isPromoted: false,
    city: 'Mumbai', availability: 'Mon-Fri, 9am-5pm' },
  { id: 'd3', name: 'Dr. Anita Desai', specialization: 'Obstetrician', experience: 18, rating: 4.8, reviews: 1203,
    fee: 500, feeFreeForPoor: false, tags: ['High Risk Pregnancy'], languages: ['English'], qualification: 'MBBS, DGO, DNB',
    about: 'Expert in high-risk pregnancies with 18 years experience.', isChief: false, isPublished: true, isPromoted: false,
    city: 'Delhi', availability: 'Mon-Sat, 11am-7pm' },
  { id: 'd4', name: 'Dr. Meera Nair', specialization: 'Fertility Specialist', experience: 15, rating: 4.9, reviews: 632,
    fee: 450, feeFreeForPoor: false, tags: ['IVF', 'IUI'], languages: ['English', 'Tamil'], qualification: 'MBBS, MS, Fellowship Reproductive Medicine',
    about: 'Helping couples achieve their dream of parenthood.', isChief: false, isPublished: true, isPromoted: false,
    city: 'Chennai', availability: 'Tue-Sun, 10am-4pm' },
];

const STORE_VERSION = 4;

interface StoreState {
  _version: number;
  adminPin: string; isAdminUnlocked: boolean;
  unlockAdmin: (pin: string) => boolean; lockAdmin: () => void;
  changePin: (o: string, n: string) => boolean;
  products: AyurvedaProduct[]; articles: Article[]; recipes: DIYRecipe[]; doctors: DoctorListing[];
  addProduct: (p: AyurvedaProduct) => void; updateProduct: (id: string, d: Partial<AyurvedaProduct>) => void;
  deleteProduct: (id: string) => void; togglePublish: (id: string) => void; toggleFeatured: (id: string) => void;
  addArticle: (a: Article) => void; updateArticle: (id: string, d: Partial<Article>) => void;
  deleteArticle: (id: string) => void; toggleArticlePublish: (id: string) => void; toggleArticleFeatured: (id: string) => void;
  addRecipe: (r: DIYRecipe) => void; deleteRecipe: (id: string) => void;
  addDoctor: (d: DoctorListing) => void; updateDoctor: (id: string, d: Partial<DoctorListing>) => void;
  deleteDoctor: (id: string) => void; toggleDoctorPublish: (id: string) => void;
  toggleDoctorPromote: (id: string) => void;
  getChiefDoctor: () => DoctorListing;
}

export const useAyurvedaStore = create<StoreState>()(
  persist(
    (set, get) => ({
      _version: STORE_VERSION,
      adminPin: 'VedaClue@2024#Admin', isAdminUnlocked: false,
      unlockAdmin: (pin) => { if (pin === get().adminPin) { set({ isAdminUnlocked: true }); return true; } return false; },
      lockAdmin: () => set({ isAdminUnlocked: false }),
      changePin: (o, n) => { if (o === get().adminPin && n.length >= 8) { set({ adminPin: n }); return true; } return false; },
      products: defaultProducts, articles: defaultArticles, recipes: defaultRecipes, doctors: defaultDoctors,
      addProduct: (p) => set((s) => ({ products: [...s.products, p] })),
      updateProduct: (id, d) => set((s) => ({ products: s.products.map(p => p.id === id ? { ...p, ...d } : p) })),
      deleteProduct: (id) => set((s) => ({ products: s.products.filter(p => p.id !== id) })),
      togglePublish: (id) => set((s) => ({ products: s.products.map(p => p.id === id ? { ...p, isPublished: !p.isPublished } : p) })),
      toggleFeatured: (id) => set((s) => ({ products: s.products.map(p => p.id === id ? { ...p, isFeatured: !p.isFeatured } : p) })),
      addArticle: (a) => set((s) => ({ articles: [...s.articles, a] })),
      updateArticle: (id, d) => set((s) => ({ articles: s.articles.map(a => a.id === id ? { ...a, ...d } : a) })),
      deleteArticle: (id) => set((s) => ({ articles: s.articles.filter(a => a.id !== id) })),
      toggleArticlePublish: (id) => set((s) => ({ articles: s.articles.map(a => a.id === id ? { ...a, isPublished: !a.isPublished } : a) })),
      toggleArticleFeatured: (id) => set((s) => ({ articles: s.articles.map(a => a.id === id ? { ...a, isFeatured: !a.isFeatured } : a) })),
      addRecipe: (r) => set((s) => ({ recipes: [...s.recipes, r] })),
      deleteRecipe: (id) => set((s) => ({ recipes: s.recipes.filter(r => r.id !== id) })),
      addDoctor: (d) => set((s) => ({ doctors: [...s.doctors, d] })),
      updateDoctor: (id, d) => set((s) => ({ doctors: s.doctors.map(doc => doc.id === id ? { ...doc, ...d } : doc) })),
      deleteDoctor: (id) => set((s) => ({ doctors: s.doctors.filter(d => d.id !== id && d.isChief !== true) })),
      toggleDoctorPublish: (id) => set((s) => ({ doctors: s.doctors.map(d => d.id === id ? { ...d, isPublished: !d.isPublished } : d) })),
      toggleDoctorPromote: (id) => set((s) => ({ doctors: s.doctors.map(d => d.id === id && !d.isChief ? { ...d, isPromoted: !d.isPromoted } : d) })),
      getChiefDoctor: () => get().doctors.find(d => d.isChief) || CHIEF_DOCTOR,
    }),
    {
      name: 'vedaclue-ayurveda',
      version: STORE_VERSION,
      migrate: (persisted: any, version: number) => {
        if (version < STORE_VERSION) {
          return {
            ...persisted,
            _version: STORE_VERSION,
            doctors: defaultDoctors,
            articles: defaultArticles,
            products: defaultProducts,
            recipes: defaultRecipes,
          };
        }
        return persisted as any;
      },
    }
  )
);
