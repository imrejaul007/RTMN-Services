# Personal Skill Wallet Service

**Port:** 4750  
**Type:** Observation Layer  
**Phase:** 2  
**Author:** HOJAI AI

---

## What This Service Does

The Personal Skill Wallet manages an employee's skills:
- Installed skills from BAM
- Skill compositions
- Certifications
- Favorites

---

## Key Endpoints

### Get Wallet
```
GET /api/wallet/:employeeId
```

### Get Stats
```
GET /api/wallet/:employeeId/stats
```

### Get Skills
```
GET /api/wallet/:employeeId/skills?status=active&source=bam
```

### Install Skill
```
POST /api/wallet/:employeeId/skills/install
Body: { skillId: string, name: string, source?: string, version?: string, parameters?: {} }
```

### Uninstall Skill
```
POST /api/wallet/:employeeId/skills/:skillId/uninstall
```

### Update Skill
```
PATCH /api/wallet/:employeeId/skills/:skillId
Body: { status?: string, parameters?: {} }
```

### Add to Favorites
```
POST /api/wallet/:employeeId/favorites/:skillId
```

### Create Composition
```
POST /api/wallet/:employeeId/compose
Body: { name: string, skills: [], purpose?: string }
```

### Get Compositions
```
GET /api/wallet/:employeeId/compositions
```

### Add Certification
```
POST /api/wallet/:employeeId/certifications
Body: { name: string, issuer?: string, expiresAt?: string }
```

### Get Recommendations
```
GET /api/wallet/:employeeId/recommendations
```

---

## Dependencies

| Service | Port | Purpose |
|---------|------|---------|
| BAM | 4250 | Skill marketplace |
| SkillOS | - | Skill library |

---

## Skill Sources

| Source | Description |
|--------|-------------|
| bam | BAM Marketplace |
| company | Company-provided |
| self | Self-created |

---

## Data Stored

- Installed skills
- Skill compositions
- Certifications
- Favorites
