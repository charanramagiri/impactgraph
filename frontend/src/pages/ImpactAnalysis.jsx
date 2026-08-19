import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import ImpactAnalysisSkeleton from '../components/ImpactAnalysisSkeleton';
import ImpactNode from '../components/ImpactNode';
import StatusBadge from '../components/StatusBadge';
import api from '../services/api';

const nodeTypes = { impact: ImpactNode };

function sortServices(first, second) {
  return first.name.localeCompare(second.name, undefined, { sensitivity: 'base' }) ||
    first.id.localeCompare(second.id);
}

function buildImpactGraph(data) {
  const affectedById = new Map(data.affected.map((service) => [service.id, service]));
  const layers = new Map([[0, [data.service]]]);

  data.affected.forEach((service) => {
    if (!layers.has(service.depth)) layers.set(service.depth, []);
    layers.get(service.depth).push(service);
  });

  const nodes = [];
  [...layers.entries()].sort(([a], [b]) => a - b).forEach(([depth, services]) => {
    const ordered = [...services].sort(sortServices);
    const totalHeight = (ordered.length - 1) * 136;
    ordered.forEach((service, index) => {
      nodes.push({
        id: service.id,
        type: 'impact',
        position: { x: depth * 290, y: index * 136 - totalHeight / 2 },
        draggable: false,
        data: {
          ...service,
          depth,
          isRoot: depth === 0,
        },
      });
    });
  });

  const edgeKeys = new Set();
  const edges = [];
  data.paths.forEach((path) => {
    path.nodes.forEach((node, index) => {
      const target = path.nodes[index + 1];
      if (!target) return;
      const key = `${node.id}->${target.id}`;
      if (edgeKeys.has(key)) return;
      edgeKeys.add(key);
      edges.push({
        id: key,
        source: node.id,
        target: target.id,
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed, color: '#d97706', width: 18, height: 18 },
        style: { stroke: '#d97706', strokeWidth: 1.8 },
      });
    });
  });

  edges.sort((first, second) =>
    (affectedById.get(first.target)?.depth || 0) -
      (affectedById.get(second.target)?.depth || 0) ||
    first.id.localeCompare(second.id)
  );

  return { nodes, edges };
}

