import * as PIXI from "pixi.js";
import { ContainerGroup } from "../types";
import { generateShapeId } from "../utils/stageTransform";
import { getEventManager } from "../events/event-manager";

export const createContainer = (
  children: any[] = [],
  name?: string
): ContainerGroup => {
  const graphics = new PIXI.Container();

  // Make container interactive
  graphics.eventMode = "static";
  graphics.cursor = "pointer";
  graphics.interactiveChildren = true;

  const container: ContainerGroup = {
    id: generateShapeId(),
    name: name || `Container ${Date.now()}`,
    type: "container",
    graphics,
    x: 0,
    y: 0,
    children: [],
    expanded: true,
    visible: true,
    locked: false,
    selected: false,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
  };

  // Add event listeners
  const eventManager = getEventManager();
  if (eventManager) {
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

  // Update children transforms (children maintain their relative positions)
  container.children.forEach((child) => {
    if (child.graphics) {
      child.graphics.alpha = child.opacity * container.opacity;
      child.graphics.visible = child.visible && container.visible;
    }
  });
};

export const addChildToContainer = (container: ContainerGroup, child: any) => {
  if (!container.children.includes(child)) {
    container.children.push(child);
    container.graphics.addChild(child.graphics);
    updateContainerGraphics(container);
  }
};

export const removeChildFromContainer = (
  container: ContainerGroup,
  child: any
) => {
  const index = container.children.indexOf(child);
  if (index !== -1) {
    container.children.splice(index, 1);
    container.graphics.removeChild(child.graphics);
    updateContainerGraphics(container);
  }
};
