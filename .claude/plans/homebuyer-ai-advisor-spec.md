# Homebuyer AI Advisor — Product Specification

**Version:** 1.0 | **Date:** June 28, 2026 | **Product:** P0 | **Build:** ₹30L / 5 weeks | **ARR:** ₹1.8Cr

---

## 1. Concept & Vision

**What it is:** Personalized AI assistant that helps homebuyers find their perfect property by understanding lifestyle, budget, future needs, and matching them with the right homes.

**What it does:**
- Conversational property discovery
- Personalized recommendations
- Budget optimization
- Neighborhood matching
- Life-stage planning

**The feeling:** Like having a knowledgeable friend who knows your life situation and helps you find the home that truly fits.

---

## 2. Problem Statement

- Homebuyers visit 15-20 properties before buying
- 60% regret their purchase within 2 years
- No consideration of future life changes
- Neighborhood fit is often overlooked
- Complex loan calculations cause confusion

---

## 3. Core Features

### 3.1 Conversational Discovery (P0)

**AI Chat Interface:**
```
User: "I need a 3BHK under 80 lakhs in Bangalore"
AI: "Great! I have some questions to find the perfect match:
     1. Do you have kids or planning soon?
     2. Work location? (I'll find nearby options)
     3. Priority: Good schools OR parks and greenery?
     4. Open to under-construction or need ready-to-move?"
```

**Conversation Flow:**
1. Budget & Family Profile
2. Location & Commute
3. Lifestyle & Priorities
4. Future Planning
5. Property Matching

### 3.2 Personalized Matching (P0)

**Matching Algorithm:**
```python
def match_properties(user_profile, properties):
    scores = []
    for prop in properties:
        score = 0
        
        # Budget fit (25%)
        if prop.price <= user.budget:
            score += 25 * (1 - (prop.price / user.budget))
        
        # Location fit (25%)
        score += 25 * calculate_commute_score(prop, user.office)
        
        # Lifestyle fit (25%)
        score += 25 * calculate_lifestyle_score(prop, user.preferences)
        
        # Future fit (25%)
        score += 25 * calculate_future_score(prop, user.life_stage)
        
        scores.append({'property': prop, 'score': score})
    
    return sorted(scores, key=lambda x: x['score'], reverse=True)
```

### 3.3 Budget Optimizer (P0)

**Features:**
- EMI calculator with different loan scenarios
- Total cost of ownership (registration, interiors, etc.)
- Affordability analysis
- Investment vs buy comparison
- Tax benefit calculator

**Calculator Output:**
```
Property Price: ₹75L
Loan Amount: ₹60L (80%)
Interest Rate: 8.5%
Tenure: 20 years

EMI: ₹52,183/month
Total Interest: ₹65.2L
Total Cost: ₹1.40Cr

Monthly Affordability: ₹65,000
Status: ✅ Comfortable

Tax Benefits (Year 1): ₹1.8L
Net Cost After Tax: ₹73.2L
```

### 3.4 Neighborhood Intelligence (P1)

**Data Points:**
- Schools (rating, distance)
- Hospitals (rating, specialty)
- Public transport (metro, bus)
- Shopping & entertainment
- Safety index
- Noise levels
- Future development plans

**Neighborhood Score:**
```
Whitefield, Bangalore
├── Schools ⭐⭐⭐⭐⭐ (4 within 3km)
├── Hospitals ⭐⭐⭐⭐ (2 multispecialty)
├── Metro ⭐⭐⭐⭐⭐ (0.5km to Whitefield Station)
├── Shopping ⭐⭐⭐⭐ (Forum Mall 2km)
├── Safety ⭐⭐⭐⭐ (Low crime area)
└── Overall Score: 92/100
```

### 3.5 Life Stage Planning (P1)

**Considerations:**
- Family growth (kids in 3-5 years)
- Work changes (remote/hybrid)
- Aging parents (accessibility needs)
- Investment horizon (5yr vs 15yr)
- School zone importance (timeline)

