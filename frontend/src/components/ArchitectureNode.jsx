import { Handle, Position } from '@xyflow/react';
import StatusBadge from './StatusBadge';

const typeLabels = {
  Service: 'Service',
  Database: 'Database',
  ExternalAPI: 'External API',
  Team: 'Team',
};

const typeMarks = {
  Service: 'SV',
  Database: 'DB',
  ExternalAPI: 'API',
  Team: 'TM',
};

function ArchitectureNode({ data }) {
  const stateClasses = [
    'architecture-node',
    `architecture-node-${data.type.toLowerCase()}`,
    data.isSelected ? 'architecture-node-selected' : '',
    data.isDimmed ? 'architecture-node-dimmed' : '',
    data.type === 'Service' ? 'architecture-node-clickable' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={stateClasses}>
      <Handle type="target" position={Position.Left} className="node-handle" />
      <div className="architecture-node-heading">
        <span className="architecture-node-mark" aria-hidden="true">
          {typeMarks[data.type]}
        </span>
        <span className="architecture-node-type">{typeLabels[data.type]}</span>
      </div>
      <strong className="architecture-node-name">{data.name}</strong>
      {data.type === 'Service' && (
        <div className="architecture-node-badges">
          <StatusBadge value={data.status} />
          <StatusBadge value={data.criticality} />
        </div>
      )}
      <Handle type="source" position={Position.Right} className="node-handle" />
    </div>
  );
}

export default ArchitectureNode;
