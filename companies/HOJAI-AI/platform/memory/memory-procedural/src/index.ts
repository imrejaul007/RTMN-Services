/**
 * TwinOS Procedural Memory v1.0
 * Port: 4725
 *
 * Stores skills, workflows, habits, and routines.
 * Part of the 7-type memory model.
 */
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4725', 10);

// Types
interface Skill {
  id: string;
  twinId: string;
  name: string;
  level: number; // 0-100
  practiceCount: number;
  lastPracticed: string;
  mastered: boolean;
}

interface Workflow {
  id: string;
  twinId: string;
  name: string;
  steps: string[];
  usageCount: number;
  successRate: number;
}

interface Habit {
  id: string;
  twinId: string;
  name: string;
  frequency: string; // daily, weekly, etc.
  streak: number;
  lastPerformed: string;
}

interface Routine {
  id: string;
  twinId: string;
  name: string;
  activities: string[];
  timeOfDay: string;
  consistency: number;
}

// Storage
const skills = new Map<string, Skill[]>();
const workflows = new Map<string, Workflow[]>();
const habits = new Map<string, Habit[]>();
const routines = new Map<string, Routine[]>();

// Helper
function generateId(prefix: string): string {
  return `${prefix}-${uuidv4().slice(0, 8)}`;
}

// Middleware
app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json());

// Routes
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'memory-procedural', version: '1.0.0' });
});

// Skills
app.post('/api/procedural/:twinId/skills', (req, res) => {
  const { twinId } = req.params;
  const { name, level = 0 } = req.body;

  if (!name) return res.status(400).json({ error: 'name is required' });

  const twinSkills = skills.get(twinId) || [];
  const skill: Skill = {
    id: generateId('skill'),
    twinId,
    name,
    level,
    practiceCount: 0,
    lastPracticed: new Date().toISOString(),
    mastered: level >= 90,
  };

  twinSkills.push(skill);
  skills.set(twinId, twinSkills);
  res.json({ success: true, skill });
});

app.get('/api/procedural/:twinId/skills', (req, res) => {
  const twinSkills = skills.get(req.params.twinId) || [];
  res.json({ success: true, skills: twinSkills });
});

app.put('/api/procedural/:twinId/skills/:skillId', (req, res) => {
  const { twinId, skillId } = req.params;
  const { level, practiceCount } = req.body;

  const twinSkills = skills.get(twinId) || [];
  const skill = twinSkills.find(s => s.id === skillId);

  if (!skill) return res.status(404).json({ error: 'Skill not found' });

  if (level !== undefined) skill.level = Math.min(100, level);
  if (practiceCount !== undefined) skill.practiceCount = practiceCount;
  skill.lastPracticed = new Date().toISOString();
  skill.mastered = skill.level >= 90;

  res.json({ success: true, skill });
});

// Workflows
app.post('/api/procedural/:twinId/workflows', (req, res) => {
  const { twinId } = req.params;
  const { name, steps } = req.body;

  if (!name || !steps) return res.status(400).json({ error: 'name and steps required' });

  const twinWorkflows = workflows.get(twinId) || [];
  const workflow: Workflow = {
    id: generateId('wf'),
    twinId,
    name,
    steps,
    usageCount: 0,
    successRate: 0,
  };

  twinWorkflows.push(workflow);
  workflows.set(twinId, twinWorkflows);
  res.json({ success: true, workflow });
});

app.get('/api/procedural/:twinId/workflows', (req, res) => {
  res.json({ success: true, workflows: workflows.get(req.params.twinId) || [] });
});

// Habits
app.post('/api/procedural/:twinId/habits', (req, res) => {
  const { twinId } = req.params;
  const { name, frequency = 'daily' } = req.body;

  if (!name) return res.status(400).json({ error: 'name is required' });

  const twinHabits = habits.get(twinId) || [];
  const habit: Habit = {
    id: generateId('habit'),
    twinId,
    name,
    frequency,
    streak: 1,
    lastPerformed: new Date().toISOString(),
  };

  twinHabits.push(habit);
  habits.set(twinId, twinHabits);
  res.json({ success: true, habit });
});

app.post('/api/procedural/:twinId/habits/:habitId/perform', (req, res) => {
  const { twinId, habitId } = req.params;
  const twinHabits = habits.get(twinId) || [];
  const habit = twinHabits.find(h => h.id === habitId);

  if (!habit) return res.status(404).json({ error: 'Habit not found' });

  habit.streak += 1;
  habit.lastPerformed = new Date().toISOString();
  res.json({ success: true, habit });
});

app.get('/api/procedural/:twinId/habits', (req, res) => {
  res.json({ success: true, habits: habits.get(req.params.twinId) || [] });
});

// Routines
app.post('/api/procedural/:twinId/routines', (req, res) => {
  const { twinId } = req.params;
  const { name, activities, timeOfDay } = req.body;

  if (!name) return res.status(400).json({ error: 'name is required' });

  const twinRoutines = routines.get(twinId) || [];
  const routine: Routine = {
    id: generateId('routine'),
    twinId,
    name,
    activities: activities || [],
    timeOfDay: timeOfDay || 'morning',
    consistency: 0,
  };

  twinRoutines.push(routine);
  routines.set(twinId, twinRoutines);
  res.json({ success: true, routine });
});

app.get('/api/procedural/:twinId/routines', (req, res) => {
  res.json({ success: true, routines: routines.get(req.params.twinId) || [] });
});

// Summary
app.get('/api/procedural/:twinId/summary', (req, res) => {
  const { twinId } = req.params;
  res.json({
    success: true,
    summary: {
      skillsCount: (skills.get(twinId) || []).length,
      workflowsCount: (workflows.get(twinId) || []).length,
      habitsCount: (habits.get(twinId) || []).length,
      routinesCount: (routines.get(twinId) || []).length,
    },
  });
});

app.listen(PORT, () => {
  console.log(`⚙️ Memory Procedural v1.0.0 running on port ${PORT}`);
});

export default app;
