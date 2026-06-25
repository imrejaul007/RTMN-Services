import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost, specialists } from '../services/api';

const USER_ID = 'user-001';

interface Course {
  id: string; title: string; category: string; level: string;
  duration: string; lessonsCount: number; description: string; tags: string[];
}
interface Lesson { id: string; courseId: string; order: number; title: string; body: string; quiz: { q: string; options: string[]; answer: number }[]; }
interface Enrollment { id: string; courseId: string; lessonsTotal: number; lessonsCompleted: number; progressPercent: number; averageScore: number; course: Course; }

type Tab = 'browse' | 'learning' | 'lesson';

export default function TeacherScreen() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('browse');
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [currentCourseId, setCurrentCourseId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [c, l] = await Promise.allSettled([
        apiGet<{ courses: Course[] }>(`${specialists.teacher}/courses${filter ? `?category=${filter}` : ''}`),
        apiGet<{ courses: Enrollment[] }>(`${specialists.teacher}/users/${USER_ID}/learning`),
      ]);
      if (c.status === 'fulfilled') setCourses(c.value.courses || []);
      if (l.status === 'fulfilled') setEnrollments(l.value.courses || []);
    } finally { setLoading(false); }
  }

  async function enroll(courseId: string) {
    try {
      await apiPost(`${specialists.teacher}/courses/${courseId}/enroll/${USER_ID}`, {});
      await load();
    } catch (e: any) { alert(e.message || 'Enroll failed'); }
  }

  async function openLesson(lessonId: string, courseId: string) {
    try {
      const res = await apiGet<Lesson>(`${specialists.teacher}/lessons/${lessonId}`);
      setCurrentLesson({ ...res, id: lessonId, courseId });
      setCurrentCourseId(courseId);
      setTab('lesson');
    } catch (e: any) { alert(e.message || 'Lesson load failed'); }
  }

  async function completeLesson(score: number) {
    if (!currentLesson) return;
    await apiPost(`${specialists.teacher}/lessons/${currentLesson.id}/complete/${USER_ID}?score=${score}`, {});
    setCurrentLesson(null);
    setCurrentCourseId(null);
    setTab('learning');
    await load();
  }

  if (loading) {
    return (
      <div className="screen">
        <div className="header">
          <button onClick={() => navigate('/')} className="back-btn">←</button>
          <h1>📚 Teacher</h1>
        </div>
        <div className="loading">Loading courses…</div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="header">
        <button onClick={() => navigate('/')} className="back-btn">←</button>
        <h1>📚 Teacher</h1>
      </div>

      <div style={{ display: 'flex', gap: 4, padding: '0 16px 12px', overflowX: 'auto' }}>
        {(['browse', 'learning', 'lesson'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={tab === t ? 'btn' : 'btn-secondary'}
            style={{ fontSize: 12, padding: '6px 12px', flexShrink: 0, textTransform: 'capitalize' }}
          >
            {t === 'lesson' ? '📖 Lesson' : t}
          </button>
        ))}
      </div>

      {tab === 'browse' && (
        <BrowseTab courses={courses} enrollments={enrollments} filter={filter} setFilter={setFilter} onEnroll={enroll} onOpenLesson={openLesson} />
      )}

      {tab === 'learning' && (
        <LearningTab enrollments={enrollments} courses={courses} onOpenLesson={openLesson} />
      )}

      {tab === 'lesson' && currentLesson && currentCourseId && (
        <LessonTab lesson={currentLesson} courseId={currentCourseId} onComplete={completeLesson} onCancel={() => { setCurrentLesson(null); setTab('learning'); }} />
      )}

      {tab === 'lesson' && !currentLesson && (
        <div className="loading" style={{ padding: 16 }}>Pick a lesson from My Learning or Browse.</div>
      )}
    </div>
  );
}

function BrowseTab({ courses, enrollments, filter, setFilter, onEnroll, onOpenLesson }: any) {
  const enrolledIds = new Set(enrollments.map((e: Enrollment) => e.courseId));
  const categories = Array.from(new Set(courses.map((c: Course) => c.category))) as string[];

  return (
    <div style={{ padding: '0 16px 16px' }}>
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8 }}>
        <button onClick={() => setFilter('')} className={!filter ? 'btn' : 'btn-secondary'} style={{ fontSize: 11, padding: '4px 10px', flexShrink: 0 }}>All</button>
        {categories.map((c) => (
          <button key={c} onClick={() => setFilter(c)} className={filter === c ? 'btn' : 'btn-secondary'} style={{ fontSize: 11, padding: '4px 10px', flexShrink: 0, textTransform: 'capitalize' }}>{c}</button>
        ))}
      </div>

      {courses.map((c: Course) => (
        <div key={c.id} className="card">
          <div className="card-title">📘 {c.title}</div>
          <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 6 }}>{c.level} • {c.duration} • {c.category}</div>
          <div style={{ fontSize: 13, marginBottom: 8 }}>{c.description}</div>
          <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 8 }}>{c.lessonsCount} lessons</div>
          {enrolledIds.has(c.id) ? (
            <button className="btn btn-block" onClick={() => onOpenLesson(`ls-${c.id.split('-')[1]}-1`, c.id)}>▶ Start first lesson</button>
          ) : (
            <button className="btn btn-block" onClick={() => onEnroll(c.id)}>📝 Enroll</button>
          )}
        </div>
      ))}
    </div>
  );
}

