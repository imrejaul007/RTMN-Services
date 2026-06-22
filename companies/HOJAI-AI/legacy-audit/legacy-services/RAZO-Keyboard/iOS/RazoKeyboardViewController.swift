import UIKit
import Speech
import LocalAuthentication
import AuthenticationServices

// MARK: - RAZO Keyboard View Controller v2.0

/**
 * RAZO Keyboard Extension v2.0
 *
 * Connected to all HOJAI voice products:
 * - Genie (briefing service)
 * - Intelligence (analytics)
 * - Whisper (voice-to-text)
 * - Predictive Engine (transformer-based)
 * - Smart Suggestions
 * - Action Cards
 * - Command Bar
 *
 * Features:
 * - Multi-language support (en/hi/en-hi)
 * - Context-aware predictions
 * - Real-time suggestions
 * - Voice input with Whisper integration
 * - Genie mode activation
 * - Offline mode with sync
 * - E2E encryption
 *
 * Limitations on iOS:
 * - Cannot read app context (Apple restriction)
 * - Cannot access network directly (requires Open Access)
 * - Limited to document proxy for text
 */
class RazoKeyboardViewController: UIInputViewController {

    // MARK: - Constants

    private struct Constants {
        // Integration Gateway (v2.0 - Unified API)
        static let gatewayURL = "http://localhost:4601"

        // Legacy service URLs (for fallback)
        static let predictiveURL = "http://localhost:4640/predict"
        static let cloudSyncURL = "http://localhost:4631/sync"

        // Request configuration
        static let requestTimeout: TimeInterval = 5.0
        static let maxRetries = 2
    }

    // MARK: - Properties

    private var keyboardView: RazoKeyboardView!
    private var predictions: [String] = []
    private var suggestions: [[String: Any]] = []
    private var actions: [[String: Any]] = []
    private var commands: [[String: Any]] = []
    private var isShifted = false
    private var isCapsLock = false

    // Voice
    private var speechRecognizer: SFSpeechRecognizer?
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var speechRecognitionTask: SFSpeechRecognitionTask?
    private var audioEngine: AVAudioEngine?
    private var isListening = false

    // State
    private var currentState: KeyboardState = .default
    private var currentLanguage = "en"
    private var conversationContext: [[String: Any]] = []

    // Session
    private var userId: String = ""
    private var sessionToken: String?
    private var isOnline = true

    enum KeyboardState {
        case `default`
        case voice
        case genie
        case symbols
        case numbers
        case suggestions
        case actions
        case commands
    }

    // MARK: - Lifecycle

    override func viewDidLoad() {
        super.viewDidLoad()
        initializeSession()
        setupKeyboardView()
        setupSpeechRecognizer()
    }

    override func viewWillLayoutSubviews() {
        super.viewWillLayoutSubviews()
        keyboardView.frame = view.bounds
    }

    override func textWillChange(_ textInput: UITextInput?) {
        // Called before text changes
    }

    override func textDidChange(_ textInput: UITextInput?) {
        // Update predictions based on current text
        updatePredictions()
        updateSuggestions()
    }

    // MARK: - Session Management

    private func initializeSession() {
        // Generate or retrieve user ID
        userId = UserDefaults.standard.string(forKey: "razo_userId") ?? generateUserId()
        sessionToken = UserDefaults.standard.string(forKey: "razo_sessionToken")

        // Initialize with gateway
        Task {
            await initializeGatewaySession()
        }
    }

    private func generateUserId() -> String {
        let id = "ios_\(Int(Date().timeIntervalSince1970))_\(Int.random(in: 1000...9999))"
        UserDefaults.standard.set(id, forKey: "razo_userId")
        return id
    }

