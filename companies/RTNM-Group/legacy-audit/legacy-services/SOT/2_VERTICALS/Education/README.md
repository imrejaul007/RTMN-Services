# EDUCATION VERTICAL - Complete Documentation

**Date:** May 11, 2026  
**Version:** 1.0

---

## OVERVIEW

Education vertical covers courses, training, and learning management across the ReZ platform.

---

## SERVICES

| Service | Path | Purpose |
|---------|------|---------|
| Course Platform | `rez-course-service/` | Course management |
| Training | `rez-training-service/` | Corporate training |
| Certification | Built into courses | Credentials |

---

## FEATURES

| Feature | Description |
|---------|-------------|
| Course Catalog | Browse courses |
| Video Lessons | On-demand content |
| Quizzes | Assessment |
| Certificates | Completion credentials |
| Progress Tracking | Learning path |
| Live Classes | Real-time sessions |
| Discussion Forums | Community learning |

---

## COURSE TYPES

| Type | Description |
|------|-------------|
| Video Courses | Self-paced learning |
| Live Classes | Instructor-led |
| Workshops | Hands-on training |
| Certifications | Professional creds |
| Corporate Training | B2B courses |

---

## API ENDPOINTS

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /api/courses | List courses |
| POST | /api/courses | Create course |
| GET | /api/courses/:id | Course details |
| POST | /api/enroll | Enroll student |
| GET | /api/progress | Track progress |

---

## INTEGRATION POINTS

| Service | Connection |
|---------|------------|
| `rez-auth-service` | Student authentication |
| `rez-payment-service` | Course payments |
| `REZ Mind` | Course recommendations |
| `rez-notifications` | Learning reminders |

---

**Last Updated:** May 11, 2026
