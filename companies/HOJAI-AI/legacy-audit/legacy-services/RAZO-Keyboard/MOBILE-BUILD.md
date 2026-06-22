# RAZO Keyboard v2.0 - Mobile Build Guide

## Android

### Prerequisites
- Android Studio Hedgehog or later
- Kotlin 1.9.0+
- Android SDK 34
- Gradle 8.2

### Build Steps

1. Open Android Studio
2. Open project: `RAZO-Keyboard/Android/`
3. Wait for Gradle sync to complete
4. Build > Generate Signed APK / APK
5. Install on device

### Or via command line:

```bash
cd RAZO-Keyboard/Android

# Download gradle wrapper (if not present)
curl -L https://services.gradle.org/distributions/gradle-8.2-bin.zip -o gradle.zip
unzip gradle.zip

# Build debug APK
./gradlew assembleDebug

# APK location
ls app/build/outputs/apk/debug/
```

### Configuration

Edit `app/build.gradle` to change:
- `versionCode` - Build number
- `versionName` - Version string
- `minSdk` - Minimum Android version (default: 26)

---

## iOS

### Prerequisites
- Xcode 15.0+
- XcodeGen
- CocoaPods (optional)

### Build Steps

1. Generate Xcode project:
```bash
cd RAZO-Keyboard/iOS
xcodegen generate
```

2. Open `RAZOKeyboard.xcodeproj` in Xcode

3. Select target device/simulator

4. Build > Run

### Or via command line:

```bash
cd RAZO-Keyboard/iOS

# Generate project
xcodegen generate

# Build
xcodebuild -project RAZOKeyboard.xcodeproj -scheme RAZOKeyboard -configuration Debug -destination 'platform=iOS Simulator,name=iPhone 15' build
```

### Important

- Set "Full Access" in Settings > General > Keyboard > Keyboards > RAZO
- Enable microphone permission
- Speech recognition permission required for voice input

---

## Integration with Gateway

Both apps connect to the RAZO Integration Gateway:

```
Production: https://api.razo.app/v2
Local:      http://localhost:4601
```

### Key Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `/session/init` | Initialize user session |
| `/predict` | Word predictions |
| `/suggestions` | Smart suggestions |
| `/actions` | Action cards |
| `/genie/briefing` | Genie AI briefing |
| `/whisper/process` | Voice text processing |

---

## Testing

### Android
```bash
adb install app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.razo.keyboard/.MainActivity
```

### iOS
```bash
xcrun simctl list devices
xcodebuild -workspace RAZOKeyboard.xcworkspace -scheme RAZOKeyboard -sdk iphonesimulator
```

---

## Troubleshooting

### Android
- **Gradle sync failed**: Delete `.gradle` folder and rebuild
- **Build failed**: Check SDK and Java versions

### iOS
- **XcodeGen not found**: `brew install xcodegen`
- **Build failed**: Check CocoaPods `pod install`
- **Keyboard not showing**: Enable in Settings > Keyboard > Keyboards

