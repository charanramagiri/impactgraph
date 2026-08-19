import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import Dashboard from './pages/Dashboard';
import Explorer from './pages/Explorer';
import ImpactAnalysis from './pages/ImpactAnalysis';
import Incidents from './pages/Incidents';

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="explorer" element={<Explorer />} />
        <Route path="impact" element={<ImpactAnalysis />} />
        <Route path="incidents" element={<Incidents />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
