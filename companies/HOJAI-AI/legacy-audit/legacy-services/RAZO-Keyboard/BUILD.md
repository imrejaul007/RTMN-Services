# 🎹 RAZO KEYBOARD - BUILD GUIDE

**Complete guide to build and deploy RAZO Keyboard**

---

## STEP 1: TEST UI IN BROWSER

```bash
# Open in browser
open /Users/rejaulkarim/Documents/ReZ\ Full\ App/RAZO-Keyboard/UI/index.html

# Or serve it
cd /Users/rejaulkarim/Documents/ReZ\ Full\ App/RAZO-Keyboard/UI
python3 -m http.server 8080
# Open http://localhost:8080
```

---

## STEP 2: BUILD ANDROID APK

### Setup React Native Project

```bash
# Create React Native project
cd /Users/rejaulkarim/Documents/ReZ\ Full\ App/RAZO-Keyboard

npx create-react-native-app RAZOKeyboard --template blank
cd RAZOKeyboard

# Install dependencies
npm install @react-navigation/native react-native-screens
npm install react-native-webview  # For keyboard web view
npm install react-native-svg      # For icons
```

### Create Android Keyboard Service

```kotlin
// android/app/src/main/java/com/razo/keyboard/RazoKeyboardService.kt

package com.razo.keyboard

import android.inputmethodservice.InputMethodService
import android.view.View
import android.view.inputmethod.EditorInfo
import android.content.Intent
import android.net.Uri

class RazoKeyboardService : InputMethodService() {

    private lateinit var keyboardView: View

    override fun onCreate() {
        super.onCreate()
        // Initialize keyboard
    }

    override fun onCreateInputView(): View {
        keyboardView = layoutInflater.inflate(R.layout.keyboard_layout, null)
        return keyboardView
    }

    override fun onStartInput(attribute: EditorInfo?, restarting: Boolean) {
        super.onStartInput(attribute, restarting)

        // Detect current app for context-aware suggestions
        val packageName = currentInputEditorInfo?.packageName ?: ""
        detectContext(packageName)
    }

    private fun detectContext(packageName: String) {
        // Context-aware logic
        when (packageName) {
            "com.whatsapp" -> showWhatsAppSuggestions()
            "com.google.android.gm" -> showGmailSuggestions()
            else -> showDefaultSuggestions()
        }
    }

    // Voice input
    fun startVoiceInput() {
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
        startActivityForResult(intent, VOICE_REQUEST_CODE)
    }

    // Deep links
    fun openApp(appId: String) {
        val deeplinks = mapOf(
            "airzy" to "airzy://",
            "wallet" to "rezwallet://",
            "stayown" to "stayown://"
        )

        deeplinks[appId]?.let { uri ->
            try {
                startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(uri)))
            } catch (e: Exception) {
                // Open web fallback
                openWebFallback(appId)
            }
        }
    }
}
```

### Build APK

```bash
# Build debug APK
cd RAZOKeyboard/android
./gradlew assembleDebug

# APK will be at:
# android/app/build/outputs/apk/debug/app-debug.apk
```

### Install on Device

```bash
# Install via ADB
adb install app/build/outputs/apk/debug/app-debug.apk

# Or copy to device
adb push app-debug.apk /sdcard/
```

---

## STEP 3: BUILD iOS KEYBOARD EXTENSION

### Create App Extension

```swift
// iOS/RazoKeyboard/RazoKeyboardViewController.swift

import UIKit
import Speech

class RazoKeyboardViewController: UIInputViewController {

    private var voiceButton: UIButton!
    private var predictionView: UIStackView!

    override func viewDidLoad() {
        super.viewDidLoad()
        setupKeyboard()
    }

    private func setupKeyboard() {
        // QWERTY keyboard layout
        // Voice button
        // Prediction row
        // All 6 states
    }

    // Voice input
    private func startVoiceInput() {
        let recognizer = SFSpeechRecognizer()
        let request = SFSpeechAudioBufferRecognitionRequest()

        let inputNode = audioEngine.inputNode
        let recordingFormat = inputNode.outputFormat(forBus: 0)

        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { buffer, _ in
            request.append(buffer)
        }

        recognizer?.recognitionTask(with: request) { result, error in
            if let text = result?.bestTranscription.formattedString {
                self.textDocumentProxy.insertText(text)
            }
        }

        audioEngine.prepare()
        audioEngine.start()
    }

    // Open app via URL scheme
    private func openApp(appId: String) {
        let schemes = [
            "airzy": "airzy://",
            "wallet": "rezwallet://",
            "genie": "genie://"
        ]

        if let url = URL(string: schemes[appId] ?? "") {
            openURL(url)
        }
    }
}
```

### Info.plist Permissions

```xml
<key>NSExtension</key>
<dict>
    <key>NSExtensionAttributes</key>
    <dict>
        <key>IsASCIICapable</key>
        <true/>
        <key>PrefersRightToLeft</key>
        <false/>
        <key>PrimaryLanguage</key>
        <string>en-IN</string>
        <key>RequestsOpenAccess</key>
        <true/>
    </dict>
    <key>NSExtensionPointIdentifier</key>
    <string>com.apple.keyboard-service</string>
    <key>NSExtensionPrincipalClass</key>
    <string>$(PRODUCT_MODULE_NAME).RazoKeyboardViewController</string>
</dict>

<key>NSMicrophoneUsageDescription</key>
<string>RAZO needs microphone for voice typing</string>

<key>NSFaceIDUsageDescription</key>
<string>RAZO uses Face ID to unlock your vault</string>

<key>NSSpeechRecognitionUsageDescription</key>
<string>RAZO uses speech recognition for voice input</string>
```

