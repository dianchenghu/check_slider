import { useEffect, useRef } from "react";
import { useReactFlow } from "@xyflow/react";

interface RectangleDrawerProps {
  isGroupingMode: boolean;
  setIsDrawingRectangle: (value: boolean) => void;
  setRectangleStart: (value: { x: number; y: number } | null) => void;
  setRectangleEnd: (value: { x: number; y: number } | null) => void;
  setMousePosition: (value: { x: number; y: number }) => void;
}

export function RectangleDrawer({
  isGroupingMode,
  setIsDrawingRectangle,
  setRectangleStart,
  setRectangleEnd,
  setMousePosition,
}: RectangleDrawerProps) {
  const reactFlowInstance = useReactFlow();
  const isDrawingRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!isGroupingMode) {
      isDrawingRef.current = false;
      setIsDrawingRectangle(false);
      setRectangleStart(null);
      setRectangleEnd(null);
      return;
    }

    const handleMouseDown = (e: MouseEvent) => {
      if (!isGroupingMode) return;
      
      const target = e.target as HTMLElement;

      // Don't start drawing if clicking on nodes or UI elements
      if (
        target.closest('.react-flow__node') ||
        target.closest('button') ||
        target.closest('.react-flow__controls') ||
        target.closest('.react-flow__minimap') ||
        target.closest('.absolute.top-4')
      ) {
        return;
      }

      // Check if clicking within ReactFlow container
      const reactFlowContainer = target.closest('.react-flow');
      if (!reactFlowContainer) return;

      // Check if clicking on background/pane/viewport
      const pane = target.closest('.react-flow__pane');
      const background = target.closest('.react-flow__background');
      const viewport = target.closest('.react-flow__viewport');
      
      // Allow if clicking on pane, background, or viewport (but not on nodes)
      if (!pane && !background && !viewport) return;

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const flowStart = reactFlowInstance.screenToFlowPosition({ x: e.clientX, y: e.clientY });

      isDrawingRef.current = true;
      startPosRef.current = flowStart;
      setIsDrawingRectangle(true);
      setRectangleStart(flowStart);
      setRectangleEnd(flowStart);
      setMousePosition({ x: -10000, y: -10000 });

      const handleMouseMove = (e: MouseEvent) => {
        if (!isDrawingRef.current || !startPosRef.current) return;
        e.preventDefault();
        const flowEnd = reactFlowInstance.screenToFlowPosition({ x: e.clientX, y: e.clientY });
        setRectangleEnd(flowEnd);
      };

      const handleMouseUp = (e: MouseEvent) => {
        if (!isDrawingRef.current || !startPosRef.current) return;
        e.preventDefault();
        const flowEnd = reactFlowInstance.screenToFlowPosition({ x: e.clientX, y: e.clientY });
        setRectangleEnd(flowEnd);
        isDrawingRef.current = false;
        setIsDrawingRectangle(false);
        startPosRef.current = null;
        
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove, { passive: false });
      document.addEventListener("mouseup", handleMouseUp, { passive: false });
    };

    // Use capture phase to catch events before ReactFlow
    document.addEventListener("mousedown", handleMouseDown, { capture: true, passive: false });

    return () => {
      document.removeEventListener("mousedown", handleMouseDown, { capture: true });
    };
  }, [isGroupingMode, reactFlowInstance, setRectangleStart, setRectangleEnd, setIsDrawingRectangle, setMousePosition]);

  // This component doesn't render anything, it just handles events
  return null;
}

