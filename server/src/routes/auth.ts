import { Router } from "express";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { db } from "../db.js";
import { signToken, requireAuth, requireOwner } from "../auth.js";
import type { Role } from "../permissions.js";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  employeeId: string | null;
  passwordHash: string;
}

function toPublicUser(row: UserRow) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    employeeId: row.employeeId ?? undefined,
  };
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

  const user = toPublicUser(row);
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

// ---------- Owner-only user/login management ----------

authRouter.get("/users", requireAuth, requireOwner, (_req, res) => {
  const rows = db.prepare("SELECT * FROM users").all() as unknown as UserRow[];
  res.json(rows.map(toPublicUser));
});

authRouter.post("/users", requireAuth, requireOwner, (req, res) => {
  const { name, email, password, employeeId } = req.body ?? {};
  if (typeof name !== "string" || !name.trim() || typeof email !== "string" || !email.trim() || typeof password !== "string" || password.length < 4) {
    res.status(400).json({ error: "Name, email and a password (min 4 characters) are required." });
    return;
  }

  const existing = db.prepare("SELECT id FROM users WHERE lower(email) = lower(?)").get(email.trim());
  if (existing) {
    res.status(409).json({ error: "A login with this email already exists." });
    return;
  }

  const id = randomUUID();
  db.prepare(
    "INSERT INTO users (id, name, email, role, employeeId, passwordHash) VALUES (?, ?, ?, 'EMPLOYEE', ?, ?)"
  ).run(id, name.trim(), email.trim(), typeof employeeId === "string" ? employeeId : null, bcrypt.hashSync(password, 10));

  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as unknown as UserRow;
  res.status(201).json(toPublicUser(row));
});

authRouter.patch("/users/:id/password", requireAuth, requireOwner, (req, res) => {
  const { password } = req.body ?? {};
  if (typeof password !== "string" || password.length < 4) {
    res.status(400).json({ error: "Password must be at least 4 characters." });
    return;
  }
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id) as UserRow | undefined;
  if (!row) {
    res.status(404).json({ error: "User not found." });
    return;
  }
  db.prepare("UPDATE users SET passwordHash = ? WHERE id = ?").run(bcrypt.hashSync(password, 10), row.id);
  res.json({ ok: true });
});

authRouter.delete("/users/:id", requireAuth, requireOwner, (req, res) => {
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id) as UserRow | undefined;
  if (!row) {
    res.status(404).json({ error: "User not found." });
    return;
  }
  if (row.role === "OWNER") {
    res.status(400).json({ error: "The owner account cannot be revoked." });
    return;
  }
  db.prepare("DELETE FROM users WHERE id = ?").run(row.id);
  res.status(204).end();
});
