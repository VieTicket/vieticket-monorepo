import * as PIXI from "pixi.js";
import { previewContainer } from "./variables";

interface GuideLineOptions {
  showGrid?: boolean;
  showSnapGuides?: boolean;
  gridSpacing?: number;
  snapDistance?: number;
  gridColor?: number;
  snapGuideColor?: number;
  gridAlpha?: number;
  snapGuideAlpha?: number;
}

class GuideLines {
  private gridGraphics: PIXI.Graphics | null = null;
  private snapGuideGraphics: PIXI.Graphics | null = null;
  private options: Required<GuideLineOptions>;

  constructor(options: GuideLineOptions = {}) {
    this.options = {
      showGrid: options.showGrid ?? true,
      showSnapGuides: options.showSnapGuides ?? true,
      gridSpacing: options.gridSpacing ?? 25,
      snapDistance: options.snapDistance ?? 10,
      gridColor: options.gridColor ?? 0xcccccc,
      snapGuideColor: options.snapGuideColor ?? 0xff0066,
      gridAlpha: options.gridAlpha ?? 0.3,
      snapGuideAlpha: options.snapGuideAlpha ?? 0.8,
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

    // Draw vertical lines
    for (let x = 0; x <= width; x += this.options.gridSpacing) {
      this.gridGraphics.moveTo(x, 0).lineTo(x, height);
    }

    // Draw horizontal lines
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
      // Draw vertical guide line
      if (Math.abs(point.x - x) <= this.options.snapDistance) {
        this.snapGuideGraphics!.moveTo(point.x, 0).lineTo(point.x, 2000);
      }

      // Draw horizontal guide line
      if (Math.abs(point.y - y) <= this.options.snapDistance) {
        this.snapGuideGraphics!.moveTo(0, point.y).lineTo(2000, point.y);
      }
    });

    this.snapGuideGraphics.stroke();
    previewContainer.addChild(this.snapGuideGraphics);
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

  public clearAll(): void {
    this.clearGrid();
    this.clearSnapGuides();
  }

  public updateOptions(newOptions: Partial<GuideLineOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }

  public destroy(): void {
    this.clearAll();
  }
}

// Export singleton instance
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
