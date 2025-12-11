import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '~/shared/context/AppContext';
import { hasToken } from '~/shared/lib/helpers/storageHelpers';

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAppContext();

  useEffect(() => {
    // Redirect based on authentication status
    // If we have a token but no user yet, wait for user to load
    if (hasToken() && !user) return;

    if (user) {
      navigate('/dashboard', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  }, [user, navigate]);

  // Show nothing while redirecting
  return null;
}
