import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAyurvedaStore } from '../stores/ayurvedaStore';
import { useCycleStore } from '../stores/cycleStore';
import type { Article } from '../stores/ayurvedaStore';

// ─── Rich article content (stored here for length) ──
const richContent: Record<string, string> = {
  a1: `Polycystic Ovarian Disease (PCOD) affects approximately 1 in 5 women in India and over 116 million women worldwide. Despite being so common, it remains widely misunderstood.

What is PCOD/PCOS?

PCOD occurs when the ovaries produce an abnormal amount of androgens (male hormones). This leads to the formation of small fluid-filled sacs (cysts) in the ovaries. PCOS is a more severe form involving metabolic and hormonal dysfunction.

Symptoms to Watch For:
• Irregular or missed periods
• Excessive hair growth on face, chest, or back (hirsutism)
• Severe acne, especially along the jawline
• Unexplained weight gain, particularly around the belly
• Hair thinning on the scalp
• Darkening of skin (neck, groin, under breasts)
• Difficulty getting pregnant

The Ayurvedic Perspective:

In Ayurveda, PCOD is understood as a Kapha-Pitta imbalance affecting Artava Vaha Srotas (reproductive channels). The approach is holistic — treating the root cause, not just suppressing symptoms with hormonal pills.

Key Ayurvedic Treatments:

1. Shatavari (Asparagus racemosus): The queen of herbs for women's health. Regulates estrogen levels and supports ovarian function. Take 1 tsp powder with warm milk daily.

2. Ashwagandha: Reduces cortisol (stress hormone) which directly affects PCOD. Stress management is crucial — high cortisol disrupts the entire hormonal cascade.

3. Triphala: Detoxifies the system and improves metabolism. PCOD is closely linked to insulin resistance, and Triphala helps address this.

4. Kanchanar Guggulu: Classical Ayurvedic formulation specifically for cysts and growths. Must be taken under doctor supervision.

5. Lodhra (Symplocos racemosa): Regulates menstrual cycle and reduces androgen levels naturally.

Diet Changes That Make a Real Difference:
• Eliminate refined sugar completely for 3 months
• Reduce dairy (it increases androgens in many women)
• Eat anti-inflammatory foods: turmeric, ginger, leafy greens
• Include cinnamon daily (improves insulin sensitivity)
• Choose complex carbs over simple ones
• Eat dinner before 7 PM

Lifestyle Protocol:
• 30 minutes of exercise daily (yoga, walking, or strength training)
• Sleep by 10 PM — growth hormone repairs during deep sleep
• Morning sunlight for 15 minutes (Vitamin D is crucial)
• Stress management: meditation, pranayama, journaling

Most patients see significant improvement in 3-6 months with consistent Ayurvedic treatment. Unlike hormonal pills that mask symptoms, Ayurveda addresses the underlying metabolic dysfunction.

When to See a Doctor:
If you have 3 or more of the symptoms listed above, get tested. Ask for: Hormone panel (LH, FSH, testosterone, DHEAS), Thyroid panel (TSH, T3, T4), Fasting insulin, Pelvic ultrasound.

Remember: PCOD is manageable. You are not alone, and with the right approach, you can live a completely normal, healthy life.`,

  a2: `Period pain (dysmenorrhea) affects up to 90% of women at some point in their lives. For 10-15%, the pain is severe enough to affect daily activities. Before reaching for painkillers every month, consider these powerful Ayurvedic alternatives:

Understanding Why Periods Hurt:

During menstruation, your uterus contracts to shed its lining. Prostaglandins (hormone-like chemicals) trigger these contractions. Higher prostaglandin levels = more pain. Ayurveda views this as Vata imbalance — Vata governs all movement in the body, including downward movement (Apana Vata).

Remedy 1: Ajwain (Carom Seeds) Water

This is the fastest-acting natural remedy. Ajwain contains thymol, a powerful anti-spasmodic.

How to make: Boil 1 tablespoon of ajwain seeds in 2 cups of water. Reduce to 1 cup. Strain and sip warm. Add a pinch of rock salt if desired.

Timing: Start drinking from 2 days before your expected period. During pain, it works within 15-20 minutes.

Remedy 2: Ginger-Jaggery Tea

Ginger is scientifically proven to be as effective as ibuprofen for period pain (study published in Journal of Alternative and Complementary Medicine).

How to make: Crush 1-inch fresh ginger. Boil in water for 5 minutes. Add 1 tablespoon jaggery (not sugar — jaggery has iron). Strain and drink warm, 2-3 times during your period.

Remedy 3: Warm Castor Oil Pack

Castor oil penetrates deep into tissues, increasing blood flow and relaxing muscles. This is incredibly soothing.

How to use: Warm castor oil slightly. Massage on lower abdomen in clockwise direction for 5 minutes. Place a hot water bottle or warm towel on top. Rest for 30-45 minutes.

Remedy 4: Dashmool Decoction

Dashmool means "ten roots" — this classical Ayurvedic formulation contains 10 herbs that specifically calm Vata dosha. It's particularly effective for women with very painful periods.

Ask your Ayurvedic doctor for Dashmool Kwath or Dashmool tablets.

Remedy 5: Self-Massage with Sesame Oil

Sesame oil is warming and deeply nourishing. In Ayurveda, it's considered the best oil for Vata balance.

How to use: Warm sesame oil. Massage lower back, lower abdomen, and inner thighs with gentle, circular motions. Follow with a warm shower.

Bonus Tips:
• Avoid cold foods and drinks during your period (cold constricts and increases pain)
• Light yoga: Cat-cow pose, child's pose, and reclined butterfly pose
• Avoid intense exercise on heavy flow days
• Drink warm water throughout the day
• Heat pad on lower back provides instant relief

When to See a Doctor:
If period pain is severe enough to miss work/school, gets worse over time, or is accompanied by heavy bleeding (soaking through a pad/tampon every 1-2 hours), consult a gynecologist. It could indicate endometriosis, fibroids, or adenomyosis.

Your period should not ruin your life. With the right remedies, most women can significantly reduce pain naturally.`,

  a3: `If you're trying to conceive, diet plays a much bigger role than most people realize. Ayurveda has an entire branch called Vajikarana dedicated to reproductive health and fertility. Here's what ancient wisdom combined with modern research recommends:

The Fertility Diet Foundation:

Ayurveda teaches that reproductive tissue (Shukra Dhatu) is the last tissue to be nourished in the body's metabolic process. This means your overall nutrition directly affects your fertility. If you're eating poorly, your body prioritizes vital organs over reproductive function.

Top Fertility Foods for Women:

1. Shatavari (Asparagus racemosus)
The #1 herb for female fertility worldwide. "Shatavari" literally means "she who has 100 husbands" — indicating its profound effect on female reproductive health.
• Regulates estrogen levels
• Improves follicle growth and egg quality
• Nourishes the uterine lining
• Reduces stress-related infertility
How to take: 1 tsp powder in warm milk with ghee, before bedtime

2. Dates with Ghee and Saffron Milk
This is a classical fertility recipe from ancient texts.
Recipe: Soak 4-5 dates in warm A2 cow milk with 2-3 saffron strands and 1 tsp ghee. Drink at bedtime.
Why it works: Dates provide iron and folate, saffron improves blood flow to reproductive organs, ghee carries nutrients deep into tissues, and warm milk is calming.

3. Pomegranate
Rich in antioxidants that protect egg quality. Studies show pomegranate juice improves uterine blood flow, which is essential for implantation.
Aim for: 1 glass fresh pomegranate juice daily, or eat the seeds

4. Black Sesame Seeds
Powerhouse of zinc, iron, and healthy fats — all essential for fertility.
How to eat: 1 tablespoon daily. Roast lightly, grind, add to smoothies or milk.

5. Ashwagandha (for Both Partners)
Reduces cortisol by up to 30%. High stress is one of the top reasons for unexplained infertility.
For men: Significantly improves sperm count and motility (multiple clinical studies)
For women: Regulates thyroid and adrenal function
Dose: 500mg twice daily with warm milk

Foods to AVOID When Trying to Conceive:
• Excess caffeine (max 200mg/day — about 1 cup coffee)
• Alcohol (reduces fertility by up to 50%)
• Processed and ultra-processed foods
• Excessive raw/cold foods (weakens digestive fire in Ayurveda)
• Trans fats (found in fried foods, margarine)
• Soy products in excess (can affect estrogen balance)
• Artificial sweeteners

The Best Time to Conceive — Ayurvedic Wisdom:

Ayurveda recommends the "Ritu Kala" — the fertile period from days 12-16 of your cycle (counting from the first day of your period). Modern science confirms this aligns with the ovulation window.

Ayurvedic Fertility Protocol:
• Month 1-2: Detox and prepare (Panchakarma if possible)
• Month 3 onwards: Nourish with Shatavari, Ashwagandha
• Both partners should avoid alcohol, smoking
• Practice stress reduction daily (even 10 minutes of meditation)
• Gentle exercise: walking, swimming, yoga
• Sleep 7-8 hours in a dark room

For Men (Share with Your Partner):
• Ashwagandha + Shilajit: Improves sperm quality
• Safed Musli: Traditional Ayurvedic fertility herb
• Zinc-rich foods: pumpkin seeds, nuts
• Avoid hot baths, tight underwear, laptop on lap
• Limit cycling

Important Note:
If you've been trying for 12 months (or 6 months if over 35) without success, see a fertility specialist. Ayurveda works beautifully alongside modern fertility treatments — many IVF clinics now recommend Ayurvedic support protocols.`,

  a4: `Pregnancy is one of the most beautiful and challenging journeys in a woman's life. Ayurveda has a detailed month-by-month pregnancy care guide called "Garbhini Paricharya" that has been practiced for over 3,000 years. Here's your trimester-by-trimester guide:

FIRST TRIMESTER (Weeks 1-12)

This is when all major organs are forming. Nutrition focus: gentle, nourishing, easy to digest.

Month 1-2:
• Drink sweet, cold, liquid foods
• Milk with honey (not together when hot — Ayurvedic rule)
• Coconut water daily (nature's electrolyte)
• Rice with curd
• Ghee with meals (even 1 tsp helps)
• Avoid: spicy, fermented, heavy foods

Month 3:
• Add more protein: moong dal, milk, paneer
• Honey and ghee (in unequal quantities — never equal)
• Start Shatavari if your doctor approves
• Light foods — your digestion is weaker now

Critical Supplements:
• Folic acid 400-800mcg (start before conception ideally)
• Iron (if your levels are low)
• Vitamin D (most Indian women are deficient)

SECOND TRIMESTER (Weeks 13-26)

Energy returns! Baby is growing rapidly. Nutrition focus: building and strengthening.

Month 4-5:
• Ghee with rice (this is the month Ayurveda emphasizes ghee most)
• Butter and milk daily
• Sweet fruits: banana, mango, grapes, dates
• Increase protein to 75g/day
• Iron-rich foods: beetroot, pomegranate, spinach, dates, jaggery

Month 6:
• Continue ghee (2 tsp/day)
• Add more fluids — your blood volume is increasing 50%
• Gentle massage with sesame oil (avoid belly in first trimester)
• Sweet potatoes, whole grains, nuts

Critical Nutrients:
• Calcium: 1000mg/day (dairy, ragi, sesame seeds)
• DHA/Omega-3: For baby's brain development (walnuts, flaxseed)
• Vitamin C: Helps iron absorption (amla, oranges, bell peppers)

THIRD TRIMESTER (Weeks 27-40)

Baby is gaining weight rapidly. You need energy and preparation for labor.

Month 7:
• Light, easily digestible meals
• Smaller portions, more frequent
• Ghee continues (helps lubricate birth canal)
• Avoid excess salt (swelling increases)

Month 8:
• Bala Taila (medicated ghee) — traditional preparation for easy delivery
• Rice porridge with ghee
• Warm milk with turmeric and nutmeg at bedtime
• Start perineal massage with sesame oil

Month 9:
• Dates: 6 per day from week 36 (clinically proven to help with labor)
• Red raspberry leaf tea (from week 37 — tones uterus)
• Light walking daily
• Visualization and breathing exercises

Foods to AVOID Throughout Pregnancy:
• Raw papaya and pineapple (can cause contractions)
• Unpasteurized dairy and soft cheeses
• Raw or undercooked meat/eggs
• Excess caffeine (max 200mg/day)
• Alcohol — zero tolerance
• Ajinomoto/MSG
• Raw sprouts (bacterial risk)
• High-mercury fish (tuna, swordfish)

Ayurvedic Pregnancy Tips:
• Listen to calming music — baby can hear from week 16
• Practice Garbha Sanskar (prenatal bonding)
• Avoid negative news and stressful environments
• Gentle Pranayama (avoid Kapalabhati and Bhastrika)
• Regular walks in nature
• Stay mentally positive — your emotions affect the baby

Remember: Every pregnancy is unique. Always consult your doctor before starting any new herb or supplement during pregnancy.`,

  a5: `Hair fall in women is more common than you think — and it's more distressing than most people acknowledge. While men's hair loss is widely discussed, women's hair fall often goes unaddressed. Let's change that.

Why Women Lose Hair — The Root Causes:

1. Iron Deficiency (most common in India)
2. Thyroid disorders (hypothyroidism)
3. Hormonal changes (PCOD, post-pregnancy, menopause)
4. Stress (telogen effluvium)
5. Nutritional deficiencies (Vitamin D, B12, zinc)
6. Harsh chemical treatments and heat styling
7. Tight hairstyles (traction alopecia)
8. Autoimmune conditions (alopecia areata)

The Ayurvedic Understanding:

Ayurveda views hair fall as primarily a Pitta imbalance — excess heat in the body burning the hair roots. Treatment focuses on cooling the system, nourishing hair roots (Kesha), and addressing the underlying cause.

Solution 1: Bhringraj Oil Massage (The Gold Standard)

Bhringraj (Eclipta alba) is called "King of Hair" in Ayurveda. Clinical studies show it promotes hair growth comparable to minoxidil — but without side effects.

Protocol:
• Warm Bhringraj oil slightly (not hot)
• Part your hair in sections
• Apply oil directly to scalp with fingertips
• Massage in circular motions for 10 minutes
• Leave overnight (use an old pillowcase)
• Wash with mild sulfate-free shampoo
• Do this 3 times per week minimum

Solution 2: Amla + Curry Leaves Oil

This is a South Indian grandmother's secret that actually works.

Make it yourself:
• Heat 100ml coconut oil on low flame
• Add 10-12 fresh curry leaves and 2 tbsp amla powder
• Cook on lowest flame for 15 minutes until curry leaves are crispy
• Cool, strain, store in glass bottle
• Apply 2-3 times per week

Solution 3: Fenugreek (Methi) Hair Mask

Fenugreek is rich in proteins and nicotinic acid — both proven to stimulate hair growth.

Recipe:
• Soak 3 tbsp fenugreek seeds overnight
• Grind to smooth paste (add a little soaking water)
• Mix with 2 tbsp yogurt and 1 tbsp coconut oil
• Apply from roots to tips
• Leave for 45 minutes, wash with mild shampoo

Solution 4: Diet Protocol for Hair Growth

What to eat daily:
• Iron: Dates (3-4), jaggery with sesame seeds, spinach, beetroot
• Biotin: Eggs (if vegetarian: almonds, sweet potatoes)
• Zinc: Pumpkin seeds (1 tbsp), chickpeas
• Vitamin D: 15 min morning sunlight + supplement if deficient
• Protein: Minimum 50g/day (dal, paneer, eggs, nuts)
• Omega-3: Walnuts, flaxseeds
• Water: Minimum 2.5 liters/day

Solution 5: Ashwagandha for Stress-Related Hairfall

If your hair fall started after a stressful period (job loss, relationship issues, illness), cortisol is likely the culprit. Ashwagandha reduces cortisol by up to 30%.

Dose: 500mg twice daily with warm milk for 3 months minimum.

Solution 6: Scalp Detox

Monthly detox removes product buildup and dead skin:
• Mix: 2 tbsp neem powder + 2 tbsp yogurt + 1 tsp lemon juice
• Apply on scalp only (not lengths)
• Leave 30 minutes, wash thoroughly
• Follow with oil massage next day

Solution 7: Nasya (Nasal Oil Therapy)

This ancient technique is surprisingly effective for hair and overall head health:
• Lie down, tilt head back slightly
• Put 2 drops of Anu Taila in each nostril
• Sniff gently
• Rest for 5 minutes
• Do this daily in the morning

Expected Timeline:
• Week 2-4: Hair fall reduces
• Month 2-3: New baby hairs visible
• Month 4-6: Significant visible regrowth
• Month 6+: Full results

When to See a Doctor:
If you're losing more than 100 hairs/day, have bald patches, or hair fall is sudden, see a dermatologist or trichologist. Get tested for: Ferritin (stored iron), Vitamin D, B12, Thyroid panel, DHEAS.`,

  a6: `Hormonal imbalance is not just a "women's issue" — it's a health crisis affecting hundreds of millions globally. Your hormones control virtually everything: mood, weight, energy, sleep, skin, fertility, and even how you think.

The 10 Warning Signs:

1. Irregular Periods
Your cycle should be 21-35 days. Consistently outside this range, or missing periods entirely (without pregnancy), signals hormonal dysfunction. Common culprits: PCOD, thyroid issues, high prolactin, stress.

2. Unexplained Weight Gain
Particularly around the belly, hips, and thighs. Hormonal weight gain doesn't respond well to just "eat less, move more." If you're eating healthy and exercising but still gaining, check your hormones.

Key hormones to test: Insulin, cortisol, thyroid, estrogen

3. Persistent Adult Acne
Teenage acne is normal. Adult acne — especially along the jawline, chin, and lower cheeks — often indicates high androgens (male hormones). This is extremely common in PCOD.

4. Hair Changes
Thinning hair on your head AND/OR excess hair on face, chest, or back (hirsutism). Both patterns suggest androgen excess or thyroid dysfunction.

5. Chronic Fatigue
If you sleep 7-8 hours but still wake up exhausted, your thyroid, cortisol, or iron levels may be off. "Tired all the time" is not normal — don't accept it.

6. Mood Swings, Anxiety, or Depression
Estrogen affects serotonin (your "happy hormone"). Progesterone affects GABA (your "calm hormone"). When these fluctuate abnormally, your mental health suffers directly. This is biological, not "just stress."

7. Sleep Disturbances
Difficulty falling asleep, waking at 2-4 AM, or unrefreshing sleep often indicates cortisol rhythm disruption or low progesterone.

8. Low Libido
A sudden or gradual loss of sexual desire can indicate low estrogen, low testosterone, high prolactin, or thyroid issues. This affects relationships and self-esteem.

9. Digestive Issues
Bloating, constipation, or irregular digestion that worsens around your period. Estrogen and progesterone directly affect gut motility and your microbiome.

10. Brain Fog
Difficulty concentrating, forgetting things, feeling "fuzzy." Thyroid hormones and estrogen are critical for cognitive function.

If you have 3 or more of these signs, get tested.

Tests to Ask For:
• Complete hormone panel: LH, FSH, Estradiol, Progesterone, Total & Free Testosterone, DHEAS, Prolactin
• Thyroid: TSH, Free T3, Free T4, Anti-TPO antibodies
• Metabolic: Fasting insulin, HbA1c, Fasting glucose
• Nutritional: Vitamin D, B12, Ferritin, Iron

The Ayurvedic Approach:

Ayurveda views hormonal imbalance as a disruption of the body's intelligence (Prabhava). Rather than replacing hormones externally, it aims to restore the body's own hormone production.

Key Herbs:
• Shatavari: Master female hormone regulator
• Ashwagandha: Reduces cortisol, supports thyroid
• Lodhra: Reduces androgens naturally
• Ashoka: Regulates menstrual cycle
• Guduchi (Giloy): Immune modulation and detox

Lifestyle Changes That Actually Work:
• Sleep by 10 PM (growth hormone peaks 10 PM - 2 AM)
• Morning sunlight within 30 minutes of waking
• Strength training 3x/week (builds lean muscle, improves insulin sensitivity)
• Reduce plastic use (BPA is an endocrine disruptor)
• Choose organic when possible (pesticides affect hormones)
• Manage stress daily (even 10 min meditation makes a measurable difference)
• Limit screen time before bed (blue light suppresses melatonin)

This is a global issue. Women from New York to New Delhi, London to Lagos face the same hormonal challenges — amplified by modern lifestyle, processed food, and chronic stress. You deserve to feel good in your body.`,

  a7: `Endometriosis affects approximately 190 million women worldwide — roughly 10% of all women of reproductive age. Yet it takes an average of 7-10 years to get diagnosed. This delay causes years of unnecessary suffering.

What is Endometriosis?

Tissue similar to the uterine lining (endometrium) grows outside the uterus — on the ovaries, fallopian tubes, bowel, bladder, and sometimes even the lungs. This tissue bleeds during your period just like the uterine lining, but has no way to exit the body. This causes inflammation, scarring, adhesions, and severe pain.

Symptoms — Know Them:

• Severe period pain that progressively worsens over the years
• Pain during or after intercourse (deep, not surface)
• Pain during bowel movements or urination (especially during periods)
• Heavy periods or bleeding between periods
• Chronic pelvic pain (not just during periods)
• Difficulty getting pregnant (30-50% of women with endometriosis face infertility)
• Extreme fatigue
• Bloating ("endo belly")
• Nausea and digestive issues

Stages: Endometriosis is classified from Stage 1 (minimal) to Stage 4 (severe), but stage doesn't always correlate with pain level. Some women with Stage 1 have debilitating pain, while some with Stage 4 have mild symptoms.

Getting Diagnosed:

The gold standard diagnosis is laparoscopy (minimally invasive surgery). However, experienced doctors can often suspect it through:
• Detailed symptom history
• Pelvic examination
• Transvaginal ultrasound (can detect endometriomas/chocolate cysts)
• MRI (for deep infiltrating endometriosis)

Advocate for yourself. If a doctor dismisses your pain as "normal period pain," seek a second opinion.

Ayurvedic Management:

While Ayurveda cannot "cure" endometriosis, it can significantly reduce symptoms and improve quality of life:

1. Castor Oil Packs: Apply warm castor oil on lower abdomen, cover with cloth, place hot water bottle on top. 30-45 minutes, 3-4 times per week (NOT during periods). Reduces adhesions and inflammation.

2. Anti-Inflammatory Diet:
• Turmeric (curcumin): 1 tsp daily with black pepper (piperine increases absorption by 2000%)
• Ginger: Fresh ginger tea daily
• Omega-3: Walnuts, flaxseed, or supplement
• Green leafy vegetables
• Avoid: Dairy, red meat, gluten, sugar, alcohol, caffeine
• These dietary changes have the strongest evidence for reducing endometriosis symptoms

3. Herbs:
• Shatavari and Ashoka bark: Regulate estrogen (endometriosis is estrogen-dependent)
• Guduchi: Immune modulation
• Triphala: Digestive support and gentle detox
• Turmeric supplements: Anti-inflammatory

4. Yoga:
• Supta Baddha Konasana (Reclined Butterfly)
• Viparita Karani (Legs up the wall)
• Gentle cat-cow stretches
• Avoid intense core exercises during flares

5. Stress Management:
This is not optional. Cortisol increases inflammation, which worsens endometriosis. Daily practice of pranayama, meditation, or even simple deep breathing makes a measurable difference.

Global Perspective:

Endometriosis doesn't discriminate — it affects women of every race, ethnicity, and socioeconomic status. In many countries, it's still barely discussed. The average diagnostic delay varies: 7.5 years in the US, 8 years in the UK, and even longer in developing countries.

You Are Not Alone:
Celebrities like Padma Lakshmi, Halsey, and Lena Dunham have spoken publicly about their endometriosis journeys. There are global support communities online. You are not imagining your pain, and you deserve proper care.`,

  a8: `Your menstrual cycle is not just about your period — it's a monthly hormonal symphony that profoundly affects your brain, mood, energy, creativity, and even decision-making ability. Understanding this connection is a superpower.

The Four Phases of Your Cycle = Four Seasons:

Phase 1: MENSTRUAL (Days 1-5) — Your Inner Winter

Hormones: All at their lowest point. Both estrogen and progesterone have dropped.

How you feel: Tired, introspective, sensitive. You may want to withdraw from social activities. This is NORMAL — not weakness.

What to do:
• REST. This is not laziness, it's biology.
• Journal, reflect, set intentions
• Gentle stretching or slow walks only
• Warm, nourishing foods (soups, stews)
• Say no to extra commitments
• This is actually your most intuitive phase — trust your gut

Phase 2: FOLLICULAR (Days 6-12) — Your Inner Spring

Hormones: Estrogen starts rising steadily. Energy, optimism, and confidence build.

How you feel: Fresh, creative, social, adventurous. Your brain literally works differently — you're better at learning new things.

What to do:
• Start new projects and plans
• Schedule important meetings and interviews
• Try new workouts, recipes, experiences
• Socialize — you're naturally more magnetic
• Brainstorm and create
• This is your BEST phase for productivity

Phase 3: OVULATION (Days 13-16) — Your Inner Summer

Hormones: Estrogen peaks. Testosterone surges briefly. LH triggers egg release.

How you feel: Confident, articulate, attractive. Your voice actually changes (higher pitch), your skin glows, and you communicate more effectively.

What to do:
• Public speaking, presentations, difficult conversations
• Date nights and social events
• High-intensity workouts
• Ask for that raise or promotion
• Creative peak — you're at your most expressive

Phase 4: LUTEAL (Days 17-28) — Your Inner Autumn

Hormones: Progesterone rises (calming hormone). If no pregnancy, both hormones drop at the end, triggering your period.

How you feel: First half — calm, focused, detail-oriented. Second half — PMS may start: mood swings, bloating, irritability, cravings, anxiety.

What to do:
• First half: Complete projects, organize, clean, admin tasks
• Second half: Reduce commitments, prioritize self-care
• Complex carbs help: sweet potato, oats, brown rice
• Magnesium-rich foods: dark chocolate (yes!), almonds, bananas
• Gentle exercise: yoga, pilates, swimming
• Extra sleep — your body literally needs more

PMDD — When PMS Becomes Severe:

Premenstrual Dysphoric Disorder affects 3-8% of women. It's NOT just "bad PMS." Symptoms include:
• Severe depression or hopelessness before periods
• Intense anxiety or panic attacks
• Extreme irritability or anger
• Feeling out of control
• Suicidal thoughts (in severe cases)

If your luteal phase symptoms are severe enough to disrupt work, relationships, or daily life, please talk to a healthcare provider. PMDD is a recognized medical condition with effective treatments.

Cycle Syncing — Work WITH Your Body:

This concept (pioneered by Alisa Vitti) is revolutionary: instead of fighting your hormonal changes, schedule your life around them.

• Plan launches and big meetings in your follicular/ovulatory phase
• Schedule administrative work in early luteal
• Allow rest during menstruation
• Track your cycle for 3 months to learn YOUR unique patterns

Global Note:

In many cultures worldwide, periods and mental health are still taboo topics. Women are expected to perform at the same level every day of the month — ignoring their biology. This is changing. Cycle awareness is a global movement, from Silicon Valley companies offering menstrual leave to Japanese schools teaching cycle literacy.

Your hormones are not your enemy. They're a roadmap to understanding yourself better.`,

  a9: `Thyroid disorders affect women 5-8 times more than men. The thyroid — a tiny butterfly-shaped gland in your neck — controls your entire metabolism, energy, weight, mood, and fertility. When it malfunctions, EVERYTHING feels off.

The Two Main Types:

HYPOTHYROIDISM (Underactive) — More Common

Your thyroid doesn't produce enough hormones. Everything slows down.

Symptoms:
• Weight gain despite diet and exercise
• Extreme fatigue and sluggishness
• Feeling cold when others are comfortable
• Hair loss and dry, brittle hair
• Dry skin and brittle nails
• Constipation
• Depression and brain fog
• Irregular or heavy periods
• Difficulty getting pregnant
• Elevated cholesterol
• Muscle weakness and joint pain
• Puffy face, especially around eyes

HYPERTHYROIDISM (Overactive)

Your thyroid overproduces hormones. Everything speeds up.

Symptoms:
• Unexpected weight loss
• Rapid or irregular heartbeat
• Anxiety, nervousness, trembling hands
• Heat intolerance, excessive sweating
• Light or skipped periods
• Difficulty sleeping
• Frequent bowel movements
• Thinning skin
• Eye problems (Graves' disease)

Essential Tests — Don't Accept "Just TSH":

Many doctors only test TSH. This is insufficient. Demand:
1. TSH (Thyroid Stimulating Hormone)
2. Free T3 (the active thyroid hormone)
3. Free T4 (the storage form)
4. Anti-TPO antibodies (detects autoimmune thyroiditis — Hashimoto's)
5. Anti-Thyroglobulin antibodies
6. Reverse T3 (in complex cases)

Optimal ranges (not just "normal"):
• TSH: 0.5-2.5 (not the standard 0.4-4.5)
• Free T3: Upper half of range
• Free T4: Mid-range
• Anti-TPO: Below 35

Hashimoto's — The Hidden Epidemic:

Most hypothyroidism is actually Hashimoto's thyroiditis — an autoimmune condition where your immune system attacks your thyroid. It affects 5-10% of women globally.

Key signs: Fluctuating symptoms (sometimes hypo, sometimes hyper), positive Anti-TPO antibodies, family history of autoimmune diseases.

Ayurvedic Support for Thyroid:

Important disclaimer: Ayurveda works ALONGSIDE thyroid medication, not as a replacement. Never stop prescribed medication without doctor guidance.

1. Ashwagandha (Withania somnifera):
Multiple clinical studies show Ashwagandha can improve TSH, T3, and T4 levels in subclinical hypothyroidism. One study showed TSH normalization in 8 weeks.
Dose: 600mg standardized extract daily

2. Coconut Oil:
Medium-chain fatty acids in coconut oil support thyroid function and improve metabolism.
Use: 1-2 tablespoons daily in cooking or added to food

3. Selenium:
The thyroid contains more selenium per gram than any other organ. Deficiency directly impairs thyroid function.
Food source: 2 Brazil nuts daily = your entire daily selenium need

4. Zinc:
Required for T3 production. Most women are deficient.
Food sources: Pumpkin seeds, chickpeas, cashews

5. Vitamin D:
Strong correlation between Vitamin D deficiency and autoimmune thyroid disease. Most women in South Asia, Middle East, and Northern regions are deficient.
Get tested. Supplement to maintain levels above 40 ng/mL.

6. Gut Health:
20% of thyroid hormone conversion (T4 to T3) happens in the gut. An unhealthy gut = poor thyroid function.
• Probiotics (yogurt, fermented foods)
• Fiber (fruits, vegetables, whole grains)
• Remove gluten if you have Hashimoto's (strong correlation)

Diet for Thyroid Health:
• Iodine: Iodized salt, seaweed (moderate amounts)
• Selenium: Brazil nuts, sunflower seeds
• Zinc: Pumpkin seeds, chickpeas
• Anti-inflammatory: Turmeric, ginger, omega-3
• Avoid when RAW (cook them): Broccoli, cauliflower, cabbage, soy (goitrogens)

Thyroid & Fertility:

Even mildly abnormal thyroid function can prevent conception and increase miscarriage risk. If you're trying to conceive, TSH should ideally be below 2.5. Many fertility specialists now routinely check thyroid function.

Thyroid & Pregnancy:

Thyroid requirements increase by 30-50% during pregnancy. Regular monitoring is essential. Untreated thyroid issues during pregnancy can affect the baby's brain development.

This is a global health issue. From Bangalore to Boston, millions of women are walking around with undiagnosed thyroid dysfunction, told they're "just stressed" or "just getting older." Trust your body. If something feels wrong, investigate.`,

  a10: `Ayurveda prescribes a daily routine called "Dinacharya" — and modern science is now validating practices that are 5,000 years old. These aren't just Indian practices; they align with circadian rhythm science recognized globally.

MORNING RITUALS (6:00 - 8:00 AM):

1. Wake Before Sunrise
Ideal: 5:30-6:00 AM (Brahma Muhurta in Ayurveda)
Science: Your cortisol naturally peaks at dawn. Waking with this rhythm sets your entire hormonal cascade for the day.

2. Tongue Scraping
Use a copper or stainless steel tongue scraper. Gently scrape from back to front, 7-10 times.
Why: Removes overnight bacterial buildup (Ama in Ayurveda). Studies show it reduces bad bacteria by 75% and improves taste perception.

3. Oil Pulling
Swish 1 tablespoon of coconut or sesame oil in your mouth for 10-15 minutes. Spit out (don't swallow).
Science: Reduces Streptococcus mutans (cavity-causing bacteria). Also shown to reduce gingivitis. Ayurveda claims it detoxifies the entire body through the oral mucosa.

4. Warm Lemon Water
Squeeze half a lemon in a glass of warm (not hot) water. Drink on empty stomach.
Benefits: Kickstarts digestion, provides Vitamin C, alkalizes the body, supports liver detoxification.

5. Abhyanga (Self-Massage)
Warm sesame oil (Vata/dry skin), coconut oil (Pitta/sensitive), or mustard oil (Kapha/oily). Massage entire body for 10-15 minutes before shower.
Science: Reduces cortisol, improves circulation, nourishes skin, calms the nervous system. This single practice can transform your stress levels.

6. Movement
15-30 minutes of yoga, walking, or stretching. Not intense exercise — morning is for waking up gently.
Key poses: Sun Salutations, Cat-Cow, Forward Fold, Warrior series

7. Meditation or Pranayama
Even 5 minutes of Nadi Shodhana (alternate nostril breathing) balances your nervous system for the entire day.

DAYTIME PRACTICES (8:00 AM - 6:00 PM):

8. Largest Meal at Lunch
Ayurveda says digestive fire (Agni) peaks when the sun is highest — 12:00-1:00 PM. Modern research confirms gastric acid production and enzyme activity peak at midday.

Lunch should be: Your biggest, most complex meal. Include all 6 tastes: sweet, sour, salty, pungent, bitter, astringent.

9. Walk After Meals
"Shatapawali" — walk 100 steps after every meal. Improves digestion, regulates blood sugar, prevents afternoon slump.

10. Stay Hydrated
Warm or room-temperature water throughout the day. Avoid ice-cold water (it dampens digestive fire).
Amount: 2-3 liters daily, more in summer

11. No Snacking
Ayurveda recommends minimum 3-4 hours between meals. Constant snacking keeps insulin elevated and weakens Agni.

EVENING RITUALS (6:00 - 10:00 PM):

12. Light Dinner Before 7 PM
Soups, kitchari, or light cooked foods. Your digestion weakens as the sun sets. Eating late = poor sleep + weight gain + indigestion.

13. Digital Sunset (1 Hour Before Bed)
No screens from 9 PM. Blue light suppresses melatonin production by up to 50%.
Instead: Read, journal, gentle stretching, talk with family

14. Warm Milk Ritual
Golden milk: Warm A2 cow milk with turmeric, cardamom, and nutmeg.
Why it works: Tryptophan in milk converts to serotonin then melatonin. Nutmeg is a natural sedative. Turmeric is anti-inflammatory.

15. Sleep by 10:00 PM
Growth hormone peaks between 10 PM and 2 AM. Missing this window affects cell repair, weight, skin, and hormones.
Ayurveda: Sleeping after 10 PM enters the Pitta time (10 PM - 2 AM) when you get a "second wind" — making it harder to fall asleep.

WEEKLY PRACTICES:

16. Oil Bath (Saturday or Sunday)
Apply warm oil to entire body and hair. Wait 30-45 minutes. Bathe with warm water and natural cleanser.
Benefits: Deep tissue nourishment, joint health, skin rejuvenation, mental calm.

17. Hair Oiling (2-3x per week)
Warm Bhringraj or coconut oil massage. Leave minimum 2 hours (overnight is best).

18. Face Pack / Ubtan
Weekly natural face treatment. Besan, turmeric, milk, honey — the classic ubtan.

19. Digital Detox
Even 2-3 hours of phone-free time weekly makes a measurable difference in stress levels and sleep quality.

These practices aren't exclusive to any culture. They're based on circadian biology, nervous system science, and centuries of human optimization. Whether you're in Mumbai, Manchester, or Melbourne — your body responds to the same natural rhythms.

Start with just 2-3 practices. Add more over time. Consistency matters more than perfection.`
};

