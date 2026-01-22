import { useEffect, useState, useRef } from "react";
import { useReactFlow, Node } from "@xyflow/react";

interface GroupingHandlerProps {
  isGroupingMode: boolean;
  setIsGroupingMode: (value: boolean) => void;
  groupCounter: number;
  setGroupCounter: (value: number | ((prev: number) => number)) => void;
  mousePosition: { x: number; y: number };
  setMousePosition: (value: { x: number; y: number }) => void;
  isDrawingRectangle: boolean;
  setIsDrawingRectangle: (value: boolean) => void;
  rectangleStart: { x: number; y: number } | null;
  setRectangleStart: (value: { x: number; y: number } | null) => void;
  rectangleEnd: { x: number; y: number } | null;
  setRectangleEnd: (value: { x: number; y: number } | null) => void;
}

export function GroupingHandler({
  isGroupingMode,
  setIsGroupingMode,
  groupCounter,
  setGroupCounter,
  mousePosition,
  setMousePosition,
  isDrawingRectangle,
  setIsDrawingRectangle,
  rectangleStart,
  setRectangleStart,
  rectangleEnd,
  setRectangleEnd,
}: GroupingHandlerProps) {
  const { getNodes, setNodes, flowToScreenPosition } = useReactFlow();
  
  // Reset drawing state when grouping mode is disabled
  useEffect(() => {
    if (!isGroupingMode) {
      setIsDrawingRectangle(false);
      setRectangleStart(null);
      setRectangleEnd(null);
    }
  }, [isGroupingMode, setIsDrawingRectangle, setRectangleStart, setRectangleEnd]);

  // Handle mouse move for tooltip
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isGroupingMode) {
        setMousePosition({ x: e.clientX, y: e.clientY });
      }
    };

    if (isGroupingMode) {
      window.addEventListener("mousemove", handleMouseMove);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [isGroupingMode, setMousePosition]);

  // Handle group creation when rectangle drawing ends
  const prevIsDrawingRectangle = useRef(isDrawingRectangle);
  
  useEffect(() => {
    // Only create group when drawing ends (transitions from true to false)
    if (prevIsDrawingRectangle.current && !isDrawingRectangle && rectangleStart && rectangleEnd) {
      // Check if rectangle has meaningful size (user has dragged)
      const minX = Math.min(rectangleStart.x, rectangleEnd.x);
      const maxX = Math.max(rectangleStart.x, rectangleEnd.x);
      const minY = Math.min(rectangleStart.y, rectangleEnd.y);
      const maxY = Math.max(rectangleStart.y, rectangleEnd.y);
      
      const width = maxX - minX;
      const height = maxY - minY;
      
      // Only create group if rectangle has meaningful size (user has dragged)
      if (width > 10 && height > 10) {
        createGroupWithBounds(rectangleStart, rectangleEnd);
        setRectangleStart(null);
        setRectangleEnd(null);
      } else {
        // Clear rectangle if too small
        setRectangleStart(null);
        setRectangleEnd(null);
      }
    }
    
    prevIsDrawingRectangle.current = isDrawingRectangle;
  }, [isDrawingRectangle, rectangleStart, rectangleEnd, setRectangleStart, setRectangleEnd]);

  const createGroupWithBounds = (start: { x: number; y: number }, end: { x: number; y: number }) => {
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);

    const allNodes = getNodes();
    const databaseNodes = allNodes.filter((node) => node.type === "databaseSchema" && !node.parentId);

    // Find nodes that intersect with the rectangle
    const nodesInGroup: Node[] = [];
    databaseNodes.forEach((node) => {
      if (!node.position) return;

      // Get node dimensions from DOM or use defaults
      const nodeElement = document.querySelector(`[data-id="${node.id}"]`) as HTMLElement;
      const nodeWidth = nodeElement?.offsetWidth || 300;
      const nodeHeight = nodeElement?.offsetHeight || 200;

      const nodeLeft = node.position.x;
      const nodeRight = node.position.x + nodeWidth;
      const nodeTop = node.position.y;
      const nodeBottom = node.position.y + nodeHeight;

      // Check if node intersects with rectangle (any part)
      const intersects =
        nodeLeft < maxX &&
        nodeRight > minX &&
        nodeTop < maxY &&
        nodeBottom > minY;

      if (intersects) {
        nodesInGroup.push(node);
      }
    });

    if (nodesInGroup.length === 0) {
      return;
    }

    // Calculate group bounds based on node positions and sizes
    const nodeBounds = nodesInGroup.map((n) => {
      const nodeElement = document.querySelector(`[data-id="${n.id}"]`) as HTMLElement;
      const width = nodeElement?.offsetWidth || 300;
      const height = nodeElement?.offsetHeight || 200;
      return {
        left: n.position!.x,
        right: n.position!.x + width,
        top: n.position!.y,
        bottom: n.position!.y + height,
        width,
        height,
      };
    });

    const groupMinX = Math.min(...nodeBounds.map((b) => b.left));
    const groupMaxX = Math.max(...nodeBounds.map((b) => b.right));
    const groupMinY = Math.min(...nodeBounds.map((b) => b.top));
    const groupMaxY = Math.max(...nodeBounds.map((b) => b.bottom));

    // Calculate group position and size with padding
    // Ensure padding is large enough to show border around all nodes
    const padding = 60; // Increased padding to ensure border is visible around all nodes
    const groupX = groupMinX - padding;
    const groupY = groupMinY - padding;
    // Calculate width and height: groupMaxX/groupMaxY already include node width/height
    // So we just need to add padding on both sides
    const finalGroupWidth = (groupMaxX - groupMinX) + padding * 2;
    const finalGroupHeight = (groupMaxY - groupMinY) + padding * 2;

    // Create group node - will be placed at the beginning of nodes array to render behind children
    const groupId = `group-${groupCounter}`;
    const groupNode: Node = {
      id: groupId,
      type: "group",
      position: { x: groupX, y: groupY },
      data: {
        label: `Group ${groupCounter}`,
        nodeIds: nodesInGroup.map((n) => n.id),
      },
      style: {
        width: finalGroupWidth,
        height: finalGroupHeight,
      },
      draggable: true,
    };

    // Update nodes: set parentId and adjust position relative to group
    // Keep nodes in their original positions but make them relative to the group
    const updatedNodes = allNodes.map((node) => {
      const nodeIndex = nodesInGroup.findIndex((n) => n.id === node.id);
      if (nodeIndex !== -1 && node.position) {
        // Calculate position relative to group (subtract group position)
        const relativeX = node.position.x - groupX;
        const relativeY = node.position.y - groupY;

        return {
          ...node,
          position: { x: relativeX, y: relativeY },
          parentId: groupId,
          extent: "parent" as const,
        };
      }
      return node;
    });

    // Add group node at the beginning to ensure it's rendered behind child nodes
    // ReactFlow renders nodes in order, so group should be first
    const finalNodes = [groupNode, ...updatedNodes];

    setNodes(finalNodes);
    setGroupCounter((prev) => prev + 1);
    setIsGroupingMode(false);
  };

  // Render rectangle
  if (!isDrawingRectangle || !rectangleStart || !rectangleEnd) {
    return null;
  }

  const minX = Math.min(rectangleStart.x, rectangleEnd.x);
  const maxX = Math.max(rectangleStart.x, rectangleEnd.x);
  const minY = Math.min(rectangleStart.y, rectangleEnd.y);
  const maxY = Math.max(rectangleStart.y, rectangleEnd.y);

  // Convert flow coordinates to screen coordinates
  const topLeft = flowToScreenPosition({ x: minX, y: minY });
  const bottomRight = flowToScreenPosition({ x: maxX, y: maxY });
  
  const screenWidth = Math.abs(bottomRight.x - topLeft.x);
  const screenHeight = Math.abs(bottomRight.y - topLeft.y);

  if (screenWidth === 0 || screenHeight === 0) return null;

  return (
    <div
      className="pointer-events-none"
      style={{
        position: 'absolute',
        left: `${topLeft.x}px`,
        top: `${topLeft.y}px`,
        width: `${screenWidth}px`,
        height: `${screenHeight}px`,
        border: '2px solid rgb(96 165 250)',
        backgroundColor: 'rgba(191 219 254 / 0.3)',
        zIndex: 10,
      }}
    />
  );
}
