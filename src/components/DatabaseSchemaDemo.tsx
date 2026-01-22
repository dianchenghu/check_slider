import { memo, useState, useRef, useEffect } from "react";
import { Position, useReactFlow, useNodeId } from "@xyflow/react";
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

export type DatabaseSchemaNodeData = {
  data: {
    label: string;
    schema: { title: string; type: string }[];
  };
};

const DatabaseSchemaDemo = memo(({ data }: DatabaseSchemaNodeData) => {
  const { isRelationshipMode, isReorderMode, isHoverMode, selectedHandle, setSelectedHandle, isFieldDragging, setIsFieldDragging } = useMode();
  const [hoverSide, setHoverSide] = useState<"left" | "right" | null>(null);
  const [hoveredHandleId, setHoveredHandleId] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");
  const [hoveredFieldIndex, setHoveredFieldIndex] = useState<number | null>(null);
  const [hoverModeDragIndex, setHoverModeDragIndex] = useState<number | null>(null);
  const editingInputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const nodeId = useNodeId();
  const { setNodes, getViewport, setViewport } = useReactFlow();
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
    // Check if we're in a valid drag state
    const isInReorderState = isReorderMode || hoverModeDragIndex === index;
    if (!isInReorderState) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    // Ensure canvas is locked (should already be locked, but ensure it)
    setIsFieldDragging(true);
    // Stop propagation to prevent React Flow from handling this drag
    e.stopPropagation();
    // Don't prevent default - we need the drag to work
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", ""); // Required by some browsers
    // If in hover mode reorder state, use hoverModeDragIndex, otherwise use the index
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

    if (currentDragIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      setHoverModeDragIndex(null);
      return;
    }

    e.preventDefault();
    e.stopPropagation(); // Prevent triggering React Flow node drag
    
    // Update node data
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === nodeId) {
          const newSchema = [...data.schema];
          const [draggedItem] = newSchema.splice(currentDragIndex, 1);
          // Calculate correct insert position
          const insertIndex = dropIndex > currentDragIndex ? dropIndex : dropIndex;
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
      // Update node data with new field name
      setNodes((nodes) =>
        nodes.map((node) => {
          if (node.id === nodeId) {
            const newSchema = data.schema.map((entry) =>
              entry.title === editingFieldId
                ? { ...entry, title: editingValue.trim() }
                : entry
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

  const handleAddField = (e: React.MouseEvent, insertAfterIndex?: number) => {
    e.stopPropagation();
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === nodeId) {
          const newField = {
            title: `field_${data.schema.length + 1}`,
            type: "varchar",
          };
          if (insertAfterIndex !== undefined) {
            // Insert after the specified index
            const newSchema = [...data.schema];
            newSchema.splice(insertAfterIndex + 1, 0, newField);
            return {
              ...node,
              data: {
                ...node.data,
                schema: newSchema,
              },
            };
          } else {
            // Add to the end
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
      })
    );
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
      <DatabaseSchemaNode className="p-0 relative overflow-visible" style={{ width: 'calc(100% + 40px)' }}>
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
      </DatabaseSchemaNodeHeader>
      <div
        ref={bodyRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <DatabaseSchemaNodeBody>
          {data.schema.map((entry, index) => (
            <DatabaseSchemaTableRow
              key={`${entry.title}-${index}`}
              draggable={isReorderMode || hoverModeDragIndex === index}
              onDragStart={(e: React.DragEvent) => {
                // Check if this row should be draggable
                const shouldBeDraggable = isReorderMode || hoverModeDragIndex === index;
                if (!shouldBeDraggable) {
                  e.preventDefault();
                  e.stopPropagation();
                  return;
                }
                // Ensure canvas is locked immediately before starting drag
                setIsFieldDragging(true);
                // Stop propagation to prevent canvas drag, but don't prevent default to allow drag
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
              } ${index === 0 ? "pt-2" : ""} ${index === data.schema.length - 1 ? "pb-2" : ""}`}
            >
              {/* Wrapper td for absolute positioned elements - spans all columns */}
              <td 
                colSpan={2}
                className="absolute inset-0 p-0 pointer-events-none" 
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              >
                {/* Hover mode buttons */}
                {isHoverMode && hoveredFieldIndex === index && hoverModeDragIndex !== index && (
                  <>
                    {/* Reorder button on the left */}
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
                {/* Left handle - positioned on the left edge */}
                <div
                  className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-opacity duration-200 z-50 ${
                    isRelationshipMode
                      ? selectedHandle?.nodeId === nodeId && selectedHandle?.handleId === entry.title && selectedHandle?.type === "target"
                        ? "opacity-100 pointer-events-auto"
                        : hoverSide === "left"
                        ? "opacity-100 pointer-events-auto"
                        : "opacity-0 pointer-events-none"
                      : "opacity-0 pointer-events-none"
                  }`}
                  style={{ left: 0 }}
                  onMouseEnter={() => {
                    if (isRelationshipMode) {
                      setHoveredHandleId(entry.title);
                    }
                  }}
                  onMouseLeave={() => {
                    if (isRelationshipMode) {
                      setHoveredHandleId(null);
                    }
                  }}
                  onMouseDown={(e) => {
                    if (isRelationshipMode) {
                      e.stopPropagation();
                      setSelectedHandle({ nodeId: nodeId || "", handleId: entry.title, type: "target" });
                    }
                  }}
                >
                  <BaseHandle
                    id={entry.title}
                    type="target"
                    position={Position.Left}
                    className={cn(
                      "z-50",
                      selectedHandle?.nodeId === nodeId && selectedHandle?.handleId === entry.title 
                        ? "!border-blue-600 !bg-blue-600 !h-[11px] !w-[11px]" 
                        : hoveredHandleId === entry.title 
                        ? "!border-blue-600 !h-[11px] !w-[11px]" 
                        : ""
                    )}
                  />
                </div>
                {/* Right handle - positioned on the right edge */}
                <div
                  className={`absolute top-1/2 -translate-y-1/2 transition-opacity duration-200 z-50 ${
                    isRelationshipMode
                      ? selectedHandle?.nodeId === nodeId && selectedHandle?.handleId === entry.title && selectedHandle?.type === "source"
                        ? "opacity-100 pointer-events-auto"
                        : hoverSide === "right"
                        ? "opacity-100 pointer-events-auto"
                        : "opacity-0 pointer-events-none"
                      : "opacity-0 pointer-events-none"
                  }`}
                  style={{ right: '-2px' }}
                  onMouseEnter={() => {
                    if (isRelationshipMode) {
                      setHoveredHandleId(entry.title);
                    }
                  }}
                  onMouseLeave={() => {
                    if (isRelationshipMode) {
                      setHoveredHandleId(null);
                    }
                  }}
                  onMouseDown={(e) => {
                    if (isRelationshipMode) {
                      e.stopPropagation();
                      setSelectedHandle({ nodeId: nodeId || "", handleId: entry.title, type: "source" });
                    }
                  }}
                >
                  <BaseHandle
                    id={entry.title}
                    type="source"
                    position={Position.Right}
                    className={cn(
                      "z-50",
                      selectedHandle?.nodeId === nodeId && selectedHandle?.handleId === entry.title 
                        ? "!border-blue-600 !bg-blue-600 !h-[11px] !w-[11px]" 
                        : hoveredHandleId === entry.title 
                        ? "!border-blue-600 !h-[11px] !w-[11px]" 
                        : ""
                    )}
                  />
                </div>
              </td>
              <DatabaseSchemaTableCell className={`pl-[24px] pr-4 py-[3.84px] ${index === 0 ? "!pt-2" : ""} ${index === data.schema.length - 1 ? "!pb-2" : ""}`}>
                <div className="relative flex items-center flex-row gap-2">
                  {isReorderMode && (
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
                  {isHoverMode && hoverModeDragIndex === index && (
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
                  {editingFieldId === entry.title ? (
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
                        handleFieldNameDoubleClick(entry.title);
                      }}
                    >
                      {entry.title}
                    </label>
                  )}
                </div>
              </DatabaseSchemaTableCell>
              <DatabaseSchemaTableCell className={`pr-3 py-[3.84px] ${index === 0 ? "!pt-2" : ""} ${index === data.schema.length - 1 ? "!pb-2" : ""}`}>
                <div className="relative flex items-center justify-end">
                  <label className={`text-gray-500 text-right transition-opacity ${isHoverMode && hoveredFieldIndex === index ? "opacity-0" : "opacity-100"}`}>
                    {entry.title === "id" 
                      ? "objectId" 
                      : (["price", "quantity", "capacity"].includes(entry.title) 
                          ? "int" 
                          : "string")}
                  </label>
                </div>
              </DatabaseSchemaTableCell>
            </DatabaseSchemaTableRow>
          ))}
        </DatabaseSchemaNodeBody>
      </div>
    </DatabaseSchemaNode>
    </div>
  );
});

DatabaseSchemaDemo.displayName = "DatabaseSchemaDemo";

export default DatabaseSchemaDemo;