// ─── Personalized section headers by goal ────────
const goalHeaders: Record<string, { title: string; subtitle: string }> = {
  periods: { title: 'For Your Cycle', subtitle: 'Curated for period tracking' },
  fertility: { title: 'Fertility & Conception', subtitle: 'Curated for your TTC journey' },
  pregnancy: { title: 'Pregnancy Essentials', subtitle: 'Curated for your pregnancy' },
  wellness: { title: 'Wellness & Self-Care', subtitle: 'Curated for your wellbeing' },
};

export default function ArticlesPage() {
  const nav = useNavigate();
  const { articles, getChiefDoctor } = useAyurvedaStore();
  const { goal } = useCycleStore();
  const [cat, setCat] = useState('All');
  const [readingArticle, setReadingArticle] = useState<Article | null>(null);
  const [searchQ, setSearchQ] = useState('');

  const chief = getChiefDoctor();

  // Smart sorting: goal-matched articles first, then others
  const visible = useMemo(() => {
    const published = articles.filter(a => a.isPublished);
    const goalMatched = published.filter(a => a.targetAudience.includes(goal as any) && !a.targetAudience.includes('all'));
    const forAll = published.filter(a => a.targetAudience.includes('all'));
    const others = published.filter(a => !a.targetAudience.includes('all') && !a.targetAudience.includes(goal as any));
    // Deduplicate
    const seen = new Set<string>();
    const result: Article[] = [];
    for (const a of [...goalMatched, ...forAll, ...others]) {
      if (!seen.has(a.id)) { seen.add(a.id); result.push(a); }
    }
    return result;
  }, [articles, goal]);

  const cats = ['All', ...Array.from(new Set(visible.map(a => a.category)))];
  const filtered = visible
    .filter(a => cat === 'All' || a.category === cat)
    .filter(a => !searchQ || a.title.toLowerCase().includes(searchQ.toLowerCase()) || (a.summary || '').toLowerCase().includes(searchQ.toLowerCase()));
  const featured = visible.filter(a => a.isFeatured).slice(0, 3);
  const goalSpecific = visible.filter(a => a.targetAudience.includes(goal as any) && !a.targetAudience.includes('all'));

  const authorName = (a: Article) => a.author === 'chief' ? chief.name : a.author;
  const getFullContent = (a: Article) => richContent[a.id] || a.content;

  // ─── FULL SCREEN READER ────────────────────────
  if (readingArticle) {
    const content = getFullContent(readingArticle);
    const paragraphs = content.split('\n').filter(p => p.trim());

    return (
      <div className="min-h-screen bg-white">
        {/* Reader Header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-gray-100">
          <div className="px-5 py-3 flex items-center justify-between">
            <button onClick={() => setReadingArticle(null)} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm active:scale-90">{'\u2190'}</button>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600">{readingArticle.category}</span>
              <span className="text-[10px] text-gray-400">{readingArticle.readTime}</span>
            </div>
          </div>
        </div>

        {/* Article Content */}
        <div className="px-5 pt-6 pb-16 max-w-prose mx-auto">
          {/* Title */}
          <h1 className="text-[22px] font-extrabold text-gray-900 leading-[1.3]">{readingArticle.title}</h1>

          {readingArticle.summary && (
            <p className="text-sm text-gray-500 mt-3 leading-relaxed italic">{readingArticle.summary}</p>
          )}

          {/* Author */}
          <div className="flex items-center gap-3 mt-5 pb-5 border-b border-gray-100">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
              {authorName(readingArticle).charAt(0)}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800">{authorName(readingArticle)}</p>
              <p className="text-[10px] text-gray-400">
                {readingArticle.author === 'chief' ? chief.specialization + ' • ' : ''}
                {readingArticle.readTime} read
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="mt-6 space-y-4">
            {paragraphs.map((p, i) => {
              const trimmed = p.trim();
              // Detect headings (short lines that don't end with punctuation and are capitalized)
              const isHeading = trimmed.length < 60 && !trimmed.endsWith('.') && !trimmed.endsWith(':') && !trimmed.startsWith('\u2022') && !trimmed.startsWith('-') && !trimmed.startsWith('•') && /^[A-Z]/.test(trimmed) && !trimmed.includes('•');
              const isSubHeading = trimmed.endsWith(':') && trimmed.length < 80 && !trimmed.startsWith('\u2022') && !trimmed.startsWith('•');
              const isBullet = trimmed.startsWith('\u2022') || trimmed.startsWith('•') || trimmed.startsWith('-');
              const isNumbered = /^\d+\./.test(trimmed);

              if (isHeading) return <h2 key={i} className="text-lg font-extrabold text-gray-900 mt-6 mb-1">{trimmed}</h2>;
              if (isSubHeading) return <h3 key={i} className="text-sm font-bold text-gray-800 mt-4 mb-1">{trimmed}</h3>;
              if (isBullet) return <p key={i} className="text-[14px] text-gray-700 leading-[1.7] pl-4">{trimmed}</p>;
              if (isNumbered) return <p key={i} className="text-[14px] text-gray-700 leading-[1.7] pl-2 font-medium">{trimmed}</p>;
              return <p key={i} className="text-[14px] text-gray-700 leading-[1.8]">{trimmed}</p>;
            })}
          </div>

          {/* CTA */}
          <div className="mt-10 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-5 border border-emerald-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm">{chief.name.charAt(0)}</div>
              <div>
                <p className="text-sm font-bold text-emerald-800">{chief.name}</p>
                <p className="text-[10px] text-emerald-600">{chief.specialization}</p>
              </div>
            </div>
            <p className="text-xs text-gray-700 leading-relaxed">Have questions about this topic? {chief.name} offers personalized consultations.{chief.feeFreeForPoor ? ' Free for those who cannot afford.' : ''}</p>
            <button onClick={() => { setReadingArticle(null); nav('/appointments'); }}
              className="mt-3 w-full py-3 rounded-xl text-white font-bold text-sm active:scale-95 transition-transform" style={{ background: 'linear-gradient(135deg, #059669, #10B981)' }}>
              Book Consultation {'\u2192'}
            </button>
          </div>

          {/* Related */}
          <div className="mt-8">
            <h3 className="text-sm font-extrabold text-gray-800 mb-3">More Articles</h3>
            {visible.filter(a => a.id !== readingArticle.id && a.category === readingArticle.category).slice(0, 2).map(a => (
              <button key={a.id} onClick={() => { setReadingArticle(a); window.scrollTo(0, 0); }}
                className="w-full flex items-center gap-3 py-3 border-b border-gray-100 text-left active:bg-gray-50">
                <span className="text-xl">{a.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-800 line-clamp-1">{a.title}</p>
                  <p className="text-[10px] text-gray-400">{a.readTime}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── ARTICLE LIST VIEW ─────────────────────────
  return (
    <div className="min-h-screen pb-10" style={{ backgroundColor: '#FAFAF9' }}>
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md px-5 py-3 border-b border-gray-100 flex items-center gap-3">
        <button onClick={() => nav('/dashboard')} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm active:scale-90">{'\u2190'}</button>
        <h1 className="text-base font-extrabold flex-1">Health Articles</h1>
        <span className="text-[9px] text-gray-400 font-bold">{visible.length} articles</span>
      </div>

      <div className="px-5 pt-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{'\u{1F50D}'}</span>
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search articles..."
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm outline-none bg-white focus:border-rose-400" />
        </div>

        {/* Featured */}
        {!searchQ && featured.length > 0 && (
          <div className="overflow-x-auto -mx-5 px-5">
            <div className="flex gap-3 min-w-max pb-2">
              {featured.map((a, idx) => {
                const bgs = ['linear-gradient(135deg, #7C3AED, #EC4899)', 'linear-gradient(135deg, #059669, #10B981)', 'linear-gradient(135deg, #2563EB, #7C3AED)'];
                return (
                  <button key={a.id} onClick={() => setReadingArticle(a)}
                    className="w-72 rounded-2xl p-5 text-white text-left flex-shrink-0 active:scale-[0.98] transition-transform relative overflow-hidden"
                    style={{ background: bgs[idx % bgs.length] }}>
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full" />
                    <div className="relative z-10">
                      <div className="flex gap-2 mb-2">
                        <span className="text-[9px] bg-white/20 px-2 py-0.5 rounded-full font-bold">{'\u{1F31F}'} Featured</span>
                        <span className="text-[9px] bg-white/20 px-2 py-0.5 rounded-full font-bold">{a.category}</span>
                      </div>
                      <h3 className="font-extrabold text-base leading-tight line-clamp-2">{a.title}</h3>
                      {a.summary && <p className="text-[10px] text-white/70 mt-2 line-clamp-2">{a.summary}</p>}
                      <div className="flex items-center gap-2 mt-3">
                        <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[8px] font-bold">{authorName(a).charAt(0)}</div>
                        <span className="text-[10px] text-white/80">{authorName(a)} {'\u2022'} {a.readTime}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Goal-specific section */}
        {!searchQ && goalSpecific.length > 0 && goalHeaders[goal] && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-extrabold text-gray-900">{goalHeaders[goal].title}</h3>
                <p className="text-[10px] text-gray-400">{goalHeaders[goal].subtitle}</p>
              </div>
            </div>
            <div className="overflow-x-auto -mx-5 px-5">
              <div className="flex gap-3 min-w-max pb-2">
                {goalSpecific.slice(0, 4).map(a => (
                  <button key={a.id} onClick={() => setReadingArticle(a)} className="w-56 bg-white rounded-2xl p-3 shadow-sm text-left active:scale-95 transition-transform flex-shrink-0">
                    <div className="w-full h-16 rounded-xl flex items-center justify-center text-3xl" style={{ backgroundColor: '#F5F3FF' }}>{a.emoji}</div>
                    <p className="text-xs font-bold text-gray-800 mt-2 line-clamp-2 leading-tight">{a.title}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{authorName(a)} {'\u2022'} {a.readTime}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5">
          {cats.map(c => (
            <button key={c} onClick={() => setCat(c)}
              className={'px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ' + (cat === c ? 'bg-rose-500 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-500')}>
              {c}
            </button>
          ))}
        </div>

        {/* All Articles */}
        <h3 className="text-xs font-bold text-gray-400 uppercase">{cat === 'All' ? 'All Articles' : cat} ({filtered.length})</h3>
        {filtered.map(a => (
          <button key={a.id} onClick={() => setReadingArticle(a)} className="w-full bg-white rounded-2xl p-4 shadow-sm text-left active:scale-[0.98] transition-transform">
            <div className="flex gap-3">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ backgroundColor: '#F5F3FF' }}>{a.emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600">{a.category}</span>
                  {a.isFeatured && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">{'\u2605'}</span>}
                  {a.targetAudience.includes(goal as any) && !a.targetAudience.includes('all') && (
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-500">For You</span>
                  )}
                </div>
                <h4 className="text-sm font-bold text-gray-800 leading-tight line-clamp-2">{a.title}</h4>
                {a.summary && <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{a.summary}</p>}
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="w-4 h-4 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-[7px] text-white font-bold">{authorName(a).charAt(0)}</div>
                  <span className="text-[10px] text-gray-400">{authorName(a)} {'\u2022'} {a.readTime}</span>
                </div>
              </div>
            </div>
          </button>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <span className="text-5xl">{'\u{1F4DD}'}</span>
            <p className="text-sm font-bold text-gray-400 mt-3">{searchQ ? 'No matching articles' : 'No articles yet'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
