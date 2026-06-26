import Foundation
import AVFoundation

// MARK: - Error Types

public enum GenieError: LocalizedError {
    case networkError(underlying: Error)
    case authError(message: String)
    case apiError(code: String, message: String)
    case encodingError
    case decodingError(underlying: Error)
    case unknown(message: String)

    public var errorDescription: String? {
        switch self {
        case .networkError(let e): return "Network error: \(e.localizedDescription)"
        case .authError(let m): return "Auth error: \(m)"
        case .apiError(_, let m): return m
        case .encodingError: return "Failed to encode request"
        case .decodingError(let e): return "Failed to decode response: \(e.localizedDescription)"
        case .unknown(let m): return m
        }
    }
}

// MARK: - Data Models

public struct GenieResponse: Codable {
    public let responseId: String
    public let text: String
    public let actions: [GenieAction]?
    public let context: [String: AnyCodable]?
    public let timestamp: String?

    enum CodingKeys: String, CodingKey {
        case responseId, text, actions, context, timestamp
    }

    public init(responseId: String, text: String, actions: [GenieAction]?, context: [String: AnyCodable]?, timestamp: String?) {
        self.responseId = responseId
        self.text = text
        self.actions = actions
        self.context = context
        self.timestamp = timestamp
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        responseId = try container.decode(String.self, forKey: .responseId)
        text = try container.decode(String.self, forKey: .text)
        actions = try container.decodeIfPresent([GenieAction].self, forKey: .actions)
        context = try container.decodeIfPresent([String: AnyCodable].self, forKey: .context)
        timestamp = try container.decodeIfPresent(String.self, forKey: .timestamp)
    }
}

public struct GenieAction: Codable {
    public let type: String
    public let payload: [String: AnyCodable]?

    public init(type: String, payload: [String: AnyCodable]?) {
        self.type = type
        self.payload = payload
    }
}

/// A Codable wrapper for arbitrary JSON values
public struct AnyCodable: Codable {
    public let value: Any

    public init(_ value: Any) {
        self.value = value
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let bool = try? container.decode(Bool.self) { value = bool }
        else if let int = try? container.decode(Int.self) { value = int }
        else if let double = try? container.decode(Double.self) { value = double }
        else if let string = try? container.decode(String.self) { value = string }
        else if let array = try? container.decode([AnyCodable].self) { value = array.map { $0.value } }
        else if let dict = try? container.decode([String: AnyCodable].self) { value = dict.mapValues { $0.value } }
        else { value = NSNull() }
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch value {
        case let bool as Bool: try container.encode(bool)
        case let int as Int: try container.encode(int)
        case let double as Double: try container.encode(double)
        case let string as String: try container.encode(string)
        case let array as [Any]: try container.encode(array.map { AnyCodable($0) })
        case let dict as [String: Any]: try container.encode(dict.mapValues { AnyCodable($0) })
        default: try container.encodeNil()
        }
    }
}

public enum BriefingType: String, Codable {
    case morning
    case evening
    case weekly
}

public struct Briefing: Codable {
    public let type: BriefingType
    public let title: String
    public let sections: [BriefingSection]
    public let generatedAt: String
}

public struct BriefingSection: Codable {
    public let title: String
    public let content: String
    public let icon: String?
}

public struct Memory: Codable, Identifiable {
    public let id: String
    public let content: String
    public let type: String
    public let createdAt: String
    public let tags: [String]?
    public let relevance: Double?

    public init(id: String, content: String, type: String, createdAt: String, tags: [String]?, relevance: Double?) {
        self.id = id
        self.content = content
        self.type = type
        self.createdAt = createdAt
        self.tags = tags
        self.relevance = relevance
    }
}

public struct CalendarEvent: Codable, Identifiable {
    public let id: String
    public let title: String
    public let startTime: Date
    public let endTime: Date
    public let location: String?
    public let attendees: [String]?
    public let description: String?

    enum CodingKeys: String, CodingKey {
        case id, title, startTime, endTime, location, attendees, description
    }

    public init(id: String, title: String, startTime: Date, endTime: Date, location: String?, attendees: [String]?, description: String?) {
        self.id = id
        self.title = title
        self.startTime = startTime
        self.endTime = endTime
        self.location = location
        self.attendees = attendees
        self.description = description
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        title = try container.decode(String.self, forKey: .title)
        let formatter = ISO8601DateFormatter()
        startTime = formatter.date(from: try container.decode(String.self, forKey: .startTime)) ?? Date()
        endTime = formatter.date(from: try container.decode(String.self, forKey: .endTime)) ?? Date()
        location = try container.decodeIfPresent(String.self, forKey: .location)
        attendees = try container.decodeIfPresent([String].self, forKey: .attendees)
        description = try container.decodeIfPresent(String.self, forKey: .description)
    }
}

