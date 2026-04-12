import { pgTable, text, serial, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const employmentTypeEnum = pgEnum("employment_type", ["ONSITE", "HYBRID", "REMOTE"]);
export const jobStatusEnum = pgEnum("job_status", ["NEW", "APPLIED", "SCHEDULED", "INTERVIEWING", "OFFERED", "REJECTED", "WITHDRAWN"]);
export const evaluationStatusEnum = pgEnum("evaluation_status", ["PENDING", "PERFECT", "GOOD", "AVERAGE", "BAD"]);

export const jobsTable = pgTable("jobs", {
  id: serial("id").primaryKey(),
  date: timestamp("date", { withTimezone: true }).notNull(),
  companyName: text("company_name").notNull(),
  jobTitle: text("job_title").notNull(),
  detailLink: text("detail_link"),
  requiredSkills: text("required_skills"),
  employmentType: employmentTypeEnum("employment_type").notNull().default("REMOTE"),
  status: jobStatusEnum("status").notNull().default("NEW"),
  evaluationStatus: evaluationStatusEnum("evaluation_status").notNull().default("PENDING"),
  evaluationComments: text("evaluation_comments"),
  createdById: integer("created_by_id").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});
