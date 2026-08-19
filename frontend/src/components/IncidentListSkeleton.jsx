function IncidentListSkeleton() {
  return (
    <div className="incidents-layout" aria-label="Loading incidents">
      <aside className="card incident-browser-list incident-list-skeleton">
        <span className="skeleton skeleton-title" />
        {Array.from({ length: 5 }, (_, index) => (
          <div className="incident-browser-skeleton-row" key={index}>
            <span className="skeleton skeleton-subtitle" />
            <span className="skeleton details-skeleton-row" />
          </div>
        ))}
      </aside>
      <div className="card incident-detail-skeleton">
        <span className="skeleton skeleton-title" />
        <span className="skeleton skeleton-subtitle" />
        <span className="skeleton incident-skeleton-block" />
      </div>
    </div>
  );
}

export default IncidentListSkeleton;
