/**
 * MapsOS - Geospatial Services
 *
 * Real integrations:
 * - Google Maps Platform (Maps, Routes, Places, Geocoding)
 * - Mapbox (Maps, Navigation, Geocoding)
 * - Distance Matrix API
 * - Route Optimization
 * - Geofencing
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}
app.use(cors(), express.json());
const PORT = process.env.MAPS_OS_PORT || 4600;

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  google: {
    apiKey: process.env.GOOGLE_MAPS_API_KEY,
    mapsUrl: 'https://maps.googleapis.com/maps/api',
    enabled: !!process.env.GOOGLE_MAPS_API_KEY
  },
  mapbox: {
    accessToken: process.env.MAPBOX_ACCESS_TOKEN,
    apiUrl: 'https://api.mapbox.com',
    enabled: !!process.env.MAPBOX_ACCESS_TOKEN
  },
  here: {
    apiKey: process.env.HERE_API_KEY,
    apiUrl: 'https://browse.search.hereapi.com',
    enabled: !!process.env.HERE_API_KEY
  }
};

// In-memory stores
const geocaches = new Map();      // locationKey -> geocoded data
const routes = new Map();          // routeId -> route data
const places = new Map();         // placeId -> place data
const geofences = new Map();      // geofenceId -> geofence data

// ============================================
// GOOGLE MAPS INTEGRATION
// ============================================

class GoogleMapsClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = CONFIG.google.mapsUrl;
  }

  async geocode(address) {
    if (!CONFIG.google.enabled) {
      return this.mockGeocode(address);
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/geocode/json?address=${encodeURIComponent(address)}&key=${this.apiKey}`
      );
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        return {
          success: true,
          formatted: result.formatted_address,
          location: {
            lat: result.geometry.location.lat,
            lng: result.geometry.location.lng
          },
          components: this.parseAddressComponents(result.address_components)
        };
      }
      return { success: false, error: 'No results found' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async reverseGeocode(lat, lng) {
    if (!CONFIG.google.enabled) {
      return this.mockReverseGeocode(lat, lng);
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/geocode/json?latlng=${lat},${lng}&key=${this.apiKey}`
      );
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        return {
          success: true,
          formatted: data.results[0].formatted_address,
          components: this.parseAddressComponents(data.results[0].address_components)
        };
      }
      return { success: false, error: 'No results found' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async placesSearch(query, location, radius = 5000) {
    if (!CONFIG.google.enabled) {
      return this.mockPlacesSearch(query, location);
    }

    try {
      let url = `${this.baseUrl}/places/textsearch/json?query=${encodeURIComponent(query)}&key=${this.apiKey}`;
      if (location) {
        url += `&location=${location.lat},${location.lng}&radius=${radius}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      return {
        success: true,
        places: data.results.map(p => ({
          placeId: p.place_id,
          name: p.name,
          address: p.formatted_address,
          location: p.geometry?.location,
          types: p.types,
          rating: p.rating,
          priceLevel: p.price_level,
          openingHours: p.opening_hours
        }))
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async directions(origin, destination, mode = 'DRIVING') {
    if (!CONFIG.google.enabled) {
      return this.mockDirections(origin, destination, mode);
    }

    try {
      const originStr = typeof origin === 'string' ? origin : `${origin.lat},${origin.lng}`;
      const destStr = typeof destination === 'string' ? destination : `${destination.lat},${destination.lng}`;

      const response = await fetch(
        `${this.baseUrl}/directions/json?origin=${originStr}&destination=${destStr}&mode=${mode}&key=${this.apiKey}`
      );
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        return {
          success: true,
          route: {
            polyline: route.overview_polyline.points,
            distance: route.legs[0].distance.value,
            duration: route.legs[0].duration.value,
            steps: route.legs[0].steps.map(s => ({
              instruction: s.html_instructions,
              distance: s.distance.value,
              duration: s.duration.value,
              startLocation: s.start_location,
              endLocation: s.end_location
            }))
          }
        };
      }
      return { success: false, error: 'No route found' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async distanceMatrix(origins, destinations, mode = 'DRIVING') {
    if (!CONFIG.google.enabled) {
      return this.mockDistanceMatrix(origins, destinations, mode);
    }

    try {
      const originsStr = origins.map(o => typeof o === 'string' ? o : `${o.lat},${o.lng}`).join('|');
      const destsStr = destinations.map(d => typeof d === 'string' ? d : `${d.lat},${d.lng}`).join('|');

      const response = await fetch(
        `${this.baseUrl}/distancematrix/json?origins=${originsStr}&destinations=${destsStr}&mode=${mode}&key=${this.apiKey}`
      );
      const data = await response.json();

      return {
        success: true,
        matrix: data.rows.map((row, i) => ({
          origin: origins[i],
          distances: row.elements.map((elem, j) => ({
            destination: destinations[j],
            distance: elem.distance?.value,
            duration: elem.duration?.value,
            status: elem.status
          }))
        }))
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async elevation(latlngs) {
    if (!CONFIG.google.enabled) {
      return { success: true, elevations: latlngs.map(() => ({ elevation: Math.random() * 1000 })) };
    }

    try {
      const locations = latlngs.map(l => `${l.lat},${l.lng}`).join('|');
      const response = await fetch(
        `${this.baseUrl}/elevation/json?locations=${locations}&key=${this.apiKey}`
      );
      const data = await response.json();

      return {
        success: true,
        elevations: data.results.map(r => ({
          location: r.location,
          elevation: r.elevation
        }))
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  parseAddressComponents(components) {
    const parsed = {};
    for (const comp of components) {
      for (const type of comp.types) {
        parsed[type] = comp.long_name;
        if (type === 'postal_code') parsed.postalCode = comp.long_name;
        if (type === 'locality') parsed.city = comp.long_name;
        if (type === 'administrative_area_level_1') parsed.state = comp.long_name;
        if (type === 'country') parsed.country = comp.long_name;
      }
    }
    return parsed;
  }

  // Mock methods for development
  mockGeocode(address) {
    return {
      success: true,
      formatted: address,
      location: { lat: 12.9716 + Math.random(), lng: 77.5946 + Math.random() },
      components: { city: 'Bangalore', state: 'Karnataka', country: 'India' }
    };
  }

  mockReverseGeocode(lat, lng) {
    return {
      success: true,
      formatted: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      components: { city: 'Bangalore', state: 'Karnataka', country: 'India' }
    };
  }

  mockPlacesSearch(query, location) {
    return {
      success: true,
      places: [
        {
          placeId: `place_${uuidv4().slice(0, 8)}`,
          name: `${query} - Location 1`,
          address: '123 Main St, Bangalore',
          location: { lat: 12.9716, lng: 77.5946 },
          types: ['restaurant'],
          rating: 4.2
        },
        {
          placeId: `place_${uuidv4().slice(0, 8)}`,
          name: `${query} - Location 2`,
          address: '456 Oak Ave, Bangalore',
          location: { lat: 12.9756, lng: 77.5996 },
          types: ['store'],
          rating: 4.5
        }
      ]
    };
  }

  mockDirections(origin, destination, mode) {
    const o = typeof origin === 'object' ? origin : { lat: 12.9716, lng: 77.5946 };
    const d = typeof destination === 'object' ? destination : { lat: 12.9856, lng: 77.6046 };
    const distance = Math.sqrt(Math.pow(d.lat - o.lat, 2) + Math.pow(d.lng - o.lng, 2)) * 111000;

    return {
      success: true,
      route: {
        polyline: 'encoded_polyline_here',
        distance: Math.round(distance),
        duration: Math.round(distance / 50000), // ~50km/h avg
        steps: [
          { instruction: 'Head north on Main St', distance: 500, duration: 60 },
          { instruction: 'Turn right onto Oak Ave', distance: 300, duration: 40 }
        ]
      }
    };
  }

  mockDistanceMatrix(origins, destinations, mode) {
    return {
      success: true,
      matrix: origins.map((o, i) => ({
        origin: o,
        distances: destinations.map((d, j) => ({
          destination: d,
          distance: Math.round(Math.random() * 20000) + 500,
          duration: Math.round(Math.random() * 1800) + 300,
          status: 'OK'
        }))
      }))
    };
  }
}

// ============================================
// MAPBOX INTEGRATION
// ============================================

class MapboxClient {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.baseUrl = CONFIG.mapbox.apiUrl;
  }

  async geocodingForward(address) {
    if (!CONFIG.mapbox.enabled) {
      return { success: true, features: [this.mockFeature(address)] };
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${this.accessToken}`
      );
      const data = await response.json();

      return {
        success: true,
        features: data.features.map(f => ({
          id: f.id,
          placeName: f.place_name,
          center: f.center,
          context: f.context
        }))
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async geocodingReverse(lng, lat) {
    if (!CONFIG.mapbox.enabled) {
      return { success: true, features: [this.mockFeature(`${lat}, ${lng}`)] };
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${this.accessToken}`
      );
      const data = await response.json();

      return {
        success: true,
        features: data.features
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async directions(coordinates, profile = 'driving') {
    if (!CONFIG.mapbox.enabled) {
      return this.mockDirections(coordinates);
    }

    try {
      const coordStr = coordinates.map(c => `${c.lng},${c.lat}`).join(';');
      const response = await fetch(
        `${this.baseUrl}/directions/v5/mapbox/${profile}/${coordStr}?access_token=${this.accessToken}&geometries=geojson`
      );
      const data = await response.json();

      if (data.routes) {
        return {
          success: true,
          routes: data.routes.map(r => ({
            distance: r.distance,
            duration: r.duration,
            geometry: r.geometry
          }))
        };
      }
      return { success: false, error: 'No routes found' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async mapMatching(coordinates) {
    if (!CONFIG.mapbox.enabled) {
      return { success: true, matchings: [{ confidence: 0.95 }] };
    }

    try {
      const coordStr = coordinates.map(c => `${c.lng},${c.lat}`).join(';');
      const response = await fetch(
        `${this.baseUrl}/matching/v5/mapbox/driving/${coordStr}?access_token=${this.accessToken}&geometries=geojson`
      );
      const data = await response.json();

      return {
        success: true,
        matchings: data.matchings.map(m => ({
          confidence: m.confidence,
          geometry: m.geometry,
          legs: m.legs
        }))
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  mockFeature(address) {
    return {
      id: `place_${uuidv4().slice(0, 8)}`,
      placeName: address,
      center: [77.5946, 12.9716]
    };
  }

  mockDirections(coordinates) {
    const totalDistance = coordinates.reduce((sum, c, i) => {
      if (i === 0) return 0;
      const prev = coordinates[i - 1];
      return sum + Math.sqrt(Math.pow(c.lat - prev.lat, 2) + Math.pow(c.lng - prev.lng, 2)) * 111000;
    }, 0);

    return {
      success: true,
      routes: [{
        distance: Math.round(totalDistance),
        duration: Math.round(totalDistance / 50000 * 3600),
        geometry: { type: 'LineString', coordinates: coordinates.map(c => [c.lng, c.lat]) }
      }]
    };
  }
}

// ============================================
// ROUTE OPTIMIZATION ENGINE
// ============================================

class RouteOptimizer {
  constructor() {
    this.googleMaps = new GoogleMapsClient(CONFIG.google.apiKey);
  }

  /**
   * Optimize delivery route for multiple stops
   */
  async optimizeDeliveryRoute(stops, options = {}) {
    const {
      startLocation = null,
      endLocation = null,
      vehicleCapacity = null,
      timeWindows = null,
      maxStopsPerRoute = 20
    } = options;

    if (stops.length <= 1) {
      return { success: true, routes: [{ stops, distance: 0, duration: 0 }] };
    }

    // Build distance matrix
    const allLocations = [];
    if (startLocation) allLocations.push(startLocation);
    allLocations.push(...stops.map(s => s.location));
    if (endLocation) allLocations.push(endLocation);

    const distances = [];
    const durations = [];

    for (let i = 0; i < allLocations.length; i++) {
      distances[i] = [];
      durations[i] = [];
      for (let j = 0; j < allLocations.length; j++) {
        if (i === j) {
          distances[i][j] = 0;
          durations[i][j] = 0;
        } else {
          const result = await this.googleMaps.directions(allLocations[i], allLocations[j]);
          distances[i][j] = result.route?.distance || 1000;
          durations[i][j] = result.route?.duration || 60;
        }
      }
    }

    // Nearest neighbor heuristic for simplicity
    const routes = this.nearestNeighborRoute(allLocations, distances, durations, {
      startLocation: startLocation ? 0 : null,
      endLocation: endLocation ? allLocations.length - 1 : null,
      maxStopsPerRoute
    });

    return {
      success: true,
      routes,
      totalDistance: routes.reduce((sum, r) => sum + r.distance, 0),
      totalDuration: routes.reduce((sum, r) => sum + r.duration, 0)
    };
  }

  nearestNeighborRoute(locations, distances, durations, options) {
    const { startLocation, endLocation, maxStopsPerRoute } = options;
    const routes = [];
    const unvisited = new Set();

    // Initialize unvisited (excluding start and end)
    for (let i = 0; i < locations.length; i++) {
      if (i !== startLocation && i !== endLocation) {
        unvisited.add(i);
      }
    }

    let currentRoute = [];
    let currentIndex = startLocation !== null ? startLocation : Array.from(unvisited)[0];
    if (currentIndex !== undefined && unvisited.has(currentIndex)) {
      unvisited.delete(currentIndex);
      currentRoute.push({ index: currentIndex, location: locations[currentIndex] });
    }

    while (unvisited.size > 0) {
      if (currentRoute.length >= maxStopsPerRoute) {
        // Start new route
        routes.push(this.buildRouteResult(currentRoute, locations, distances, durations));
        currentRoute = [];
        currentIndex = startLocation !== null ? startLocation : Array.from(unvisited)[0];
      }

      // Find nearest unvisited
      let nearest = null;
      let minDist = Infinity;

      for (const idx of unvisited) {
        if (distances[currentIndex][idx] < minDist) {
          minDist = distances[currentIndex][idx];
          nearest = idx;
        }
      }

      if (nearest !== null) {
        unvisited.delete(nearest);
        currentRoute.push({ index: nearest, location: locations[nearest] });
        currentIndex = nearest;
      }
    }

    if (currentRoute.length > 0) {
      routes.push(this.buildRouteResult(currentRoute, locations, distances, durations));
    }

    return routes;
  }

  buildRouteResult(routeStops, locations, distances, durations) {
    const stopIds = routeStops.map(s => s.index);
    let totalDistance = 0;
    let totalDuration = 0;

    for (let i = 0; i < stopIds.length - 1; i++) {
      totalDistance += distances[stopIds[i]][stopIds[i + 1]];
      totalDuration += durations[stopIds[i]][stopIds[i + 1]];
    }

    return {
      stops: routeStops.map(s => ({
        order: routeStops.indexOf(s) + 1,
        location: s.location,
        distanceFromPrevious: s.index > 0 ? distances[stopIds[routeStops.indexOf(s) - 1]][s.index] : 0,
        durationFromPrevious: s.index > 0 ? durations[stopIds[routeStops.indexOf(s) - 1]][s.index] : 0
      })),
      distance: totalDistance,
      duration: totalDuration
    };
  }

  /**
   * Calculate optimal zone assignments
   */
  async zoneAssignments(entities, zones, criteria = 'distance') {
    const assignments = [];

    for (const entity of entities) {
      let bestZone = null;
      let bestScore = Infinity;

      for (const zone of zones) {
        const center = zone.center;
        const distance = this.haversineDistance(
          entity.location.lat,
          entity.location.lng,
          center.lat,
          center.lng
        );

        if (distance < bestScore) {
          bestScore = distance;
          bestZone = { ...zone, distance };
        }
      }

      assignments.push({
        entity: entity.id,
        assignedZone: bestZone.id,
        distance: bestScore
      });
    }

    return { success: true, assignments };
  }

  haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

