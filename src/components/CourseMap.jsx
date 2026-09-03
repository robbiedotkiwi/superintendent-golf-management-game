import { boundaryFill, greenOutline, surfaceFill } from '../engine/color.js';
import {
  AERATOR_ARM,
  AERATOR_RX,
  AERATOR_RY,
  FLAG_HEIGHT,
  FLAG_POLE,
  FLAG_WIDTH,
  HOLE_COUNT,
  MOWER_ANIM_MS,
  PATTERN_CHECK_SIZE,
  PATTERN_CHECKERBOARD,
  PATTERN_DIAMOND,
  PATTERN_RINGS,
  PATTERN_RING_SPACING,
  PATTERN_STRIPE_SPACING,
  PATTERN_STRIPE_WIDTH,
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
  TEE_MARKER_FONT,
  TEE_MARKER_RADIUS,
  paint,
} from '../data/constants.js';
import {
  courseBoundaryPath,
  courseBounds,
  holesForCount,
  holePath,
  mapViewBoxForHoles,
  mowerPathFor,
  SHED_HEIGHT,
  SHED_ROOF,
  SHED_DOOR_HEIGHT,
  SHED_DOOR_WIDTH,
  SHED_WIDTH,
  SHED_X,
  SHED_Y,
} from '../data/course.js';
import { pondPercent } from '../engine/irrigation.js';
import { hasPattern } from '../engine/mowing.js';
import { patternRotate, patternStripeColor, surfacePatternOpacity } from '../engine/pattern.js';
import { prefersReducedMotion } from '../engine/sound.js';

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

