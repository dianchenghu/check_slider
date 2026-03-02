import { memo } from "react";
import { Position, Handle } from "@xyflow/react";
import { BaseNode } from "@/components/base-node";
import { cn } from "@/lib/utils";
import { type SchemaField, getHandleIds, countLeafFields } from "@/lib/schemaLoader";

type CompactCollectionNodeData = {
  label: string;
  schema?: SchemaField[];
};

const CompactCollectionNode = memo(({ data }: { data: CompactCollectionNodeData }) => {
  const schema = data.schema ?? [];
  const handleIds = getHandleIds(schema);
  const fieldCount = countLeafFields(schema);
  const count = Math.max(handleIds.length, 1);

  return (
    <BaseNode className="relative flex items-center justify-center w-[240px] h-[80px] border border-gray-300 bg-white shadow-sm">
      <div className="text-xs font-semibold text-gray-800 text-center px-3">
        {data.label} ({fieldCount} fields)
      </div>
      {handleIds.map((handleId, index) => {
        const top = `${((index + 1) / (count + 1)) * 100}%`;
        return (
          <div key={handleId}>
            <Handle
              type="target"
              position={Position.Left}
              id={handleId}
              className={cn("opacity-0 pointer-events-none")}
              style={{ top }}
            />
            <Handle
              type="source"
              position={Position.Right}
              id={handleId}
              className={cn("opacity-0 pointer-events-none")}
              style={{ top }}
            />
          </div>
        );
      })}
    </BaseNode>
  );
});

CompactCollectionNode.displayName = "CompactCollectionNode";

export default CompactCollectionNode;
