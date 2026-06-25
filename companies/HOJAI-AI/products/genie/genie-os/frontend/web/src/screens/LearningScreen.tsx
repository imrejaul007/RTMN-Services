import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost, specialists } from '../services/api';

const USER_ID = 'user-001';

interface Course {
  id: string;
  title: string;
  description: string;
  instructor: string;
  duration: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  lessons: number;
  category: string;
  skills: string[];
  rating: number;
  students: number;
  modules: Array<{ title: string; lessons: number }>;
  enrolled?: boolean;
  enrollment?: {
    progress: number;
    completedLessons: string[];
    currentLesson: string | null;
    status: string;
  };
}

interface EnrolledCourse extends Course {
  enrollment: {
    progress: number;
    completedLessons: string[];
    currentLesson: string | null;
    status: string;
  };
}

type View = 'browse' | 'enrolled' | 'detail';

const DIFFICULTY_COLORS = {
  beginner: '#22c55e',
  intermediate: '#f59e0b',
  advanced: '#ef4444',
};

const DIFFICULTY_LABELS = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export default function LearningScreen() {
  const navigate = useNavigate();
  const [view, setView] = useState<View>('browse');
  const [catalog, setCatalog] = useState<Course[]>([]);
  const [featured, setFeatured] = useState<Course[]>([]);
  const [enrolled, setEnrolled] = useState<EnrolledCourse[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [detail, setDetail] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [catalogResult, feat, enr, cats] = await Promise.allSettled([
        apiGet<{ data: { courses: Course[]; count: number; categories: string[] } }>(
          `${specialists.lifeuni}/courses?userId=${USER_ID}&limit=20`
        ),
        apiGet<{ data: Course[] }>(`${specialists.lifeuni}/courses/featured/all`),
        apiGet<{ data: { courses: EnrolledCourse[]; count: number } }>(
          `${specialists.lifeuni}/courses/enrolled/${USER_ID}`
        ),
        apiGet<{ data: Array<{ id: string; name: string; courseCount: number }> }>(
          `${specialists.lifeuni}/courses/categories/all`
        ),
      ]);
      if (catalogResult.status === 'fulfilled') {
        const data = catalogResult.value.data;
        setCatalog(data?.courses || []);
        if (data?.categories && data.categories.length > 0) {
          setCategories(data.categories);
        }
      }
      if (feat.status === 'fulfilled') setFeatured(feat.value.data || []);
      if (enr.status === 'fulfilled') setEnrolled(enr.value.data?.courses || []);
      if (cats.status === 'fulfilled') {
        const catsData = cats.value.data || [];
        if (catsData.length > 0 && !Array.isArray(catsData[0])) {
          const catNames = catsData.map((c: any) => c.id || c);
          if (catalogResult.status !== 'fulfilled' || !catalogResult.value.data?.categories?.length) {
            setCategories(catNames);
          }
        }
      }
    } finally {
      setLoading(false);
    }
  }

  async function enroll(courseId: string) {
    await apiPost(`${specialists.lifeuni}/courses/${courseId}/enroll`, {
      userId: USER_ID,
      startImmediately: true,
    });
    load();
  }

  async function openDetail(course: Course) {
    setDetail(course);
    setView('detail');
  }

  const filteredCatalog = catalog.filter((c) => {
    if (selectedCategory && c.category !== selectedCategory) return false;
    if (selectedDifficulty && c.difficulty !== selectedDifficulty) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.skills.some((s) => s.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="screen">
      <div className="header">
        <button onClick={() => navigate('/')} className="back-btn">←</button>
        <h1>🎓 Life University</h1>
        <button
          onClick={() => setView('enrolled')}
          className="btn-secondary"
          style={{ fontSize: 12, padding: '6px 10px' }}
        >
          {enrolled.length > 0 ? `📚 ${enrolled.length}` : 'Enrolled'}
        </button>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, padding: '8px 16px', overflowX: 'auto' }}>
        {(['browse', 'enrolled', 'detail'] as View[]).map((v) => (
          <button
            key={v}
            onClick={() => { setView(v); setDetail(null); }}
            className={view === v ? 'btn' : 'btn-secondary'}
            style={{ fontSize: 11, padding: '6px 12px', flexShrink: 0, textTransform: 'capitalize' }}
          >
            {v === 'browse' ? 'Browse' : v === 'enrolled' ? `Enrolled (${enrolled.length})` : 'Course'}
          </button>
        ))}
      </div>

      {loading && <div className="loading">Loading…</div>}

      {/* === BROWSE === */}
      {!loading && view === 'browse' && (
        <div style={{ padding: '0 16px 16px' }}>
          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search courses, skills…"
              style={{ paddingLeft: 36, paddingRight: 12, paddingTop: 10, paddingBottom: 10, borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'white', fontSize: 14, width: '100%', boxSizing: 'border-box' }}
            />
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.5, fontSize: 14 }}>🔍</span>
          </div>

          {/* Category filter */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 8 }}>
            <button
              onClick={() => setSelectedCategory('')}
              className={!selectedCategory ? 'btn' : 'btn-secondary'}
              style={{ fontSize: 11, padding: '4px 10px', flexShrink: 0 }}
            >
              All
            </button>
            {[...new Set(catalog.map((c) => c.category))].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat === selectedCategory ? '' : cat)}
                className={selectedCategory === cat ? 'btn' : 'btn-secondary'}
                style={{ fontSize: 11, padding: '4px 10px', flexShrink: 0, textTransform: 'capitalize' }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Difficulty filter */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {['', 'beginner', 'intermediate', 'advanced'].map((d) => (
              <button
                key={d || 'all'}
                onClick={() => setSelectedDifficulty(d)}
                className={selectedDifficulty === d ? 'btn' : 'btn-secondary'}
                style={{
                  fontSize: 10, padding: '3px 8px', flexShrink: 0,
                  color: d && DIFFICULTY_COLORS[d as keyof typeof DIFFICULTY_COLORS],
                  borderColor: d && DIFFICULTY_COLORS[d as keyof typeof DIFFICULTY_COLORS],
                }}
              >
                {d ? DIFFICULTY_LABELS[d as keyof typeof DIFFICULTY_LABELS] : 'All Levels'}
              </button>
            ))}
          </div>

          {/* Featured */}
          {featured.length > 0 && !selectedCategory && !selectedDifficulty && !searchQuery && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>⭐ Featured Courses</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {featured.slice(0, 3).map((c) => (
                  <CourseCard key={c.id} course={c} onOpen={openDetail} onEnroll={enroll} compact />
                ))}
              </div>
            </div>
          )}

          {/* Catalog */}
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
            {selectedCategory || selectedDifficulty || searchQuery
              ? `${filteredCatalog.length} Results`
              : `All Courses (${filteredCatalog.length})`}
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {filteredCatalog.map((c) => (
              <CourseCard key={c.id} course={c} onOpen={openDetail} onEnroll={enroll} />
            ))}
          </div>
          {filteredCatalog.length === 0 && (
            <div className="empty">
              <div style={{ fontSize: 48 }}>🎓</div>
              <div style={{ marginTop: 12 }}>No courses found</div>
            </div>
          )}
        </div>
      )}

      {/* === ENROLLED === */}
      {!loading && view === 'enrolled' && (
        <div style={{ padding: '0 16px 16px' }}>
          {enrolled.length === 0 ? (
            <div className="empty">
              <div style={{ fontSize: 48 }}>📚</div>
              <div style={{ marginTop: 12 }}>No courses enrolled yet</div>
              <button className="btn" style={{ marginTop: 12 }} onClick={() => setView('browse')}>Browse Courses</button>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                Your Courses ({enrolled.length})
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                {enrolled.map((c) => {
                  const pct = c.enrollment?.progress || 0;
                  const remaining = c.lessons - (c.enrollment?.completedLessons?.length || 0);
                  return (
                    <div key={c.id} style={{ background: 'var(--surface-2)', borderRadius: 12, padding: 14, cursor: 'pointer', border: '1px solid var(--border)' }}
                      onClick={() => openDetail(c)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 700 }}>{c.title}</div>
                          <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>{c.instructor} · {c.duration}</div>
                          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                            <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: DIFFICULTY_COLORS[c.difficulty], color: 'white' }}>
                              {DIFFICULTY_LABELS[c.difficulty]}
                            </span>
                            <span style={{ fontSize: 10, opacity: 0.5 }}>{c.enrollment?.completedLessons?.length || 0}/{c.lessons} lessons</span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary)' }}>{pct}%</div>
                          {pct === 100 && <div style={{ fontSize: 10, color: 'var(--success)' }}>✅ Complete</div>}
                        </div>
                      </div>
                      <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, marginTop: 10, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? 'var(--success)' : 'var(--primary)', transition: 'width 0.3s' }} />
                      </div>
                      {pct < 100 && <div style={{ fontSize: 10, opacity: 0.5, marginTop: 4 }}>{remaining} lessons remaining</div>}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* === COURSE DETAIL === */}
      {!loading && view === 'detail' && detail && (
        <div style={{ padding: '0 16px 16px' }}>
          <button onClick={() => { setView('browse'); setDetail(null); }} className="btn-secondary" style={{ marginBottom: 12, fontSize: 12 }}>← Back</button>

          <div style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', borderRadius: 16, padding: 20, marginBottom: 12 }}>
            <div style={{ fontSize: 11, opacity: 0.8, textTransform: 'uppercase', letterSpacing: 1 }}>{detail.category}</div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{detail.title}</div>
            <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>by {detail.instructor}</div>
            <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
              <div><span style={{ opacity: 0.7 }}>⏱️</span> {detail.duration}</div>
              <div><span style={{ opacity: 0.7 }}>📖</span> {detail.lessons} lessons</div>
              <div><span style={{ opacity: 0.7 }}>⭐</span> {detail.rating}/5</div>
              <div><span style={{ opacity: 0.7 }}>👥</span> {detail.students.toLocaleString()} students</div>
            </div>
          </div>

          {detail.enrolled ? (
            <div className="card" style={{ marginBottom: 12 }}>
              <div className="card-title">Your Progress</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--primary)' }}>{detail.enrollment?.progress || 0}%</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12 }}>{detail.enrollment?.completedLessons?.length || 0} of {detail.lessons} lessons</div>
                  <div style={{ height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4, marginTop: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${detail.enrollment?.progress || 0}%`, background: 'var(--primary)', transition: 'width 0.3s' }} />
                  </div>
                </div>
              </div>
              {detail.enrollment?.status === 'completed' && (
                <div style={{ marginTop: 8, padding: 8, background: 'rgba(34,197,94,0.15)', borderRadius: 6, textAlign: 'center', color: 'var(--success)', fontSize: 13 }}>
                  🎉 Course Completed! View your certificate.
                </div>
              )}
            </div>
          ) : (
            <button
              className="btn btn-block"
              style={{ marginBottom: 12, padding: 14, fontSize: 15, fontWeight: 700 }}
              onClick={() => enroll(detail.id)}
            >
              Enroll Now — Free
            </button>
          )}

          <div className="card" style={{ marginBottom: 12 }}>
            <div className="card-title">About This Course</div>
            <div style={{ fontSize: 13, lineHeight: 1.6, marginTop: 8, opacity: 0.8 }}>{detail.description}</div>
          </div>

          <div className="card" style={{ marginBottom: 12 }}>
            <div className="card-title">Skills You'll Learn</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {detail.skills.map((skill) => (
                <span key={skill} style={{ fontSize: 11, padding: '4px 10px', background: 'var(--primary-soft)', borderRadius: 20, color: 'var(--primary)' }}>
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {detail.modules && detail.modules.length > 0 && (
            <div className="card">
              <div className="card-title">Course Modules</div>
              <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
                {detail.modules.map((mod, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16 }}>📖</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{mod.title}</div>
                        <div style={{ fontSize: 11, opacity: 0.5 }}>{mod.lessons} lessons</div>
                      </div>
                    </div>
                    {detail.enrolled && (detail.enrollment?.completedLessons?.length || 0) > i && (
                      <span style={{ fontSize: 14 }}>✅</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CourseCard({ course, onOpen, onEnroll, compact = false }: {
  course: Course;
  onOpen: (c: Course) => void;
  onEnroll: (id: string) => void;
  compact?: boolean;
}) {
  const isEnrolled = course.enrolled;
  return (
    <div
      style={{
        background: 'var(--surface-2)',
        borderRadius: 12,
        padding: compact ? 10 : 14,
        cursor: 'pointer',
        border: '1px solid var(--border)',
        borderLeft: `3px solid ${DIFFICULTY_COLORS[course.difficulty]}`,
      }}
      onClick={() => onOpen(course)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: compact ? 13 : 14, fontWeight: 700 }}>{course.title}</div>
          <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>{course.instructor}</div>
          {!compact && (
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {course.description}
            </div>
          )}
          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: DIFFICULTY_COLORS[course.difficulty], color: 'white' }}>
              {DIFFICULTY_LABELS[course.difficulty]}
            </span>
            <span style={{ fontSize: 10, opacity: 0.5 }}>⏱️ {course.duration}</span>
            <span style={{ fontSize: 10, opacity: 0.5 }}>📖 {course.lessons} lessons</span>
            <span style={{ fontSize: 10, opacity: 0.5 }}>⭐ {course.rating}</span>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          {isEnrolled ? (
            <span style={{ fontSize: 11, padding: '4px 8px', background: 'var(--primary-soft)', borderRadius: 6, color: 'var(--primary)' }}>📚 Enrolled</span>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onEnroll(course.id); }}
              className="btn"
              style={{ fontSize: 11, padding: '4px 10px' }}
            >
              Enroll
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
