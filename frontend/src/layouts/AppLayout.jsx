import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';

function AppLayout() {
  const [systemStatus, setSystemStatus] = useState('loading');

  useEffect(() => {
    const controller = new AbortController();

    async function checkHealth() {
      try {
        const response = await api.get('/health', {
          signal: controller.signal,
        });
        const connected =
          response.status === 200 && response.data?.database === 'connected';
        setSystemStatus(connected ? 'connected' : 'unavailable');
      } catch (error) {
        if (!controller.signal.aborted) {
          setSystemStatus('unavailable');
        }
      }
    }

    checkHealth();

    return () => controller.abort();
  }, []);

  return (
    <div className="app-shell">
      <Navbar systemStatus={systemStatus} />
      <main className="main-content">
        <div className="content-container">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default AppLayout;
