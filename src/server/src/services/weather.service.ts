// ══════════════════════════════════════════════════════════════════
// Weather Service — OpenWeatherMap + Ayurvedic Seasonal Integration
// ══════════════════════════════════════════════════════════════════
//
// Uses real-time weather data to personalize Ayurvedic recommendations
// instead of relying on hardcoded calendar months.
//
// Ayurvedic weather principles (Charaka Samhita, Sutrasthana Ch.6):
// - Hot + Dry → Pitta aggravation
// - Cold + Dry → Vata aggravation
// - Cold + Damp → Kapha aggravation
// - Hot + Humid → Pitta + Kapha dual aggravation
// ══════════════════════════════════════════════════════════════════

import prisma from '../config/database';
import { cacheGet, cacheSet } from '../config/redis';

interface WeatherData {
  temperature: number;    // Celsius
  humidity: number;       // Percentage
  condition: string;      // clear, clouds, rain, snow, etc.
  windSpeed: number;      // m/s
  description: string;    // "light rain", "clear sky"
  city: string;
  country: string;
}

interface WeatherAyurvedicInsight {
  weather: WeatherData;
  dominantDosha: string;
  riskLevel: string;       // low, moderate, high
  adjustments: string[];
  dietTips: string[];
  lifestyleTips: string[];
}

class WeatherService {
  private apiKey: string | undefined;
  private baseUrl = 'https://api.openweathermap.org/data/2.5/weather';

  constructor() {
    this.apiKey = process.env.OPENWEATHER_API_KEY;
  }

