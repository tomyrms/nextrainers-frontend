import { SKILL_MAX, type PlayerSkill } from "@/lib/api-equipe";

const SIZE = 280;
const CENTER = SIZE / 2;
const RADIUS = 92;
const RINGS = [2, 4, 6, 8, 10];

/** Point on axis `index` of `count` at `value` (0..SKILL_MAX), top first. */
function point(index: number, count: number, value: number): [number, number] {
  const angle = -Math.PI / 2 + (2 * Math.PI * index) / count;
  const r = (Math.max(0, Math.min(SKILL_MAX, value)) / SKILL_MAX) * RADIUS;
  return [CENTER + r * Math.cos(angle), CENTER + r * Math.sin(angle)];
}

const toPoints = (pairs: [number, number][]) =>
  pairs.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

/**
 * Server-rendered SVG radar of the player's skill ratings (1..10): grid rings
 * every 2 points, one axis per skill, the rating polygon in the primary teal.
 * Fewer than 3 skills cannot form a polygon, so a hint is shown instead.
 */
export function SkillsRadar({ skills }: { skills: PlayerSkill[] }) {
  const count = skills.length;
  if (count < 3) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Pas encore assez de compétences évaluées pour le radar.
      </p>
    );
  }

  const axes = skills.map((_, i) => point(i, count, SKILL_MAX));
  const shape = skills.map((skill, i) => point(i, count, skill.value));

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role="img"
      aria-label={`Radar des compétences : ${skills.map((s) => `${s.name} ${s.value}/10`).join(", ")}`}
      className="mx-auto block w-full max-w-[300px]"
      data-testid="skills-radar"
    >
      {RINGS.map((ring) => (
        <polygon
          key={ring}
          points={toPoints(skills.map((_, i) => point(i, count, ring)))}
          fill="none"
          stroke="rgba(255,255,255,0.10)"
          strokeWidth={1}
        />
      ))}
      {axes.map(([x, y], i) => (
        <line key={skills[i].id} x1={CENTER} y1={CENTER} x2={x} y2={y} stroke="rgba(255,255,255,0.10)" strokeWidth={1} />
      ))}

      <polygon
        points={toPoints(shape)}
        fill="rgba(125,226,206,0.25)"
        stroke="#7DE2CE"
        strokeWidth={2}
        strokeLinejoin="round"
        data-testid="skills-radar-shape"
      />
      {shape.map(([x, y], i) => (
        <circle key={skills[i].id} cx={x} cy={y} r={3} fill="#7DE2CE" />
      ))}

      {skills.map((skill, i) => {
        const [x, y] = point(i, count, SKILL_MAX + 2.4);
        const anchor = Math.abs(x - CENTER) < 4 ? "middle" : x > CENTER ? "start" : "end";
        return (
          <text
            key={skill.id}
            x={x}
            y={y}
            textAnchor={anchor}
            dominantBaseline="middle"
            className="fill-muted-foreground text-[11px] font-semibold"
          >
            {skill.name}
            <tspan className="fill-foreground"> {skill.value}</tspan>
          </text>
        );
      })}
    </svg>
  );
}
