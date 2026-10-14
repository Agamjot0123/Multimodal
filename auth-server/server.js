import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  JWT_SECRET,
  JWT_EXPIRES_IN = "7d",
  PORT = 4000,
  SERVER_URL = "http://localhost:4000",
  FRONTEND_URL = "http://localhost:3000",
} = process.env;

// Comma-separated, with stray spaces / trailing slashes tolerated: a browser Origin never has a trailing slash,
// so "https://app.vercel.app/" would silently fail the CORS match.
const FRONTEND_ORIGINS = FRONTEND_URL.split(",").map((u) => u.trim().replace(/\/+$/, "")).filter(Boolean);

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !JWT_SECRET) {
  console.error("Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / JWT_SECRET (see .env.example)");
  process.exit(1);
}

passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: `${SERVER_URL}/auth/google/callback`,
    },
    // Stateless: the Google profile subset we need goes straight into the token.
    (_accessToken, _refreshToken, profile, done) =>
      done(null, {
        id: profile.id,
        name: profile.displayName,
        email: profile.emails?.[0]?.value,
        picture: profile.photos?.[0]?.value,
      }),
  ),
);

const signToken = (u) => jwt.sign(u, JWT_SECRET, { algorithm: "HS256", expiresIn: JWT_EXPIRES_IN });

const app = express();
app.set("trust proxy", 1);
app.use(cors({ origin: FRONTEND_ORIGINS, allowedHeaders: ["Authorization", "Content-Type"] }));
app.use(passport.initialize());

app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"], session: false }));

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: `${FRONTEND_ORIGINS[0]}/login?error=1` }),
  (req, res) => {
    // The token travels in the URL fragment so it never reaches server logs or Referer headers.
    res.redirect(`${FRONTEND_ORIGINS[0]}/auth/callback#token=${encodeURIComponent(signToken(req.user))}`);
  },
);

app.get("/auth/me", (req, res) => {
  const token = (req.headers.authorization ?? "").replace(/^Bearer /i, "");
  try {
    const { id, name, email, picture } = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
    res.json({ id, name, email, picture });
  } catch {
    res.status(401).json({ error: "unauthenticated" });
  }
});

app.get("/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`Auth server on ${SERVER_URL}`));