// ============================================
// GEOFENCING ENGINE
// ============================================

class GeofencingEngine {
  constructor() {
    this.routeOptimizer = new RouteOptimizer();
  }

  /**
   * Check if a point is inside a geofence
   */
  isInsideGeofence(point, geofence) {
    const { type, center, radius, coordinates } = geofence;

    if (type === 'circle') {
      const distance = this.routeOptimizer.haversineDistance(
        point.lat, point.lng,
        center.lat, center.lng
      );
      return distance <= radius;
    }

    if (type === 'polygon') {
      return this.pointInPolygon(point, coordinates);
    }

    return false;
  }

  pointInPolygon(point, polygon) {
    let inside = false;
    const x = point.lng, y = point.lat;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lng, yi = polygon[i].lat;
      const xj = polygon[j].lng, yj = polygon[j].lat;

      const intersect = ((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

      if (intersect) inside = !inside;
    }

    return inside;
  }

  /**
   * Check multiple entities against geofences
   */
  checkGeofences(entities, geofences) {
    const results = [];

    for (const entity of entities) {
      const triggeredGeofences = [];

      for (const geofence of geofences) {
        if (this.isInsideGeofence(entity.location, geofence)) {
          triggeredGeofences.push({
            geofenceId: geofence.id,
            name: geofence.name,
            type: geofence.type
          });
        }
      }

      results.push({
        entityId: entity.id,
        location: entity.location,
        insideGeofences: triggeredGeofences,
        timestamp: new Date().toISOString()
      });
    }

    return { success: true, results };
  }
}

// Initialize clients
const googleMaps = new GoogleMapsClient(CONFIG.google.apiKey);
const mapbox = new MapboxClient(CONFIG.mapbox.accessToken);
const routeOptimizer = new RouteOptimizer();
const geofencingEngine = new GeofencingEngine();

// ============================================
// API ENDPOINTS
// ============================================

/**
 * Geocoding
 */

// POST /api/geocode - Forward geocoding
app.post('/api/geocode', requireInternal, async (req, res) => {
  const { address, provider = 'google' } = req.body;

  if (!address) {
    return res.status(400).json({ error: 'address is required' });
  }

  const cacheKey = `geocode:${provider}:${address}`;
  const cached = geocaches.get(cacheKey);
  if (cached) {
    return res.json({ ...cached, cached: true });
  }

  let result;
  if (provider === 'mapbox') {
    result = await mapbox.geocodingForward(address);
  } else {
    result = await googleMaps.geocode(address);
  }

  if (result.success) {
    geocaches.set(cacheKey, result);
  }

  res.json(result);
});

// POST /api/reverse-geocode - Reverse geocoding
app.post('/api/reverse-geocode', requireInternal, async (req, res) => {
  const { lat, lng, provider = 'google' } = req.body;

  if (lat === undefined || lng === undefined) {
    return res.status(400).json({ error: 'lat and lng are required' });
  }

  let result;
  if (provider === 'mapbox') {
    result = await mapbox.geocodingReverse(lng, lat);
  } else {
    result = await googleMaps.reverseGeocode(lat, lng);
  }

  res.json(result);
});

/**
 * Places
 */

// POST /api/places/search - Search places
app.post('/api/places/search', requireInternal, async (req, res) => {
  const { query, location, radius = 5000, provider = 'google' } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'query is required' });
  }

  let result;
  if (provider === 'mapbox') {
    result = await mapbox.geocodingForward(query);
  } else {
    result = await googleMaps.placesSearch(query, location, radius);
  }

  res.json(result);
});

