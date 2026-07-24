# FormyFans Social API — Posts, Comments, Likes, Share, Feed, Follow, Stories

Base URL: `https://myfans-9eec8796eb21.herokuapp.com/api` (or local `/api`)

All social routes are registered in `src/routes/index.js`:

| Mount | File |
|-------|------|
| `/api/posts` | `src/routes/post.js` |
| `/api/follow` | `src/routes/follow.js` |
| `/api/feed` | `src/routes/feed.js` |
| `/api/stories` | `src/routes/story.js` |

---

## Architecture overview

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Client    │────▶│  Express     │────▶│  MongoDB        │
│  (URLs only)│     │  controllers │     │  posts, comments│
└─────────────┘     └──────────────┘     │  follows, stories│
                                         └─────────────────┘
```

- **No file upload** — media is passed as URL strings in JSON.
- **Likes** are stored **on the post/story document** (`likedBy` array + `likesCount`), not in a separate collection.
- **Comments** live in their own `comments` collection; posts keep a denormalized `commentsCount`.
- **Share** increments `sharesCount` on the post only — there is no share history or repost model.
- **Auth** for protected routes: `Authorization: Bearer <user JWT>`. Admin tokens are rejected on user routes.

---

## Data models

### Post (`src/models/post.js`)

| Field | Type | Description |
|-------|------|-------------|
| `authorId` | ObjectId → users | Post creator |
| `caption` | String | Text content |
| `media` | `[{ url, mediaType }]` | `mediaType`: `image`, `video`, `gif` |
| `likedBy` | `[ObjectId]` | Internal — not returned in API |
| `likesCount` | Number | Denormalized like count |
| `commentsCount` | Number | Denormalized comment count |
| `sharesCount` | Number | Incremented on each share |
| `visibility` | String | `public`, `followers`, `private` |

### Comment (`src/models/comment.js`)

| Field | Type |
|-------|------|
| `postId` | ObjectId → posts |
| `authorId` | ObjectId → users |
| `content` | String (required) |

### Follow (`src/models/follow.js`)

| Field | Type |
|-------|------|
| `followerId` | ObjectId |
| `followingId` | ObjectId |

Unique index on `{ followerId, followingId }`.

### Story (`src/models/story.js`)

24-hour TTL via `expiresAt`. Supports `image`, `video`, `gif`, `text`. Likes use the same embedded pattern as posts.

---

## Visibility rules (`canViewPost`)

| visibility | Who can view / like / comment / share |
|------------|----------------------------------------|
| `public` | Everyone |
| `followers` | Author + users who follow the author |
| `private` | Author only |

`GET /api/posts` (explore feed) uses **optional** auth — a Bearer token sets `isLiked` and expands visible posts. Other public GET routes (`GET /posts/:id`, `GET /posts/user/:userId`) still do not parse tokens unless updated similarly.

---

## Posts API

### Get all posts (explore / global feed)

```http
GET /api/posts?page=1&limit=10
Authorization: Bearer {{token}}   (optional)
```

Returns posts from **all users**, newest first. **Not** limited to accounts you follow (unlike `GET /api/feed/following`).

**Who sees what:**

| Viewer | Posts included |
|--------|----------------|
| No token | `visibility: public` only |
| Logged in | All `public` posts + your own posts (any visibility) + `followers` posts from authors you follow |

**Response 200:**

```json
{
  "message": "Posts fetched successfully",
  "posts": [ "...formatted post objects..." ],
  "pagination": { "page", "limit", "total", "totalPages", "hasNextPage", "hasPrevPage" }
}
```

With a valid Bearer token, each post includes correct `isLiked` for the viewer.

---

### Create post

```http
POST /api/posts
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "caption": "Hello from FormyFans",
  "media": [
    {
      "url": "https://res.cloudinary.com/demo/image/upload/sample.jpg",
      "mediaType": "image"
    }
  ],
  "visibility": "public"
}
```

Rules:
- Need **caption or at least one media item**.
- `visibility` defaults to `public`.

**Response 201:** `{ message, post }` — post includes `likesCount`, `commentsCount`, `sharesCount`, `isLiked`, `author`.

---

### Get post by id

```http
GET /api/posts/{{postId}}
```

Optional auth (see visibility note above).

---

### Get posts by user

```http
GET /api/posts/user/{{userId}}?page=1&limit=10
```

Returns only posts the viewer is allowed to see.

---

### Update / delete post (owner only)

```http
PUT /api/posts/{{postId}}
DELETE /api/posts/{{postId}}
Authorization: Bearer {{token}}
```

Update body (all optional): `{ "caption", "media", "visibility" }`.

Delete also removes all comments on that post.

---

## Like post (toggle)

```http
POST /api/posts/{{postId}}/like
Authorization: Bearer {{token}}
```

**No request body.**

Behavior:
- First call → adds user to `likedBy`, `likesCount + 1`, `isLiked: true`
- Second call → removes like, `likesCount - 1`, `isLiked: false`

**Response 200:**

```json
{
  "message": "Post liked successfully",
  "post": { "...": "full post object with updated counts" }
}
```

---

## Share post

```http
POST /api/posts/{{postId}}/share
Authorization: Bearer {{token}}
```

**No request body.**

Behavior:
- Increments `sharesCount` by 1 each time (same user can share multiple times).
- Does **not** create a repost, copy, or notification.
- Frontend should call this when user taps “Share” (after native share sheet or copy link).

**Response 200:**

```json
{
  "message": "Post share recorded successfully",
  "post": { "sharesCount": 1, "...": "..." }
}
```

---

## Comments API

### List comments

```http
GET /api/posts/{{postId}}/comments?page=1&limit=10
```

**Response:** `{ message, comments[], pagination }`

Each comment:

```json
{
  "_id": "...",
  "postId": "...",
  "authorId": "...",
  "author": { "firstName", "lastName", "email", "username", "image", "role" },
  "content": "Great post!",
  "createdAt": "...",
  "updatedAt": "..."
}
```

### Create comment

```http
POST /api/posts/{{postId}}/comments
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "content": "Great post!"
}
```

Increments `commentsCount` on the post.

### Delete comment (comment author only)

```http
DELETE /api/posts/{{postId}}/comments/{{commentId}}
Authorization: Bearer {{token}}
```

---

## Follow API

```http
POST   /api/follow/{{targetUserId}}   # follow (auth)
DELETE /api/follow/{{targetUserId}}   # unfollow (auth)
GET    /api/follow/{{userId}}/followers?page=1&limit=10
GET    /api/follow/{{userId}}/following?page=1&limit=10
GET    /api/follow/{{userId}}/counts
```

Cannot follow yourself. Duplicate follow → 400.

---

## Feed API

```http
GET /api/feed/following?page=1&limit=10
Authorization: Bearer {{token}}
```

Returns chronological posts from:
- Users you follow
- Yourself

Respects visibility (`public`, `followers` from followed users, your own `private`).

---

## Stories API (related social features)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/stories` | Yes | Create 24h story |
| GET | `/stories/active` | Yes | Tray of followed users’ stories |
| GET | `/stories/user/:userId` | Yes | One user’s active stories |
| GET | `/stories/:storyId` | Yes | Story detail |
| POST | `/stories/:storyId/view` | Yes | Record view |
| POST | `/stories/:storyId/like` | Yes | Toggle like |
| GET | `/stories/:storyId/viewers` | Yes | Owner only |
| DELETE | `/stories/:storyId` | Yes | Owner only |

