import * as PIXI from "pixi.js";
import { previewContainer } from "./variables";

interface GuideLineOptions {
  showGrid?: boolean;
  showSnapGuides?: boolean;
  showPolygonEdges?: boolean;
  gridSpacing?: number;
  snapDistance?: number;
  gridColor?: number;
  snapGuideColor?: number;
  polygonEdgeColor?: number;
  gridAlpha?: number;
  snapGuideAlpha?: number;
  polygonEdgeAlpha?: number;
}

interface PolygonEdge {
  start: { x: number; y: number };
  end: { x: number; y: number };
  slope: number | null;
  intercept: number | null;
}

class GuideLines {
  private gridGraphics: PIXI.Graphics | null = null;
  private snapGuideGraphics: PIXI.Graphics | null = null;
  private polygonEdgeGraphics: PIXI.Graphics | null = null;
  private seatAlignmentGraphics: PIXI.Graphics | null = null;
  private options: Required<GuideLineOptions>;

  constructor(options: GuideLineOptions = {}) {
    this.options = {
      showGrid: options.showGrid ?? true,
      showSnapGuides: options.showSnapGuides ?? true,
      showPolygonEdges: options.showPolygonEdges ?? true,
      gridSpacing: options.gridSpacing ?? 25,
      snapDistance: options.snapDistance ?? 10,
      gridColor: options.gridColor ?? 0xcccccc,
      snapGuideColor: options.snapGuideColor ?? 0xff0066,
      polygonEdgeColor: options.polygonEdgeColor ?? 0x00ff88,
      gridAlpha: options.gridAlpha ?? 0.3,
      snapGuideAlpha: options.snapGuideAlpha ?? 0.8,
      polygonEdgeAlpha: options.polygonEdgeAlpha ?? 0.6,
    };
  }

  public createGrid(width: number, height: number): void {
    if (!previewContainer || !this.options.showGrid) return;

    this.clearGrid();

    this.gridGraphics = new PIXI.Graphics();
    this.gridGraphics.stroke({
      width: 1,
      color: this.options.gridColor,
      alpha: this.options.gridAlpha,
    });

    for (let x = 0; x <= width; x += this.options.gridSpacing) {
      this.gridGraphics.moveTo(x, 0).lineTo(x, height);
    }

    for (let y = 0; y <= height; y += this.options.gridSpacing) {
      this.gridGraphics.moveTo(0, y).lineTo(width, y);
    }

    this.gridGraphics.stroke();
    previewContainer.addChild(this.gridGraphics);
  }

  public showSnapGuides(
    x: number,
    y: number,
    snapPoints: Array<{ x: number; y: number }>
  ): void {
    if (!previewContainer || !this.options.showSnapGuides) return;

    this.clearSnapGuides();

    const closestPoints = this.findClosestSnapPoints(x, y, snapPoints);
    if (closestPoints.length === 0) return;

    this.snapGuideGraphics = new PIXI.Graphics();
    this.snapGuideGraphics.stroke({
      width: 1,
      color: this.options.snapGuideColor,
      alpha: this.options.snapGuideAlpha,
    });

    closestPoints.forEach((point) => {
      if (Math.abs(point.x - x) <= this.options.snapDistance) {
        this.snapGuideGraphics!.moveTo(point.x, 0).lineTo(point.x, 2000);
      }

      if (Math.abs(point.y - y) <= this.options.snapDistance) {
        this.snapGuideGraphics!.moveTo(0, point.y).lineTo(2000, point.y);
      }
    });

    this.snapGuideGraphics.stroke();
    previewContainer.addChild(this.snapGuideGraphics);
  }

  public showPolygonEdgeGuides(
    x: number,
    y: number,
    polygonEdges: PolygonEdge[]
  ): void {
    if (!previewContainer || !this.options.showPolygonEdges) return;

    this.clearPolygonEdgeGuides();

    const relevantEdges = this.findRelevantPolygonEdges(x, y, polygonEdges);
    if (relevantEdges.length === 0) return;

    this.polygonEdgeGraphics = new PIXI.Graphics();
    this.polygonEdgeGraphics.stroke({
      width: 2,
      color: this.options.polygonEdgeColor,
      alpha: this.options.polygonEdgeAlpha,
    });

    relevantEdges.forEach((edge) => {
      this.drawExtendedEdgeLine(edge);
    });

    this.polygonEdgeGraphics.stroke();
    previewContainer.addChild(this.polygonEdgeGraphics);
  }

