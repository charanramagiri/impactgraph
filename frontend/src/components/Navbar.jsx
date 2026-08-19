import { NavLink } from 'react-router-dom';

const navigationItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/explorer', label: 'Explorer' },
  { to: '/impact', label: 'Impact Analysis' },
  { to: '/incidents', label: 'Incidents' },
];

const statusLabels = {
  loading: 'Checking system',
  connected: 'System connected',
  unavailable: 'Database unavailable',
};

function Navbar({ systemStatus }) {
  return (
    <header className="site-header">
      <div className="nav-container">
        <NavLink className="brand" to="/" aria-label="ImpactGraph dashboard">
          <span className="brand-mark" aria-hidden="true">IG</span>
          <span>ImpactGraph</span>
        </NavLink>

        <nav className="primary-nav" aria-label="Primary navigation">
          {navigationItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                isActive ? 'nav-link nav-link-active' : 'nav-link'
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div
          className={`system-status system-status-${systemStatus}`}
          role="status"
          aria-live="polite"
        >
          <span className="status-dot" aria-hidden="true" />
          {statusLabels[systemStatus]}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
