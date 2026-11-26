import { pgTable, uuid, text, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./auth";

/** Member workspace: member bekerja di data milik owner. */
export const teamMembers = pgTable(
  "team_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("team_members_member_uniq").on(t.memberId),
    index("team_members_owner_idx").on(t.ownerId),
  ]
);

/** Undangan gabung workspace via link token. */
export const teamInvites = pgTable(
  "team_invites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    token: text("token").notNull(),
    expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
    acceptedAt: timestamp("accepted_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("team_invites_token_uniq").on(t.token),
    index("team_invites_owner_idx").on(t.ownerId),
  ]
);
