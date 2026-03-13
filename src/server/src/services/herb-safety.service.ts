/**
 * HERB SAFETY MATRIX — Comprehensive Ayurvedic Herb Safety Data
 * For Vedaclue Women's Health App
 *
 * This file contains evidence-based safety data for all herbs used in the app,
 * cross-referenced against 4 user goals: periods, fertility, pregnancy, wellness.
 *
 * Sources: PubMed, NCCIH, LactMed, Charaka Samhita, Sushruta Samhita,
 *          Bhavaprakasha Nighantu, Dravyaguna Vijnana, AHPA Botanical Safety Handbook
 *
 * LAST REVIEWED: 2026-03-13
 * IMPORTANT: This data must be reviewed by a qualified Ayurvedic physician and
 *            a modern pharmacologist before deployment. Do not use as sole basis
 *            for medical recommendations.
 */

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

export type UserGoal = 'periods' | 'fertility' | 'pregnancy' | 'wellness';

export interface HerbSafetyProfile {
  herb: string;
  botanical: string;
  sanskrit: string;
  family: string;

  // Safety matrix per user goal
  safe_for_periods: boolean;
  safe_for_fertility: boolean;
  safe_during_pregnancy: boolean;
  safe_for_wellness: boolean;

  // Detailed notes per goal
  periods_note: string;
  fertility_note: string;
  pregnancy_warning: string;
  wellness_note: string;
  postpartum_note: string;

  // Special properties (cross-cutting flags)
  is_emmenagogue: boolean;       // Induces/stimulates menstruation
  is_galactagogue: boolean;      // Increases breast milk production
  is_uterotonic: boolean;        // Stimulates uterine contractions
  is_phytoestrogenic: boolean;   // Has estrogen-like activity
  affects_thyroid: boolean;      // Interacts with thyroid function

  // Safety details
  drug_interactions: string[];
  contraindications: string[];
  max_duration_weeks: number;    // Recommended max continuous use in weeks
  requires_practitioner: boolean;

  // Evidence
  classical_references: string[];
  modern_evidence: string;
  mechanism: string;
  key_constituents: string[];
  evidence_quality: 'high' | 'moderate' | 'low' | 'traditional-only';
}

// ─────────────────────────────────────────────────────────
// Safety Matrix Data
// ─────────────────────────────────────────────────────────

