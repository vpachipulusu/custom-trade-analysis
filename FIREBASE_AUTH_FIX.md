# Firebase Authentication Configuration Fix

## Error

`Firebase: Error (auth/configuration-not-found)`

## Root Causes

This error occurs when:

1. Authentication methods are not enabled in Firebase Console
2. Environment variables are not properly loaded
3. Development server needs restart after env changes

## Solution Steps

### 1. Enable Authentication Methods in Firebase Console

**CRITICAL: You must enable authentication methods in Firebase Console**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `trade-analysis-665d8`
3. Click **Authentication** in the left sidebar
4. Click **Get Started** (if you see it)
5. Go to **Sign-in method** tab
6. Enable the following providers:

#### Enable Email/Password:

- Click on **Email/Password**
- Toggle **Enable** to ON
- Toggle **Email link (passwordless sign-in)** to OFF (optional)
- Click **Save**

#### Enable Google Sign-In:

- Click on **Google**
- Toggle **Enable** to ON
- Enter support email (use your Gmail address)
- Click **Save**

### 2. Verify Environment Variables

Your `.env.local` file has been updated with the correct configuration:

```env
NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSyDFhT3RXDRwHnvMGtWxjQKW3NWv2tJPE7g"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="trade-analysis-665d8.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="trade-analysis-665d8"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="trade-analysis-665d8.firebasestorage.app"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="82391035368"
NEXT_PUBLIC_FIREBASE_APP_ID="1:82391035368:web:e856e91d46ee79c632485d"
```

### 3. Restart Development Server

**IMPORTANT:** After enabling authentication in Firebase Console, restart your dev server:

```powershell
# Stop the current dev server (Ctrl+C)
# Then restart:
npm run dev
```

### 4. Clear Browser Cache

After restarting the server:

1. Open DevTools (F12)
2. Right-click on the Reload button
3. Select **Empty Cache and Hard Reload**

### 5. Test Authentication

Try to sign up with:

- **Email/Password:** Enter email and password (min 6 characters)
- **Google Sign-In:** Click the Google button

## Verification Checklist

- [ ] Enabled Email/Password authentication in Firebase Console
- [ ] Enabled Google Sign-In authentication in Firebase Console
- [ ] Restarted development server
- [ ] Cleared browser cache
- [ ] Tested signup with email
- [ ] Tested signup with Google

## Additional Notes

### Firebase Console Screenshots

When you're in Firebase Console > Authentication > Sign-in method, you should see:

- ✅ Email/Password - **Enabled**
- ✅ Google - **Enabled**

### Common Mistakes

1. ❌ Forgetting to click **Save** after toggling Enable
2. ❌ Not restarting the dev server after changes
3. ❌ Using old cached version of the app
4. ❌ Not entering support email for Google Sign-In

### Troubleshooting

If you still see the error after following all steps:

1. **Check browser console** for detailed error messages
2. **Verify Firebase project ID** matches: `trade-analysis-665d8`
3. **Check Firebase Console > Project Settings** to confirm API keys match
4. **Try incognito/private browsing** to rule out cache issues

## Quick Fix Command

Run these commands in order:

```powershell
# 1. Verify environment file exists
Get-Content .env.local | Select-String "FIREBASE"

# 2. Stop and restart dev server
# Press Ctrl+C to stop current server
npm run dev
```

## Expected Behavior After Fix

✅ Email signup creates new account
✅ Google popup opens for authentication
✅ User redirected to /dashboard after successful signup
✅ No console errors related to Firebase configuration
