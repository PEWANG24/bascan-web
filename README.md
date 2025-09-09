# BA SCAN Web Portal

A simple web portal for Brand Ambassadors to scan serials and submit start key requests. This web version provides the core functionality of the Android app in a browser-based interface.

## Features

- **User Authentication**: Login with ID number and PIN
- **Barcode Scanning**: Scan serial numbers using device camera
- **Start Key Requests**: Submit start key requests with serial numbers
- **Request History**: View recent submitted requests
- **Responsive Design**: Works on desktop and mobile devices
- **PWA Support**: Can be installed as a web app

## Setup Instructions

### 1. Configure Firebase

1. Copy your Firebase configuration from your Android app's `google-services.json`
2. Update `src/lib/firebase.ts` with your actual Firebase config:

```typescript
const firebaseConfig = {
  apiKey: "your-api-key",
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

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Deploy to Vercel

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel --prod
```

## Usage

1. **Login**: Use your existing BA credentials (ID number and PIN)
2. **Scan or Enter Serial**: Use the camera to scan barcodes or manually enter serial numbers
3. **Submit Request**: Submit start key requests that will be processed by your team leaders
4. **View History**: Check the status of your recent requests

## Security Notes

- This web version is designed for Brand Ambassadors only
- Uses the same Firebase backend as your Android app
- All data is stored in your existing Firestore database
- No changes needed to your backend infrastructure

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari
- Edge
- Mobile browsers (iOS Safari, Chrome Mobile)

## Camera Permissions

The app requires camera access for barcode scanning. Make sure to:
- Allow camera permissions when prompted
- Use HTTPS in production (required for camera access)
- Test on actual devices for best scanning experience