// MARK: - Voice Configuration

public struct VoiceConfig {
    public let sampleRate: Int
    public let codec: String
    public let language: String
    public let wakeWordEnabled: Bool

    public init(sampleRate: Int = 16000, codec: String = "pcm_s16le", language: String = "en-US", wakeWordEnabled: Bool = true) {
        self.sampleRate = sampleRate
        self.codec = codec
        self.language = language
        self.wakeWordEnabled = wakeWordEnabled
    }
}

// MARK: - Voice Session Delegate

public protocol VoiceSessionDelegate: AnyObject {
    func voiceSessionDidReceiveTranscript(_ text: String)
    func voiceSessionDidReceiveAudioChunk(_ data: Data)
    func voiceSessionDidReceiveResponse(_ response: GenieResponse)
    func voiceSessionDidEncounterError(_ error: Error)
}

// MARK: - Main Client

public class GenieClient {

    public static let shared = GenieClient()

    private var baseURL: String = "https://api.hojai.ai"
    private var apiKey: String = ""
    private var authToken: String?
    private let session: URLSession
    private let encoder: JSONEncoder
    private let decoder: JSONDecoder

    public weak var voiceDelegate: VoiceSessionDelegate?
    private var audioEngine: AVAudioEngine?
    private var isVoiceSessionActive = false

    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 60
        self.session = URLSession(configuration: config)
        self.encoder = JSONEncoder()
        self.decoder = JSONDecoder()
    }

    // MARK: - Configuration

    public func configure(apiKey: String, baseURL: String? = nil) {
        self.apiKey = apiKey
        if let base = baseURL {
            self.baseURL = base
        }
    }

    public func setAuthToken(_ token: String) {
        self.authToken = token
    }

    // MARK: - Message

    public func sendMessage(_ text: String, context: [String: Any]? = nil) async throws -> GenieResponse {
        let url = URL(string: "\(baseURL)/api/genie/chat")!
        var request = makeRequest(url: url, method: "POST")

        var body: [String: Any] = ["question": text]
        if let ctx = context {
            body["context"] = ctx
        }

        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await session.data(for: request)
        try validateResponse(response)
        return try decoder.decode(GenieResponse.self, from: data)
    }

    // MARK: - Briefing

    public func getBriefing(type: BriefingType) async throws -> Briefing {
        let url = URL(string: "\(baseURL)/api/genie/briefing?type=\(type.rawValue)")!
        let request = makeRequest(url: url, method: "GET")

        let (data, response) = try await session.data(for: request)
        try validateResponse(response)
        return try decoder.decode(Briefing.self, from: data)
    }

    // MARK: - Memory Search

    public func searchMemories(query: String, limit: Int = 10) async throws -> [Memory] {
        var components = URLComponents(string: "\(baseURL)/api/genie/memory/search")!
        components.queryItems = [
            URLQueryItem(name: "q", value: query),
            URLQueryItem(name: "limit", value: String(limit))
        ]

        let request = makeRequest(url: components.url!, method: "GET")
        let (data, response) = try await session.data(for: request)
        try validateResponse(response)

        struct MemoriesResponse: Codable { let memories: [Memory] }
        let decoded = try decoder.decode(MemoriesResponse.self, from: data)
        return decoded.memories
    }

    // MARK: - Calendar

    public func getCalendarEvents(from: Date, to: Date) async throws -> [CalendarEvent] {
        let formatter = ISO8601DateFormatter()
        var components = URLComponents(string: "\(baseURL)/api/genie/calendar/events")!
        components.queryItems = [
            URLQueryItem(name: "from", value: formatter.string(from: from)),
            URLQueryItem(name: "to", value: formatter.string(from: to))
        ]

        let request = makeRequest(url: components.url!, method: "GET")
        let (data, response) = try await session.data(for: request)
        try validateResponse(response)

        struct EventsResponse: Codable { let events: [CalendarEvent] }
        let decoded = try decoder.decode(EventsResponse.self, from: data)
        return decoded.events
    }

    // MARK: - Voice Session

    public func startVoiceSession(config: VoiceConfig, delegate: VoiceSessionDelegate) async throws {
        self.voiceDelegate = delegate

        let audioSession = AVAudioSession.sharedInstance()
        try audioSession.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker, .allowBluetooth])
        try audioSession.setActive(true)

        audioEngine = AVAudioEngine()
        guard let engine = audioEngine else {
            throw GenieError.unknown(message: "Failed to create audio engine")
        }

        let inputNode = engine.inputNode
        let format = inputNode.outputFormat(forBus: 0)

        inputNode.installTap(onBus: 0, bufferSize: 1024, format: format) { [weak self] buffer, _ in
            guard let self = self, let channelData = buffer.floatChannelData?[0] else { return }
            let frameLength = Int(buffer.frameLength)
            let data = Data(bytes: channelData, count: frameLength * MemoryLayout<Float>.size)

            Task { @MainActor in
                self.voiceDelegate?.voiceSessionDidReceiveAudioChunk(data)
            }

            // Stream audio to backend
            Task {
                try? await self.streamAudioChunk(data, config: config)
            }
        }

        engine.prepare()
        try engine.start()
        isVoiceSessionActive = true

        // Notify backend that voice session started
        try await notifyVoiceSessionStart(config: config)
    }

    public func stopVoiceSession() async {
        guard isVoiceSessionActive else { return }
        audioEngine?.stop()
        audioEngine?.inputNode.removeTap(onBus: 0)
        audioEngine = nil
        isVoiceSessionActive = false

        try? await notifyVoiceSessionEnd()
    }

    // MARK: - User Preferences

    public func getUserProfile() async throws -> UserProfile {
        let url = URL(string: "\(baseURL)/api/genie/user")!
        let request = makeRequest(url: url, method: "GET")
        let (data, response) = try await session.data(for: request)
        try validateResponse(response)
        return try decoder.decode(UserProfile.self, from: data)
    }

    public func updatePreferences(_ prefs: [String: Any]) async throws {
        let url = URL(string: "\(baseURL)/api/genie/user/preferences")!
        var request = makeRequest(url: url, method: "PUT")
        request.httpBody = try JSONSerialization.data(withJSONObject: prefs)
        let (_, response) = try await session.data(for: request)
        try validateResponse(response)
    }

    // MARK: - Private Helpers

    private func makeRequest(url: URL, method: String) -> URLRequest {
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        if let token = authToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        } else {
            request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        }
        return request
    }

    private func validateResponse(_ response: URLResponse) throws {
        guard let httpResponse = response as? HTTPURLResponse else {
            throw GenieError.unknown(message: "Invalid response type")
        }

        switch httpResponse.statusCode {
        case 200...299: return
        case 401: throw GenieError.authError(message: "Invalid or expired token")
        case 403: throw GenieError.authError(message: "Insufficient permissions")
        case 422: throw GenieError.apiError(code: "VALIDATION", message: "Request validation failed")
        case 429: throw GenieError.apiError(code: "RATE_LIMIT", message: "Rate limit exceeded")
        case 500...599: throw GenieError.apiError(code: "SERVER_ERROR", message: "Internal server error")
        default: throw GenieError.apiError(code: "HTTP_\(httpResponse.statusCode)", message: "Unexpected response: \(httpResponse.statusCode)")
        }
    }

    private func streamAudioChunk(_ data: Data, config: VoiceConfig) async throws {
        // In production, this would stream to a WebSocket or streaming endpoint
        // For now, accumulate chunks and send as a batch when stop is called
    }

    private func notifyVoiceSessionStart(config: VoiceConfig) async throws {
        let url = URL(string: "\(baseURL)/api/genie/voice/session/start")!
        var request = makeRequest(url: url, method: "POST")
        let body = [
            "sampleRate": config.sampleRate,
            "codec": config.codec,
            "language": config.language
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (_, response) = try await session.data(for: request)
        try validateResponse(response)
    }

    private func notifyVoiceSessionEnd() async throws {
        let url = URL(string: "\(baseURL)/api/genie/voice/session/end")!
        let request = makeRequest(url: url, method: "POST")
        let (_, response) = try await session.data(for: request)
        try validateResponse(response)
    }
}

// MARK: - User Profile

public struct UserProfile: Codable {
    public let id: String
    public let email: String
    public let name: String
    public let onboardingComplete: Bool
    public let preferences: [String: AnyCodable]?
    public let goals: [String]?
    public let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id, email, name, onboardingComplete, preferences, goals, createdAt
    }

    public init(id: String, email: String, name: String, onboardingComplete: Bool, preferences: [String: AnyCodable]?, goals: [String]?, createdAt: String) {
        self.id = id
        self.email = email
        self.name = name
        self.onboardingComplete = onboardingComplete
        self.preferences = preferences
        self.goals = goals
        self.createdAt = createdAt
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        email = try container.decode(String.self, forKey: .email)
        name = try container.decode(String.self, forKey: .name)
        onboardingComplete = try container.decode(Bool.self, forKey: .onboardingComplete)
        preferences = try container.decodeIfPresent([String: AnyCodable].self, forKey: .preferences)
        goals = try container.decodeIfPresent([String].self, forKey: .goals)
        createdAt = try container.decode(String.self, forKey: .createdAt)
    }
}
