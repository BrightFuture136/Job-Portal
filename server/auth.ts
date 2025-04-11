import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import rateLimit from "express-rate-limit";
import csrf from "csurf";
import cookieParser from "cookie-parser";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

// Password hashing
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer; // Fixed: 3 arguments
  return `${buf.toString("hex")}.${salt}`;
}

// Password comparison
async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer; // Fixed: 3 arguments
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Rate limiter for login/register endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per IP
  message: "Too many authentication attempts, please try again later.",
});

// CSRF protection middleware
const csrfProtection = csrf({ cookie: true });

// Middleware to check if user is authenticated
const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ message: "Unauthorized: Please log in" });
};

// Role-based access control middleware
const restrictTo = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized: Please log in" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
    }
    next();
  };
};

export function setupAuth(app: Express) {
  app.use(cookieParser());
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "default-secret-please-change",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: "lax",
    },
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      { usernameField: "email", passReqToCallback: true },
      async (req, email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user || !(await comparePasswords(password, user.password))) {
            return done(null, false, { message: "Invalid email or password" });
          }
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user || null);
    } catch (err) {
      done(err);
    }
  });

  app.post(
    "/api/register",
    authLimiter,
    csrfProtection,
    async (req: Request, res: Response, next: NextFunction) => {
      const { email, password, role, username } = req.body;
      if (!email || !password || !role || !username) {
        return res.status(400).json({ message: "All fields are required" });
      }
      if (!["seeker", "employer", "admin"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      try {
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser) {
          return res.status(400).json({ message: "Email already exists" });
        }
        const user = await storage.createUser({
          email,
          password: await hashPassword(password),
          role,
          username,
          createdAt: new Date(),
        });
        req.login(user, (err) => {
          if (err) return next(err);
          res.status(201).json({
            id: user.id,
            email: user.email,
            role: user.role,
            username: user.username,
          });
        });
      } catch (err) {
        next(err);
      }
    }
  );

  app.post(
    "/api/login",
    authLimiter,
    csrfProtection,
    passport.authenticate("local", { failureMessage: true }),
    (req: Request, res: Response) => {
      res.status(200).json({
        id: req.user!.id,
        email: req.user!.email,
        role: req.user!.role,
        username: req.user!.username,
      });
    }
  );

  app.post("/api/logout", isAuthenticated, (req: Request, res: Response, next: NextFunction) => {
    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy(() => {
        res.clearCookie("connect.sid");
        res.status(200).json({ message: "Logged out successfully" });
      });
    });
  });

  app.get("/api/user", isAuthenticated, (req: Request, res: Response) => {
    res.json({
      id: req.user!.id,
      email: req.user!.email,
      role: req.user!.role,
      username: req.user!.username,
    });
  });

  app.get("/api/csrf-token", csrfProtection, (req: Request, res: Response) => {
    res.json({ csrfToken: req.csrfToken() });
  });
}

export { isAuthenticated, restrictTo };