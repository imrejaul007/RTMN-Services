# GenieSDK for iOS

Official iOS SDK for HOJAI Genie AI.

## Quick Start

```swift
import GenieSDK

// Configure
GenieClient.shared.configure(apiKey: "YOUR_API_KEY")

// Send a message
Task {
    do {
        let response = try await GenieClient.shared.sendMessage("What's on my calendar today?")
        print(response.text)
    } catch {
        print("Error: \(error)")
    }
}

// Voice session
Task {
    let config = VoiceConfig(sampleRate: 16000, language: "en-US", wakeWordEnabled: true)
    try await GenieClient.shared.startVoiceSession(config: config, delegate: self)
}

extension MyViewController: VoiceSessionDelegate {
    func voiceSessionDidReceiveTranscript(_ text: String) {
        print("User said: \(text)")
    }
    func voiceSessionDidReceiveResponse(_ response: GenieResponse) {
        print("Genie: \(response.text)")
    }
    func voiceSessionDidEncounterError(_ error: Error) {
        print("Error: \(error)")
    }
}
```

## Installation

### Swift Package Manager
```swift
// Package.swift
.package(url: "https://github.com/imrejaul007/hojai-ai", from: "1.0.0")
```

### CocoaPods
```ruby
# Podfile
pod 'GenieSDK', :git => 'https://github.com/imrejaul007/hojai-ai.git', :tag => '1.0.0'
```