function selectRepresentativePaths(paths, affected, limit = 6) {
  const unique = new Map();
  const minimumDepth = new Map(affected.map((service) => [service.id, service.depth]));
  paths.forEach((path) => {
    const key = path.nodes.map((node) => node.id).join('>');
    if (!unique.has(key)) unique.set(key, path);
  });

  const ranked = [...unique.values()].map((path) => ({
    path,
    key: path.nodes.map((node) => node.id).join('>'),
    branch: path.nodes[1]?.id || '',
    detour: path.nodes.reduce(
      (total, node, index) => total + Math.max(0, index - (minimumDepth.get(node.id) || 0)),
      0
    ),
  })).sort((first, second) =>
    (second.path.nodes.length - second.detour) -
      (first.path.nodes.length - first.detour) ||
    second.path.nodes.length - first.path.nodes.length ||
    first.key.localeCompare(second.key)
  );

  const branchExamples = new Map();
  ranked.forEach((candidate) => {
    if (!branchExamples.has(candidate.branch)) {
      branchExamples.set(candidate.branch, candidate);
    }
  });

  const selected = [...branchExamples.values()]
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

function ImpactAnalysis() {
  const [servicesState, setServicesState] = useState({ loading: true, error: false, data: [] });
  const [servicesVersion, setServicesVersion] = useState(0);
  const [selectedId, setSelectedId] = useState('');
  const [analysisState, setAnalysisState] = useState({ loading: false, error: false, data: null });

  useEffect(() => {
    const controller = new AbortController();
    async function loadServices() {
      setServicesState((current) => ({ ...current, loading: true, error: false }));
      try {
        const response = await api.get('/services', { signal: controller.signal });
        setServicesState({ loading: false, error: false, data: response.data.services || [] });
      } catch (error) {
        if (!controller.signal.aborted) {
          setServicesState({ loading: false, error: true, data: [] });
        }
      }
    }
    loadServices();
    return () => controller.abort();
  }, [servicesVersion]);

  const analyzeService = useCallback(async () => {
    if (!selectedId) return;
    setAnalysisState({ loading: true, error: false, data: null });
    try {
      const response = await api.get(`/services/${selectedId}/impact`);
      setAnalysisState({ loading: false, error: false, data: response.data });
    } catch (error) {
      setAnalysisState({ loading: false, error: true, data: null });
    }
  }, [selectedId]);

  const graph = useMemo(
    () => analysisState.data ? buildImpactGraph(analysisState.data) : { nodes: [], edges: [] },
    [analysisState.data]
  );
  const affectedGroups = useMemo(() => {
    const groups = new Map();
    analysisState.data?.affected.forEach((service) => {
      if (!groups.has(service.depth)) groups.set(service.depth, []);
      groups.get(service.depth).push(service);
    });
    return [...groups.entries()].sort(([a], [b]) => a - b);
  }, [analysisState.data]);
  const representativePaths = useMemo(
    () => selectRepresentativePaths(
      analysisState.data?.paths || [],
      analysisState.data?.affected || []
    ),
    [analysisState.data]
  );
  const additionalPathCount = Math.max(
    0,
    (analysisState.data?.paths.length || 0) - representativePaths.length
  );

  return (
    <section className="page-section impact-page">
      <header className="page-heading">
        <p className="eyebrow">Resilience</p>
        <h1>Impact Analysis</h1>
        <p className="page-description">
          Understand how a service failure can propagate through connected systems.
        </p>
      </header>

      <div className="card impact-controls-card">
        <div className="impact-service-field">
          <label htmlFor="impact-service">Service to analyze</label>
          {servicesState.error ? (
            <div className="inline-error" role="alert">
              <span>Services are currently unavailable.</span>
              <button type="button" className="button-secondary" onClick={() => setServicesVersion((value) => value + 1)}>
                Retry
              </button>
            </div>
          ) : (
            <select
              id="impact-service"
              value={selectedId}
              disabled={servicesState.loading || servicesState.data.length === 0}
              onChange={(event) => {
                setSelectedId(event.target.value);
                setAnalysisState({ loading: false, error: false, data: null });
              }}
            >
              <option value="">
                {servicesState.loading
                  ? 'Loading services…'
                  : servicesState.data.length
                    ? 'Select a service'
                    : 'No services available'}
              </option>
              {servicesState.data.map((service) => (
                <option value={service.id} key={service.id}>{service.name}</option>
              ))}
            </select>
          )}
        </div>
        <button
          type="button"
          className="impact-analyze-button"
          disabled={!selectedId || servicesState.error || analysisState.loading}
          onClick={analyzeService}
        >
          {analysisState.loading ? 'Analyzing…' : 'Analyze Impact'}
        </button>
      </div>

      {!analysisState.loading && !analysisState.error && !analysisState.data && (
        <div className="card impact-intro-state">
          <span className="impact-intro-mark" aria-hidden="true">IA</span>
          <h2>Select a service to analyze</h2>
          <p>
            ImpactGraph follows service dependencies across multiple levels to show
            the potential downstream blast radius.
          </p>
        </div>
      )}

      {analysisState.loading && <ImpactAnalysisSkeleton />}

      {analysisState.error && (
        <div className="card error-panel" role="alert">
          <div>
            <p className="error-panel-title">Impact analysis unavailable</p>
            <p className="error-panel-message">We could not analyze this service. Try again when the connection is available.</p>
          </div>
          <button type="button" onClick={analyzeService}>Retry</button>
        </div>
      )}

      {analysisState.data && !analysisState.loading && (
        <div className="impact-results">
          <div className="impact-result-heading">
            <div>
              <p className="eyebrow">Failure source</p>
              <h2>{analysisState.data.service.name}</h2>
            </div>
            <StatusBadge value={analysisState.data.service.criticality} />
          </div>

          <div className="impact-summary-grid" aria-label="Impact summary">
            {[
              ['Affected Services', analysisState.data.summary.affectedServices],
              ['Critical / High Risk', analysisState.data.summary.criticalServices],
              ['Maximum Depth', analysisState.data.summary.maxDepth],
            ].map(([label, value]) => (
              <article className="card impact-metric" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </article>
            ))}
          </div>

          {analysisState.data.summary.affectedServices === 0 ? (
            <div className="card impact-no-results">
              <span aria-hidden="true">✓</span>
              <h2>No downstream impact found</h2>
              <p>No other services currently depend on this service.</p>
            </div>
          ) : (
            <>
              <div className="impact-content-grid">
                <article className="card impact-graph-card">
                  <div className="impact-section-heading">
                    <div>
                      <h2>Blast radius</h2>
                      <p>Failure propagation flows from left to right by minimum depth.</p>
                    </div>
                    <span>{graph.nodes.length} services</span>
                  </div>
                  <div className="impact-flow" aria-label="Impact propagation graph">
                    <ReactFlow
                      nodes={graph.nodes}
                      edges={graph.edges}
                      nodeTypes={nodeTypes}
                      fitView
                      fitViewOptions={{ padding: 0.18 }}
                      minZoom={0.35}
                      maxZoom={1.8}
                      nodesConnectable={false}
                      nodesDraggable={false}
                      elementsSelectable={false}
                    >
                      <Background color="#e2e8f0" gap={24} size={1} />
                      <Controls showInteractive={false} position="bottom-left" />
                    </ReactFlow>
                  </div>
                </article>

                <aside className="card affected-list-card">
                  <div className="impact-section-heading">
                    <div>
                      <h2>Affected services</h2>
                      <p>Unique services grouped by minimum propagation depth.</p>
                    </div>
                  </div>
                  <div className="affected-depth-groups">
                    {affectedGroups.map(([depth, services]) => (
                      <section className="affected-depth-group" key={depth}>
                        <h3>Depth {depth}</h3>
                        <ul>
                          {services.map((service) => (
                            <li key={service.id}>
                              <div>
                                <strong>{service.name}</strong>
                                <span>Depth {service.depth}</span>
                              </div>
                              <StatusBadge value={service.criticality} />
                            </li>
                          ))}
                        </ul>
                      </section>
                    ))}
                  </div>
                </aside>
              </div>

              <article className="card propagation-paths-card">
                <div className="impact-section-heading">
                  <div>
                    <h2>Propagation paths</h2>
                    <p>Representative ways the failure may spread through the system.</p>
                  </div>
                </div>
                <ol className="propagation-path-list">
                  {representativePaths.map((path) => {
                    const key = path.nodes.map((node) => node.id).join('>');
                    return (
                      <li key={key}>
                        {path.nodes.map((node, index) => (
                          <span key={node.id}>
                            {index > 0 && <i aria-hidden="true">→</i>}
                            {node.name}
                          </span>
                        ))}
                      </li>
                    );
                  })}
                </ol>
                {additionalPathCount > 0 && (
                  <p className="additional-paths">+ {additionalPathCount} additional paths</p>
                )}
              </article>
            </>
          )}
        </div>
      )}
    </section>
  );
}

export default ImpactAnalysis;
