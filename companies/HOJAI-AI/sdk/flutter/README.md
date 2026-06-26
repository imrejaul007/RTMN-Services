# genie_client for Flutter

Official Flutter SDK for HOJAI Genie AI.

## Quick Start

```dart
import 'package:genie_client/genie_client.dart';

final genie = GenieClient();

// Configure
await genie.configure(apiKey: 'YOUR_API_KEY');

// Send a message
final response = await genie.sendMessage("What's on my calendar today?");
print(response.text);

// Voice session
final session = await genie.startVoiceSession(VoiceConfig(
  sampleRate: 16000,
  language: 'en-US',
));
session.transcriptStream.listen((text) => print('User: $text'));
session.responseStream.listen((r) => print('Genie: ${r.text}'));
```

## Installation

```yaml
# pubspec.yaml
dependencies:
  genie_client: ^1.0.0
```

```bash
flutter pub add genie_client
```
