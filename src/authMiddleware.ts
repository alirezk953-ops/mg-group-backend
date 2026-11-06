import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "erp_super_secret_jwt_key_2026";

export interface AuthUser {
  id: number;
  username: string;
  name: string;
  role: "ADMIN" | "SUPPORT" | "EMPLOYEE" | "DELIVERY";
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: "7d" });
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "غير مصرح لك، يرجى تسجيل الدخول أولاً" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "انتهت صلاحية الجلسة، يرجى إعادة تسجيل الدخول" });
  }
}

export function requireRole(allowedRoles: ("ADMIN" | "SUPPORT" | "EMPLOYEE" | "DELIVERY")[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "عذراً، لا تملك الصلاحية الكافية للقيام بهذا الإجراء" });
    }
    next();
  };
}
