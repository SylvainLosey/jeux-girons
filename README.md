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

### Vercel Blob Storage

This project uses Vercel Blob Storage for image uploads. To configure it:

1. **Create a Vercel Blob Store:**
   ```bash
   # Install Vercel CLI if you haven't already
   npm install -g vercel
   
   # Login to Vercel
   vercel login
   
   # Create a blob store
   vercel blob create
   ```

2. **Add Environment Variables:**
   Add the following to your `.env.local` file:
   ```env
   BLOB_READ_WRITE_TOKEN="vercel_blob_xxxxx"
   ```

3. **For Production:**
   - Deploy your app to Vercel
   - The `BLOB_READ_WRITE_TOKEN` will be automatically set by Vercel
   - Image uploads will work seamlessly in production

### Local Development

For local development, you can either:
- Set up a Vercel Blob Store and use the token locally
- Or temporarily use URL-only mode (images via external URLs)

## Learn More

To learn more about the [T3 Stack](https://create.t3.gg/), take a look at the following resources:

- [Documentation](https://create.t3.gg/)
- [Learn the T3 Stack](https://create.t3.gg/en/faq#what-learning-resources-are-currently-available) — Check out these awesome tutorials

You can check out the [create-t3-app GitHub repository](https://github.com/t3-oss/create-t3-app) — your feedback and contributions are welcome!

## How do I deploy this?

Follow our deployment guides for [Vercel](https://create.t3.gg/en/deployment/vercel), [Netlify](https://create.t3.gg/en/deployment/netlify) and [Docker](https://create.t3.gg/en/deployment/docker) for more information.
