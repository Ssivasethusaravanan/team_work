# Deployment Guide - ModelPro (SaaS Architecture)

This guide provides the necessary steps to deploy your application to **Render** or **Cloudflare Pages**.

## 1. Environment Variables (Required for Security)

Before deploying, ensure you have a secure **JWT_SECRET**. You can generate one in your terminal:
```bash
# Using Node.js (Cross-platform)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Required Variables:
- `JWT_SECRET`: The secure key from above.
- `NEXT_PUBLIC_APP_URL`: Your actual domain (e.g., `https://modelpro.render.com`).
- `NODE_ENV`: Set to `production`.

---

## 2. Deploying to Render (Full Node.js Runtime)

1. **Connect Repository**: Push your code to GitHub and connect it to a new **Web Service** on Render.
2. **Build Configuration**:
   - **Build Command**: `npm run build`
   - **Start Command**: `npm run start`
3. **Add Environment Variables**: Go to the "Env Vars" tab in Render and add the variables listed above.
4. **Health Check**: Render will automatically monitor your app. It should be live within minutes.

### Troubleshooting Render Builds
- **Module Not Found**: Ensure `baseUrl: "."` is present in your `tsconfig.json`.
- **Missing Tailwind**: Always keep `tailwindcss`, `postcss`, and `autoprefixer` in the `dependencies` section (not devDependencies) if your build fails on Render.
- **Node Version**: If you see errors related to Node features, specify your version in `package.json` under the `engines` field.

> [!TIP]
> Use Render if you plan to eventually integrate a full PostgreSQL database (using Prisma), as it supports persistent Node.js services perfectly.

---

## 3. Deploying to Cloudflare Pages (Edge Runtime)

1. **Prerequisites**: Ensure your project is "Edge compatible" (this project is already optimized using Web Crypto).
2. **Connect Repository**: Go to the Cloudflare Dashboard -> Workers & Pages -> Create application -> Connect to GitHub.
3. **Build settings**:
   - **Framework preset**: `Next.js`
   - **Build command**: `npx @cloudflare/next-on-pages` (or standard `next build`)
   - **Output directory**: `.next`
4. **Environment Variables**: Add your `JWT_SECRET` in the Cloudflare Page settings.

> [!IMPORTANT]
> Cloudflare uses an Edge runtime. This means it is ultra-fast globally, but you must use Edge-compatible database drivers (like **Cloudflare D1** or **Supabase**) if you move away from the simulated data layer.

---

## 4. Production Database (Cloudflare D1)

This project is powered by a permanent **Cloudflare D1 SQL Database**. 

### Architecture:
- **Frontend**: Standard Next.js Client components.
- **Stealth BFF**: `/api/auth/` dispatchers that mask the backend.
- **Core Backend**: Logic located in `backend/services/` and `backend/db/`.

### Managing Your Data:
You can manage your production users directly using Wrangler:
```bash
# View all registered users
npx wrangler d1 execute teamwork-db --command="SELECT * FROM users" --remote
```

> [!TIP]
> The **Stealth BFF** architecture ensures that your JWTs and Database access patterns are never exposed to the browser's DevTools.