### Build for Simulator

```bash
# Open in Xcode
open RAZOKeyboard.xcodeproj

# Select target: iPhone Simulator
# Build: Cmd + B
# Run: Cmd + R
```

---

## STEP 4: CONNECT SERVICES

### Update Service URLs

```typescript
// RAZO-Keyboard/UI/src/config.ts

export const SERVICES = {
  // Backend services
  predictive: 'http://localhost:4640',
  intentRouter: 'http://localhost:4650',
  smartSuggestions: 'http://localhost:4651',
  actionCards: 'http://localhost:4652',
  commandBar: 'http://localhost:4653',
  deepLinks: 'http://localhost:4654',
  keyboardFeed: 'http://localhost:4655',

  // Genie services
  genie: 'http://localhost:4760',
  relationship: 'http://localhost:4702',
  memory: 'http://localhost:4521',

  // Production URLs (update these)
  production: {
    api: 'https://api.rtnm.digital',
    genie: 'https://genie.rtnm.digital',
  }
};
```

### Start All Services

```bash
# Start backend services
cd /Users/rejaulkarim/Documents/ReZ\ Full\ App/RAZO-Keyboard

# Terminal 1: Predictive Engine
npx tsx PREDICTIVE-ENGINE/index.ts &

# Terminal 2: Intent Router
npx tsx INTENT-ROUTER/index.ts &

# Terminal 3: Smart Suggestions
npx tsx SMART-SUGGESTIONS/index.ts &

# Terminal 4: Action Cards
npx tsx ACTION-CARDS/index.ts &

# Terminal 5: Command Bar
npx tsx COMMAND-BAR/index.ts &

# Terminal 6: Deep Links
npx tsx DEEP-LINKS/index.ts &

# Terminal 7: Keyboard Feed
npx tsx KEYBOARD-FEED/index.ts &
```

---

## STEP 5: ADD AUTH (CorpID)

### CorpID Integration

```typescript
// RAZO-Keyboard/UI/src/auth/CorpID.ts

import { CorpIDAuth } from '@hojai/corpid-sdk';

const corpID = new CorpIDAuth({
  apiKey: process.env.CORPID_API_KEY,
  redirectUri: 'razo://auth/callback'
});

export async function authenticate() {
  // Check if user is logged in
  const user = await corpID.getCurrentUser();

  if (!user) {
    // Show CorpID login
    const result = await corpID.login();

    if (result.success) {
      // Store token
      localStorage.setItem('razo_token', result.token);
    }
  }

  return user;
}

export async function biometricUnlock() {
  // Face ID / Fingerprint
  return await corpID.biometricAuth();
}
```

### Add Biometric Auth

```typescript
// On keyboard unlock
async function unlockVault() {
  // Try biometric first
  const biometricSuccess = await authenticateWithBiometric();

  if (biometricSuccess) {
    // Unlock vault
    openVault();
  } else {
    // Fall back to CorpID
    await authenticate();
  }
}
```

---

## QUICK START COMMANDS

```bash
# 1. Test UI
open RAZO-Keyboard/UI/index.html

# 2. Build Android
cd RAZOKeyboard && ./gradlew assembleDebug

# 3. Build iOS
open RAZOKeyboard.xcodeproj  # Then Cmd+B

# 4. Start services
cd RAZO-Keyboard
npx tsx PREDICTIVE-ENGINE/index.ts
npx tsx INTENT-ROUTER/index.ts
npx tsx SMART-SUGGESTIONS/index.ts

# 5. Connect to Genie
# Update SERVICES config with Genie URL
```

---

## FILES STRUCTURE

```
RAZO-Keyboard/
├── UI/
│   ├── index.html           ✅ Demo (open in browser)
│   ├── components/
│   │   ├── Keyboard.tsx     ✅ State machine
│   │   ├── DefaultKeyboard.tsx
│   │   ├── VoiceMode.tsx
│   │   ├── GenieMode.tsx
│   │   ├── Suggestions.tsx
│   │   ├── AppLauncher.tsx
│   │   └── ActionMode.tsx
│   └── src/
│       ├── config.ts        # Service URLs
│       └── auth/
│           └── CorpID.ts    # Auth integration
├── PREDICTIVE-ENGINE/
├── INTENT-ROUTER/
├── SMART-SUGGESTIONS/
├── ACTION-CARDS/
├── COMMAND-BAR/
├── DEEP-LINKS/
├── KEYBOARD-FEED/
└── BUILD.md                 # This file
```

---

## DEPLOYMENT CHECKLIST

- [ ] Test UI in browser ✅
- [ ] Build Android APK
- [ ] Build iOS Extension
- [ ] Connect backend services
- [ ] Add CorpID auth
- [ ] Test biometric unlock
- [ ] Add deep links to all RTNM apps
- [ ] Test cross-device sync
- [ ] Submit to Play Store
- [ ] Submit to App Store

---

**Start by opening `RAZO-Keyboard/UI/index.html` in browser!** 🚀