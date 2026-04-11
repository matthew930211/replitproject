import { pgTable, text, serial, timestamp, integer, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const bidderProfilesTable = pgTable("bidder_profiles", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  linkedin: text("linkedin"),
  github: text("github"),
  phone: text("phone"),
  address: text("address"),
  birthDate: text("birth_date"),
  photoObjectPath: text("photo_object_path"),
  bio: text("bio"),
  skills: text("skills"),
  experience: text("experience"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const profileResumesTable = pgTable("profile_resumes", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull().references(() => bidderProfilesTable.id, { onDelete: "cascade" }),
  label: text("label"),
  resumeObjectPath: text("resume_object_path").notNull(),
  resumeFileName: text("resume_file_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const profileAccessTable = pgTable("profile_access", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").notNull().references(() => bidderProfilesTable.id, { onDelete: "cascade" }),
  bidderId: integer("bidder_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique().on(t.profileId, t.bidderId),
]);

export const insertBidderProfileSchema = createInsertSchema(bidderProfilesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBidderProfile = z.infer<typeof insertBidderProfileSchema>;
export type BidderProfile = typeof bidderProfilesTable.$inferSelect;

export const insertProfileResumeSchema = createInsertSchema(profileResumesTable).omit({ id: true, createdAt: true });
export type InsertProfileResume = z.infer<typeof insertProfileResumeSchema>;
export type ProfileResume = typeof profileResumesTable.$inferSelect;

export const insertProfileAccessSchema = createInsertSchema(profileAccessTable).omit({ id: true, createdAt: true });
export type InsertProfileAccess = z.infer<typeof insertProfileAccessSchema>;
export type ProfileAccess = typeof profileAccessTable.$inferSelect;
