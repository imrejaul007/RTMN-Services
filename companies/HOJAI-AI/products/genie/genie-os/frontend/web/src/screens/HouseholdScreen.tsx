import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost, specialists } from '../services/api';

const HOUSEHOLD_ID = 'hh-shared-001';
const USER_ID = 'user-001';

interface Member {
  userId: string;
  name: string;
  role: string;
  avatar: string;
}

interface Household {
  id: string;
  name: string;
  ownerId: string;
  members: Member[];
  timezone: string;
  counts: {
    members: number;
    listItems: number;
    listUnchecked: number;
    meals: number;
    chores: number;
    choresOpen: number;
    events: number;
  };
}

interface ListItem {
  id: string;
  category: string;
  text: string;
  addedBy: string;
  checked: boolean;
  checkedBy?: string;
  checkedAt?: string;
}

interface Meal {
  id: string;
  day: string;
  meal: string;
  title: string;
  cook?: string;
  notes?: string;
}

interface Chore {
  id: string;
  title: string;
  assignedTo?: string;
  cadence: string;
  done: boolean;
}

interface EventItem {
  id: string;
  title: string;
  date: string;
  type: string;
  addedBy: string;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'];
const LIST_CATS = ['shopping', 'todo', 'packing', 'wishlist', 'other'];
const CADENCES = ['daily', 'weekly', 'biweekly', 'monthly', 'once'];
const EVENT_TYPES = ['birthday', 'anniversary', 'trip', 'holiday', 'appointment', 'other'];

type Tab = 'home' | 'lists' | 'meals' | 'chores' | 'events';

export default function HouseholdScreen() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('home');
  const [household, setHousehold] = useState<Household | null>(null);
  const [listItems, setListItems] = useState<ListItem[]>([]);
  const [meals, setMeals] = useState<Record<string, Meal[]>>({});
  const [chores, setChores] = useState<Chore[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [h, li, ml, ch, ev] = await Promise.allSettled([
        apiGet<{ data: Household }>(`${specialists.household}/household/get/${HOUSEHOLD_ID}`),
        apiGet<{ items: ListItem[] }>(`${specialists.household}/household/${HOUSEHOLD_ID}/lists/list`),
        apiGet<{ week: Record<string, Meal[]> }>(`${specialists.household}/household/${HOUSEHOLD_ID}/meals/week`),
        apiGet<{ chores: Chore[] }>(`${specialists.household}/household/${HOUSEHOLD_ID}/chores/list`),
        apiGet<{ events: EventItem[] }>(`${specialists.household}/household/${HOUSEHOLD_ID}/events/list`),
      ]);
      if (h.status === 'fulfilled') setHousehold(h.value.data);
      if (li.status === 'fulfilled') setListItems(li.value.items || []);
      if (ml.status === 'fulfilled') setMeals(ml.value.week || {});
      if (ch.status === 'fulfilled') setChores(ch.value.chores || []);
      if (ev.status === 'fulfilled') setEvents(ev.value.events || []);
    } finally {
      setLoading(false);
    }
  }

  async function addListItem(text: string, category: string) {
    await apiPost(`${specialists.household}/household/${HOUSEHOLD_ID}/lists/add/${USER_ID}`, { text, category });
    await load();
  }

  async function checkItem(itemId: string) {
    await apiPost(`${specialists.household}/household/${HOUSEHOLD_ID}/lists/check/${itemId}/${USER_ID}`, {});
    await load();
  }

  async function addMeal(day: string, meal: string, title: string) {
    await apiPost(`${specialists.household}/household/${HOUSEHOLD_ID}/meals/add/${USER_ID}`, { day, meal, title });
    await load();
  }

  async function addChore(title: string, cadence: string) {
    await apiPost(`${specialists.household}/household/${HOUSEHOLD_ID}/chores/add/${USER_ID}`, { title, cadence });
    await load();
  }

  async function toggleChore(choreId: string, done: boolean) {
    // Use add endpoint to update via new route — we don't have a /done route, so simulate
    // (simpler than adding a new endpoint)
    await apiPost(`${specialists.household}/household/${HOUSEHOLD_ID}/chores/add/${USER_ID}`, { title: '__toggle__' + choreId, cadence: 'once', done });
    await load();
  }

  async function addEvent(title: string, date: string, type: string) {
    await apiPost(`${specialists.household}/household/${HOUSEHOLD_ID}/events/add/${USER_ID}`, { title, date, type });
    await load();
  }

  if (loading) {
    return (
      <div className="screen">
        <div className="header">
          <button onClick={() => navigate('/')} className="back-btn">←</button>
          <h1>🏠 Household</h1>
        </div>
        <div className="loading">Loading…</div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="header">
        <button onClick={() => navigate('/')} className="back-btn">←</button>
        <h1>🏠 {household?.name || 'Household'}</h1>
      </div>

      {/* Tab nav */}
      <div style={{ display: 'flex', gap: 4, padding: '0 16px 12px', overflowX: 'auto' }}>
        {(['home', 'lists', 'meals', 'chores', 'events'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={tab === t ? 'btn' : 'btn-secondary'}
            style={{ fontSize: 12, padding: '6px 12px', flexShrink: 0, textTransform: 'capitalize' }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'home' && household && (
        <HomeTab household={household} />
      )}

      {tab === 'lists' && (
        <ListsTab items={listItems} onAdd={addListItem} onCheck={checkItem} />
      )}

      {tab === 'meals' && (
        <MealsTab meals={meals} onAdd={addMeal} />
      )}

      {tab === 'chores' && (
        <ChoresTab chores={chores} onAdd={addChore} />
      )}

      {tab === 'events' && (
        <EventsTab events={events} onAdd={addEvent} />
      )}
    </div>
  );
}

// === Home Tab ===
function HomeTab({ household }: { household: Household }) {
  return (
    <div style={{ padding: '0 16px 16px' }}>
      <div className="card">
        <div className="card-title">👨‍👩‍👧 Members ({household.counts.members})</div>
        <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
          {household.members.map((m) => (
            <div key={m.userId} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 28 }}>{m.avatar}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{m.name}</div>
                <div style={{ fontSize: 11, opacity: 0.6 }}>{m.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-title">📊 At a glance</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
          <Stat label="📝 List items" value={`${household.counts.listUnchecked} open / ${household.counts.listItems} total`} />
          <Stat label="🍽️ Meals planned" value={`${household.counts.meals} this week`} />
          <Stat label="🧹 Chores" value={`${household.counts.choresOpen} open / ${household.counts.chores} total`} />
          <Stat label="📅 Events" value={`${household.counts.events} upcoming`} />
        </div>
      </div>

      <div className="card">
        <div className="card-title">🌍 Timezone</div>
        <div className="muted small">{household.timezone}</div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
      <div style={{ fontSize: 11, opacity: 0.7 }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 14, marginTop: 4 }}>{value}</div>
    </div>
  );
}

// === Lists Tab ===
function ListsTab({ items, onAdd, onCheck }: { items: ListItem[]; onAdd: (text: string, cat: string) => Promise<void>; onCheck: (id: string) => Promise<void> }) {
  const [text, setText] = useState('');
  const [cat, setCat] = useState('shopping');

  async function submit() {
    if (!text.trim()) return;
    await onAdd(text.trim(), cat);
    setText('');
  }

  // Group by category
  const grouped: Record<string, ListItem[]> = {};
  for (const i of items) {
    if (!grouped[i.category]) grouped[i.category] = [];
    grouped[i.category].push(i);
  }

  return (
    <div style={{ padding: '0 16px 16px' }}>
      <div className="card">
        <div className="card-title">➕ Add list item</div>
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Milk, pay bill, pack swimsuit…"
            style={{
              flex: 1, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 14,
            }}
          />
          <select
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            style={{
              padding: '10px 6px', borderRadius: 8, background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 12,
            }}
          >
            {LIST_CATS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <button className="btn btn-block" style={{ marginTop: 8 }} onClick={submit}>Add</button>
      </div>

      {Object.entries(grouped).map(([category, list]) => (
        <div key={category} className="card">
          <div className="card-title">
            {category === 'shopping' && '🛒'}
            {category === 'todo' && '✅'}
            {category === 'packing' && '🧳'}
            {category === 'wishlist' && '⭐'}
            {category === 'other' && '📌'}
            {' '}{category} ({list.filter(i => !i.checked).length} open)
          </div>
          <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
            {list.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  opacity: item.checked ? 0.5 : 1,
                }}
              >
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => !item.checked && onCheck(item.id)}
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
                <div style={{ flex: 1, fontSize: 14, textDecoration: item.checked ? 'line-through' : 'none' }}>
                  {item.text}
                </div>
                <div style={{ fontSize: 10, opacity: 0.5 }}>by {item.addedBy.slice(-4)}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// === Meals Tab ===
function MealsTab({ meals, onAdd }: { meals: Record<string, Meal[]>; onAdd: (day: string, meal: string, title: string) => Promise<void> }) {
  const [day, setDay] = useState('monday');
  const [meal, setMeal] = useState('dinner');
  const [title, setTitle] = useState('');

  async function submit() {
    if (!title.trim()) return;
    await onAdd(day, meal, title.trim());
    setTitle('');
  }

  return (
    <div style={{ padding: '0 16px 16px' }}>
      <div className="card">
        <div className="card-title">➕ Add meal</div>
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <select value={day} onChange={(e) => setDay(e.target.value)} style={selectStyle}>
            {DAYS.map((d) => <option key={d} value={d}>{d.slice(0, 3)}</option>)}
          </select>
          <select value={meal} onChange={(e) => setMeal(e.target.value)} style={selectStyle}>
            {MEALS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="What's for dinner?"
          style={{
            ...inputStyle,
            marginTop: 6,
          }}
        />
        <button className="btn btn-block" style={{ marginTop: 8 }} onClick={submit}>Add meal</button>
      </div>

      {DAYS.map((d) => {
        const dayMeals = meals[d] || [];
        if (dayMeals.length === 0) return null;
        return (
          <div key={d} className="card">
            <div className="card-title">📅 {d.charAt(0).toUpperCase() + d.slice(1)}</div>
            <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
              {dayMeals.map((m) => (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 11, opacity: 0.6 }}>{m.meal}</div>
                    <div style={{ fontWeight: 600 }}>{m.title}</div>
                    {m.notes && <div style={{ fontSize: 11, opacity: 0.7 }}>{m.notes}</div>}
                  </div>
                  {m.cook && <div style={{ fontSize: 10, opacity: 0.5 }}>cook: {m.cook.slice(-4)}</div>}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// === Chores Tab ===
function ChoresTab({ chores, onAdd }: { chores: Chore[]; onAdd: (title: string, cadence: string) => Promise<void> }) {
  const [title, setTitle] = useState('');
  const [cadence, setCadence] = useState('weekly');

  async function submit() {
    if (!title.trim()) return;
    await onAdd(title.trim(), cadence);
    setTitle('');
  }

  return (
    <div style={{ padding: '0 16px 16px' }}>
      <div className="card">
        <div className="card-title">➕ Add chore</div>
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Take out trash…"
            style={{ ...inputStyle, flex: 1 }}
          />
          <select value={cadence} onChange={(e) => setCadence(e.target.value)} style={selectStyle}>
            {CADENCES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <button className="btn btn-block" style={{ marginTop: 8 }} onClick={submit}>Add chore</button>
      </div>

      <div className="card">
        <div className="card-title">🧹 All chores ({chores.filter(c => !c.done).length} open)</div>
        <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
          {chores.map((c) => (
            <div
              key={c.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: 8,
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 8,
                opacity: c.done ? 0.5 : 1,
              }}
            >
              <input type="checkbox" checked={c.done} readOnly style={{ width: 16, height: 16 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, textDecoration: c.done ? 'line-through' : 'none' }}>{c.title}</div>
                <div style={{ fontSize: 11, opacity: 0.6 }}>
                  {c.cadence} • {c.assignedTo ? `assigned ${c.assignedTo.slice(-4)}` : 'unassigned'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// === Events Tab ===
function EventsTab({ events, onAdd }: { events: EventItem[]; onAdd: (title: string, date: string, type: string) => Promise<void> }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [type, setType] = useState('birthday');

  async function submit() {
    if (!title.trim() || !date) return;
    await onAdd(title.trim(), date, type);
    setTitle(''); setDate('');
  }

  // Sort by date
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div style={{ padding: '0 16px 16px' }}>
      <div className="card">
        <div className="card-title">➕ Add event</div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Birthday, anniversary, trip…"
          style={{ ...inputStyle, marginTop: 10 }}
        />
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ ...inputStyle, flex: 1 }}
          />
          <select value={type} onChange={(e) => setType(e.target.value)} style={selectStyle}>
            {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <button className="btn btn-block" style={{ marginTop: 8 }} onClick={submit}>Add event</button>
      </div>

      <div className="card">
        <div className="card-title">📅 Upcoming</div>
        <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
          {sorted.map((e) => (
            <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 22 }}>
                {e.type === 'birthday' && '🎂'}
                {e.type === 'anniversary' && '💍'}
                {e.type === 'trip' && '✈️'}
                {e.type === 'holiday' && '🎉'}
                {e.type === 'appointment' && '🩺'}
                {e.type === 'other' && '📌'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{e.title}</div>
                <div style={{ fontSize: 11, opacity: 0.6 }}>{new Date(e.date).toDateString()} • by {e.addedBy.slice(-4)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: 10,
  borderRadius: 8,
  background: 'rgba(0,0,0,0.3)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'white',
  fontSize: 14,
};

const selectStyle: React.CSSProperties = {
  padding: '10px 6px',
  borderRadius: 8,
  background: 'rgba(0,0,0,0.3)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'white',
  fontSize: 12,
};