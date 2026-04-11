import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const objectUploadsTable = pgTable("object_uploads", {
  id: serial("id").primaryKey(),
  objectPath: text("object_path").notNull().unique(),
  uploaderId: integer("uploader_id").notNull().references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