export const HERB_SAFETY_MATRIX: HerbSafetyProfile[] = [

  // ═══════════════════════════════════════════════════════
  // 1. SHATAVARI
  // ═══════════════════════════════════════════════════════
  {
    herb: 'Shatavari',
    botanical: 'Asparagus racemosus',
    sanskrit: 'Shatavari (शतावरी)',
    family: 'Asparagaceae',

    safe_for_periods: true,
    safe_for_fertility: true,
    safe_during_pregnancy: true,  // Generally considered safe; consult practitioner
    safe_for_wellness: true,

    periods_note: 'Excellent for menstrual regulation. Balances Pitta-Vata, nourishes Rasa and Rakta dhatu. Helps with scanty periods (Artava Kshaya) and painful periods. Phytoestrogenic saponins support endometrial health.',
    fertility_note: 'Primary herb for female fertility (Vajikarana). Steroidal saponins (Shatavarins) support follicle maturation, improve cervical mucus quality, and modulate FSH sensitivity. May improve egg quality through antioxidant action. Use throughout cycle, increase during fertile window.',
    pregnancy_warning: 'Generally considered safe in pregnancy in traditional Ayurvedic practice. Rich in folic acid which supports fetal development. However, always consult healthcare provider before use. No large-scale RCTs in pregnant women. Avoid high-dose supplemental extracts; moderate dietary/traditional doses preferred.',
    wellness_note: 'Adaptogenic, supports immune function, improves digestion (especially hyperacidity). Nourishes all tissues (Rasayana). Helps manage menopausal symptoms (hot flashes, vaginal dryness, insomnia) as demonstrated in 2025 RCT.',
    postpartum_note: 'GALACTAGOGUE: Improves breast milk volume, time to breast fullness, and maternal satisfaction (2025 RCT, 300mg twice daily for 72h postpartum). Traditionally included in postpartum formulations.',

    is_emmenagogue: false,
    is_galactagogue: true,
    is_uterotonic: false,
    is_phytoestrogenic: true,
    affects_thyroid: false,

    drug_interactions: [
      'Diuretics — may potentiate diuretic effect',
      'Antidiabetic drugs — may enhance hypoglycemic effect',
      'Lithium — diuretic effect may alter lithium clearance',
      'Estrogen-based medications (HRT, OCP) — phytoestrogenic interaction possible'
    ],
    contraindications: [
      'Known allergy to Asparagus species',
      'Estrogen-receptor-positive cancers (phytoestrogenic)',
      'Kidney disorders (diuretic effect)',
      'Acute diarrhea (moistening herb may worsen)'
    ],
    max_duration_weeks: 24,
    requires_practitioner: false,

    classical_references: [
      'Charaka Samhita, Chikitsa Sthana 30 — Vajikarana (reproductive tonics)',
      'Sushruta Samhita, Sharira Sthana 2/29 — Artava Kshaya treatment',
      'Bhavaprakasha Nighantu — Shatavari monograph, Guduchyadi Varga',
      'Dravyaguna Vijnana — classified as Balya (strengthening), Vrishya (aphrodisiac), Stanyakara (galactagogue)'
    ],
    modern_evidence: 'Springer (2025): Systematic review confirms fertility-enhancing potential via saponins and flavonoids. Frontiers in Reprod Health (2025): 8-week RCT (n=135) showed significant reduction in menopausal symptoms. J Obstet Gynaecol (2025): RCT showed improved postpartum milk volume vs placebo. PMC (2022): Shavari Bar improved breast milk output in double-blind RCT.',
    mechanism: 'Steroidal saponins (Shatavarins I-IV) bind estrogen receptors with moderate affinity, modulating gonadotropin (FSH/LH) secretion. Antioxidant flavonoids (quercetin, rutin) reduce oxidative stress in ovarian tissue. Polysaccharides enhance immune function. Mucilage provides gastroprotective effect.',
    key_constituents: ['Shatavarins (steroidal saponins)', 'Sarsasapogenin', 'Quercetin', 'Rutin', 'Asparagamine', 'Racemosol', 'Polysaccharides'],
    evidence_quality: 'moderate'
  },

  // ═══════════════════════════════════════════════════════
  // 2. ASHWAGANDHA
  // ═══════════════════════════════════════════════════════
  {
    herb: 'Ashwagandha',
    botanical: 'Withania somnifera',
    sanskrit: 'Ashwagandha (अश्वगन्धा)',
    family: 'Solanaceae',

    safe_for_periods: true,
    safe_for_fertility: true,
    safe_during_pregnancy: false,  // CONTRAINDICATED
    safe_for_wellness: true,

    periods_note: 'Adaptogenic — reduces cortisol-driven menstrual irregularity. Helps with stress-related amenorrhea and luteal phase defects. Supports adrenal function. Useful during luteal phase for PMS mood symptoms.',
    fertility_note: 'Supports fertility indirectly through stress reduction (28% cortisol decrease per Chandrasekhar 2012). Balances thyroid hormones (important for ovulation). Improves sexual desire and hormonal balance. MUST DISCONTINUE once pregnancy is confirmed.',
    pregnancy_warning: 'CONTRAINDICATED IN PREGNANCY. Associated with risk of miscarriage, premature delivery, and potential harm to fetus. Active ingredients (withanolides) may pass into breast milk. The Dutch RIVM and German BfR (2024) advise pregnant women to avoid Withania somnifera. Animal studies show potential abortifacient activity at high doses. Discontinue immediately upon confirmed pregnancy.',
    wellness_note: 'Premier adaptogen. Clinically proven to reduce cortisol, improve sleep quality (Triethylene glycol), reduce anxiety (GABAergic activity), and enhance physical endurance. Supports subclinical hypothyroidism. Reduces inflammation via withanolide-mediated NF-kB inhibition.',
    postpartum_note: 'Safety during breastfeeding is not established. Withanolides may pass into breast milk. Avoid until breastfeeding is complete, or use only under strict practitioner supervision.',

    is_emmenagogue: false,
    is_galactagogue: false,
    is_uterotonic: false,
    is_phytoestrogenic: false,
    affects_thyroid: true,  // IMPORTANT: stimulates thyroid function

    drug_interactions: [
      'Thyroid medications (levothyroxine) — may increase T4 levels, requires dose adjustment',
      'Sedatives/anxiolytics (benzodiazepines) — may potentiate sedation',
      'Immunosuppressants — may counteract immunosuppression (immunostimulatory)',
      'Antihypertensives — may potentiate blood pressure lowering',
      'Antidiabetics — may enhance hypoglycemic effect',
      'CYP450 substrates — may affect drug metabolism'
    ],
    contraindications: [
      'Pregnancy — ABSOLUTE CONTRAINDICATION',
      'Breastfeeding — insufficient safety data',
      'Hyperthyroidism / thyrotoxicosis — stimulates thyroid',
      'Autoimmune conditions (lupus, RA, MS) — immunostimulatory',
      'Hormone-sensitive cancers — potential hormonal effects',
      'Pre-surgery — discontinue 2 weeks before (sedative, blood pressure effects)',
      'Liver disease — hepatotoxicity reported in some cases (BfR 2024)'
    ],
    max_duration_weeks: 12,
    requires_practitioner: true,

    classical_references: [
      'Charaka Samhita, Chikitsa Sthana — Rasayana (rejuvenation)',
      'Bhavaprakasha Nighantu — Ashwagandha monograph',
      'Sushruta Samhita — Balya (strength-giving) and Vajikarana'
    ],
    modern_evidence: 'Chandrasekhar K et al. (2012 IJAM): 60-day RCT showed 28% cortisol reduction. NCCIH (2025): notes possible thyroid effects, liver injury risk. BfR Germany (2024): safety communication on hepatotoxicity risk. Frontiers Global Women Health (2026): first prospective RCT in pregnant women — results pending peer validation, preliminary data suggests safety but insufficient sample size. AHP (2024): challenged abortifacient claims but maintained pregnancy avoidance recommendation.',
    mechanism: 'Withanolides (withaferin A, withanolide D) modulate HPA axis, reducing cortisol via GABAergic pathways. Somniferine provides sedative action. Increases T4 production in thyroid by enhancing thyroid peroxidase activity. Immunomodulatory via T-cell/NK-cell activation. Anti-inflammatory via NF-kB and COX-2 inhibition.',
    key_constituents: ['Withanolides (withaferin A, withanolide D)', 'Somniferine', 'Triethylene glycol', 'Sitoindosides', 'Withanol', 'Iron'],
    evidence_quality: 'high'
  },

  // ═══════════════════════════════════════════════════════
  // 3. ASHOKA BARK
  // ═══════════════════════════════════════════════════════
  {
    herb: 'Ashoka Bark',
    botanical: 'Saraca asoca',
    sanskrit: 'Ashoka (अशोक)',
    family: 'Fabaceae (Caesalpiniaceae)',

    safe_for_periods: true,
    safe_for_fertility: true,
    safe_during_pregnancy: false,  // CONTRAINDICATED — uterotonic + emmenagogue
    safe_for_wellness: true,

    periods_note: 'PRIMARY herb for menorrhagia (heavy bleeding) in Ayurveda. Uterine sedative that reduces excessive menstrual flow. Strengthens uterine musculature. Classical formulation: Ashokarishta. Also useful for dysmenorrhea and irregular cycles.',
    fertility_note: 'Stimulates endometrial and ovarian tissue — supports endometrial receptivity for implantation. Anti-androgenic effects help with PCOS. However, also has anti-estrogenic and anti-progestational activity in some studies, so use under practitioner guidance for fertility.',
    pregnancy_warning: 'CONTRAINDICATED IN PREGNANCY. Has documented uterotonic (oxytocic) and emmenagogue properties. Hot water bark extract stimulates uterine contractions similar to ergot alkaloids. May cause premature labor or miscarriage. Also avoid during lactation without medical supervision.',
    wellness_note: 'Anti-inflammatory, anti-bacterial, anti-cancer properties. Supports uterine health long-term. Useful for fibroids and endometriosis management (as adjunct). Rich in catechins and flavonoids with antioxidant activity.',
    postpartum_note: 'May be used postpartum to support uterine involution (return to normal size), but only under practitioner supervision. Not a galactagogue.',

    is_emmenagogue: true,   // CRITICAL FLAG
    is_galactagogue: false,
    is_uterotonic: true,    // CRITICAL FLAG
    is_phytoestrogenic: true,
    affects_thyroid: false,

    drug_interactions: [
      'Anticoagulants/antiplatelets — may affect bleeding (uterotonic)',
      'Hormonal medications (HRT, OCP) — anti-estrogenic / anti-progestational activity',
      'Oxytocin — may potentiate uterotonic effect',
      'Antidiabetics — may have hypoglycemic effect'
    ],
    contraindications: [
      'Pregnancy — ABSOLUTE CONTRAINDICATION (uterotonic)',
      'Breastfeeding — insufficient safety data',
      'Hormone-sensitive conditions — complex hormonal activity',
      'Concurrent use with other uterotonic herbs',
      'Children — no safety data'
    ],
    max_duration_weeks: 12,
    requires_practitioner: true,

    classical_references: [
      'Charaka Samhita — Stri Roga Chikitsa (gynecological disorders)',
      'Bhavaprakasha Nighantu — Ashoka monograph, primary herb for Pradara (menorrhagia)',
      'Sharangdhara Samhita — Ashokarishta formulation',
      'Kashyapa Samhita — uterine health'
    ],
    modern_evidence: 'Pharmacognosy Reviews: documented uterotonic activity similar to ergot. ResearchGate (2021): review confirmed anti-androgenic effect useful in PCOS. Journal of Chemical and Pharmaceutical Research: bark extract contains catechin, epicatechin, procyanidins with antioxidant and anti-cancer activity. ScienceDirect (2021): flavonoids, catechin, beta-sitosterol, lignin glycosides show anti-cancer properties with no side effects in vitro.',
    mechanism: 'Bark contains catechins (epicatechin, procyanidins) that act as uterine muscle modulators — sedative at low doses, stimulant at higher doses. Steroidal compounds exert anti-estrogenic and anti-progestational activity. Flavonoids (quercetin derivatives) provide anti-inflammatory action via prostaglandin synthesis inhibition. Saponins contribute to anti-androgenic PCOS benefits.',
    key_constituents: ['Catechin', 'Epicatechin', 'Procyanidin B2', 'Beta-sitosterol', 'Lignin glycosides', 'Haematoxylin', 'Saponins'],
    evidence_quality: 'moderate'
  },

  // ═══════════════════════════════════════════════════════
  // 4. DASHMOOL
  // ═══════════════════════════════════════════════════════
  {
    herb: 'Dashmool',
    botanical: '10-root decoction (Bilva, Agnimantha, Shyonaka, Patala, Gambhari, Brihati, Kantakari, Gokshura, Shalaparni, Prishnaparni)',
    sanskrit: 'Dashamoola (दशमूल)',
    family: 'Polyherbal formulation',

    safe_for_periods: true,
    safe_for_fertility: true,
    safe_during_pregnancy: false,  // Avoid — may stimulate contractions; use only under strict supervision
    safe_for_wellness: true,

    periods_note: 'Excellent for Vata-dominant menstrual disorders: cramps, irregular cycles, scanty flow. Stabilizes Apana Vata (downward-moving energy governing menstruation). Classical use in Dashmool Kwath (decoction) for dysmenorrhea.',
    fertility_note: 'Supports reproductive health by balancing Vata dosha, which governs the reproductive system. Used in classical fertility formulations. Nourishes Shukra/Artava dhatu (reproductive tissue). Safe pre-conception under practitioner guidance.',
    pregnancy_warning: 'AVOID DURING PREGNANCY unless specifically prescribed by a qualified Ayurvedic practitioner. Dashmularishta (fermented form) is specifically contraindicated as it may stimulate uterine contractions. The raw kwath (decoction) has less risk but insufficient safety data for blanket recommendation. Individual roots in the formulation ratio may be safer, but err on the side of caution.',
    wellness_note: 'Powerful anti-inflammatory and analgesic. Supports joint health, reduces body pain, manages Vata imbalances. Anti-oxidant properties. Useful for general debility and fatigue.',
    postpartum_note: 'EXCELLENT POSTPARTUM HERB. Traditionally given to new mothers for: uterine involution, fatigue recovery, lactation support, hormonal rebalancing, muscular/joint pain relief. Safe during breastfeeding. Dashmool kwath is a cornerstone of Sutika Paricharya (postpartum care).',

    is_emmenagogue: false,
    is_galactagogue: false,
    is_uterotonic: true,  // Dashmularishta form
    is_phytoestrogenic: false,
    affects_thyroid: false,

    drug_interactions: [
      'Anti-inflammatory medications (NSAIDs) — may potentiate anti-inflammatory effect',
      'Diuretics — Gokshura component has diuretic activity',
      'Antihypertensives — mild hypotensive effect possible'
    ],
    contraindications: [
      'Pregnancy — avoid unless under strict medical supervision',
      'Known allergy to any of the 10 constituent roots',
      'Acute gastritis (may irritate in decoction form)',
      'Dashmularishta specifically contraindicated in pregnancy (alcohol content + uterotonic)'
    ],
    max_duration_weeks: 12,
    requires_practitioner: true,

    classical_references: [
      'Charaka Samhita, Chikitsa Sthana 30 — Vatahara formulations',
      'Sushruta Samhita — Dashamoola in Sutika Paricharya (postpartum)',
      'Sharangdhara Samhita — Dashmool Kwath and Dashmularishta preparation',
      'Ashtanga Hridaya — Vatahara (Vata-pacifying) formulations'
    ],
    modern_evidence: 'Limited modern clinical trials specifically on the 10-root combination. Individual constituent studies show: Gokshura (Tribulus) — diuretic, supports reproductive health; Bilva (Aegle) — anti-inflammatory, gastroprotective; Brihati/Kantakari — bronchodilatory, anti-inflammatory. Safety profile in pregnancy not established in RCTs.',
    mechanism: 'Combined action of 10 roots provides synergistic anti-inflammatory (COX/LOX inhibition), analgesic, and Vata-pacifying effects. Gokshura provides diuretic action via potassium-sparing mechanism. Bilva provides antispasmodic effect on smooth muscle. Alkaloids from Shyonaka and Patala contribute to anti-inflammatory action.',
    key_constituents: ['Aegeline (Bilva)', 'Protodioscin (Gokshura)', 'Solasodine (Brihati/Kantakari)', 'Lupeol (multiple roots)', 'Beta-sitosterol', 'Tannins'],
    evidence_quality: 'low'
  },

  // ═══════════════════════════════════════════════════════
  // 5. JATAMANSI
  // ═══════════════════════════════════════════════════════
  {
    herb: 'Jatamansi',
    botanical: 'Nardostachys jatamansi',
    sanskrit: 'Jatamansi (जटामांसी)',
    family: 'Caprifoliaceae (Valerianaceae)',

    safe_for_periods: true,
    safe_for_fertility: true,
    safe_during_pregnancy: false,  // CONTRAINDICATED
    safe_for_wellness: true,

    periods_note: 'Useful for dysmenorrhea with dragging pain, ovarian discomfort, lower abdominal distension. Its warm, penetrating quality relieves Vata-type menstrual pain. Also excellent for PMS-related anxiety, insomnia, and mood disturbances via GABAergic action.',
    fertility_note: 'Supports fertility indirectly through stress reduction and hormonal balancing. Neuroprotective and calming — helps with stress-related infertility. Should be discontinued when actively trying to conceive in the fertile window due to sedative properties.',
    pregnancy_warning: 'CONTRAINDICATED IN PREGNANCY AND LACTATION. Higher doses (>2000mg powder) may cause spotting or bleeding during pregnancy, suggesting emmenagogue-like activity. Insufficient safety data for pregnancy and breastfeeding. Absolutely avoid during pregnancy and lactation.',
    wellness_note: 'Powerful nervine sedative and anxiolytic. Improves sleep quality, reduces anxiety and depression. Neuroprotective — supports memory and cognitive function. Traditional use for skin health and hair care (external application safe).',
    postpartum_note: 'Avoid during breastfeeding due to lack of safety data. May be used externally (in hair oils) safely.',

    is_emmenagogue: true,   // At higher doses — can cause spotting/bleeding
    is_galactagogue: false,
    is_uterotonic: false,
    is_phytoestrogenic: false,
    affects_thyroid: false,

    drug_interactions: [
      'Sedatives/sleeping pills (benzodiazepines, zolpidem) — potentiates CNS depression',
      'Antidepressants (SSRIs, SNRIs) — serotonergic interaction possible',
      'Antihypertensives — may enhance blood pressure lowering',
      'Anticoagulants — may affect bleeding risk',
      'Antiepileptics — may potentiate sedation'
    ],
    contraindications: [
      'Pregnancy — CONTRAINDICATED (potential emmenagogue at high doses)',
      'Breastfeeding — insufficient safety data',
      'Operating machinery / driving (sedative effect)',
      'Low blood pressure (hypotensive effect)',
      'Scheduled surgery — discontinue 2 weeks before'
    ],
    max_duration_weeks: 8,
    requires_practitioner: true,

    classical_references: [
      'Charaka Samhita — Medhya Rasayana (brain tonics)',
      'Bhavaprakasha Nighantu — Jatamansi monograph, Karpuradi Varga',
      'Dravyaguna Vijnana — classified as Medhya (intellect-promoting), Nidrajanana (sleep-inducing)'
    ],
    modern_evidence: 'Drugs.com monograph: documented sedative, antihypertensive activity. Herbal Reality: confirmed anxiolytic effects via GABA modulation. Limited clinical trials in humans. Animal studies show neuroprotective, anticonvulsant, and antidepressant activity. Jatamansone (main sesquiterpene) shows GABA-A receptor modulation.',
    mechanism: 'Sesquiterpenes (jatamansone, nardostachone) modulate GABA-A receptors, producing anxiolytic and sedative effects. Nardal and nardin provide neuroprotection via antioxidant pathways. Valerenic acid derivatives (related to valerian family) contribute to sleep-promoting effects. Volatile oils provide anti-inflammatory action.',
    key_constituents: ['Jatamansone', 'Nardostachone', 'Nardin', 'Nardal', 'Jatamansinol', 'Valerenic acid derivatives', 'Sesquiterpenes'],
    evidence_quality: 'low'
  },

  // ═══════════════════════════════════════════════════════
  // 6. LODHRA
  // ═══════════════════════════════════════════════════════
  {
    herb: 'Lodhra',
    botanical: 'Symplocos racemosa',
    sanskrit: 'Lodhra (लोध्र)',
    family: 'Symplocaceae',

    safe_for_periods: true,
    safe_for_fertility: true,
    safe_during_pregnancy: false,  // Avoid — insufficient data + hormonal effects
    safe_for_wellness: true,

    periods_note: 'Traditionally used for menorrhagia (heavy bleeding), amenorrhea, dysmenorrhea. Astringent properties reduce excessive menstrual flow. Anti-inflammatory action relieves menstrual pain. Regulates Kapha-Pitta type menstrual disorders.',
    fertility_note: 'EXCELLENT for PCOS/fertility. Anti-androgenic effect prevents ovarian cell dysfunction in PCOS. Helps balance FSH, estrogen, progesterone while reducing excess androgens. In combination with other herbs, may help open blocked fallopian tubes (under practitioner supervision only). Regulates ovulation.',
    pregnancy_warning: 'AVOID DURING PREGNANCY. Insufficient safety data for pregnant women. Hormonal activity (anti-androgenic, estrogen/progesterone modulation) could theoretically affect pregnancy hormones. Long-term use only under physician supervision. Do not use without consulting healthcare provider.',
    wellness_note: 'Powerful astringent — supports skin health, wound healing. Anti-inflammatory and antioxidant. Useful for diarrhea and dysentery (astringent). Eye health support in traditional use.',
    postpartum_note: 'Insufficient safety data for breastfeeding. Avoid or use under practitioner supervision only.',

    is_emmenagogue: false,
    is_galactagogue: false,
    is_uterotonic: false,
    is_phytoestrogenic: true,  // Modulates estrogen/progesterone/FSH
    affects_thyroid: false,

    drug_interactions: [
      'Hormonal medications (OCP, HRT) — modulates reproductive hormones',
      'Anti-androgens (spironolactone, finasteride) — may potentiate anti-androgenic effect',
      'Antidiabetics — some hypoglycemic activity reported',
      'Anticoagulants — astringent properties may affect coagulation'
    ],
    contraindications: [
      'Pregnancy — insufficient safety data with hormonal activity',
      'Breastfeeding — insufficient safety data',
      'Children — no safety data',
      'Hormone-sensitive cancers — hormonal modulating activity',
      'Long-term use without medical supervision'
    ],
    max_duration_weeks: 12,
    requires_practitioner: true,

    classical_references: [
      'Charaka Samhita — Stri Roga (gynecological disorders)',
      'Bhavaprakasha Nighantu — Lodhra monograph, classified as Stambhana (astringent)',
      'Dravyaguna Vijnana — Grahi (absorbent), Stambhana, Chakshushya (eye-supporting)',
      'Sushruta Samhita — Lodhradi Varga'
    ],
    modern_evidence: 'Millennium Herbal Care: documented anti-androgenic activity in PCOS ovarian cell models. International Journal of Herbal Medicine (2016): comprehensive pharmacological review. Organic India: confirmed FSH, estrogen, progesterone balancing and androgen reduction. No large-scale human RCTs available.',
    mechanism: 'Bark contains loturine, colloturine (alkaloids) and betulinic acid that exert anti-androgenic effects by suppressing excess androgen production in ovarian theca cells. Symplocoside (glycoside) provides anti-inflammatory action. Tannins give astringent properties. Ellagic acid derivatives contribute to antioxidant and uterine-toning effects.',
    key_constituents: ['Loturine', 'Colloturine', 'Betulinic acid', 'Symplocoside', 'Ellagic acid', 'Tannins', 'Beta-sitosterol'],
    evidence_quality: 'low'
  },

  // ═══════════════════════════════════════════════════════
  // 7. MANJISTHA
  // ═══════════════════════════════════════════════════════
  {
    herb: 'Manjistha',
    botanical: 'Rubia cordifolia',
    sanskrit: 'Manjishtha (मञ्जिष्ठा)',
    family: 'Rubiaceae',

    safe_for_periods: true,
    safe_for_fertility: true,
    safe_during_pregnancy: false,  // CONTRAINDICATED — emmenagogue + uterotonic
    safe_for_wellness: true,

    periods_note: 'Excellent blood purifier (Raktashodhaka). Treats irregular menstruation through emmenagogue action. Clears Pitta-vitiated blood conditions. Supports lymphatic drainage — reduces bloating and fluid retention. Useful for acne that worsens around periods.',
    fertility_note: 'Supports fertility through blood purification and lymphatic cleansing — improves uterine blood supply. Detoxifies Rasa and Rakta dhatu. Use during follicular phase for endometrial preparation. Discontinue during TWW (two-week wait) due to emmenagogue properties.',
    pregnancy_warning: 'CONTRAINDICATED IN PREGNANCY. Emmenagogue — stimulates uterine contractions and can potentially cause miscarriage. In high doses may stimulate uterine muscles. Must be absolutely avoided throughout pregnancy. Also avoid during breastfeeding — insufficient safety data.',
    wellness_note: 'Premier blood purifier in Ayurveda. Excellent for skin conditions (acne, eczema, psoriasis). Supports lymphatic system. Anti-inflammatory and hepatoprotective. Useful for joint inflammation.',
    postpartum_note: 'Avoid during breastfeeding. Insufficient lactation safety data. May cause liver stress in sensitive individuals.',

    is_emmenagogue: true,   // CRITICAL FLAG
    is_galactagogue: false,
    is_uterotonic: true,    // At high doses
    is_phytoestrogenic: false,
    affects_thyroid: false,

    drug_interactions: [
      'Anticoagulants (warfarin, aspirin) — mild blood-thinning properties increase bleeding risk',
      'Antihypertensives — may potentiate hypotensive effect',
      'Hepatotoxic drugs — potential additive liver stress',
      'Iron supplements — may affect iron absorption'
    ],
    contraindications: [
      'Pregnancy — ABSOLUTE CONTRAINDICATION (emmenagogue + uterotonic)',
      'Breastfeeding — insufficient safety data',
      'Low blood pressure — hypotensive effect',
      'Liver disease — potential mild hepatotoxicity',
      'Bleeding disorders — blood-thinning properties',
      'Allergy to Rubiaceae family plants'
    ],
    max_duration_weeks: 8,
    requires_practitioner: true,

    classical_references: [
      'Charaka Samhita — Varnya (complexion-improving), Jvarahara (anti-pyretic)',
      'Bhavaprakasha Nighantu — Manjishtha monograph, Haritakyadi Varga',
      'Sushruta Samhita — Raktashodhaka (blood purifier)',
      'Sharangdhara Samhita — Manjisthadyarishta formulation'
    ],
    modern_evidence: 'LifeSpa: comprehensive review of lymphatic and blood purification mechanisms. Multiple pharmacological studies confirm anti-inflammatory (NF-kB inhibition), antioxidant, and hepatoprotective activity. Rubiadin and purpurin demonstrate anti-cancer activity in vitro. Clinical evidence in humans is limited — mostly traditional and preclinical.',
    mechanism: 'Anthraquinones (purpurin, munjistin, rubiadin) provide blood-purifying and lymph-cleansing action. Rubimaillin stimulates uterine contractions (emmenagogue mechanism). Alizarin derivatives provide anti-inflammatory action via cyclooxygenase inhibition. Triterpenoids contribute hepatoprotective effects.',
    key_constituents: ['Purpurin', 'Munjistin', 'Rubiadin', 'Rubimaillin', 'Alizarin', 'Manjistin', 'Mollugin', 'Beta-sitosterol'],
    evidence_quality: 'low'
  },

  // ═══════════════════════════════════════════════════════
  // 8. GUDUCHI / GILOY
  // ═══════════════════════════════════════════════════════
  {
    herb: 'Guduchi / Giloy',
    botanical: 'Tinospora cordifolia',
    sanskrit: 'Guduchi (गुडूची)',
    family: 'Menispermaceae',

    safe_for_periods: true,
    safe_for_fertility: true,
    safe_during_pregnancy: false,  // Insufficient data — avoid
    safe_for_wellness: true,

    periods_note: 'Immunomodulatory — supports overall health during menstruation. Anti-inflammatory properties reduce period-related inflammation. Not directly menstruation-specific but supports general vitality and immunity during the cycle.',
    fertility_note: 'Supports fertility indirectly through immune regulation and detoxification. Rasayana (rejuvenative) that nourishes all dhatus including Shukra (reproductive tissue). Anti-inflammatory action may benefit endometriosis-related fertility issues. Safe pre-conception.',
    pregnancy_warning: 'AVOID DURING PREGNANCY. Not enough reliable information to know if Tinospora cordifolia is safe during pregnancy or breastfeeding. Immunostimulatory properties could theoretically affect pregnancy immune tolerance. Recent reports of liver injury (hepatotoxicity) raise additional safety concerns. Stay on the safe side and avoid.',
    wellness_note: 'Premier immunomodulator in Ayurveda. Amrita (nectar) — one of three Amrit plants. Anti-pyretic, anti-inflammatory, hepatoprotective, anti-diabetic, anti-oxidant. Useful for chronic fevers, gout, and metabolic disorders. Short-term use (< 8 weeks) considered safe.',
    postpartum_note: 'Insufficient safety data for breastfeeding. Avoid during lactation or use only under strict practitioner supervision.',

    is_emmenagogue: false,
    is_galactagogue: false,
    is_uterotonic: false,
    is_phytoestrogenic: false,
    affects_thyroid: false,

    drug_interactions: [
      'Antidiabetic medications — may enhance hypoglycemic effect, risk of hypoglycemia',
      'Immunosuppressants (cyclosporine, tacrolimus) — may counteract immunosuppression',
      'Antihypertensives — mild hypotensive effect possible',
      'Hepatotoxic drugs — potential additive liver stress (recent hepatotoxicity reports)'
    ],
    contraindications: [
      'Pregnancy — insufficient safety data',
      'Breastfeeding — insufficient safety data',
      'Autoimmune diseases (lupus, RA, MS, Hashimoto\'s) — immunostimulatory',
      'Pre-surgery — immunomodulatory effects',
      'Liver disease — recent hepatotoxicity case reports (PMC 2023)',
      'Long-term use > 8 weeks without monitoring'
    ],
    max_duration_weeks: 8,
    requires_practitioner: false,

    classical_references: [
      'Charaka Samhita — classified among Medhya Rasayana (intellect tonics)',
      'Bhavaprakasha Nighantu — Guduchi monograph, Guduchyadi Varga',
      'Sushruta Samhita — Vayahsthapana (anti-aging)',
      'Ashtanga Hridaya — Jvarahara (antipyretic), Rasayana'
    ],
    modern_evidence: 'PMC (2024): comprehensive review of immunomodulatory mechanisms (NF-kB pathway, interleukin modulation, T-cell/NK-cell activation). PMC (2023): case reports of guduchi-induced hepatotoxicity — liver injury in some patients. WebMD/RxList: safe short-term, long-term safety unknown. Heliyon (2024): confirmed immunomodulatory properties of leaf extracts. Over 60 bioactive compounds identified.',
    mechanism: 'Clerodane-type furanoditerpenoids (columbin, tinosporaside) provide immunomodulatory action via NF-kB pathway modulation and interleukin regulation. Berberine (alkaloid) contributes anti-diabetic and antimicrobial effects. Polysaccharides (arabinogalactan) activate macrophages. Giloin and giloinin provide anti-pyretic action.',
    key_constituents: ['Columbin', 'Tinosporaside', 'Berberine', 'Giloin', 'Giloinin', 'Arabinogalactan', 'Tinocordiside', 'Palmatine'],
    evidence_quality: 'moderate'
  },

  // ═══════════════════════════════════════════════════════
  // 9. TRIPHALA
  // ═══════════════════════════════════════════════════════
  {
    herb: 'Triphala',
    botanical: 'Terminalia chebula (Haritaki) + Terminalia bellirica (Bibhitaki) + Phyllanthus emblica (Amalaki)',
    sanskrit: 'Triphala (त्रिफला)',
    family: 'Combretaceae + Phyllanthaceae',

    safe_for_periods: true,
    safe_for_fertility: true,
    safe_during_pregnancy: false,  // CONTRAINDICATED
    safe_for_wellness: true,

    periods_note: 'Supports menstrual health through detoxification (Ama Pachana). Regulates digestion and elimination which indirectly supports hormonal balance. Reduces bloating common during periods. Amalaki provides iron and vitamin C for menstrual blood loss recovery.',
    fertility_note: 'Supports fertility through Rasayana (rejuvenation) and detoxification. Clears Ama (toxins) from Shrotas (channels) including Artava Vaha Srotas (reproductive channels). Best used in pre-conception detox phase. Discontinue once actively trying to conceive.',
    pregnancy_warning: 'CONTRAINDICATED IN PREGNANCY. Haritaki (one of three components) has documented abortifacient properties. Laxative/purgative action may stimulate uterine contractions and increase miscarriage risk. Strong cleansing (Shodhana) properties are inappropriate during pregnancy when conservation (Brimhana) is needed. Avoid throughout pregnancy.',
    wellness_note: 'Gold standard Ayurvedic detox formula. Antioxidant (highest known ORAC among Ayurvedic formulas). Supports healthy digestion, regular elimination. Anti-inflammatory. May support healthy cholesterol. Gentle daily detox at low doses. Prebiotic — supports gut microbiome.',
    postpartum_note: 'May be used cautiously postpartum (after 40 days) for digestive support. Avoid during active breastfeeding in first weeks as laxative effect may affect infant through breast milk. Use only under practitioner guidance.',

    is_emmenagogue: true,   // Haritaki component
    is_galactagogue: false,
    is_uterotonic: true,    // Haritaki — abortifacient properties documented
    is_phytoestrogenic: false,
    affects_thyroid: false,

    drug_interactions: [
      'Anticoagulants (warfarin) — may increase bleeding risk',
      'Antidiabetics — may enhance hypoglycemic effect',
      'Iron supplements — tannins may reduce iron absorption',
      'Other laxatives — potentiation of purgative effect',
      'Immunosuppressants — immunomodulatory activity'
    ],
    contraindications: [
      'Pregnancy — ABSOLUTE CONTRAINDICATION (Haritaki abortifacient)',
      'Severe diarrhea or dehydration (laxative effect)',
      'Iron deficiency anemia — may decrease iron absorption',
      'Pre-surgery — stop 2 weeks before (bleeding risk)',
      'Breastfeeding (first 6 weeks) — may affect infant via breast milk',
      'Children under 5 — no safety data'
    ],
    max_duration_weeks: 12,
    requires_practitioner: false,

    classical_references: [
      'Charaka Samhita, Chikitsa Sthana — Rasayana (rejuvenation)',
      'Sushruta Samhita — Triphala as supreme Rasayana',
      'Sharangdhara Samhita — Triphala Churna preparation and indications',
      'Ashtanga Hridaya — daily Rasayana for all constitutions'
    ],
    modern_evidence: 'Journal of Ayurveda and Integrative Medicine: highest antioxidant capacity among Ayurvedic polyherbal formulations. Multiple PubMed studies confirm anti-inflammatory (gallic acid, ellagic acid), antimicrobial, and chemopreventive activity. Clinical evidence for constipation relief in small trials. FirstCry/AashaAyurveda: confirm pregnancy contraindication due to Haritaki component.',
    mechanism: 'Gallic acid and ellagic acid (from all three fruits) provide antioxidant action via free radical scavenging. Chebulagic acid (Haritaki) stimulates intestinal smooth muscle contraction — both laxative and potential uterotonic mechanism. Emblicanin A/B (Amalaki) provide Vitamin C-independent antioxidant activity. Tannins exert astringent and antimicrobial effects. Prebiotic oligosaccharides support Lactobacillus and Bifidobacterium growth.',
    key_constituents: ['Gallic acid', 'Ellagic acid', 'Chebulagic acid', 'Chebulinic acid', 'Emblicanin A/B', 'Corilagin', 'Beta-glucogallin', 'Ascorbic acid (Amalaki)'],
    evidence_quality: 'moderate'
  },

  // ═══════════════════════════════════════════════════════
  // 10. PUNARNAVA
  // ═══════════════════════════════════════════════════════
  {
    herb: 'Punarnava',
    botanical: 'Boerhavia diffusa',
    sanskrit: 'Punarnava (पुनर्नवा)',
    family: 'Nyctaginaceae',

    safe_for_periods: true,
    safe_for_fertility: true,
    safe_during_pregnancy: false,  // Avoid — potential uterine stimulation, diuretic
    safe_for_wellness: true,

    periods_note: 'Excellent diuretic — reduces period-related water retention, bloating, and edema. Treats heavy menstruation (Rakta Pradara). Useful for fibroids with associated bleeding. Anti-inflammatory action reduces menstrual inflammation.',
    fertility_note: 'Supports fertility through kidney/urinary tract health and detoxification. Treats UTIs that can interfere with conception. Reduces inflammation in reproductive tract. Use pre-conception for preparation. Discontinue once pregnancy is confirmed.',
    pregnancy_warning: 'AVOID DURING PREGNANCY, especially beyond first trimester. Potential uterine stimulation at higher doses. Diuretic effect may cause electrolyte imbalance during pregnancy. Low doses (<1g/day) may be used briefly in early pregnancy under professional supervision only, but blanket recommendation is to avoid. Insufficient large-scale safety data.',
    wellness_note: 'Excellent kidney and liver tonic. Potent diuretic (Mutrala). Anti-inflammatory for joints and kidneys. Hepatoprotective. Useful for edema, ascites, kidney stones. Rejuvenative — Punarnava means "that which renews the body."',
    postpartum_note: 'Safe during lactation. May be used postpartum for fluid retention, UTIs, and general recovery.',

    is_emmenagogue: false,
    is_galactagogue: false,
    is_uterotonic: true,   // At higher doses — potential uterine stimulation
    is_phytoestrogenic: false,
    affects_thyroid: false,

    drug_interactions: [
      'Diuretics (furosemide, hydrochlorothiazide) — potentiates diuretic effect',
      'Antihypertensives — may enhance blood pressure lowering',
      'Antidiabetics — may enhance hypoglycemic effect',
      'Lithium — diuretic effect may alter lithium levels',
      'Potassium supplements — electrolyte balance disruption'
    ],
    contraindications: [
      'Pregnancy — avoid (uterine stimulation risk + diuretic)',
      'Severe dehydration or electrolyte imbalance',
      'Hypotension — may worsen low blood pressure',
      'Kidney failure (severe) — diuretic load',
      'High doses during pregnancy (>6g churna)'
    ],
    max_duration_weeks: 12,
    requires_practitioner: false,

    classical_references: [
      'Charaka Samhita — Shothahara (anti-edema), Mutrala (diuretic)',
      'Sushruta Samhita — Vidaryadi Gana (diuretic group)',
      'Bhavaprakasha Nighantu — Punarnava monograph, Guduchyadi Varga',
      'Ashtanga Hridaya — Shothaghna (edema-reducing)'
    ],
    modern_evidence: 'PMC (2014): comprehensive pharmacological review — confirmed diuretic, anti-inflammatory, hepatoprotective, immunomodulatory activity. Boeravinone compounds show potent anti-inflammatory action via LOX inhibition. Punarnavine (alkaloid) shows hepatoprotective effects in animal models. Limited human clinical trials.',
    mechanism: 'Boeravinones (rotenoids) provide anti-inflammatory action via lipoxygenase (LOX) inhibition. Punarnavine (alkaloid) provides hepatoprotective and diuretic effects. Potassium salts in the plant contribute to natural diuretic action. Ursolic acid provides anti-inflammatory and antimicrobial effects. Liriodendrin acts as calcium channel blocker contributing to hypotensive effect.',
    key_constituents: ['Boeravinone A-H', 'Punarnavine', 'Ursolic acid', 'Liriodendrin', 'Beta-sitosterol', 'Potassium salts', 'Oxalic acid'],
    evidence_quality: 'moderate'
  },

  // ═══════════════════════════════════════════════════════
  // 11. GUGGULU
  // ═══════════════════════════════════════════════════════
  {
    herb: 'Guggulu',
    botanical: 'Commiphora mukul',
    sanskrit: 'Guggulu (गुग्गुलु)',
    family: 'Burseraceae',

    safe_for_periods: true,
    safe_for_fertility: false,  // Caution — thyroid effects + hormonal
    safe_during_pregnancy: false,  // CONTRAINDICATED
    safe_for_wellness: true,

    periods_note: 'Anti-inflammatory — excellent for painful periods. Reduces Kapha/Meda (fat tissue) accumulation. Scraping (Lekhana) action clears channel blockages. Useful for PCOS with weight gain component. Kanchnar Guggulu specifically for thyroid and PCOS.',
    fertility_note: 'CAUTION for fertility. While it supports thyroid function (important for ovulation), its thyroid-stimulating properties may disrupt delicate hormonal balance needed for conception. Avoid during active conception attempts. May be used in pre-conception phase for thyroid optimization under strict supervision. Avoid once trying to conceive. Contraindicated in excessive uterine bleeding.',
    pregnancy_warning: 'CONTRAINDICATED IN PREGNANCY. Literature recommends avoidance during pregnancy. Stimulates thyroid function (T3 synthesis) which could disrupt pregnancy thyroid balance. Potential embryotoxicity — though some sources claim purified guggul lacks embryotoxic effects, the evidence is conflicting. Do not use during pregnancy or breastfeeding. Also contraindicated in thyrotoxicosis.',
    wellness_note: 'Lipid-lowering (guggulsterones reduce LDL cholesterol). Anti-inflammatory (COX-2 and 5-LOX inhibition). Thyroid-stimulating. Weight management support. Joint health (anti-arthritic). Classical Yogaraj Guggulu for joint pain.',
    postpartum_note: 'Avoid during breastfeeding. Thyroid-stimulating properties may affect infant via breast milk. Resume only after lactation ends.',

    is_emmenagogue: false,
    is_galactagogue: false,
    is_uterotonic: false,
    is_phytoestrogenic: false,
    affects_thyroid: true,  // CRITICAL — stimulates T3 synthesis

    drug_interactions: [
      'Thyroid medications (levothyroxine, methimazole) — CRITICAL interaction, may alter thyroid hormone levels',
      'Anticoagulants/antiplatelets (warfarin, aspirin) — may increase bleeding risk',
      'Lipid-lowering drugs (statins) — additive cholesterol-lowering effect',
      'Antidiabetics — may enhance hypoglycemic effect',
      'Estrogen-based medications (HRT, OCP) — do NOT combine',
      'Antihypertensives — may potentiate',
      'Tamoxifen — potential hormonal interaction'
    ],
    contraindications: [
      'Pregnancy — CONTRAINDICATED',
      'Breastfeeding — thyroid concerns',
      'Hyperthyroidism / thyrotoxicosis — stimulates thyroid',
      'Excessive uterine bleeding (Raktapradara)',
      'Hormone-sensitive cancers',
      'Acute kidney infection',
      'Liver disease — metabolized hepatically',
      'Active bleeding disorders'
    ],
    max_duration_weeks: 12,
    requires_practitioner: true,

    classical_references: [
      'Charaka Samhita — Lekhana (scraping/reducing) action',
      'Sushruta Samhita — Guggulu Kalpa, Medohara (fat-reducing)',
      'Sharangdhara Samhita — Yogaraj Guggulu, Kanchnar Guggulu formulations',
      'Bhavaprakasha Nighantu — Guggulu monograph'
    ],
    modern_evidence: 'ScienceDirect: demonstrated T3 synthesis stimulation via enhanced thyroid peroxidase and iodine uptake. Medscape: documented multiple drug interactions. Restorative Medicine monograph: comprehensive safety review. WebMD: confirmed lipid-lowering and anti-inflammatory activity. Guggulsterones (E and Z) are farnesoid X receptor (FXR) antagonists — established mechanism for cholesterol reduction.',
    mechanism: 'Guggulsterones (E and Z isomers) act as FXR antagonists, increasing LDL receptor expression and bile acid excretion — lowers cholesterol. They also enhance thyroid peroxidase activity, increasing iodine uptake and T3 synthesis. Myrrhanol A provides anti-inflammatory action via NF-kB inhibition. Guggulipid components inhibit COX-2 and 5-LOX pathways.',
    key_constituents: ['Guggulsterone E', 'Guggulsterone Z', 'Myrrhanol A', 'Guggulipid', 'Cembrene A', 'Mukulol', 'Commiphoric acids'],
    evidence_quality: 'high'
  },

  // ═══════════════════════════════════════════════════════
  // 12. TRIKATU
  // ═══════════════════════════════════════════════════════
  {
    herb: 'Trikatu',
    botanical: 'Zingiber officinale (Ginger) + Piper nigrum (Black Pepper) + Piper longum (Pippali)',
    sanskrit: 'Trikatu (त्रिकटु)',
    family: 'Zingiberaceae + Piperaceae',

    safe_for_periods: true,
    safe_for_fertility: true,
    safe_during_pregnancy: false,  // CONTRAINDICATED as formulation; ginger alone OK in moderation
    safe_for_wellness: true,

    periods_note: 'Digestive fire (Agni) booster — reduces bloating, nausea, and digestive sluggishness during periods. Ginger is anti-inflammatory and anti-emetic. Black pepper enhances bioavailability of other herbs (piperine). Useful for Kapha-type amenorrhea.',
    fertility_note: 'Supports fertility indirectly by optimizing digestion and nutrient absorption. Piperine dramatically enhances bioavailability of curcumin, CoQ10, and other fertility supplements. Ginger safe pre-conception. Discontinue Trikatu formulation once pregnancy confirmed — but ginger alone may continue in moderation.',
    pregnancy_warning: 'TRIKATU FORMULATION CONTRAINDICATED IN PREGNANCY. Pippali (long pepper) may cause uterine contractions and lead to complications. Concentrated Trikatu supplements must be avoided. EXCEPTION: Ginger alone in food amounts (<1g/day) is considered safe during pregnancy and helps with morning sickness. Black pepper in food amounts is also safe. The issue is concentrated Pippali and the combined heating formulation.',
    wellness_note: 'Premier digestive formula. Enhances Agni (digestive fire). Piperine increases bioavailability of many nutrients and drugs by 20-200%. Anti-inflammatory (gingerols, shogaols). Useful for respiratory health, congestion, Kapha conditions.',
    postpartum_note: 'Beneficial postpartum — pippali enhances postpartum recovery and metabolism. Improves digestion and supports Agni recovery. Use under practitioner guidance during breastfeeding.',

    is_emmenagogue: false,
    is_galactagogue: false,
    is_uterotonic: true,   // Pippali component — may cause uterine contractions
    is_phytoestrogenic: false,
    affects_thyroid: false,

    drug_interactions: [
      'ALL DRUGS — piperine inhibits CYP3A4, CYP2D6, CYP1A2, dramatically increasing bioavailability of many medications',
      'Anticoagulants (warfarin) — ginger + piperine may increase bleeding risk',
      'Antidiabetics — may enhance hypoglycemic effect',
      'Acid reflux medications (PPIs, H2 blockers) — may counteract or potentiate',
      'Phenytoin, propranolol, theophylline — piperine alters their metabolism',
      'Rifampin, carbamazepine — CYP450 interaction'
    ],
    contraindications: [
      'Pregnancy — Pippali component contraindicated (uterotonic)',
      'Active gastric ulcers or acute gastritis — heating herbs aggravate',
      'GERD / acid reflux — may worsen',
      'Bleeding disorders — blood-thinning effects of ginger',
      'Pre-surgery — discontinue 2 weeks before',
      'Pitta-predominant constitution with active inflammation'
    ],
    max_duration_weeks: 8,
    requires_practitioner: false,

    classical_references: [
      'Charaka Samhita — Deepaniya (Agni-kindling), Pachana (digestive)',
      'Bhavaprakasha Nighantu — Trikatu as Kapha-Vata Shamaka',
      'Sharangdhara Samhita — Trikatu Churna preparation',
      'Ashtanga Hridaya — Katu Rasa (pungent taste) therapeutics'
    ],
    modern_evidence: 'Piperine bioavailability enhancement is well-established: 20x increase for curcumin (Shoba et al., 1998, Planta Medica). Gingerols show COX-2 inhibition comparable to NSAIDs. Ginger safety in pregnancy (<1g/day) confirmed by multiple meta-analyses — no increased malformation or adverse outcomes. Pippali: limited human data, animal studies suggest uterotonic activity.',
    mechanism: 'Piperine (from black pepper and pippali) inhibits hepatic and intestinal CYP450 enzymes and P-glycoprotein efflux pump, dramatically increasing bioavailability. Gingerols and shogaols (ginger) inhibit COX-2 and 5-LOX, providing anti-inflammatory action. Piperine also stimulates TRPV1 receptors, enhancing thermogenesis. Combined effect: potent Agni (digestive fire) stimulation through thermogenic and enzymatic pathways.',
    key_constituents: ['Piperine', 'Piperlongumine', 'Gingerols (6-, 8-, 10-)', 'Shogaols', 'Zingerone', 'Piperanine', 'Chavicine'],
    evidence_quality: 'high'
  },

  // ═══════════════════════════════════════════════════════
  // 13. FENNEL SEEDS
  // ═══════════════════════════════════════════════════════
  {
    herb: 'Fennel Seeds',
    botanical: 'Foeniculum vulgare',
    sanskrit: 'Saunf / Shatapushpa (शतपुष्पा)',
    family: 'Apiaceae (Umbelliferae)',

    safe_for_periods: true,
    safe_for_fertility: true,  // Caution — phytoestrogenic
    safe_during_pregnancy: false,  // Avoid concentrated supplements; culinary amounts may be OK
    safe_for_wellness: true,

    periods_note: 'Excellent for menstrual cramps — antispasmodic action on uterine smooth muscle. Reduces bloating and gas (carminative). Phytoestrogenic properties may help regulate scanty periods. Clinical trials show efficacy comparable to mefenamic acid for dysmenorrhea.',
    fertility_note: 'PHYTOESTROGENIC — high anethole content mimics estrogen. May support fertility in estrogen-deficient conditions but could disrupt fertility in conditions of estrogen excess (endometriosis, fibroids). Use under practitioner guidance for fertility. Helpful for cervical mucus production.',
    pregnancy_warning: 'AVOID CONCENTRATED SUPPLEMENTS DURING PREGNANCY. European Committee on Herbal Medicinal Products does not recommend fennel for pregnant or breastfeeding mothers. Anethole has documented phytoestrogenic activity that could affect pregnancy hormones. Estragole component has potential genotoxicity at high doses. Small culinary amounts (in food/tea) are likely safe but avoid therapeutic doses.',
    wellness_note: 'Excellent digestive aid (carminative). Reduces bloating, gas, and indigestion. Pleasant taste makes it good for after-meal consumption. Antispasmodic. Mild diuretic. Eye health support (traditional use).',
    postpartum_note: 'GALACTAGOGUE — traditionally used to increase breast milk production. Evidence is mixed: two small studies showed increased milk volume and infant weight gain, but no increase in serum prolactin. Anethole is excreted in breast milk. Use cautiously during lactation — some practitioners recommend it, but official HMPC guidance advises against it.',

    is_emmenagogue: true,   // Phytoestrogenic — may stimulate menstruation
    is_galactagogue: true,  // Traditional use, mixed evidence
    is_uterotonic: false,
    is_phytoestrogenic: true,  // CRITICAL — high anethole content
    affects_thyroid: false,

    drug_interactions: [
      'Estrogen-based medications (OCP, HRT) — phytoestrogenic interaction',
      'Anticoagulants — coumarin content may affect coagulation',
      'Ciprofloxacin — fennel may reduce antibiotic absorption',
      'Tamoxifen — may reduce efficacy (estrogenic activity)',
      'Antidiabetics — may have mild hypoglycemic effect'
    ],
    contraindications: [
      'Pregnancy — avoid therapeutic doses (phytoestrogenic)',
      'Estrogen-receptor-positive cancers — phytoestrogenic',
      'Endometriosis — phytoestrogenic may worsen',
      'Allergy to Apiaceae family (carrots, celery, dill)',
      'Bleeding disorders — coumarin content',
      'History of hormone-sensitive conditions'
    ],
    max_duration_weeks: 12,
    requires_practitioner: false,

    classical_references: [
      'Charaka Samhita — Shatapushpa mentioned in Vajikarana',
      'Bhavaprakasha Nighantu — Shatapushpa monograph',
      'Dravyaguna Vijnana — Deepaniya (digestive), Anulomana (carminative)',
      'Kashyapa Samhita — Stanyajanana (milk-producing)'
    ],
    modern_evidence: 'PMC (2014): comprehensive review — confirmed antispasmodic, estrogenic, galactagogue, and anti-inflammatory activity. LactMed (NCBI): mixed evidence for galactagogue effect, no prolactin increase observed. PubMed (2023): in utero fennel exposure affects ovarian estrogen receptor expression in animal models. Clinical trial: fennel comparable to mefenamic acid for primary dysmenorrhea.',
    mechanism: 'Trans-anethole (60-80% of volatile oil) is a potent phytoestrogen that binds estrogen receptors with moderate affinity. Fenchone provides antispasmodic action on smooth muscle. Estragole (methylchavicol) has mild estrogenic and potential genotoxic activity at high doses. Coumarins provide anticoagulant activity. Volatile oils provide carminative (anti-gas) action via relaxation of intestinal smooth muscle.',
    key_constituents: ['Trans-anethole', 'Fenchone', 'Estragole (methylchavicol)', 'Limonene', 'Alpha-pinene', 'Coumarins', 'Flavonoids (quercetin, kaempferol)'],
    evidence_quality: 'moderate'
  },

  // ═══════════════════════════════════════════════════════
  // 14. TURMERIC / HALDI
  // ═══════════════════════════════════════════════════════
  {
    herb: 'Turmeric / Haldi',
    botanical: 'Curcuma longa',
    sanskrit: 'Haridra (हरिद्रा)',
    family: 'Zingiberaceae',

    safe_for_periods: true,
    safe_for_fertility: true,
    safe_during_pregnancy: true,  // CULINARY AMOUNTS ONLY — avoid supplements
    safe_for_wellness: true,

    periods_note: 'Excellent anti-inflammatory — reduces menstrual pain via COX-2 inhibition. Curcumin modulates prostaglandin synthesis. Supports liver detoxification of excess estrogen (Phase II conjugation). Reduces period-related inflammation. Traditional use in haldi doodh (turmeric milk).',
    fertility_note: 'Anti-inflammatory and antioxidant properties support a healthy uterine environment. Reduces oxidative stress in ovarian tissue. Supports liver metabolism of reproductive hormones. May improve endometrial receptivity through anti-inflammatory action. Safe in culinary amounts during conception attempts.',
    pregnancy_warning: 'CULINARY AMOUNTS SAFE — SUPPLEMENTS CONTRAINDICATED. AHPA Safety Class 1 for dietary use. NCCIH (2025) advises against curcumin supplements during pregnancy. Classified as potential emmenagogue, uterine stimulant in some pharmacology texts (Mills 2006), though no clinical evidence of actual harm at dietary doses. NO clinical studies of curcumin supplements in pregnant women. Rule: turmeric in food = safe; curcumin capsules/extracts = avoid.',
    wellness_note: 'One of the most researched herbs globally. Potent anti-inflammatory (comparable to NSAIDs without side effects). Antioxidant. Hepatoprotective. Anti-cancer. Neuroprotective. Supports joint health. Enhances skin health. Best absorbed with piperine (black pepper) and fat.',
    postpartum_note: 'Safe postpartum in culinary amounts. Traditional use in postpartum recovery foods across South Asian cultures. Supplement-strength curcumin should be avoided during breastfeeding — insufficient data.',

    is_emmenagogue: true,   // Theoretical — classified as such in pharmacology texts, but unproven clinically
    is_galactagogue: false,
    is_uterotonic: false,   // No clinical evidence of uterotonic action at dietary doses
    is_phytoestrogenic: false,
    affects_thyroid: false,

    drug_interactions: [
      'Anticoagulants (warfarin, heparin) — curcumin may increase bleeding risk',
      'Antidiabetics — may enhance hypoglycemic effect',
      'Acid reflux medications (PPIs) — curcumin may increase stomach acid',
      'Iron supplements — curcumin may chelate iron, reducing absorption',
      'Chemotherapy agents — may interact (both potentiate and inhibit depending on agent)',
      'Tacrolimus — curcumin may increase blood levels'
    ],
    contraindications: [
      'Pregnancy — avoid SUPPLEMENT doses (dietary doses safe)',
      'Gallstones or bile duct obstruction — stimulates bile flow',
      'Bleeding disorders — blood-thinning effect',
      'Pre-surgery — stop supplements 2 weeks before',
      'Iron deficiency — may reduce iron absorption',
      'Kidney stones (oxalate type) — turmeric contains oxalates'
    ],
    max_duration_weeks: 52,  // Safe long-term at dietary doses
    requires_practitioner: false,

    classical_references: [
      'Charaka Samhita — Haridra in Lekhaniya (reducing), Vishaghna (anti-toxin) groups',
      'Sushruta Samhita — wound healing, skin diseases',
      'Bhavaprakasha Nighantu — Haridra monograph, Haritakyadi Varga',
      'Ashtanga Hridaya — Krimighna (antimicrobial), Varnya (complexion)'
    ],
    modern_evidence: 'Over 15,000 PubMed publications on curcumin. Anti-inflammatory mechanism via NF-kB, COX-2, 5-LOX inhibition well established. Bioavailability is poor without piperine (20x enhancement). PMC (2020, 2021): reviews of curcumin in pregnancy — theoretical benefits for preeclampsia and IUGR via anti-inflammatory/anti-angiogenic pathways, but no human clinical trials. NCCIH (2025): dietary use safe, supplements not recommended in pregnancy.',
    mechanism: 'Curcuminoids (curcumin, demethoxycurcumin, bisdemethoxycurcumin) inhibit NF-kB transcription factor, reducing expression of COX-2, 5-LOX, TNF-alpha, IL-1, IL-6. This provides broad anti-inflammatory action. Curcumin also activates Nrf2 pathway, enhancing Phase II detoxification enzymes. Ar-turmerone provides anti-platelet activity. Bisdemethoxycurcumin has the highest antioxidant potency.',
    key_constituents: ['Curcumin', 'Demethoxycurcumin', 'Bisdemethoxycurcumin', 'Ar-turmerone', 'Alpha-turmerone', 'Zingiberene', 'Curcuminoids (3-5% of root)'],
    evidence_quality: 'high'
  },

  // ═══════════════════════════════════════════════════════
  // 15. GULKAND
  // ═══════════════════════════════════════════════════════
  {
    herb: 'Gulkand',
    botanical: 'Rosa damascena / Rosa centifolia (rose petal preserve with sugar)',
    sanskrit: 'Gulkand (गुलकन्द)',
    family: 'Rosaceae',

    safe_for_periods: true,
    safe_for_fertility: true,
    safe_during_pregnancy: true,   // SAFE — widely used in pregnancy in India
    safe_for_wellness: true,

    periods_note: 'Cooling (Sheeta Virya) — excellent for Pitta-type menstrual issues (heavy, early, hot periods). Reduces acidity and heartburn that worsen during periods. Mild laxative helps with period-related constipation. Supports emotional well-being — rose has mild anxiolytic properties.',
    fertility_note: 'Supports fertility through Pitta pacification and cooling. Nourishes Rasa dhatu (plasma tissue). Reduces oxidative stress via rose petal antioxidants (anthocyanins). Creates a calm, nourishing internal environment conducive to conception. No known interference with fertility.',
    pregnancy_warning: 'GENERALLY SAFE IN PREGNANCY. Widely used in Indian pregnancy diet, especially during months 6-9. Helps with: constipation, acidity, bloating, body heat, morning sickness. Rich in vitamins C and E, calcium, iron. Recommended 1-2 teaspoons daily. CAUTION: high sugar content — monitor in gestational diabetes.',
    wellness_note: 'Excellent Pitta-pacifying remedy. Cooling, soothing, mildly laxative. Rich in antioxidants (anthocyanins, flavonoids). Supports skin health. Reduces body heat. Pleasant taste improves compliance. Traditional "cooling tonic" in Ayurveda.',
    postpartum_note: 'Safe postpartum and during breastfeeding. Provides gentle laxative effect for postpartum constipation. Cooling and nourishing. Monitor sugar intake if diabetic.',

    is_emmenagogue: false,
    is_galactagogue: false,
    is_uterotonic: false,
    is_phytoestrogenic: false,
    affects_thyroid: false,

    drug_interactions: [
      'Antidiabetics — high sugar content may affect blood glucose control',
      'Laxatives — additive laxative effect (mild)',
      'No significant herb-drug interactions documented for rose petal preserve'
    ],
    contraindications: [
      'Gestational diabetes — high sugar content, use sugar-free versions or limit amount',
      'Type 1/Type 2 diabetes — sugar content',
      'Obesity — caloric content from sugar',
      'Kapha-dominant constitution — sweet + heavy may increase Kapha',
      'Known allergy to roses (rare)'
    ],
    max_duration_weeks: 52,  // Safe long-term
    requires_practitioner: false,

    classical_references: [
      'Bhavaprakasha Nighantu — Rosa (Shatapatri) as Pitta Shamaka',
      'Unani tradition — Gulkand is a Unani-origin preparation widely adopted in Ayurveda',
      'Charaka Samhita — Shatapatri (hundred-petaled rose) for Pitta conditions',
      'Yogaratnakara — cooling preparations for pregnancy care'
    ],
    modern_evidence: 'Masala Monk / FirstCry: widely cited as safe during pregnancy with benefits for digestion, acidity, constipation. No published adverse event reports. Rose petals contain anthocyanins, quercetin, kaempferol with antioxidant activity. Limited formal clinical trials but extensive traditional safety record across centuries. The primary safety concern is sugar content, not the herb itself.',
    mechanism: 'Rose petals contain anthocyanins and polyphenols (quercetin, kaempferol, gallic acid) that provide antioxidant action. Geraniol and citronellol (volatile oils) provide mild anxiolytic and anti-inflammatory effects. The preserve process (sun-curing with sugar for 30+ days) creates a probiotic-like fermentation that aids digestion. Cooling property (Sheeta Virya) comes from the innate pharmacology of rose + sugar combination. Mild laxative action via osmotic mechanism (sugar) and gentle stimulation of peristalsis.',
    key_constituents: ['Geraniol', 'Citronellol', 'Anthocyanins', 'Quercetin', 'Kaempferol', 'Gallic acid', 'Vitamin C', 'Vitamin E', 'Nerol', 'Eugenol'],
    evidence_quality: 'traditional-only'
  }
];