    private func initializeGatewaySession() async {
        do {
            let body: [String: Any] = [
                "userId": userId,
                "platform": "ios",
                "keyboardVersion": "2.0"
            ]

            if let response = try await gatewayRequest(endpoint: "/session/init", body: body) {
                if let token = response["sessionToken"] as? String {
                    sessionToken = token
                    UserDefaults.standard.set(token, forKey: "razo_sessionToken")
                }

                // Track analytics
                trackAnalytics(event: "session_init", data: [
                    "platform": "ios",
                    "timestamp": Int(Date().timeIntervalSince1970 * 1000)
                ])
            }
        } catch {
            isOnline = false
        }
    }

    // MARK: - Setup

    private func setupKeyboardView() {
        keyboardView = RazoKeyboardView(frame: view.bounds)
        keyboardView.delegate = self
        view.addSubview(keyboardView)
    }

    private func setupSpeechRecognizer() {
        speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
        audioEngine = AVAudioEngine()
    }

    // MARK: - Text Input

    func insertCharacter(_ char: String) {
        let charToInsert = isShifted || isCapsLock ? char.uppercased() : char.lowercased()
        textDocumentProxy.insertText(charToInsert)

        if isShifted && !isCapsLock {
            isShifted = false
            keyboardView.updateShiftState(shifted: false, capsLock: false)
        }
    }

    func insertSpace() {
        textDocumentProxy.insertText(" ")
    }

    func deleteBackward() {
        textDocumentProxy.deleteBackward()
        // Update predictions after deletion
        updatePredictions()
    }

    func insertNewline() {
        textDocumentProxy.insertText("\n")

        // Track message sent
        if let context = textDocumentProxy.documentContextBeforeInput {
            let words = context.components(separatedBy: .whitespacesAndNewlines)
            let lastMessage = words.joined(separator: " ")

            trackAnalytics(event: "message_sent", data: [
                "textLength": lastMessage.count,
                "language": currentLanguage
            ])

            // Add to conversation context
            conversationContext.append([
                "role": "user",
                "content": lastMessage,
                "timestamp": Int(Date().timeIntervalSince1970 * 1000)
            ])
        }
    }

    // MARK: - Predictions

    private func updatePredictions() {
        guard let context = textDocumentProxy.documentContextBeforeInput else {
            keyboardView.updatePredictions([])
            return
        }

        // Get last word for prediction
        let words = context.components(separatedBy: .whitespacesAndNewlines)
        let lastWord = words.last ?? ""

        // Request predictions from backend
        requestPredictions(for: lastWord)
    }

    private func requestPredictions(for word: String) {
        Task {
            let newPredictions = await fetchPredictions(for: word)
            await MainActor.run {
                keyboardView.updatePredictions(newPredictions)
            }
        }
    }

    private func fetchPredictions(for word: String) async -> [String] {
        // Try gateway first
        do {
            let body: [String: Any] = [
                "text": word,
                "userId": userId,
                "language": currentLanguage,
                "context": conversationContext
            ]

            if let response = try await gatewayRequest(endpoint: "/predict", body: body) {
                if let predictions = response["predictions"] as? [String] {
                    return predictions
                }
            }
        } catch {
            // Fallback to direct service
        }

        // Fallback to direct predictive service
        return await fetchPredictionsDirect(for: word)
    }

    private func fetchPredictionsDirect(for word: String) async -> [String] {
        return await withCheckedContinuation { continuation in
            guard let url = URL(string: Constants.predictiveURL) else {
                continuation.resume(returning: [])
                return
            }

            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.timeoutInterval = Constants.requestTimeout

            let body: [String: Any] = [
                "text": word,
                "userId": userId,
                "language": currentLanguage
            ]

            do {
                request.httpBody = try JSONSerialization.data(withJSONObject: body)
            } catch {
                continuation.resume(returning: [])
                return
            }

            URLSession.shared.dataTask(with: request) { data, response, error in
                guard let data = data,
                      let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                      let predictions = json["predictions"] as? [String] else {
                    continuation.resume(returning: self.getLocalPredictions(for: word))
                    return
                }
                continuation.resume(returning: predictions)
            }.resume()
        }
    }

