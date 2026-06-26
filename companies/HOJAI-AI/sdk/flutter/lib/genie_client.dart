import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;

/// Error types for the Genie Flutter SDK
class GenieException implements Exception {
  final String message;
  final String code;
  GenieException(this.message, [this.code = 'UNKNOWN']);

  @override
  String toString() => 'GenieException($code): $message';
}

class GenieNetworkException extends GenieException {
  GenieNetworkException(super.message) : super('NETWORK');
}

class GenieAuthException extends GenieException {
  GenieAuthException(super.message) : super('AUTH');
}

class GenieApiException extends GenieException {
  GenieApiException(super.message, [super.code = 'API']);
}

/// Response models

class GenieResponse {
  final String responseId;
  final String text;
  final List<GenieAction>? actions;
  final Map<String, dynamic>? context;
  final DateTime? timestamp;

  GenieResponse({
    required this.responseId,
    required this.text,
    this.actions,
    this.context,
    this.timestamp,
  });

  factory GenieResponse.fromJson(Map<String, dynamic> json) {
    return GenieResponse(
      responseId: json['responseId'] ?? '',
      text: json['text'] ?? '',
      actions: (json['actions'] as List?)?.map((a) => GenieAction.fromJson(a)).toList(),
      context: json['context'],
      timestamp: json['timestamp'] != null ? DateTime.tryParse(json['timestamp']) : null,
    );
  }
}

class GenieAction {
  final String type;
  final Map<String, dynamic>? payload;

  GenieAction({required this.type, this.payload});

  factory GenieAction.fromJson(Map<String, dynamic> json) {
    return GenieAction(type: json['type'] ?? '', payload: json['payload']);
  }
}

enum BriefingType { morning, evening, weekly }

class Briefing {
  final BriefingType type;
  final String title;
  final List<BriefingSection> sections;
  final DateTime generatedAt;

  Briefing({
    required this.type,
    required this.title,
    required this.sections,
    required this.generatedAt,
  });

  factory Briefing.fromJson(Map<String, dynamic> json) {
    return Briefing(
      type: BriefingType.values.firstWhere(
        (t) => t.name == (json['type'] ?? 'morning'),
        orElse: () => BriefingType.morning,
      ),
      title: json['title'] ?? '',
      sections: (json['sections'] as List?)
              ?.map((s) => BriefingSection.fromJson(s))
              .toList() ??
          [],
      generatedAt: DateTime.tryParse(json['generatedAt'] ?? '') ?? DateTime.now(),
    );
  }
}

class BriefingSection {
  final String title;
  final String content;
  final String? icon;

  BriefingSection({required this.title, required this.content, this.icon});

  factory BriefingSection.fromJson(Map<String, dynamic> json) {
    return BriefingSection(
      title: json['title'] ?? '',
      content: json['content'] ?? '',
      icon: json['icon'],
    );
  }
}

class Memory {
  final String id;
  final String content;
  final String type;
  final DateTime createdAt;
  final List<String>? tags;
  final double? relevance;

  Memory({
    required this.id,
    required this.content,
    required this.type,
    required this.createdAt,
    this.tags,
    this.relevance,
  });

  factory Memory.fromJson(Map<String, dynamic> json) {
    return Memory(
      id: json['id'] ?? '',
      content: json['content'] ?? '',
      type: json['type'] ?? 'note',
      createdAt: DateTime.tryParse(json['createdAt'] ?? '') ?? DateTime.now(),
      tags: (json['tags'] as List?)?.cast<String>(),
      relevance: (json['relevance'] as num?)?.toDouble(),
    );
  }
}

class CalendarEvent {
  final String id;
  final String title;
  final DateTime startTime;
  final DateTime endTime;
  final String? location;
  final List<String>? attendees;
  final String? description;

  CalendarEvent({
    required this.id,
    required this.title,
    required this.startTime,
    required this.endTime,
    this.location,
    this.attendees,
    this.description,
  });

