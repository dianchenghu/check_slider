import { useState } from "react";
import { Node, Edge } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { getHandleIds } from "@/lib/schemaLoader";

function getNodeLabel(nodes: Node[], nodeId: string): string {
  const node = nodes.find((n) => n.id === nodeId);
  return (node?.data as { label?: string })?.label ?? nodeId;
}

function getNodeFields(nodes: Node[], nodeId: string): string[] {
  const node = nodes.find((n) => n.id === nodeId);
  const schema = (node?.data as { schema?: unknown[] })?.schema ?? [];
  return getHandleIds(schema as { title: string; type: string; fields?: unknown[] }[]);
}

interface RelationshipPanelProps {
  edge: Edge | null;
  nodes: Node[];
  onClose: () => void;
  onDelete: (edgeId: string) => void;
  onUpdate: (edgeId: string, updates: Partial<Edge>) => void;
  notes: Record<string, string>;
  onNotesChange: (edgeId: string, notes: string) => void;
}

const CARDINALITY_OPTIONS = ["One 1", "Many *", "One or many 1..*", "Zero or one 0..1"];

export function RelationshipPanel({
  edge,
  nodes,
  onClose,
  onDelete,
  onUpdate,
  notes,
  onNotesChange,
}: RelationshipPanelProps) {
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    properties: false,
    notes: false,
  });

  if (!edge) return null;

  const sourceLabel = getNodeLabel(nodes, edge.source);
  const targetLabel = getNodeLabel(nodes, edge.target);
  const sourceHandle = edge.sourceHandle ?? "";
  const targetHandle = edge.targetHandle ?? "id";
  const displayTitle = `${sourceLabel}.${sourceHandle} → ${targetLabel}.${targetHandle}`;

  const sourceFields = getNodeFields(nodes, edge.source);
  const targetFields = getNodeFields(nodes, edge.target);

  const toggleSection = (key: string) => {
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="absolute top-0 right-0 bottom-0 w-80 bg-white border-l border-gray-200 shadow-lg flex flex-col font-euclid z-10">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h2 className="text-base font-semibold text-gray-800 truncate flex-1 text-sm">
          {displayTitle}
        </h2>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onDelete(edge.id)}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-red-600"
            title="Delete relationship"
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
        {/* Section 1: Relationship Properties */}
        <div className="mb-4">
          <button
            onClick={() => toggleSection("properties")}
            className="w-full flex items-center justify-between py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700"
          >
            Relationship Properties
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
            <div className="mt-2 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Local collection</label>
                <select
                  value={edge.source}
                  onChange={(e) => onUpdate(edge.id, { source: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {getNodeLabel(nodes, n.id)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Foreign collection</label>
                <select
                  value={edge.target}
                  onChange={(e) => onUpdate(edge.id, { target: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {getNodeLabel(nodes, n.id)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Local field</label>
                <select
                  value={sourceHandle}
                  onChange={(e) => onUpdate(edge.id, { sourceHandle: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {sourceFields.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Foreign field</label>
                <select
                  value={targetHandle}
                  onChange={(e) => onUpdate(edge.id, { targetHandle: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {targetFields.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Local cardinality</label>
                <select
                  defaultValue="One 1"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CARDINALITY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Foreign cardinality</label>
                <select
                  defaultValue="One 1"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CARDINALITY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-gray-500 flex items-start gap-1">
                <span>ⓘ</span>
                <span>Relationship cardinality can inform whether you embed or reference.{" "}
                  <a href="#" className="text-blue-600 hover:underline inline-flex items-center gap-0.5">
                    Learn more
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </a>
                </span>
              </p>
            </div>
          )}
        </div>

        {/* Section 2: Notes */}
        <div>
          <button
            onClick={() => toggleSection("notes")}
            className="w-full flex items-center justify-between py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 border-t border-gray-100"
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
                value={notes[edge.id] ?? ""}
                onChange={(e) => onNotesChange(edge.id, e.target.value)}
                placeholder="Add notes about this relationship..."
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
