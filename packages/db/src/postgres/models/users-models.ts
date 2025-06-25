import { InferSelectModel } from "drizzle-orm";
import { organizers, user } from "../schema";

export type User = InferSelectModel<typeof user>;
export type Organizer = InferSelectModel<typeof organizers>;
export type UserProfileData = Partial<Omit<User, "id">>;
export type OrganizerProfileData = Partial<Omit<Organizer, "id" | "userId">>;