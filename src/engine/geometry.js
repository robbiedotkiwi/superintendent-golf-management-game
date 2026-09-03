export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function lerpPoint(a, b, t) {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
}

export function dist(a, b) {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

export function normalize(x, y) {
  const length = Math.hypot(x, y) || 1;
  return [x / length, y / length];
}

export function polylineLength(points) {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) total += dist(points[i - 1], points[i]);
  return total;
}

export function densifyPolyline(points, samplesPerSegment) {
  const out = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    for (let s = 0; s < samplesPerSegment; s += 1) {
      out.push(lerpPoint(points[i], points[i + 1], s / samplesPerSegment));
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

export function pointAtLength(points, t) {
  const target = polylineLength(points) * Math.max(0, Math.min(1, t));
  let walked = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    const seg = dist(points[i], points[i + 1]);
    if (walked + seg >= target || i === points.length - 2) {
      const u = seg === 0 ? 0 : (target - walked) / seg;
      return lerpPoint(points[i], points[i + 1], u);
    }
    walked += seg;
  }
  return points[points.length - 1];
}

export function tangentAtLength(points, t) {
  const target = polylineLength(points) * Math.max(0, Math.min(1, t));
  let walked = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    const seg = dist(points[i], points[i + 1]);
    if (walked + seg >= target || i === points.length - 2) {
      return normalize(points[i + 1][0] - points[i][0], points[i + 1][1] - points[i][1]);
    }
    walked += seg;
  }
  const last = points.length - 1;
  return normalize(points[last][0] - points[last - 1][0], points[last][1] - points[last - 1][1]);
}

export function normalFromTangent(tx, ty) {
  return normalize(-ty, tx);
}

export function turnDegrees(a, b, c) {
  const v1 = [a[0] - b[0], a[1] - b[1]];
  const v2 = [c[0] - b[0], c[1] - b[1]];
  const d1 = Math.hypot(v1[0], v1[1]) || 1;
  const d2 = Math.hypot(v2[0], v2[1]) || 1;
  const dot = Math.max(-1, Math.min(1, (v1[0] * v2[0] + v1[1] * v2[1]) / (d1 * d2)));
  const interior = (Math.acos(dot) * 180) / Math.PI;
  return 180 - interior;
}

export function maxTurnDegrees(points) {
  let max = 0;
  for (let i = 1; i < points.length - 1; i += 1) {
    max = Math.max(max, turnDegrees(points[i - 1], points[i], points[i + 1]));
  }
  return max;
}

export function polygonPath(points) {
  if (!points?.length) return '';
  return (
    points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point[0].toFixed(1)},${point[1].toFixed(1)}`).join(' ') +
    ' Z'
  );
}

export function polylinePath(points) {
  if (!points?.length) return '';
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point[0].toFixed(1)},${point[1].toFixed(1)}`).join(' ');
}

export function offsetPoints(points, dx, dy = 0) {
  return points.map(([x, y]) => [x + dx, y + dy]);
}

function orient(a, b, c) {
  const value = (b[1] - a[1]) * (c[0] - b[0]) - (b[0] - a[0]) * (c[1] - b[1]);
  if (Math.abs(value) < 1e-9) return 0;
  return value > 0 ? 1 : 2;
}

function onSegment(a, b, c) {
  return (
    Math.min(a[0], c[0]) - 1e-9 <= b[0] &&
    b[0] <= Math.max(a[0], c[0]) + 1e-9 &&
    Math.min(a[1], c[1]) - 1e-9 <= b[1] &&
    b[1] <= Math.max(a[1], c[1]) + 1e-9
  );
}

export function segmentsIntersect(p1, q1, p2, q2) {
  const o1 = orient(p1, q1, p2);
  const o2 = orient(p1, q1, q2);
  const o3 = orient(p2, q2, p1);
  const o4 = orient(p2, q2, q1);
  if (o1 !== o2 && o3 !== o4) {
    if (o1 === 0 || o2 === 0 || o3 === 0 || o4 === 0) return false;
    return true;
  }
  return false;
}