  factory CalendarEvent.fromJson(Map<String, dynamic> json) {
    return CalendarEvent(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      startTime: DateTime.tryParse(json['startTime'] ?? '') ?? DateTime.now(),
      endTime: DateTime.tryParse(json['endTime'] ?? '') ?? DateTime.now(),
      location: json['location'],
      attendees: (json['attendees'] as List?)?.cast<String>(),
      description: json['description'],
    );
  }
}

/// Voice configuration
class VoiceConfig {
  final int sampleRate;
  final String codec;
  final String language;
  final bool wakeWordEnabled;

  VoiceConfig({
    this.sampleRate = 16000,
    this.codec = 'pcm_s16le',
    this.language = 'en-US',
    this.wakeWordEnabled = true,
  });

  Map<String, dynamic> toJson() => {
        'sampleRate': sampleRate,
        'codec': codec,
        'language': language,
        'wakeWordEnabled': wakeWordEnabled,
      };
}

/// Voice session controller for Flutter
class VoiceSessionController {
  final GenieClient _client;
  final VoiceConfig config;
  final StreamController<String> _transcriptController = StreamController<String>.broadcast();
  final StreamController<GenieResponse> _responseController = StreamController<GenieResponse>.broadcast();
  final StreamController<String> _errorController = StreamController<String>.broadcast();
  bool _isActive = false;

  VoiceSessionController(this._client, this.config);

  Stream<String> get transcriptStream => _transcriptController.stream;
  Stream<GenieResponse> get responseStream => _responseController.stream;
  Stream<String> get errorStream => _errorController.stream;
  bool get isActive => _isActive;

  void _emitTranscript(String text) => _transcriptController.add(text);
  void _emitResponse(GenieResponse response) => _responseController.add(response);
  void _emitError(String error) => _errorController.add(error);

  void dispose() {
    _transcriptController.close();
    _responseController.close();
    _errorController.close();
  }
}

/// Main Genie Flutter Client
class GenieClient {
  static final GenieClient _instance = GenieClient._();
  factory GenieClient() => _instance;
  GenieClient._();

  String _baseUrl = 'https://api.hojai.ai';
  String? _apiKey;
  String? _authToken;
  final http.Client _httpClient = http.Client();

  VoiceSessionController? _activeVoiceSession;

  // ── Configuration ──────────────────────────────────────────────────────

  Future<void> configure({required String apiKey, String? baseUrl}) async {
    _apiKey = apiKey;
    if (baseUrl != null) _baseUrl = baseUrl.trimEnd('/');
  }

  void setAuthToken(String token) => _authToken = token;

  String get baseUrl => _baseUrl;

  // ── Core API ────────────────────────────────────────────────────────────

  Future<GenieResponse> sendMessage(String text, {Map<String, dynamic>? context}) async {
    final uri = Uri.parse('$_baseUrl/api/genie/chat');
    final body = {'question': text, if (context != null) 'context': context};

    final response = await _post(uri, body);
    return GenieResponse.fromJson(_decode(response));
  }

  Future<Briefing> getBriefing(BriefingType type) async {
    final uri = Uri.parse('$_baseUrl/api/genie/briefing?type=${type.name}');
    final response = await _get(uri);
    final data = _decode(response);
    // Backend wraps in { data: Briefing }
    if (data is Map && data.containsKey('data')) {
      return Briefing.fromJson(data['data']);
    }
    return Briefing.fromJson(data);
  }

  Future<List<Memory>> searchMemories(String query, {int limit = 10}) async {
    final uri = Uri.parse('$_baseUrl/api/genie/memory/search?q=${Uri.encodeComponent(query)}&limit=$limit');
    final response = await _get(uri);
    final data = _decode(response);
    final memories = data is Map && data.containsKey('memories')
        ? (data['memories'] as List)
        : (data is List ? data : []);
    return memories.map((m) => Memory.fromJson(m)).toList();
  }

