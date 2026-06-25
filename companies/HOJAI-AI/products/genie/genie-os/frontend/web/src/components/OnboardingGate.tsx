import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const ONBOARDING_KEY = 'genie_onboarding_completed';

export default function OnboardingGate({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_KEY) === 'true';
    if (!completed && location.pathname !== '/onboarding') {
      navigate('/onboarding', { replace: true });
    }
    setReady(true);
  }, [location.pathname, navigate]);

  if (!ready) return null;

  return <>{children}</>;
}

export function markOnboardingComplete(): void {
  localStorage.setItem(ONBOARDING_KEY, 'true');
}

export function resetOnboarding(): void {
  localStorage.removeItem(ONBOARDING_KEY);
}