Story create body:

```json
{
  "media": "https://example.com/image.jpg",
  "mediaType": "image",
  "text": "Optional caption"
}
```

For `text` stories, omit `media` and set `mediaType: "text"`.

---

## Typical frontend flows

### Create post → like → comment → share

1. `POST /api/posts` → save `post._id` as `postId`
2. `POST /api/posts/{{postId}}/like`
3. `POST /api/posts/{{postId}}/comments` with `{ content }`
4. User shares via OS → `POST /api/posts/{{postId}}/share`

### Home feed

1. `POST /api/follow/{{creatorId}}` (once)
2. `GET /api/feed/following?page=1&limit=10`

### View single post with engagement

1. `GET /api/posts/{{postId}}`
2. `GET /api/posts/{{postId}}/comments?page=1&limit=10`

---

## Postman collection variables

Use these in the **formyfans** Postman collection / environment:

| Variable | Example / purpose |
|----------|-------------------|
| `baseUrl` | `https://myfans-9eec8796eb21.herokuapp.com/api` |
| `token` / `userToken` | User JWT (set on login) |
| `contentCreatorToken` / `creatorToken` | Creator JWT |
| `userId` | Mongo `_id` of logged-in user |
| `targetUserId` | User to follow / interact with |
| `creatorId` | Creator account id (commerce + follow) |
| `postId` | Mongo `_id` of post (set after Create Post) |
| `commentId` | Mongo `_id` of comment (set after Create Comment) |
| `storyId` | Mongo `_id` of story |
| `page`, `limit` | Pagination |

---

## Verified behavior summary

| Feature | Implemented | Notes |
|---------|-------------|-------|
| Create post | ✅ | URL media only |
| Like post | ✅ | Toggle, embedded array |
| Comment | ✅ | No replies, no edit |
| Share post | ✅ | Counter only |
| Delete post/comment | ✅ | Owner only |
| Follow / feed | ✅ | Following feed only |
| Story like/view | ✅ | 24h TTL |
| Comment likes | ❌ | Not implemented |
| Repost / quote share | ❌ | Share is analytics only |
| Notifications | ❌ | Not implemented |
| Optional auth on public GET | ⚠️ | Token on public routes ignored today |

---

## File reference

| Layer | Path |
|-------|------|
| Post controller | `src/controllers/post.js` |
| Comment controller | `src/controllers/comment.js` |
| Follow controller | `src/controllers/follow.js` |
| Feed controller | `src/controllers/feed.js` |
| Story controller | `src/controllers/story.js` |
| Helpers | `src/utils/socialHelpers.js` |
| Postman | `formyfans.postman_collection.json` → folders **Social - Posts**, **Social - Follow & Feed**, **Social - Stories** |
