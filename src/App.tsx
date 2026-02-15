import { useState, useCallback, useEffect, createContext, useContext, useMemo, useRef } from "react";
import { Background, ReactFlow, ReactFlowProvider, useNodesState, useEdgesState, addEdge, Connection, OnConnectStartParams, Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import DatabaseSchemaDemo from "./components/DatabaseSchemaDemo";
import CompactCollectionNode from "./components/CompactCollectionNode";
import GroupNode from "./components/GroupNode";
import { GroupingHandler } from "./components/GroupingHandler";
import { RectangleDrawer } from "./components/RectangleDrawer";
import { RecommendationsPanel } from "./components/RecommendationsPanel";
import schemaData from "./data/schema.json";
import { loadSchemaFromJSON } from "./lib/schemaLoader";

// Create Context to share state
interface ModeContextType {
  isRelationshipMode: boolean;
  isReorderMode: boolean;
  isHoverMode: boolean;
  selectedHandle: { nodeId: string; handleId: string; type: "target" | "source" } | null;
  setSelectedHandle: (handle: { nodeId: string; handleId: string; type: "target" | "source" } | null) => void;
  isFieldDragging: boolean;
  setIsFieldDragging: (isDragging: boolean) => void;
}

const ModeContext = createContext<ModeContextType>({
  isRelationshipMode: false,
  isReorderMode: false,
  isHoverMode: false,
  selectedHandle: null,
  setSelectedHandle: () => {},
  isFieldDragging: false,
  setIsFieldDragging: () => {},
});

export const useMode = () => useContext(ModeContext);

const nodeTypes = {
  databaseSchema: DatabaseSchemaDemo,
  group: GroupNode,
  collectionCompact: CompactCollectionNode,
};

// Load schema from JSON file
const { nodes: defaultNodes, edges: defaultEdges } = loadSchemaFromJSON(schemaData as any);

function FlowContent() {
  const [nodes, setNodes, onNodesChange] = useNodesState(defaultNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(defaultEdges);
  const [isRelationshipMode, setIsRelationshipMode] = useState(false);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [isHoverMode, setIsHoverMode] = useState(false);
  const [selectedHandle, setSelectedHandle] = useState<{ nodeId: string; handleId: string; type: "target" | "source" } | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasClickedNode, setHasClickedNode] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [showInitialTooltip, setShowInitialTooltip] = useState(false);
  const [isFieldDragging, setIsFieldDragging] = useState(false);
  const [isGroupingMode, setIsGroupingMode] = useState(false);
  const [groupCounter, setGroupCounter] = useState(1);
  const [isDrawingRectangle, setIsDrawingRectangle] = useState(false);
  const [rectangleStart, setRectangleStart] = useState<{ x: number; y: number } | null>(null);
  const [rectangleEnd, setRectangleEnd] = useState<{ x: number; y: number } | null>(null);
  const [isRecommendationsPanelOpen, setIsRecommendationsPanelOpen] = useState(false);
  const [isGroupsOnly, setIsGroupsOnly] = useState(false);
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set());
  const lastOrdersWidthRef = useRef<number | null>(null);

  useEffect(() => {
    if (isGroupsOnly) return;
    const raf = requestAnimationFrame(() => {
      const productsEl = document.querySelector('[data-id="1"]') as HTMLElement | null;
      if (!productsEl) return;
      const width = Math.round(productsEl.getBoundingClientRect().width);
      if (!width || lastOrdersWidthRef.current === width) return;
      lastOrdersWidthRef.current = width;
      setNodes((current) =>
        current.map((node) =>
          node.id === "4"
            ? {
                ...node,
                style: {
                  ...(node.style || {}),
                  width,
                },
              }
            : node,
        ),
      );
    });
    return () => cancelAnimationFrame(raf);
  }, [isGroupsOnly, setNodes, nodes.length]);

  const viewNodes = useMemo(() => {
    const compactWidth = 240;
    const compactHeight = 80;
    const compactPadding = 16;
    const groupHeaderHeight = 28;
    const compactGapX = 20;
    const compactGapY = 16;

    const compactNodes = isGroupsOnly
      ? nodes.map((node) => {
          if (node.type === "databaseSchema") {
            const isExpanded = expandedNodeIds.has(node.id);
            return {
              ...node,
              type: isExpanded ? "databaseSchema" : "collectionCompact",
              style: isExpanded
                ? node.style
                : {
                    ...(node.style || {}),
                    width: compactWidth,
                    height: compactHeight,
                  },
            };
          }
          return node;
        })
      : nodes;

    if (!isGroupsOnly) {
      const updatedNodes = compactNodes.map((node) => ({
        ...node,
        draggable: isReorderMode ? false : (node.draggable !== undefined ? node.draggable : true),
      }));

      return updatedNodes.sort((a, b) => {
        const aIsGroup = a.type === "group";
        const bIsGroup = b.type === "group";
        if (aIsGroup && !bIsGroup) return -1;
        if (!aIsGroup && bIsGroup) return 1;
        return 0;
      });
    }

    const compactByGroup = new Map<string, typeof compactNodes>();
    compactNodes.forEach((node) => {
      if (!node.parentId) return;
      const list = compactByGroup.get(node.parentId) || [];
      list.push(node);
      compactByGroup.set(node.parentId, list);
    });

    const groupLayouts = new Map<
      string,
      {
        positions: Map<string, { x: number; y: number }>;
        size: { width: number; height: number };
      }
    >();

    const getNodeSize = (node: Node) => {
      const measuredWidth = node.measured?.width;
      const measuredHeight = node.measured?.height;
      if (expandedNodeIds.has(node.id)) {
        return {
          width: measuredWidth ?? 360,
          height: measuredHeight ?? 220,
        };
      }
      return {
        width: compactWidth,
        height: compactHeight,
      };
    };

    compactByGroup.forEach((children, groupId) => {
      if (children.length === 0) return;
      const ordered = [...children].sort((a, b) => {
        if (a.position.y !== b.position.y) return a.position.y - b.position.y;
        return a.position.x - b.position.x;
      });
      const count = ordered.length;
      const columns = Math.ceil(Math.sqrt(count));
      const rows = Math.ceil(count / columns);
      const colWidths = Array.from({ length: columns }, () => 0);
      const rowHeights = Array.from({ length: rows }, () => 0);

      ordered.forEach((node, index) => {
        const col = index % columns;
        const row = Math.floor(index / columns);
        const size = getNodeSize(node);
        colWidths[col] = Math.max(colWidths[col], size.width);
        rowHeights[row] = Math.max(rowHeights[row], size.height);
      });

      const colOffsets: number[] = [];
      for (let idx = 0; idx < colWidths.length; idx += 1) {
        colOffsets[idx] = idx === 0 ? 0 : colOffsets[idx - 1] + colWidths[idx - 1] + compactGapX;
      }
      const rowOffsets: number[] = [];
      for (let idx = 0; idx < rowHeights.length; idx += 1) {
        rowOffsets[idx] = idx === 0 ? 0 : rowOffsets[idx - 1] + rowHeights[idx - 1] + compactGapY;
      }

      const positions = new Map<string, { x: number; y: number }>();
      ordered.forEach((node, index) => {
        const col = index % columns;
        const row = Math.floor(index / columns);
        positions.set(node.id, {
          x: compactPadding + colOffsets[col],
          y: compactPadding + groupHeaderHeight + rowOffsets[row],
        });
      });

      const width = compactPadding * 2 + colWidths.reduce((sum, w) => sum + w, 0) + compactGapX * Math.max(0, columns - 1);
      const height =
        compactPadding * 2 +
        groupHeaderHeight +
        rowHeights.reduce((sum, h) => sum + h, 0) +
        compactGapY * Math.max(0, rows - 1);

      groupLayouts.set(groupId, { positions, size: { width, height } });
    });

    const positionedCompactNodes = compactNodes.map((node) => {
      if (node.parentId) {
        const layout = groupLayouts.get(node.parentId);
        const position = layout?.positions.get(node.id);
        if (position) {
          return {
            ...node,
            position,
          };
        }
      }
      return node;
    });

    const updatedNodes = positionedCompactNodes.map((node) => {
      if (node.type === "group") {
        const layout = groupLayouts.get(node.id);
        if (!layout) {
          return node;
        }
        return {
          ...node,
          style: {
            ...(node.style || {}),
            width: layout.size.width,
            height: layout.size.height,
          },
        };
      }
      return node;
    });

    return updatedNodes
      .map((node) => ({
        ...node,
        draggable: isReorderMode ? false : (node.draggable !== undefined ? node.draggable : true),
      }))
      .sort((a, b) => {
        const aIsGroup = a.type === "group";
        const bIsGroup = b.type === "group";
        if (aIsGroup && !bIsGroup) return -1;
        if (!aIsGroup && bIsGroup) return 1;
        return 0;
      });
  }, [nodes, isGroupsOnly, isReorderMode]);

  const visibleNodeIds = useMemo(() => new Set(viewNodes.map((node) => node.id)), [viewNodes]);

  // Dynamically update edge styles based on relationship mode
  const edgesWithStyle = useMemo(() => {
    const baseEdges = edges;

    return baseEdges.map((edge) => ({
      ...edge,
      type: 'smoothstep',
      style: {
        stroke: isRelationshipMode ? "#b1b1b7" : "#9ca3af",
        strokeWidth: isGroupsOnly ? 4 : 2,
        opacity: isRelationshipMode ? 1 : 0.7,
      },
      className: isRelationshipMode ? undefined : "edge-gray",
      animated: false,
    }));
  }, [edges, isRelationshipMode, isGroupsOnly, visibleNodeIds]);

  const onConnectStart = useCallback((event: MouseEvent | TouchEvent, params: OnConnectStartParams) => {
    if (!isRelationshipMode) return;
    setIsConnecting(true);
    // Record selected connection point
    if (params?.nodeId && params?.handleId && params?.handleType) {
      setSelectedHandle({ 
        nodeId: params.nodeId, 
        handleId: params.handleId,
        type: params.handleType as "target" | "source"
      });
    }
    // Set initial mouse position immediately
    if (event instanceof MouseEvent) {
      setMousePosition({ x: event.clientX, y: event.clientY });
    } else if (event instanceof TouchEvent && event.touches.length > 0) {
      setMousePosition({ x: event.touches[0].clientX, y: event.touches[0].clientY });
    }
  }, [isRelationshipMode, setSelectedHandle]);

  const onConnect = useCallback(
    (params: Connection) => {
      if (!isRelationshipMode) return;
      const newEdges = addEdge(params, edges);
      // Ensure new edges have smoothstep type
      const edgesWithType = newEdges.map((edge) => ({
        ...edge,
        type: 'smoothstep' as const,
      }));
      setEdges(edgesWithType);
      // Exit add relationship mode after successfully adding a relationship
      setIsRelationshipMode(false);
      setSelectedHandle(null);
      setIsConnecting(false);
      setHasClickedNode(false);
      setShowInitialTooltip(false);
    },
    [isRelationshipMode, edges, setEdges]
  );

  const onConnectEnd = useCallback(() => {
    // If a handle is selected, keep showing tooltip until connection is made or cancelled
    if (selectedHandle) {
      // Keep isConnecting true to show tooltip
      // Don't clear selectedHandle yet
      return;
    }
    setIsConnecting(false);
  }, [selectedHandle]);

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (isGroupsOnly && (node.type === "collectionCompact" || node.type === "databaseSchema")) {
        setExpandedNodeIds((prev) => {
          const next = new Set(prev);
          if (next.has(node.id)) {
            next.delete(node.id);
          } else {
            next.add(node.id);
          }
          return next;
        });
        return;
      }

      if (isRelationshipMode) {
        setHasClickedNode(true);
        setShowInitialTooltip(false);
      }
    },
    [isGroupsOnly, isRelationshipMode],
  );

  // Handle click outside to cancel connection
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (selectedHandle && isRelationshipMode) {
        // Check if click is on a node or handle
        const target = e.target as HTMLElement;
        const isNodeOrHandle = target.closest('.react-flow__node') || target.closest('.react-flow__handle');
        if (!isNodeOrHandle) {
          // Cancel connection
          setSelectedHandle(null);
          setIsConnecting(false);
        }
      }
    };

    if (selectedHandle && isRelationshipMode) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [selectedHandle, isRelationshipMode]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isConnecting || selectedHandle) {
        setMousePosition({ x: e.clientX, y: e.clientY });
      }
      // Update initial tooltip position
      if (showInitialTooltip && isRelationshipMode) {
        setMousePosition({ x: e.clientX, y: e.clientY });
      }
    };

    if (isConnecting || selectedHandle || (showInitialTooltip && isRelationshipMode)) {
      window.addEventListener("mousemove", handleMouseMove);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [isConnecting, selectedHandle, showInitialTooltip, isRelationshipMode]);

  // Show initial tooltip when relationship mode is enabled
  useEffect(() => {
    if (isRelationshipMode && !hasClickedNode) {
      setShowInitialTooltip(true);
    } else {
      setShowInitialTooltip(false);
    }
  }, [isRelationshipMode, hasClickedNode]);

  // Reset state when relationship mode is disabled
  useEffect(() => {
    if (!isRelationshipMode) {
      setIsConnecting(false);
      setHasClickedNode(false);
      setShowInitialTooltip(false);
      setSelectedHandle(null);
    }
  }, [isRelationshipMode]);



  return (
    <ModeContext.Provider value={{ isRelationshipMode, isReorderMode, isHoverMode, selectedHandle, setSelectedHandle, isFieldDragging, setIsFieldDragging }}>
      <div className="absolute top-4 left-4 z-50 flex gap-2">
        <button
          onClick={() => {
            setIsRelationshipMode(!isRelationshipMode);
            if (isReorderMode) setIsReorderMode(false);
            if (isHoverMode) setIsHoverMode(false);
          }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            isRelationshipMode
              ? "bg-primary text-primary-foreground"
              : "bg-background border border-border hover:bg-muted"
          }`}
        >
          Add relationships
        </button>
        <button
          onClick={() => {
            setIsReorderMode(!isReorderMode);
            if (isRelationshipMode) setIsRelationshipMode(false);
            if (isHoverMode) setIsHoverMode(false);
          }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            isReorderMode
              ? "bg-primary text-primary-foreground"
              : "bg-background border border-border hover:bg-muted"
          }`}
        >
          Reorder fields
        </button>
        <button
          onClick={() => {
            setIsHoverMode(!isHoverMode);
            if (isRelationshipMode) setIsRelationshipMode(false);
            if (isReorderMode) setIsReorderMode(false);
            if (isGroupingMode) setIsGroupingMode(false);
          }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            isHoverMode
              ? "bg-primary text-primary-foreground"
              : "bg-background border border-border hover:bg-muted"
          }`}
        >
          Hover mode
        </button>
        <button
          onClick={() => {
            setIsGroupingMode(!isGroupingMode);
            if (isRelationshipMode) setIsRelationshipMode(false);
            if (isReorderMode) setIsReorderMode(false);
            if (isHoverMode) setIsHoverMode(false);
          }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            isGroupingMode
              ? "bg-primary text-primary-foreground"
              : "bg-background border border-border hover:bg-muted"
          }`}
        >
          New Group
        </button>
        <button
          onClick={() => {
            setIsGroupsOnly(!isGroupsOnly);
            if (isReorderMode) setIsReorderMode(false);
            if (isRelationshipMode) setIsRelationshipMode(false);
            if (isHoverMode) setIsHoverMode(false);
            if (isGroupingMode) setIsGroupingMode(false);
          }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            isGroupsOnly
              ? "bg-primary text-primary-foreground"
              : "bg-background border border-border hover:bg-muted"
          }`}
        >
          Bird view
        </button>
      </div>
      <ReactFlow
        nodes={viewNodes}
        edges={edgesWithStyle}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        panOnDrag={!isReorderMode && !isFieldDragging && !isGroupingMode}
        selectNodesOnDrag={false}
        panOnScroll={!isReorderMode && !isFieldDragging && !isGroupingMode}
        zoomOnScroll={!isReorderMode && !isFieldDragging && !isGroupingMode}
        zoomOnPinch={!isReorderMode && !isFieldDragging && !isGroupingMode}
        nodesDraggable={!isFieldDragging && !isGroupingMode}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onNodeClick={onNodeClick}
      >
        <Background />
        <RectangleDrawer
          isGroupingMode={isGroupingMode}
          setIsDrawingRectangle={setIsDrawingRectangle}
          setRectangleStart={setRectangleStart}
          setRectangleEnd={setRectangleEnd}
          setMousePosition={setMousePosition}
        />
        <GroupingHandler
          isGroupingMode={isGroupingMode}
          setIsGroupingMode={setIsGroupingMode}
          groupCounter={groupCounter}
          setGroupCounter={setGroupCounter}
          setMousePosition={setMousePosition}
          isDrawingRectangle={isDrawingRectangle}
          setIsDrawingRectangle={setIsDrawingRectangle}
          rectangleStart={rectangleStart}
          setRectangleStart={setRectangleStart}
          rectangleEnd={rectangleEnd}
          setRectangleEnd={setRectangleEnd}
        />
      </ReactFlow>
      {showInitialTooltip && isRelationshipMode && !hasClickedNode && (
        <div
          className="fixed pointer-events-none z-50 bg-black text-white text-sm px-3 py-1.5 rounded shadow-lg whitespace-nowrap"
          style={{
            left: `${mousePosition.x + 10}px`,
            top: `${mousePosition.y - 10}px`,
          }}
        >
          select a local field
        </div>
      )}
      {(isConnecting || selectedHandle) && isRelationshipMode && (
        <div
          className="fixed pointer-events-none z-50 bg-black text-white text-sm px-3 py-1.5 rounded shadow-lg whitespace-nowrap"
          style={{
            left: `${mousePosition.x + 10}px`,
            top: `${mousePosition.y - 10}px`,
          }}
        >
          select a foreign field
        </div>
      )}
      {isGroupingMode && !isDrawingRectangle && mousePosition.x > -1000 && mousePosition.y > -1000 && (
        <div
          className="fixed pointer-events-none z-50 bg-black text-white text-sm px-3 py-1.5 rounded shadow-lg whitespace-nowrap"
          style={{
            left: `${mousePosition.x + 10}px`,
            top: `${mousePosition.y - 10}px`,
          }}
        >
          draw a rectangle to group the collections together
        </div>
      )}
      {/* Info Panel - Bottom Right */}
      <div
        className="fixed right-4 flex items-center gap-2.5 bg-white border border-gray-300 shadow-lg px-2.5 py-1.5 cursor-pointer hover:shadow-xl transition-shadow"
        style={{
          bottom: '40px',
          borderRadius: '100px',
        }}
        onClick={() => setIsRecommendationsPanelOpen(true)}
      >
        <div className="text-lg flex-shrink-0">💡</div>
        <div
          className="flex items-center justify-center text-white font-bold rounded-full text-sm barber-pole"
          style={{
            width: '28px',
            height: '28px',
          }}
        >
          <span className="barber-pole__label">5</span>
        </div>
      </div>

      {/* Recommendations Panel */}
      <RecommendationsPanel
        isOpen={isRecommendationsPanelOpen}
        onClose={() => setIsRecommendationsPanelOpen(false)}
      />
    </ModeContext.Provider>
  );
}

function App() {
  return (
    <div className="h-screen w-screen">
      <ReactFlowProvider>
        <FlowContent />
      </ReactFlowProvider>
    </div>
  );
}

export default App;

