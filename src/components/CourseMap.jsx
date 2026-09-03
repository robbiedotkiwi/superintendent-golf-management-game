import { greenOutline, surfaceFill } from '../engine/color.js';
import {
  AERATOR_ARM,
  AERATOR_RX,
  AERATOR_RY,
  EXPANDED_HOLE_COUNT,
  HOLE_COUNT,
  POND_CX,
  POND_CY,
  POND_HEALTH_STRESSED,
  POND_RX,
  POND_RY,
  POND_LABEL_OFFSET,
  RANGE_HEIGHT,
  RANGE_WIDTH,
  RANGE_X,
  RANGE_Y,
} from '../data/constants.js';
import { holesForCount, mapViewBoxForHoles, courseBounds, SHED_HEIGHT, SHED_WIDTH, SHED_X, SHED_Y } from '../data/course.js';
import { SURFACE_LABELS } from '../data/tasks.js';
import { pondPercent } from '../engine/irrigation.js';
import { prefersReducedMotion } from '../engine/sound.js';
import { MOWER_ANIM_MS } from '../data/constants.js';

function activate(event, surface, onSelect) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    onSelect(surface);
  }
}

function surfaceStroke(surface, selected, greensQuality) {
  if (selected === surface) return 'var(--paint)';
  if (surface === 'greens') return greenOutline(greensQuality);
  return 'var(--soil)';
}

function surfaceStrokeWidth(surface, selected) {
  if (selected === surface) return 3;
  if (surface === 'greens') return 2;
  return 1;
}

