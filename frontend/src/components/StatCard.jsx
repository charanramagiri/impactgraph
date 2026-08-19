function StatCard({ label, value, abbreviation }) {
  return (
    <article className="card stat-card">
      <div className="stat-card-heading">
        <span className="stat-card-mark" aria-hidden="true">
          {abbreviation}
        </span>
        <span className="stat-card-label">{label}</span>
      </div>
      <strong className="stat-card-value">{value}</strong>
    </article>
  );
}

export default StatCard;