  private drawExtendedEdgeLine(edge: PolygonEdge): void {
    if (!this.polygonEdgeGraphics) return;

    const canvasSize = 3000;

    if (edge.slope === null) {
      const x = edge.intercept!;
      this.polygonEdgeGraphics.moveTo(x, -canvasSize).lineTo(x, canvasSize);
    } else if (edge.slope === 0) {
      const y = edge.intercept!;
      this.polygonEdgeGraphics.moveTo(-canvasSize, y).lineTo(canvasSize, y);
    } else {
      const slope = edge.slope;
      const intercept = edge.intercept!;

      const x1 = -canvasSize;
      const y1 = slope * x1 + intercept;
      const x2 = canvasSize;
      const y2 = slope * x2 + intercept;

      this.polygonEdgeGraphics.moveTo(x1, y1).lineTo(x2, y2);
    }
  }

  private findRelevantPolygonEdges(
    x: number,
    y: number,
    polygonEdges: PolygonEdge[]
  ): PolygonEdge[] {
    return polygonEdges.filter((edge) => {
      const distanceToLine = this.distanceToLine(x, y, edge);
      return distanceToLine <= this.options.snapDistance;
    });
  }

  private distanceToLine(x: number, y: number, edge: PolygonEdge): number {
    if (edge.slope === null) {
      return Math.abs(x - edge.intercept!);
    } else if (edge.slope === 0) {
      return Math.abs(y - edge.intercept!);
    } else {
      const A = edge.slope;
      const B = -1;
      const C = edge.intercept!;

      return Math.abs(A * x + B * y + C) / Math.sqrt(A * A + B * B);
    }
  }

  public snapToPolygonEdges(
    x: number,
    y: number,
    polygonEdges: PolygonEdge[]
  ): { x: number; y: number } {
    let closestX = x;
    let closestY = y;
    let minDistance = this.options.snapDistance;

    polygonEdges.forEach((edge) => {
      const distance = this.distanceToLine(x, y, edge);

      if (distance < minDistance) {
        const projected = this.projectPointOntoLine(x, y, edge);
        closestX = projected.x;
        closestY = projected.y;
        minDistance = distance;
      }
    });

    return { x: closestX, y: closestY };
  }

  private projectPointOntoLine(
    x: number,
    y: number,
    edge: PolygonEdge
  ): { x: number; y: number } {
    if (edge.slope === null) {
      return { x: edge.intercept!, y };
    } else if (edge.slope === 0) {
      return { x, y: edge.intercept! };
    } else {
      const m = edge.slope;
      const b = edge.intercept!;

      const projectedX = (x + m * y - m * b) / (1 + m * m);
      const projectedY = m * projectedX + b;

      return { x: projectedX, y: projectedY };
    }
  }

  public snapToGrid(x: number, y: number): { x: number; y: number } {
    if (!this.options.showGrid) return { x, y };

    const snappedX =
      Math.round(x / this.options.gridSpacing) * this.options.gridSpacing;
    const snappedY =
      Math.round(y / this.options.gridSpacing) * this.options.gridSpacing;

    return { x: snappedX, y: snappedY };
  }

  public snapToPoints(
    x: number,
    y: number,
    snapPoints: Array<{ x: number; y: number }>
  ): { x: number; y: number } {
    let closestX = x;
    let closestY = y;
    let minDistanceX = this.options.snapDistance;
    let minDistanceY = this.options.snapDistance;

    snapPoints.forEach((point) => {
      const distanceX = Math.abs(point.x - x);
      const distanceY = Math.abs(point.y - y);

      if (distanceX < minDistanceX) {
        closestX = point.x;
        minDistanceX = distanceX;
      }

      if (distanceY < minDistanceY) {
        closestY = point.y;
        minDistanceY = distanceY;
      }
    });

    return { x: closestX, y: closestY };
  }

  public showSeatAlignmentGuides(
    x: number,
    y: number,
    horizontalGuides: Array<{ y: number }>,
    verticalGuides: Array<{ x: number }>
  ): void {
    if (!previewContainer) return;

    this.clearSeatAlignmentGuides();

    const nearbyHorizontal = horizontalGuides.filter(
      (guide) => Math.abs(guide.y - y) <= this.options.snapDistance
    );
    const nearbyVertical = verticalGuides.filter(
      (guide) => Math.abs(guide.x - x) <= this.options.snapDistance
    );

    if (nearbyHorizontal.length === 0 && nearbyVertical.length === 0) return;

    this.seatAlignmentGraphics = new PIXI.Graphics();
    this.seatAlignmentGraphics.stroke({
      width: 1,
      color: 0x00ccff,
      alpha: 0.7,
    });

    const canvasSize = 3000;

    nearbyHorizontal.forEach((guide) => {
      this.seatAlignmentGraphics!.moveTo(-canvasSize, guide.y).lineTo(
        canvasSize,
        guide.y
      );
    });

    nearbyVertical.forEach((guide) => {
      this.seatAlignmentGraphics!.moveTo(guide.x, -canvasSize).lineTo(
        guide.x,
        canvasSize
      );
    });

    this.seatAlignmentGraphics.stroke();
    previewContainer.addChild(this.seatAlignmentGraphics);
  }

