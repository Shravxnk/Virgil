'use client';

import { useCallback, useMemo } from 'react';
import ReactFlow, {
  Background,
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
import { cn, formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Building2, CreditCard, Smartphone } from 'lucide-react';

function AccountNode({ data }: { data: GNode & { selected?: boolean } }) {
  const Icon =
    data.type === 'account'
      ? User
      : data.type === 'entity'
      ? Building2
      : data.type === 'device'
      ? Smartphone
      : CreditCard;

  return (
    <div
      className={cn(
        'relative rounded-xl border-2 bg-card px-4 py-3 shadow-md transition-all min-w-[140px]',
        data.risk_score >= 80
          ? 'border-red-500 shadow-red-500/20'
          : data.risk_score >= 60
          ? 'border-orange-500 shadow-orange-500/20'
          : data.risk_score >= 30
          ? 'border-yellow-500 shadow-yellow-500/20'
          : 'border-green-500 shadow-green-500/20',
        data.flagged && 'ring-2 ring-red-400 ring-offset-2 ring-offset-background',
      )}
    >
      <Handle type="target" position={Position.Left} className="!bg-muted-foreground" />
      <Handle type="source" position={Position.Right} className="!bg-muted-foreground" />
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <div>
          <p className="text-xs font-semibold">{data.label}</p>
          <p className="text-[10px] text-muted-foreground">{data.id}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-1.5">
        <span
          className={cn(
            'text-xs font-bold',
            data.risk_score >= 80
              ? 'text-red-600'
              : data.risk_score >= 60
              ? 'text-orange-600'
              : data.risk_score >= 30
              ? 'text-yellow-600'
              : 'text-green-600',
          )}
        >
          Risk: {data.risk_score}
        </span>
        {data.flagged && (
          <Badge variant="destructive" className="text-[9px] h-4 px-1">
            Flagged
          </Badge>
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
  const nodeCount = graph.nodes.length;
  const radius = Math.max(250, nodeCount * 40);

  graph.nodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / nodeCount - Math.PI / 2;
    positions.set(node.id, {
      x: radius * Math.cos(angle) + radius + 100,
      y: radius * Math.sin(angle) + radius + 100,
    });
  });

  return positions;
}

interface FraudNetworkProps {
  data: GraphData;
  className?: string;
}

export function FraudNetwork({ data, className }: FraudNetworkProps) {
  const positions = useMemo(() => buildLayout(data), [data]);

  const initialNodes: Node[] = useMemo(
    () =>
      data.nodes.map((node) => ({
        id: node.id,
        type: node.type || 'account',
        position: positions.get(node.id) || { x: 0, y: 0 },
        data: node,
      })),
    [data.nodes, positions],
  );

  const initialEdges: Edge[] = useMemo(
    () =>
      data.edges.map((edge, i) => ({
        id: `e-${i}`,
        source: edge.source,
        target: edge.target,
        label: edge.amount ? formatCurrency(edge.amount) : edge.label,
        labelBgStyle: { fill: 'hsl(var(--card))', fillOpacity: 0.8 },
        labelStyle: { fontSize: 10, fill: 'hsl(var(--foreground))' },
        animated: edge.suspicious,
        style: {
          stroke: edge.suspicious ? '#ef4444' : 'hsl(var(--muted-foreground))',
          strokeWidth: edge.suspicious ? 2.5 : 1.5,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: edge.suspicious ? '#ef4444' : 'hsl(var(--muted-foreground))',
        },
      })),
    [data.edges],
  );

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">Fraud Network Graph</CardTitle>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-red-500" /> Suspicious
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-500" /> Normal
            </span>
            <span>{data.clusters.length} cluster(s)</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-[500px] w-full rounded-b-lg overflow-hidden">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.3}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={20} size={1} />
            <Controls />
            <MiniMap
              nodeColor={(n) => {
                const risk = n.data?.risk_score ?? 0;
                return risk >= 80 ? '#ef4444' : risk >= 60 ? '#f97316' : risk >= 30 ? '#eab308' : '#22c55e';
              }}
              maskColor="hsl(var(--background) / 0.7)"
            />
          </ReactFlow>
        </div>
      </CardContent>
    </Card>
  );
}
