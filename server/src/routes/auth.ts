import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "../db.js";
import { signToken, requireAuth } from "../auth.js";
import type { Role } from "../permissions.js";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  employeeId: string | null;
  passwordHash: string;
}

export const authRouter = Router();

authRouter.post("/login", (req, res) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== "string" || typeof password !== "string") {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const row = db
    .prepare("SELECT * FROM users WHERE lower(email) = lower(?)")
    .get(email.trim()) as UserRow | undefined;

  if (!row || !bcrypt.compareSync(password, row.passwordHash)) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }

  const user = {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    employeeId: row.employeeId ?? undefined,
  };
  const token = signToken({ sub: user.id, name: user.name, email: user.email, role: user.role, employeeId: user.employeeId });
  res.json({ token, user });
});

authRouter.get("/me", requireAuth, (req, res) => {
  const payload = req.user!;
  res.json({
    id: payload.sub,
    name: payload.name,
    email: payload.email,
    role: payload.role,
    employeeId: payload.employeeId,
  });
});
