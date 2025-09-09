# BA SCAN Web - Setup Guide

## Quick Setup

### 1. Configure Firebase

Update `src/lib/firebase.ts` with your actual Firebase configuration:

```typescript
const firebaseConfig = {
  apiKey: "your-api-key-from-google-services.json",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Deploy to Vercel

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy:
```bash
vercel --prod
```

## Environment Variables for Vercel

In your Vercel dashboard, add these environment variables:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

## Features

✅ **User Authentication** - Login with ID number and PIN
✅ **Barcode Scanning** - Scan serials using device camera
✅ **Start Key Requests** - Submit requests to your existing backend
✅ **Request History** - View recent submissions
✅ **Responsive Design** - Works on desktop and mobile
✅ **PWA Support** - Can be installed as web app

## Security

- Uses your existing Firebase backend
- No changes needed to your Android app
- Same data structure and validation
- HTTPS required for camera access
