function ImpactAnalysisSkeleton() {
  return (
    <div className="impact-results" aria-label="Analyzing service impact" role="status">
      <span className="visually-hidden">Analyzing service impact</span>
      <div className="impact-summary-grid">
        {Array.from({ length: 3 }, (_, index) => (
          <div className="card impact-metric impact-metric-skeleton" key={index}>
            <span className="skeleton skeleton-subtitle" />
            <span className="skeleton skeleton-title" />
          </div>
        ))}
      </div>
      <div className="impact-content-grid">
        <div className="card impact-graph-skeleton">
          <span className="skeleton skeleton-title" />
          <span className="skeleton impact-skeleton-canvas" />
        </div>
        <div className="card impact-list-skeleton">
          <span className="skeleton skeleton-title" />
          {Array.from({ length: 5 }, (_, index) => (
            <span className="skeleton details-skeleton-row" key={index} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default ImpactAnalysisSkeleton;
