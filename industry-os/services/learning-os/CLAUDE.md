# RTMN Learning OS

**Version:** 1.0  
**Port:** 5068  
**Status:** Phase 3 - Building  
**Parent:** RTMN Workforce OS  

---

## Overview

Learning OS provides:
- Learning Management System (LMS)
- Skills Graph
- Course Catalog
- Certifications
- AI Learning Coach
- Compliance Training

---

## Features

### Core LMS
- Course catalog
- Enrollments
- Progress tracking
- Assessments
- Certifications
- Learning paths

### Skills
- Skills assessment
- Skills gap analysis
- Skill graph visualization
- Certification tracking

### AI
- Learning recommendations
- Skills gap identification
- Personalized paths
- Progress predictions

---

## API Endpoints

### Courses
```
GET    /api/courses                - List courses
POST   /api/courses               - Create course
GET    /api/courses/:id           - Course details
POST   /api/courses/:id/enroll    - Enroll
```

### Learning
```
GET    /api/learning/:employeeId  - My learning
POST   /api/learning/complete     - Mark complete
GET    /api/learning/paths        - Learning paths
```

### Skills
```
GET    /api/skills/graph          - Skills graph
GET    /api/skills/:employeeId   - Employee skills
POST   /api/skills/assess        - Self-assessment
GET    /api/skills/gap/:deptId   - Dept skill gap
```

### Certifications
```
GET    /api/certifications        - All certs
GET    /api/certifications/:empId - Employee certs
POST   /api/certifications        - Add cert
```

---

*Last Updated: June 17, 2026*
