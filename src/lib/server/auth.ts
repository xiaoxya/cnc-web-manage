import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { User } from "@prisma/client";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";
const JWT_EXPIRES_IN = "24h";

export interface JwtPayload {
  userId: number;
  username: string;
  role: string;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(user: Pick<User, "id" | "username" | "role">): string {
  return jwt.sign(
    { userId: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export function getTokenFromCookies(cookieString: string | null): string | null {
  if (!cookieString) return null;
  const cookies = cookieString.split(";").map((c) => c.trim());
  for (const cookie of cookies) {
    const [name, value] = cookie.split("=");
    if (name === "token") return value;
  }
  return null;
}
