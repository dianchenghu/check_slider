import { Node, Edge } from "@xyflow/react";

export interface SchemaTable {
  id: string;
  label: string;
  position: { x: number; y: number };
  schema: { title: string; type: string }[];
}

export interface SchemaRelationship {
  id: string;
  source: string;
  target: string;
  sourceHandle: string;
  targetHandle: string;
}

export interface SchemaData {
  tables: SchemaTable[];
  relationships: SchemaRelationship[];
}

export function loadSchemaFromJSON(data: SchemaData): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = data.tables.map((table) => ({
    id: table.id,
    position: table.position,
    type: "databaseSchema",
    data: {
      label: table.label,
      schema: table.schema,
    },
  }));

  const edges: Edge[] = data.relationships.map((rel) => ({
    id: rel.id,
    source: rel.source,
    target: rel.target,
    sourceHandle: rel.sourceHandle,
    targetHandle: rel.targetHandle,
    type: "smoothstep",
  }));

  return { nodes, edges };
}