  public snapToSeatAlignment(
    x: number,
    y: number,
    horizontalGuides: Array<{ y: number }>,
    verticalGuides: Array<{ x: number }>
  ): { x: number; y: number } {
    let snappedX = x;
    let snappedY = y;

    let minHorizontalDistance = this.options.snapDistance;
    horizontalGuides.forEach((guide) => {
      const distance = Math.abs(guide.y - y);
      if (distance < minHorizontalDistance) {
        snappedY = guide.y;
        minHorizontalDistance = distance;
      }
    });

    let minVerticalDistance = this.options.snapDistance;
    verticalGuides.forEach((guide) => {
      const distance = Math.abs(guide.x - x);
      if (distance < minVerticalDistance) {
        snappedX = guide.x;
        minVerticalDistance = distance;
      }
    });

    return { x: snappedX, y: snappedY };
  }

  private findClosestSnapPoints(
    x: number,
    y: number,
    snapPoints: Array<{ x: number; y: number }>
  ): Array<{ x: number; y: number }> {
    return snapPoints.filter((point) => {
      const distanceX = Math.abs(point.x - x);
      const distanceY = Math.abs(point.y - y);
      return (
        distanceX <= this.options.snapDistance ||
        distanceY <= this.options.snapDistance
      );
    });
  }

  public clearGrid(): void {
    if (this.gridGraphics && previewContainer) {
      previewContainer.removeChild(this.gridGraphics);
      this.gridGraphics.destroy();
      this.gridGraphics = null;
    }
  }

  public clearSnapGuides(): void {
    if (this.snapGuideGraphics && previewContainer) {
      previewContainer.removeChild(this.snapGuideGraphics);
      this.snapGuideGraphics.destroy();
      this.snapGuideGraphics = null;
    }
  }

  public clearSeatAlignmentGuides(): void {
    if (this.seatAlignmentGraphics && previewContainer) {
      previewContainer.removeChild(this.seatAlignmentGraphics);
      this.seatAlignmentGraphics.destroy();
      this.seatAlignmentGraphics = null;
    }
  }

  public clearPolygonEdgeGuides(): void {
    if (this.polygonEdgeGraphics && previewContainer) {
      previewContainer.removeChild(this.polygonEdgeGraphics);
      this.polygonEdgeGraphics.destroy();
      this.polygonEdgeGraphics = null;
    }
  }

  public clearAll(): void {
    this.clearGrid();
    this.clearSnapGuides();
    this.clearPolygonEdgeGuides();
    this.clearSeatAlignmentGuides();
  }

  public updateOptions(newOptions: Partial<GuideLineOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }

  public destroy(): void {
    this.clearAll();
  }
}

let guideLines: GuideLines | null = null;

export const createGuideLines = (options?: GuideLineOptions): GuideLines => {
  if (guideLines) {
    guideLines.destroy();
  }
  guideLines = new GuideLines(options);
  return guideLines;
};

export const getGuideLines = (): GuideLines | null => {
  return guideLines;
};

export const destroyGuideLines = (): void => {
  if (guideLines) {
    guideLines.destroy();
    guideLines = null;
  }
};

export const createPolygonEdges = (
  points: Array<{ x: number; y: number }>
): Array<{
  start: { x: number; y: number };
  end: { x: number; y: number };
  slope: number | null;
  intercept: number | null;
}> => {
  if (points.length < 2) return [];

  const edges: Array<{
    start: { x: number; y: number };
    end: { x: number; y: number };
    slope: number | null;
    intercept: number | null;
  }> = [];

  for (let i = 0; i < points.length; i++) {
    const start = points[i];
    const end = points[(i + 1) % points.length];

    const deltaX = end.x - start.x;
    const deltaY = end.y - start.y;

    let slope: number | null;
    let intercept: number | null;

    if (Math.abs(deltaX) < 0.001) {
      slope = null;
      intercept = start.x;
    } else {
      slope = deltaY / deltaX;
      intercept = start.y - slope * start.x;
    }

    edges.push({
      start,
      end,
      slope,
      intercept,
    });
  }

  return edges;
};