// GET /api/places/:placeId - Get place details
app.get('/api/places/:placeId', (req, res) => {
  const place = places.get(req.params.placeId);
  if (!place) {
    return res.json({
      success: true,
      place: {
        placeId: req.params.placeId,
        name: 'Sample Place',
        address: '123 Sample St',
        location: { lat: 12.9716, lng: 77.5946 },
        rating: 4.5
      }
    });
  }
  res.json({ success: true, place });
});

/**
 * Directions & Routing
 */

// POST /api/directions - Get directions
app.post('/api/directions', requireInternal, async (req, res) => {
  const { origin, destination, mode = 'DRIVING', provider = 'google' } = req.body;

  if (!origin || !destination) {
    return res.status(400).json({ error: 'origin and destination are required' });
  }

  let result;
  if (provider === 'mapbox') {
    const coords = [origin, destination];
    result = await mapbox.directions(coords, mode.toLowerCase());
  } else {
    result = await googleMaps.directions(origin, destination, mode);
  }

  res.json(result);
});

// POST /api/distance-matrix - Get distance matrix
app.post('/api/distance-matrix', requireInternal, async (req, res) => {
  const { origins, destinations, mode = 'DRIVING' } = req.body;

  if (!origins || !destinations) {
    return res.status(400).json({ error: 'origins and destinations are required' });
  }

  const result = await googleMaps.distanceMatrix(origins, destinations, mode);
  res.json(result);
});