// ─────────────────────────────────────────────────────────
// CROSS-CUTTING SAFETY CATEGORIES
// ─────────────────────────────────────────────────────────

/**
 * EMMENAGOGUES — herbs that induce or stimulate menstruation.
 * CRITICAL: These MUST have pregnancy warnings as they can
 * cause uterine bleeding and potentially miscarriage.
 */
export const EMMENAGOGUE_HERBS = HERB_SAFETY_MATRIX
  .filter(h => h.is_emmenagogue)
  .map(h => ({
    herb: h.herb,
    botanical: h.botanical,
    risk_level: h.is_uterotonic ? 'HIGH' as const : 'MODERATE' as const,
    pregnancy_warning: h.pregnancy_warning
  }));
// Result: Ashoka bark, Jatamansi, Manjistha, Triphala (Haritaki), Fennel, Turmeric (theoretical)

/**
 * GALACTAGOGUES — herbs that increase breast milk production.
 * Useful postpartum but need careful evidence assessment.
 */
export const GALACTAGOGUE_HERBS = HERB_SAFETY_MATRIX
  .filter(h => h.is_galactagogue)
  .map(h => ({
    herb: h.herb,
    botanical: h.botanical,
    evidence_quality: h.evidence_quality,
    postpartum_note: h.postpartum_note
  }));
