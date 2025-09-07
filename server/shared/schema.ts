import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, index, foreignKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name").notNull(),
  avatar: text("avatar").default("https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"),
  bio: text("bio"),
  isVerified: boolean("is_verified").default(false),
  isPrivate: boolean("is_private").default(false),
  followerCount: integer("follower_count").default(0),
  followingCount: integer("following_count").default(0),
  tweetCount: integer("tweet_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => ({
  usernameIdx: index("users_username_idx").on(table.username),
  emailIdx: index("users_email_idx").on(table.email),
  createdAtIdx: index("users_created_at_idx").on(table.createdAt),
}));

export const tweets = pgTable("tweets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  content: text("content").notNull(),
  authorId: varchar("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  parentTweetId: varchar("parent_tweet_id"),
  isRetweet: boolean("is_retweet").default(false),
  originalTweetId: varchar("original_tweet_id"),
  mediaUrls: text("media_urls").array(),
  hashtags: text("hashtags").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => ({
  authorIdx: index("tweets_author_id_idx").on(table.authorId),
  createdAtIdx: index("tweets_created_at_idx").on(table.createdAt),
  parentTweetIdx: index("tweets_parent_tweet_id_idx").on(table.parentTweetId),
  hashtagsIdx: index("tweets_hashtags_idx").on(table.hashtags),
}));

export const mentions = pgTable("mentions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tweetId: varchar("tweet_id").notNull().references(() => tweets.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  tweetUserIdx: index("mentions_tweet_user_idx").on(table.tweetId, table.userId),
  userIdx: index("mentions_user_id_idx").on(table.userId),
}));

// New tables for scalability
export const follows = pgTable("follows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  followerId: varchar("follower_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  followingId: varchar("following_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  followerIdx: index("follows_follower_id_idx").on(table.followerId),
  followingIdx: index("follows_following_id_idx").on(table.followingId),
  uniqueFollow: index("follows_unique_idx").on(table.followerId, table.followingId),
}));

export const tweetEngagements = pgTable("tweet_engagements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tweetId: varchar("tweet_id").notNull().references(() => tweets.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'like', 'retweet', 'bookmark'
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  tweetUserTypeIdx: index("engagements_tweet_user_type_idx").on(table.tweetId, table.userId, table.type),
  userIdx: index("engagements_user_id_idx").on(table.userId),
  typeIdx: index("engagements_type_idx").on(table.type),
}));

export const tweetStats = pgTable("tweet_stats", {
  tweetId: varchar("tweet_id").primaryKey().references(() => tweets.id, { onDelete: "cascade" }),
  replyCount: integer("reply_count").default(0),
  retweetCount: integer("retweet_count").default(0),
  likeCount: integer("like_count").default(0),
  bookmarkCount: integer("bookmark_count").default(0),
  impressionCount: integer("impression_count").default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations for better querying
export const usersRelations = relations(users, ({ many }) => ({
  tweets: many(tweets),
  mentions: many(mentions),
  followers: many(follows, { relationName: "userFollowers" }),
  following: many(follows, { relationName: "userFollowing" }),
  engagements: many(tweetEngagements),
}));

export const tweetsRelations = relations(tweets, ({ one, many }) => ({
  author: one(users, {
    fields: [tweets.authorId],
    references: [users.id],
  }),
  mentions: many(mentions),
  engagements: many(tweetEngagements),
  stats: one(tweetStats, {
    fields: [tweets.id],
    references: [tweetStats.tweetId],
  }),
  replies: many(tweets, { relationName: "tweetReplies" }),
  parent: one(tweets, {
    fields: [tweets.parentTweetId],
    references: [tweets.id],
    relationName: "tweetReplies",
  }),
}));

export const mentionsRelations = relations(mentions, ({ one }) => ({
  tweet: one(tweets, {
    fields: [mentions.tweetId],
    references: [tweets.id],
  }),
  user: one(users, {
    fields: [mentions.userId],
    references: [users.id],
  }),
}));

export const followsRelations = relations(follows, ({ one }) => ({
  follower: one(users, {
    fields: [follows.followerId],
    references: [users.id],
    relationName: "userFollowers",
  }),
  following: one(users, {
    fields: [follows.followingId],
    references: [users.id],
    relationName: "userFollowing",
  }),
}));

export const tweetEngagementsRelations = relations(tweetEngagements, ({ one }) => ({
  tweet: one(tweets, {
    fields: [tweetEngagements.tweetId],
    references: [tweets.id],
  }),
  user: one(users, {
    fields: [tweetEngagements.userId],
    references: [users.id],
  }),
}));

export const tweetStatsRelations = relations(tweetStats, ({ one }) => ({
  tweet: one(tweets, {
    fields: [tweetStats.tweetId],
    references: [tweets.id],
  }),
}));

// Schemas for validation
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
  displayName: true,
});

export const loginSchema = z.object({
  emailOrUsername: z.string().min(1, "Email or username is required"),
  password: z.string().min(1, "Password is required"),
});

export const insertTweetSchema = createInsertSchema(tweets).pick({
  content: true,
}).extend({
  content: z.string().min(1, "Tweet content is required").max(280, "Tweet must be 280 characters or less"),
});

export const insertFollowSchema = createInsertSchema(follows).pick({
  followingId: true,
});

export const insertEngagementSchema = createInsertSchema(tweetEngagements).pick({
  tweetId: true,
  type: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;
export type InsertTweet = z.infer<typeof insertTweetSchema>;
export type InsertFollow = z.infer<typeof insertFollowSchema>;
export type InsertEngagement = z.infer<typeof insertEngagementSchema>;

export type User = typeof users.$inferSelect;
export type Tweet = typeof tweets.$inferSelect;
export type Mention = typeof mentions.$inferSelect;
export type Follow = typeof follows.$inferSelect;
export type TweetEngagement = typeof tweetEngagements.$inferSelect;
export type TweetStats = typeof tweetStats.$inferSelect;

// Enhanced interfaces for API responses
export interface TweetWithAuthor extends Tweet {
  author: User;
  mentions: string[];
  stats?: TweetStats;
}

export interface UserProfile extends User {
  isFollowing?: boolean;
  isFollowedBy?: boolean;
}

export interface EngagementCounts {
  likes: number;
  retweets: number;
  replies: number;
  bookmarks: number;
}
