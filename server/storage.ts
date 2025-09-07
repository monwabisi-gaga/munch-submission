import { 
  type User, 
  type InsertUser, 
  type Tweet, 
  type InsertTweet, 
  type TweetWithAuthor, 
  type Mention,
  type Follow,
  type TweetEngagement,
  type TweetStats,
  type UserProfile,
  type InsertFollow,
  type InsertEngagement
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByEmailOrUsername(emailOrUsername: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUserProfile(userId: string, viewerId?: string): Promise<UserProfile | undefined>;
  
  // Tweet methods
  createTweet(tweet: InsertTweet & { authorId: string }): Promise<Tweet>;
  getTweetById(id: string): Promise<Tweet | undefined>;
  updateTweet(id: string, tweet: InsertTweet): Promise<Tweet>;
  deleteTweet(id: string): Promise<void>;
  getAllTweets(): Promise<TweetWithAuthor[]>;
  getUserTweets(userId: string): Promise<TweetWithAuthor[]>;
  getUserTimeline(userId: string): Promise<TweetWithAuthor[]>;
  
  // Mention methods
  createMention(tweetId: string, userId: string): Promise<Mention>;
  getTweetMentions(tweetId: string): Promise<User[]>;
  getUserMentions(userId: string): Promise<TweetWithAuthor[]>;
  
  // Social features (future-ready)
  followUser(followerId: string, followingId: string): Promise<Follow>;
  unfollowUser(followerId: string, followingId: string): Promise<void>;
  getUserFollowers(userId: string): Promise<UserProfile[]>;
  getUserFollowing(userId: string): Promise<UserProfile[]>;
  isFollowing(followerId: string, followingId: string): Promise<boolean>;
  
  // Engagement features (future-ready)
  engageWithTweet(userId: string, tweetId: string, type: 'like' | 'retweet' | 'bookmark'): Promise<TweetEngagement>;
  removeEngagement(userId: string, tweetId: string, type: 'like' | 'retweet' | 'bookmark'): Promise<void>;
  getTweetStats(tweetId: string): Promise<TweetStats | undefined>;
  getUserEngagement(userId: string, tweetId: string): Promise<TweetEngagement[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private tweets: Map<string, Tweet>;
  private mentions: Map<string, Mention>;
  private follows: Map<string, Follow>;
  private engagements: Map<string, TweetEngagement>;
  private tweetStats: Map<string, TweetStats>;

  constructor() {
    this.users = new Map();
    this.tweets = new Map();
    this.mentions = new Map();
    this.follows = new Map();
    this.engagements = new Map();
    this.tweetStats = new Map();
  }

  reset() {
    this.users.clear();
    this.tweets.clear();
    this.mentions.clear();
    this.follows.clear();
    this.engagements.clear();
    this.tweetStats.clear();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async getUserByEmailOrUsername(emailOrUsername: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === emailOrUsername || user.username === emailOrUsername,
    );
  }

  async createUser(insertUser: InsertUser & { passwordConfirmation?: string }): Promise<User> {
    const id = randomUUID();
    // Remove passwordConfirmation from user data since it's not part of the User schema
    const { passwordConfirmation, ...userData } = insertUser;
    const user: User = { 
      ...userData, 
      id,
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100",
      bio: null,
      isVerified: false,
      isPrivate: false,
      followerCount: 0,
      followingCount: 0,
      tweetCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null
    };
    this.users.set(id, user);
    return user;
  }

  async createTweet(tweetData: InsertTweet & { authorId: string }): Promise<Tweet> {
    const id = randomUUID();
    const tweet: Tweet = {
      id,
      content: tweetData.content,
      authorId: tweetData.authorId,
      parentTweetId: null,
      isRetweet: false,
      originalTweetId: null,
      mediaUrls: null,
      hashtags: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null
    };
    this.tweets.set(id, tweet);
    return tweet;
  }

  async getTweetById(id: string): Promise<Tweet | undefined> {
    return this.tweets.get(id);
  }

  async updateTweet(id: string, tweetData: InsertTweet): Promise<Tweet> {
    const existingTweet = this.tweets.get(id);
    if (!existingTweet) {
      throw new Error("Tweet not found");
    }

    const updatedTweet: Tweet = {
      ...existingTweet,
      content: tweetData.content,
    };
    
    this.tweets.set(id, updatedTweet);
    return updatedTweet;
  }

  async deleteTweet(id: string): Promise<void> {
    const deleted = this.tweets.delete(id);
    if (!deleted) {
      throw new Error("Tweet not found");
    }
    
    // Also delete related mentions
    const mentionsToDelete = Array.from(this.mentions.values()).filter(
      mention => mention.tweetId === id
    );
    mentionsToDelete.forEach(mention => this.mentions.delete(mention.id));
  }

  async getAllTweets(): Promise<TweetWithAuthor[]> {
    const tweets = Array.from(this.tweets.values());
    const tweetsWithAuthors: TweetWithAuthor[] = [];
    
    for (const tweet of tweets) {
      const author = await this.getUser(tweet.authorId);
      if (author) {
        const mentions = await this.extractMentionsFromContent(tweet.content);
        tweetsWithAuthors.push({
          ...tweet,
          author,
          mentions,
        });
      }
    }
    
    return tweetsWithAuthors.sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  async getUserTweets(userId: string): Promise<TweetWithAuthor[]> {
    const allTweets = await this.getAllTweets();
    return allTweets.filter(tweet => tweet.authorId === userId);
  }

  async getUserTimeline(userId: string): Promise<TweetWithAuthor[]> {
    const allTweets = await this.getAllTweets();
    const userTweets = allTweets.filter(tweet => tweet.authorId === userId);
    const mentionTweets = allTweets.filter(tweet => 
      tweet.mentions.some(mention => {
        const mentionedUser = Array.from(this.users.values()).find(u => u.username === mention);
        return mentionedUser?.id === userId;
      })
    );
    
    const timeline = [...userTweets, ...mentionTweets];
    const uniqueTweets = timeline.filter((tweet, index, self) => 
      index === self.findIndex(t => t.id === tweet.id)
    );
    
    return uniqueTweets.sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  async createMention(tweetId: string, userId: string): Promise<Mention> {
    const id = randomUUID();
    const mention: Mention = {
      id,
      tweetId,
      userId,
      createdAt: new Date(),
    };
    this.mentions.set(id, mention);
    return mention;
  }

  async getTweetMentions(tweetId: string): Promise<User[]> {
    const tweetMentions = Array.from(this.mentions.values()).filter(
      mention => mention.tweetId === tweetId
    );
    const users: User[] = [];
    for (const mention of tweetMentions) {
      const user = await this.getUser(mention.userId);
      if (user) users.push(user);
    }
    return users;
  }

  async getUserMentions(userId: string): Promise<TweetWithAuthor[]> {
    const userMentions = Array.from(this.mentions.values()).filter(
      mention => mention.userId === userId
    );
    const tweets: TweetWithAuthor[] = [];
    for (const mention of userMentions) {
      const tweet = await this.getTweetById(mention.tweetId);
      if (tweet) {
        const author = await this.getUser(tweet.authorId);
        if (author) {
          const mentions = await this.extractMentionsFromContent(tweet.content);
          tweets.push({
            ...tweet,
            author,
            mentions,
          });
        }
      }
    }
    return tweets.sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  private async extractMentionsFromContent(content: string): Promise<string[]> {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[1]);
    }
    return mentions;
  }

  // New methods for enhanced functionality
  async getUserProfile(userId: string, viewerId?: string): Promise<UserProfile | undefined> {
    const user = await this.getUser(userId);
    if (!user) return undefined;

    const profile: UserProfile = { ...user };
    
    if (viewerId && viewerId !== userId) {
      profile.isFollowing = await this.isFollowing(viewerId, userId);
      profile.isFollowedBy = await this.isFollowing(userId, viewerId);
    }
    
    return profile;
  }

  async followUser(followerId: string, followingId: string): Promise<Follow> {
    if (followerId === followingId) {
      throw new Error("Cannot follow yourself");
    }

    const existingFollow = Array.from(this.follows.values()).find(
      f => f.followerId === followerId && f.followingId === followingId
    );
    
    if (existingFollow) {
      throw new Error("Already following this user");
    }

    const id = randomUUID();
    const follow: Follow = {
      id,
      followerId,
      followingId,
      createdAt: new Date(),
    };
    
    this.follows.set(id, follow);
    
    // Update follower/following counts
    const follower = this.users.get(followerId);
    const following = this.users.get(followingId);
    
    if (follower) {
      this.users.set(followerId, { 
        ...follower, 
        followingCount: (follower.followingCount || 0) + 1 
      });
    }
    
    if (following) {
      this.users.set(followingId, { 
        ...following, 
        followerCount: (following.followerCount || 0) + 1 
      });
    }
    
    return follow;
  }

  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    const follow = Array.from(this.follows.values()).find(
      f => f.followerId === followerId && f.followingId === followingId
    );
    
    if (!follow) {
      throw new Error("Not following this user");
    }
    
    this.follows.delete(follow.id);
    
    // Update follower/following counts
    const follower = this.users.get(followerId);
    const following = this.users.get(followingId);
    
    if (follower) {
      this.users.set(followerId, { 
        ...follower, 
        followingCount: Math.max(0, (follower.followingCount || 0) - 1) 
      });
    }
    
    if (following) {
      this.users.set(followingId, { 
        ...following, 
        followerCount: Math.max(0, (following.followerCount || 0) - 1) 
      });
    }
  }

  async getUserFollowers(userId: string): Promise<UserProfile[]> {
    const userFollows = Array.from(this.follows.values()).filter(
      f => f.followingId === userId
    );
    
    const followers: UserProfile[] = [];
    for (const follow of userFollows) {
      const follower = await this.getUserProfile(follow.followerId);
      if (follower) followers.push(follower);
    }
    
    return followers;
  }

  async getUserFollowing(userId: string): Promise<UserProfile[]> {
    const userFollows = Array.from(this.follows.values()).filter(
      f => f.followerId === userId
    );
    
    const following: UserProfile[] = [];
    for (const follow of userFollows) {
      const user = await this.getUserProfile(follow.followingId);
      if (user) following.push(user);
    }
    
    return following;
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    return Array.from(this.follows.values()).some(
      f => f.followerId === followerId && f.followingId === followingId
    );
  }

  async engageWithTweet(userId: string, tweetId: string, type: 'like' | 'retweet' | 'bookmark'): Promise<TweetEngagement> {
    const existingEngagement = Array.from(this.engagements.values()).find(
      e => e.userId === userId && e.tweetId === tweetId && e.type === type
    );
    
    if (existingEngagement) {
      throw new Error(`Already ${type}d this tweet`);
    }

    const id = randomUUID();
    const engagement: TweetEngagement = {
      id,
      tweetId,
      userId,
      type,
      createdAt: new Date(),
    };
    
    this.engagements.set(id, engagement);
    await this.updateTweetStatsForEngagement(tweetId, type, 1);
    
    return engagement;
  }

  async removeEngagement(userId: string, tweetId: string, type: 'like' | 'retweet' | 'bookmark'): Promise<void> {
    const engagement = Array.from(this.engagements.values()).find(
      e => e.userId === userId && e.tweetId === tweetId && e.type === type
    );
    
    if (!engagement) {
      throw new Error(`No ${type} found for this tweet`);
    }
    
    this.engagements.delete(engagement.id);
    await this.updateTweetStatsForEngagement(tweetId, type, -1);
  }

  async getTweetStats(tweetId: string): Promise<TweetStats | undefined> {
    return this.tweetStats.get(tweetId);
  }

  async getUserEngagement(userId: string, tweetId: string): Promise<TweetEngagement[]> {
    return Array.from(this.engagements.values()).filter(
      e => e.userId === userId && e.tweetId === tweetId
    );
  }

  private async updateTweetStatsForEngagement(tweetId: string, type: string, delta: number): Promise<void> {
    let stats = this.tweetStats.get(tweetId);
    
    if (!stats) {
      stats = {
        tweetId,
        replyCount: 0,
        retweetCount: 0,
        likeCount: 0,
        bookmarkCount: 0,
        impressionCount: 0,
        updatedAt: new Date(),
      };
    }
    
    switch (type) {
      case 'like':
        stats.likeCount = Math.max(0, (stats.likeCount || 0) + delta);
        break;
      case 'retweet':
        stats.retweetCount = Math.max(0, (stats.retweetCount || 0) + delta);
        break;
      case 'bookmark':
        stats.bookmarkCount = Math.max(0, (stats.bookmarkCount || 0) + delta);
        break;
    }
    
    stats.updatedAt = new Date();
    this.tweetStats.set(tweetId, stats);
  }
}

export const storage = new MemStorage();
