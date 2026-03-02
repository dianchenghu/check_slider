import { type ReactNode } from "react";

import {
  BaseNode,
  BaseNodeContent,
  BaseNodeHeader,
} from "@/components/base-node";
import { TableBody, TableRow, TableCell } from "@/components/ui/table";
import { cn } from "@/lib/utils";

/* DATABASE SCHEMA NODE HEADER ------------------------------------------------ */
/**
 * A container for the database schema node header.
 */
export type DatabaseSchemaNodeHeaderProps = {
  children?: ReactNode;
};

export const DatabaseSchemaNodeHeader = ({
  children,
}: DatabaseSchemaNodeHeaderProps) => {
  return (
    <BaseNodeHeader className="rounded-tl-md rounded-tr-md py-2 px-3 text-sm flex items-center border-b border-gray-200" style={{ backgroundColor: '#E8EDEB' }}>
      {children}
    </BaseNodeHeader>
  );
};

/* DATABASE SCHEMA NODE BODY -------------------------------------------------- */
/**
 * A container for the database schema node body that wraps the table.
 */
export type DatabaseSchemaNodeBodyProps = {
  children?: ReactNode;
};

export const DatabaseSchemaNodeBody = ({
  children,
}: DatabaseSchemaNodeBodyProps) => {
  return (
    <BaseNodeContent className="p-0 pb-1">
      <table className="border-spacing-y-0 overflow-visible">
        <TableBody className="[&_tr]:border-0 [&_tr:first-child]:pt-2 [&_tr:last-child]:pb-2">{children}</TableBody>
      </table>
    </BaseNodeContent>
  );
};

/* DATABASE SCHEMA TABLE ROW -------------------------------------------------- */
/**
 * A wrapper for individual table rows in the database schema node.
 */

export type DatabaseSchemaTableRowProps = {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  draggable?: boolean;
  "data-field-row"?: boolean;
  "data-node-id"?: string;
  "data-field-path"?: string;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
};

export const DatabaseSchemaTableRow = ({
  children,
  className,
  style,
  draggable,
  "data-field-row": dataFieldRow,
  "data-node-id": dataNodeId,
  "data-field-path": dataFieldPath,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onMouseDown,
  onMouseEnter,
  onMouseLeave,
}: DatabaseSchemaTableRowProps) => {
  return (
    <TableRow
      className={cn("relative text-xs bg-white hover:bg-gray-100/50 border-0", className)}
      style={style}
      draggable={draggable}
      {...(dataFieldRow && { "data-field-row": "" })}
      {...(dataNodeId && { "data-node-id": dataNodeId })}
      {...(dataFieldPath && { "data-field-path": dataFieldPath })}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </TableRow>
  );
};

/* DATABASE SCHEMA TABLE CELL ------------------------------------------------- */
/**
 * A simplified table cell for the database schema node.
 * Renders static content without additional dynamic props.
 */
export type DatabaseSchemaTableCellProps = {
  className?: string;
  children?: ReactNode;
};

export const DatabaseSchemaTableCell = ({
  className,
  children,
}: DatabaseSchemaTableCellProps) => {
  return <TableCell className={cn("py-1 px-2", className)}>{children}</TableCell>;
};

/* DATABASE SCHEMA NODE ------------------------------------------------------- */
/**
 * The main DatabaseSchemaNode component that wraps the header and body.
 * It maps over the provided schema data to render rows and cells.
 */
export type DatabaseSchemaNodeProps = {
  className?: string;
  children?: ReactNode;
  style?: React.CSSProperties;
};

export const DatabaseSchemaNode = ({
  className,
  children,
  style,
}: DatabaseSchemaNodeProps) => {
  return <BaseNode className={className} style={style}>{children}</BaseNode>;
};
