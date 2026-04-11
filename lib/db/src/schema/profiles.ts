import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const bidderProfilesTable = pgTable("bidder_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  bio: text("bio"),
  phone: text("phone"),
  address: text("address"),
  birthDate: text("birth_date"),
  photoObjectPath: text("photo_object_path"),
  resumeObjectPath: text("resume_object_path"),
  resumeFileName: text("resume_file_name"),
  skills: text("skills"),
  experience: text("experience"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertBidderProfileSchema = createInsertSchema(bidderProfilesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBidderProfile = z.infer<typeof insertBidderProfileSchema>;
export type BidderProfile = typeof bidderProfilesTable.$inferSelect;
