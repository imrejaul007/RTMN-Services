import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import OnboardingGate from './components/OnboardingGate';
import HomeTab from './tabs/HomeTab';
import GenieTab from './tabs/GenieTab';
import SearchTab from './tabs/SearchTab';
import MemoryTab from './tabs/MemoryTab';
import MeTab from './tabs/MeTab';
import CalendarScreen from './screens/CalendarScreen';
import FinanceScreen from './screens/FinanceScreen';
import HealthScreen from './screens/HealthScreen';
import LearningScreen from './screens/LearningScreen';
import RelationshipsScreen from './screens/RelationshipsScreen';
import SpiritualScreen from './screens/SpiritualScreen';
import ReplayScreen from './screens/ReplayScreen';
import FutureSelfScreen from './screens/FutureSelfScreen';
import SimulationScreen from './screens/SimulationScreen';
import PersonalTwinScreen from './screens/PersonalTwinScreen';
import WidgetsScreen from './screens/WidgetsScreen';
import AITeamScreen from './screens/AITeamScreen';
import AccountsScreen from './screens/AccountsScreen';
import HouseholdScreen from './screens/HouseholdScreen';
import FounderScreen from './screens/FounderScreen';
import TeacherScreen from './screens/TeacherScreen';
import ResearchScreen from './screens/ResearchScreen';
import WellnessScreen from './screens/WellnessScreen';
import LearnerScreen from './screens/LearnerScreen';
import CreatorScreen from './screens/CreatorScreen';
import PlannerScreen from './screens/PlannerScreen';
import OnboardingFlow from './screens/OnboardingFlow';

export default function App() {
  return (
    <OnboardingGate>
      <Routes>
        {/* Onboarding (first launch only) */}
        <Route path="/onboarding" element={<OnboardingFlow />} />

        {/* Main 5-tab experience */}
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<HomeTab />} />
          <Route path="/genie" element={<GenieTab />} />
          <Route path="/search" element={<SearchTab />} />
          <Route path="/memory" element={<MemoryTab />} />
          <Route path="/me" element={<MeTab />} />

          {/* Hidden / detail screens */}
          <Route path="/calendar" element={<CalendarScreen />} />
          <Route path="/finance" element={<FinanceScreen />} />
          <Route path="/health" element={<HealthScreen />} />
          <Route path="/learning" element={<LearningScreen />} />
          <Route path="/relationships" element={<RelationshipsScreen />} />
          <Route path="/spiritual" element={<SpiritualScreen />} />
          <Route path="/replay" element={<ReplayScreen />} />
          <Route path="/futureself" element={<FutureSelfScreen />} />
          <Route path="/simulation" element={<SimulationScreen />} />
          <Route path="/personaltwin" element={<PersonalTwinScreen />} />
          <Route path="/widgets" element={<WidgetsScreen />} />
          <Route path="/aiteam" element={<AITeamScreen />} />
          <Route path="/accounts" element={<AccountsScreen />} />
        <Route path="/household" element={<HouseholdScreen />} />
        <Route path="/founder" element={<FounderScreen />} />
        <Route path="/teacher" element={<TeacherScreen />} />
        <Route path="/research" element={<ResearchScreen />} />
        <Route path="/wellness" element={<WellnessScreen />} />
        <Route path="/learner" element={<LearnerScreen />} />
        <Route path="/creator" element={<CreatorScreen />} />
        <Route path="/planner" element={<PlannerScreen />} />
        </Route>

        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </OnboardingGate>
  );
}