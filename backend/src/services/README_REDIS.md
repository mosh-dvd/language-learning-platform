# Redis Caching Layer

This document describes the Redis caching implementation for the language learning platform.

## Overview

Redis is used as a caching layer to improve performance by caching:
- User sessions and JWT tokens
- Daily review queues (pre-computed)
- Frequently accessed lesson data
- SRS calculation results

## Setup

### Installing Redis

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

**macOS:**
```bash
brew install redis
brew services start redis
```

**Docker:**
```bash
docker run -d -p 6379:6379 --name redis redis:latest
```

### Configuration

Add the following environment variables to your `.env` file:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

## Architecture

### Redis Client (`backend/src/db/redis.ts`)

The Redis client provides:
- Connection pooling
- Automatic reconnection with exponential backoff
- Error handling and logging
- Graceful shutdown

### Cache Service (`backend/src/services/cache.service.ts`)

The cache service provides methods for:

#### Session Management
- `setSession(userId, sessionData)` - Cache user session
- `getSession(userId)` - Retrieve cached session
- `deleteSession(userId)` - Remove session from cache

#### JWT Token Blacklist
- `blacklistToken(token, expiresIn)` - Add token to blacklist
- `isTokenBlacklisted(token)` - Check if token is blacklisted

#### Daily Review Queue
- `setDailyReview(userId, exercises)` - Cache daily review
- `getDailyReview(userId)` - Retrieve cached review
- `invalidateDailyReview(userId)` - Clear review cache

#### Lesson Data
- `setLesson(lessonId, lesson)` - Cache lesson data
- `getLesson(lessonId)` - Retrieve cached lesson
- `invalidateLesson(lessonId)` - Clear lesson cache
- `invalidateLessonsByLanguage(languageCode)` - Clear all lessons for a language

#### SRS Calculation Results
- `setSRSResult(userId, wordId, result)` - Cache SRS calculation
- `getSRSResult(userId, wordId)` - Retrieve cached result
- `invalidateSRSResult(userId, wordId)` - Clear specific result
- `invalidateAllSRSForUser(userId)` - Clear all SRS data for user

## Cache Invalidation Strategies

### Time-Based (TTL)
- Sessions: 7 days
- Token blacklist: 7 days (matches JWT expiration)
- Daily reviews: 24 hours
- Lesson data: 1 hour
- SRS results: 1 hour

### Event-Based
- Lesson updates → invalidate lesson cache
- Exercise completion → invalidate daily review
- SRS schedule changes → invalidate SRS cache and daily review
- User logout → invalidate session and blacklist token

## Integration

### Auth Service
The auth service uses Redis for:
- Caching user sessions after token validation
- Blacklisting JWT tokens on logout
- Fallback to in-memory blacklist if Redis is unavailable

### SRS Service
The SRS service uses Redis for:
- Caching daily review queues
- Caching SRS calculation results
- Automatic invalidation when schedules change

### Lesson Service
The lesson service uses Redis for:
- Caching frequently accessed lessons
- Invalidating cache on updates/deletes

## Testing

To run the cache service tests, ensure Redis is running:

```bash
# Start Redis
redis-server

# Run tests
npm test cache.service.test.ts
```

## Monitoring

Redis provides built-in monitoring commands:

```bash
# Connect to Redis CLI
redis-cli

# Monitor all commands
MONITOR

# Get server info
INFO

# Check memory usage
INFO memory

# List all keys (use with caution in production)
KEYS *

# Get key TTL
TTL session:user-123
```

## Production Considerations

1. **Redis Persistence**: Configure RDB or AOF persistence for data durability
2. **Memory Limits**: Set `maxmemory` and `maxmemory-policy` (recommend `allkeys-lru`)
3. **Security**: Use password authentication and bind to specific interfaces
4. **Monitoring**: Set up monitoring with Redis Sentinel or Redis Enterprise
5. **Clustering**: Consider Redis Cluster for high availability
6. **Connection Pooling**: The client already implements connection pooling

## Fallback Behavior

The application gracefully handles Redis unavailability:
- Auth service falls back to in-memory token blacklist
- Other services will fetch from database if cache miss
- Errors are logged but don't crash the application
- Reconnection attempts are automatic with exponential backoff

## Performance Benefits

Expected performance improvements:
- Session validation: ~50ms → ~5ms (10x faster)
- Lesson retrieval: ~100ms → ~10ms (10x faster)
- Daily review generation: ~200ms → ~20ms (10x faster)
- SRS calculations: ~50ms → ~5ms (10x faster)
