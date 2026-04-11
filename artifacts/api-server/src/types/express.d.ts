import type { InferSelectModel } from "drizzle-orm";
import type { usersTable } from "@workspace/db";

declare global {
  namespace Express {
    interface Request {
      appUser?: InferSelectModel<typeof usersTable>;
    }
  }
}
