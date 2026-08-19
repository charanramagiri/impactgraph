import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import ArchitectureNode from '../components/ArchitectureNode';
import ExplorerSkeleton from '../components/ExplorerSkeleton';
import ServiceDetailsPanel from '../components/ServiceDetailsPanel';
import api from '../services/api';

const nodeTypes = { architecture: ArchitectureNode };
const edgeColors = {
  DEPENDS_ON: '#64748b',
  USES: '#2563eb',
  CALLS: '#7c3aed',
  OWNS: '#16865b',
};

function layoutGraph(graphNodes) {
  const grouped = graphNodes.reduce((groups, node) => {
    if (!groups[node.type]) {
      groups[node.type] = [];
    }

    groups[node.type].push(node);
    return groups;
  }, {});
  const sortByName = (nodes = []) =>
    [...nodes].sort((first, second) =>
      first.name.localeCompare(second.name, undefined, { sensitivity: 'base' })
    );
  const positions = new Map();

  sortByName(grouped.Team).forEach((node, index) => {
    positions.set(node.id, { x: 0, y: index * 190 });
  });
  sortByName(grouped.Service).forEach((node, index) => {
    positions.set(node.id, {
      x: 320 + (index % 3) * 285,
      y: Math.floor(index / 3) * 165,
    });
  });
  sortByName(grouped.Database).forEach((node, index) => {
    positions.set(node.id, { x: 1220, y: index * 210 });
  });
  sortByName(grouped.ExternalAPI).forEach((node, index) => {
    positions.set(node.id, { x: 1220, y: 900 + index * 210 });
  });

  return graphNodes.map((node) => ({
    id: node.id,
    type: 'architecture',
    position: positions.get(node.id),
    data: node,
    draggable: false,
  }));
}