  // ─── Fetch weather from OpenWeatherMap ─────────────────────────
  async fetchWeather(lat: number, lon: number): Promise<WeatherData | null> {
    if (!this.apiKey) return null;

    const cacheKey = `weather:${lat.toFixed(2)}:${lon.toFixed(2)}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return cached as WeatherData;

    try {
      const url = `${this.baseUrl}?lat=${lat}&lon=${lon}&units=metric&appid=${this.apiKey}`;
      const response = await fetch(url);
      if (!response.ok) return null;

      const data = await response.json();
      const weather: WeatherData = {
        temperature: data.main?.temp || 25,
        humidity: data.main?.humidity || 50,
        condition: data.weather?.[0]?.main?.toLowerCase() || 'clear',
        windSpeed: data.wind?.speed || 0,
        description: data.weather?.[0]?.description || 'clear sky',
        city: data.name || '',
        country: data.sys?.country || '',
      };

      // Cache for 30 minutes
      await cacheSet(cacheKey, weather, 1800);
      return weather;
    } catch {
      return null;
    }
  }

  // ─── Save user location and fetch weather ──────────────────────
  async saveLocationAndFetch(userId: string, lat: number, lon: number) {
    const weather = await this.fetchWeather(lat, lon);

    // Upsert weather cache
    await prisma.userWeatherCache.upsert({
      where: { userId },
      update: {
        latitude: lat,
        longitude: lon,
        city: weather?.city || null,
        country: weather?.country || null,
        temperature: weather?.temperature || null,
        humidity: weather?.humidity || null,
        weatherCondition: weather?.condition || null,
        windSpeed: weather?.windSpeed || null,
        description: weather?.description || null,
        lastFetchedAt: new Date(),
      },
      create: {
        userId,
        latitude: lat,
        longitude: lon,
        city: weather?.city || null,
        country: weather?.country || null,
        temperature: weather?.temperature || null,
        humidity: weather?.humidity || null,
        weatherCondition: weather?.condition || null,
        windSpeed: weather?.windSpeed || null,
        description: weather?.description || null,
        lastFetchedAt: new Date(),
      },
    });

    // Also update user profile location
    await prisma.userProfile.updateMany({
      where: { userId },
      data: {
        locationLatitude: lat,
        locationLongitude: lon,
        city: weather?.city || null,
      },
    });

    return weather;
  }

  // ─── Get cached weather for user ───────────────────────────────
  async getUserWeather(userId: string): Promise<WeatherData | null> {
    const cache = await prisma.userWeatherCache.findUnique({ where: { userId } });
    if (!cache || !cache.lastFetchedAt) return null;

    // If cached data is < 30 minutes old, use it
    const age = Date.now() - cache.lastFetchedAt.getTime();
    if (age < 30 * 60 * 1000 && cache.temperature !== null) {
      return {
        temperature: cache.temperature,
        humidity: cache.humidity || 50,
        condition: cache.weatherCondition || 'clear',
        windSpeed: cache.windSpeed || 0,
        description: cache.description || 'clear sky',
        city: cache.city || '',
        country: cache.country || '',
      };
    }

    // Otherwise refetch
    const fresh = await this.fetchWeather(cache.latitude, cache.longitude);
    if (fresh) {
      await prisma.userWeatherCache.update({
        where: { userId },
        data: {
          temperature: fresh.temperature,
          humidity: fresh.humidity,
          weatherCondition: fresh.condition,
          windSpeed: fresh.windSpeed,
          description: fresh.description,
          city: fresh.city,
          country: fresh.country,
          lastFetchedAt: new Date(),
        },
      });
    }
    return fresh;
  }

  // ─── Get Ayurvedic weather-based recommendations ───────────────
  getWeatherAdjustedRecommendations(dosha: string, weather: WeatherData): WeatherAyurvedicInsight {
    const temp = weather.temperature;
    const humidity = weather.humidity;
    const condition = weather.condition;

    // Determine which dosha the weather aggravates
    let weatherDosha = 'balanced';
    let riskLevel = 'low';
    const adjustments: string[] = [];
    const dietTips: string[] = [];
    const lifestyleTips: string[] = [];

    // ── Hot + Dry → Pitta aggravation ──
    if (temp > 32 && humidity < 40) {
      weatherDosha = 'Pitta';
      riskLevel = dosha.includes('Pitta') ? 'high' : 'moderate';
      adjustments.push(
        `Current temperature ${temp}°C with low humidity — strong Pitta aggravation`,
        'Charaka Samhita: "Greeshma ritu increases Pitta; cold, sweet, liquid foods pacify"',
      );
      dietTips.push(
        'Coconut water, watermelon, cucumber — maximum cooling',
        'Gulkand (rose petal preserve) with cold milk',
        'Avoid spicy, fermented, sour foods today',
        'Mint + fennel water throughout the day',
      );
      lifestyleTips.push(
        'Avoid direct sun exposure, especially 11 AM - 3 PM',
        'Apply sandalwood or rose water on pulse points',
        'Moonlight walk in evening — Pitta-cooling',
        'Sleep in cool, well-ventilated room',
      );
    }
    // ── Hot + Humid → Pitta + Kapha ──
    else if (temp > 30 && humidity > 70) {
      weatherDosha = 'Pitta-Kapha';
      riskLevel = (dosha.includes('Pitta') || dosha.includes('Kapha')) ? 'high' : 'moderate';
      adjustments.push(
        `Hot and humid (${temp}°C, ${humidity}% humidity) — both Pitta and Kapha aggravated`,
        'Risk of digestive sluggishness + overheating simultaneously',
      );
      dietTips.push(
        'Light, warm, spiced foods — not cold despite heat (cold weakens Agni in humidity)',
        'Ginger-lemon water — stimulates digestion in damp weather',
        'Avoid heavy, oily, dairy-rich meals',
        'Small frequent meals — Agni is weakest in humid heat',
      );
      lifestyleTips.push(
        'Dry garshana (silk glove massage) before shower — moves lymph',
        'Light exercise in early morning only — avoid midday',
        'Eucalyptus or camphor diffuser — clears Kapha congestion',
      );
    }
    // ── Cold + Dry → Vata aggravation ──
    else if (temp < 15 && humidity < 50) {
      weatherDosha = 'Vata';
      riskLevel = dosha.includes('Vata') ? 'high' : 'moderate';
      adjustments.push(
        `Cold and dry (${temp}°C, ${humidity}% humidity) — strong Vata aggravation`,
        'Charaka: "Hemanta ritu — Agni strongest, eat heavy nourishing foods"',
      );
      dietTips.push(
        'Warm, oily, heavy foods — ghee, sesame, soups, stews',
        'Ashwagandha warm milk at bedtime — nourishes Vata',
        'Avoid raw, cold, dry foods completely today',
        'Warm spices: cinnamon, cardamom, ginger in everything',
      );
      lifestyleTips.push(
        'Warm sesame oil abhyanga (self-massage) before bath',
        'Layer clothing — Vata hates sudden temperature changes',
        'Hot water bath or steam — opens channels, calms Vata',
        'Early sleep by 10 PM — cold nights aggravate Vata',
      );
    }
    // ── Cold + Damp → Kapha aggravation ──
    else if (temp < 20 && humidity > 70) {
      weatherDosha = 'Kapha';
      riskLevel = dosha.includes('Kapha') ? 'high' : 'moderate';
      adjustments.push(
        `Cold and damp (${temp}°C, ${humidity}% humidity) — Kapha aggravation`,
        'Risk of congestion, lethargy, water retention',
      );
      dietTips.push(
        'Warm, light, spiced foods — ginger tea is essential today',
        'Trikatu (ginger-pepper-pippali) before meals',
        'Honey in warm water (not hot) — classic Kapha remedy',
        'Absolutely avoid dairy, cold drinks, ice cream today',
      );
      lifestyleTips.push(
        'Vigorous exercise — DO NOT skip despite gloomy weather',
        'Dry sauna or steam inhalation with eucalyptus',
        'Stay warm and dry — change wet clothes immediately',
        'Wake before 6 AM — sleeping into Kapha time (6-10 AM) worsens lethargy',
      );
    }
    // ── Rainy / Monsoon → Vata + digestive disruption ──
    else if (condition === 'rain' || condition === 'drizzle' || condition === 'thunderstorm') {
      weatherDosha = 'Vata';
      riskLevel = dosha.includes('Vata') ? 'high' : 'moderate';
      adjustments.push(
        `Rainy weather — Varsha ritu effect: Vata aggravation + weak Agni`,
        'Charaka: "In Varsha, Agni is weakened by atmospheric changes"',
      );
      dietTips.push(
        'Only warm, freshly cooked, well-spiced food',
        'Avoid raw salads, leftover food — weak Agni cannot process',
        'Ginger + rock salt before meals — kindles digestive fire',
        'Light soups, kitchari, moong dal — easy to digest',
      );
      lifestyleTips.push(
        'Indoor exercise — yoga, pranayama',
        'Warm oil massage — sesame for Vata, coconut if it\'s also hot',
        'Avoid getting wet in rain — joint pain, cold risk elevated',
      );
    }
    // ── Windy → Vata ──
    else if (weather.windSpeed > 8) {
      weatherDosha = 'Vata';
      riskLevel = dosha.includes('Vata') ? 'moderate' : 'low';
      adjustments.push(
        `Windy conditions (${weather.windSpeed} m/s) — Vata element (air) activated`,
        'Wind directly increases Vata dosha — protect ears and joints',
      );
      dietTips.push('Warm, grounding meals — root vegetables, soups');
      lifestyleTips.push(
        'Cover ears and head in wind — Vata enters through ears (Charaka)',
        'Warm oil in ears (Karna Purana) if prone to earaches',
      );
    }
    // ── Mild / Pleasant ──
    else {
      weatherDosha = 'balanced';
      riskLevel = 'low';
      adjustments.push(
        `Pleasant weather (${temp}°C, ${humidity}% humidity) — all doshas relatively balanced`,
        'Good day for outdoor exercise and normal diet',
      );
      dietTips.push('Follow your regular dosha-appropriate diet');
      lifestyleTips.push('Outdoor activities recommended — enjoy the balanced weather');
    }

    return {
      weather,
      dominantDosha: weatherDosha,
      riskLevel,
      adjustments,
      dietTips,
      lifestyleTips,
    };
  }
}

export const weatherService = new WeatherService();
export default weatherService;