// Result: Shatavari, Fennel seeds

/**
 * UTEROTONIC herbs — stimulate uterine contractions.
 * DANGEROUS in pregnancy. Must be absolutely contraindicated.
 */
export const UTEROTONIC_HERBS = HERB_SAFETY_MATRIX
  .filter(h => h.is_uterotonic)
  .map(h => ({
    herb: h.herb,
    botanical: h.botanical,
    pregnancy_warning: h.pregnancy_warning,
    mechanism: h.mechanism
  }));
// Result: Ashoka bark, Dashmool, Manjistha, Punarnava, Triphala, Trikatu (pippali)

/**
 * PHYTOESTROGENIC herbs — have estrogen-like activity.
 * Relevant for: fertility support, PCOS, menopause, BUT
 * contraindicated in ER+ cancers and endometriosis (may worsen).
 */
export const PHYTOESTROGENIC_HERBS = HERB_SAFETY_MATRIX
  .filter(h => h.is_phytoestrogenic)
  .map(h => ({
    herb: h.herb,
    botanical: h.botanical,
    fertility_note: h.fertility_note,
    contraindications: h.contraindications.filter(c =>
      c.toLowerCase().includes('estrogen') || c.toLowerCase().includes('hormone') || c.toLowerCase().includes('cancer')
    )
  }));
