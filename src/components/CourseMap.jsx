import { useEffect, useRef } from 'react';
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
  VIEW_ZOOM_STEP,
  VIEW_ZOOM_WHEEL_FACTOR,
  MOISTURE_BAND_MARK_WIDTH,
  MOISTURE_HATCH_SIZE,
  MOISTURE_HATCH_WIDTH,
  MOISTURE_OVERLAY_OPACITY,
  MOISTURE_STALE_OPACITY,
  paint,
} from '../data/constants.js';
import {
  courseBoundaryPath,
  courseBounds,
  holesForCount,
  holePath,
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
import { moistureOverlayColor, moistureStatus, outOfBand } from '../engine/moisture.js';
import { patternRotate, patternStripeColor, surfacePatternOpacity } from '../engine/pattern.js';
import { prefersReducedMotion } from '../engine/sound.js';
import {
  clientToWorld,
  clampView,
  defaultView,
  fitCourse,
  fitToRect,
  holeBounds,
  isDrag,
  panBy,
  panByKey,
  viewBoxString,
  zoomAround,
  zoomBy,
} from '../engine/view.js';

function MoistureOverlayShape({ kind, d, cx, cy, rx, ry, x, y, width, height, surface, state, greenIndex }) {
  if (!state?.moistureOverlay) return null;
  const status = moistureStatus(state, surface, greenIndex);
  if (status.kind === 'hidden') return null;
  const color = moistureOverlayColor(status.value, surface);
  const opacity = status.kind === 'stale' ? MOISTURE_STALE_OPACITY : MOISTURE_OVERLAY_OPACITY;
  const marked = outOfBand(status.value, surface);
  const hatch = status.kind === 'stale' ? 'url(#moisture-hatch)' : null;
  const stroke = marked ? 'var(--machine-orange)' : 'none';
  const strokeWidth = marked ? MOISTURE_BAND_MARK_WIDTH : 0;
  const common = { pointerEvents: 'none', opacity };
  if (kind === 'path') {
    return (
      <>
        <path d={d} fill={color} stroke={stroke} strokeWidth={strokeWidth} {...common} />
        {hatch ? <path d={d} fill={hatch} pointerEvents="none" opacity={opacity} /> : null}
      </>
    );
  }
  if (kind === 'rect') {
    return (
      <>
        <rect x={x} y={y} width={width} height={height} fill={color} stroke={stroke} strokeWidth={strokeWidth} {...common} />
        {hatch ? <rect x={x} y={y} width={width} height={height} fill={hatch} pointerEvents="none" opacity={opacity} /> : null}
      </>
    );
  }
  return (
    <>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={color} stroke={stroke} strokeWidth={strokeWidth} {...common} />
      {hatch ? <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={hatch} pointerEvents="none" opacity={opacity} /> : null}
    </>
  );
}

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
  view = defaultView(),
  onView,
  moistureState = null,
  highlight = null,
}) {
  const svgRef = useRef(null);
  const dragRef = useRef(null);
  const viewRef = useRef(view);
  const fills = {
    greens: surfaceFill('greens', surfaces.greens.quality),
    tees: surfaceFill('tees', surfaces.tees.quality),
    fairways: surfaceFill('fairways', surfaces.fairways.quality),
    rough: surfaceFill('rough', surfaces.rough.quality),
    bunkers: surfaceFill('bunkers', surfaces.bunkers.quality),
  };
  const layout = holesForCount(holes);
  const bounds = courseBounds(layout);
  const camera = clampView(view, bounds);
  viewRef.current = camera;
  const patternState = { day, surfaces };
  const patterned = ['greens', 'tees', 'fairways'].filter((surface) => hasPattern(surface));
  const active = highlight ?? selected;

  function setView(next) {
    const clamped = clampView(next, bounds);
    viewRef.current = clamped;
    onView?.(clamped);
  }

  function fitHole(hole) {
    setView(fitToRect(bounds, holeBounds(hole)));
  }

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;
    function onWheel(event) {
      event.preventDefault();
      const world = clientToWorld(svg, event.clientX, event.clientY);
      const factor = event.deltaY > 0 ? 1 / VIEW_ZOOM_WHEEL_FACTOR : VIEW_ZOOM_WHEEL_FACTOR;
      const current = viewRef.current;
      const next = zoomAround(current, bounds, world.x, world.y, current.zoom * factor);
      viewRef.current = next;
      onView?.(next);
    }
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [holes, onView]);

  useEffect(() => {
    function onKey(event) {
      if (event.target.closest?.('input, select, textarea')) return;
      if (event.key === '0') {
        event.preventDefault();
        setView(fitCourse());
      } else if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        setView(zoomBy(viewRef.current, bounds, VIEW_ZOOM_STEP));
      } else if (event.key === '-' || event.key === '_') {
        event.preventDefault();
        setView(zoomBy(viewRef.current, bounds, 1 / VIEW_ZOOM_STEP));
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setView(panByKey(viewRef.current, bounds, 1, 0));
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        setView(panByKey(viewRef.current, bounds, -1, 0));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setView(panByKey(viewRef.current, bounds, 0, 1));
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        setView(panByKey(viewRef.current, bounds, 0, -1));
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [holes]);

  return (
    <svg
      ref={svgRef}
      viewBox={viewBoxString(camera, bounds)}
      preserveAspectRatio="xMidYMid meet"
      className="absolute inset-0 h-full w-full touch-none"
      role="img"
      aria-label={`${holes}-hole course map`}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        dragRef.current = {
          pointerId: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          dragging: false,
        };
      }}
      onPointerMove={(event) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        const dx = event.clientX - drag.x;
        const dy = event.clientY - drag.y;
        if (!drag.dragging && isDrag(dx, dy)) {
          drag.dragging = true;
          svgRef.current?.setPointerCapture(event.pointerId);
        }
        if (!drag.dragging) return;
        const svg = svgRef.current;
        if (!svg) return;
        const from = clientToWorld(svg, drag.x, drag.y);
        const to = clientToWorld(svg, event.clientX, event.clientY);
        drag.x = event.clientX;
        drag.y = event.clientY;
        setView(panBy(viewRef.current, bounds, to.x - from.x, to.y - from.y));
      }}
      onPointerUp={(event) => {
        const drag = dragRef.current;
        if (drag?.dragging) event.currentTarget.releasePointerCapture?.(event.pointerId);
        dragRef.current = drag?.dragging ? { ...drag, ended: true } : null;
      }}
      onPointerCancel={() => {
        dragRef.current = null;
      }}
      onClickCapture={(event) => {
        if (dragRef.current?.dragging || dragRef.current?.ended) {
          event.stopPropagation();
          event.preventDefault();
          dragRef.current = null;
        }
      }}
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
        <pattern
          id="moisture-hatch"
          width={MOISTURE_HATCH_SIZE}
          height={MOISTURE_HATCH_SIZE}
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line
            x1="0"
            y1="0"
            x2="0"
            y2={MOISTURE_HATCH_SIZE}
            stroke="var(--paint)"
            strokeWidth={MOISTURE_HATCH_WIDTH}
          />
        </pattern>
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
          stroke={surfaceStroke('rough', active, surfaces.greens.quality)}
          strokeWidth={surfaceStrokeWidth('rough', active)}
          className="course-surface cursor-pointer outline-none"
          tabIndex={0}
          role="button"
          aria-label={`Hole ${hole.id} rough`}
          onClick={() => onSelect('rough')}
          onDoubleClick={(event) => {
            event.preventDefault();
            fitHole(hole);
          }}
          onKeyDown={(event) => activate(event, 'rough', onSelect)}
        />
      ))}
      {layout.map((hole) => (
        <g key={`fairway-${hole.id}`}>
          <path
            d={holePath(hole.fairway)}
            fill={fills.fairways}
            stroke={surfaceStroke('fairways', active, surfaces.greens.quality)}
            strokeWidth={surfaceStrokeWidth('fairways', active)}
            className="course-surface cursor-pointer outline-none"
            tabIndex={0}
            role="button"
            aria-label={`Hole ${hole.id} fairway`}
            onClick={() => onSelect('fairways')}
            onDoubleClick={(event) => {
              event.preventDefault();
              fitHole(hole);
            }}
            onKeyDown={(event) => activate(event, 'fairways', onSelect)}
          />
          <path
            d={holePath(hole.fairway)}
            fill="url(#mow-fairways)"
            opacity={surfacePatternOpacity(patternState, 'fairways')}
            pointerEvents="none"
          />
          <MoistureOverlayShape kind="path" d={holePath(hole.fairway)} surface="fairways" state={moistureState} />
        </g>
      ))}
      {layout.map((hole) =>
        hole.bunkers.map((bunker, index) => (
          <path
            key={`bunker-${hole.id}-${index}`}
            d={holePath(bunker)}
            fill={fills.bunkers}
            stroke={surfaceStroke('bunkers', active, surfaces.greens.quality)}
            strokeWidth={surfaceStrokeWidth('bunkers', active)}
            className="course-surface cursor-pointer outline-none"
            tabIndex={0}
            role="button"
            aria-label={`Hole ${hole.id} bunker`}
            onClick={() => onSelect('bunkers')}
            onDoubleClick={(event) => {
              event.preventDefault();
              fitHole(hole);
            }}
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
            stroke={surfaceStroke('tees', active, surfaces.greens.quality)}
            strokeWidth={surfaceStrokeWidth('tees', active)}
            className="course-surface cursor-pointer outline-none"
            tabIndex={0}
            role="button"
            aria-label={`Hole ${hole.id} tee`}
            onClick={() => onSelect('tees')}
            onDoubleClick={(event) => {
              event.preventDefault();
              fitHole(hole);
            }}
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
          <MoistureOverlayShape
            kind="rect"
            x={hole.tee.cx - hole.tee.rx}
            y={hole.tee.cy - hole.tee.ry}
            width={hole.tee.rx * 2}
            height={hole.tee.ry * 2}
            surface="tees"
            state={moistureState}
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
            stroke={surfaceStroke('greens', active, surfaces.greens.quality)}
            strokeWidth={surfaceStrokeWidth('greens', active)}
            className="course-surface cursor-pointer outline-none"
            tabIndex={0}
            role="button"
            aria-label={`Hole ${hole.id} green`}
            onClick={() => onSelect('greens')}
            onDoubleClick={(event) => {
              event.preventDefault();
              fitHole(hole);
            }}
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
          <MoistureOverlayShape
            kind="ellipse"
            cx={hole.green.cx}
            cy={hole.green.cy}
            rx={hole.green.rx}
            ry={hole.green.ry}
            surface="greens"
            state={moistureState}
            greenIndex={hole.id - 1}
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
          className={active === 'pond' ? 'stroke-[var(--paint)] stroke-[3]' : 'stroke-[var(--soil)] stroke-1'}
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
          key={`mower-${highlight ?? 'run'}`}
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
