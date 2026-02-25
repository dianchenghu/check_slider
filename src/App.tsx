import { useState, useCallback, useEffect, createContext, useContext, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
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
  const frameRef = useRef<HTMLDivElement>(null);
  const [toolbarTarget, setToolbarTarget] = useState<HTMLElement | null>(null);

  const updateMousePosition = useCallback((pos: { x: number; y: number }) => {
    if (!frameRef.current) {
      setMousePosition(pos);
      return;
    }
    const rect = frameRef.current.getBoundingClientRect();
    setMousePosition({ x: pos.x - rect.left, y: pos.y - rect.top });
  }, []);

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

  useEffect(() => {
    setToolbarTarget(document.getElementById("toolbar-slot"));
  }, []);

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
      updateMousePosition({ x: event.clientX, y: event.clientY });
    } else if (event instanceof TouchEvent && event.touches.length > 0) {
      updateMousePosition({ x: event.touches[0].clientX, y: event.touches[0].clientY });
    }
  }, [isRelationshipMode, setSelectedHandle, updateMousePosition]);

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
        updateMousePosition({ x: e.clientX, y: e.clientY });
      }
      // Update initial tooltip position
      if (showInitialTooltip && isRelationshipMode) {
        updateMousePosition({ x: e.clientX, y: e.clientY });
      }
    };

    if (isConnecting || selectedHandle || (showInitialTooltip && isRelationshipMode)) {
      window.addEventListener("mousemove", handleMouseMove);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [isConnecting, selectedHandle, showInitialTooltip, isRelationshipMode, updateMousePosition]);

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



  const controls = (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          title="Undo"
          aria-label="Undo"
          className="h-7 w-7 inline-flex items-center justify-center rounded-md text-gray-700 hover:bg-gray-100"
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M9 5H5l3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5 5c4.5 0 8.5 2 8.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        <button
          type="button"
          title="Redo"
          aria-label="Redo"
          className="h-7 w-7 inline-flex items-center justify-center rounded-md text-gray-700 hover:bg-gray-100"
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M11 5h4l-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M15 5c-4.5 0-8.5 2-8.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        <button
          type="button"
          title="New"
          aria-label="New"
          className="h-7 w-7 inline-flex items-center justify-center rounded-md text-gray-700 hover:bg-gray-100"
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M4 6.5c0-1.1.9-2 2-2h7.5L17 8v5.5c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2V6.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M10 8v4M8 10h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        <button
          type="button"
          title="Add relationships"
          aria-label="Add relationships"
          className={`h-7 w-7 inline-flex items-center justify-center rounded-md ${
            isRelationshipMode
              ? "bg-primary text-primary-foreground"
              : "text-gray-700 hover:bg-gray-100"
          }`}
          onClick={() => {
            setIsRelationshipMode(!isRelationshipMode);
            if (isReorderMode) setIsReorderMode(false);
            if (isHoverMode) setIsHoverMode(false);
          }}
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <rect x="3.5" y="3.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
            <rect x="11.5" y="11.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8.5 6.5h3a2 2 0 0 1 2 2v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      {/* Add relationships button merged into Connect icon */}
        <button
          onClick={() => {
            setIsReorderMode(!isReorderMode);
            if (isRelationshipMode) setIsRelationshipMode(false);
            if (isHoverMode) setIsHoverMode(false);
          }}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
            isReorderMode
              ? "bg-primary text-primary-foreground"
              : "bg-background border border-border hover:bg-muted"
          }`}
        >
          Reorder fields
        </button>
        <button
          onClick={() => {
            setIsGroupingMode(!isGroupingMode);
            if (isRelationshipMode) setIsRelationshipMode(false);
            if (isReorderMode) setIsReorderMode(false);
            if (isHoverMode) setIsHoverMode(false);
          }}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
            isGroupingMode
              ? "bg-primary text-primary-foreground"
              : "bg-background border border-border hover:bg-muted"
          }`}
        >
          New Group
        </button>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => {
            setIsHoverMode(!isHoverMode);
            if (isRelationshipMode) setIsRelationshipMode(false);
            if (isReorderMode) setIsReorderMode(false);
            if (isGroupingMode) setIsGroupingMode(false);
          }}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
            isHoverMode
              ? "bg-primary text-primary-foreground"
              : "bg-background border border-border hover:bg-muted"
          }`}
        >
          Hover mode
        </button>
        <button
          onClick={() => {
            setIsGroupsOnly(!isGroupsOnly);
            if (isReorderMode) setIsReorderMode(false);
            if (isRelationshipMode) setIsRelationshipMode(false);
            if (isHoverMode) setIsHoverMode(false);
            if (isGroupingMode) setIsGroupingMode(false);
          }}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
            isGroupsOnly
              ? "bg-primary text-primary-foreground"
              : "bg-background border border-border hover:bg-muted"
          }`}
        >
          Bird view
        </button>
      </div>
    </div>
  );

  return (
    <ModeContext.Provider value={{ isRelationshipMode, isReorderMode, isHoverMode, selectedHandle, setSelectedHandle, isFieldDragging, setIsFieldDragging }}>
      <div ref={frameRef} className="relative w-full h-full">
        {toolbarTarget ? createPortal(controls, toolbarTarget) : controls}
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
          setMousePosition={updateMousePosition}
        />
        <GroupingHandler
          isGroupingMode={isGroupingMode}
          setIsGroupingMode={setIsGroupingMode}
          groupCounter={groupCounter}
          setGroupCounter={setGroupCounter}
          setMousePosition={updateMousePosition}
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
          className="absolute pointer-events-none z-50 bg-black text-white text-sm px-3 py-1.5 rounded shadow-lg whitespace-nowrap"
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
          className="absolute pointer-events-none z-50 bg-black text-white text-sm px-3 py-1.5 rounded shadow-lg whitespace-nowrap"
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
          className="absolute pointer-events-none z-50 bg-black text-white text-sm px-3 py-1.5 rounded shadow-lg whitespace-nowrap"
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
        className="absolute right-4 flex items-center gap-2.5 bg-white border border-gray-300 shadow-lg px-2.5 py-1.5 cursor-pointer hover:shadow-xl transition-shadow"
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
      </div>
    </ModeContext.Provider>
  );
}

