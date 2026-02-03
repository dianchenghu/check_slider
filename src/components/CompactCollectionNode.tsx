import { memo } from "react";
import { Position, Handle } from "@xyflow/react";
import { BaseNode } from "@/components/base-node";
import { cn } from "@/lib/utils";

type CompactCollectionNodeData = {
  label: string;
  schema?: { title: string }[];
};

const CompactCollectionNode = memo(({ data }: { data: CompactCollectionNodeData }) => {
  const fields = data.schema ?? [];
  const count = Math.max(fields.length, 1);

  return (
    <BaseNode className="relative flex items-center justify-center w-[240px] h-[80px] border border-gray-300 bg-white shadow-sm">
      <div className="text-xs font-semibold text-gray-800 text-center px-3">
        {data.label} ({fields.length} fields)
      </div>
      {fields.map((field, index) => {
        const top = `${((index + 1) / (count + 1)) * 100}%`;
        return (
          <div key={field.title}>
            <Handle
              type="target"
              position={Position.Left}
              id={field.title}
              className={cn("opacity-0 pointer-events-none")}
              style={{ top }}
            />
            <Handle
              type="source"
              position={Position.Right}
              id={field.title}
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
