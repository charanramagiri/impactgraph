import { Handle, Position } from '@xyflow/react';
import StatusBadge from './StatusBadge';

function ImpactNode({ data }) {
  return (
    <div className={`impact-node ${data.isRoot ? 'impact-node-root' : 'impact-node-affected'}`}>
      <Handle type="target" position={Position.Left} className="node-handle" />
      <span className="impact-node-label">
        {data.isRoot ? 'Failure source' : `Depth ${data.depth}`}
      </span>
      <strong>{data.name}</strong>
      <div className="impact-node-badges">
        {data.isRoot ? (
          <StatusBadge value={data.status} />
        ) : (
          <StatusBadge value={data.criticality} />
        )}
      </div>
      <Handle type="source" position={Position.Right} className="node-handle" />
    </div>
  );
}

export default ImpactNode;
