function ExplorerSkeleton() {
  return (
    <div className="explorer-workspace" role="status" aria-label="Loading architecture">
      <span className="visually-hidden">Loading architecture graph</span>
      <div className="card graph-card explorer-skeleton-canvas">
        {Array.from({ length: 12 }, (_, index) => (
          <span className={`skeleton graph-node-skeleton graph-node-${index}`} key={index} />
        ))}
      </div>
      <div className="card details-panel details-skeleton">
        <span className="skeleton skeleton-title" />
        <span className="skeleton skeleton-subtitle" />
        {Array.from({ length: 5 }, (_, index) => (
          <span className="skeleton details-skeleton-row" key={index} />
        ))}
      </div>
    </div>
  );
}

export default ExplorerSkeleton;
