/**
 * Sharia Compliance Module for Hotel OS
 *
 * GCC Region Support - Islamic Finance & Halal Compliance
 *
 * Features:
 * - Islamic Finance (Murabaha, Ijara, Mudaraba)
 * - Halal Hotel Services
 * - Arabic Language Support
 * - Islamic Calendar Integration
 * - Zakat Calculation
 */

const express = require('express');
const router = express.Router();

// ============================================
// SHARIA COMPLIANCE CONFIG
// ============================================

const SHARIA_COMPLIANCE = {
  version: '1.0',
  standards: ['AAOIFI', 'IFSB', 'Islamic Finance Council'],
  regions: ['UAE', 'Saudi Arabia', 'Qatar', 'Kuwait', 'Oman', 'Bahrain'],
};

// Halal services and restrictions
const HALAL_SERVICES = {
  foodBeverage: {
    halalCertified: true,
    alcoholFree: true,
    porkFree: true,
    certification: 'Halal Certification Required',
  },
  spaWellness: {
    allowed: ['Halal Spa', 'Abaya Spa', 'Family Spa'],
    restricted: ['Mixed Gender Spa', 'Alcohol-based Treatments'],
  },
  entertainment: {
    allowed: ['Live Arabic Music', 'Cultural Shows', 'Kids Entertainment'],
    restricted: ['Casino', 'Gambling', 'Adult Entertainment'],
  },
  roomFeatures: {
    qiblaDirection: true,
  },
};

// Islamic Finance Structures
const ISLAMIC_FINANCE = {
  murabaha: {
    name: 'Murabaha (Cost-Plus Financing)',
    description: 'Sale of goods with a stated profit margin',
    applicableTo: ['Room bookings', 'Conference packages', 'Package deals'],
  },
  ijara: {
    name: 'Ijara (Lease-to-Own)',
    description: 'Lease agreement with ownership transfer',
    applicableTo: ['Long-stay bookings', 'Corporate agreements'],
  },
  mudaraba: {
    name: 'Mudaraba (Profit Sharing)',
    description: 'Investment partnership with profit sharing',
    applicableTo: ['Investment opportunities', 'Partnership programs'],
  },
  takaful: {
    name: 'Takaful (Islamic Insurance)',
    description: 'Cooperative insurance system',
    applicableTo: ['Travel insurance', 'Property insurance'],
  },
};

// ============================================
// ISLAMIC CALENDAR UTILITIES
// ============================================

function gregorianToIslamic(date) {
  const gDaysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const iMonths = ['Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani',
                    'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', 'Sha\'ban',
                    'Ramadan', 'Shawwal', 'Dhu al-Qi\'dah', 'Dhu al-Hijjah'];

  // Simplified Islamic date conversion
  const jd = Math.floor((date.getTime() / 86400000) + 2440587.5);
  const l = jd - 1948446 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const l2 = l - 10631 * n + 354;
  const j = Math.floor((10985 - l2) / 5316) * Math.floor(50 * l2 / 17719) +
            Math.floor(l2 / 5670) * Math.floor(43 * l2 / 15238);
  const l3 = l2 - Math.floor((30 - j) / 15) * Math.floor(17719 * j / 50) -
             Math.floor(j / 16) * Math.floor(15238 * j / 43) + 852;
  const iDays = Math.floor((l3 - 0.5) / 29.5);
  const iMonth = Math.floor(29.5 * iDays);
  const iDay = Math.floor(l3 - 29.5 * iMonth + 0.5);
  const iYear = 30 * n + j - 30;

  return {
    hijriYear: iYear,
    hijriMonth: iMonths[iMonth],
    hijriDay: iDay,
    formatted: `${iDay} ${iMonths[iMonth]} ${iYear}`,
  };
}

function getQiblaDirection(location) {
  // Calculate Qibla direction from given coordinates
  const { latitude, longitude } = location;
  const kaabaLat = 21.4225;
  const kaabaLong = 39.8264;

  const lat1 = latitude * Math.PI / 180;
  const lat2 = kaabaLat * Math.PI / 180;
  const dLong = (kaabaLong - longitude) * Math.PI / 180;

  const y = Math.sin(dLong) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLong);
  const qibla = Math.atan2(y, x) * 180 / Math.PI;

  return {
    degrees: (qibla + 360) % 360,
    cardinal: qibla > 337.5 || qibla <= 22.5 ? 'North' :
              qibla <= 67.5 ? 'Northeast' :
              qibla <= 112.5 ? 'East' :
              qibla <= 157.5 ? 'Southeast' :
              qibla <= 202.5 ? 'South' :
              qibla <= 247.5 ? 'Southwest' :
              qibla <= 292.5 ? 'West' : 'Northwest',
  };
}

function calculateZakat(income, assets) {
  const nisab = 85 * 0.858; // Gold nisab threshold in grams (approx)
  const zakatRate = 0.025; // 2.5%

  const totalWealth = income + assets;
  const isEligible = totalWealth >= nisab * 5000; // Approximate USD value

  return {
    nisabThreshold: nisab,
    totalWealth,
    zakatAmount: isEligible ? totalWealth * zakatRate : 0,
    isEligible,
    explanation: isEligible
      ? 'Your wealth exceeds the Nisab threshold. Zakat of 2.5% is due.'
      : 'Your wealth is below the Nisab threshold. Zakat is not obligatory.',
  };
}

