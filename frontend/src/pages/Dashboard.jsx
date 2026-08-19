import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardSkeleton from '../components/DashboardSkeleton';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import api from '../services/api';

const statDefinitions = [
  { key: 'services', label: 'Services', abbreviation: 'SV' },
  { key: 'databases', label: 'Databases', abbreviation: 'DB' },
  { key: 'externalApis', label: 'External APIs', abbreviation: 'API' },
  { key: 'teams', label: 'Teams', abbreviation: 'TM' },
  { key: 'incidents', label: 'Incidents', abbreviation: 'IN' },
];

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : dateFormatter.format(date);
}

function Dashboard() {
  const [state, setState] = useState({
    loading: true,
    error: false,
    data: null,
  });
  const [requestVersion, setRequestVersion] = useState(0);

  const retry = useCallback(() => {
    setRequestVersion((version) => version + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadDashboard() {
      setState((current) => ({ ...current, loading: true, error: false }));

      try {
        const [summaryResponse, criticalResponse, incidentResponse] =
          await Promise.all([
            api.get('/dashboard', { signal: controller.signal }),
            api.get('/critical-dependencies', { signal: controller.signal }),
            api.get('/incidents', { signal: controller.signal }),
          ]);

        setState({
          loading: false,
          error: false,
          data: {
            summary: summaryResponse.data,
            criticalDependencies:
              criticalResponse.data?.dependencies?.slice(0, 5) || [],
            incidents: incidentResponse.data?.incidents?.slice(0, 3) || [],
          },
        });
      } catch (error) {
        if (!controller.signal.aborted) {
          setState({ loading: false, error: true, data: null });
        }
      }
    }

    loadDashboard();
    return () => controller.abort();
  }, [requestVersion]);

  return (
    <section className="page-section" aria-labelledby="dashboard-title">
      <div className="page-heading">
        <p className="eyebrow">System overview</p>
        <h1 id="dashboard-title">Architecture at a glance</h1>
        <p className="page-description">
          Monitor architecture scale, dependency risk, and recent operational
          incidents.
        </p>
      </div>

      {state.loading && <DashboardSkeleton />}

      {state.error && (
        <div className="card error-panel" role="alert">
          <div>
            <p className="error-panel-title">Dashboard data is unavailable</p>
            <p className="error-panel-message">
              We could not load the latest system overview. Check the backend
              connection and try again.
            </p>
          </div>
          <button type="button" onClick={retry}>
            Retry
          </button>
        </div>
      )}

      {!state.loading && !state.error && state.data && (
        <div className="dashboard-content">
          <div className="stats-grid" aria-label="System totals">
            {statDefinitions.map((stat) => (
              <StatCard
                key={stat.key}
                label={stat.label}
                abbreviation={stat.abbreviation}
                value={state.data.summary[stat.key]}
              />
            ))}
          </div>

          <div className="dashboard-grid">
            <section className="card dashboard-panel" aria-labelledby="risks-title">
              <div className="section-heading">
                <div>
                  <h2 id="risks-title">Critical dependencies</h2>
                  <p>Services ranked by downstream blast radius.</p>
                </div>
                <Link className="text-link" to="/impact">
                  Explore impact
                </Link>
              </div>

              {state.data.criticalDependencies.length > 0 ? (
                <ol className="risk-list">
                  {state.data.criticalDependencies.map((dependency, index) => (
                    <li className="risk-row" key={dependency.id}>
                      <span className="risk-rank" aria-label={`Rank ${index + 1}`}>
                        {index + 1}
                      </span>
                      <div className="risk-details">
                        <div className="risk-title-row">
                          <h3>{dependency.name}</h3>
                          <StatusBadge value={dependency.criticality} />
                        </div>
                        <div className="risk-metrics">
                          <span>
                            <strong>{dependency.dependentServices}</strong>{' '}
                            dependent services
                          </span>
                          <span>Max depth {dependency.maxDepth}</span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="empty-state">No dependency risks found.</div>
              )}
            </section>

            <section className="card dashboard-panel" aria-labelledby="incidents-title">
              <div className="section-heading">
                <div>
                  <h2 id="incidents-title">Recent incidents</h2>
                  <p>Latest operational events and their direct reach.</p>
                </div>
                <Link className="text-link" to="/incidents">
                  View all
                </Link>
              </div>

              {state.data.incidents.length > 0 ? (
                <div className="incident-list">
                  {state.data.incidents.map((incident) => (
                    <article className="incident-row" key={incident.id}>
                      <div className="incident-title-row">
                        <h3>{incident.title}</h3>
                        <div className="badge-group">
                          <StatusBadge value={incident.severity} />
                          <StatusBadge value={incident.status} />
                        </div>
                      </div>
                      <div className="incident-meta">
                        <time dateTime={incident.startedAt}>
                          {formatDate(incident.startedAt)}
                        </time>
                        <span>
                          {incident.affectedServiceCount}{' '}
                          {incident.affectedServiceCount === 1 ? 'service' : 'services'} affected
                        </span>
                      </div>
                      <Link className="text-link incident-link" to="/incidents">
                        View incident
                      </Link>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-state">No incidents recorded.</div>
              )}
            </section>
          </div>
        </div>
      )}
    </section>
  );
}

export default Dashboard;
