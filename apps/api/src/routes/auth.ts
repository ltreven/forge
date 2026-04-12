import { Router, type Request, type Response, type NextFunction } from "express";
import bcrypt from "bcryptjs";
import { db } from "../db/client";
import { users, workspaces, agents } from "../db/schema";
import { signupSchema, loginSchema } from "../schemas/auth.schema";
import { signToken } from "../lib/jwt";
import { authMiddleware } from "../middleware/authMiddleware";
import { success, failure } from "../lib/response";

export const authRouter = Router();

// ── POST /auth/signup ─────────────────────────────────────────────────────────

authRouter.post("/signup", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = signupSchema.parse(req.body);

    // Check for duplicate email.
    const existing = await db.select().from(users).where(
      // Drizzle eq helper
      (await import("drizzle-orm")).eq(users.email, input.email)
    );
    if (existing.length > 0) {
      res.status(409).json(failure("A user with this email already exists"));
      return;
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    const result = await db.transaction(async (tx) => {
      // Create user.
      const [user] = await tx
        .insert(users)
        .values({ name: input.name, email: input.email, passwordHash })
        .returning();

      // Create workspace.
      await tx.insert(workspaces).values({
        userId: user.id,
        name: input.workspaceName,
        waysOfWorking: input.waysOfWorking,
      });

      // Create any agents passed during signup (optional).
      if (input.agents && input.agents.length > 0) {
        // Agents belong to a team — we don't create a team here, only at /setup.
        // Store agents are created at team-setup time. Nothing to persist yet.
      }

      return user;
    });

    const token = signToken({ userId: result.id, email: result.email });

    res.status(201).json(
      success({
        token,
        user: { id: result.id, name: result.name, email: result.email },
      })
    );
  } catch (err) {
    next(err);
  }
});

// ── POST /auth/login ─────────────────────────────────────────────────────────

authRouter.post("/login", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = loginSchema.parse(req.body);

    const { eq } = await import("drizzle-orm");
    const [user] = await db.select().from(users).where(eq(users.email, input.email));

    if (!user) {
      res.status(401).json(failure("Invalid email or password"));
      return;
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      res.status(401).json(failure("Invalid email or password"));
      return;
    }

    const token = signToken({ userId: user.id, email: user.email });

    res.json(
      success({
        token,
        user: { id: user.id, name: user.name, email: user.email },
      })
    );
  } catch (err) {
    next(err);
  }
});

// ── GET /auth/me ─────────────────────────────────────────────────────────────

authRouter.get("/me", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eq } = await import("drizzle-orm");
    const [user] = await db
      .select({ id: users.id, name: users.name, email: users.email, createdAt: users.createdAt })
      .from(users)
      .where(eq(users.id, req.user!.userId));

    if (!user) {
      res.status(404).json(failure("User not found"));
      return;
    }

    res.json(success(user));
  } catch (err) {
    next(err);
  }
});