    private func getLocalPredictions(for word: String) -> [String] {
        // Common completions
        let completions: [String: [String]] = [
            "": ["the", "to", "and", "is", "it"],
            "th": ["the", "that", "this", "they", "there"],
            "wh": ["what", "when", "where", "which", "while"],
            "he": ["hello", "hey", "help", "here", "health"],
            "ha": ["have", "has", "had", "happy", "happen"],
            "go": ["going", "good", "got", "gone", "google"],
            "ca": ["can", "can't", "call", "came", "case"],
            "wo": ["won't", "would", "work", "world", "won"],
            "be": ["been", "because", "best", "better", "before"],
            "ka": ["karna", "kar", "ke", "ki", "ko"],
            "ye": ["yes", "yeah", "yeh", "year", "yesterday"],
            "mu": ["much", "must", "music", "museum", "mumbai"]
        ]

        let lowerWord = word.lowercased()
        if let predictions = completions[lowerWord] {
            return predictions
        }

        // Check for partial matches
        for (key, value) in completions {
            if lowerWord.hasPrefix(key) || key.hasPrefix(lowerWord) {
                return value
            }
        }

        return []
    }

    func selectPrediction(_ prediction: String) {
        // Get current word
        guard let context = textDocumentProxy.documentContextBeforeInput else { return }

        let words = context.components(separatedBy: .whitespacesAndNewlines)
        let lastWord = words.last ?? ""

        // Delete partial word
        for _ in 0..<lastWord.count {
            textDocumentProxy.deleteBackward()
        }

        // Insert prediction
        let textToInsert = lastWord + prediction
        textDocumentProxy.insertText(textToInsert)

        // Track prediction selection
        trackAnalytics(event: "prediction_selected", data: [
            "prediction": prediction,
            "language": currentLanguage
        ])
    }

    // MARK: - Suggestions

    private func updateSuggestions() {
        guard let context = textDocumentProxy.documentContextBeforeInput,
              context.count > 3 else {
            return
        }

        Task {
            let newSuggestions = await fetchSuggestions(for: context)
            await MainActor.run {
                keyboardView.updateSuggestions(newSuggestions)
            }
        }
    }

    private func fetchSuggestions(for text: String) async -> [[String: Any]] {
        do {
            let body: [String: Any] = [
                "text": text,
                "userId": userId,
                "language": currentLanguage,
                "context": conversationContext
            ]

            if let response = try await gatewayRequest(endpoint: "/suggestions", body: body) {
                if let suggestions = response["suggestions"] as? [[String: Any]] {
                    return suggestions
                }
            }
        } catch {
            // Silently fail
        }
        return []
    }

    func selectSuggestion(_ suggestion: [String: Any]) {
        guard let type = suggestion["type"] as? String,
              let content = suggestion["content"] as? String else { return }

        switch type {
        case "text":
            textDocumentProxy.insertText(content)
        case "action":
            executeAction(suggestion)
        case "command":
            executeCommand(suggestion)
        default:
            textDocumentProxy.insertText(content)
        }

        trackAnalytics(event: "suggestion_selected", data: suggestion)
    }

    // MARK: - Actions

    private func loadActions() {
        Task {
            let newActions = await fetchActions()
            await MainActor.run {
                keyboardView.updateActions(newActions)
            }
        }
    }

    private func fetchActions() async -> [[String: Any]] {
        do {
            let body: [String: Any] = [
                "userId": userId,
                "context": textDocumentProxy.documentContextBeforeInput ?? ""
            ]

            if let response = try await gatewayRequest(endpoint: "/actions", body: body) {
                if let actions = response["actions"] as? [[String: Any]] {
                    return actions
                }
            }
        } catch {
            // Silently fail
        }
        return []
    }

    private func executeAction(_ action: [String: Any]) {
        guard let actionType = action["type"] as? String else { return }

        Task {
            do {
                let body: [String: Any] = [
                    "actionType": actionType,
                    "actionData": action["data"] ?? [:],
                    "userId": userId
                ]

                if let response = try await gatewayRequest(endpoint: "/actions/execute", body: body) {
                    if let result = response["result"] as? String {
                        await MainActor.run {
                            textDocumentProxy.insertText(result)
                        }
                    }
                }
            } catch {
                // Handle error
            }
        }
    }

