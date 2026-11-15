/**
 * Architecture diagram as inline SVG.
 *
 * Inline rather than an <img> so it inherits the current theme, needs no
 * network request, and renders identically inside the sandboxed file preview.
 */

const NODES = [
  { x: 16, y: 40, w: 132, h: 54, label: 'CV / text input', sub: 'PDF · DOCX · TXT', tone: 'input' },
  { x: 172, y: 40, w: 132, h: 54, label: 'PII scrub', sub: 'before any model', tone: 'guard' },
  { x: 328, y: 40, w: 132, h: 54, label: 'Extraction', sub: 'LLM + dictionary', tone: 'ai' },
  { x: 484, y: 40, w: 132, h: 54, label: 'Taxonomy map', sub: '446 skills', tone: 'core' },
];

const ROW2 = [
  {
    x: 16,
    y: 196,
    w: 240,
    h: 60,
    label: 'Scoring core',
    sub: 'deterministic · no model',
    tone: 'core',
  },
  { x: 284, y: 196, w: 180, h: 60, label: 'Gap + adjacent roles', sub: 'set maths', tone: 'core' },
  { x: 492, y: 196, w: 124, h: 60, label: 'Explanation', sub: 'verified', tone: 'ai' },
];

type Tone = { fill: string; stroke: string; text: string };

const TONE: Record<string, Tone> = {
  input: {
    fill: 'hsl(var(--secondary))',
    stroke: 'hsl(var(--border))',
    text: 'hsl(var(--secondary-foreground))',
  },
  guard: {
    fill: 'hsl(var(--accent) / 0.12)',
    stroke: 'hsl(var(--accent))',
    text: 'hsl(var(--foreground))',
  },
  core: {
    fill: 'hsl(var(--primary) / 0.12)',
    stroke: 'hsl(var(--primary))',
    text: 'hsl(var(--foreground))',
  },
  ai: {
    fill: 'hsl(var(--muted))',
    stroke: 'hsl(var(--muted-foreground) / 0.5)',
    text: 'hsl(var(--foreground))',
  },
};

function Box({
  x,
  y,
  w,
  h,
  label,
  sub,
  tone,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  sub: string;
  tone: string;
}) {
  const colors = TONE[tone] ?? (TONE.core as Tone);
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={8}
        fill={colors.fill}
        stroke={colors.stroke}
        strokeWidth={1}
      />
      <text
        x={x + w / 2}
        y={y + h / 2 - 3}
        textAnchor="middle"
        fontSize={12}
        fontWeight={600}
        fill={colors.text}
      >
        {label}
      </text>
      <text
        x={x + w / 2}
        y={y + h / 2 + 13}
        textAnchor="middle"
        fontSize={9.5}
        fill="hsl(var(--muted-foreground))"
      >
        {sub}
      </text>
    </g>
  );
}

export function ArchitectureDiagram() {
  return (
    <svg
      viewBox="0 0 640 300"
      className="h-auto w-full"
      role="img"
      aria-label="Data flows from CV input through PII scrubbing, extraction and taxonomy mapping, into the deterministic scoring core, then to gap analysis, adjacent roles and the verified explanation."
    >
      {/* arrows: row 1 */}
      {[148, 304, 460].map((x) => (
        <path
          key={`a-${x}`}
          d={`M${x} 67 L${x + 22} 67`}
          stroke="hsl(var(--muted-foreground))"
          strokeWidth={1.4}
          fill="none"
          markerEnd="url(#arrow)"
        />
      ))}

      {/* arrow: taxonomy -> scoring core */}
      <path
        d="M550 94 L550 140 Q550 152 538 152 L138 152 Q126 152 126 164 L126 196"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth={1.4}
        fill="none"
        markerEnd="url(#arrow)"
      />

      {/* arrows: row 2 */}
      <path
        d="M256 226 L282 226"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth={1.4}
        fill="none"
        markerEnd="url(#arrow)"
      />
      <path
        d="M464 226 L490 226"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth={1.4}
        fill="none"
        markerEnd="url(#arrow)"
      />

      <defs>
        <marker
          id="arrow"
          viewBox="0 0 10 10"
          refX={9}
          refY={5}
          markerWidth={5}
          markerHeight={5}
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--muted-foreground))" />
        </marker>
      </defs>

      {NODES.map((n) => (
        <Box key={n.label} {...n} />
      ))}
      {ROW2.map((n) => (
        <Box key={n.label} {...n} />
      ))}

      {/* the boundary that matters: what the model may touch */}
      <rect
        x={6}
        y={16}
        width={604}
        height={104}
        rx={12}
        fill="none"
        stroke="hsl(var(--border))"
        strokeWidth={1}
        strokeDasharray="4 4"
      />
      <text x={16} y={10} fontSize={9} fill="hsl(var(--muted-foreground))">
        user text leaves this boundary only after scrubbing
      </text>

      <rect
        x={6}
        y={176}
        width={604}
        height={104}
        rx={12}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth={1}
        strokeDasharray="4 4"
      />
      <text x={16} y={170} fontSize={9} fill="hsl(var(--muted-foreground))">
        no language model inside this boundary — arithmetic only
      </text>
    </svg>
  );
}
