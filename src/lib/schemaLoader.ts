import { Node, Edge } from "@xyflow/react";

export interface SchemaFieldBase {
  title: string;
  type: string;
}

export interface SchemaFieldObject extends SchemaFieldBase {
  type: "object";
  fields: SchemaField[];
}

export type SchemaField = SchemaFieldBase | SchemaFieldObject;

export function isSchemaFieldObject(f: SchemaField): f is SchemaFieldObject {
  return f.type === "object" && "fields" in f && Array.isArray((f as SchemaFieldObject).fields);
}

/** Flatten schema into display rows. Nested fields get path like "parent.child". */
export interface FlattenedField {
  path: string;
  title: string;
  type: string;
  isNested: boolean;
  parentPath?: string;
  /** Top-level schema index; set for reorderable rows. */
  topLevelIndex?: number;
  /** For nested rows: top-level index of the parent object (for drop target). */
  parentTopLevelIndex?: number;
}

export function flattenSchema(
  schema: SchemaField[],
  parentPath = "",
  parentTopLevelIdx?: number
): FlattenedField[] {
  const result: FlattenedField[] = [];
  schema.forEach((f, idx) => {
    const path = parentPath ? `${parentPath}.${f.title}` : f.title;
    const isNested = !!parentPath;
    const topLevelIndex = parentPath ? undefined : idx;
    const parentTopLevelIndex = parentPath ? parentTopLevelIdx : undefined;
    if (isSchemaFieldObject(f)) {
      result.push({
        path,
        title: f.title,
        type: "object",
        isNested,
        parentPath: parentPath || undefined,
        topLevelIndex,
        parentTopLevelIndex,
      });
      result.push(...flattenSchema(f.fields, path, topLevelIndex ?? parentTopLevelIdx));
    } else {
      result.push({
        path,
        title: f.title,
        type: f.type,
        isNested,
        parentPath: parentPath || undefined,
        topLevelIndex,
        parentTopLevelIndex,
      });
    }
  });
  return result;
}

/** Count all leaf fields (including nested). Object type itself is not a leaf. */
export function countLeafFields(schema: SchemaField[]): number {
  let count = 0;
  for (const f of schema) {
    if (isSchemaFieldObject(f)) {
      count += countLeafFields(f.fields);
    } else {
      count += 1;
    }
  }
  return count;
}

/** Get all handle IDs (leaf field paths) for relationship connections. */
export function getHandleIds(schema: SchemaField[], parentPath = ""): string[] {
  const result: string[] = [];
  for (const f of schema) {
    const path = parentPath ? `${parentPath}.${f.title}` : f.title;
    if (isSchemaFieldObject(f)) {
      result.push(...getHandleIds(f.fields, path));
    } else {
      result.push(path);
    }
  }
  return result;
}

/** Get field type by path. */
export function getFieldTypeByPath(schema: SchemaField[], path: string): string | undefined {
  const parts = path.split(".");
  let current: SchemaField[] = schema;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const field = current.find((f) => f.title === part);
    if (!field) return undefined;
    if (i === parts.length - 1) return field.type;
    if (!isSchemaFieldObject(field)) return undefined;
    current = field.fields;
  }
  return undefined;
}

/** Update a field's type by path. Returns new schema (immutable). */
export function updateFieldTypeByPath(
  schema: SchemaField[],
  path: string,
  newType: string
): SchemaField[] {
  const parts = path.split(".");
  const first = parts[0];
  if (parts.length === 1) {
    return schema.map((f) => {
      if (f.title !== first) return f;
      if (newType === "object" && !isSchemaFieldObject(f)) {
        return { ...f, type: "object", fields: [] } as SchemaFieldObject;
      }
      if (newType !== "object" && isSchemaFieldObject(f)) {
        return { title: f.title, type: newType };
      }
      return { ...f, type: newType };
    });
  }
  return schema.map((f) => {
    if (f.title !== first) return f;
    if (!isSchemaFieldObject(f)) return f;
    const restPath = parts.slice(1).join(".");
    return {
      ...f,
      fields: updateFieldTypeByPath(f.fields, restPath, newType),
    };
  });
}

/** Remove a field by path. Returns new schema (immutable). */
export function removeFieldByPath(schema: SchemaField[], path: string): SchemaField[] {
  const parts = path.split(".");
  const first = parts[0];
  if (parts.length === 1) {
    return schema.filter((f) => f.title !== first);
  }
  return schema
    .map((f) => {
      if (f.title !== first) return f;
      if (!isSchemaFieldObject(f)) return f;
      const restPath = parts.slice(1).join(".");
      const newFields = removeFieldByPath(f.fields, restPath);
      if (newFields.length === 0) return null;
      return { ...f, fields: newFields };
    })
    .filter((f): f is SchemaField => f !== null);
}

/** Update a field's title by path. Returns new schema (immutable). */
export function updateFieldTitleByPath(
  schema: SchemaField[],
  path: string,
  newTitle: string
): SchemaField[] {
  const parts = path.split(".");
  const first = parts[0];
  if (parts.length === 1) {
    return schema.map((f) =>
      f.title === first ? { ...f, title: newTitle } : f
    );
  }
  return schema.map((f) => {
    if (f.title !== first) return f;
    if (!isSchemaFieldObject(f)) return f;
    const restPath = parts.slice(1).join(".");
    return {
      ...f,
      fields: updateFieldTitleByPath(f.fields, restPath, newTitle),
    };
  });
}

export interface SchemaTable {
  id: string;
  label: string;
  position: { x: number; y: number };
  schema: SchemaField[];
}

export interface SchemaRelationship {
  id: string;
  source: string;
  target: string;
  sourceHandle: string;
  targetHandle: string;
  manySide?: "source" | "target";
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
    data: {
      manySide: rel.manySide,
    },
  }));

  return { nodes, edges };
}

