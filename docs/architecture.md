# SocialLens Architecture (MVP)

## Platforms
- YouTube: YouTube Data API (official)

## High-level flow
1. User inputs a channel URL/handle/channelId
2. Backend resolves channelId (if needed)
3. Backend fetches:
   - channel metadata
   - recent videos
   - video statistics
4. Data is stored in DB
5. Dashboard/API shows summaries & trends