// ============================================
// ROUTES
// ============================================

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'sharia-compliance',
    version: SHARIA_COMPLIANCE.version,
    standards: SHARIA_COMPLIANCE.standards,
  });
});

// Get compliance info
router.get('/api/compliance', (req, res) => {
  res.json({
    success: true,
    data: {
      standards: SHARIA_COMPLIANCE.standards,
      regions: SHARIA_COMPLIANCE.regions,
      halalServices: HALAL_SERVICES,
      islamicFinance: ISLAMIC_FINANCE,
    },
  });
});

// Get halal services
router.get('/api/halal/services', (req, res) => {
  res.json({
    success: true,
    data: HALAL_SERVICES,
  });
});

// Get Islamic finance options
router.get('/api/finance/options', (req, res) => {
  res.json({
    success: true,
    data: ISLAMIC_FINANCE,
  });
});

// Calculate Murabaha pricing
router.post('/api/finance/murabaha', (req, res) => {
  try {
    const { costPrice, profitMargin, tenure } = req.body;

    if (!costPrice) {
      return res.status(400).json({ error: 'costPrice is required' });
    }

    const profit = profitMargin || 10; // Default 10% profit margin
    const salePrice = costPrice * (1 + profit / 100);
    const totalAmount = salePrice;
    const monthlyPayment = tenure ? totalAmount / tenure : totalAmount;

    res.json({
      success: true,
      data: {
        costPrice,
        profitMargin: profit,
        profitAmount: costPrice * profit / 100,
        salePrice,
        tenure: tenure || 1,
        monthlyPayment,
        currency: 'USD',
        structure: 'Murabaha',
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Calculate Ijara lease
router.post('/api/finance/ijara', (req, res) => {
  try {
    const { propertyValue, leasePeriod, annualRate } = req.body;

    if (!propertyValue) {
      return res.status(400).json({ error: 'propertyValue is required' });
    }

    const period = leasePeriod || 12; // months
    const rate = annualRate || 5; // 5% annual rate
    const monthlyRent = propertyValue * (rate / 100) / 12;
    const totalRent = monthlyRent * period;

    res.json({
      success: true,
      data: {
        propertyValue,
        leasePeriod: period,
        annualRate: rate,
        monthlyRent,
        totalRent,
        currency: 'USD',
        structure: 'Ijara',
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Islamic calendar date
router.get('/api/calendar/hijri', (req, res) => {
  const date = req.query.date ? new Date(req.query.date) : new Date();
  const hijri = gregorianToIslamic(date);

  res.json({
    success: true,
    data: {
      gregorian: date.toISOString().split('T')[0],
      hijri: hijri,
      ramadanUpcoming: hijri.hijriMonth === 'Ramadan',
    },
  });
});

// Get Qibla direction
router.get('/api/qibla', (req, res) => {
  const { latitude, longitude } = req.query;

  if (!latitude || !longitude) {
    return res.status(400).json({ error: 'latitude and longitude are required' });
  }

  const qibla = getQiblaDirection({
    latitude: parseFloat(latitude),
    longitude: parseFloat(longitude)
  });

  res.json({
    success: true,
    data: {
      location: { latitude: parseFloat(latitude), longitude: parseFloat(longitude) },
      qibla,
      instructions: 'Face the direction shown when praying',
    },
  });
});

// Calculate Zakat
router.post('/api/zakat/calculate', (req, res) => {
  try {
    const { income, assets } = req.body;

    const result = calculateZakat(income || 0, assets || 0);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check if room is Sharia-compliant
router.get('/api/room/:roomId/compliance', (req, res) => {
  const { roomId } = req.params;

  // Mock room compliance data
  res.json({
    success: true,
    data: {
      roomId,
      compliance: {
        halalDecor: true,
        qiblaDirection: true,
        prayerMat: true,
        quran: true,
        arabicTV: true,
        noAlcoholMinibar: true,
        familyFloor: true,
        halalRoomService: true,
      },
      score: 100,
      certified: true,
    },
  });
});

// Get halal restaurant options
router.get('/api/restaurants/halal', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 'halal_001',
        name: 'Al Khaas Restaurant',
        cuisine: 'Arabic & International',
        halalCertified: true,
        alcoholFree: true,
        rating: 4.8,
        distance: '0.5 km',
      },
      {
        id: 'halal_002',
        name: 'Spice Garden',
        cuisine: 'Indian & Middle Eastern',
        halalCertified: true,
        alcoholFree: true,
        rating: 4.6,
        distance: '0.8 km',
      },
    ],
  });
});

// Get prayer times (simplified calculation)
router.get('/api/prayer-times', (req, res) => {
  const { latitude, longitude, date } = req.query;
  const targetDate = date ? new Date(date) : new Date();

  // Simplified prayer time calculation (using average for demo)
  res.json({
    success: true,
    data: {
      date: targetDate.toISOString().split('T')[0],
      location: { latitude: parseFloat(latitude) || 25.2048, longitude: parseFloat(longitude) || 55.2708 },
      times: {
        fajr: '05:30',
        sunrise: '06:45',
        dhuhr: '12:15',
        asr: '15:30',
        maghrib: '18:45',
        isha: '20:00',
      },
      method: 'Umm Al-Qura',
    },
  });
});

// Export router
module.exports = router;
