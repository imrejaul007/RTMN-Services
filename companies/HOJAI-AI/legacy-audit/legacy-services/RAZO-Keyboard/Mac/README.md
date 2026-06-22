# 🖥️ RAZO Keyboard - Mac App

**System-wide AI keyboard for Mac**

---

## Features

| Feature | Status |
|---------|--------|
| Keyboard Enhancement | ✅ |
| Voice Commands | ✅ |
| Password Vault | ✅ |
| App Launcher | ✅ |
| Genie Assistant | ✅ |
| CoPilot | ✅ |
| Touch Bar | ✅ |
| Menu Bar | ✅ |

---

## Architecture

```
┌─────────────────────────────────────────┐
│              RAZO Mac App                 │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │       Menu Bar App               │   │
│  │  System Tray │ Quick Access      │   │
│  └─────────────────────────────────┘   │
│                  │                      │
│  ┌─────────────────────────────────┐   │
│  │       Keyboard Overlay           │   │
│  │  AI Suggestions │ Voice │ Grammar │   │
│  └─────────────────────────────────┘   │
│                  │                      │
│  ┌─────────────────────────────────┐   │
│  │       Background Service          │   │
│  │  Clipboard │ Snippets │ Sync      │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

---

## Setup

```bash
# Install via Homebrew
brew install razo-keyboard

# Or download from website
```

---

## Core Features

### 1. Global Keyboard Shortcuts

```swift
// Global hotkey to activate RAZO
Cmd + Shift + Space → Open RAZO

// Voice input
Cmd + Shift + V → Voice mode

// Show suggestions
Always-on (no shortcut needed)
```

### 2. Keyboard Overlay

```swift
// Show overlay on any text field
// Similar to macOS text prediction but smarter

class RazoOverlayWindow: NSWindow {
    
    override func keyDown(with event: NSEvent) {
        // Intercept keystrokes
        // Show AI suggestions
        // Handle voice input
    }
}
```

### 3. Voice Commands

```swift
// Voice typing anywhere
class VoiceInputManager {
    
    func startListening() {
        let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-IN"))
        
        recognizer?.recognitionTask(with: recognitionRequest) { result, error in
            if let text = result?.bestTranscription.formattedString {
                // Insert text at cursor
                self.insertText(text)
            }
        }
    }
    
    func insertText(_ text: String) {
        // Use NSPasteboard or CGEvent to insert text
        let source = CGEventSource(stateID: .hidSystemState)
        let pasteboard = NSPasteboard.general
        pasteboard.clearContents()
        pasteboard.setString(text, forType: .string)
        
        // Cmd+V paste
        let cmdV = CGEvent(keyboardEventSource: source, virtualKey: 0x09, keyDown: true)
        cmdV?.flags = .maskCommand
        cmdV?.post(tap: .cghidEventTap)
    }
}
```

### 4. Password Vault

```swift
// RAZO Vault for Mac
class VaultManager {
    
    func unlock(with biometric: Bool) -> Bool {
        let context = LAContext()
        return context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: "Unlock RAZO Vault")
    }
    
    func getPassword(for site: String) -> PasswordEntry? {
        return sdk.getPassword(site)
    }
    
    func autoFill(in app: String) {
        // Monitor password fields
        // Auto-fill credentials
    }
}
```

### 5. App Launcher (Spotlight-like)

```swift
// Raycast/Spotlight style launcher
class AppLauncher {
    
    func search(_ query: String) -> [SearchResult] {
        return sdk.search(query)
    }
    
    func openApp(_ appId: String) {
        // Open ecosystem apps
        switch appId {
        case "airzy": openURL("airzy://")
        case "wallet": openURL("rtnm://wallet")
        case "genie": openURL("rtnm://genie")
        default: break
        }
    }
    
    private func openURL(_ urlString: String) {
        if let url = URL(string: urlString) {
            NSWorkspace.shared.open(url)
        }
    }
}
```

### 6. Genie Integration

```swift
// Native Genie assistant
class GenieAssistant {
    
    func ask(_ command: String) -> GenieResponse {
        return sdk.askGenie(command)
    }
    
    func showGenieWindow() {
        // Floating Genie window
        // Always accessible via hotkey
    }
}
```

### 7. CoPilot Integration

```swift
// Business AI assistant
class CoPilotAssistant {
    
    func generateReport(_ topic: String) -> Report {
        return sdk.askCoPilot("generate report: \(topic)")
    }
    
    func draftEmail(_ context: String) -> Email {
        return sdk.askCoPilot("draft email: \(context)")
    }
}
```

### 8. Text Expansion (Like TextExpander)

```swift
// Custom snippets
class SnippetManager {
    
