/**
 * Inline SVG diagrams for Mini Crates education content.
 * Each diagram is a self-contained component that can be embedded in crate pages.
 */

/* ── Crate 4: Neural Network Layers ── */
export function NeuralNetworkDiagram() {
  const layers = [
    { label: "Input", count: 3, color: "#22c55e" },
    { label: "Hidden 1", count: 4, color: "#3b82f6" },
    { label: "Hidden 2", count: 4, color: "#3b82f6" },
    { label: "Output", count: 2, color: "#a855f7" },
  ];
  const W = 480;
  const H = 220;
  const layerSpacing = W / (layers.length + 1);

  // Pre-calculate node positions
  const nodePositions: { x: number; y: number }[][] = layers.map(
    (layer, li) => {
      const x = layerSpacing * (li + 1);
      return Array.from({ length: layer.count }, (_, ni) => {
        const spacing = H / (layer.count + 1);
        return { x, y: spacing * (ni + 1) };
      });
    }
  );

  return (
    <div className="my-4 overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H + 30}`}
        className="w-full max-w-[480px] mx-auto"
        role="img"
        aria-label="Neural network diagram showing input, hidden, and output layers"
      >
        {/* Connections */}
        {nodePositions.map((layer, li) =>
          li < nodePositions.length - 1
            ? layer.map((from, fi) =>
                nodePositions[li + 1].map((to, ti) => (
                  <line
                    key={`${li}-${fi}-${ti}`}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke="#d1d5db"
                    strokeWidth={1}
                  />
                ))
              )
            : null
        )}
        {/* Nodes */}
        {nodePositions.map((layer, li) =>
          layer.map((pos, ni) => (
            <circle
              key={`n-${li}-${ni}`}
              cx={pos.x}
              cy={pos.y}
              r={12}
              fill={layers[li].color}
              stroke="white"
              strokeWidth={2}
            />
          ))
        )}
        {/* Labels */}
        {layers.map((layer, li) => (
          <text
            key={`l-${li}`}
            x={layerSpacing * (li + 1)}
            y={H + 20}
            textAnchor="middle"
            fontSize={10}
            fontFamily="monospace"
            fill="#666"
          >
            {layer.label}
          </text>
        ))}
      </svg>
    </div>
  );
}

/* ── Crate 5: CNN Sliding Window ── */
export function CNNFilterDiagram() {
  const gridSize = 7;
  const cellSize = 28;
  const filterSize = 3;
  const filterPos = { row: 2, col: 2 }; // position of the filter window
  const pad = 20;
  const W = gridSize * cellSize + pad * 2;
  const H = gridSize * cellSize + pad * 2 + 30;

  return (
    <div className="my-4 overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full max-w-[280px] mx-auto"
        role="img"
        aria-label="CNN filter sliding across an image grid"
      >
        {/* Grid cells */}
        {Array.from({ length: gridSize }).map((_, r) =>
          Array.from({ length: gridSize }).map((_, c) => {
            const inFilter =
              r >= filterPos.row &&
              r < filterPos.row + filterSize &&
              c >= filterPos.col &&
              c < filterPos.col + filterSize;
            return (
              <rect
                key={`${r}-${c}`}
                x={pad + c * cellSize}
                y={pad + r * cellSize}
                width={cellSize}
                height={cellSize}
                fill={inFilter ? "#bfdbfe" : "#f3f4f6"}
                stroke="#d1d5db"
                strokeWidth={1}
              />
            );
          })
        )}
        {/* Filter overlay */}
        <rect
          x={pad + filterPos.col * cellSize}
          y={pad + filterPos.row * cellSize}
          width={filterSize * cellSize}
          height={filterSize * cellSize}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={3}
          rx={3}
        />
        {/* Arrow showing scan direction */}
        <line
          x1={pad + (filterPos.col + filterSize) * cellSize + 8}
          y1={pad + (filterPos.row + filterSize / 2) * cellSize}
          x2={pad + (filterPos.col + filterSize) * cellSize + 24}
          y2={pad + (filterPos.row + filterSize / 2) * cellSize}
          stroke="#3b82f6"
          strokeWidth={2}
          markerEnd="url(#arrowBlue)"
        />
        <defs>
          <marker
            id="arrowBlue"
            viewBox="0 0 10 10"
            refX={8}
            refY={5}
            markerWidth={6}
            markerHeight={6}
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
          </marker>
        </defs>
        {/* Labels */}
        <text
          x={W / 2}
          y={H - 4}
          textAnchor="middle"
          fontSize={10}
          fontFamily="monospace"
          fill="#666"
        >
          3x3 filter slides across image
        </text>
      </svg>
    </div>
  );
}

