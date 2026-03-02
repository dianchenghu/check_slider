import { useState, useEffect } from "react";
import { Node, Edge } from "@xyflow/react";
import { cn } from "@/lib/utils";
import {
  updateFieldTitleByPath,
  updateFieldTypeByPath,
  type SchemaField,
} from "@/lib/schemaLoader";

const DATATYPES = [
  "varchar",
  "int4",
  "uuid",
  "object",
  "money",
  "date",
  "timestamp",
  "boolean",
  "numeric",
  "[]",
];

function getNodeLabel(nodes: Node[], nodeId: string): string {
  const node = nodes.find((n) => n.id === nodeId);
  return (node?.data as { label?: string })?.label ?? nodeId;
}

interface FieldPanelProps {
  nodeId: string;
  fieldPath: string;
  fieldTitle: string;
  fieldType: string;
  nodes: Node[];
  edges: Edge[];
  onClose: () => void;
  onUpdate: (nodeId: string, schema: SchemaField[]) => void;
  onDeleteField: (nodeId: string, fieldPath: string) => void;
  onDeleteRelationship: (edgeId: string) => void;
  onAddRelationship?: () => void;
}

export function FieldPanel({
  nodeId,
  fieldPath,
  fieldTitle,
  fieldType,
  nodes,
  edges,
  onClose,
  onUpdate,
  onDeleteField,
  onDeleteRelationship,
  onAddRelationship,
}: FieldPanelProps) {
  const [nameValue, setNameValue] = useState(fieldTitle);
  const [typeValue, setTypeValue] = useState(fieldType);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    properties: false,
    relationships: false,
  });

  useEffect(() => {
    setNameValue(fieldTitle);
    setTypeValue(fieldType);
  }, [fieldPath, fieldTitle, fieldType]);

  const node = nodes.find((n) => n.id === nodeId);
  const collectionLabel = (node?.data as { label?: string })?.label ?? nodeId;
  const displayPath = `${collectionLabel}.${fieldPath.split(".").pop() ?? fieldPath}`;

  const toggleSection = (key: string) => {
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const relationships = edges.filter(
    (e) =>
      (e.source === nodeId && e.sourceHandle === fieldPath) ||
      (e.target === nodeId && e.targetHandle === fieldPath)
  );

  const handleNameBlur = () => {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== fieldTitle) {
      const schema = (node?.data as { schema?: SchemaField[] })?.schema ?? [];
      const newSchema = updateFieldTitleByPath(schema, fieldPath, trimmed);
      onUpdate(nodeId, newSchema);
    }
  };

  const handleTypeSelect = (newType: string) => {
    setTypeValue(newType);
    setShowTypeDropdown(false);
    const schema = (node?.data as { schema?: SchemaField[] })?.schema ?? [];
    const newSchema = updateFieldTypeByPath(schema, fieldPath, newType);
    onUpdate(nodeId, newSchema);
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
          {displayPath}
        </h2>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onDeleteField(nodeId, fieldPath)}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-red-600"
            title="Delete field"
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
        {/* Section 1: Field Properties */}
        <div className="mb-4">
          <button
            onClick={() => toggleSection("properties")}
            className="w-full flex items-center justify-between py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700"
          >
            Field Properties
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
                <label className="block text-xs font-medium text-gray-700 mb-1">Field name</label>
                <input
                  type="text"
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  onBlur={handleNameBlur}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Datatype</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md flex items-center justify-between bg-white hover:bg-gray-50"
                  >
                    <span className="inline-flex items-center gap-1">
                      <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-700">
                        {typeValue}
                      </span>
                    </span>
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className={cn("transition-transform", showTypeDropdown && "rotate-180")}
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                  {showTypeDropdown && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowTypeDropdown(false)}
                      />
                      <div className="absolute top-full left-0 right-0 mt-1 py-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
                        {DATATYPES.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => handleTypeSelect(t)}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Relationships */}
        <div>
          <button
            onClick={() => toggleSection("relationships")}
            className="w-full flex items-center justify-between py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 border-t border-gray-100"
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
            <div className="mt-2">
              {relationships.length === 0 ? (
                <p className="text-sm text-gray-500">This field does not have any relationships yet.</p>
              ) : (
                <div className="space-y-2">
                  {relationships.map((edge) => (
                    <div
                      key={edge.id}
                      className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md group"
                    >
                      <span className="text-sm text-gray-700 flex-1 truncate">
                        {formatRelationship(edge)}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
