import { v4 as uuidv4 } from "uuid";
import { stage, zoom, pan } from "./variables";

export const generateShapeId = () => uuidv4();

export const updateStageTransform = () => {
  if (stage) {
    stage.scale.set(zoom);
    stage.position.set(pan.x, pan.y);
  }
};