/* ── Crate 6: Transformer Attention ── */
export function AttentionDiagram() {
  const words = ["The", "cat", "sat", "on", "the", "mat"];
  const W = 420;
  const H = 120;
  const spacing = W / (words.length + 1);

  // Attention arcs: from "sat" (index 2) back to "cat" (index 1) — strong,
  // and from "sat" to "mat" (index 5) — medium
  const arcs = [
    { from: 2, to: 1, strength: 0.9, label: "strong" },
    { from: 2, to: 5, strength: 0.5, label: "medium" },
    { from: 2, to: 3, strength: 0.2, label: "" },
  ];

  return (
    <div className="my-4 overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H + 10}`}
        className="w-full max-w-[420px] mx-auto"
        role="img"
        aria-label="Transformer attention: the word 'sat' attends strongly to 'cat' and moderately to 'mat'"
      >
        {/* Attention arcs */}
        {arcs.map((arc, i) => {
          const x1 = spacing * (arc.from + 1);
          const x2 = spacing * (arc.to + 1);
          const midX = (x1 + x2) / 2;
          const dist = Math.abs(arc.from - arc.to);
          const curveHeight = 20 + dist * 15;
          return (
            <path
              key={i}
              d={`M ${x1} 60 Q ${midX} ${60 - curveHeight} ${x2} 60`}
              fill="none"
              stroke="#a855f7"
              strokeWidth={arc.strength * 3 + 0.5}
              opacity={0.3 + arc.strength * 0.6}
            />
          );
        })}
        {/* Words */}
        {words.map((word, i) => {
          const x = spacing * (i + 1);
          const isSource = i === 2;
          return (
            <g key={i}>
              <rect
                x={x - 22}
                y={50}
                width={44}
                height={24}
                rx={4}
                fill={isSource ? "#a855f7" : "#f3f4f6"}
                stroke={isSource ? "#7c3aed" : "#d1d5db"}
                strokeWidth={isSource ? 2 : 1}
              />
              <text
                x={x}
                y={66}
                textAnchor="middle"
                fontSize={12}
                fontFamily="monospace"
                fontWeight={isSource ? "bold" : "normal"}
                fill={isSource ? "white" : "#374151"}
              >
                {word}
              </text>
            </g>
          );
        })}
        {/* Caption */}
        <text
          x={W / 2}
          y={H + 6}
          textAnchor="middle"
          fontSize={10}
          fontFamily="monospace"
          fill="#666"
        >
          &quot;sat&quot; attends to relevant words in the sentence
        </text>
      </svg>
    </div>
  );
}

