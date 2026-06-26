# GenieSDK for Android

Official Android (Kotlin) SDK for HOJAI Genie AI.

## Quick Start

```kotlin
import com.hojai.genie.*

// Configure
GenieClient.instance.configure(apiKey = "YOUR_API_KEY")

// Send a message
lifecycleScope.launch {
    try {
        val response = GenieClient.instance.sendMessage("What's on my calendar today?")
        println(response.text)
    } catch (e: GenieError) {
        println("Error: $e")
    }
}

// Voice session
lifecycleScope.launch {
    val config = VoiceConfig(sampleRate = 16000, language = "en-US")
    GenieClient.instance.startVoiceSession(config, object : VoiceListener {
        override fun onTranscript(text: String) { println("User: $text") }
        override fun onResponse(response: GenieResponse) { println("Genie: ${response.text}") }
        override fun onError(error: GenieError) { println("Error: $error") }
    })
}
```

## Installation

```groovy
// settings.gradle.kts
dependencyResolutionManagement {
    repositories {
        maven { url = uri("https://jitpack.io") }
    }
}

// app/build.gradle.kts
dependencies {
    implementation("com.hojai.ai:genie-sdk:1.0.0")
}
```
