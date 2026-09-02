import { qualityColor } from '../engine/color.js';
import { HOLE_COUNT } from '../data/constants.js';
import { HOLES, MAP_HEIGHT, MAP_VIEWBOX, MAP_WIDTH, SHED_HEIGHT, SHED_WIDTH, SHED_X, SHED_Y } from '../data/course.js';
import { SURFACE_LABELS } from '../data/tasks.js';

function activate(event, surface, onSelect) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    onSelect(surface);
  }
}

function surfaceClass(selected, surface) {
  return [
    'course-surface cursor-pointer outline-none',
    selected === surface ? 'stroke-[var(--paint)] stroke-[3]' : 'stroke-[var(--soil)] stroke-1',
  ].join(' ');
}

export default function CourseMap({ surfaces, selected, onSelect, onOpenShed }) {
  const fills = {
    greens: qualityColor(surfaces.greens.quality),
    tees: qualityColor(surfaces.tees.quality),
    fairways: qualityColor(surfaces.fairways.quality),
    rough: qualityColor(surfaces.rough.quality),
    bunkers: qualityColor(surfaces.bunkers.quality),
  };

  return (
    <svg
      viewBox={MAP_VIEWBOX}
      className="h-full w-full"
      role="img"
      aria-label={`${HOLE_COUNT}-hole course map`}
    >
      <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="var(--soil)" onClick={() => onSelect(null)} />
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
      {HOLES.map((hole) => (
        <g key={hole.id}>
          <path
            d={hole.rough}
            fill={fills.rough}
            className={surfaceClass(selected, 'rough')}
            tabIndex={0}
            role="button"
            aria-label={`Hole ${hole.id} rough`}
            onClick={() => onSelect('rough')}
            onKeyDown={(event) => activate(event, 'rough', onSelect)}
          />
          <path
            d={hole.fairway}
            fill={fills.fairway}
            className={surfaceClass(selected, 'fairways')}
            tabIndex={0}
            role="button"
            aria-label={`Hole ${hole.id} fairway`}
            onClick={() => onSelect('fairways')}
            onKeyDown={(event) => activate(event, 'fairways', onSelect)}
          />
          {hole.bunker ? (
            <ellipse
              cx={hole.bunker.cx}
              cy={hole.bunker.cy}
              rx={hole.bunker.rx}
              ry={hole.bunker.ry}
              fill={fills.bunkers}
              className={surfaceClass(selected, 'bunkers')}
              tabIndex={0}
              role="button"
              aria-label={`Hole ${hole.id} bunker`}
              onClick={() => onSelect('bunkers')}
              onKeyDown={(event) => activate(event, 'bunkers', onSelect)}
            />
          ) : null}
          <ellipse
            cx={hole.tee.cx}
            cy={hole.tee.cy}
            rx={hole.tee.rx}
            ry={hole.tee.ry}
            fill={fills.tees}
            className={surfaceClass(selected, 'tees')}
            tabIndex={0}
            role="button"
            aria-label={`Hole ${hole.id} tee`}
            onClick={() => onSelect('tees')}
            onKeyDown={(event) => activate(event, 'tees', onSelect)}
          />
          <ellipse
            cx={hole.green.cx}
            cy={hole.green.cy}
            rx={hole.green.rx}
            ry={hole.green.ry}
            fill={fills.greens}
            className={surfaceClass(selected, 'greens')}
            tabIndex={0}
            role="button"
            aria-label={`Hole ${hole.id} green`}
            onClick={() => onSelect('greens')}
            onKeyDown={(event) => activate(event, 'greens', onSelect)}
          />
        </g>
      ))}
      <text x="24" y="36" fill="var(--sand)" fontSize="18">
        Click a surface — {SURFACE_LABELS.greens.toLowerCase()} work all nine.
      </text>
    </svg>
  );
}
