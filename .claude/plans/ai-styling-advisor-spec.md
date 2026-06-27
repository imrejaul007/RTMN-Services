# AI Styling Advisor — Product Specification

**Version:** 1.0 | **Date:** June 28, 2026 | **Product:** P1 | **Build:** ₹25L / 5 weeks | **ARR:** ₹1.5Cr

---

## 1. Concept & Vision

AI-powered styling advisor analyzing face shape, skin tone, and hair type to recommend personalized haircuts, colors, and treatments for salons and consumers.

---

## 2. Core Features

### 2.1 Face Shape Analysis (P0)
```python
def analyze_face(image):
    landmarks = detect_facial_landmarks(image)
    ratios = calculate_facial_ratios(landmarks)
    face_shape = classify_face_shape(ratios)
    return {
        'shape': face_shape,  # oval, round, square, heart, etc.
        'landmarks': landmarks,
        'confidence': calculate_confidence(ratios)
    }
```

### 2.2 Skin Analysis (P0)
- Skin tone detection (undertone analysis)
- Skin type classification
- Hair texture analysis
- Scalp health assessment

### 2.3 Personalized Recommendations (P0)
- Hairstyle recommendations by face shape
- Color recommendations by skin tone
- Treatment recommendations by skin type
- Product recommendations

### 2.4 Before/After Simulation (P1)
- Virtual hair color try-on
- Virtual haircut simulation
- Style comparison

---

## 3. API Endpoints

```
POST /api/analyze/face
POST /api/analyze/skin
POST /api/recommendations/style
POST /api/recommendations/color
POST /api/simulation/before-after
```

---

*Spec created: June 28, 2026*
