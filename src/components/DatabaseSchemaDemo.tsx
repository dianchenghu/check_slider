import { memo, useState, useRef, useEffect, useLayoutEffect, useMemo } from "react";
import { Position, useReactFlow, useNodeId, useUpdateNodeInternals } from "@xyflow/react";
import { BaseHandle } from "@/components/base-handle";
import { useMode } from "../App";
import { cn } from "@/lib/utils";
import {
  DatabaseSchemaNode,
  DatabaseSchemaNodeHeader,
  DatabaseSchemaNodeBody,
  DatabaseSchemaTableRow,
  DatabaseSchemaTableCell,
} from "@/components/database-schema-node";
import {
  type SchemaField,
  flattenSchema,
  updateFieldTitleByPath,
} from "@/lib/schemaLoader";

export type DatabaseSchemaNodeData = {
  data: {
    label: string;
    schema: SchemaField[];
  };
};

const DatabaseSchemaDemo = memo(({ data }: DatabaseSchemaNodeData) => {
  const { isRelationshipMode, isReorderMode, isHoverMode, selectedHandle, setSelectedHandle, isFieldDragging, setIsFieldDragging, pushHistory, highlightedEdgeHandles } = useMode();
  const [hoverSide, setHoverSide] = useState<"left" | "right" | null>(null);
  const [hoveredHandleId, setHoveredHandleId] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");
  const [hoveredFieldIndex, setHoveredFieldIndex] = useState<number | null>(null);
  const [hoverModeDragIndex, setHoverModeDragIndex] = useState<number | null>(null);
  const [collapsedPathsByNode, setCollapsedPathsByNode] = useState<Record<string, Set<string>>>({});
  const editingInputRef = useRef<HTMLInputElement>(null);
  const lastSchemaKeyRef = useRef<string>("");
  const bodyRef = useRef<HTMLDivElement>(null);
  const nodeId = useNodeId();
  const { setNodes, getNodes, getEdges, getViewport, setViewport, setEdges } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();
  const panIntervalRef = useRef<number | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isRelationshipMode || !bodyRef.current) return;
    const rect = bodyRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const width = rect.width;
    
    // Determine if mouse is on left or right half
    if (mouseX < width / 2) {
      setHoverSide("left");
    } else {
      setHoverSide("right");
    }
  };

  const handleMouseLeave = () => {
    setHoverSide(null);
  };

  // Edge detection and auto-pan effect
  useEffect(() => {
    if (!isFieldDragging) {
      // Clear interval when not dragging
      if (panIntervalRef.current !== null) {
        clearInterval(panIntervalRef.current);
        panIntervalRef.current = null;
      }
      return;
    }

    const edgeThreshold = 50; // pixels from edge
    const panSpeed = 5; // pixels per frame
    
    const handleDragOver = (event: DragEvent) => {
      const mouseX = event.clientX;
      const mouseY = event.clientY;
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      
      // Check if mouse is near edges
      const nearLeft = mouseX < edgeThreshold;
      const nearRight = mouseX > windowWidth - edgeThreshold;
      const nearTop = mouseY < edgeThreshold;
      const nearBottom = mouseY > windowHeight - edgeThreshold;
      
      // Clear existing interval
      if (panIntervalRef.current !== null) {
        clearInterval(panIntervalRef.current);
        panIntervalRef.current = null;
      }
      
      if (nearLeft || nearRight || nearTop || nearBottom) {
        // Start panning
        panIntervalRef.current = window.setInterval(() => {
          let deltaX = 0;
          let deltaY = 0;
          
          if (nearLeft) deltaX = panSpeed;
          if (nearRight) deltaX = -panSpeed;
          if (nearTop) deltaY = panSpeed;
          if (nearBottom) deltaY = -panSpeed;
          
          if (deltaX !== 0 || deltaY !== 0) {
            const viewport = getViewport();
            setViewport({
              x: viewport.x + deltaX,
              y: viewport.y + deltaY,
              zoom: viewport.zoom,
            });
          }
        }, 16); // ~60fps
      }
    };
    
    document.addEventListener('dragover', handleDragOver);
    
    return () => {
      document.removeEventListener('dragover', handleDragOver);
      if (panIntervalRef.current !== null) {
        clearInterval(panIntervalRef.current);
        panIntervalRef.current = null;
      }
    };
  }, [isFieldDragging, getViewport, setViewport]);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    const row = flattenedRows[index];
    const isReorderable = row?.topLevelIndex !== undefined;
    const isInReorderState = isReorderMode || hoverModeDragIndex === index;
    if (!isInReorderState || !isReorderable) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    setIsFieldDragging(true);
    e.stopPropagation();
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", "");
    if (hoverModeDragIndex !== null) {
      setDraggedIndex(hoverModeDragIndex);
    } else {
      setDraggedIndex(index);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
    // Determine the current drag index
    // In hover mode, if hoverModeDragIndex is set, use it; otherwise use draggedIndex
    // In reorder mode, use draggedIndex
    const currentDragIndex = hoverModeDragIndex !== null ? hoverModeDragIndex : draggedIndex;
    
    // If not in a valid drag state, return early
    const isInReorderState = isReorderMode || hoverModeDragIndex !== null;
    if (!isInReorderState || currentDragIndex === null) {
      return;
    }
    
    // If dragging over the same item, don't do anything
    if (currentDragIndex === index) {
      return;
    }
    
    // Allow drop on other items
    e.preventDefault();
    e.stopPropagation(); // Prevent triggering React Flow node drag
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent<HTMLTableRowElement>, dropIndex: number) => {
    const currentDragIndex = hoverModeDragIndex !== null ? hoverModeDragIndex : draggedIndex;
    if ((!isReorderMode && hoverModeDragIndex === null) || currentDragIndex === null) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      setHoverModeDragIndex(null);
      return;
    }

    const draggedRow = visibleRows[currentDragIndex];
    const dropRow = visibleRows[dropIndex];
    const draggedTopLevel = draggedRow?.topLevelIndex;
    const dropTopLevel = dropRow?.topLevelIndex ?? dropRow?.parentTopLevelIndex ?? 0;

    if (draggedTopLevel === undefined || draggedTopLevel === dropTopLevel) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      setHoverModeDragIndex(null);
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === nodeId) {
          const newSchema = [...data.schema];
          const [draggedItem] = newSchema.splice(draggedTopLevel, 1);
          const insertIndex = dropTopLevel > draggedTopLevel ? dropTopLevel - 1 : dropTopLevel;
          newSchema.splice(insertIndex, 0, draggedItem);
          return {
            ...node,
            data: {
              ...node.data,
              schema: newSchema,
            },
          };
        }
        return node;
      })
    );

    setDraggedIndex(null);
    setDragOverIndex(null);
    setHoverModeDragIndex(null);
  };

  const handleDragEnd = (e?: React.DragEvent) => {
    if (e) {
      e.stopPropagation();
    }
    // Stop auto-pan
    if (panIntervalRef.current !== null) {
      clearInterval(panIntervalRef.current);
      panIntervalRef.current = null;
    }
    setIsFieldDragging(false);
    setDraggedIndex(null);
    setDragOverIndex(null);
    setHoverModeDragIndex(null);
  };

  const handleFieldNameDoubleClick = (fieldTitle: string) => {
    setEditingFieldId(fieldTitle);
    setEditingValue(fieldTitle);
  };

  const handleFieldNameBlur = () => {
    if (editingFieldId && editingValue.trim() !== "") {
      setNodes((nodes) =>
        nodes.map((node) => {
          if (node.id === nodeId) {
            const newSchema = updateFieldTitleByPath(
              data.schema,
              editingFieldId,
              editingValue.trim()
            );
            return {
              ...node,
              data: {
                ...node.data,
                schema: newSchema,
              },
            };
          }
          return node;
        })
      );
    }
    setEditingFieldId(null);
    setEditingValue("");
  };

  const handleFieldNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    } else if (e.key === "Escape") {
      setEditingFieldId(null);
      setEditingValue("");
    }
  };

  // Focus input when editing starts
  useEffect(() => {
    if (editingFieldId && editingInputRef.current) {
      editingInputRef.current.focus();
      editingInputRef.current.select();
    }
  }, [editingFieldId]);

  const flattenedRows = useMemo(() => flattenSchema(data.schema), [data.schema]);

  const nodeCollapsed = collapsedPathsByNode[nodeId || ""] ?? new Set<string>();

  const visibleRows = useMemo(
    () =>
      flattenedRows.filter(
        (row) => !row.isNested || !nodeCollapsed.has(row.parentPath!)
      ),
    [flattenedRows, nodeCollapsed]
  );

  const toggleCollapse = (path: string) => {
    const node = nodeId || "";
    setCollapsedPathsByNode((prev) => {
      const current = prev[node] ?? new Set<string>();
      const next = new Set(current);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return { ...prev, [node]: next };
    });
  };

  const objectPaths = useMemo(
    () => flattenedRows.filter((r) => r.type === "object").map((r) => r.path),
    [flattenedRows]
  );

  const allCollapsed =
    objectPaths.length > 0 &&
    objectPaths.every((p) => nodeCollapsed.has(p));

  const toggleCollapseAll = () => {
    const node = nodeId || "";
    setCollapsedPathsByNode((prev) => {
      const next = allCollapsed ? new Set<string>() : new Set(objectPaths);
      return { ...prev, [node]: next };
    });
  };

  const schemaKey = useMemo(
    () => visibleRows.map((r) => r.path).join("|"),
    [visibleRows],
  );

  useLayoutEffect(() => {
    if (!nodeId) return;
    if (lastSchemaKeyRef.current === schemaKey) return;
    lastSchemaKeyRef.current = schemaKey;
    updateNodeInternals(nodeId);
    setEdges((edges) =>
      edges.map((edge) =>
        edge.source === nodeId || edge.target === nodeId ? { ...edge } : edge,
      ),
    );
  }, [schemaKey, nodeId, updateNodeInternals, setEdges]);

  const handleAddField = (e: React.MouseEvent, insertAfterIndex?: number) => {
    e.stopPropagation();
    const newField: SchemaField = {
      title: `field_${data.schema.length + 1}`,
      type: "varchar",
    };
    const nodes = getNodes();
    const edges = getEdges();
    const newNodes = nodes.map((node) => {
      if (node.id === nodeId) {
        if (insertAfterIndex !== undefined) {
          const row = visibleRows[insertAfterIndex];
          const afterTopLevel =
            row?.topLevelIndex ?? row?.parentTopLevelIndex ?? -1;
          const newSchema = [...data.schema];
          newSchema.splice(afterTopLevel + 1, 0, newField);
          return {
            ...node,
            data: {
              ...node.data,
              schema: newSchema,
            },
          };
        } else {
          return {
            ...node,
            data: {
              ...node.data,
              schema: [...data.schema, newField],
            },
          };
        }
      }
      return node;
    });
    pushHistory(newNodes, edges);
    setNodes(newNodes);
  };

  const handleHoverModeReorderClick = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setHoverModeDragIndex(index);
  };

  // Disable node dragging and lock canvas when in reorder state
  useEffect(() => {
    if (hoverModeDragIndex !== null && nodeId) {
      // Lock canvas immediately when entering reorder state
      setIsFieldDragging(true);
      setNodes((nodes) =>
        nodes.map((node) => {
          if (node.id === nodeId) {
            return { ...node, draggable: false };
          }
          return node;
        })
      );
    } else if (hoverModeDragIndex === null && nodeId && !isReorderMode) {
      // Unlock canvas when exiting reorder state
      setIsFieldDragging(false);
      // Re-enable dragging when exiting reorder state (only if not in global reorder mode)
      setNodes((nodes) =>
        nodes.map((node) => {
          if (node.id === nodeId) {
            return { ...node, draggable: true };
          }
          return node;
        })
      );
    }
  }, [hoverModeDragIndex, nodeId, setNodes, isReorderMode, setIsFieldDragging]);

  // Handle click outside to exit hover mode reorder state
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (hoverModeDragIndex !== null && isHoverMode) {
        const target = e.target as HTMLElement;
        const isFieldRow = target.closest('tr');
        const isReorderButton = target.closest('button[title="Reorder field"]');
        const isReorderIcon = target.closest('.reorder-icon');
        // Don't exit if clicking on the field row, reorder button, or reorder icon
        if (!isFieldRow && !isReorderButton && !isReorderIcon) {
          setHoverModeDragIndex(null);
          setDraggedIndex(null);
          setDragOverIndex(null);
        }
      }
    };

    if (hoverModeDragIndex !== null && isHoverMode) {
      // Use capture phase to catch clicks earlier
      document.addEventListener('click', handleClickOutside, true);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside, true);
    };
  }, [hoverModeDragIndex, isHoverMode]);


  // Prevent ReactFlow from handling mouse events when in reorder state
  const handleNodeMouseDown = (e: React.MouseEvent) => {
    if (isReorderMode || hoverModeDragIndex !== null) {
      e.stopPropagation();
    }
  };

  return (
    <div onMouseDown={handleNodeMouseDown}>
      <DatabaseSchemaNode className="p-0 relative overflow-visible" style={{ width: '100%', minWidth: 280 }}>
      <DatabaseSchemaNodeHeader>
        <div className="flex items-center gap-2 flex-1">
          {/* 6-dot grid icon (2 columns, 3 rows) */}
          <div className="flex gap-0.5">
            <div className="flex flex-col gap-0.5">
              <div className="w-0.5 h-0.5 bg-gray-600 rounded-full"></div>
              <div className="w-0.5 h-0.5 bg-gray-600 rounded-full"></div>
              <div className="w-0.5 h-0.5 bg-gray-600 rounded-full"></div>
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="w-0.5 h-0.5 bg-gray-600 rounded-full"></div>
              <div className="w-0.5 h-0.5 bg-gray-600 rounded-full"></div>
              <div className="w-0.5 h-0.5 bg-gray-600 rounded-full"></div>
            </div>
          </div>
          <span className="font-semibold text-xs text-gray-800">{data.label}</span>
          <div className="flex-1"></div>
        </div>
        <button
          onClick={handleAddField}
          className="ml-2 p-0.5 hover:bg-gray-200 rounded transition-colors flex-shrink-0 border border-gray-600 text-gray-600"
          title="Add field"
        >
          <svg
            width="8"
            height="8"
            viewBox="0 0 14 14"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M7 2V12M2 7H12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
        {objectPaths.length > 0 && (
          <button
            onClick={toggleCollapseAll}
            className="ml-1 p-0.5 hover:bg-gray-200 rounded transition-colors flex-shrink-0 text-gray-600"
            title={allCollapsed ? "Expand all" : "Collapse all"}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={cn("transition-transform", allCollapsed && "rotate-180")}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        )}
      </DatabaseSchemaNodeHeader>
      <div
        ref={bodyRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <DatabaseSchemaNodeBody>
          {visibleRows.map((entry, index) => {
            const isReorderable = entry.topLevelIndex !== undefined;
            const isLeafField = entry.type !== "object";
            const isHighlighted =
              highlightedEdgeHandles &&
              nodeId &&
              ((nodeId === highlightedEdgeHandles.sourceNodeId && entry.path === highlightedEdgeHandles.sourceHandle) ||
                (nodeId === highlightedEdgeHandles.targetNodeId && entry.path === highlightedEdgeHandles.targetHandle));
            return (
            <DatabaseSchemaTableRow
              key={`${entry.path}-${index}`}
              data-field-row
              data-node-id={nodeId ?? undefined}
              data-field-path={entry.path}
              draggable={(isReorderMode || hoverModeDragIndex === index) && isReorderable}
              onDragStart={(e: React.DragEvent) => {
                const shouldBeDraggable =
                  (isReorderMode || hoverModeDragIndex === index) && isReorderable;
                if (!shouldBeDraggable) {
                  e.preventDefault();
                  e.stopPropagation();
                  return;
                }
                setIsFieldDragging(true);
                e.stopPropagation();
                handleDragStart(e, index);
              }}
              onDragOver={(e: React.DragEvent) => {
                // Allow drag over if in reorder mode or if a field is in reorder state
                const isInReorderState = isReorderMode || hoverModeDragIndex !== null;
                if (!isInReorderState) {
                  return;
                }
                e.stopPropagation();
                handleDragOver(e as React.DragEvent<HTMLTableRowElement>, index);
              }}
              onDrop={(e: React.DragEvent) => {
                // Allow drop if in reorder mode or if a field is in reorder state
                const isInReorderState = isReorderMode || hoverModeDragIndex !== null;
                if (!isInReorderState) {
                  return;
                }
                e.stopPropagation();
                handleDrop(e as React.DragEvent<HTMLTableRowElement>, index);
                setHoverModeDragIndex(null);
              }}
              onDragEnd={(e: React.DragEvent) => {
                e.stopPropagation();
                handleDragEnd(e);
                setHoverModeDragIndex(null);
              }}
              onMouseDown={(e: React.MouseEvent) => {
                if (isReorderMode || hoverModeDragIndex === index) {
                  // Prevent canvas pan when clicking on draggable field
                  // But don't prevent default to allow drag to start
                  e.stopPropagation();
                  // Ensure canvas is locked immediately
                  setIsFieldDragging(true);
                }
              }}
              onMouseEnter={() => {
                if (isHoverMode) {
                  setHoveredFieldIndex(index);
                }
              }}
              onMouseLeave={() => {
                if (isHoverMode) {
                  setHoveredFieldIndex(null);
                }
              }}
              style={{
                userSelect: (isReorderMode || hoverModeDragIndex === index) ? "none" : "auto",
              }}
              className={`relative ${(isReorderMode || hoverModeDragIndex === index) ? "cursor-move" : ""} ${
                draggedIndex === index ? "opacity-50" : ""
              } ${dragOverIndex === index ? "border-t-2 border-blue-500" : ""} ${
                hoverModeDragIndex === index ? "bg-blue-100" : ""
              } ${isHighlighted ? "outline outline-2 outline-dashed outline-blue-500 outline-offset-0" : ""} ${
                index === 0 ? "pt-2" : ""
              } ${index === visibleRows.length - 1 ? "pb-2" : ""}`}
            >
              {/* Wrapper td for absolute positioned elements - spans all columns */}
              <td 
                colSpan={2}
                className="absolute inset-0 p-0 pointer-events-none" 
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              >
                {/* Vertical line for nested fields - aligns with object field left edge, starts at first nested row top */}
                {entry.isNested && (
                  <div
                    className="absolute w-px bg-gray-600 pointer-events-none"
                    style={{
                      left: 24,
                      top: 0,
                      height: "100%",
                    }}
                  />
                )}
                {/* Hover mode buttons */}
                {isHoverMode && hoveredFieldIndex === index && hoverModeDragIndex !== index && (
                  <>
                    {/* Reorder button on the left - only for top-level fields */}
                    {isReorderable && (
                    <button
                      onClick={(e) => {
                        handleHoverModeReorderClick(index, e);
                      }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-200 rounded transition-colors flex-shrink-0 border border-gray-600 text-gray-600 z-50 pointer-events-auto"
                      title="Reorder field"
                    >
                      <svg
                        width="8"
                        height="8"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M3 5h10M3 8h10M3 11h10"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                    )}
                    {/* Add button on the right */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddField(e, index);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-200 rounded transition-colors flex-shrink-0 border border-gray-600 text-gray-600 z-50 pointer-events-auto"
                      title="Add field below"
                    >
                      <svg
                        width="8"
                        height="8"
                        viewBox="0 0 14 14"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M7 2V12M2 7H12"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  </>
                )}
                {/* Show add button on the right when in reorder state but not hovering */}
                {isHoverMode && hoverModeDragIndex === index && hoveredFieldIndex !== index && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddField(e, index);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-200 rounded transition-colors flex-shrink-0 border border-gray-600 text-gray-600 z-50 pointer-events-auto"
                    title="Add field below"
                  >
                    <svg
                      width="8"
                      height="8"
                      viewBox="0 0 14 14"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M7 2V12M2 7H12"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                )}
                {/* Left handle - only for leaf fields */}
                {isLeafField && (
                <div
                  className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-opacity duration-200 z-50 ${
                    isRelationshipMode
                      ? selectedHandle?.nodeId === nodeId && selectedHandle?.handleId === entry.path && selectedHandle?.type === "target"
                        ? "opacity-100 pointer-events-auto"
                        : hoverSide === "left"
                        ? "opacity-100 pointer-events-auto"
                        : "opacity-0 pointer-events-none"
                      : "opacity-0 pointer-events-none"
                  }`}
                  style={{ left: 0 }}
                  onMouseEnter={() => {
                    if (isRelationshipMode) setHoveredHandleId(entry.path);
                  }}
                  onMouseLeave={() => {
                    if (isRelationshipMode) setHoveredHandleId(null);
                  }}
                  onMouseDown={(e) => {
                    if (isRelationshipMode) {
                      e.stopPropagation();
                      setSelectedHandle({ nodeId: nodeId || "", handleId: entry.path, type: "target" });
                    }
                  }}
                >
                  <BaseHandle
                    id={entry.path}
                    type="target"
                    position={Position.Left}
                    className={cn(
                      "z-50",
                      selectedHandle?.nodeId === nodeId && selectedHandle?.handleId === entry.path 
                        ? "!border-blue-600 !bg-blue-600 !h-[11px] !w-[11px]" 
                        : hoveredHandleId === entry.path 
                        ? "!border-blue-600 !h-[11px] !w-[11px]" 
                        : ""
                    )}
                  />
                </div>
                )}
                {/* Right handle - only for leaf fields */}
                {isLeafField && (
                <div
                  className={`absolute top-1/2 -translate-y-1/2 transition-opacity duration-200 z-50 ${
                    isRelationshipMode
                      ? selectedHandle?.nodeId === nodeId && selectedHandle?.handleId === entry.path && selectedHandle?.type === "source"
                        ? "opacity-100 pointer-events-auto"
                        : hoverSide === "right"
                        ? "opacity-100 pointer-events-auto"
                        : "opacity-0 pointer-events-none"
                      : "opacity-0 pointer-events-none"
                  }`}
                  style={{ right: '-2px' }}
                  onMouseEnter={() => {
                    if (isRelationshipMode) setHoveredHandleId(entry.path);
                  }}
                  onMouseLeave={() => {
                    if (isRelationshipMode) setHoveredHandleId(null);
                  }}
                  onMouseDown={(e) => {
                    if (isRelationshipMode) {
                      e.stopPropagation();
                      setSelectedHandle({ nodeId: nodeId || "", handleId: entry.path, type: "source" });
                    }
                  }}
                >
                  <BaseHandle
                    id={entry.path}
                    type="source"
                    position={Position.Right}
                    className={cn(
                      "z-50",
                      selectedHandle?.nodeId === nodeId && selectedHandle?.handleId === entry.path 
                        ? "!border-blue-600 !bg-blue-600 !h-[11px] !w-[11px]" 
                        : hoveredHandleId === entry.path 
                        ? "!border-blue-600 !h-[11px] !w-[11px]" 
                        : ""
                    )}
                  />
                </div>
                )}
              </td>
              <DatabaseSchemaTableCell className={`pr-4 py-[3.84px] ${entry.isNested ? "pl-[40px]" : "pl-[24px]"} ${index === 0 ? "!pt-2" : ""} ${index === visibleRows.length - 1 ? "!pb-2" : ""}`}>
                <div className="relative flex items-center flex-row gap-2">
                  {isReorderMode && isReorderable && (
                    <div 
                      className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M3 5h10M3 8h10M3 11h10"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                  )}
                  {/* Show reorder icon in cell when in hover mode reorder state */}
                  {isHoverMode && hoverModeDragIndex === index && isReorderable && (
                    <div 
                      className="cursor-grab active:cursor-grabbing text-gray-600 flex-shrink-0 reorder-icon"
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M3 5h10M3 8h10M3 11h10"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                  )}
                  {editingFieldId === entry.path ? (
                    <input
                      ref={editingInputRef}
                      type="text"
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={handleFieldNameBlur}
                      onKeyDown={handleFieldNameKeyDown}
                      onClick={(e) => e.stopPropagation()}
                      className="text-gray-800 px-2 bg-white border border-gray-300 rounded min-w-[100px] outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <label
                      className="text-gray-800 pl-0 pr-2 cursor-text"
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        handleFieldNameDoubleClick(entry.path);
                      }}
                    >
                      {entry.title}
                    </label>
                  )}
                </div>
              </DatabaseSchemaTableCell>
              <DatabaseSchemaTableCell className={`pr-3 py-[3.84px] ${index === 0 ? "!pt-2" : ""} ${index === visibleRows.length - 1 ? "!pb-2" : ""}`}>
                <div className="relative flex items-center justify-end gap-1">
                  <label className={`text-gray-500 text-right transition-opacity ${isHoverMode && hoveredFieldIndex === index ? "opacity-0" : "opacity-100"}`}>
                    {entry.type === "uuid" ? "objectId" : entry.type === "varchar" ? "string" : entry.type}
                  </label>
                  {entry.type === "object" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCollapse(entry.path);
                      }}
                      className="p-0.5 hover:bg-gray-200 rounded transition-colors flex-shrink-0 text-gray-600 pointer-events-auto"
                      title={nodeCollapsed.has(entry.path) ? "Expand" : "Collapse"}
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={cn("transition-transform", nodeCollapsed.has(entry.path) && "rotate-180")}
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>
                  )}
                </div>
              </DatabaseSchemaTableCell>
            </DatabaseSchemaTableRow>
            );
          })}
        </DatabaseSchemaNodeBody>
      </div>
    </DatabaseSchemaNode>
    </div>
  );
});

DatabaseSchemaDemo.displayName = "DatabaseSchemaDemo";

export default DatabaseSchemaDemo;

