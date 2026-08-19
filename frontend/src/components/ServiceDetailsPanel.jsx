import StatusBadge from './StatusBadge';

function RelatedItems({ items, emptyMessage }) {
  if (!items?.length) {
    return <p className="details-empty-list">{emptyMessage}</p>;
  }

  return (
    <ul className="related-list">
      {items.map((item) => (
        <li key={`${item.relationship}-${item.node.id}`}>
          <div>
            <strong>{item.node.name}</strong>
            <span>{item.node.type}</span>
          </div>
          <span className="relationship-label">{item.relationship}</span>
        </li>
      ))}
    </ul>
  );
}

function ServiceDetailsPanel({ selectedService, state, onRetry }) {
  if (!selectedService) {
    return (
      <aside className="card details-panel details-panel-empty">
        <span className="details-empty-mark" aria-hidden="true">SV</span>
        <h2>Select a service</h2>
        <p>
          Choose a service node to inspect its owner, dependencies, and direct
          dependents.
        </p>
      </aside>
    );
  }

  if (state.loading) {
    return (
      <aside className="card details-panel details-skeleton" aria-label="Loading service details">
        <span className="skeleton skeleton-title" />
        <span className="skeleton skeleton-subtitle" />
        {Array.from({ length: 5 }, (_, index) => (
          <span className="skeleton details-skeleton-row" key={index} />
        ))}
      </aside>
    );
  }

  if (state.error) {
    return (
      <aside className="card details-panel details-panel-error" role="alert">
        <h2>Service details unavailable</h2>
        <p>We could not load this service. Check the connection and try again.</p>
        <button type="button" onClick={onRetry}>Retry</button>
      </aside>
    );
  }

  const details = state.data;
  if (!details) return null;

  return (
    <aside className="card details-panel" aria-labelledby="service-details-title">
      <div className="details-header">
        <p className="eyebrow">Service details</p>
        <h2 id="service-details-title">{details.service.name}</h2>
        <div className="badge-group details-badges">
          <StatusBadge value={details.service.status} />
          <StatusBadge value={details.service.criticality} />
        </div>
        <p className="details-description">{details.service.description}</p>
      </div>

      <section className="details-section">
        <h3>Owner</h3>
        {details.owner ? (
          <div className="owner-card">
            <strong>{details.owner.name}</strong>
            <span>{details.owner.email}</span>
          </div>
        ) : (
          <p className="details-empty-list">No owner assigned.</p>
        )}
      </section>

      <section className="details-section">
        <h3>Dependencies</h3>
        <p className="details-section-caption">Resources this service connects to directly.</p>
        <RelatedItems items={details.dependencies} emptyMessage="No direct dependencies." />
      </section>

      <section className="details-section">
        <h3>Direct dependents</h3>
        <p className="details-section-caption">Services that directly rely on this service.</p>
        <RelatedItems items={details.dependents} emptyMessage="No direct dependents." />
      </section>
    </aside>
  );
}

export default ServiceDetailsPanel;
