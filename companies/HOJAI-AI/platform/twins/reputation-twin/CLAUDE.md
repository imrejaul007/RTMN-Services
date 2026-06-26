# Reputation Twin Service

**Port:** 4745  
**Type:** Core Twin  
**Phase:** 1  
**Author:** HOJAI AI

---

## What This Service Does

The Reputation Twin tracks reputation and trust:
- Reviews and ratings
- Trust scores
- Badges and achievements

---

## Key Endpoints

### Get Reputation Profile
```
GET /api/twin/:employeeId/reputation
```

### Add Review
```
POST /api/twin/:employeeId/reputation/reviews
Body: {
  reviewerId: string,
  type: "performance" | "peer" | "customer" | "360",
  rating: number,
  strengths?: [],
  improvements?: [],
  comment?: string
}
```

### Get Reviews
```
GET /api/twin/:employeeId/reputation/reviews?type=peer&limit=20
```

### Award Badge
```
POST /api/twin/:employeeId/reputation/badges
Body: { name: string, description?: string, icon?: string, tier?: "bronze" | "silver" | "gold" | "platinum" }
```

### Get Badges
```
GET /api/twin/:employeeId/reputation/badges
```

### Get Stats
```
GET /api/twin/:employeeId/reputation/stats
```

---

## Dependencies

| Service | Port | Purpose |
|---------|------|---------|
| Customer Success OS | 4050 | Feedback data |
| HRMS | 5077 | Performance data |

---

## Data Stored

- Reviews (performance, peer, customer, 360)
- Trust scores
- Badges and achievements
- Trust trends
