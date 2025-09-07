import { MemStorage } from '../server/storage';
import { InsertUser, InsertTweet } from '../shared/schema';

describe('MemStorage', () => {
  let storage: MemStorage;

  beforeEach(() => {
    storage = new MemStorage();
  });

  describe('User operations', () => {
    const userData: InsertUser = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'hashedpassword',
      displayName: 'Test User',
      passwordConfirmation: 'hashedpassword'
    };

    it('should create a user', async () => {
      const user = await storage.createUser(userData);
      
      expect(user).toMatchObject(userData);
      expect(user.id).toBeDefined();
      expect(user.avatar).toBeDefined();
      expect(user.createdAt).toBeInstanceOf(Date);
    });

    it('should get user by id', async () => {
      const createdUser = await storage.createUser(userData);
      const retrievedUser = await storage.getUser(createdUser.id);
      
      expect(retrievedUser).toEqual(createdUser);
    });

    it('should return undefined for non-existent user id', async () => {
      const user = await storage.getUser('non-existent-id');
      expect(user).toBeUndefined();
    });

    it('should get user by username', async () => {
      const createdUser = await storage.createUser(userData);
      const retrievedUser = await storage.getUserByUsername('testuser');
      
      expect(retrievedUser).toEqual(createdUser);
    });

    it('should return undefined for non-existent username', async () => {
      const user = await storage.getUserByUsername('non-existent');
      expect(user).toBeUndefined();
    });

    it('should get user by email', async () => {
      const createdUser = await storage.createUser(userData);
      const retrievedUser = await storage.getUserByEmail('test@example.com');
      
      expect(retrievedUser).toEqual(createdUser);
    });

    it('should return undefined for non-existent email', async () => {
      const user = await storage.getUserByEmail('non-existent@example.com');
      expect(user).toBeUndefined();
    });

    it('should get user by email or username with email', async () => {
      const createdUser = await storage.createUser(userData);
      const retrievedUser = await storage.getUserByEmailOrUsername('test@example.com');
      
      expect(retrievedUser).toEqual(createdUser);
    });

    it('should get user by email or username with username', async () => {
      const createdUser = await storage.createUser(userData);
      const retrievedUser = await storage.getUserByEmailOrUsername('testuser');
      
      expect(retrievedUser).toEqual(createdUser);
    });

    it('should return undefined for non-existent email or username', async () => {
      const user = await storage.getUserByEmailOrUsername('non-existent');
      expect(user).toBeUndefined();
    });
  });

  describe('Tweet operations', () => {
    let userId: string;

    beforeEach(async () => {
      const user = await storage.createUser({
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedpassword',
        displayName: 'Test User',
        passwordConfirmation: 'hashedpassword'
      });
      userId = user.id;
    });

    it('should create a tweet', async () => {
      const tweetData: InsertTweet = {
        content: 'This is a test tweet'
      };

      const tweet = await storage.createTweet({
        ...tweetData,
        authorId: userId
      });

      expect(tweet.content).toBe('This is a test tweet');
      expect(tweet.authorId).toBe(userId);
      expect(tweet.id).toBeDefined();
      expect(tweet.createdAt).toBeInstanceOf(Date);

      // Check tweet stats
      const stats = await storage.getTweetStats(tweet.id);
      expect(stats?.replyCount).toBe(0);
      expect(stats?.retweetCount).toBe(0);
      expect(stats?.likeCount).toBe(0);
    });

    it('should get tweet by id', async () => {
      const createdTweet = await storage.createTweet({
        content: 'Test tweet',
        authorId: userId
      });

      const retrievedTweet = await storage.getTweetById(createdTweet.id);
      expect(retrievedTweet).toEqual(createdTweet);
    });

    it('should return undefined for non-existent tweet id', async () => {
      const tweet = await storage.getTweetById('non-existent-id');
      expect(tweet).toBeUndefined();
    });

    it('should update a tweet', async () => {
      const createdTweet = await storage.createTweet({
        content: 'Original content',
        authorId: userId
      });

      const updatedTweet = await storage.updateTweet(createdTweet.id, {
        content: 'Updated content'
      });

      expect(updatedTweet.content).toBe('Updated content');
      expect(updatedTweet.id).toBe(createdTweet.id);
      expect(updatedTweet.authorId).toBe(userId);
    });

    it('should throw error when updating non-existent tweet', async () => {
      await expect(
        storage.updateTweet('non-existent-id', { content: 'New content' })
      ).rejects.toThrow('Tweet not found');
    });

    it('should delete a tweet', async () => {
      const createdTweet = await storage.createTweet({
        content: 'Tweet to delete',
        authorId: userId
      });

      await storage.deleteTweet(createdTweet.id);

      const retrievedTweet = await storage.getTweetById(createdTweet.id);
      expect(retrievedTweet).toBeUndefined();
    });

    it('should throw error when deleting non-existent tweet', async () => {
      await expect(
        storage.deleteTweet('non-existent-id')
      ).rejects.toThrow('Tweet not found');
    });

    it('should get all tweets with authors', async () => {
      await storage.createTweet({
        content: 'First tweet',
        authorId: userId
      });

      await storage.createTweet({
        content: 'Second tweet',
        authorId: userId
      });

      const tweets = await storage.getAllTweets();
      
      expect(tweets).toHaveLength(2);
      expect(tweets[0]).toHaveProperty('author');
      expect(tweets[0]).toHaveProperty('mentions');
      expect(tweets[0].author.id).toBe(userId);
    });

    it('should get user tweets', async () => {
      // Create another user
      const otherUser = await storage.createUser({
        username: 'otheruser',
        email: 'other@example.com',
        password: 'password',
        displayName: 'Other User',
        passwordConfirmation: 'hashedpassword'
      });

      await storage.createTweet({
        content: 'User tweet',
        authorId: userId
      });

      await storage.createTweet({
        content: 'Other user tweet',
        authorId: otherUser.id
      });

      const userTweets = await storage.getUserTweets(userId);
      
      expect(userTweets).toHaveLength(1);
      expect(userTweets[0].content).toBe('User tweet');
      expect(userTweets[0].author.id).toBe(userId);
    });

    it('should get user timeline including mentions', async () => {
      // Create another user
      const otherUser = await storage.createUser({
        username: 'otheruser',
        email: 'other@example.com',
        password: 'password',
        displayName: 'Other User',
        passwordConfirmation: 'password'
      });

      // User's own tweet
      await storage.createTweet({
        content: 'My own tweet',
        authorId: userId
      });

      // Tweet mentioning the user
      await storage.createTweet({
        content: 'Hello @testuser!',
        authorId: otherUser.id
      });

      // Tweet not mentioning the user
      await storage.createTweet({
        content: 'Random tweet',
        authorId: otherUser.id
      });

      const timeline = await storage.getUserTimeline(userId);
      
      expect(timeline).toHaveLength(2);
      const contents = timeline.map(tweet => tweet.content);
      expect(contents).toContain('My own tweet');
      expect(contents).toContain('Hello @testuser!');
      expect(contents).not.toContain('Random tweet');
    });
  });

  describe('Mention operations', () => {
    let userId: string;
    let tweetId: string;

    beforeEach(async () => {
      const user = await storage.createUser({
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedpassword',
        displayName: 'Test User',
        passwordConfirmation: 'hashedpassword'
      });
      userId = user.id;

      const tweet = await storage.createTweet({
        content: 'Test tweet',
        authorId: userId
      });
      tweetId = tweet.id;
    });

    it('should create a mention', async () => {
      const mention = await storage.createMention(tweetId, userId);

      expect(mention.tweetId).toBe(tweetId);
      expect(mention.userId).toBe(userId);
      expect(mention.id).toBeDefined();
      expect(mention.createdAt).toBeInstanceOf(Date);
    });

    it('should get tweet mentions', async () => {
      await storage.createMention(tweetId, userId);
      
      const mentions = await storage.getTweetMentions(tweetId);
      
      expect(mentions).toHaveLength(1);
      expect(mentions[0].id).toBe(userId);
    });

    it('should get user mentions', async () => {
      // Create another user and tweet
      const otherUser = await storage.createUser({
        username: 'otheruser',
        email: 'other@example.com',
        password: 'password',
        displayName: 'Other User',
        passwordConfirmation: 'password'
      });

      const mentionTweet = await storage.createTweet({
        content: 'Hello @testuser!',
        authorId: otherUser.id
      });

      await storage.createMention(mentionTweet.id, userId);
      
      const mentions = await storage.getUserMentions(userId);
      
      expect(mentions).toHaveLength(1);
      expect(mentions[0].content).toBe('Hello @testuser!');
      expect(mentions[0].author.id).toBe(otherUser.id);
    });

    it('should delete mentions when tweet is deleted', async () => {
      await storage.createMention(tweetId, userId);
      
      // Verify mention exists
      let mentions = await storage.getTweetMentions(tweetId);
      expect(mentions).toHaveLength(1);
      
      // Delete tweet
      await storage.deleteTweet(tweetId);
      
      // Verify mention is deleted
      mentions = await storage.getTweetMentions(tweetId);
      expect(mentions).toHaveLength(0);
    });
  });

  describe('extractMentionsFromContent', () => {
    it('should extract mentions from content', async () => {
      const user = await storage.createUser({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password',
        displayName: 'Test User',
        passwordConfirmation: 'password'
      });

      const tweet = await storage.createTweet({
        content: 'Hello @testuser and @nonexistentuser!',
        authorId: user.id
      });

      const tweets = await storage.getAllTweets();
      const tweetWithMentions = tweets.find(t => t.id === tweet.id);
      
      expect(tweetWithMentions?.mentions).toContain('testuser');
      expect(tweetWithMentions?.mentions).toContain('nonexistentuser');
    });

    it('should handle content without mentions', async () => {
      const user = await storage.createUser({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password',
        displayName: 'Test User',
        passwordConfirmation: 'password'
      });

      const tweet = await storage.createTweet({
        content: 'Just a regular tweet',
        authorId: user.id
      });

      const tweets = await storage.getAllTweets();
      const tweetWithMentions = tweets.find(t => t.id === tweet.id);
      
      expect(tweetWithMentions?.mentions).toHaveLength(0);
    });
  });
});