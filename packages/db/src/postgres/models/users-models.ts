import type { InferSelectModel } from "drizzle-orm";
import { organizers, user } from "../schemas/users-schemas";

export type User = InferSelectModel<typeof user>;
export type Organizer = InferSelectModel<typeof organizers>;
export type UserProfileData = Partial<Omit<User, "id">>;
export type OrganizerProfileData = Partial<Omit<Organizer, "id" | "userId">>;