function LearningTab({ enrollments, courses, onOpenLesson }: { enrollments: Enrollment[]; courses: Course[]; onOpenLesson: (lessonId: string, courseId: string) => void }) {
  if (enrollments.length === 0) {
    return (
      <div className="card" style={{ margin: 16 }}>
        <div className="card-title">No enrollments yet</div>
        <div className="muted small">Browse courses and enroll to start learning.</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '0 16px 16px' }}>
      {enrollments.map((e) => (
        <div key={e.id} className="card">
          <div className="card-title">🎓 {e.course?.title || e.courseId}</div>
          <div style={{ fontSize: 11, opacity: 0.7 }}>{e.lessonsCompleted} / {e.lessonsTotal} lessons • avg score {Math.round(e.averageScore)}%</div>
          <ProgressBar percent={e.progressPercent} />
          <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>{e.progressPercent}% complete</div>
          <button
            className="btn btn-block"
            style={{ marginTop: 8 }}
            onClick={() => {
              // Open next lesson: ls-{course}-{completed+1}
              const slug = e.courseId.replace('cr-', '');
              const next = Math.min(e.lessonsCompleted + 1, e.lessonsTotal);
              const id = `ls-${slug}-${next}`;
              onOpenLesson(id, e.courseId);
            }}
          >
            {e.progressPercent >= 100 ? '🔄 Review' : '▶ Continue'}
          </button>
        </div>
      ))}
    </div>
  );
}

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, marginTop: 8, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${percent}%`, background: 'linear-gradient(90deg, #7ed321, #4a90e2)', transition: 'width 0.3s' }} />
    </div>
  );
}

function LessonTab({ lesson, courseId, onComplete, onCancel }: { lesson: Lesson; courseId: string; onComplete: (score: number) => void; onCancel: () => void }) {
  const [quizIdx, setQuizIdx] = useState<number | null>(null);
  const [score, setScore] = useState<number>(100);

  return (
    <div style={{ padding: '0 16px 16px' }}>
      <div className="card">
        <div className="card-title">📖 Lesson {lesson.order}: {lesson.title}</div>
        <div style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', marginTop: 10 }}>{lesson.body}</div>
      </div>

      {lesson.quiz && lesson.quiz.length > 0 && (
        <div className="card">
          <div className="card-title">🧠 Quick quiz</div>
          {lesson.quiz.map((q, qi) => (
            <div key={qi} style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{q.q}</div>
              <div style={{ display: 'grid', gap: 6 }}>
                {q.options.map((opt, oi) => (
                  <button
                    key={oi}
                    onClick={() => {
                      setQuizIdx(qi);
                      if (oi === q.answer) setScore(s => Math.min(100, s + 25));
                    }}
                    style={{
                      padding: 8, borderRadius: 8, cursor: 'pointer',
                      background: quizIdx === qi ? (oi === q.answer ? 'rgba(126,211,33,0.3)' : 'rgba(255,100,100,0.3)') : 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'white', fontSize: 13, textAlign: 'left',
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              {quizIdx === qi && (
                <div style={{ fontSize: 11, marginTop: 6, opacity: 0.8 }}>
                  {lesson.quiz[qi].options[lesson.quiz[qi].answer] === q.options.find((_, i) => i === quizIdx)
                    ? '✅ Correct'
                    : `❌ Correct answer: ${q.options[q.answer]}`}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="card-title">✅ Mark complete</div>
        <div style={{ fontSize: 13, marginTop: 6 }}>Current score: <strong>{score}%</strong></div>
        <input
          type="range" min="0" max="100" value={score}
          onChange={(e) => setScore(parseInt(e.target.value, 10))}
          style={{ width: '100%', marginTop: 8 }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button className="btn" style={{ flex: 1 }} onClick={() => onComplete(score)}>✓ Complete</button>
          <button className="btn-secondary" onClick={onCancel}>✕ Cancel</button>
        </div>
      </div>
    </div>
  );
}