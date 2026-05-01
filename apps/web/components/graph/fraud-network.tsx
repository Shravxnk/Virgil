// components/graph/fraud-network.tsx
'use client';

import { useCallback, useMemo } from 'react';
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Node,
  Edge,
  NodeTypes,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { GraphData, GraphNode as GNode } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { User, Building2, CreditCard, Smartphone } from 'lucide-react';

function riskColor(score: number) {
  if (score >= 80) return '#EF4444';
  if (score >= 60) return '#F97316';
  if (score >= 30) return '#F59E0B';
  return '#22C55E';
}

function AccountNode({ data }: { data: GNode & { selected?: boolean } }) {
  const Icon =
    data.type === 'account' ? User :
    data.type === 'entity' ? Building2 :
    data.type === 'device' ? Smartphone : CreditCard;

  const color = riskColor(data.risk_score);

  return (
    <div
      className="relative rounded-full flex items-center justify-center"
      style={{
        width: 72,
        height: 72,
        background: `radial-gradient(circle at 40% 40%, #1A2235, #0A0F1E)`,
        border: `2px solid ${color}`,
        boxShadow: data.flagged ? `0 0 18px ${color}60, 0 0 6px ${color}40` : `0 0 8px ${color}30`,
      }}
    >
      {data.flagged && (
        <div
          className="absolute inset-0 rounded-full animate-ping"
          style={{ border: `1.5px solid ${color}`, animationDuration: '1.5s', opacity: 0.4 }}
        />
      )}
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      <div className="flex flex-col items-center gap-0.5">
        <Icon className="h-4 w-4" style={{ color }} />
        <span className="text-[9px] font-mono leading-none" style={{ color }}>{data.risk_score}</span>
      </div>
      {/* Label below */}
      <div
        className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-center"
        style={{ minWidth: 80 }}
      >
        <p className="text-[10px] font-medium truncate max-w-[90px]" style={{ color: '#F0F4FF' }}>{data.label}</p>
        {data.flagged && (
          <span className="text-[9px] font-mono" style={{ color: '#EF4444' }}>FLAGGED</span>
        )}
      </div>
    </div>
  );
}

const nodeTypes: NodeTypes = {
  account: AccountNode,
  entity: AccountNode,
  device: AccountNode,
  transaction: AccountNode,
};

function buildLayout(graph: GraphData) {
  const positions = new Map<string, { x: number; y: number }>();
  const flagged = graph.nodes.filter((n) => n.flagged || n.risk_score >= 60);
  const normal = graph.nodes.filter((n) => !n.flagged && n.risk_score < 60);
  const innerRadius = Math.max(180, flagged.length * 55);
  const outerRadius = innerRadius + Math.max(200, normal.length * 45);
  const cx = outerRadius + 100;
  const cy = outerRadius + 100;

  flagged.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / Math.max(flagged.length, 1) - Math.PI / 2;
    positions.set(node.id, { x: innerRadius * Math.cos(angle) + cx, y: innerRadius * Math.sin(angle) + cy });
  });
  normal.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / Math.max(normal.length, 1) - Math.PI / 2;
    positions.set(node.id, { x: outerRadius * Math.cos(angle) + cx, y: outerRadius * Math.sin(angle) + cy });
  });

  return positions;
}

interface FraudNetworkProps {
  data: GraphData;
  className?: string;
}

export function FraudNetwork({ data, className }: FraudNetworkProps) {
  const positions = useMemo(() => buildLayout(data), [data]);
  const suspiciousCount = data.nodes.filter((n) => n.flagged || n.risk_score >= 60).length;
  const normalCount = data.nodes.length - suspiciousCount;

  const initialNodes: Node[] = useMemo(
    () => data.nodes.map((node) => ({
      id: node.id,
      type: node.type || 'account',
      position: positions.get(node.id) || { x: 0, y: 0 },
      data: node,
    })),
    [data.nodes, positions],
  );

  const initialEdges: Edge[] = useMemo(
    () => data.edges.map((edge, i) => ({
      id: `e-${i}`,
      source: edge.source,
      target: edge.target,
      label: edge.amount ? formatCurrency(edge.amount) : edge.label,
      labelBgStyle: { fill: '#0A0F1E', fillOpacity: 0.85 },
      labelStyle: { fontSize: 9, fill: '#8899BB' },
      animated: edge.suspicious,
      style: {
        stroke: edge.suspicious ? '#EF4444' : '#1E2D45',
        strokeWidth: edge.suspicious ? 2 : 1,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: edge.suspicious ? '#EF4444' : '#1E2D45',
      },
    })),
    [data.edges],
  );

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  return (
    <div
      className={`rounded overflow-hidden ${className || ''}`}
      style={{ backgroundColor: '#080D18', border: '1px solid #1E2D45' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #1E2D45' }}>
        <p className="text-xs font-semibold tracking-wide uppercase" style={{ color: '#8899BB' }}>
          Fraud Network Graph
        </p>
        <div className="flex items-center gap-4 text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: '#EF4444', boxShadow: '0 0 6px #EF4444' }} />
            <span style={{ color: '#8899BB' }}>Suspicious ({suspiciousCount})</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: '#22C55E' }} />
            <span style={{ color: '#8899BB' }}>Normal ({normalCount})</span>
          </span>
          <span style={{ color: '#4A5F80' }}>{data.edges.length} txn · {data.clusters.length} cluster</span>
        </div>
      </div>

      <div className="h-[500px] w-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          minZoom={0.3}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#1E2D45" />
          <Controls />
          <MiniMap
            nodeColor={(n) => riskColor(n.data?.risk_score ?? 0)}
            maskColor="#0A0F1E80"
          />
        </ReactFlow>
      </div>
    </div>
  );
}

