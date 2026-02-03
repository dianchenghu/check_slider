import { useReactFlow } from "@xyflow/react";

interface RecommendationCard {
  id: string;
  type: "anti-pattern" | "needs-attention" | "question";
  title: string;
  path?: string;
  pathNodeId?: string;
  patternDetected?: string;
  whyProblem?: string[];
  whyNeedsAttention?: string[];
  whyWeAsk?: string;
  recommendation?: string;
  suggestion?: string;
  guidance?: string[];
}

const recommendations: RecommendationCard[] = [
  {
    id: "1",
    type: "anti-pattern",
    title: "Massive Unbounded Array",
    path: "orders.items[]",
    pathNodeId: "4", // Orders node
    whyProblem: [
      "Single document can exceed 16MB limit",
      "Updates become increasingly expensive",
    ],
    recommendation: "Split items into a separate collection and reference by orderId.",
  },
  {
    id: "2",
    type: "anti-pattern",
    title: "Frequently Updated Large Document",
    path: "products",
    pathNodeId: "1", // Products node
    patternDetected: "Document contains multiple large fields updated at high frequency.",
    whyProblem: [
      "Causes excessive document rewrites",
      "Impacts write performance and replication lag",
    ],
    recommendation: "Move frequently updated fields into a separate collection or use a bucket pattern.",
  },
  {
    id: "3",
    type: "needs-attention",
    title: "Deeply Nested Document Structure",
    path: "categories",
    pathNodeId: "7", // Categories node (has parent_id, indicating nesting)
    patternDetected: "Document nesting depth exceeds 6 levels.",
    whyNeedsAttention: [
      "Queries and updates may become complex",
      "Harder to index and maintain over time",
    ],
    suggestion: "Consider flattening the structure or splitting into multiple collections if access patterns are complex.",
  },
  {
    id: "4",
    type: "needs-attention",
    title: "Mixed Data Access Patterns",
    path: "products",
    pathNodeId: "1", // Products node
    patternDetected: "Same document is used for both transactional updates and analytical reads.",
    whyNeedsAttention: [
      "Competing access patterns may impact performance",
      "Index strategy may be suboptimal",
    ],
    suggestion: "Evaluate separating read-optimized and write-optimized schemas.",
  },
  {
    id: "5",
    type: "question",
    title: "One-to-Many Relationship Modeling",
    path: "orders → orderItems",
    pathNodeId: "4", // Orders node (one-to-many with OrderItems)
    whyWeAsk: "Is the relationship between user and activities expected to grow without bound?",
    guidance: [
      "Small, bounded → embed",
      "Large or unbounded → reference",
    ],
  },
];

const typeColors = {
  "anti-pattern": {
    color: "#DB3030", // red
    label: "Anti-pattern",
  },
  "needs-attention": {
    color: "#FFC010", // orange
    label: "Needs-attention",
  },
  question: {
    color: "#B45AF2", // purple
    label: "Questions",
  },
};

interface RecommendationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RecommendationsPanel({ isOpen, onClose }: RecommendationsPanelProps) {
  const { getNode, setViewport } = useReactFlow();

  const handlePathClick = (nodeId?: string) => {
    if (!nodeId) return;
    const node = getNode(nodeId);
    if (node && node.position) {
      // Get viewport dimensions (approximate)
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      // Calculate center position (accounting for panel width ~384px)
      const panelWidth = 384;
      const availableWidth = viewportWidth - panelWidth;
      const centerX = node.position.x - availableWidth / 2;
      const centerY = node.position.y - viewportHeight / 2;
      
      // Focus on the node with zoom
      setViewport(
        { x: centerX, y: centerY, zoom: 1.2 },
        { duration: 500 }
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed top-0 right-0 h-full w-96 bg-white shadow-2xl z-50 flex flex-col"
      style={{ fontFamily: "'Euclid Circular A', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">Intelligent recommendations</h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          aria-label="Close"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-gray-600"
          >
            <path
              d="M15 5L5 15M5 5L15 15"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Legend */}
        <div className="mb-6 p-2 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-4">
            {Object.entries(typeColors).map(([key, value]) => {
              // Count recommendations by type
              const count = recommendations.filter(r => r.type === key).length;
              return (
                <div key={key} className="flex items-center gap-1.5 text-xs">
                  <div
                    className="flex items-center justify-center rounded-full flex-shrink-0 text-white font-semibold text-xs"
                    style={{ 
                      backgroundColor: value.color,
                      width: '20px',
                      height: '20px',
                    }}
                  >
                    {count}
                  </div>
                  <span className="text-gray-600 whitespace-nowrap">{value.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recommendation Cards */}
        <div className="space-y-4">
          {recommendations.map((rec) => {
            const typeInfo = typeColors[rec.type];
            return (
              <div
                key={rec.id}
                className="relative border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                {/* Title with color dot */}
                <div className="flex items-start gap-2 mb-3">
                  <div
                    className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                    style={{ backgroundColor: typeInfo.color }}
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 mb-1">{rec.title}</h3>
                    {rec.path && (
                      <button
                        onClick={() => handlePathClick(rec.pathNodeId)}
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline block mb-1"
                      >
                        {rec.path}
                      </button>
                    )}
                    {rec.patternDetected && (
                      <div className="text-sm text-gray-600 mt-1">
                        <span className="font-medium">Pattern detected</span>
                        <div className="mt-0.5">{rec.patternDetected}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Why this is a problem / Why this needs attention / Why we ask */}
                {(rec.whyProblem || rec.whyNeedsAttention || rec.whyWeAsk) && (
                  <div className="mb-3">
                    <div className="text-sm font-medium text-gray-700 mb-1">
                      {rec.whyProblem && "Why this is a problem"}
                      {rec.whyNeedsAttention && "Why this needs attention"}
                      {rec.whyWeAsk && "Why we ask"}
                    </div>
                    {rec.whyProblem && (
                      <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                        {rec.whyProblem.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    )}
                    {rec.whyNeedsAttention && (
                      <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                        {rec.whyNeedsAttention.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    )}
                    {rec.whyWeAsk && (
                      <div className="text-sm text-gray-600">{rec.whyWeAsk}</div>
                    )}
                  </div>
                )}

                {/* Recommendation / Suggestion / Guidance */}
                {(rec.recommendation || rec.suggestion || rec.guidance) && (
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-1">
                      {rec.recommendation && "Recommendation"}
                      {rec.suggestion && "Suggestion"}
                      {rec.guidance && "Guidance"}
                    </div>
                    {rec.recommendation && (
                      <div className="text-sm text-gray-600">{rec.recommendation}</div>
                    )}
                    {rec.suggestion && (
                      <div className="text-sm text-gray-600">{rec.suggestion}</div>
                    )}
                    {rec.guidance && (
                      <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                        {rec.guidance.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  title="Get help from AI assistant"
                  aria-label="Get help from AI assistant"
                  className="absolute bottom-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path
                      d="M9.998 2.5L11.26 6.33L15.09 7.592L11.26 8.854L9.998 12.684L8.736 8.854L4.906 7.592L8.736 6.33L9.998 2.5Z"
                      fill="currentColor"
                    />
                    <path
                      d="M15.248 11.5L15.884 13.43L17.814 14.066L15.884 14.702L15.248 16.632L14.612 14.702L12.682 14.066L14.612 13.43L15.248 11.5Z"
                      fill="currentColor"
                    />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