// Result: Shatavari, Ashoka bark, Lodhra, Fennel seeds

/**
 * THYROID-AFFECTING herbs — interact with thyroid function.
 * CRITICAL for drug interaction warnings with levothyroxine,
 * methimazole, and other thyroid medications.
 */
export const THYROID_AFFECTING_HERBS = HERB_SAFETY_MATRIX
  .filter(h => h.affects_thyroid)
  .map(h => ({
    herb: h.herb,
    botanical: h.botanical,
    mechanism: h.mechanism,
    drug_interactions: h.drug_interactions.filter(d =>
      d.toLowerCase().includes('thyroid')
    )
  }));
// Result: Ashwagandha (stimulates T4), Guggulu (stimulates T3)


// ─────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────

/**
 * Get safety status for a specific herb and user goal
 */
export function isHerbSafe(herbName: string, goal: UserGoal): boolean {
  const herb = HERB_SAFETY_MATRIX.find(h =>
    h.herb.toLowerCase() === herbName.toLowerCase() ||
    h.botanical.toLowerCase().includes(herbName.toLowerCase()) ||
    h.sanskrit.toLowerCase().includes(herbName.toLowerCase())
  );
  if (!herb) return false; // Unknown herb — default to unsafe

  switch (goal) {
    case 'periods': return herb.safe_for_periods;
    case 'fertility': return herb.safe_for_fertility;
    case 'pregnancy': return herb.safe_during_pregnancy;
    case 'wellness': return herb.safe_for_wellness;
    default: return false;
  }
}

