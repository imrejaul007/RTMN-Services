# Chat OS

## Purpose
Team messaging, channels, threads, reactions, and direct messages for collaborative communication.

## Port
4876

## Features
- Channel CRUD (public, private, direct)
- Message CRUD with soft delete
- Threaded replies with message counts
- Emoji reactions (add/remove)
- Direct messages with sorted participant keys
- Full-text search across messages
- Message editing (owner only)
- Statistics by channel
- Channel membership management

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check |
| GET | /ready | Readiness check |
| GET | /api/channels | List channels with filters |
| GET | /api/channels/:id | Get channel with message count |
| POST | /api/channels | Create channel |
| PUT | /api/channels/:id | Update channel |
| DELETE | /api/channels/:id | Delete channel |
| POST | /api/channels/:id/members | Add member to channel |
| GET | /api/messages/:channelId | Get messages in channel |
| POST | /api/messages | Send message |
| PUT | /api/messages/:id | Edit message |
| DELETE | /api/messages/:id | Soft delete message |
| POST | /api/messages/:id/reactions | Add reaction |
| DELETE | /api/messages/:id/reactions | Remove reaction |
| GET | /api/threads/:parentId | Get thread by parent message |
| POST | /api/threads/:parentId/reply | Reply to thread |
| GET | /api/dm/:p1/:p2 | Get direct message thread |
| POST | /api/dm/:p1/:p2/messages | Send direct message |
| GET | /api/search | Search messages |
| GET | /api/stats | Get chat statistics |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 4876 | Service port |

## Commands

```bash
npm run dev        # Development with hot reload
npm start          # Production
npm test           # Run tests
npm run test:watch # Watch mode
```

## Channel Types

- `public` - Visible to all, open membership
- `private` - Invite-only, restricted access
- `direct` - Auto-created for two users

## Direct Message Keys

DM conversations use a sorted participant key:
```
user1:user2  (always sorted alphabetically)
```

This ensures `user1:user2` and `user2:user1` reference the same conversation.

## Message Fields

| Field | Description |
|-------|-------------|
| id | Unique message ID |
| channelId | Parent channel |
| userId | Author user ID |
| content | Message text |
| timestamp | Creation time |
| edited | Last edit time (if edited) |
| deleted | Soft delete flag |
| reactions | Map of emoji to user arrays |
| threadCount | Number of replies |

## Reaction Behavior

- Users can add any emoji reaction
- Same user cannot add duplicate reactions
- Removing last user's reaction removes emoji key
- Reactions update message's reactions map

## Search

Search parameters:
- `q` - Search query (required)
- `channelId` - Filter by channel
- `userId` - Filter by author

Results limited to 20 messages, excludes deleted.