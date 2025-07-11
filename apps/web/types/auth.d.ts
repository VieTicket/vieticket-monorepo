import "better-auth";

declare module "better-auth" {
  interface User {
    id: string;
    email: string;
    name: string;
    emailVerified?: boolean;
    image?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
    role?: "organizer" | "customer" | "admin";
    banned?: boolean;
    banReason?: string | null;
    banExpires?: Date | null;
  }

  interface Session {
    user: User;
  }
}
