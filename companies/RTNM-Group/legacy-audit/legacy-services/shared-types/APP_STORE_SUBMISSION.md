# App Store & Play Store Submission Checklist

## Prerequisite: Apple & Google Accounts

- [ ] Apple Developer Account ($99/year) - https://developer.apple.com
- [ ] Google Play Console Account ($25 one-time) - https://play.google.com/console

---

## REZ Admin App (`rez-app-admin`)

### iOS App Store

1. **Create App in App Store Connect**
   - Go to: https://appstoreconnect.apple.com
   - Create new app with:
     - Name: "Rez Admin"
     - Bundle ID: `com.rez.admin`
     - Primary Language: English
     - SKU: `rez-admin`

2. **Update eas.json** (`apps/rez-app-admin/eas.json`)
   ```json
   "ascAppId": "YOUR_APP_STORE_ID",  // Found in App Store Connect
   "appleTeamId": "YOUR_TEAM_ID",      // Found in Apple Developer account
   ```

3. **Build iOS App**
   ```bash
   cd rez-app-admin
   eas build --platform ios --profile production
   ```

4. **Submit to App Store**
   ```bash
   eas submit --platform ios --profile production --latest
   ```

### Android Play Store

1. **Create App in Play Console**
   - Go to: https://play.google.com/console
   - Create new app with:
     - App name: "Rez Admin"
     - Package name: `com.rez.admin`

2. **Set Up Google Service Account**
   - Go to: Play Console > Settings > Developer account > API access
   - Create new service account
   - Download JSON key file
   - Save as `google-service-account.json` in project root

3. **Build Android App**
   ```bash
   cd rez-app-admin
   eas build --platform android --profile production
   ```

4. **Submit to Play Store**
   ```bash
   eas submit --platform android --profile production --latest
   ```

---

## REZ Consumer App (`rez-app-consumer`)

### iOS App Store

1. **Create App in App Store Connect**
   - Name: "REZ App"
   - Bundle ID: `money.rez.app`
   - SKU: `rez-consumer`

2. **Update eas.json** (`apps/rez-app-consumer/eas.json`)
   ```json
   "ascAppId": "YOUR_APP_STORE_ID",
   "appleTeamId": "YOUR_TEAM_ID"
   ```

3. **Required API Keys** (in eas.json production env)
   - [ ] `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` - Get from Google Cloud Console
   - [ ] `EXPO_PUBLIC_OPENCAGE_API_KEY` - Get from OpenCage
   - [ ] `EXPO_PUBLIC_RAZORPAY_KEY_ID` - Get from Razorpay Dashboard
   - [ ] `EXPO_PUBLIC_CLOUDINARY_API_KEY` - Get from Cloudinary

4. **Build & Submit**
   ```bash
   cd rez-app-consumer
   eas build --platform ios --profile production
   eas submit --platform ios --profile production --latest
   ```

### Android Play Store

1. **Create App in Play Console**
   - Name: "REZ App"
   - Package name: `money.rez.app`

2. **Setup** - Same as Admin app (service account)

3. **Required API Keys** - Same as iOS above

4. **Build & Submit**
   ```bash
   eas build --platform android --profile production
   eas submit --platform android --profile production --latest
   ```

---

## Required Updates Before Submission

### Admin App (`rez-app-admin/eas.json`)

```json
"submit": {
  "production": {
    "ios": {
      "ascAppId": "000000000",      // UPDATE THIS
      "appleTeamId": "XXXXXXXXXX"  // UPDATE THIS
    },
    "android": {
      "serviceAccountKeyPath": "./google-service-account.json"  // ADD FILE
    }
  }
}
```

### Consumer App (`rez-app-consumer/eas.json`)

```json
"submit": {
  "production": {
    "ios": {
      "ascAppId": "000000000",      // UPDATE THIS
      "appleTeamId": "XXXXXXXXXX"    // UPDATE THIS
    },
    "android": {
      "serviceAccountKeyPath": "./google-service-account.json"  // ADD FILE
    }
  }
}
```

And update environment variables:
```json
"EXPO_PUBLIC_GOOGLE_MAPS_API_KEY": "YOUR_MAPS_KEY",
"EXPO_PUBLIC_OPENCAGE_API_KEY": "YOUR_OPENCAGE_KEY",
"EXPO_PUBLIC_RAZORPAY_KEY_ID": "rzp_live_xxxxx",
"EXPO_PUBLIC_CLOUDINARY_API_KEY": "YOUR_CLOUDINARY_KEY"
```

---

## App Store Connect Setup (iOS)

### App Information
- [ ] App name
- [ ] Primary language
- [ ] Bundle ID
- [ ] SKU

### Pricing and Availability
- [ ] Price tier
- [ ] Availability date
- [ ] Territories

### App Privacy
- [ ] Answer all privacy questions
- [ ] Add privacy policy URL

### Prepare for Submission
- [ ] 1024x1024 App Icon
- [ ] 5 screenshots for iPhone (6.7" or 6.5")
- [ ] 5 screenshots for iPad (optional)
- [ ] Promotional text
- [ ] Description (170 chars or less)
- [ ] Keywords
- [ ] Support URL
- [ ] Marketing URL (optional)

---

## Play Console Setup (Android)

### App Content
- [ ] App category
- [ ] Content rating ( questionnaire)
- [ ] Targeted audience

### Store Listing
- [ ] Short description (80 chars)
- [ ] Full description (4000 chars max)
- [ ] Feature graphic (1024x500)
- [ ] Phone screenshots (min 2, max 8)
- [ ] Tablet screenshots (optional)
- [ ] App icon (512x512)
- [ ] Store graphic (180x120)

### Pricing & Distribution
- [ ] App price (free/paid)
- [ ] Countries
- [ ] Pre-registration (if needed)

### Content Rating
- [ ] Complete questionnaire
- [ ] Submit for rating

---

## Build Commands Reference

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Login to EAS
eas login

# Build for development
eas build --platform ios --profile development
eas build --platform android --profile development

# Build for production
eas build --platform ios --profile production
eas build --platform android --profile production

# Build and submit to stores
eas submit --platform ios --profile production --latest
eas submit --platform android --profile production --latest
```

---

## Troubleshooting

### iOS Build Issues
- Ensure Xcode is up to date
- Run `expo prebuild` to generate native files
- Check Apple Developer certificates

### Android Build Issues
- Ensure Google Play Console API access is configured
- Verify google-service-account.json is valid
- Check android/app/build.gradle for conflicts

### Submission Issues
- Ensure all "REQUIRED_BEFORE_LAUNCH" placeholders are replaced
- Verify bundle identifiers match App Store/Play Console
- Check privacy policy URLs are accessible

---

## Support

- Expo Documentation: https://docs.expo.dev
- EAS Submit: https://docs.expo.dev/submit/introduction/
- Apple Developer: https://developer.apple.com
- Google Play Console: https://play.google.com/console
