import { pgTable, timestamp, integer, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const presenceTable = pgTable("presence", {
  userId: integer("user_id").notNull().primaryKey(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPresenceSchema = createInsertSchema(presenceTable);
export type InsertPresence = z.infer<typeof insertPresenceSchema>;
export type Presence = typeof presenceTable.$inferSelect;