    // MARK: - Commands

    private func loadCommands() {
        Task {
            let newCommands = await fetchCommands()
            await MainActor.run {
                keyboardView.updateCommands(newCommands)
            }
        }
    }

    private func fetchCommands() async -> [[String: Any]] {
        do {
            let body: [String: Any] = [
                "userId": userId,
                "query": textDocumentProxy.documentContextBeforeInput ?? ""
            ]

            if let response = try await gatewayRequest(endpoint: "/commands", body: body) {
                if let commands = response["commands"] as? [[String: Any]] {
                    return commands
                }
            }
        } catch {
            // Silently fail
        }
        return []
    }

    private func executeCommand(_ command: [String: Any]) {
        guard let commandId = command["id"] as? String else { return }

        Task {
            do {
                let body: [String: Any] = [
                    "commandId": commandId,
                    "commandData": command["data"] ?? [:],
                    "userId": userId
                ]

                if let response = try await gatewayRequest(endpoint: "/commands/execute", body: body) {
                    if let result = response["result"] as? String {
                        await MainActor.run {
                            textDocumentProxy.insertText(result)
                        }
                    }
                }
            } catch {
                // Handle error
            }
        }
    }

    // MARK: - Voice Input

    func startVoiceInput() {
        // Check permissions
        SFSpeechRecognizer.requestAuthorization { [weak self] status in
            DispatchQueue.main.async {
                switch status {
                case .authorized:
                    self?.startRecording()
                case .denied, .restricted:
                    self?.showPermissionAlert()
                case .notDetermined:
                    self?.showPermissionAlert()
                @unknown default:
                    break
                }
            }
        }
    }

    private func startRecording() {
        guard let speechRecognizer = speechRecognizer,
              let audioEngine = audioEngine else { return }

        // Cancel any existing task
        speechRecognitionTask?.cancel()
        speechRecognitionTask = nil

        // Configure audio session
        let audioSession = AVAudioSession.sharedInstance()
        do {
            try audioSession.setCategory(.record, mode: .measurement, options: .duckOthers)
            try audioSession.setActive(true, options: .notifyOthersOnDeactivation)
        } catch {
            showError("Failed to configure audio session")
            return
        }

        // Create recognition request
        recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
        guard let recognitionRequest = recognitionRequest else { return }

        recognitionRequest.shouldReportPartialResults = true

        // Start recognition task
        let inputNode = audioEngine.inputNode
        let recordingFormat = inputNode.outputFormat(forBus: 0)

        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { buffer, _ in
            self.recognitionRequest?.append(buffer)
        }

        audioEngine.prepare()

        do {
            try audioEngine.start()
            isListening = true
            currentState = .voice
            keyboardView.showVoiceUI()

            speechRecognitionTask = speechRecognizer.recognitionTask(with: recognitionRequest) { [weak self] result, error in
                if let result = result {
                    let transcript = result.bestTranscription.formattedString
                    self?.keyboardView.updateTranscript(transcript)

                    if result.isFinal {
                        self?.processVoiceInput(transcript)
                    }
                }

                if error != nil || result?.isFinal == true {
                    self?.stopRecording()
                }
            }
        } catch {
            showError("Failed to start recording")
        }
    }

    private func stopRecording() {
        audioEngine?.stop()
        audioEngine?.inputNode.removeTap(onBus: 0)
        recognitionRequest?.endAudio()
        speechRecognitionTask?.cancel()
        speechRecognitionTask = nil
        isListening = false
        currentState = .default
        keyboardView.hideVoiceUI()
    }

