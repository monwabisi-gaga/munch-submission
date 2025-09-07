# Twitter Clone API Testing Guide

## Full CRUD Operations via POSTMAN/cURL

This guide provides comprehensive testing instructions for all API endpoints with complete CRUD operations.

### 1. User Registration

**Endpoint:** `POST /api/auth/register`  
**Content-Type:** `application/json`

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com", 
    "password": "password123",
    "passwordConfirmation": "password123",
    "displayName": "Test User"
  }'
```

**Expected Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-string",
    "username": "testuser",
    "email": "test@example.com",
    "displayName": "Test User",
    "avatar": "https://images.unsplash.com/..."
  }
}
```

### 2. User Login

**Endpoint:** `POST /api/auth/login`  
**Content-Type:** `application/json`

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrUsername": "testuser",
    "password": "password123"
  }'
```

### 3. Get Current User Info

**Endpoint:** `GET /api/auth/me`  
**Authorization:** `Bearer {token}`

```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 4. Create Tweet (CREATE)

**Endpoint:** `POST /api/tweets`  
**Authorization:** `Bearer {token}`  
**Content-Type:** `application/json`

```bash
curl -X POST http://localhost:5000/api/tweets \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Hello world! This is my first tweet with @mention"
  }'
```

**Expected Response:**
```json
{
  "id": "tweet-uuid",
  "content": "Hello world! This is my first tweet with @mention",
  "authorId": "user-uuid",
  "parentTweetId": null,
  "isRetweet": false,
  "originalTweetId": null,
  "mediaUrls": null,
  "hashtags": null,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "deletedAt": null,
  "author": {
    "id": "user-uuid",
    "username": "testuser",
    "email": "test@example.com",
    "displayName": "Test User",
    "avatar": "https://images.unsplash.com/..."
  },
  "mentions": ["mention"]
}
```

### 5. Get All Tweets (READ)

**Endpoint:** `GET /api/tweets`  
**Authorization:** `Bearer {token}`

```bash
curl -X GET http://localhost:5000/api/tweets \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 6. Get User Timeline

**Endpoint:** `GET /api/tweets/timeline`  
**Authorization:** `Bearer {token}`

```bash
curl -X GET http://localhost:5000/api/tweets/timeline \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 7. Get Specific User's Tweets

**Endpoint:** `GET /api/tweets/user/{userId}`  
**Authorization:** `Bearer {token}`

```bash
curl -X GET http://localhost:5000/api/tweets/user/USER_ID_HERE \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 8. Update Tweet (UPDATE)

**Endpoint:** `PUT /api/tweets/{tweetId}`  
**Authorization:** `Bearer {token}`  
**Content-Type:** `application/json`

```bash
curl -X PUT http://localhost:5000/api/tweets/TWEET_ID_HERE \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Updated tweet content with new @mentions"
  }'
```

### 9. Delete Tweet (DELETE)

**Endpoint:** `DELETE /api/tweets/{tweetId}`  
**Authorization:** `Bearer {token}`

```bash
curl -X DELETE http://localhost:5000/api/tweets/TWEET_ID_HERE \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 10. Get User Mentions

**Endpoint:** `GET /api/mentions`  
**Authorization:** `Bearer {token}`

```bash
curl -X GET http://localhost:5000/api/mentions \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Complete CRUD Test Sequence

1. **Register a new user** - Save the token from response
2. **Create a tweet** - Save the tweet ID from response  
3. **Read all tweets** - Verify your tweet appears
4. **Update the tweet** - Use the saved tweet ID
5. **Read tweets again** - Verify content changed
6. **Delete the tweet** - Use the saved tweet ID
7. **Read tweets final** - Verify tweet is gone

## POSTMAN Collection Setup

### Environment Variables
Create a POSTMAN environment with these variables:
- `base_url`: `http://localhost:5000`
- `auth_token`: (Set dynamically from login response)
- `user_id`: (Set dynamically from login response)
- `tweet_id`: (Set dynamically from create tweet response)

### Pre-request Scripts
For authenticated requests, add this pre-request script:
```javascript
pm.request.headers.add({
  key: 'Authorization',
  value: 'Bearer ' + pm.environment.get('auth_token')
});
```

### Test Scripts
For login endpoints, add this test script to save the token:
```javascript
if (pm.response.code === 200 || pm.response.code === 201) {
  const response = pm.response.json();
  pm.environment.set('auth_token', response.token);
  pm.environment.set('user_id', response.user.id);
}
```

For create tweet, save the tweet ID:
```javascript
if (pm.response.code === 201) {
  const response = pm.response.json();
  pm.environment.set('tweet_id', response.id);
}
```

## Error Handling Test Cases

### Authentication Errors
- Try accessing protected endpoints without token (401)
- Try with invalid token (403)
- Try with expired token (403)

### Validation Errors  
- Register with missing fields (400)
- Register with duplicate email/username (400)
- Create tweet with empty content (400)
- Create tweet over 280 characters (400)

### Authorization Errors
- Try updating someone else's tweet (403)
- Try deleting someone else's tweet (403)

### Not Found Errors
- Update non-existent tweet (404)
- Delete non-existent tweet (404)
- Get tweets for non-existent user (empty array)

## Testing Mention Functionality

1. Register two users: `user1` and `user2`
2. Login as `user1`, create tweet: "Hello @user2!"
3. Login as `user2`, check mentions endpoint
4. Verify `user2` sees the mention from `user1`
5. Check `user2`'s timeline includes the mention

## Testing Complete User Flow

1. **Registration Flow:**
   - Register new account
   - Login with credentials
   - Get current user info

2. **Tweet Management:**
   - Create initial tweet
   - Create tweet with mentions
   - Update tweet content
   - Delete tweet

3. **Social Features:**
   - View all tweets (public feed)
   - View personal timeline
   - View user specific tweets
   - View mentions