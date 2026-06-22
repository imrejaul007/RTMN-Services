# 🪟 RAZO Keyboard - Windows App

**System-wide AI keyboard for Windows**

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
| System Tray | ✅ |
| Windows Hello | ✅ |

---

## Architecture

```
┌─────────────────────────────────────────┐
│            RAZO Windows App               │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │       System Tray               │   │
│  │  Quick Access │ Notifications    │   │
│  └─────────────────────────────────┘   │
│                  │                      │
│  ┌─────────────────────────────────┐   │
│  │       Keyboard Overlay           │   │
│  │  AI Suggestions │ Voice │ Grammar │   │
│  └─────────────────────────────────┘   │
│                  │                      │
│  ┌─────────────────────────────────┐   │
│  │       Windows Service            │   │
│  │  Global Hooks │ Auto-fill        │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

---

## Setup

```powershell
# Install via winget
winget install RTNM.RAZO

# Or download installer
```

---

## Core Features

### 1. Global Keyboard Hook

```csharp
// Global keyboard hook for Windows
public class GlobalKeyboardHook {
    
    private const int WH_KEYBOARD_LL = 13;
    private const int WM_KEYDOWN = 0x0100;
    
    private static LowLevelKeyboardProc proc = HookCallback;
    private static IntPtr hookId = IntPtr.Zero;
    
    public void Start() {
        hookId = SetHook(proc);
    }
    
    private IntPtr SetHook(LowLevelKeyboardProc proc) {
        using (var curProcess = Process.GetCurrentProcess())
        using (var curModule = curProcess.MainModule) {
            return SetWindowsHookEx(WH_KEYBOARD_LL, proc,
                GetModuleHandle(curModule?.ModuleName), 0);
        }
    }
    
    private IntPtr HookCallback(int nCode, IntPtr wParam, IntPtr lParam) {
        if (nCode >= 0 && wParam == (IntPtr)WM_KEYDOWN) {
            int vkCode = Marshal.ReadInt32(lParam);
            
            // Check for hotkey
            if (vkCode == VK_SPACE && Control.ModifierKeys == Keys.Control) {
                ShowRAZO();
            }
        }
        return CallNextHookEx(hookId, nCode, wParam, lParam);
    }
}
```

### 2. Keyboard Overlay

```csharp
// Transparent overlay window
public partial class RazoOverlay : Form {
    
    public RazoOverlay() {
        // Transparent overlay
        this.BackColor = Color.Black;
        this.TransparencyKey = Color.Black;
        this.Opacity = 0.8;
        this.TopMost = true;
        this.FormBorderStyle = FormBorderStyle.None;
        
        // Show near cursor
        this.Location = Cursor.Position;
    }
}
```

### 3. Voice Input

```csharp
// Windows Speech Recognition
public class VoiceInputManager {
    
    private SpeechRecognitionEngine recognizer;
    
    public void StartListening() {
        recognizer = new SpeechRecognitionEngine(
            new CultureInfo("en-IN"));
        
        recognizer.LoadGrammar(new DictationGrammar());
        
        recognizer.SpeechRecognized += (s, e) => {
            string text = e.Result.Text;
            InsertText(text);
        };
        
        recognizer.SetInputToDefaultAudioDevice();
        recognizer.RecognizeAsync(RecognizeMode.Multiple);
    }
    
    private void InsertText(string text) {
        // Simulate typing
        SendKeys.SendWait(text);
    }
}
```

### 4. Password Vault (Windows Hello)

```csharp
// Windows Hello integration
public class VaultManager {
    
    private Windows.Security.Credentials.PasswordVault vault;
    
    public async Task<bool> Unlock() {
        // Windows Hello biometric
        var keyCredentialManager = Windows.Security.Credentials.KeyCredentialManager;
        
        var result = await keyCredentialManager.RequestCreateAsync(
            "RAZO_Vault",
            Windows.Security.Credentials.KeyCredentialCreationOption.ReplaceExisting);
        
        return result.Status == Windows.Security.Credentials.KeyCredentialStatus.Success;
    }
    
    public async Task<string> GetPassword(string site) {
        var credential = await Windows.Security.Credentials.PasswordVault.RetrieveAsync(
            "RAZO", site);
        return credential.Password;
    }
}
```

### 5. App Launcher (Start Menu style)

```csharp
// Raycast/Spotlight style launcher
public class AppLauncher {
    
