import type { NextFunction, Request, Response } from "express";
import { supabaseClient } from "../../config/supabase.js";

function extractBearerToken(req: Request): string | null {
  const raw = req.headers.authorization;
  if (typeof raw !== "string") return null;

  const parts = raw.trim().split(/\s+/);
  if (parts.length !== 2) return null;

  const [scheme, token] = parts as [string, string];
  if (!/^Bearer$/i.test(scheme) || !token) return null;
  return token;
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { data, error } = await supabaseClient.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    req.user = data.user;
    req.token = token;
    next();
  } catch (error) {
    console.error("Authentication middleware error:", error);
    return res.status(500).json({ error: "Authentication failed" });
  }
}