/**
 * Get full safety profile for a herb
 */
export function getHerbSafety(herbName: string): HerbSafetyProfile | undefined {
  return HERB_SAFETY_MATRIX.find(h =>
    h.herb.toLowerCase() === herbName.toLowerCase() ||
    h.botanical.toLowerCase().includes(herbName.toLowerCase()) ||
    h.sanskrit.toLowerCase().includes(herbName.toLowerCase())
  );
}

/**
 * Get all herbs safe for a given user goal
 */
export function getSafeHerbs(goal: UserGoal): HerbSafetyProfile[] {
  return HERB_SAFETY_MATRIX.filter(h => {
    switch (goal) {
      case 'periods': return h.safe_for_periods;
      case 'fertility': return h.safe_for_fertility;
      case 'pregnancy': return h.safe_during_pregnancy;
      case 'wellness': return h.safe_for_wellness;
      default: return false;
    }
  });
}

/**
 * Get all herbs that are UNSAFE for a given user goal — for filtering/warnings
 */
export function getUnsafeHerbs(goal: UserGoal): HerbSafetyProfile[] {
  return HERB_SAFETY_MATRIX.filter(h => {
    switch (goal) {
      case 'periods': return !h.safe_for_periods;
      case 'fertility': return !h.safe_for_fertility;
      case 'pregnancy': return !h.safe_during_pregnancy;
      case 'wellness': return !h.safe_for_wellness;
      default: return true;
    }
  });
}

