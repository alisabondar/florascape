import type { ZoomView } from "./types";

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 3;
export const ZOOM_STEP = 1.25;
export const IDENTITY_VIEW: ZoomView = { scale: 1, x: 0, y: 0 };

export function clampZoom(scale: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale));
}

/**
 * Keeps the scaled content covering the viewport: with transform-origin 0 0, the
 * translation must stay within [size × (1 − scale), 0] on each axis.
 */
export function clampPan(view: ZoomView, width: number, height: number): ZoomView {
  return {
    scale: view.scale,
    x: Math.min(0, Math.max(width * (1 - view.scale), view.x)),
    y: Math.min(0, Math.max(height * (1 - view.scale), view.y)),
  };
}

/** Zooms to nextScale while keeping the focal point (viewport coordinates) fixed. */
export function zoomAt(
  view: ZoomView,
  nextScale: number,
  focal: { x: number; y: number },
  width: number,
  height: number,
): ZoomView {
  const scale = clampZoom(nextScale);
  const ratio = scale / view.scale;
  return clampPan(
    {
      scale,
      x: focal.x - (focal.x - view.x) * ratio,
      y: focal.y - (focal.y - view.y) * ratio,
    },
    width,
    height,
  );
}

export function panBy(
  view: ZoomView,
  dx: number,
  dy: number,
  width: number,
  height: number,
): ZoomView {
  return clampPan({ ...view, x: view.x + dx, y: view.y + dy }, width, height);
}
