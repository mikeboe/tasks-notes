import argon2 from "argon2";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import "dotenv/config";

export const hashPassword = async (password: string): Promise<string> => {
  return argon2.hash(password);
};

export const verifyPassword = async (
  hash: string,
  password: string
): Promise<boolean> => {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
};

export const generateAccessToken = (userId: string): string => {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    throw new Error("JWT_ACCESS_SECRET is not defined");
  }

  return jwt.sign({ userId, type: "access" }, secret, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  } as jwt.SignOptions);
};

export const generateRefreshToken = (): string => {
  return crypto.randomBytes(32).toString("hex");
};

export const hashRefreshToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

export const verifyAccessToken = (token: string): { userId: string } | null => {
  try {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
      return null;
    }

    const decoded = jwt.verify(token, secret) as {
      userId: string;
      type: string;
    };
    if (decoded.type !== "access") {
      return null;
    }
    return { userId: decoded.userId };
  } catch {
    return null;
  }
};

export const generateEmailVerificationToken = (): string => {
  return crypto.randomBytes(32).toString("hex");
};

export const generatePasswordResetToken = (): string => {
  return crypto.randomBytes(32).toString("hex");
};

export const generateApiKey = (): string => {
  return `ak_${crypto.randomBytes(32).toString("hex")}`;
};

export const hashApiKey = (apiKey: string): string => {
  return crypto.createHash("sha256").update(apiKey).digest("hex");
};
