# MANAAL V3 Web Portal - Deployment Guide

## 🚀 Quick Deployment to Vercel

### Prerequisites
- Vercel account (free at vercel.com)
- Firebase project with the same configuration as mobile app
- Git repository (GitHub, GitLab, or Bitbucket)

### Step 1: Prepare Environment Variables

1. Copy the environment template:
```bash
cp env.example .env
```

2. Update `.env` with your Firebase configuration:
```env
REACT_APP_FIREBASE_API_KEY=your_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
```

### Step 2: Deploy to Vercel

#### Option A: Deploy via Vercel CLI
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Set environment variables
vercel env add REACT_APP_FIREBASE_API_KEY
vercel env add REACT_APP_FIREBASE_AUTH_DOMAIN
vercel env add REACT_APP_FIREBASE_PROJECT_ID
vercel env add REACT_APP_FIREBASE_STORAGE_BUCKET
vercel env add REACT_APP_FIREBASE_MESSAGING_SENDER_ID
vercel env add REACT_APP_FIREBASE_APP_ID
```

#### Option B: Deploy via Vercel Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your Git repository
4. Set build command: `npm run build`
5. Set output directory: `build`
6. Add environment variables in project settings
7. Deploy!

### Step 3: Configure Firebase for Web

1. Go to Firebase Console
2. Add a new web app to your project
3. Copy the Firebase config
4. Update environment variables in Vercel

### Step 4: Test the Deployment

1. Visit your Vercel URL
2. Test login with existing user credentials
3. Verify all features work correctly

## 🔧 Manual Deployment

### Build the App
```bash
npm run build
```

### Deploy to Any Static Host
- Upload the `build` folder to your hosting provider
- Configure environment variables
- Set up proper routing for SPA

## 🌐 Custom Domain (Optional)

1. In Vercel dashboard, go to your project
2. Click "Domains"
3. Add your custom domain
4. Configure DNS settings as instructed

## 📱 Mobile Responsiveness

The web app is fully responsive and works on:
- Desktop computers (1920x1080, 1366x768, etc.)
- Tablets (iPad, Android tablets)
- Mobile phones (iOS, Android)
- All modern browsers

## 🔐 Security Considerations

- All Firestore operations use the same security rules as mobile app
- User authentication is required for all protected routes
- Role-based access control implemented
- HTTPS enforced in production

## 🚨 Troubleshooting

### Common Issues:

1. **Build Fails**: Check that all dependencies are installed
2. **Firebase Connection**: Verify environment variables are set correctly
3. **Authentication Issues**: Ensure Firebase Auth is enabled
4. **Data Not Loading**: Check Firestore security rules

### Debug Mode:
```bash
# Run in development mode
npm start

# Check console for errors
# Verify Firebase connection
# Test authentication flow
```

## 📊 Performance Optimization

The web app includes:
- Code splitting for faster loading
- Optimized bundle size
- Responsive images
- Efficient state management
- Caching strategies

## 🔄 Updates and Maintenance

To update the web app:
1. Make changes to the code
2. Test locally with `npm start`
3. Build with `npm run build`
4. Deploy to Vercel (automatic if connected to Git)
5. Verify deployment works correctly

## 📞 Support

For technical support or questions:
- Check the README.md for detailed documentation
- Review Firebase console for data issues
- Check Vercel logs for deployment issues
- Contact the development team

## 🎯 Next Steps

After successful deployment:
1. Test all user roles (BA, Team Leader)
2. Verify all features work as expected
3. Set up monitoring and analytics
4. Configure backup and recovery procedures
5. Train users on the web interface

---

**Deployment Status**: ✅ Ready for Production
**Last Updated**: $(date)
**Version**: 1.0.0