    private func processVoiceInput(_ text: String) {
        // Check for wake words
        let lowerText = text.lowercased()

        if lowerText.contains("hey genie") || lowerText.contains("ok genie") {
            // Route to Genie
            let command = text
                .replacingOccurrences(of: "hey genie", with: "")
                .replacingOccurrences(of: "ok genie", with: "")
                .trimmingCharacters(in: .whitespaces)
            executeGenieCommand(command)
        } else if lowerText.contains("hey razo") || lowerText.contains("hey rezo") {
            // Route to CoPilot
            let command = text
                .replacingOccurrences(of: "hey razo", with: "")
                .replacingOccurrences(of: "hey rezo", with: "")
                .trimmingCharacters(in: .whitespaces)
            executeCoPilotCommand(command)
        } else {
            // Voice typing with Whisper processing
            processVoiceWithWhisper(text)
        }
    }

    private func processVoiceWithWhisper(_ text: String) {
        Task {
            do {
                let body: [String: Any] = [
                    "text": text,
                    "userId": userId,
                    "language": currentLanguage
                ]

                if let response = try await gatewayRequest(endpoint: "/whisper/process", body: body) {
                    let corrected = response["corrected"] as? String ?? text
                    let confidence = response["confidence"] as? Double ?? 1.0

                    await MainActor.run {
                        if confidence > 0.9 && corrected != text {
                            // Apply correction
                            insertVoiceText(corrected)
                        } else {
                            insertVoiceText(text)
                        }
                    }

                    // Track analytics
                    trackAnalytics(event: "voice_input", data: [
                        "original": text,
                        "corrected": corrected,
                        "language": currentLanguage
                    ])
                } else {
                    insertVoiceText(text)
                }
            } catch {
                insertVoiceText(text)
            }
        }
    }

    private func insertVoiceText(_ text: String) {
        textDocumentProxy.insertText(text)
    }

    private func executeGenieCommand(_ command: String) {
        Task {
            do {
                let body: [String: Any] = [
                    "userId": userId,
                    "context": conversationContext,
                    "language": currentLanguage,
                    "command": command
                ]

                if let response = try await gatewayRequest(endpoint: "/genie/briefing", body: body) {
                    let briefing = response["briefing"] as? String ?? ""
                    await MainActor.run {
                        keyboardView.showGenieResponse(briefing)
                    }
                }

                trackAnalytics(event: "genie_activated", data: [
                    "command": command,
                    "timestamp": Int(Date().timeIntervalSince1970 * 1000)
                ])
            } catch {
                await MainActor.run {
                    keyboardView.showGenieResponse("Genie service unavailable")
                }
            }
        }
    }

    private func executeCoPilotCommand(_ command: String) {
        // In production, call CoPilot API
        keyboardView.showGenieResponse(command)
    }

    // MARK: - Genie Mode

    func activateGenieMode() {
        currentState = .genie
        keyboardView.setState(currentState)

        Task {
            do {
                let body: [String: Any] = [
                    "userId": userId,
                    "context": conversationContext,
                    "language": currentLanguage
                ]

                if let response = try await gatewayRequest(endpoint: "/genie/briefing", body: body) {
                    let briefing = response["briefing"] as? String ?? ""
                    await MainActor.run {
                        keyboardView.showGenieBriefing(briefing)
                    }
                }
            } catch {
                // Handle error
            }
        }
    }

    // MARK: - Gateway Communication

