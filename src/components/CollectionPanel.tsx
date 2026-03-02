import { useState, useEffect } from "react";
import { Node, Edge } from "@xyflow/react";
import { cn } from "@/lib/utils";

interface CollectionPanelProps {
  node: Node | null;
  nodes: Node[];
  edges: Edge[];
  onClose: () => void;
  onRename: (nodeId: string, newLabel: string) => void;
  onDelete: (nodeId: string) => void;
  onDeleteRelationship: (edgeId: string) => void;
  onAddRelationship?: () => void;
  notes: Record<string, string>;
  onNotesChange: (nodeId: string, notes: string) => void;
}

function getNodeLabel(nodes: Node[], nodeId: string): string {
  const node = nodes.find((n) => n.id === nodeId);
  return (node?.data as { label?: string })?.label ?? nodeId;
}

export function CollectionPanel({
  node,
  nodes,
  edges,
  onClose,
  onRename,
  onDelete,
  onDeleteRelationship,
  onAddRelationship,
  notes,
  onNotesChange,
}: CollectionPanelProps) {
  const [nameValue, setNameValue] = useState("");
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    properties: false,
    relationships: false,
    notes: false,
  });

  if (!node) return null;

  const label = (node.data as { label?: string })?.label ?? node.id;

  useEffect(() => {
    setNameValue(label);
  }, [label]);

  const toggleSection = (key: string) => {
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const relationships = edges.filter(
    (e) => e.source === node.id || e.target === node.id
  );

  const handleNameBlur = () => {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== label) {
      onRename(node.id, trimmed);
    }
  };

  const formatRelationship = (edge: Edge) => {
    const sourceLabel = getNodeLabel(nodes, edge.source);
    const targetLabel = getNodeLabel(nodes, edge.target);
    const sourceHandle = edge.sourceHandle ?? "";
    const targetHandle = edge.targetHandle ?? "id";
    return `${sourceLabel}.${sourceHandle} → ${targetLabel}.${targetHandle}`;
  };

  return (
    <div className="absolute top-0 right-0 bottom-0 w-80 bg-white border-l border-gray-200 shadow-lg flex flex-col font-euclid z-10">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h2 className="text-base font-semibold text-gray-800 truncate flex-1">
          {label}
        </h2>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onDelete(node.id)}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-red-600"
            title="Delete collection"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
            title="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {/* Section 1: Collection Properties */}
        <div className="mb-4">
          <button
            onClick={() => toggleSection("properties")}
            className="w-full flex items-center justify-between py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700"
          >
            Collection Properties
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={cn("transition-transform", collapsedSections.properties && "rotate-180")}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          {!collapsedSections.properties && (
            <div className="mt-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onBlur={handleNameBlur}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}
        </div>

        {/* Section 2: Relationships */}
        <div className="mb-4">
          <button
            onClick={() => toggleSection("relationships")}
            className="w-full flex items-center justify-between py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700"
          >
            <span>Relationships ({relationships.length})</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onAddRelationship?.()}
                className="text-xs font-normal normal-case text-blue-600 hover:text-blue-700"
              >
                ADD RELATIONSHIP
              </button>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={cn("transition-transform", collapsedSections.relationships && "rotate-180")}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
          </button>
          {!collapsedSections.relationships && (
            <div className="mt-2 space-y-2">
              {relationships.length === 0 ? (
                <p className="text-sm text-gray-500">No relationships</p>
              ) : (
                relationships.map((edge) => (
                  <div
                    key={edge.id}
                    className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md group"
                  >
                    <span className="text-sm text-gray-700 flex-1 truncate">
                      {formatRelationship(edge)}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {}}
                        className="p-1 rounded hover:bg-gray-200 text-gray-500"
                        title="Edit relationship"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => onDeleteRelationship(edge.id)}
                        className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-red-600"
                        title="Delete relationship"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          <line x1="10" y1="11" x2="10" y2="17" />
                          <line x1="14" y1="11" x2="14" y2="17" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Section 3: Notes */}
        <div>
          <button
            onClick={() => toggleSection("notes")}
            className="w-full flex items-center justify-between py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700"
          >
            Notes
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={cn("transition-transform", collapsedSections.notes && "rotate-180")}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          {!collapsedSections.notes && (
            <div className="mt-2">
              <textarea
                value={notes[node.id] ?? ""}
                onChange={(e) => onNotesChange(node.id, e.target.value)}
                placeholder="Add notes about this collection..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none min-h-[120px]"
                rows={5}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
