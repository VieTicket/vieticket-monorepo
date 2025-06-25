import { InferSelectModel } from "drizzle-orm";
import { events, organizers } from "../schema";

export type Event = InferSelectModel<typeof events>
export type EventWithOrganizer = Event & {
  organizer: Pick<InferSelectModel<typeof organizers>, 'id' | 'name'>;
};