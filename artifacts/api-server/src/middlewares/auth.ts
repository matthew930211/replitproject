import { getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const auth = getAuth(req);
  const clerkId = auth?.userId;
  if (!clerkId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (!user) {
    res.status(401).json({ error: "User not found in system" });
    return;
  }
  if (!user.isActive) {
    res.status(403).json({ error: "Account deactivated" });
    return;
  }
  req.appUser = user;
  next();
};

export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.appUser;
    if (!user || !roles.includes(user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
};