export function pointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];
    const hit = yi > point[1] !== yj > point[1] && point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi + 1e-12) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

export function polygonsIntersect(a, b) {
  if (!a?.length || !b?.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const a1 = a[i];
    const a2 = a[(i + 1) % a.length];
    for (let j = 0; j < b.length; j += 1) {
      if (segmentsIntersect(a1, a2, b[j], b[(j + 1) % b.length])) return true;
    }
  }
  if (pointInPolygon(a[0], b) || pointInPolygon(b[0], a)) return true;
  return false;
}

export function expandPolygon(poly, amount) {
  const count = poly.length;
  if (count < 3) return poly;
  return poly.map((cur, index) => {
    const prev = poly[(index + count - 1) % count];
    const next = poly[(index + 1) % count];
    const e1 = [cur[0] - prev[0], cur[1] - prev[1]];
    const e2 = [next[0] - cur[0], next[1] - cur[1]];
    const o1 = normalize(e1[1], -e1[0]);
    const o2 = normalize(e2[1], -e2[0]);
    return [cur[0] + (o1[0] + o2[0]) * amount, cur[1] + (o1[1] + o2[1]) * amount];
  });
}

export function ribbon(centerline, halfWidthAt, capSamples) {
  const left = [];
  const right = [];
  for (let i = 0; i < centerline.length; i += 1) {
    const prev = centerline[Math.max(0, i - 1)];
    const next = centerline[Math.min(centerline.length - 1, i + 1)];
    const [tx, ty] = normalize(next[0] - prev[0], next[1] - prev[1]);
    const [nx, ny] = normalFromTangent(tx, ty);
    const t = i / (centerline.length - 1);
    const w = halfWidthAt(t);
    left.push([centerline[i][0] + nx * w, centerline[i][1] + ny * w]);
    right.push([centerline[i][0] - nx * w, centerline[i][1] - ny * w]);
  }

  function cap(center, tangent, width, fromRight) {
    const [tx, ty] = tangent;
    const [nx, ny] = normalFromTangent(tx, ty);
    const start = fromRight ? 1 : -1;
    const end = fromRight ? -1 : 1;
    const pts = [];
    for (let i = 1; i < capSamples; i += 1) {
      const u = i / capSamples;
      const ang = (Math.PI / 2) * lerp(start, end, u);
      const ox = nx * Math.cos(ang) + tx * Math.sin(ang);
      const oy = ny * Math.cos(ang) + ty * Math.sin(ang);
      pts.push([center[0] + ox * width, center[1] + oy * width]);
    }
    return pts;
  }

  const startT = normalize(centerline[0][0] - centerline[1][0], centerline[0][1] - centerline[1][1]);
  const endT = normalize(
    centerline[centerline.length - 1][0] - centerline[centerline.length - 2][0],
    centerline[centerline.length - 1][1] - centerline[centerline.length - 2][1],
  );
  const startCap = cap(centerline[0], startT, halfWidthAt(0), true);
  const endCap = cap(centerline[centerline.length - 1], endT, halfWidthAt(1), true);
  return left.concat(endCap, right.slice().reverse(), startCap);
}

export function collidingRoughPairs(holes, gap = 0) {
  const inflated = holes.map((hole) => (gap > 0 ? expandPolygon(hole.rough, gap / 2) : hole.rough));
  const pairs = [];
  for (let i = 0; i < inflated.length; i += 1) {
    for (let j = i + 1; j < inflated.length; j += 1) {
      if (polygonsIntersect(inflated[i], inflated[j])) pairs.push([holes[i].id, holes[j].id]);
    }
  }
  return pairs;
}

export function collidingRoughPair(holes, gap = 0) {
  return collidingRoughPairs(holes, gap)[0] ?? null;
}

export function assertNoRoughOverlap(holes, gap = 0) {
  const pair = collidingRoughPair(holes, gap);
  if (pair) {
    throw new Error(`Hole ${pair[0]} rough intersects hole ${pair[1]} rough`);
  }
}
