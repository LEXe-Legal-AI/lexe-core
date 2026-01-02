import { useCallback, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MarkerType,
  NodeTypes,
  Handle,
  Position,
  type NodeProps,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Brain,
  User,
  MessageSquare,
  Database,
  Layers,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';

// Re-export for external usage if needed
export { ZoomIn, ZoomOut, Maximize2 };
import { cn } from '@/lib/utils';
import { MemoryLayer } from '@/types';

/**
 * Memory node data structure
 */
export interface MemoryNodeData {
  id: string;
  label: string;
  layer: MemoryLayer;
  content?: string;
  confidence?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Memory edge data structure
 */
export interface MemoryEdgeData {
  id: string;
  source: string;
  target: string;
  relation: string;
  weight?: number;
}

export interface MemoryGraphProps {
  /** Nodes for the graph */
  nodes: MemoryNodeData[];
  /** Edges/relations between nodes */
  edges: MemoryEdgeData[];
  /** Callback when node is clicked */
  onNodeClick?: (node: MemoryNodeData) => void;
  /** Callback when edge is clicked */
  onEdgeClick?: (edge: MemoryEdgeData) => void;
  /** Show minimap */
  showMinimap?: boolean;
  /** Show controls */
  showControls?: boolean;
  /** Enable editing */
  editable?: boolean;
  /** Additional class names */
  className?: string;
}

const layerColors: Record<MemoryLayer, string> = {
  [MemoryLayer.L0_SESSION]: '#3B82F6', // blue
  [MemoryLayer.L1_CONVERSATION]: '#22C55E', // green
  [MemoryLayer.L2_USER]: '#EAB308', // yellow
  [MemoryLayer.L3_SEMANTIC]: '#A855F7', // purple
  [MemoryLayer.L4_GRAPH]: '#00A896', // leo-accent (teal)
};

const layerIcons: Record<MemoryLayer, React.ReactNode> = {
  [MemoryLayer.L0_SESSION]: <MessageSquare className="w-3 h-3" />,
  [MemoryLayer.L1_CONVERSATION]: <MessageSquare className="w-3 h-3" />,
  [MemoryLayer.L2_USER]: <User className="w-3 h-3" />,
  [MemoryLayer.L3_SEMANTIC]: <Brain className="w-3 h-3" />,
  [MemoryLayer.L4_GRAPH]: <Database className="w-3 h-3" />,
};

/**
 * Custom node component for memory facts
 */
function MemoryNode({ data, selected }: NodeProps<MemoryNodeData>) {
  const color = layerColors[data.layer];
  const icon = layerIcons[data.layer];
  const confidenceWidth = data.confidence ? `${data.confidence * 100}%` : '0%';

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'relative min-w-[140px] max-w-[200px]',
        'rounded-xl overflow-hidden',
        'backdrop-blur-xl border-2 transition-all duration-200',
        selected
          ? 'border-leo-secondary shadow-lg shadow-leo-secondary/30'
          : 'border-white/10 hover:border-white/20'
      )}
      style={{
        backgroundColor: `${color}15`,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 border-b border-white/10"
        style={{ borderColor: `${color}30` }}
      >
        <span style={{ color }}>{icon}</span>
        <span className="text-[10px] font-semibold text-white truncate">
          {data.label}
        </span>
      </div>

      {/* Content */}
      {data.content && (
        <div className="px-3 py-2">
          <p className="text-[11px] text-white/70 line-clamp-2">{data.content}</p>
        </div>
      )}

      {/* Confidence Bar */}
      {data.confidence !== undefined && (
        <div className="h-1 bg-black/20">
          <div
            className="h-full transition-all duration-300"
            style={{
              width: confidenceWidth,
              backgroundColor: color,
            }}
          />
        </div>
      )}

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2 !h-2 !bg-white/30 !border-white/50"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2 !h-2 !bg-white/30 !border-white/50"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!w-2 !h-2 !bg-white/30 !border-white/50"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!w-2 !h-2 !bg-white/30 !border-white/50"
      />
    </motion.div>
  );
}

const nodeTypes: NodeTypes = {
  memory: MemoryNode,
};

/**
 * MemoryGraph - Visualizes memory relations with React Flow
 *
 * Features:
 * - Interactive node graph
 * - Layer-based coloring
 * - Confidence indicators
 * - Pan/zoom controls
 * - Minimap navigation
 * - Edge relation labels
 *
 * @example
 * ```tsx
 * <MemoryGraph
 *   nodes={[
 *     { id: '1', label: 'User', layer: MemoryLayer.L2_USER, content: 'User preferences' },
 *     { id: '2', label: 'Topic', layer: MemoryLayer.L3_SEMANTIC, content: 'Dark mode' },
 *   ]}
 *   edges={[
 *     { id: 'e1', source: '1', target: '2', relation: 'prefers' },
 *   ]}
 *   showMinimap
 *   showControls
 * />
 * ```
 */
export function MemoryGraph({
  nodes: inputNodes,
  edges: inputEdges,
  onNodeClick,
  onEdgeClick,
  showMinimap = true,
  showControls = true,
  editable = false,
  className,
}: MemoryGraphProps) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // Convert input data to React Flow format
  const initialNodes: Node<MemoryNodeData>[] = useMemo(
    () =>
      inputNodes.map((node, index) => ({
        id: node.id,
        type: 'memory',
        position: calculateNodePosition(index, inputNodes.length),
        data: node,
        selected: node.id === selectedNode,
      })),
    [inputNodes, selectedNode]
  );

  const initialEdges: Edge[] = useMemo(
    () =>
      inputEdges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.relation,
        labelStyle: {
          fill: 'rgba(255,255,255,0.6)',
          fontSize: 10,
          fontFamily: 'var(--font-mono)',
        },
        labelBgStyle: {
          fill: 'rgba(0,0,0,0.5)',
          fillOpacity: 0.8,
        },
        labelBgPadding: [4, 2] as [number, number],
        labelBgBorderRadius: 4,
        style: {
          stroke: 'rgba(255,255,255,0.2)',
          strokeWidth: edge.weight ? Math.max(1, edge.weight * 3) : 1,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: 'rgba(255,255,255,0.3)',
          width: 15,
          height: 15,
        },
        animated: edge.weight && edge.weight > 0.7,
      })),
    [inputEdges]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => {
      if (editable) {
        setEdges((eds) =>
          addEdge(
            {
              ...params,
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: 'rgba(255,255,255,0.3)',
              },
            },
            eds
          )
        );
      }
    },
    [editable, setEdges]
  );

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node<MemoryNodeData>) => {
      setSelectedNode(node.id);
      onNodeClick?.(node.data);
    },
    [onNodeClick]
  );

  const handleEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      const originalEdge = inputEdges.find((e) => e.id === edge.id);
      if (originalEdge) {
        onEdgeClick?.(originalEdge);
      }
    },
    [inputEdges, onEdgeClick]
  );

  const resetView = useCallback(() => {
    setNodes(initialNodes);
    setSelectedNode(null);
  }, [initialNodes, setNodes]);

  if (inputNodes.length === 0) {
    return (
      <div className={cn('flex items-center justify-center h-full p-8', className)}>
        <div className="text-center">
          <Layers className="w-12 h-12 text-white/20 mx-auto mb-3" />
          <p className="text-sm text-white/40 font-body">No graph data available</p>
          <p className="text-xs text-white/30 mt-1">
            Memory L4 graph will appear here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative h-full w-full', className)}>
      {/* Custom Toolbar */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
        <button
          onClick={resetView}
          className={cn(
            'p-1.5 rounded-lg transition-colors',
            'bg-black/40 backdrop-blur-sm border border-white/10',
            'text-white/60 hover:text-white hover:bg-black/60'
          )}
          title="Reset view"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Layer Legend */}
      <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
        {Object.entries(layerColors).map(([layer, color]) => (
          <div
            key={layer}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded',
              'bg-black/40 backdrop-blur-sm border border-white/10',
              'text-[10px]'
            )}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-white/60">L{layer}</span>
          </div>
        ))}
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{
          padding: 0.2,
          maxZoom: 1.5,
        }}
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          animated: false,
        }}
        proOptions={{ hideAttribution: true }}
        className="bg-transparent"
      >
        <Background color="rgba(255,255,255,0.03)" gap={20} size={1} />
        {showControls && (
          <Controls
            className={cn(
              '[&>button]:bg-black/40 [&>button]:backdrop-blur-sm',
              '[&>button]:border-white/10 [&>button]:text-white/60',
              '[&>button:hover]:bg-black/60 [&>button:hover]:text-white'
            )}
          />
        )}
        {showMinimap && (
          <MiniMap
            nodeColor={(node) => layerColors[(node.data as MemoryNodeData).layer]}
            maskColor="rgba(0,0,0,0.8)"
            className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-lg"
            style={{ backgroundColor: 'transparent' }}
          />
        )}
      </ReactFlow>

      {/* Selected Node Info */}
      {selectedNode && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'absolute bottom-2 left-2 right-2 z-10',
            'p-3 rounded-xl',
            'bg-black/60 backdrop-blur-xl border border-white/10'
          )}
        >
          {(() => {
            const node = inputNodes.find((n) => n.id === selectedNode);
            if (!node) return null;
            const color = layerColors[node.layer];
            return (
              <div className="flex items-start gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${color}30` }}
                >
                  <span style={{ color }}>{layerIcons[node.layer]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-semibold text-white">{node.label}</h4>
                  {node.content && (
                    <p className="text-[11px] text-white/60 mt-0.5 line-clamp-2">
                      {node.content}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-white/40">
                    <span>Layer: L{node.layer}</span>
                    {node.confidence !== undefined && (
                      <span>Confidence: {Math.round(node.confidence * 100)}%</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </motion.div>
      )}
    </div>
  );
}

/**
 * Calculate node position in a circular layout
 */
function calculateNodePosition(
  index: number,
  total: number
): { x: number; y: number } {
  const radius = Math.max(150, total * 30);
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
  return {
    x: Math.cos(angle) * radius + radius,
    y: Math.sin(angle) * radius + radius,
  };
}

export default MemoryGraph;