---

## 4. AI Assistant Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   HOMEBUYER AI ADVISOR                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────┐    ┌───────────────┐    ┌───────────────┐  │
│  │  CHATBOT      │───►│  PROFILE     │───►│  MATCHING    │  │
│  │  Interface    │    │  Builder     │    │  Engine      │  │
│  └───────────────┘    └───────────────┘    └───────┬───────┘  │
│                                                      │         │
│  ┌───────────────┐    ┌───────────────┐    ┌───────▼───────┐  │
│  │  DASHBOARD    │◄───│  PROPERTY    │◄───│  PERSONALIZED │  │
│  │  & TRACKING  │    │  DETAILS    │    │  RANKINGS    │  │
│  └───────────────┘    └───────────────┘    └───────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Data Model

```typescript
interface HomebuyerProfile {
  id: string;
  userId: string;
  
  // Family
  family: {
    members: number;
    children?: { age: number; school_needed?: Date }[];
    parents?: { living_with: boolean; care_needs?: string }[];
  };
  
  // Work
  work: {
    location: string;
    mode: 'office' | 'remote' | 'hybrid';
    commute_max_minutes: number;
    flexibility_years: number;
  };
  
  // Budget
  budget: {
    max: number;
    min: number;
    down_payment: number;
    emi_affordability: number;
    savings_for_interiors: number;
  };
  
  // Preferences
  preferences: {
    property_types: ('apartment' | 'villa' | 'plot')[];
    bedrooms: number[];
    localities: string[];
    amenities: string[];
    facing?: string;
    floor_preference?: 'low' | 'mid' | 'high' | 'any';
  };
  
  // Life Stage
  life_stage: {
    current: 'single' | 'couple' | 'family' | 'extended';
    planning_horizon: number;  // years
    investment_purpose: 'self-use' | 'investment' | 'both';
    exit_timeline?: number;
  };
  
  // Matched Properties
  matched_properties: MatchedProperty[];
  
  createdAt: Date;
  updatedAt: Date;
}

interface MatchedProperty {
  propertyId: string;
  match_score: number;
  match_reasons: string[];
  concern_flags: string[];
  compared_to_profile: {
    budget_fit: 'excellent' | 'good' | 'tight' | 'over';
    commute_fit: number;  // minutes
    schools_fit: 'excellent' | 'adequate' | 'limited';
  };
}
```

---

## 6. API Endpoints

```typescript
// Profile
POST   /api/profiles                    // Create profile
GET    /api/profiles/:id               // Get profile
PUT    /api/profiles/:id               // Update profile
DELETE /api/profiles/:id               // Delete profile

// Chat/Conversation
POST   /api/chat/message               // Send message
GET    /api/chat/:profileId/history   // Get chat history

// Matching
POST   /api/match                     // Match properties
GET    /api/match/:profileId/properties // Get matches
POST   /api/match/:profileId/:propertyId/feedback // Like/dislike

// Budget
POST   /api/budget/calculate           // Calculate affordability
POST   /api/budget/optimize           // Optimize budget allocation

// Neighborhood
GET    /api/neighborhoods/:locality   // Get neighborhood data
POST   /api/neighborhoods/compare     // Compare neighborhoods

// Properties
POST   /api/properties/analyze        // Analyze single property
GET    /api/properties/:id/comparison // Compare with profile
```

---

## 7. Pricing

| Tier | Price | Features |
|------|-------|----------|
| Free | ₹0 | 3 property matches, basic calculator |
| Plus | ₹299/mo | Unlimited matches, neighborhood intel |
| Premium | ₹999/mo | Expert consultation, loan assistance |

---

## 8. Success Metrics

| Metric | Target |
|--------|--------|
| Match accuracy | 85%+ |
| Properties visited before decision | -50% |
| Customer satisfaction | NPS 60+ |
| Conversion rate | 15%+ |

---

*Spec created: June 28, 2026*
