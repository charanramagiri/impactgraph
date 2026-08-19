function DashboardSkeleton() {
  return (
    <div className="dashboard-content" aria-label="Loading dashboard" role="status">
      <span className="visually-hidden">Loading dashboard data</span>

      <div className="stats-grid">
        {Array.from({ length: 5 }, (_, index) => (
          <div className="card stat-card skeleton-card" key={index}>
            <span className="skeleton skeleton-label" />
            <span className="skeleton skeleton-value" />
          </div>
        ))}
      </div>

      <div className="dashboard-grid">
        {[3, 3].map((rowCount, sectionIndex) => (
          <section className="card dashboard-panel" key={sectionIndex}>
            <span className="skeleton skeleton-title" />
            <span className="skeleton skeleton-subtitle" />
            <div className="skeleton-list">
              {Array.from({ length: rowCount }, (_, rowIndex) => (
                <div className="skeleton-row" key={rowIndex}>
                  <span className="skeleton skeleton-row-title" />
                  <span className="skeleton skeleton-row-meta" />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export default DashboardSkeleton;