/* ── Crate 9: Diffusion Process ── */
export function DiffusionDiagram() {
  const steps = [
    { label: "Noise", fill: "#9ca3af", pattern: true },
    { label: "Step 1", fill: "#93c5fd", pattern: false },
    { label: "Step 2", fill: "#60a5fa", pattern: false },
    { label: "Step 3", fill: "#3b82f6", pattern: false },
    { label: "Image", fill: "#22c55e", pattern: false },
  ];
  const boxSize = 60;
  const gap = 20;
  const arrowW = 16;
  const W = steps.length * boxSize + (steps.length - 1) * (gap + arrowW) + 40;
  const H = 110;

  return (
    <div className="my-4 overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full max-w-[520px] mx-auto"
        role="img"
        aria-label="Diffusion process: noise is progressively denoised into a clear image"
      >
        <defs>
          <marker
            id="arrowGray"
            viewBox="0 0 10 10"
            refX={8}
            refY={5}
            markerWidth={5}
            markerHeight={5}
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#9ca3af" />
          </marker>
          {/* Static noise pattern */}
          <pattern
            id="noisePattern"
            x={0}
            y={0}
            width={4}
            height={4}
            patternUnits="userSpaceOnUse"
          >
            <rect width={2} height={2} fill="#6b7280" />
            <rect x={2} y={2} width={2} height={2} fill="#6b7280" />
          </pattern>
        </defs>

        {steps.map((step, i) => {
          const x = 20 + i * (boxSize + gap + arrowW);
          const y = 15;
          return (
            <g key={i}>
              {/* Box */}
              <rect
                x={x}
                y={y}
                width={boxSize}
                height={boxSize}
                rx={6}
                fill={step.pattern ? "url(#noisePattern)" : step.fill}
                stroke="#d1d5db"
                strokeWidth={1}
              />
              {/* Icon in last box */}
              {i === steps.length - 1 && (
                <text
                  x={x + boxSize / 2}
                  y={y + boxSize / 2 + 8}
                  textAnchor="middle"
                  fontSize={28}
                >
                  🖼️
                </text>
              )}
              {/* Label */}
              <text
                x={x + boxSize / 2}
                y={y + boxSize + 18}
                textAnchor="middle"
                fontSize={10}
                fontFamily="monospace"
                fill="#666"
              >
                {step.label}
              </text>
              {/* Arrow */}
              {i < steps.length - 1 && (
                <line
                  x1={x + boxSize + 4}
                  y1={y + boxSize / 2}
                  x2={x + boxSize + gap + arrowW - 4}
                  y2={y + boxSize / 2}
                  stroke="#9ca3af"
                  strokeWidth={2}
                  markerEnd="url(#arrowGray)"
                />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ── Crate 10: Agent ReAct Loop ── */
export function AgentLoopDiagram() {
  const steps = [
    { label: "Observe", emoji: "👁️", color: "#22c55e" },
    { label: "Think", emoji: "🧠", color: "#3b82f6" },
    { label: "Act", emoji: "⚡", color: "#f59e0b" },
  ];
  const W = 300;
  const H = 260;
  const cx = W / 2;
  const cy = 120;
  const radius = 80;

  // Position nodes in a triangle
  const positions = steps.map((_, i) => {
    const angle = (i * (2 * Math.PI)) / 3 - Math.PI / 2;
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  });

  return (
    <div className="my-4 overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full max-w-[300px] mx-auto"
        role="img"
        aria-label="AI Agent ReAct loop: Observe, Think, Act, repeat"
      >
        <defs>
          <marker
            id="arrowLoop"
            viewBox="0 0 10 10"
            refX={8}
            refY={5}
            markerWidth={5}
            markerHeight={5}
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#9ca3af" />
          </marker>
        </defs>

        {/* Curved arrows between nodes */}
        {positions.map((from, i) => {
          const to = positions[(i + 1) % 3];
          const midX = (from.x + to.x) / 2 + (cx - (from.x + to.x) / 2) * 0.3;
          const midY = (from.y + to.y) / 2 + (cy - (from.y + to.y) / 2) * 0.3;
          return (
            <path
              key={`a-${i}`}
              d={`M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`}
              fill="none"
              stroke="#d1d5db"
              strokeWidth={2}
              markerEnd="url(#arrowLoop)"
            />
          );
        })}

        {/* Nodes */}
        {steps.map((step, i) => {
          const pos = positions[i];
          return (
            <g key={i}>
              <circle
                cx={pos.x}
                cy={pos.y}
                r={32}
                fill={step.color}
                stroke="white"
                strokeWidth={3}
              />
              <text
                x={pos.x}
                y={pos.y + 2}
                textAnchor="middle"
                fontSize={22}
              >
                {step.emoji}
              </text>
              <text
                x={pos.x}
                y={pos.y + 50}
                textAnchor="middle"
                fontSize={11}
                fontFamily="monospace"
                fontWeight="bold"
                fill="#374151"
              >
                {step.label}
              </text>
            </g>
          );
        })}

        {/* Center label */}
        <text
          x={cx}
          y={cy + 4}
          textAnchor="middle"
          fontSize={11}
          fontFamily="monospace"
          fill="#9ca3af"
        >
          repeat
        </text>
      </svg>
    </div>
  );
}