export default function CourseMap({
  surfaces,
  pond,
  hasAerator,
  holes = HOLE_COUNT,
  hasDrivingRange = false,
  showMower = false,
  selected,
  onSelect,
  onOpenShed,
}) {
  const fills = {
    greens: surfaceFill('greens', surfaces.greens.quality),
    tees: surfaceFill('tees', surfaces.tees.quality),
    fairways: surfaceFill('fairways', surfaces.fairways.quality),
    rough: surfaceFill('rough', surfaces.rough.quality),
    bunkers: surfaceFill('bunkers', surfaces.bunkers.quality),
  };
  const layout = holesForCount(holes);
  const bounds = courseBounds(layout);

  return (
    <svg
      viewBox={mapViewBoxForHoles(holes)}
      preserveAspectRatio="xMidYMid meet"
      className="absolute inset-0 h-full w-full"
      role="img"
      aria-label={`${holes}-hole course map`}
    >
      <rect
        x={bounds.minX}
        y={bounds.minY}
        width={bounds.width}
        height={bounds.height}
        fill="var(--soil)"
        onClick={() => onSelect(null)}
      />
      <g
        tabIndex={0}
        role="button"
        aria-label="Shed"
        className="course-surface cursor-pointer outline-none"
        onClick={(event) => {
          event.stopPropagation();
          onOpenShed();
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onOpenShed();
          }
        }}
      >
        <rect x={SHED_X} y={SHED_Y} width={SHED_WIDTH} height={SHED_HEIGHT} fill="var(--sand)" stroke="var(--paint)" />
        <text x={SHED_X + SHED_WIDTH / 2} y={SHED_Y + SHED_HEIGHT / 2 + 5} textAnchor="middle" fill="var(--soil)" fontSize="16">
          Shed
        </text>
      </g>
      {layout.map((hole) => (
        <path
          key={`rough-${hole.id}`}
          d={hole.rough}
          fill={fills.rough}
          stroke={surfaceStroke('rough', selected, surfaces.greens.quality)}
          strokeWidth={surfaceStrokeWidth('rough', selected)}
          className="course-surface cursor-pointer outline-none"
          tabIndex={0}
          role="button"
          aria-label={`Hole ${hole.id} rough`}
          onClick={() => onSelect('rough')}
          onKeyDown={(event) => activate(event, 'rough', onSelect)}
        />
      ))}
      {layout.map((hole) => (
        <path
          key={`fairway-${hole.id}`}
          d={hole.fairway}
          fill={fills.fairways}
          stroke={surfaceStroke('fairways', selected, surfaces.greens.quality)}
          strokeWidth={surfaceStrokeWidth('fairways', selected)}
          className="course-surface cursor-pointer outline-none"
          tabIndex={0}
          role="button"
          aria-label={`Hole ${hole.id} fairway`}
          onClick={() => onSelect('fairways')}
          onKeyDown={(event) => activate(event, 'fairways', onSelect)}
        />
      ))}
      {layout.map((hole) =>
        hole.bunker ? (
          <ellipse
            key={`bunker-${hole.id}`}
            cx={hole.bunker.cx}
            cy={hole.bunker.cy}
            rx={hole.bunker.rx}
            ry={hole.bunker.ry}
            fill={fills.bunkers}
            stroke={surfaceStroke('bunkers', selected, surfaces.greens.quality)}
            strokeWidth={surfaceStrokeWidth('bunkers', selected)}
            className="course-surface cursor-pointer outline-none"
            tabIndex={0}
            role="button"
            aria-label={`Hole ${hole.id} bunker`}
            onClick={() => onSelect('bunkers')}
            onKeyDown={(event) => activate(event, 'bunkers', onSelect)}
          />
        ) : null,
      )}
      {layout.map((hole) => (
        <rect
          key={`tee-${hole.id}`}
          x={hole.tee.cx - hole.tee.rx}
          y={hole.tee.cy - hole.tee.ry}
          width={hole.tee.rx * 2}
          height={hole.tee.ry * 2}
          fill={fills.tees}
          stroke={surfaceStroke('tees', selected, surfaces.greens.quality)}
          strokeWidth={surfaceStrokeWidth('tees', selected)}
          className="course-surface cursor-pointer outline-none"
          tabIndex={0}
          role="button"
          aria-label={`Hole ${hole.id} tee`}
          onClick={() => onSelect('tees')}
          onKeyDown={(event) => activate(event, 'tees', onSelect)}
        />
      ))}
      {layout.map((hole) => (
        <ellipse
          key={`green-${hole.id}`}
          cx={hole.green.cx}
          cy={hole.green.cy}
          rx={hole.green.rx}
          ry={hole.green.ry}
          fill={fills.greens}
          stroke={surfaceStroke('greens', selected, surfaces.greens.quality)}
          strokeWidth={surfaceStrokeWidth('greens', selected)}
          className="course-surface cursor-pointer outline-none"
          tabIndex={0}
          role="button"
          aria-label={`Hole ${hole.id} green`}
          onClick={() => onSelect('greens')}
          onKeyDown={(event) => activate(event, 'greens', onSelect)}
        />
      ))}
      <g
        tabIndex={0}
        role="button"
        aria-label={`Pond ${Math.round(pond.volume)} cubic metres, ${Math.round(pondPercent(pond.volume))} percent`}
        className="course-surface cursor-pointer outline-none"
        onClick={(event) => {
          event.stopPropagation();
          onSelect('pond');
        }}
        onKeyDown={(event) => activate(event, 'pond', onSelect)}
      >
        <ellipse
          cx={POND_CX}
          cy={POND_CY}
          rx={POND_RX}
          ry={POND_RY}
          fill={pond.health < POND_HEALTH_STRESSED ? 'var(--pond-stressed)' : 'var(--pond-water)'}
          className={selected === 'pond' ? 'stroke-[var(--paint)] stroke-[3]' : 'stroke-[var(--soil)] stroke-1'}
        />
        {hasAerator ? (
          <g fill="none" stroke="var(--paint)" strokeWidth="2">
            <ellipse cx={POND_CX} cy={POND_CY} rx={AERATOR_RX} ry={AERATOR_RY} fill="var(--machine-orange)" />
            <line x1={POND_CX - AERATOR_ARM} y1={POND_CY} x2={POND_CX + AERATOR_ARM} y2={POND_CY} />
            <line x1={POND_CX} y1={POND_CY - AERATOR_ARM} x2={POND_CX} y2={POND_CY + AERATOR_ARM} />
          </g>
        ) : null}
        <text x={POND_CX} y={POND_CY + POND_RY + POND_LABEL_OFFSET} textAnchor="middle" fill="var(--sand)" fontSize="14">
          Pond
        </text>
      </g>
      {hasDrivingRange ? (
        <g aria-label="Driving range">
          <rect
            x={RANGE_X}
            y={RANGE_Y}
            width={RANGE_WIDTH}
            height={RANGE_HEIGHT}
            fill="var(--sand)"
            stroke="var(--paint)"
          />
          <text
            x={RANGE_X + RANGE_WIDTH / 2}
            y={RANGE_Y + RANGE_HEIGHT / 2 + 5}
            textAnchor="middle"
            fill="var(--soil)"
            fontSize="14"
          >
            Range
          </text>
        </g>
      ) : null}
      {showMower && !prefersReducedMotion() ? (
        <circle
          className="mower-dot"
          r="7"
          fill="var(--machine-orange)"
          style={{ ['--mower-ms']: `${MOWER_ANIM_MS}ms` }}
        />
      ) : null}
      <text x="24" y="36" fill="var(--sand)" fontSize="18">
        Click a surface — {SURFACE_LABELS.greens.toLowerCase()} work all{' '}
        {holes >= EXPANDED_HOLE_COUNT ? 'eighteen' : 'nine'}.
      </text>
    </svg>
  );
}
