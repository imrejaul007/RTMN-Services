# 🤖 RAZO Keyboard - Android SDK

**Full-featured Android custom keyboard with AI**

---

## Features

| Feature | Status |
|---------|--------|
| Voice Input | ✅ |
| Grammar AI | ✅ |
| Suggestions | ✅ |
| Password Autofill | ✅ |
| Passkeys | ✅ |
| App Launcher | ✅ |
| RAZO Vault | ✅ |
| Genie | ✅ |
| CoPilot | ✅ |

---

## Quick Start

### Prerequisites
- Android Studio Hedgehog (2023.1.1) or later
- Kotlin 1.9+
- Android SDK 34 (compileSdk)
- Gradle 8.2+

### Build Instructions

```bash
cd Android

# Build debug APK
./gradlew assembleDebug

# The APK will be at:
# app/build/outputs/apk/debug/app-debug.apk

# Install on connected device/emulator
./gradlew installDebug

# Build release APK (requires signing config)
./gradlew assembleRelease
```

### Setup in Android Studio

1. Open Android Studio
2. Open the `Android` folder as a project
3. Wait for Gradle sync to complete
4. Build and run on emulator/device
5. Enable RAZO keyboard in Settings > System > Keyboard

---

## Architecture

```
┌─────────────────────────────────────────┐
│            RAZO Keyboard                 │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │       UI Layer                   │   │
│  │  Keys │ Voice │ Suggestions │ AI  │   │
│  └─────────────────────────────────┘   │
│                  │                      │
│  ┌─────────────────────────────────┐   │
│  │       Service Layer               │   │
│  │  InputMethodService              │   │
│  │  VoiceInputService               │   │
│  │  AutofillService                │   │
│  └─────────────────────────────────┘   │
│                  │                      │
│  ┌─────────────────────────────────┐   │
│  │       SDK Layer                  │   │
│  │  RazoKeyboardSDK                 │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

---

## Setup

```gradle
// build.gradle
dependencies {
    implementation project(':razo-keyboard-sdk')
}
```

---

## Usage

```kotlin
class RazoKeyboardService : InputMethodService() {
    
    private lateinit var sdk: RazoKeyboardSDK
    
    override fun onCreate() {
        super.onCreate()
        sdk = RazoKeyboardSDK.Builder()
            .context(this)
            .userId(getUserId())
            .build()
    }
    
    override fun onStartInput() {
        // Get voice input
        if (isVoiceMode) {
            startVoiceInput()
        }
    }
    
    private fun startVoiceInput() {
        // Start voice recognition
        val recognizer = SpeechRecognizer.createSpeechRecognizer(this)
        recognizer.startListening(intent)
    }
}
```

---

## Voice Input

```kotlin
// VoiceInputManager.kt
class VoiceInputManager(private val context: Context) {
    
    private val sdk = RazoKeyboardSDK.Builder().build()
    
    fun startVoiceInput() {
        val recognizer = SpeechRecognizer.createSpeechRecognizer(context)
        
        recognizer.setRecognitionListener(object : RecognitionListener {
            override fun onResults(results: Bundle?) {
                val text = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.first()
                text?.let { processText(it) }
            }
        })
        
        recognizer.startListening(createIntent())
    }
    
    private suspend fun processText(text: String) {
        // Clean text
        val cleaned = sdk.cleanupText(text)
        
        // Get suggestions
        val suggestions = sdk.getSuggestions(text)
        
        // Show in keyboard
        showSuggestions(suggestions)
    }
}
```

---

## Grammar AI

```kotlin
// GrammarManager.kt
class GrammarManager {
    
    suspend fun correctGrammar(text: String, tone: Tone): String {
        return sdk.correctGrammar(text, tone)
    }
    
    enum class Tone {
        FORMAL,
        FRIENDLY,
        EXECUTIVE,
        SALES
    }
}
```

---

## App Launcher (Search)

```kotlin
// SearchLauncher.kt
class SearchLauncher(private val context: Context) {
    
    suspend fun search(query: String): List<SearchResult> {
        return sdk.search(query)
    }
    