function MowPattern({ id, pattern, angle, color }) {
  const rotate = patternRotate(pattern, angle);
  if (pattern === PATTERN_RINGS) {
    return (
      <pattern
        id={id}
        width={PATTERN_RING_SPACING}
        height={PATTERN_RING_SPACING}
        patternUnits="userSpaceOnUse"
        patternTransform={`rotate(${rotate})`}
      >
        <circle
          cx={PATTERN_RING_SPACING / 2}
          cy={PATTERN_RING_SPACING / 2}
          r={PATTERN_RING_SPACING / 2 - PATTERN_STRIPE_WIDTH}
          fill="none"
          stroke={color}
          strokeWidth={PATTERN_STRIPE_WIDTH}
        />
      </pattern>
    );
  }
  if (pattern === PATTERN_CHECKERBOARD || pattern === PATTERN_DIAMOND) {
    const size = PATTERN_CHECK_SIZE;
    return (
      <pattern id={id} width={size} height={size} patternUnits="userSpaceOnUse" patternTransform={`rotate(${rotate})`}>
        <rect width={size / 2} height={size / 2} fill={color} />
        <rect x={size / 2} y={size / 2} width={size / 2} height={size / 2} fill={color} />
      </pattern>
    );
  }
  return (
    <pattern
      id={id}
      width={PATTERN_STRIPE_SPACING}
      height={PATTERN_STRIPE_SPACING}
      patternUnits="userSpaceOnUse"
      patternTransform={`rotate(${rotate})`}
    >
      <rect width={PATTERN_STRIPE_WIDTH} height={PATTERN_STRIPE_SPACING} fill={color} />
    </pattern>
  );
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
  day = 1,
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
  const patternState = { day, surfaces };
  const patterned = ['greens', 'tees', 'fairways'].filter((surface) => hasPattern(surface));

  return (
    <svg
      viewBox={mapViewBoxForHoles(holes)}
      preserveAspectRatio="xMidYMid meet"
      className="absolute inset-0 h-full w-full"
      role="img"
      aria-label={`${holes}-hole course map`}
    >
      <defs>
        {patterned.map((surface) => (
          <MowPattern
            key={surface}
            id={`mow-${surface}`}
            pattern={surfaces[surface].pattern}
            angle={surfaces[surface].angle}
            color={patternStripeColor(fills[surface], paint)}
          />
        ))}
      </defs>
      <rect
        x={bounds.minX}
        y={bounds.minY}
        width={bounds.width}
        height={bounds.height}
        fill="var(--soil)"
        onClick={() => onSelect(null)}
      />
      <path d={courseBoundaryPath(layout)} fill={boundaryFill()} pointerEvents="none" />
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
        <polygon
          points={`${SHED_X},${SHED_Y} ${SHED_X + SHED_WIDTH / 2},${SHED_Y - SHED_ROOF} ${SHED_X + SHED_WIDTH},${SHED_Y}`}
          fill="var(--soil)"
          stroke="var(--paint)"
        />
        <rect x={SHED_X} y={SHED_Y} width={SHED_WIDTH} height={SHED_HEIGHT} fill="var(--sand)" stroke="var(--paint)" />
        <rect
          x={SHED_X + SHED_WIDTH / 2 - SHED_DOOR_WIDTH / 2}
          y={SHED_Y + SHED_HEIGHT - SHED_DOOR_HEIGHT}
          width={SHED_DOOR_WIDTH}
          height={SHED_DOOR_HEIGHT}
          fill="var(--soil)"
        />
        <text
          x={SHED_X + SHED_WIDTH / 2}
          y={SHED_Y + 22}
          textAnchor="middle"
          fill="var(--soil)"
          fontSize="18"
          fontWeight="700"
        >
          Shed
        </text>
      </g>
      {layout.map((hole) => (
        <path
          key={`rough-${hole.id}`}
          d={holePath(hole.rough)}
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
        <g key={`fairway-${hole.id}`}>
          <path
            d={holePath(hole.fairway)}
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
          <path
            d={holePath(hole.fairway)}
            fill="url(#mow-fairways)"
            opacity={surfacePatternOpacity(patternState, 'fairways')}
            pointerEvents="none"
          />
        </g>
      ))}
      {layout.map((hole) =>
        hole.bunkers.map((bunker, index) => (
          <path
            key={`bunker-${hole.id}-${index}`}
            d={holePath(bunker)}
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
        )),
      )}
      {layout.map((hole) => (
        <g key={`tee-${hole.id}`}>
          <rect
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
          <rect
            x={hole.tee.cx - hole.tee.rx}
            y={hole.tee.cy - hole.tee.ry}
            width={hole.tee.rx * 2}
            height={hole.tee.ry * 2}
            fill="url(#mow-tees)"
            opacity={surfacePatternOpacity(patternState, 'tees')}
            pointerEvents="none"
          />
        </g>
      ))}
      {layout.map((hole) => (
        <g key={`green-${hole.id}`}>
          <ellipse
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
          <ellipse
            cx={hole.green.cx}
            cy={hole.green.cy}
            rx={hole.green.rx}
            ry={hole.green.ry}
            fill="url(#mow-greens)"
            opacity={surfacePatternOpacity(patternState, 'greens')}
            pointerEvents="none"
          />
        </g>
      ))}
      {layout.map((hole) => {
        const poleX = hole.green.cx;
        const poleBase = hole.green.cy - hole.green.ry;
        const poleTop = poleBase - FLAG_POLE;
        return (
          <g key={`flag-${hole.id}`} pointerEvents="none">
            <line
              x1={poleX}
              y1={poleBase}
              x2={poleX}
              y2={poleTop}
              stroke="var(--paint)"
              strokeWidth="1.5"
            />
            <polygon
              points={`${poleX},${poleTop} ${poleX + FLAG_WIDTH},${poleTop + FLAG_HEIGHT / 2} ${poleX},${poleTop + FLAG_HEIGHT}`}
              fill="var(--machine-orange)"
            />
          </g>
        );
      })}
      {layout.map((hole) => (
        <g key={`marker-${hole.id}`} pointerEvents="none">
          <circle
            cx={hole.marker.cx}
            cy={hole.marker.cy}
            r={TEE_MARKER_RADIUS}
            fill="var(--paint)"
            stroke="var(--soil)"
            strokeWidth="2"
          />
          <text
            x={hole.marker.cx}
            y={hole.marker.cy + 1}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="var(--soil)"
            fontSize={TEE_MARKER_FONT}
            fontWeight="700"
          >
            {hole.id}
          </text>
        </g>
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
        <text x={POND_CX} y={POND_CY + POND_RY + POND_LABEL_OFFSET} textAnchor="middle" fill="var(--sand)" fontSize="18">
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
          style={{ ['--mower-ms']: `${MOWER_ANIM_MS}ms`, offsetPath: `path('${mowerPathFor(layout)}')` }}
        />
      ) : null}
      <text
        x={SHED_X + SHED_WIDTH / 2}
        y={bounds.minY + 28}
        textAnchor="middle"
        fill="var(--sand)"
        fontSize="22"
        fontWeight="700"
        pointerEvents="none"
      >
        {holes}-hole course
      </text>
    </svg>
  );
}