    private func gatewayRequest(endpoint: String, body: [String: Any]) async throws -> [String: Any]? {
        guard let url = URL(string: Constants.gatewayURL + endpoint) else {
            throw NSError(domain: "RazoKeyboard", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"])
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(sessionToken ?? "")", forHTTPHeaderField: "Authorization")
        request.timeoutInterval = Constants.requestTimeout

        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            isOnline = false
            return nil
        }

        isOnline = true
        return try JSONSerialization.jsonObject(with: data) as? [String: Any]
    }

    // MARK: - Analytics

    private func trackAnalytics(event: String, data: [String: Any]) {
        Task {
            do {
                var analyticsData = data
                analyticsData["event"] = event
                analyticsData["userId"] = userId
                analyticsData["timestamp"] = Int(Date().timeIntervalSince1970 * 1000)

                _ = try await gatewayRequest(endpoint: "/analytics/track", body: analyticsData)
            } catch {
                // Analytics failure is non-critical
            }
        }
    }

    // MARK: - App Launcher

    func launchApp(_ appId: String) {
        // Open URL scheme
        let urlString = getDeepLink(for: appId)
        if let url = URL(string: urlString) {
            let selector = NSSelectorFromString("openURL:")
            var responder: UIResponder? = self
            while let r = responder {
                if r.responds(to: selector) {
                    r.perform(selector, with: url)
                    break
                }
                responder = r.next
            }
        }
    }

    private func getDeepLink(for appId: String) -> String {
        let deepLinks: [String: String] = [
            "rez-consumer": "rezconsumer://",
            "rez-merchant": "rezmerchant://",
            "risacare": "risacare://",
            "stayown": "stayown://",
            "corpperks": "corpperks://",
            "khairmove": "khairmove://",
            "ridza": "ridza://"
        ]
        return deepLinks[appId] ?? "rezconsumer://"
    }

    // MARK: - Alerts

    private func showPermissionAlert() {
        let alert = UIAlertController(
            title: "Voice Permission Required",
            message: "Please enable Speech Recognition in Settings to use voice input.",
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "Settings", style: .default) { _ in
            if let url = URL(string: UIApplication.openSettingsURLString) {
                UIApplication.shared.open(url)
            }
        })
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        present(alert, animated: true)
    }

    private func showError(_ message: String) {
        let alert = UIAlertController(title: "Error", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        present(alert, animated: true)
    }

    // MARK: - Cleanup

    override func viewWillDisappear() {
        super.viewWillDisappear()
        stopRecording()

        // Sync offline data before exit
        if !isOnline {
            syncOfflineData()
        }
    }

    private func syncOfflineData() {
        guard let pendingSync = UserDefaults.standard.string(forKey: "razo_pendingSync") else {
            return
        }

        Task {
            do {
                let body: [String: Any] = [
                    "data": pendingSync,
                    "userId": userId
                ]

                if let response = try await gatewayRequest(endpoint: "/sync", body: body) {
                    if response["success"] as? Bool == true {
                        UserDefaults.standard.removeObject(forKey: "razo_pendingSync")
                    }
                }
            } catch {
                // Sync failed, will retry next time
            }
        }
    }
}

// MARK: - RazoKeyboardViewDelegate

extension RazoKeyboardViewController: RazoKeyboardViewDelegate {
    func keyboardView(_ view: RazoKeyboardView, didTapKey key: String) {
        switch key {
        case "shift":
            toggleShift()
        case "backspace":
            deleteBackward()
        case "123", "ABC":
            toggleSymbols()
        case "globe":
            advanceToNextInputMode()
        case "voice":
            startVoiceInput()
        case "genie":
            activateGenieMode()
        case "space":
            insertSpace()
        case "return":
            insertNewline()
        default:
            insertCharacter(key)
        }
    }

    func keyboardView(_ view: RazoKeyboardView, didSelectPrediction prediction: String) {
        selectPrediction(prediction)
    }

    func keyboardView(_ view: RazoKeyboardView, didSelectSuggestion suggestion: [String: Any]) {
        selectSuggestion(suggestion)
    }

    func keyboardView(_ view: RazoKeyboardView, didSelectAction action: [String: Any]) {
        executeAction(action)
    }

    func keyboardView(_ view: RazoKeyboardView, didSelectCommand command: [String: Any]) {
        executeCommand(command)
    }

    func keyboardView(_ view: RazoKeyboardView, didTapApp appId: String) {
        launchApp(appId)
    }

    private func toggleShift() {
        if isCapsLock {
            isCapsLock = false
            isShifted = false
        } else if isShifted {
            isCapsLock = true
        } else {
            isShifted = true
        }
        keyboardView.updateShiftState(shifted: isShifted, capsLock: isCapsLock)
    }

    private func toggleSymbols() {
        currentState = currentState == .symbols ? .default : .symbols
        keyboardView.setState(currentState)
    }
}
