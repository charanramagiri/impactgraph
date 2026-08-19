import { useCallback, useEffect, useMemo, useState } from 'react';
import IncidentListSkeleton from '../components/IncidentListSkeleton';
import StatusBadge from '../components/StatusBadge';
import api from '../services/api';

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatDate(value, fallback = 'Date unavailable') {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : dateFormatter.format(date);
}

function selectRepresentativePaths(paths, affected, limit = 6) {
  const minimumDepth = new Map(affected.map((service) => [service.id, service.depth]));
  const unique = new Map();
  paths.forEach((path) => {
    const key = path.nodes.map((node) => node.id).join('>');
    if (!unique.has(key)) unique.set(key, path);
  });

  const ranked = [...unique.values()].map((path) => {
    const key = path.nodes.map((node) => node.id).join('>');
    const detour = path.nodes.reduce((total, node, index) => {
      const depth = index === 0 ? 0 : (minimumDepth.get(node.id) || 0);
      return total + Math.max(0, index - depth);
    }, 0);
    return {
      path,
      key,
      branch: `${path.rootServiceId || path.nodes[0]?.id}:${path.nodes[1]?.id || ''}`,
      score: path.nodes.length - detour,
    };
  }).sort((first, second) =>
    second.score - first.score ||
    second.path.nodes.length - first.path.nodes.length ||
    first.key.localeCompare(second.key)
  );

  const selectedByBranch = new Map();
  ranked.forEach((candidate) => {
    if (!selectedByBranch.has(candidate.branch)) {
      selectedByBranch.set(candidate.branch, candidate);
    }
  });
  const selected = [...selectedByBranch.values()]
    .sort((first, second) =>
      second.path.nodes.length - first.path.nodes.length || first.key.localeCompare(second.key)
    )
    .slice(0, limit);
  const selectedKeys = new Set(selected.map((candidate) => candidate.key));
  ranked.forEach((candidate) => {
    if (selected.length < limit && !selectedKeys.has(candidate.key)) {
      selected.push(candidate);
      selectedKeys.add(candidate.key);
    }
  });
  return selected.map((candidate) => candidate.path);
}

function IncidentDetailSkeleton() {
  return (
    <div className="card incident-detail-skeleton" aria-label="Loading incident details" role="status">
      <span className="visually-hidden">Loading incident details</span>
      <span className="skeleton skeleton-title" />
      <span className="skeleton skeleton-subtitle" />
      <span className="skeleton incident-skeleton-block" />
      <span className="skeleton incident-skeleton-block incident-skeleton-short" />
    </div>
  );
}

