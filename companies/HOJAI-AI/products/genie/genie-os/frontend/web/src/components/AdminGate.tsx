import { ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser } from '../services/api';

const ALLOWED_ROLES = ['super_admin', 'org_admin', 'admin'];

export default function AdminGate({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const user = getUser();
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    const role = user.role || 'user';
    if (!ALLOWED_ROLES.includes(role)) {
      navigate('/home', { replace: true });
      return;
    }
    setReady(true);
  }, [navigate]);

  if (!ready) return null;
  return <>{children}</>;
}
