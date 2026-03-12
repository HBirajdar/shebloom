// ══════════════════════════════════════════════════════════════════
// Weather Routes — Location + Weather-Based Ayurvedic Adjustments
// ══════════════════════════════════════════════════════════════════

import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/response.utils';
import weatherService from '../services/weather.service';
import prisma from '../config/database';

const r = Router();
r.use(authenticate);

// ─── POST /weather/location — Save user location ────────────────
r.post('/location', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const { latitude, longitude } = q.body;
    if (latitude == null || longitude == null) {
      errorResponse(s, 'Latitude and longitude required', 400); return;
    }
    const weather = await weatherService.saveLocationAndFetch(q.user!.id, latitude, longitude);
    successResponse(s, weather, 'Location saved and weather fetched');
  } catch (e: any) {
    errorResponse(s, e.message, 500);
  }
});

// ─── GET /weather/current — Get current weather + Ayurvedic tips ─
r.get('/current', async (q: AuthRequest, s: Response, n: NextFunction) => {
  try {
    const weather = await weatherService.getUserWeather(q.user!.id);
    if (!weather) {
      successResponse(s, { weather: null, message: 'No location set. Share your location for weather-based recommendations.' });
      return;
    }

    // Get user's dosha for personalized weather recommendations
    const profile = await prisma.userProfile.findUnique({ where: { userId: q.user!.id } });
    const dosha = profile?.dosha || 'Vata';

    const insights = weatherService.getWeatherAdjustedRecommendations(dosha, weather);
    successResponse(s, insights, 'Weather insights fetched');
  } catch (e: any) {
    errorResponse(s, e.message, 500);
  }
});

export default r;