    func expand(_ trigger: String) -> String? {
        return sdk.expandSnippet(trigger)
    }
    
    // System-wide text expansion
    func registerGlobalExpansion() {
        // Monitor all keystrokes
        // Expand snippets automatically
    }
}

// Built-in snippets
// "dominos" → "Order from Domino's Pizza"
// "ola" → "Book Ola cab"
// "airzy" → "Open Airzy app"
```

### 9. Grammar Checker

```swift
// Grammarly-like grammar checking
class GrammarChecker {
    
    func checkGrammar(_ text: String) -> [GrammarCorrection] {
        return sdk.cleanupText(text).grammar
    }
    
    func suggestTone(_ text: String, tone: Tone) -> String {
        return sdk.correctGrammar(text, tone: tone)
    }
    
    enum Tone {
        case formal
        case friendly
        case executive
        case sales
    }
}
```

### 10. Menu Bar App

```swift
// Menu bar integration
class RazoMenuBar: NSStatusBar {
    
    func setup() {
        let button = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        button.button?.image = NSImage(systemSymbolName: "keyboard")
        
        button.menu = createMenu()
    }
    
    func createMenu() -> NSMenu {
        let menu = NSMenu()
        menu.addItem("Open RAZO")
        menu.addItem("Voice Input")
        menu.addItem("Vault")
        menu.addItem("Settings")
        menu.addItem(NSMenuItem.separator())
        menu.addItem("Quit RAZO")
        return menu
    }
}
```

### 11. Touch Bar Support

```swift
// Touch Bar buttons
class TouchBarController: NSObject, NSTouchBarDelegate {
    
    func touchBar(_ touchBar: NSTouchBar, makeItemForIdentifier identifier: NSTouchBarItem.Identifier) -> NSTouchBarItem? {
        switch identifier {
        case .voice:
            return makeButton("🎤", action: #selector(startVoice))
        case .snippets:
            return makeButton("📝", action: #selector(showSnippets))
        case .genie:
            return makeButton("🤖", action: #selector(askGenie))
        default:
            return nil
        }
    }
}
```

---

## System Integration

### Global Keyboard Hook

```swift
// Monitor keystrokes system-wide
class GlobalKeyboardMonitor {
    
    func startMonitoring() {
        // Use CGEvent tap to monitor keystrokes
        let eventMask = (1 << CGEventType.keyDown.rawValue)
        let tap = CGEvent.tapCreate(
            tap: .cgSessionEventTap,
            place: .headInsertEventTap,
            options: .defaultTap,
            eventMask: CGEventMask(eventMask),
            callback: { (proxy, type, event, refcon) -> Unmanaged<CGEvent>? in
                // Process keystroke
                return Unmanaged.passRetained(event)
            },
            userInfo: nil
        )
        
        let runLoopSource = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, tap, 0)
        CFRunLoopAddSource(CFRunLoopGetCurrent(), runLoopSource, .commonModes)
        CGEvent.tapEnable(tap: tap!, enable: true)
    }
}
```

### Accessibility Permissions

```swift
// Required for global keyboard monitoring
// User must enable in System Preferences > Security & Privacy > Accessibility
```

---

## Sync

```swift
class SyncManager {
    
    private var syncTimer: Timer?
    
    func startSync() {
        // Sync every 30 seconds
        syncTimer = Timer.scheduledTimer(withTimeInterval: 30, repeats: true) { [weak self] _ in
            try? await self?.sdk.sync()
        }
    }
    
    func getSyncStatus() -> SyncStatus {
        return sdk.getSyncStatus()
    }
}
```

---

## Menu Bar Features

| Feature | Description |
|---------|-------------|
| Quick Access | Open RAZO from menu bar |
| Voice | Start voice input |
| Vault | Access passwords |
| Snippets | View/manage snippets |
| Settings | Configure RAZO |
| Sync Status | Show sync indicator |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| ⌘ + ⇧ + Space | Open RAZO |
| ⌘ + ⇧ + V | Voice input |
| ⌘ + ⇧ + S | Show snippets |
| ⌘ + ⇧ + G | Ask Genie |
| ⌘ + ⇧ + C | Ask CoPilot |
| ⌘ + ⇧ + L | Open vault |
| ⌘ + ⇧ + . | Settings |

---

## Publish

```bash
# Build
xcodebuild -project RAZO.xcodeproj -scheme RAZO -configuration Release build

# Create DMG
create-dmg RAZO.app

# Sign for distribution
codesign -s "Developer ID Application: RTNM Digital" RAZO.dmg

# Notarize
xcrun notarytool submit RAZO.dmg --apple-id "dev@rtnm.digital" --password "xxx"
```

---

**Port:** 4631-4636 (RAZO Cloud services)