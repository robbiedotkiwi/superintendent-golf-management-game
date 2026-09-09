import {
  MAP_VIEW_PADDING,
  VIEW_DRAG_THRESHOLD,
  VIEW_PAN_KEEP,
  VIEW_PAN_STEP,
  VIEW_PAN_X_DEFAULT,
  VIEW_PAN_Y_DEFAULT,
  VIEW_ZOOM_DEFAULT,
  VIEW_ZOOM_MAX,
  VIEW_ZOOM_MIN,
} from '../data/constants.js';

export function clampZoom(zoom) {
  return Math.min(VIEW_ZOOM_MAX, Math.max(VIEW_ZOOM_MIN, Number(zoom) || VIEW_ZOOM_DEFAULT));
}

export function defaultView() {
  return { zoom: VIEW_ZOOM_DEFAULT, panX: VIEW_PAN_X_DEFAULT, panY: VIEW_PAN_Y_DEFAULT };
}

export function visibleSize(bounds, zoom) {
  const z = clampZoom(zoom);
  return { width: bounds.width / z, height: bounds.height / z };
}

export function viewBoxFromView(view, bounds) {
  const zoom = clampZoom(view.zoom);
  const { width, height } = visibleSize(bounds, zoom);
  return {
    x: bounds.minX + (bounds.width - width) / 2 - (view.panX ?? 0),
    y: bounds.minY + (bounds.height - height) / 2 - (view.panY ?? 0),
    width,
    height,
  };
}

export function viewBoxString(view, bounds) {
  const box = viewBoxFromView(view, bounds);
  return `${box.x} ${box.y} ${box.width} ${box.height}`;
}

export function panLimits(bounds, zoom) {
  const z = clampZoom(zoom);
  const { width, height } = visibleSize(bounds, z);
  const originX = bounds.minX + (bounds.width - width) / 2;
  const originY = bounds.minY + (bounds.height - height) / 2;
  const keep = Math.min(VIEW_PAN_KEEP, bounds.width, bounds.height);
  return {
    minPanX: originX - (bounds.minX + bounds.width - keep),
    maxPanX: originX + width - (bounds.minX + keep),
    minPanY: originY - (bounds.minY + bounds.height - keep),
    maxPanY: originY + height - (bounds.minY + keep),
  };
}

export function clampView(view, bounds) {
  const zoom = clampZoom(view.zoom);
  const limits = panLimits(bounds, zoom);
  return {
    zoom,
    panX: Math.min(limits.maxPanX, Math.max(limits.minPanX, view.panX ?? 0)),
    panY: Math.min(limits.maxPanY, Math.max(limits.minPanY, view.panY ?? 0)),
  };
}

export function zoomAround(view, bounds, worldX, worldY, nextZoom) {
  const oldBox = viewBoxFromView(view, bounds);
  const zoom = clampZoom(nextZoom);
  const fx = oldBox.width === 0 ? 0.5 : (worldX - oldBox.x) / oldBox.width;
  const fy = oldBox.height === 0 ? 0.5 : (worldY - oldBox.y) / oldBox.height;
  const { width, height } = visibleSize(bounds, zoom);
  const visX = worldX - fx * width;
  const visY = worldY - fy * height;
  const originX = bounds.minX + (bounds.width - width) / 2;
  const originY = bounds.minY + (bounds.height - height) / 2;
  return clampView({ zoom, panX: originX - visX, panY: originY - visY }, bounds);
}

export function zoomBy(view, bounds, factor, worldX, worldY) {
  const box = viewBoxFromView(view, bounds);
  const cx = worldX ?? box.x + box.width / 2;
  const cy = worldY ?? box.y + box.height / 2;
  return zoomAround(view, bounds, cx, cy, view.zoom * factor);
}

export function panBy(view, bounds, dx, dy) {
  return clampView({ ...view, zoom: view.zoom, panX: view.panX + dx, panY: view.panY + dy }, bounds);
}

export function panByKey(view, bounds, dx, dy) {
  const zoom = clampZoom(view.zoom);
  return panBy(view, bounds, (dx * VIEW_PAN_STEP) / zoom, (dy * VIEW_PAN_STEP) / zoom);
}

export function fitCourse() {
  return defaultView();
}

export function rectBounds(points) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of points) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return { minX, minY, width: maxX - minX, height: maxY - minY };
}

export function holeBounds(hole) {
  const points = [...(hole.rough ?? []), ...(hole.fairway ?? [])];
  if (hole.tee) {
    points.push([hole.tee.cx - hole.tee.rx, hole.tee.cy - hole.tee.ry], [hole.tee.cx + hole.tee.rx, hole.tee.cy + hole.tee.ry]);
  }
  if (hole.green) {
    points.push(
      [hole.green.cx - hole.green.rx, hole.green.cy - hole.green.ry],
      [hole.green.cx + hole.green.rx, hole.green.cy + hole.green.ry],
    );
  }
  return rectBounds(points);
}

export function fitToRect(bounds, rect) {
  const target = {
    minX: rect.minX - MAP_VIEW_PADDING,
    minY: rect.minY - MAP_VIEW_PADDING,
    width: rect.width + MAP_VIEW_PADDING * 2,
    height: rect.height + MAP_VIEW_PADDING * 2,
  };
  const zoom = clampZoom(Math.min(bounds.width / target.width, bounds.height / target.height));
  const { width, height } = visibleSize(bounds, zoom);
  const visX = target.minX + target.width / 2 - width / 2;
  const visY = target.minY + target.height / 2 - height / 2;
  const originX = bounds.minX + (bounds.width - width) / 2;
  const originY = bounds.minY + (bounds.height - height) / 2;
  return clampView({ zoom, panX: originX - visX, panY: originY - visY }, bounds);
}

export function isDrag(dx, dy, threshold = VIEW_DRAG_THRESHOLD) {
  return Math.hypot(dx, dy) >= threshold;
}

export function clientToWorld(svg, clientX, clientY) {
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const world = pt.matrixTransform(ctm.inverse());
  return { x: world.x, y: world.y };
}