/**
 * Route Optimization
 */

// POST /api/routes/optimize - Optimize delivery route
app.post('/api/routes/optimize', requireInternal, async (req, res) => {
  const { stops, options = {} } = req.body;

  if (!stops || stops.length === 0) {
    return res.status(400).json({ error: 'stops array is required' });
  }

  const result = await routeOptimizer.optimizeDeliveryRoute(stops, options);

  // Store route
  const routeId = uuidv4();
  routes.set(routeId, { id: routeId, ...result, createdAt: new Date().toISOString() });

  res.json({ ...result, routeId });
});

// GET /api/routes/:id - Get route details
app.get('/api/routes/:id', (req, res) => {
  const route = routes.get(req.params.id);
  if (!route) {
    return res.status(404).json({ error: 'Route not found' });
  }
  res.json({ success: true, route });
});

/**
 * Geofencing
 */

// POST /api/geofences - Create geofence
app.post('/api/geofences', requireInternal, (req, res) => {
  const { name, type, center, radius, coordinates, metadata = {} } = req.body;

  if (!name || !type) {
    return res.status(400).json({ error: 'name and type are required' });
  }

  if (type === 'circle' && (!center || !radius)) {
    return res.status(400).json({ error: 'center and radius required for circle type' });
  }

  if (type === 'polygon' && !coordinates) {
    return res.status(400).json({ error: 'coordinates required for polygon type' });
  }

  const geofenceId = uuidv4();
  const geofence = {
    id: geofenceId,
    name,
    type,
    center,
    radius,
    coordinates,
    metadata,
    createdAt: new Date().toISOString()
  };

  geofences.set(geofenceId, geofence);

  res.status(201).json({ success: true, geofence: { id: geofenceId, name, type } });
});

