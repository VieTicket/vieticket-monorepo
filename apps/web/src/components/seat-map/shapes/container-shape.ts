import * as PIXI from "pixi.js";
import { ContainerGroup } from "../types";
import { generateShapeId } from "../utils/stageTransform";
import { getEventManager } from "../events/event-manager";

export const createContainer = (
  children: any[] = [],
  name?: string,
  addShapeEvents: boolean = true,
  id: string = generateShapeId()
): ContainerGroup => {
  const graphics = new PIXI.Container();

  // Make container interactive
  graphics.eventMode = "static";
  graphics.cursor = "pointer";
  graphics.interactiveChildren = true;

  const container: ContainerGroup = {
    id,
    name: name || `Container`,
    type: "container",
    graphics,
    x: 0,
    y: 0,
    children: [],
    expanded: true,
    visible: true,
    interactive: true,
    selected: false,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
  };

  // Add event listeners
  const eventManager = getEventManager();
  if (eventManager && addShapeEvents) {
    eventManager.addShapeEvents(container);
  }

  return container;
};

export const updateContainerGraphics = (container: ContainerGroup) => {
  if (!(container.graphics instanceof PIXI.Container)) {
    return;
  }

  // Update container transforms
  container.graphics.position.set(container.x, container.y);
  container.graphics.rotation = container.rotation;
  container.graphics.scale.set(container.scaleX, container.scaleY);
  container.graphics.alpha = container.opacity;
  container.graphics.visible = container.visible;
  container.graphics.interactive = container.interactive;

  // Update children transforms (children maintain their relative positions)
  container.children.forEach((child) => {
    if (child.graphics) {
      child.graphics.alpha = child.opacity * container.opacity;
      child.graphics.visible = child.visible && container.visible;
    }
  });
};