/**
 * Get pregnancy warning for a specific herb (returns null if safe)
 */
export function getPregnancyWarning(herbName: string): string | null {
  const herb = getHerbSafety(herbName);
  if (!herb) return 'Unknown herb — consult healthcare provider before use.';
  if (!herb.safe_during_pregnancy) return herb.pregnancy_warning;
  return null;
}

/**
 * Check if a list of herbs (e.g., product ingredients) contains any
 * herbs unsafe for the user's goal. Returns array of warnings.
 */
export function checkIngredientSafety(
  ingredients: string[],
  goal: UserGoal
): { herb: string; safe: boolean; warning: string }[] {
  const warnings: { herb: string; safe: boolean; warning: string }[] = [];

  for (const ingredient of ingredients) {
    const herb = HERB_SAFETY_MATRIX.find(h =>
      ingredient.toLowerCase().includes(h.herb.toLowerCase()) ||
      ingredient.toLowerCase().includes(h.botanical.toLowerCase().split('(')[0].trim().toLowerCase())
    );

    if (herb) {
      const safe = isHerbSafe(herb.herb, goal);
      let warning = '';
      if (!safe) {
        switch (goal) {
          case 'periods': warning = herb.periods_note; break;
          case 'fertility': warning = herb.fertility_note; break;
          case 'pregnancy': warning = herb.pregnancy_warning; break;
          case 'wellness': warning = herb.wellness_note; break;
        }
      }
      warnings.push({ herb: herb.herb, safe, warning });
    }
  }

  return warnings;
}

