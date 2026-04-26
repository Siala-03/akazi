# 🚀 IKAWA Coffee Worker Management System - Deployment Guide

## 📋 Prerequisites Checklist

Before deploying, ensure you have:
- ✅ Vercel account (sign up at [vercel.com](https://vercel.com))
- ✅ GitHub account (to connect your repository)
- ✅ MongoDB Atlas account (for production database)
- ✅ Your code committed to Git

## 🎯 Deployment Options

### Option 1: Deploy via Vercel Dashboard (Easiest) ⭐

1. **Push Code to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository
   - Vercel will auto-detect Next.js

3. **Configure Environment Variables**
   Add these in Vercel Dashboard → Settings → Environment Variables:
   
   ```
   MONGODB_URI=mongodb+srv://your-atlas-connection-string
   JWT_SECRET=your-secure-random-string-min-32-characters
   JWT_EXPIRES_IN=7d
   NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
   ```

4. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes
   - Your app will be live! 🎉

### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   cd /home/enock/ikawa
   vercel
   ```

4. **Follow the prompts:**
   - Set up and deploy? **Yes**
   - Which scope? **Select your account**
   - Link to existing project? **No**
   - What's your project's name? **ikawa** (or your choice)
   - In which directory is your code located? **./**
   - Want to override settings? **No**

5. **Set Environment Variables**
   ```bash
   vercel env add MONGODB_URI
   vercel env add JWT_SECRET
   vercel env add JWT_EXPIRES_IN
   vercel env add NEXT_PUBLIC_APP_URL
   ```

6. **Deploy to Production**
   ```bash
   vercel --prod
   ```

## 🗄️ Database Setup (MongoDB Atlas)

### Required for Production:

1. **Create MongoDB Atlas Account**
   - Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
   - Sign up for free tier (M0 Sandbox - FREE)

2. **Create a Cluster**
   - Choose AWS/GCP/Azure
   - Select region closest to your users
   - Choose M0 (Free tier)

3. **Setup Database Access**
   - Database Access → Add New Database User
   - Create username and password
   - Save credentials securely

4. **Setup Network Access**
   - Network Access → Add IP Address
   - Click "Allow Access from Anywhere" (0.0.0.0/0)
   - Or add specific IPs for better security

5. **Get Connection String**
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy connection string
   - Replace `<password>` with your actual password
   - This is your `MONGODB_URI`

   Example:
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/cwms?retryWrites=true&w=majority
   ```

## 🔐 Security Setup

### Generate Secure JWT Secret:

```bash
openssl rand -base64 64
```

Copy the output and use it as your `JWT_SECRET`.

### Environment Variables Summary:

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB Atlas connection string | `mongodb+srv://...` |
| `JWT_SECRET` | Secret key for JWT tokens (64+ chars) | `abc123...xyz` |
| `JWT_EXPIRES_IN` | JWT expiration time | `7d` |
| `NEXT_PUBLIC_APP_URL` | Your app's public URL | `https://ikawa.vercel.app` |

## 📝 Before First Deployment

### 1. Commit All Changes

```bash
cd /home/enock/ikawa
git add .
git commit -m "feat: add theme system, export functionality, and settings pages"
```

### 2. Create GitHub Repository (if needed)

```bash
gh repo create ikawa --private --source=. --remote=origin --push
```

Or manually:
- Go to GitHub.com
- Create new repository
- Follow the instructions to push

### 3. Test Build Locally

```bash
npm run build
npm start
```

Access at http://localhost:3000 to verify everything works.

## 🚀 Deployment Steps (Quick Reference)

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Login
vercel login

# 3. Deploy
cd /home/enock/ikawa
vercel

# 4. Add environment variables (via CLI or dashboard)
vercel env add MONGODB_URI
vercel env add JWT_SECRET

# 5. Deploy to production
vercel --prod
```

## 🎉 Post-Deployment

### After successful deployment:

1. **Access Your App**
   - Your app will be at: `https://your-project.vercel.app`
   - Vercel provides a custom domain

2. **Test All Features**
   - Login/Signup
   - Admin dashboard
   - Exporter dashboard
   - Supervisor dashboard
   - Theme toggle (dark/light mode)
   - Export functionality (PDF/Excel/CSV)
   - Settings pages

3. **Set Up Custom Domain (Optional)**
   - Vercel Dashboard → Your Project → Settings → Domains
   - Add your custom domain
   - Update DNS records as instructed

4. **Monitor Deployments**
   - Vercel Dashboard shows all deployments
   - Automatic deployments on git push
   - Instant rollbacks if needed

## 🔄 Continuous Deployment

Vercel automatically redeploys when you push to your repository:

```bash
# Make changes
git add .
git commit -m "feat: new feature"
git push origin main

# Vercel automatically deploys! ✨
```

## 🐛 Troubleshooting

### Build Fails
- Check Vercel build logs
- Ensure all dependencies in package.json
- Verify environment variables are set

### Database Connection Issues
- Verify MONGODB_URI is correct
- Check MongoDB Atlas IP whitelist
- Ensure database user has correct permissions

### Environment Variables Not Working
- Make sure they're added in Vercel Dashboard
- Prefix public variables with `NEXT_PUBLIC_`
- Redeploy after adding new variables

## 📊 Vercel Features You Get

- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Automatic deployments from Git
- ✅ Preview deployments for each PR
- ✅ Analytics and monitoring
- ✅ Edge functions
- ✅ Free SSL certificates
- ✅ DDoS protection
- ✅ Zero-downtime deployments

## 💰 Pricing

**Free Tier Includes:**
- 100 GB bandwidth per month
- 100 deployments per day
- Custom domains
- Automatic HTTPS
- Edge network

**Perfect for most production apps!**

## 📞 Support

If you encounter issues:
1. Check Vercel logs: `vercel logs`
2. Visit [Vercel Documentation](https://vercel.com/docs)
3. Check [Next.js Deployment Docs](https://nextjs.org/docs/deployment)

---

**Ready to deploy? Let's go! 🚀**