function Explorer() {
  const [graphState, setGraphState] = useState({ loading: true, error: false, data: null });
  const [graphVersion, setGraphVersion] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [detailState, setDetailState] = useState({ loading: false, error: false, data: null });
  const [detailVersion, setDetailVersion] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [flowInstance, setFlowInstance] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadGraph() {
      setGraphState((current) => ({ ...current, loading: true, error: false }));
      try {
        const response = await api.get('/graph', { signal: controller.signal });
        setGraphState({ loading: false, error: false, data: response.data });
      } catch (error) {
        if (!controller.signal.aborted) {
          setGraphState({ loading: false, error: true, data: null });
        }
      }
    }

    loadGraph();
    return () => controller.abort();
  }, [graphVersion]);

  useEffect(() => {
    if (!selectedId) {
      setDetailState({ loading: false, error: false, data: null });
      return undefined;
    }

    const controller = new AbortController();
    async function loadDetails() {
      setDetailState({ loading: true, error: false, data: null });
      try {
        const response = await api.get(`/services/${selectedId}`, {
          signal: controller.signal,
        });
        setDetailState({ loading: false, error: false, data: response.data });
      } catch (error) {
        if (!controller.signal.aborted) {
          setDetailState({ loading: false, error: true, data: null });
        }
      }
    }

    loadDetails();
    return () => controller.abort();
  }, [selectedId, detailVersion]);

  const baseNodes = useMemo(
    () => layoutGraph(graphState.data?.nodes || []),
    [graphState.data]
  );
  const connectedIds = useMemo(() => {
    if (!selectedId) return new Set();
    const ids = new Set([selectedId]);
    graphState.data?.edges.forEach((edge) => {
      if (edge.source === selectedId) ids.add(edge.target);
      if (edge.target === selectedId) ids.add(edge.source);
    });
    return ids;
  }, [graphState.data, selectedId]);
  const flowNodes = useMemo(
    () =>
      baseNodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          isSelected: node.id === selectedId,
          isDimmed: Boolean(selectedId && !connectedIds.has(node.id)),
        },
      })),
    [baseNodes, connectedIds, selectedId]
  );
  const flowEdges = useMemo(
    () =>
      (graphState.data?.edges || []).map((edge) => {
        const isConnected = edge.source === selectedId || edge.target === selectedId;
        return {
          ...edge,
          type: 'smoothstep',
          label: selectedId && isConnected ? edge.type.replace('_', ' ') : undefined,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: edgeColors[edge.type],
            width: 16,
            height: 16,
          },
          style: {
            stroke: edgeColors[edge.type],
            strokeWidth: isConnected ? 2.2 : 1.15,
            opacity: selectedId ? (isConnected ? 0.95 : 0.1) : 0.28,
          },
          labelStyle: { fill: '#344054', fontSize: 10, fontWeight: 700 },
          labelBgStyle: { fill: '#ffffff', fillOpacity: 0.9 },
        };
      }),
    [graphState.data, selectedId]
  );
  const serviceNodes = useMemo(
    () => baseNodes.filter((node) => node.data.type === 'Service'),
    [baseNodes]
  );
  const searchMatches = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];
    return serviceNodes
      .filter((node) => node.data.name.toLowerCase().includes(query))
      .slice(0, 6);
  }, [searchQuery, serviceNodes]);

  const selectService = useCallback(
    (node) => {
      setSelectedId(node.id);
      setSearchQuery('');
      if (flowInstance) {
        flowInstance.setCenter(node.position.x + 110, node.position.y + 55, {
          zoom: 1.15,
          duration: 500,
        });
      }
    },
    [flowInstance]
  );

  const resetView = () => {
    setSelectedId(null);
    setSearchQuery('');
    flowInstance?.fitView({ padding: 0.12, duration: 500 });
  };

  return (
    <section className="page-section explorer-page" aria-labelledby="explorer-title">
      <div className="explorer-header">
        <div className="page-heading">
          <p className="eyebrow">Architecture</p>
          <h1 id="explorer-title">Architecture Explorer</h1>
          <p className="page-description">
            Explore services, infrastructure, ownership, and direct dependencies.
          </p>
        </div>

        <div className="explorer-toolbar">
          <div className="service-search">
            <label htmlFor="service-search">Search services</label>
            <input
              id="service-search"
              type="search"
              placeholder="Search services..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              autoComplete="off"
            />
            {searchQuery.trim() && (
              <div className="search-results">
                {searchMatches.length ? (
                  searchMatches.map((node) => (
                    <button type="button" key={node.id} onClick={() => selectService(node)}>
                      <span>{node.data.name}</span>
                      <small>{node.data.criticality}</small>
                    </button>
                  ))
                ) : (
                  <p>No matching services.</p>
                )}
              </div>
            )}
          </div>
          <button className="button-secondary" type="button" onClick={resetView}>
            Reset view
          </button>
        </div>
      </div>

      {graphState.loading && <ExplorerSkeleton />}

      {graphState.error && (
        <div className="card error-panel" role="alert">
          <div>
            <p className="error-panel-title">Architecture graph unavailable</p>
            <p className="error-panel-message">
              We could not load the system architecture. Check the connection and try again.
            </p>
          </div>
          <button type="button" onClick={() => setGraphVersion((version) => version + 1)}>
            Retry
          </button>
        </div>
      )}

      {!graphState.loading && !graphState.error && !graphState.data?.nodes?.length && (
        <div className="card empty-state explorer-empty-state">
          <h2>No architecture data found</h2>
          <p>The graph is connected, but there are no components to display.</p>
        </div>
      )}

      {!graphState.loading && !graphState.error && graphState.data?.nodes?.length > 0 && (
        <div className="explorer-workspace">
          <div className="card graph-card">
            <ReactFlow
              nodes={flowNodes}
              edges={flowEdges}
              nodeTypes={nodeTypes}
              onInit={setFlowInstance}
              onNodeClick={(event, node) => {
                if (node.data.type === 'Service') selectService(node);
              }}
              onPaneClick={() => setSelectedId(null)}
              fitView
              fitViewOptions={{ padding: 0.12 }}
              minZoom={0.2}
              maxZoom={1.8}
              nodesConnectable={false}
              elementsSelectable
              proOptions={{ hideAttribution: true }}
            >
              <Background color="#d5dbe3" gap={24} size={1} />
              <Controls showInteractive={false} position="bottom-left" />
            </ReactFlow>

            <div className="graph-legend" aria-label="Graph legend">
              {['Service', 'Database', 'External API', 'Team'].map((type) => (
                <span key={type}>
                  <i className={`legend-dot legend-${type.toLowerCase().replace(' ', '-')}`} />
                  {type}
                </span>
              ))}
            </div>
          </div>

          <ServiceDetailsPanel
            selectedService={selectedId}
            state={detailState}
            onRetry={() => setDetailVersion((version) => version + 1)}
          />
        </div>
      )}
    </section>
  );
}

export default Explorer;
