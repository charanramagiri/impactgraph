function StatusBadge({ value }) {
  const label = value || 'Unknown';
  const modifier = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  return <span className={`badge badge-${modifier}`}>{label}</span>;
}

export default StatusBadge;