// GET /api/geofences - List geofences
app.get('/api/geofences', (req, res) => {
  const geofenceList = Array.from(geofences.values()).map(g => ({
    id: g.id,
    name: g.name,
    type: g.type,
    createdAt: g.createdAt
  }));
  res.json({ success: true, count: geofenceList.length, geofences: geofenceList });
});

// POST /api/geofences/check - Check entities against geofences
app.post('/api/geofences/check', requireInternal, (req, res) => {
  const { entities, geofenceIds } = req.body;

  if (!entities || !geofenceIds) {
    return res.status(400).json({ error: 'entities and geofenceIds are required' });
  }

  const selectedGeofences = geofenceIds.map(id => geofences.get(id)).filter(Boolean);
  const result = geofencingEngine.checkGeofences(entities, selectedGeofences);

  res.json(result);
});

/**
 * Elevation
 */

// POST /api/elevation - Get elevation for points
app.post('/api/elevation', requireInternal, async (req, res) => {
  const { latlngs } = req.body;

  if (!latlngs || latlngs.length === 0) {
    return res.status(400).json({ error: 'latlngs array is required' });
  }

  const result = await googleMaps.elevation(latlngs);
  res.json(result);
});

/**
 * Static Maps
 */

// GET /api/static-map - Generate static map URL
app.get('/api/static-map', (req, res) => {
  const {
    center = 'Bangalore',
    zoom = 14,
    size = '600x300',
    markers = [],
    path = null
  } = req.query;

  if (!CONFIG.google.enabled) {
    return res.json({
      success: true,
      url: `https://via.placeholder.com/${size}?text=Map+of+${encodeURIComponent(center)}`,
      provider: 'placeholder'
    });
  }

  let url = `${CONFIG.google.mapsUrl}/staticmap?center=${encodeURIComponent(center)}&zoom=${zoom}&size=${size}&key=${CONFIG.google.apiKey}`;

  // Add markers
  for (const marker of markers) {
    url += `&markers=color:red%7C${marker.lat},${marker.lng}`;
  }

  // Add path
  if (path) {
    url += `&path=color:0x0000ff80%7Cweight:5%7C${path}`;
  }

  res.json({ success: true, url, provider: 'google' });
});

