# Create T3 App

This is a [T3 Stack](https://create.t3.gg/) project bootstrapped with `create-t3-app`.

## What's next? How do I make an app with this?

We try to keep this project as simple as possible, so you can start with just the scaffolding we set up for you, and add additional things later when they become necessary.

If you are not familiar with the different technologies used in this project, please refer to the respective docs. If you still are in the wind, please join our [Discord](https://t3.gg/discord) and ask for help.

- [Next.js](https://nextjs.org)
- [NextAuth.js](https://next-auth.js.org)
- [Prisma](https://prisma.io)
- [Drizzle](https://orm.drizzle.team)
- [Tailwind CSS](https://tailwindcss.com)
- [tRPC](https://trpc.io)

## Configuration

### Image Management

This project uses URL-based image management. Simply provide image URLs from external sources when adding images to games.

### Analytics

This project uses [Vercel Analytics](https://vercel.com/analytics) for tracking user interactions and page views. The analytics setup includes:

#### Page View Tracking
- **Home page**: `page_view` event with `page_name: "home"`
- **Team pages**: `team_view` event with `team_slug` and `page_type: "team"`
- **Game pages**: `game_view` event with `game_slug` and `page_type: "game"`
- **Rankings page**: `rankings_view` event with `page_type: "rankings"`
- **Planning page**: `page_view` event with `page_name: "planning"`
- **Groups page**: `page_view` event with `page_name: "groups"`

#### User Interaction Tracking
- **Score updates**: `score_updated` event with group name, game name, round, and score
- **Group management**: `group_created`, `group_updated`, `group_deleted` events
- **General interactions**: `user_interaction` event with action and properties

#### Analytics Utility
The analytics functionality is centralized in `src/lib/analytics.ts` and provides:
- `trackTeamView(teamSlug)`: Track team page views
- `trackGameView(gameSlug)`: Track game page views  
- `trackRankingsView()`: Track rankings page views
- `trackPageView(pageName, properties)`: Track general page views
- `trackInteraction(action, properties)`: Track user interactions

## Learn More

To learn more about the [T3 Stack](https://create.t3.gg/), take a look at the following resources:

- [Documentation](https://create.t3.gg/)
- [Learn the T3 Stack](https://create.t3.gg/en/faq#what-learning-resources-are-currently-available) — Check out these awesome tutorials

You can check out the [create-t3-app GitHub repository](https://github.com/t3-oss/create-t3-app) — your feedback and contributions are welcome!

## How do I deploy this?

Follow our deployment guides for [Vercel](https://create.t3.gg/en/deployment/vercel), [Netlify](https://create.t3.gg/en/deployment/netlify) and [Docker](https://create.t3.gg/en/deployment/docker) for more information.