function Incidents() {
  const [listState, setListState] = useState({ loading: true, error: false, data: [] });
  const [listVersion, setListVersion] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [detailState, setDetailState] = useState({ loading: false, error: false, data: null });
  const [detailVersion, setDetailVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function loadIncidents() {
      setListState((current) => ({ ...current, loading: true, error: false }));
      try {
        const response = await api.get('/incidents', { signal: controller.signal });
        const incidents = response.data.incidents || [];
        setListState({ loading: false, error: false, data: incidents });
        setSelectedId((current) =>
          current && incidents.some((incident) => incident.id === current)
            ? current
            : incidents[0]?.id || null
        );
      } catch (error) {
        if (!controller.signal.aborted) {
          setListState({ loading: false, error: true, data: [] });
          setSelectedId(null);
        }
      }
    }
    loadIncidents();
    return () => controller.abort();
  }, [listVersion]);

  useEffect(() => {
    if (!selectedId) {
      setDetailState({ loading: false, error: false, data: null });
      return undefined;
    }
    const controller = new AbortController();
    async function loadDetail() {
      setDetailState({ loading: true, error: false, data: null });
      try {
        const response = await api.get(`/incidents/${selectedId}`, { signal: controller.signal });
        setDetailState({ loading: false, error: false, data: response.data });
      } catch (error) {
        if (!controller.signal.aborted) {
          setDetailState({ loading: false, error: true, data: null });
        }
      }
    }
    loadDetail();
    return () => controller.abort();
  }, [selectedId, detailVersion]);

  const affectedGroups = useMemo(() => {
    const groups = new Map();
    detailState.data?.affected.forEach((service) => {
      if (!groups.has(service.depth)) groups.set(service.depth, []);
      groups.get(service.depth).push(service);
    });
    return [...groups.entries()].sort(([first], [second]) => first - second);
  }, [detailState.data]);
  const representativePaths = useMemo(
    () => selectRepresentativePaths(
      detailState.data?.paths || [],
      detailState.data?.affected || []
    ),
    [detailState.data]
  );
  const additionalPathCount = Math.max(
    0,
    (detailState.data?.paths.length || 0) - representativePaths.length
  );

  const selectIncident = useCallback((incidentId) => {
    if (incidentId === selectedId) return;
    setSelectedId(incidentId);
    setDetailState({ loading: true, error: false, data: null });
  }, [selectedId]);

  return (
    <section className="page-section incidents-page" aria-labelledby="incidents-page-title">
      <header className="page-heading">
        <p className="eyebrow">Operations</p>
        <h1 id="incidents-page-title">Incidents</h1>
        <p className="page-description">Review incidents and understand their downstream impact.</p>
      </header>

      {listState.loading && <IncidentListSkeleton />}

      {listState.error && (
        <div className="card error-panel" role="alert">
          <div>
            <p className="error-panel-title">Incident history is unavailable</p>
            <p className="error-panel-message">We could not load the incident list. Check the connection and try again.</p>
          </div>
          <button type="button" onClick={() => setListVersion((version) => version + 1)}>Retry</button>
        </div>
      )}

      {!listState.loading && !listState.error && listState.data.length === 0 && (
        <div className="card incident-empty-state">
          <span aria-hidden="true">IN</span>
          <h2>No incidents recorded</h2>
          <p>There are currently no incidents in the architecture history.</p>
        </div>
      )}

      {!listState.loading && !listState.error && listState.data.length > 0 && (
        <div className="incidents-layout">
          <aside className="card incident-browser-list" aria-labelledby="incident-list-title">
            <div className="incident-browser-heading">
              <h2 id="incident-list-title">Incident history</h2>
              <span>{listState.data.length} incidents</span>
            </div>
            <div className="incident-browser-items">
              {listState.data.map((incident) => (
                <button
                  type="button"
                  className={`incident-browser-item ${selectedId === incident.id ? 'incident-browser-item-selected' : ''}`}
                  aria-pressed={selectedId === incident.id}
                  key={incident.id}
                  onClick={() => selectIncident(incident.id)}
                >
                  <span className="incident-browser-title">{incident.title}</span>
                  <span className="badge-group">
                    <StatusBadge value={incident.severity} />
                    <StatusBadge value={incident.status} />
                  </span>
                  <span className="incident-browser-meta">
                    <time dateTime={incident.startedAt}>{formatDate(incident.startedAt)}</time>
                    <span>{incident.affectedServiceCount} direct {incident.affectedServiceCount === 1 ? 'service' : 'services'}</span>
                  </span>
                </button>
              ))}
            </div>
          </aside>

          <section className="incident-detail-area" aria-label="Selected incident details">
            {detailState.loading && <IncidentDetailSkeleton />}
            {detailState.error && (
              <div className="card incident-detail-error" role="alert">
                <h2>Incident details unavailable</h2>
                <p>We could not load the selected incident. Try again when the connection is available.</p>
                <button type="button" onClick={() => setDetailVersion((version) => version + 1)}>Retry</button>
              </div>
            )}
            {detailState.data && !detailState.loading && (
              <div className="incident-detail-content">
                <article className="card incident-overview-card">
                  <div className="incident-detail-heading">
                    <div>
                      <p className="eyebrow">Incident detail</p>
                      <h2>{detailState.data.incident.title}</h2>
                    </div>
                    <div className="badge-group">
                      <StatusBadge value={detailState.data.incident.severity} />
                      <StatusBadge value={detailState.data.incident.status} />
                    </div>
                  </div>
                  <p className="incident-detail-description">{detailState.data.incident.description}</p>
                  <dl className="incident-timeline">
                    <div><dt>Started</dt><dd><time dateTime={detailState.data.incident.startedAt}>{formatDate(detailState.data.incident.startedAt)}</time></dd></div>
                    <div><dt>Resolved</dt><dd>{detailState.data.incident.resolvedAt ? <time dateTime={detailState.data.incident.resolvedAt}>{formatDate(detailState.data.incident.resolvedAt)}</time> : 'Ongoing'}</dd></div>
                  </dl>
                </article>

                <section className="card incident-direct-card" aria-labelledby="directly-affected-title">
                  <div className="incident-section-heading">
                    <div>
                      <h2 id="directly-affected-title">Directly affected</h2>
                      <p>Services where this incident originated or was directly observed.</p>
                    </div>
                    <span>{detailState.data.directlyAffected.length} roots</span>
                  </div>
                  <div className="incident-direct-grid">
                    {detailState.data.directlyAffected.map((service) => (
                      <article key={service.id}>
                        <span className="direct-root-label">Incident root</span>
                        <strong>{service.name}</strong>
                        <div className="badge-group"><StatusBadge value={service.status} /><StatusBadge value={service.criticality} /></div>
                      </article>
                    ))}
                  </div>
                </section>

                <div className="incident-impact-metrics" aria-label="Incident impact summary">
                  {[
                    ['Affected Services', detailState.data.impact.affectedServices],
                    ['High / Critical', detailState.data.impact.criticalServices],
                    ['Maximum Depth', detailState.data.impact.maxDepth],
                  ].map(([label, value]) => (
                    <article className="card incident-impact-metric" key={label}><span>{label}</span><strong>{value}</strong></article>
                  ))}
                </div>

                <section className="card incident-downstream-card" aria-labelledby="downstream-title">
                  <div className="incident-section-heading">
                    <div>
                      <h2 id="downstream-title">Downstream impact</h2>
                      <p>Unique dependent services grouped by their minimum distance from an incident root.</p>
                    </div>
                  </div>
                  {affectedGroups.length ? (
                    <div className="incident-depth-groups">
                      {affectedGroups.map(([depth, services]) => (
                        <section key={depth}>
                          <h3>Depth {depth}</h3>
                          <ul>
                            {services.map((service) => (
                              <li key={service.id}><div><strong>{service.name}</strong><span>Depth {service.depth}</span></div><StatusBadge value={service.criticality} /></li>
                            ))}
                          </ul>
                        </section>
                      ))}
                    </div>
                  ) : (
                    <div className="incident-no-downstream"><strong>No downstream impact found</strong><span>No dependent services were identified for these incident roots.</span></div>
                  )}
                </section>

                {representativePaths.length > 0 && (
                  <section className="card incident-paths-card" aria-labelledby="incident-paths-title">
                    <div className="incident-section-heading"><div><h2 id="incident-paths-title">Propagation paths</h2><p>Representative ways this incident could spread beyond its direct roots.</p></div></div>
                    <ol>
                      {representativePaths.map((path) => (
                        <li key={path.nodes.map((node) => node.id).join('>')}>
                          {path.nodes.map((node, index) => <span key={node.id}>{index > 0 && <i aria-hidden="true">→</i>}{node.name}</span>)}
                        </li>
                      ))}
                    </ol>
                    {additionalPathCount > 0 && <p className="additional-paths">+ {additionalPathCount} additional paths</p>}
                  </section>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </section>
  );
}

export default Incidents;