function App() {
  return (
    <div className="h-screen w-screen bg-[#F7F8F7] text-foreground">
      <div className="h-10 border-b border-gray-200 flex items-center justify-center text-xs text-gray-600">
        MongoDB Compass Dev
      </div>
      <div className="flex h-[calc(100%-40px)]">
        <aside className="w-60 border-r border-gray-200 bg-[#E5F3ED] flex flex-col">
          <div className="px-4 py-3 text-sm font-semibold text-gray-800">Compass</div>
          <div className="px-4 py-2 text-xs text-gray-600">Data Modeling</div>
          <div className="px-4 py-2 text-xs font-semibold text-gray-700">Connections (4)</div>
          <div className="mx-4 mb-2 h-8 rounded border border-gray-300 bg-white text-xs flex items-center px-2 text-gray-500">
            Search connections
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-4 text-xs text-gray-700 space-y-2">
            <div>compass data</div>
            <div>NYC</div>
            <div>Netflix</div>
            <div>SchemaAdvisor</div>
            <div>TestDB</div>
            <div>collections</div>
            <div>compass_analytics</div>
            <div>config</div>
            <div>encryption</div>
          </div>
        </aside>
        <main className="flex-1 flex flex-col">
          <div className="h-10 border-b border-gray-200 flex items-center px-4">
            <div id="toolbar-slot" className="flex-1 flex items-center min-w-0" />
          </div>
          <div className="flex-1 bg-[#F9FBFA]">
            <ReactFlowProvider>
              <FlowContent />
            </ReactFlowProvider>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;

