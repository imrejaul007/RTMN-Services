# Menu QR Backend API Documentation

This document describes the backend API endpoints for the Menu QR feature, including dietary preferences, menu recommendations, taste profiles, weather-based suggestions, and bill splitting.

## Table of Contents

- [Architecture](#architecture)
- [Base URLs](#base-urls)
- [Dietary Preferences API](#dietary-preferences-api)
- [Taste Profile API](#taste-profile-api)
- [Weather API](#weather-api)
- [Menu Recommendations API](#menu-recommendations-api)
- [Bill Split API](#bill-split-api)
- [Client Usage](#client-usage)

---

## Architecture

### Services

| Service | Port | Description |
|---------|------|-------------|
| `rez-catalog-service` | 3005 | Products, categories, dietary preferences, taste profiles, recommendations |
| `rez-order-service` | 3006 | Orders, bill splits |
| `rez-recommendation-engine` | 4017 | ML-based recommendations (legacy) |

### Data Flow

```
Client (rez-now)
    │
    ├─► rez-catalog-service (3005)
    │       ├─ Dietary Preferences
    │       ├─ Taste Profiles
    │       ├─ Weather Cache
    │       └─ Menu Recommendations
    │
    └─► rez-order-service (3006)
            └─ Bill Splits
```

---

## Base URLs

| Environment | Base URL |
|-------------|----------|
| Production | `https://api.rez.money` |
| Staging | `https://api-staging.rez.money` |
| Development | `http://localhost:3005` (catalog) / `http://localhost:3006` (orders) |

---

## Dietary Preferences API

Stores user dietary preferences and allergies for personalized menu recommendations.

### Models

#### `DietaryPreferences`
```typescript
interface DietaryPreferences {
  userId: string;
  vegan: boolean;
  vegetarian: boolean;
  glutenFree: boolean;
  nutFree: boolean;
  dairyFree: boolean;
  halal: boolean;
  kosher: boolean;
  jain: boolean;
  allergies: string[];
  dislikes: string[];
  preferredCuisines: string[];
  spiceTolerance: number; // 1-5
  createdAt: Date;
  updatedAt: Date;
}
```

### Endpoints

#### GET /dietary-preferences/:userId
Get dietary preferences for a user.

**Request:**
```http
GET /dietary-preferences/user123
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "user123",
    "vegan": false,
    "vegetarian": true,
    "glutenFree": false,
    "nutFree": true,
    "dairyFree": false,
    "halal": false,
    "kosher": false,
    "jain": false,
    "allergies": ["shellfish", "peanuts"],
    "dislikes": ["coriander"],
    "preferredCuisines": ["Indian", "Italian"],
    "spiceTolerance": 3,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-20T14:22:00Z"
  }
}
```

#### PUT /dietary-preferences/:userId
Replace dietary preferences (full update).

**Request:**
```http
PUT /dietary-preferences/user123
Content-Type: application/json

{
  "vegan": true,
  "vegetarian": false,
  "allergies": ["peanuts"],
  "spiceTolerance": 4
}
```

#### PATCH /dietary-preferences/:userId
Partial update of dietary preferences.

**Request:**
```json
{
  "allergies": ["peanuts", "tree_nuts"]
}
```

#### POST /dietary-preferences/:userId/allergies
Add an allergy to preferences.

**Request:**
```json
{
  "allergy": "soy"
}
```

#### DELETE /dietary-preferences/:userId/allergies/:allergy
Remove an allergy from preferences.

#### POST /dietary-preferences/:userId/dislikes
Add a dislike (item to exclude from recommendations).

**Request:**
```json
{
  "item": "coriander"
}
```

---

## Taste Profile API

Stores user taste preferences and learns from order history.

### Models

#### `TasteProfile`
```typescript
interface TasteProfile {
  userId: string;
  spiceTolerance: number; // 1-5
  preferredCuisines: string[];
  avgOrderValue: number; // in paise
  orderingFrequency: 'daily' | 'weekly' | 'monthly' | 'occasional';
  preferredPortionSize: 'small' | 'medium' | 'large' | 'sharing';
  tipPercentage: number;
  dietaryRestrictions: string[];
  totalOrders: number;
  totalSpent: number;
  favoriteCategories: string[];
  favoriteItems: string[];
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Endpoints

#### GET /taste-profile/:userId
Get taste profile for a user.

#### PUT /taste-profile/:userId
Replace taste profile (full update).

**Request:**
```json
{
  "spiceTolerance": 4,
  "preferredCuisines": ["Indian", "Chinese"],
  "preferredPortionSize": "large",
  "tipPercentage": 15
}
```

#### PATCH /taste-profile/:userId
Partial update of taste profile.

#### POST /taste-profile/learn
Learn from order feedback to improve taste profile.

**Request:**
```json
{
  "userId": "user123",
  "items": [
    { "itemId": "item1", "name": "Biryani", "category": "biryani", "price": 25000 },
    { "itemId": "item2", "name": "Raita", "category": "sides", "price": 5000 }
  ],
  "total": 30000,
  "tip": 3000
}
```

---

## Weather API

Integrates with Open-Meteo API (free, no API key required) for weather-based food recommendations.

### Models

#### `WeatherCache`
```typescript
interface WeatherCache {
  locationKey: string; // "lat_lng" rounded to 2 decimals
  temperature: number;
  condition: 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'snowy' | 'hot' | 'cold' | 'mild';
  humidity: number;
  description: string;
  isComfortable: boolean; // 18-25C
  fetchedAt: Date;
  expiresAt: Date; // TTL: 30 minutes
}
```

### Endpoints

#### GET /weather
Get weather and food recommendations for a location.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| lat | number | Yes | Latitude (-90 to 90) |
| lng | number | Yes | Longitude (-180 to 180) |

**Request:**
```http
GET /weather?lat=28.61&lng=77.21
```

**Response:**
```json
{
  "success": true,
  "data": {
    "weather": {
      "locationKey": "28.61_77.21",
      "temperature": 32,
      "condition": "hot",
      "humidity": 65,
      "description": "Clear sky",
      "isComfortable": false,
      "fetchedAt": "2024-01-20T14:00:00Z",
      "expiresAt": "2024-01-20T14:30:00Z"
    },
    "recommendations": {
      "recommendedCategories": ["beverages", "salads", "ice cream", "cold dishes"],
      "recommendedItems": ["Lassi", "Buttermilk", "Cold Coffee"],
      "beverages": ["Iced Tea", "Cold Coffee", "Lassi"],
      "reason": "It's 32C outside! Stay cool with refreshing drinks and light meals."
    }
  }
}
```

---

## Menu Recommendations API

Personalized menu item recommendations based on user preferences, context, and behavior.

### Endpoints

#### POST /recommendations/menu
Get personalized menu recommendations.

**Request:**
```json
{
  "storeId": "store123",
  "userId": "user123",
  "cartItems": ["item1", "item2"],
  "dietaryFilters": ["vegetarian"],
  "timeOfDay": "lunch",
  "latitude": 28.61,
  "longitude": 77.21,
  "limit": 10
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| storeId | string | Yes | Store identifier |
| userId | string | No | User for personalization |
| cartItems | string[] | No | Items in cart for pairing |
| dietaryFilters | string[] | No | Additional filters (vegan, gluten-free, etc.) |
| timeOfDay | string | Yes | breakfast, lunch, dinner, late_night |
| latitude | number | No | For weather-based recommendations |
| longitude | number | No | For weather-based recommendations |
| limit | number | No | Max results (default: 10) |

**Response:**
```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "item": {
          "_id": "item123",
          "name": "Paneer Butter Masala",
          "description": "Creamy tomato gravy with cottage cheese",
          "price": 22000,
          "category": "main_course",
          "dietary": { "isVegetarian": true },
          "spicyLevel": 2
        },
        "score": 0.85,
        "reason": "Matches your dietary preferences",
        "category": "main_course"
      }
    ],
    "weatherContext": {
      "condition": "hot",
      "temperature": 32,
      "recommendation": "It's 32C outside! Stay cool with refreshing drinks and light meals."
    },
    "timeContext": "Midday meals to power through your day",
    "personalizedAt": "2024-01-20T14:22:00Z"
  }
}
```

#### GET /recommendations/similar/:itemId
Get similar items to a given product.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | number | 5 | Max similar items |

#### GET /recommendations/trending/:storeId
Get trending items for a store.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | number | 10 | Max trending items |

---

## Bill Split API

Split bills among multiple people at the table.

### Models

#### `BillSplit`
```typescript
interface BillSplit {
  _id: string;
  orderId: string;
  storeId: string;
  totalAmount: number; // in paise
  splits: Array<{
    personId: string;
    personName?: string;
    itemIds: string[];
    itemTotal: number;
    sharePercent: number;
    amount: number;
    settled: boolean;
    settledAt?: Date;
  }>;
  status: 'pending' | 'partial' | 'settled';
  createdAt: Date;
  updatedAt: Date;
}
```

### Endpoints

#### POST /orders/:id/split
Create a bill split for an order.

**Request:**
```json
{
  "splits": [
    {
      "personId": "person1",
      "personName": "John",
      "itemIds": ["item1", "item2"]
    },
    {
      "personId": "person2",
      "personName": "Jane",
      "itemIds": ["item3"]
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "split123",
    "orderId": "order456",
    "storeId": "store123",
    "totalAmount": 50000,
    "splits": [
      {
        "personId": "person1",
        "personName": "John",
        "itemIds": ["item1", "item2"],
        "itemTotal": 30000,
        "sharePercent": 60,
        "amount": 30000,
        "settled": false
      },
      {
        "personId": "person2",
        "personName": "Jane",
        "itemIds": ["item3"],
        "itemTotal": 20000,
        "sharePercent": 40,
        "amount": 20000,
        "settled": false
      }
    ],
    "status": "pending",
    "createdAt": "2024-01-20T14:22:00Z",
    "updatedAt": "2024-01-20T14:22:00Z"
  }
}
```

#### GET /orders/:id/splits
Get bill split details for an order.

#### GET /orders/:id/splits/summary
Get per-person amount summary.

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "order456",
    "totalAmount": 50000,
    "splitCount": 2,
    "status": "partial",
    "perPerson": [
      {
        "personId": "person1",
        "personName": "John",
        "amount": 30000,
        "sharePercent": 60,
        "settled": true,
        "settledAt": "2024-01-20T14:30:00Z"
      },
      {
        "personId": "person2",
        "personName": "Jane",
        "amount": 20000,
        "sharePercent": 40,
        "settled": false
      }
    ],
    "remaining": 1,
    "settledAmount": 30000
  }
}
```

#### PATCH /orders/:id/splits/:personId/settle
Mark a person's share as settled.

---

## Client Usage

### rez-now API Client

Import the client modules:

```typescript
// Recommendations
import {
  getMenuRecommendations,
  getSimilarItems,
  getTrendingItems,
  getTimeOfDay
} from '@/lib/api/recommendations';

// User Preferences
import {
  getDietaryPreferences,
  updateDietaryPreferences,
  getTasteProfile,
  submitOrderFeedback
} from '@/lib/api/userPreferences';

// Weather
import { getWeatherRecommendations } from '@/lib/api/userPreferences';

// Bill Split
import {
  createBillSplit,
  getBillSplitSummary,
  settleBillSplit
} from '@/lib/api/billSplit';
```

### Example: Get Menu Recommendations

```typescript
import { getMenuRecommendations, getTimeOfDay } from '@/lib/api/recommendations';

// Get recommendations with location
const recommendations = await getMenuRecommendations('store123', {
  userId: 'user123',
  timeOfDay: getTimeOfDay(), // Automatically detects time of day
  latitude: 28.61,
  longitude: 77.21,
  limit: 10
});

console.log(recommendations.recommendations);
```

### Example: Create Bill Split

```typescript
import { createBillSplit, getBillSplitSummary } from '@/lib/api/billSplit';

// Create split
const split = await createBillSplit('order123', [
  { personId: 'p1', personName: 'John', itemIds: ['i1', 'i2'] },
  { personId: 'p2', personName: 'Jane', itemIds: ['i3'] }
]);

// Get summary
const summary = await getBillSplitSummary('order123');
console.log(`${summary.perPerson[0].personName}: Rs.${summary.perPerson[0].amount / 100}`);
```

### Example: Update Dietary Preferences

```typescript
import { updateDietaryPreferences } from '@/lib/api/userPreferences';

await updateDietaryPreferences('user123', {
  vegetarian: true,
  allergies: ['peanuts', 'shellfish'],
  spiceTolerance: 3
});
```

---

## Error Handling

All API endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "ERROR_CODE"
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing/invalid token |
| 403 | Forbidden - Access denied |
| 404 | Not Found |
| 409 | Conflict - Duplicate resource |
| 422 | Unprocessable Entity - Validation error |
| 429 | Too Many Requests - Rate limited |
| 500 | Internal Server Error |

---

## Rate Limiting

Public endpoints are rate limited:
- **Catalog endpoints**: 100 requests/minute per IP
- **Order endpoints**: 200 requests/minute per IP
- **Weather endpoints**: 30 requests/minute per IP

---

## Notes

- All monetary amounts are in **paise** (1 INR = 100 paise)
- Dates are in **ISO 8601 format**
- All endpoints require authentication unless marked as public
- Weather data is cached for 30 minutes per location
- Recommendation scores are between 0 and 1
