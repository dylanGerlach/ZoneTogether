import type { Request, Response } from "express";
import type {
  ApiErrorResponse,
  AuthTestResponse,
} from "../../contracts/backend-api.types.js";

function test(
  req: Request,
  res: Response<AuthTestResponse | ApiErrorResponse>,
) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  res.status(200).json({ Success: "Path Worked" });
}

export { test };
