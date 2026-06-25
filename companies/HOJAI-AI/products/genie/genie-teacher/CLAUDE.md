# Genie Teacher Agent (D1)

> **"Your personal AI tutor. Real courses. Real lessons. Real progress."**
>
> Real LMS replacing the 73-LOC `genie-learning-os` stub. Powers the Teacher Agent in the 13-agent Genie vision.

**Service:** `genie-teacher`
**Port:** 4739
**Package name:** `@rtmn/genie-teacher`
**Status:** ✅ Built (D1, 2026-06-25). 25 readiness tests pass + 20 smoke checks.

---

## What It Does

Solves the **stub-Teacher problem**. The 13-agent Genie vision calls for a Teacher Agent that runs a real LMS — courses, lessons, quizzes, progress. The old `genie-learning-os` was 73 lines and didn't have any of that. This service is the real implementation.

### Modules

1. **Courses** — catalog with category (language / business / skill / wellness / creative / finance), level (beginner/intermediate/advanced), duration, tags
2. **Lessons** — ordered lessons within a course, each with body text + quiz (multi-choice with answer index)
3. **Enrollments** — user ↔ course, idempotent
4. **Progress** — per-lesson completion with score (0-100), aggregated into dashboard
5. **Learning dashboard** — `/users/:userId/learning` returns enrollments + lesson progress + average score + % complete

---

## Endpoints

```
GET    /health
GET    /                                            — service banner

GET    /courses                                     — list (?category, ?level)
GET    /courses/:courseId                           — detail + lessons (sorted by order)
POST   /courses                                     — create course (admin)
GET    /courses/:courseId/lessons                   — lessons in order

GET    /lessons/:lessonId                           — lesson detail + quiz
POST   /lessons/:lessonId/complete/:userId          — mark complete (?score=0-100)

POST   /courses/:courseId/enroll/:userId            — idempotent enroll
GET    /courses/:courseId/enroll/:userId            — enrollment status

GET    /users/:userId/learning                      — dashboard
```

---

## Seed Data

3 courses × 3 lessons = 9 lessons:

| Course | Category | Level | Lessons |
|---|---|---|---|
| Spanish for Travel | language | beginner | Greetings & basics / Directions / Food & restaurants |
| Negotiation Mastery | business | intermediate | BATNA / Anchoring / Principled negotiation |
| Python for Non-Coders | skill | beginner | Variables & print / If statements / Loops |

Each lesson has a multi-choice quiz with answer index. `user-001` is pre-enrolled in Spanish with 1 lesson (Greetings) completed at 100%.

---

## Tests

### `tests/teacher-readiness.test.mjs` — 25/25 pass
Covers:
- Health + readiness + auth
- Courses: list / filter / detail / create / validation
- Lessons: list / get / 404 / complete with score / default score
- Enrollments: new / idempotent / status check / not-enrolled / 404
- Learning dashboard: returns progress + percentage

### `tests/smoke.sh` — 20/20 pass

Run:
```bash
npm test
JWT_SECRET=test INTERNAL_SERVICE_TOKEN=t node src/index.js &
bash tests/smoke.sh
```

---

## How It Fits

- **D1 of the Phase D Agent-Gaps roadmap** — fills the missing **Teacher Agent** in the 13-agent Genie vision.
- Pairs with **Personal AI Team (C5)** — your Tutor can be a hired team member who pulls lessons from this service.
- Pairs with **Memory Inbox / Personal Twin (C2)** — completed lessons feed your personal twin ("user completed Negotiation Mastery").

---

## Web UI

`/teacher` route in the Genie PWA → `TeacherScreen.tsx` with 3 tabs:
- **Browse** — course catalog (filter by category)
- **My Learning** — enrolled courses with progress %
- **Lesson** — read body + take quiz + mark complete

Accessible from `MeTab` → "Teacher" card.

---

*Built as part of Phase D (Agent Gaps) of the 40-feature Genie vision.*