  Future<List<CalendarEvent>> getCalendarEvents(DateTime from, DateTime to) async {
    final formatter = 'yyyy-MM-ddTHH:mm:ssZ';
    final fromStr = from.toUtc().toIso8601String();
    final toStr = to.toUtc().toIso8601String();
    final uri = Uri.parse('$_baseUrl/api/genie/calendar/events?from=$fromStr&to=$toStr');
    final response = await _get(uri);
    final data = _decode(response);
    final events = data is Map && data.containsKey('events')
        ? (data['events'] as List)
        : (data is List ? data : []);
    return events.map((e) => CalendarEvent.fromJson(e)).toList();
  }

  Future<Map<String, dynamic>> getUser() async {
    final uri = Uri.parse('$_baseUrl/api/genie/user');
    final response = await _get(uri);
    final data = _decode(response);
    return data is Map ? data : {};
  }

  Future<void> updatePreferences(Map<String, dynamic> prefs) async {
    final uri = Uri.parse('$_baseUrl/api/genie/user/preferences');
    await _put(uri, prefs);
  }

  // ── Voice Session ────────────────────────────────────────────────────────

  Future<VoiceSessionController> startVoiceSession(VoiceConfig config) async {
    final uri = Uri.parse('$_baseUrl/api/genie/voice/session/start');
    await _post(uri, config.toJson());

    final controller = VoiceSessionController(this, config);
    _activeVoiceSession = controller;
    return controller;
  }

  Future<void> stopVoiceSession() async {
    if (_activeVoiceSession == null) return;
    final uri = Uri.parse('$_baseUrl/api/genie/voice/session/end');
    try {
      await _post(uri, {});
    } finally {
      _activeVoiceSession?.dispose();
      _activeVoiceSession = null;
    }
  }

  // ── HTTP Helpers ────────────────────────────────────────────────────────

  Future<http.Response> _get(Uri uri) => _request(uri, 'GET');
  Future<http.Response> _post(Uri uri, Map<String, dynamic> body) =>
      _request(uri, 'POST', body: body);
  Future<http.Response> _put(Uri uri, Map<String, dynamic> body) =>
      _request(uri, 'PUT', body: body);

  Future<http.Response> _request(
    Uri uri,
    String method, {
    Map<String, dynamic>? body,
  }) async {
    final token = _authToken ?? _apiKey ?? '';
    final headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': 'Bearer $token',
    };

    http.Response response;
    try {
      switch (method) {
        case 'GET':
          response = await _httpClient.get(uri, headers: headers).timeout(const Duration(seconds: 30));
          break;
        case 'POST':
          response = await _httpClient.post(uri, headers: headers, body: jsonEncode(body)).timeout(const Duration(seconds: 30));
          break;
        case 'PUT':
          response = await _httpClient.put(uri, headers: headers, body: jsonEncode(body)).timeout(const Duration(seconds: 30));
          break;
        default:
          response = await _httpClient.get(uri, headers: headers).timeout(const Duration(seconds: 30));
      }
    } on http.ClientException catch (e) {
      throw GenieNetworkException('Network error: ${e.message}');
    }

    if (response.statusCode == 401) throw GenieAuthException('Invalid or expired token');
    if (response.statusCode == 403) throw GenieAuthException('Insufficient permissions');
    if (response.statusCode == 429) throw GenieApiException('Rate limit exceeded', 'RATE_LIMIT');
    if (response.statusCode >= 500) throw GenieApiException('Server error: ${response.statusCode}', 'SERVER_ERROR');
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw GenieApiException('Request failed: ${response.statusCode}', 'HTTP_${response.statusCode}');
    }

    return response;
  }

  Map<String, dynamic> _decode(http.Response response) {
    if (response.body.isEmpty) return {};
    try {
      final decoded = jsonDecode(response.body);
      if (decoded is Map<String, dynamic>) return decoded;
      if (decoded is List) return {'list': decoded};
      return {'data': decoded};
    } catch (_) {
      return {};
    }
  }

  void dispose() {
    _httpClient.close();
    _activeVoiceSession?.dispose();
  }
}