    fun launchApp(appId: String) {
        val intent = when (appId) {
            "airzy" -> context.packageManager.getLaunchIntentForPackage("com.rtnm.airzy")
            "wallet" -> context.packageManager.getLaunchIntentForPackage("com.rtnm.wallet")
            "stayown" -> context.packageManager.getLaunchIntentForPackage("com.rtnm.stayown")
            "khaimove" -> context.packageManager.getLaunchIntentForPackage("com.rtnm.khaimove")
            else -> null
        }
        intent?.startActivity()
    }
}
```

---

## Password Autofill

```kotlin
// RazoAutofillService.kt
class RazoAutofillService : AutofillService() {
    
    private val sdk = RazoKeyboardSDK.Builder().build()
    
    override fun onFillRequest(
        request: FillRequest,
        cancellationSignal: CancellationSignal,
        callback: FillCallback
    ) {
        val structure = request.fillContexts.lastOrNull()?.structure ?: return
        
        val site = getSiteFromStructure(structure)
        val credentials = sdk.getPassword(site)
        
        if (credentials != null) {
            val response = FillResponse.Builder()
                .addAuthentication(
                    datasetId,
                    listOf(
                        AutofillField.USERNAME_USERNAME to credentials.username,
                        AutofillField.USERNAME_PASSWORD to credentials.password
                    )
                )
                .build()
            callback.onSuccess(response)
        }
    }
}
```

---

## Passkeys (WebAuthn)

```kotlin
// PasskeyManager.kt
class PasskeyManager {
    
    suspend fun createPasskey(site: String): Boolean {
        val credential = WebAuthnManager.createCredential(
            rpId = site,
            userId = userId,
            timeout = 60000
        )
        sdk.createPasskey(site)
        return true
    }
    
    suspend fun authenticate(site: String): Boolean {
        val assertion = WebAuthnManager.getAssertion(
            rpId = site,
            challenge = generateChallenge()
        )
        return sdk.authenticateWithPasskey(site)
    }
}
```

---

## RAZO Vault

```kotlin
// RazoVault.kt
class RazoVault(private val context: Context) {
    
    private val biometricManager = BiometricManager.from(context)
    
    fun authenticate(callback: (Boolean) -> Unit) {
        val prompt = BiometricPrompt.PromptInfo.Builder()
            .setTitle("Unlock RAZO Vault")
            .setSubtitle("Use biometrics to unlock")
            .setNegativeButtonText("Use PIN")
            .build()
        
        biometricPrompt.authenticate(prompt, mainExecutor, object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationSucceeded(result: AuthenticationResult) {
                callback(true)
            }
        })
    }
}
```

---

## Genie Integration

```kotlin
// GenieIntegration.kt
class GenieIntegration {
    
    suspend fun askGenie(command: String): GenieResponse {
        return sdk.askGenie(command)
    }
    
    fun showGeniePanel() {
        // Show Genie suggestions in keyboard
        // "Ask Genie" button when typing relevant words
    }
}
```

---

## Sync

```kotlin
// SyncManager.kt
class SyncManager {
    
    private val sdk = RazoKeyboardSDK.Builder().build()
    
    suspend fun syncAll() {
        sdk.sync()
    }
    
    fun observeSyncStatus(): Flow<SyncStatus> {
        return flow {
            while (true) {
                emit(sdk.getSyncStatus())
                delay(30000) // Check every 30s
            }
        }
    }
}
```

---

## Permissions

```xml
<uses-permission android:name="android.permission.RECORD_AUDIO"/>
<uses-permission android:name="android.permission.INTERNET"/>
<uses-permission android:name="android.permission.USE_BIOMETRIC"/>
<uses-permission android:name="android.permission.VIBRATE"/>
<uses-permission android:name="android.permission.FOREGROUND_SERVICE"/>
```

---

## Output Formats

```xml
<!-- InputMethodService -->
<input-method xmlns:android="http://schemas.android.com/apk/res/android"
    android:settingsActivity="com.rtnm.razo.SettingsActivity"
    android:isDefault="false"
    android:icon="@drawable/razo_icon"
    android:label="@string/app_name"/>
```

---

## Publish

```bash
# Build
./gradlew assembleRelease

# Sign
jarsigner -keystore razo.jks app-release.apk alias

# Publish to Play Store
```

---

**Port:** 4631-4636 (RAZO Cloud services)
