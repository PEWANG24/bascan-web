# MANAAL V3 Web Portal

A modern web application that mirrors the functionality of the MANAAL V3 mobile app, providing BAs and Team Leaders with access to all features through a web browser.

## Features

### For BAs (Business Associates)
- **Dashboard**: View daily, weekly, and monthly activation statistics
- **Recent Activations**: Track recent SIM activations with quality status
- **Pending Requests**: Monitor start key requests
- **Profile Management**: View and update personal information

### For Team Leaders
- **Team Management**: View and manage team members
- **Request Management**: Handle pending start key requests
- **Stock Orders**: Monitor recent stock orders and PDFs
- **Analytics**: View team performance and activation trends
- **Team Statistics**: Track team-wide activation metrics

## Technology Stack

- **Frontend**: React 18 with TypeScript
- **UI Framework**: Material-UI (MUI)
- **State Management**: React Context API
- **Routing**: React Router v6
- **Backend**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 16+ 
- npm or yarn
- Firebase project with Firestore enabled

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd bascan-web
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp env.example .env
```

4. Update `.env` with your Firebase configuration:
```env
REACT_APP_FIREBASE_API_KEY=your_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
```

### Development

Start the development server:
```bash
npm start
```

The app will be available at `http://localhost:3000`

### Building for Production

Build the app for production:
```bash
npm run build
```

The built files will be in the `build` directory.

## Deployment

### Vercel Deployment

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy to Vercel:
```bash
vercel
```

3. Set environment variables in Vercel dashboard:
   - Go to your project settings
   - Add all environment variables from `.env`

### Manual Deployment

1. Build the app:
```bash
npm run build
```

2. Deploy the `build` folder to your hosting provider

## Firebase Configuration

The web app uses the same Firebase project as the mobile app. Ensure the following collections exist in Firestore:

- `users` - User profiles and authentication
- `scan_activations` - SIM activation records
- `start_key_requests` - Start key request management
- `OrderPDFs` - Stock order PDFs
- `VanShop` - Van shop information
- `financial_settings` - Commission and target settings

## Authentication

The web app uses Firebase Authentication with the same user data as the mobile app. Users can log in using their ID number and PIN.

## Responsive Design

The web app is fully responsive and works on:
- Desktop computers
- Tablets
- Mobile phones
- All modern browsers

## Security

- All Firestore operations are secured with proper rules
- User authentication is required for all protected routes
- Role-based access control for different user types

## Support

For support and questions, please contact the development team.

## License

This project is proprietary software. All rights reserved.