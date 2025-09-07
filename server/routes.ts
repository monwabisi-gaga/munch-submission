import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, loginSchema, insertTweetSchema } from "@shared/schema";
import { hashPassword, comparePassword, generateToken, authenticateToken, type AuthenticatedRequest } from "./middleware/auth";

export async function registerRoutes(app: Express): Promise<Server> {
    app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already registered" });
      }
      
      const existingUsername = await storage.getUserByUsername(userData.username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already taken" });
      }
      
      // Hash password and create user
      const hashedPassword = await hashPassword(userData.password);
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });
      
      const token = generateToken(user.id);
      
      res.status(201).json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          avatar: user.avatar,
        },
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { emailOrUsername, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmailOrUsername(emailOrUsername);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      const isValidPassword = await comparePassword(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      const token = generateToken(user.id);
      
      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          avatar: user.avatar,
        },
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Login failed" });
    }
  });

  app.get("/api/auth/me", authenticateToken, async (req: AuthenticatedRequest, res) => {
    const user = await storage.getUser(req.user!.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      avatar: user.avatar,
    });
  });

  // Tweet routes
  app.post("/api/tweets", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const tweetData = insertTweetSchema.parse(req.body);
      
      const tweet = await storage.createTweet({
        ...tweetData,
        authorId: req.user!.id,
      });
      
      // Extract and create mentions
      const mentionRegex = /@(\w+)/g;
      let match;
      while ((match = mentionRegex.exec(tweetData.content)) !== null) {
        const mentionedUser = await storage.getUserByUsername(match[1]);
        if (mentionedUser) {
          await storage.createMention(tweet.id, mentionedUser.id);
        }
      }
      
      const author = await storage.getUser(tweet.authorId);
      res.status(201).json({
        ...tweet,
        author,
        mentions: await extractMentionsFromContent(tweetData.content),
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to create tweet" });
    }
  });

  app.get("/api/tweets", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const tweets = await storage.getAllTweets();
      res.json(tweets);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch tweets" });
    }
  });

  app.get("/api/tweets/timeline", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const timeline = await storage.getUserTimeline(req.user!.id);
      res.json(timeline);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch timeline" });
    }
  });

  app.get("/api/tweets/user/:userId", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { userId } = req.params;
      const tweets = await storage.getUserTweets(userId);
      res.json(tweets);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch user tweets" });
    }
  });

  app.get("/api/mentions", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const mentions = await storage.getUserMentions(req.user!.id);
      res.json(mentions);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch mentions" });
    }
  });

  // Update tweet endpoint
  app.put("/api/tweets/:tweetId", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { tweetId } = req.params;
      const tweetData = insertTweetSchema.parse(req.body);
      
      const existingTweet = await storage.getTweetById(tweetId);
      if (!existingTweet) {
        return res.status(404).json({ message: "Tweet not found" });
      }
      
      if (existingTweet.authorId !== req.user!.id) {
        return res.status(403).json({ message: "You can only edit your own tweets" });
      }
      
      const updatedTweet = await storage.updateTweet(tweetId, tweetData);
      
      // Update mentions
      const mentionRegex = /@(\w+)/g;
      let match;
      while ((match = mentionRegex.exec(tweetData.content)) !== null) {
        const mentionedUser = await storage.getUserByUsername(match[1]);
        if (mentionedUser) {
          await storage.createMention(tweetId, mentionedUser.id);
        }
      }
      
      const author = await storage.getUser(updatedTweet.authorId);
      res.json({
        ...updatedTweet,
        author,
        mentions: await extractMentionsFromContent(tweetData.content),
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to update tweet" });
    }
  });

  // Delete tweet endpoint
  app.delete("/api/tweets/:tweetId", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { tweetId } = req.params;
      
      const existingTweet = await storage.getTweetById(tweetId);
      if (!existingTweet) {
        return res.status(404).json({ message: "Tweet not found" });
      }
      
      if (existingTweet.authorId !== req.user!.id) {
        return res.status(403).json({ message: "You can only delete your own tweets" });
      }
      
      await storage.deleteTweet(tweetId);
      res.json({ message: "Tweet deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to delete tweet" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

async function extractMentionsFromContent(content: string): Promise<string[]> {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;
  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1]);
  }
  return mentions;
}