/**
 * Get drug interactions for all herbs a user might be taking
 */
export function getDrugInteractions(herbNames: string[]): {
  herb: string;
  interactions: string[];
}[] {
  return herbNames.map(name => {
    const herb = getHerbSafety(name);
    return {
      herb: name,
      interactions: herb?.drug_interactions || ['No data available']
    };
  });
}

/**
 * Generate a safety summary suitable for display in the app
 */
export function generateSafetySummary(goal: UserGoal): {
  safe_herbs: string[];
  unsafe_herbs: { name: string; reason: string }[];
  general_disclaimer: string;
} {
  const safe = getSafeHerbs(goal);
  const unsafe = getUnsafeHerbs(goal);

  return {
    safe_herbs: safe.map(h => h.herb),
    unsafe_herbs: unsafe.map(h => ({
      name: h.herb,
      reason: goal === 'pregnancy' ? h.pregnancy_warning
        : goal === 'fertility' ? h.fertility_note
        : goal === 'periods' ? h.periods_note
        : h.wellness_note
    })),
    general_disclaimer: 'This information is for educational purposes only. Always consult a qualified Ayurvedic practitioner or healthcare provider before starting any herbal regimen. If you are taking prescription medications, inform your doctor about any herbal supplements. Never discontinue prescribed medication without medical advice.'
  };
}


// ─────────────────────────────────────────────────────────
// QUICK REFERENCE MATRIX (for display/debugging)
// ─────────────────────────────────────────────────────────
/*
┌───────────────────┬──────────┬───────────┬───────────┬──────────┬─────────────────────────────────────┐
│ Herb              │ Periods  │ Fertility │ Pregnancy │ Wellness │ Key Flags                           │
├───────────────────┼──────────┼───────────┼───────────┼──────────┼─────────────────────────────────────┤
│ Shatavari         │   SAFE   │   SAFE    │   SAFE*   │   SAFE   │ Galactagogue, Phytoestrogenic       │
│ Ashwagandha       │   SAFE   │   SAFE    │ UNSAFE    │   SAFE   │ Thyroid-affecting                   │
│ Ashoka Bark       │   SAFE   │   SAFE    │ UNSAFE    │   SAFE   │ Emmenagogue, Uterotonic, Phytoestro│
│ Dashmool          │   SAFE   │   SAFE    │ UNSAFE    │   SAFE   │ Uterotonic (fermented form)         │
│ Jatamansi         │   SAFE   │   SAFE    │ UNSAFE    │   SAFE   │ Emmenagogue (high doses)            │
│ Lodhra            │   SAFE   │   SAFE    │ UNSAFE    │   SAFE   │ Phytoestrogenic                     │
│ Manjistha         │   SAFE   │   SAFE    │ UNSAFE    │   SAFE   │ Emmenagogue, Uterotonic             │
│ Guduchi/Giloy     │   SAFE   │   SAFE    │ UNSAFE    │   SAFE   │ Immunostimulatory, hepatotox risk   │
│ Triphala          │   SAFE   │   SAFE    │ UNSAFE    │   SAFE   │ Emmenagogue, Uterotonic (Haritaki)  │
│ Punarnava         │   SAFE   │   SAFE    │ UNSAFE    │   SAFE   │ Uterotonic (high dose), Diuretic    │
│ Guggulu           │   SAFE   │  CAUTION  │ UNSAFE    │   SAFE   │ Thyroid-affecting (T3)              │
│ Trikatu           │   SAFE   │   SAFE    │ UNSAFE    │   SAFE   │ Uterotonic (pippali component)      │
│ Fennel Seeds      │   SAFE   │   SAFE†   │ UNSAFE‡   │   SAFE   │ Phytoestro, Galactagogue, Emmenag.  │
│ Turmeric/Haldi    │   SAFE   │   SAFE    │  SAFE**   │   SAFE   │ Emmenagogue (theoretical only)      │
│ Gulkand           │   SAFE   │   SAFE    │   SAFE    │   SAFE   │ No significant flags                │
└───────────────────┴──────────┴───────────┴───────────┴──────────┴─────────────────────────────────────┘

  * Shatavari: Safe in traditional/dietary doses; consult practitioner
  † Fennel: Phytoestrogenic — use under guidance for fertility
  ‡ Fennel: Culinary amounts likely safe; avoid concentrated supplements
 ** Turmeric: Culinary amounts safe; avoid supplement-strength curcumin

 PREGNANCY SAFE (only 3 of 15):
   1. Shatavari (with practitioner guidance)
   2. Turmeric (culinary amounts only)
   3. Gulkand (watch sugar in gestational diabetes)

 PREGNANCY UNSAFE (12 of 15):
   All others — ranging from "insufficient data" to "absolute contraindication"
*/