/**
 * Health
 */

app.get('/health', (req, res) => {
  res.json({
    service: 'maps-os',
    status: 'healthy',
    version: '2.0.0',
    providers: {
      google: CONFIG.google.enabled,
      mapbox: CONFIG.mapbox.enabled,
      here: CONFIG.here.enabled
    },
    stats: {
      geocaches: geocaches.size,
      routes: routes.size,
      places: places.size,
      geofences: geofences.size
    }
  });
});

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║  MapsOS — PORT ${PORT}                              ║
║  Geospatial Services                          ║
╠══════════════════════════════════════════════════════╣
║  Providers:                                      ║
║    Google Maps: ${CONFIG.google.enabled ? '✅ Enabled' : '⚠️  Mock only'}
║    Mapbox: ${CONFIG.mapbox.enabled ? '✅ Enabled' : '⚠️  Mock only'}
║    HERE: ${CONFIG.here.enabled ? '✅ Enabled' : '⚠️  Mock only'}
╠══════════════════════════════════════════════════════╣
║  Endpoints:                                      ║
║    POST /api/geocode           (Forward)         ║
║    POST /api/reverse-geocode   (Reverse)         ║
║    POST /api/places/search     (Places)          ║
║    POST /api/directions        (Routing)          ║
║    POST /api/distance-matrix   (Matrix)          ║
║    POST /api/routes/optimize   (Optimization)    ║
║    POST /api/geofences/check  (Geofencing)      ║
╚══════════════════════════════════════════════════════╝
`);
});

export default app;
