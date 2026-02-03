import { memo, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { NodeResizer, useReactFlow, useNodeId } from "@xyflow/react";
import { BaseNode } from "@/components/base-node";
import { cn } from "@/lib/utils";

export type GroupNodeData = {
  label: string;
  nodeIds: string[];
};

const GroupNode = memo(({ data }: { data: GroupNodeData }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingValue, setEditingValue] = useState(data.label);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const editingInputRef = useRef<HTMLInputElement>(null);
  const nodeId = useNodeId();
  const { setNodes, getNodes } = useReactFlow();

  useEffect(() => {
    if (isEditing && editingInputRef.current) {
      editingInputRef.current.focus();
      editingInputRef.current.select();
    }
  }, [isEditing]);

  const handleLabelDoubleClick = () => {
    setIsEditing(true);
    setEditingValue(data.label);
  };

  const handleLabelBlur = () => {
    if (editingValue.trim() !== "") {
      setNodes((nodes) =>
        nodes.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                label: editingValue.trim(),
              },
            };
          }
          return node;
        })
      );
    }
    setIsEditing(false);
  };

  const handleLabelKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setEditingValue(data.label);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    // Remove group node and ungroup the nodes
    setNodes((nodes) => {
      const updatedNodes = nodes.filter((node) => node.id !== nodeId);
      // Make grouped nodes draggable again
      return updatedNodes.map((node) => {
        if (data.nodeIds.includes(node.id)) {
          return {
            ...node,
            parentId: undefined,
            extent: undefined,
          };
        }
        return node;
      });
    });
    setShowDeleteConfirm(false);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  return (
    <>
      <BaseNode
        className="p-0 relative overflow-visible border-2 border-blue-400 bg-blue-50/30"
        style={{ width: "100%", height: "100%" }}
      >
        <NodeResizer minWidth={240} minHeight={160} handleStyle={{ width: 10, height: 10 }} />
        <div className="absolute top-2 left-2 flex items-center gap-2 z-10">
          {isEditing ? (
            <input
              ref={editingInputRef}
              type="text"
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              onBlur={handleLabelBlur}
              onKeyDown={handleLabelKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="text-gray-800 px-2 bg-white border border-gray-300 rounded min-w-[100px] outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold"
            />
          ) : (
            <span
              className="font-semibold text-sm text-gray-800 cursor-text bg-white/90 border border-blue-200 rounded px-2 py-0.5 shadow-sm"
              onDoubleClick={handleLabelDoubleClick}
            >
              {data.label}
            </span>
          )}
        </div>
        <button
          onClick={handleDeleteClick}
          className="absolute top-2 right-2 p-1 hover:bg-red-100 rounded transition-colors flex-shrink-0 z-10"
          title="Ungroup"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-red-600"
          >
            <path
              d="M4 4L12 12M12 4L4 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </BaseNode>
      {showDeleteConfirm &&
        createPortal(
          <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center"
            style={{ zIndex: 99999 }}
            onClick={handleCancelDelete}
          >
            <div 
              className="bg-white rounded-lg p-6 shadow-xl max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-2">Ungroup Collections?</h3>
              <p className="text-gray-600 mb-4">
                Are you sure you want to ungroup these collections? This will remove the group but keep all collections.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={handleCancelDelete}
                  className="px-4 py-2 rounded-md text-sm font-medium bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 rounded-md text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  Ungroup
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
});

GroupNode.displayName = "GroupNode";

export default GroupNode;

