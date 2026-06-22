# HOJAI GYM & FITNESS OS
## Product Documentation

**Version:** 1.0.0
**Date:** June 3, 2026
**Built from:** REZ-Merchant, REZ-intent-graph, hojai-voice-os

---

## WHAT IS HOJAI GYM & FITNESS OS?

HOJAI Gym & Fitness OS is an AI-powered fitness management system that helps gyms, fitness centers, and studios manage members, schedule classes, track attendance, and engage members with personalized fitness and nutrition guidance.

**Target Customers:**
- Commercial gyms (Snap Fitness, Gold's Gym style)
- Boutique fitness studios (CrossFit, Yoga, Pilates)
- Personal training studios
- Corporate fitness centers
- Hotel gyms

---

## PRODUCTS

### 1. Hojai Gym AI (Core)

**Services:**
- Member Management
- Class Scheduling
- Attendance Tracking
- Membership Plans

**AI Employees:**
- Membership Advisor - Recommends plans, handles renewals
- Fitness Coach - Creates workout plans, tracks progress
- Nutrition Advisor - Diet plans, macros, meal suggestions
- Retention Manager - Predicts churn, runs campaigns

### 2. Hojai Fitness Studio

**Services:**
- Trainer Management
- Class Booking System
- Equipment Tracking
- Performance Analytics

**AI Employees:**
- Class Scheduler - Optimal class scheduling
- Trainer Matcher - Matches members to trainers

---

## SERVICES

### Member Service
```
Port: 4801
Features:
- Member registration
- Profile management
- Membership tracking
- Check-in/out
- Emergency contacts
- Analytics
```

### Class Scheduler Service
```
Port: 4802
Features:
- Class creation (Yoga, HIIT, Zumba, etc.)
- Trainer assignment
- Capacity management
- Booking system
- Weekly schedule
```

### Attendance Service
```
Port: 4803
Features:
- Manual check-in
- Class check-in
- Daily/weekly stats
- Hourly breakdown
- Member history
```

### Membership Plan Service
```
Port: 4804
Features:
- Plan management
- Pricing tiers
- Renewal calculation
- Freeze/pause options
```

---

## AI EMPLOYEES

### Membership Advisor
```
Role: Sales & retention
Skills: Plan recommendations, renewals, upgrades
Channels: WhatsApp, App, In-person
```

### Fitness Coach
```
Role: Workout planning
Skills: Custom plans, progress tracking, motivation
Integration: Member profiles, attendance
```

### Nutrition Advisor
```
Role: Diet planning
Skills: Macros calculation, meal plans, restrictions
Integration: Member goals
```

### Retention Manager
```
Role: Churn prevention
Skills: Risk analysis, campaigns, win-back
Integration: Attendance, CRM
```

---

## FEATURES

### Member Experience
- [x] Digital membership cards
- [x] WhatsApp check-in
- [x] Voice check-in
- [x] Class booking via WhatsApp
- [x] Personalized workout plans
- [x] Diet recommendations
- [x] Attendance reminders
- [x] Renewal notifications

### Operations
- [x] Multi-plan membership
- [x] Trainer management
- [x] Class scheduling
- [x] Capacity management
- [x] Equipment tracking
- [x] Daily stats dashboard

### AI & Analytics
- [x] Churn prediction
- [x] Re-engagement campaigns
- [x] Personalized recommendations
- [x] Attendance analytics
- [x] Peak hour analysis
- [x] Member lifetime value

---

## MEMBERSHIP PLANS

| Plan | Price | Features |
|------|-------|----------|
| **Basic** | ₹999/mo | Gym access, basic equipment |
| **Premium** | ₹1,999/mo | + Classes (4/week), guest passes, locker |
| **Elite** | ₹3,999/mo | + Unlimited classes, PT (2/month), spa |

---

## COMPETITORS

| Feature | HOJAI | GymOS | FitnessBuilder | Mindbody |
|---------|-------|-------|----------------|----------|
| AI Fitness Coach | ✅ | ❌ | ❌ | ❌ |
| AI Nutrition Advisor | ✅ | ❌ | ❌ | ❌ |
| Churn Prediction | ✅ | ❌ | ❌ | ❌ |
| WhatsApp Booking | ✅ | ❌ | ❌ | ❌ |
| Voice Check-in | ✅ | ❌ | ❌ | ❌ |
| Multi-location | ✅ | ✅ | ✅ | ✅ |

---

## INTEGRATIONS

### Already Built
- RABTUL Auth
- RABTUL Payments
- RABTUL Notifications
- WhatsApp Business API
- hojai-voice-os (Voice AI)

### Coming Soon
- Fitbit
- Apple Health
- Strava
- Wearable devices

---

## PRICING

| Plan | Price | Target |
|------|-------|--------|
| **Starter** | ₹2,999/mo | Single location, <200 members |
| **Professional** | ₹7,999/mo | Multi-location, <1000 members |
| **Enterprise** | ₹19,999/mo | Chains, unlimited |

---

## GETTING STARTED

### Step 1: Setup
```
1. Add gym details
2. Configure membership plans
3. Set working hours
4. Add trainers
```

### Step 2: Configure Classes
```
1. Create class types
2. Set schedules
3. Assign trainers
4. Set capacities
```

### Step 3: Onboard Members
```
1. Import or add members
2. Assign plans
3. Train staff on WhatsApp
```

### Step 4: Launch AI
```
1. Enable Fitness Coach
2. Enable Retention Manager
3. Configure notifications
```

---

**Last Updated:** June 3, 2026
