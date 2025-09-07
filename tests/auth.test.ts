import request from 'supertest';
import express, { Express } from 'express';
import { storage } from '../server/storage';
import { createServer } from 'http';

// Create a test app setup function
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  
  // Import inside setup to avoid module loading issues  
  const { registerRoutes } = require('../server/routes');
  
  return registerRoutes(app).then((server: any) => {
    return { app, server };
  });
}

describe('Authentication Endpoints', () => {
  let app: Express;

  beforeEach(async () => {
    const testSetup = await createTestApp();
    app = testSetup.app;
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        passwordConfirmation: 'password123',
        displayName: 'Test User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toMatchObject({
        username: 'testuser',
        email: 'test@example.com',
        displayName: 'Test User'
      });
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should not register user with duplicate email', async () => {
      const userData = {
        username: 'testuser1',
        email: 'test@example.com',
        password: 'password123',
        passwordConfirmation: 'password123',
        displayName: 'Test User 1'
      };

      // Register first user
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      // Try to register second user with same email
      const duplicateUserData = {
        ...userData,
        username: 'testuser2',
        displayName: 'Test User 2'
      };

      await request(app)
        .post('/api/auth/register')
        .send(duplicateUserData)
        .expect(400);
    });

    it('should not register user with duplicate username', async () => {
      const userData = {
        username: 'testuser',
        email: 'test1@example.com',
        password: 'password123',
        passwordConfirmation: 'password123',
        displayName: 'Test User 1'
      };

      // Register first user
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      // Try to register second user with same username
      const duplicateUserData = {
        ...userData,
        email: 'test2@example.com',
        displayName: 'Test User 2'
      };

      await request(app)
        .post('/api/auth/register')
        .send(duplicateUserData)
        .expect(400);
    });

    it('should validate required fields', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({})
        .expect(400);
    });
  });

  describe('POST /api/auth/login', () => {
    let registeredUser: any;

    beforeEach(async () => {
      // Register a user for login tests
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        passwordConfirmation: 'password123',
        displayName: 'Test User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);
      
      registeredUser = response.body;
    });

    it('should login with email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          emailOrUsername: 'test@example.com',
          password: 'password123'
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toMatchObject({
        username: 'testuser',
        email: 'test@example.com'
      });
    });

    it('should login with username', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          emailOrUsername: 'testuser',
          password: 'password123'
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body.user.username).toBe('testuser');
    });

    it('should not login with wrong password', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          emailOrUsername: 'test@example.com',
          password: 'wrongpassword'
        })
        .expect(401);
    });

    it('should not login with non-existent user', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          emailOrUsername: 'nonexistent@example.com',
          password: 'password123'
        })
        .expect(401);
    });
  });

  describe('GET /api/auth/me', () => {
    let token: string;

    beforeEach(async () => {
      storage.reset();
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        passwordConfirmation: 'password123',
        displayName: 'Test User'
      };

      // Register user
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Login to get a valid token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          emailOrUsername: 'testuser',
          password: 'password123'
        })
        .expect(200);

      token = loginResponse.body.token;
    });

    it('should return current user info with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toMatchObject({
        username: 'testuser',
        email: 'test@example.com',
        displayName: 'Test User'
      });
    });
  });
});