    public List<SearchResult> Search(string query) {
        return sdk.Search(query);
    }
    
    public void LaunchApp(string appId) {
        // Launch ecosystem apps
        switch (appId) {
            case "airzy":
                Process.Start("airzy://");
                break;
            case "wallet":
                Process.Start("rtnm://wallet");
                break;
            case "genie":
                Process.Start("rtnm://genie");
                break;
            // ...
        }
    }
}
```

### 6. Genie Integration

```csharp
// Native Genie assistant
public class GenieAssistant {
    
    public async Task<GenieResponse> Ask(string command) {
        return await sdk.AskGenie(command);
    }
    
    public void ShowGenieWindow() {
        // Floating Genie window
        var genieForm = new GenieForm();
        genieForm.Show();
    }
}
```

### 7. CoPilot Integration

```csharp
// Business AI assistant
public class CoPilotAssistant {
    
    public async Task<Report> GenerateReport(string topic) {
        return await sdk.AskCoPilot($"generate report: {topic}");
    }
    
    public async Task<Email> DraftEmail(string context) {
        return await sdk.AskCoPilot($"draft email: {context}");
    }
}
```

### 8. Auto-fill

```csharp
// Password auto-fill
public class AutoFillService {
    
    public async Task AutoFillCredential(string site) {
        var credential = await vault.GetPassword(site);
        
        if (credential != null) {
            // Simulate typing
            SendKeys.SendWait(credential.Username);
            SendKeys.SendWait("{TAB}");
            SendKeys.SendWait(credential.Password);
            SendKeys.SendWait("{ENTER}");
        }
    }
}
```

### 9. System Tray

```csharp
// System tray integration
public class RazoTrayIcon {
    
    public void Setup() {
        var notifyIcon = new NotifyIcon {
            Icon = System.Drawing.SystemIcons.Application,
            Visible = true
        };
        
        var contextMenu = new ContextMenuStrip();
        contextMenu.Items.Add("Open RAZO", null, (s, e) => ShowMainWindow());
        contextMenu.Items.Add("Voice Input", null, (s, e) => StartVoiceInput());
        contextMenu.Items.Add("Vault", null, (s, e) => OpenVault());
        contextMenu.Items.Add("-");
        contextMenu.Items.Add("Settings", null, (s, e) => OpenSettings());
        contextMenu.Items.Add("Quit", null, (s, e) => Application.Exit());
        
        notifyIcon.ContextMenuStrip = contextMenu;
    }
}
```

### 10. Grammar Checker

```csharp
// Grammarly-like grammar checking
public class GrammarChecker {
    
    public List<GrammarCorrection> CheckGrammar(string text) {
        var result = sdk.CleanupText(text);
        return result.Grammar;
    }
    
    public string SuggestTone(string text, Tone tone) {
        return sdk.CorrectGrammar(text, tone);
    }
}

public enum Tone {
    Formal,
    Friendly,
    Executive,
    Sales
}
```

---

## Global Hotkeys

| Hotkey | Action |
|--------|--------|
| Ctrl + Shift + Space | Open RAZO |
| Ctrl + Shift + V | Voice input |
| Ctrl + Shift + S | Show snippets |
| Ctrl + Shift + G | Ask Genie |
| Ctrl + Shift + C | Ask CoPilot |
| Ctrl + Shift + L | Open vault |
| Ctrl + Shift + . | Settings |

---

## Windows Integration

### Startup

```csharp
// Add to startup
Microsoft.Win32.Registry.CurrentUser.OpenSubKey(
    @"SOFTWARE\Microsoft\Windows\CurrentVersion\Run", true)
.SetValue("RAZO", Application.ExecutablePath);
```

### Accessibility

```csharp
// Required for global hooks
// User must enable in Windows Settings > Accessibility
```

---

## Publish

```powershell
# Build
dotnet publish -c Release -r win-x64 --self-contained

# Create installer (Inno Setup)
iscc installer.iss

# Sign
signtool sign /f certificate.pfx /p password RAZO.msi
```

---

**Port:** 4631-4636 (RAZO Cloud services)