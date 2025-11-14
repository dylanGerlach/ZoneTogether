    import type { Request, Response, NextFunction } from "express";
    import { supabaseClient } from "../../config/supabase.js";

    function extractBearerToken(req: Request): string | null {
        const raw = req.headers['authorization'] ?? (req.headers as any)['Authorization'];
        if (typeof raw !== 'string') return null;
        const parts = raw.split(' ');
        if (parts.length !== 2) return null;
        const [scheme, token] = parts as [string, string];
        if (!/^Bearer$/i.test(scheme) || !token) return null;
        return token;
    }

    export async function requireAuth(req: Request, res: Response, next: NextFunction) {
        const token = extractBearerToken(req);
        if (!token) {
            return res.status(401).json({ message: "Unauthorized" });
        } 

        const {data, error } = await supabaseClient.auth.getUser(token);
        if (error || !data?.user) {
            return res.status(401).json({ message: "Invalid or expired token" });
        }
        
        (req as Request & { user?: typeof data.user }).user = data.user;
        (req as Request & { token?: typeof token }).token = token;
        next();
    }
