package com.hojai.genie

import kotlinx.coroutines.*
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.*
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.time.Instant
import java.util.UUID
import java.util.concurrent.TimeUnit

// ============================================================================
// Error Types
// ============================================================================

sealed class GenieError(message: String, val code: String = "UNKNOWN") : Exception(message) {
    class NetworkError(underlying: IOException) : GenieError(underlying.message ?: "Network error", "NETWORK")
    class AuthError(message: String) : GenieError(message, "AUTH")
    class ApiError(code: String, message: String) : GenieError(message, code)
    class EncodingError(message: String) : GenieError(message, "ENCODING")
    class DecodingError(message: String, val underlying: Throwable) : GenieError(message, "DECODING")
    class TimeoutError : GenieError("Request timed out", "TIMEOUT")
}

// ============================================================================
// Data Models
// ============================================================================

@Serializable
data class GenieResponse(
    val responseId: String,
    val text: String,
    val actions: List<GenieAction>? = null,
    val context: Map<String, JsonElement>? = null,
    val timestamp: String? = null
)

@Serializable
data class GenieAction(
    val type: String,
    val payload: Map<String, JsonElement>? = null
)

@Serializable
enum class BriefingType { morning, evening, weekly }

@Serializable
data class Briefing(
    val type: BriefingType,
    val title: String,
    val sections: List<BriefingSection>,
    val generatedAt: String
)

@Serializable
data class BriefingSection(
    val title: String,
    val content: String,
    val icon: String? = null
)

@Serializable
data class Memory(
    val id: String,
    val content: String,
    val type: String,
    val createdAt: String,
    val tags: List<String>? = null,
    val relevance: Double? = null
)

@Serializable
data class CalendarEvent(
    val id: String,
    val title: String,
    val startTime: String,
    val endTime: String,
    val location: String? = null,
    val attendees: List<String>? = null,
    val description: String? = null
) {
    fun startMillis(): Long = try { Instant.parse(startTime).toEpochMilli() } catch (_: Exception) { 0L }
    fun endMillis(): Long = try { Instant.parse(endTime).toEpochMilli() } catch (_: Exception) { 0L }
}

@Serializable
data class UserProfile(
    val id: String,
    val email: String,
    val name: String,
    val onboardingComplete: Boolean,
    val preferences: Map<String, JsonElement>? = null,
    val goals: List<String>? = null,
    val createdAt: String
)

// ============================================================================
// Voice Configuration
// ============================================================================

data class VoiceConfig(
    val sampleRate: Int = 16000,
    val codec: String = "pcm_s16le",
    val language: String = "en-US",
    val wakeWordEnabled: Boolean = true
)

// ============================================================================
// Voice Listener
// ============================================================================

interface VoiceListener {
    fun onTranscript(text: String)
    fun onAudioData(data: ByteArray)
    fun onResponse(response: GenieResponse)
    fun onError(error: GenieError)
}

// ============================================================================
// Genie Client
// ============================================================================

class GenieClient private constructor() {

    companion object {
        val instance: GenieClient by lazy { GenieClient() }
    }

    private val json = Json { ignoreUnknownKeys = true; isLenient = true; encodeDefaults = true }
    private val mediaTypeJson = "application/json; charset=utf-8".toMediaType()

    private var baseUrl: String = "https://api.hojai.ai"
    private var apiKey: String = ""
    private var authToken: String? = null

    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .writeTimeout(60, TimeUnit.SECONDS)
        .build()

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    // Voice state
    private var isVoiceSessionActive = false
    private var currentVoiceListener: VoiceListener? = null

    // ── Configuration ──────────────────────────────────────────────────────

    fun configure(apiKey: String, baseUrl: String = "https://api.hojai.ai") {
        this.apiKey = apiKey
        this.baseUrl = baseUrl.trimEnd('/')
    }

    fun setAuthToken(token: String) {
        this.authToken = token
    }

    private fun buildRequest(path: String, method: String, body: String? = null): Request {
        val url = "$baseUrl$path"
        val builder = Request.Builder().url(url)
            .addHeader("Accept", "application/json")
            .addHeader("Content-Type", "application/json")

        val token = authToken ?: apiKey
        builder.addHeader("Authorization", "Bearer $token")

        when (method.uppercase()) {
            "GET" -> builder.get()
            "POST" -> builder.post((body ?: "{}").toRequestBody(mediaTypeJson))
            "PUT" -> builder.put((body ?: "{}").toRequestBody(mediaTypeJson))
            "PATCH" -> builder.patch((body ?: "{}").toRequestBody(mediaTypeJson))
            "DELETE" -> builder.delete()
            else -> builder.get()
        }
        return builder.build()
    }

    private suspend fun <T> executeRequest(request: Request, clazz: Class<T>): T = suspendCatching {
        val response = httpClient.newCall(request).await()
        val body = response.body?.string() ?: ""

        when (response.code) {
            in 200..299 -> {
                try {
                    json.decodeFromString(clazz.kotlin.javaObjectType, body)
                } catch (e: Exception) {
                    throw GenieError.DecodingError("Failed to decode response: ${e.message}", e)
                }
            }
            401 -> throw GenieError.AuthError("Invalid or expired token")
            403 -> throw GenieError.AuthError("Insufficient permissions")
            429 -> throw GenieError.ApiError("RATE_LIMIT", "Rate limit exceeded")
            in 500..599 -> throw GenieError.ApiError("SERVER_ERROR", "Internal server error")
            else -> throw GenieError.ApiError("HTTP_${response.code}", "Unexpected response: ${response.code}")
        }
    }.getOrThrow()

    // ── Chat ─────────────────────────────────────────────────────────────────

    suspend fun sendMessage(text: String, context: Map<String, Any>? = null): GenieResponse = scope.e {
        val bodyMap = mutableMapOf("question" to JsonPrimitive(text))
        if (context != null) {
            bodyMap["context"] = json.encodeToJsonElement(context)
        }
        val body = json.encodeToString(JsonObject(bodyMap))
        val request = buildRequest("/api/genie/chat", "POST", body)
        executeRequest(request, GenieResponse::class.java)
    }

    // ── Briefing ─────────────────────────────────────────────────────────────

    suspend fun getBriefing(type: BriefingType): Briefing = scope.e {
        val request = buildRequest("/api/genie/briefing?type=${type.name.lowercase()}", "GET")
        executeRequest(request, Briefing::class.java)
    }

    // ── Memory ───────────────────────────────────────────────────────────────

    suspend fun searchMemories(query: String, limit: Int = 10): List<Memory> = scope.e {
        val url = "/api/genie/memory/search?q=${java.net.URLEncoder.encode(query, "UTF-8")}&limit=$limit"
        val request = buildRequest(url, "GET")
        val wrapper = executeRequest(request, MemoriesWrapper::class.java)
        wrapper.memories
    }

    @Serializable
    private data class MemoriesWrapper(val memories: List<Memory>)

    // ── Calendar ────────────────────────────────────────────────────────────

    suspend fun getCalendarEvents(fromMillis: Long, toMillis: Long): List<CalendarEvent> = scope.e {
        val formatter = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", java.util.Locale.US).apply {
            timeZone = java.util.TimeZone.getTimeZone("UTC")
        }
        val from = formatter.format(java.util.Date(fromMillis))
        val to = formatter.format(java.util.Date(toMillis))
        val url = "/api/genie/calendar/events?from=$from&to=$to"
        val request = buildRequest(url, "GET")
        val wrapper = executeRequest(request, EventsWrapper::class.java)
        wrapper.events
    }

    @Serializable
    private data class EventsWrapper(val events: List<CalendarEvent>)

    // ── Voice Session ────────────────────────────────────────────────────────

    suspend fun startVoiceSession(config: VoiceConfig, listener: VoiceListener) = scope.e {
        currentVoiceListener = listener
        isVoiceSessionActive = true

        // Notify backend
        val body = json.encodeToString(JsonObject(mapOf(
            "sampleRate" to JsonPrimitive(config.sampleRate),
            "codec" to JsonPrimitive(config.codec),
            "language" to JsonPrimitive(config.language)
        )))
        val request = buildRequest("/api/genie/voice/session/start", "POST", body)
        executeRequest<Unit>(request, Unit::class.java)
    }

    suspend fun stopVoiceSession() = scope.e {
        if (!isVoiceSessionActive) return@e
        isVoiceSessionActive = false
        currentVoiceListener = null

        val request = buildRequest("/api/genie/voice/session/end", "POST")
        try {
            executeRequest<Unit>(request, Unit::class.java)
        } catch (_: Exception) {
            // best effort
        }
    }

    // ── User ─────────────────────────────────────────────────────────────────

    suspend fun getUserProfile(): UserProfile = scope.e {
        val request = buildRequest("/api/genie/user", "GET")
        executeRequest(request, UserProfile::class.java)
    }

    suspend fun updatePreferences(prefs: Map<String, Any>) = scope.e {
        val body = json.encodeToString(JsonObject(prefs.mapValues { json.encodeToJsonElement(it.value) }))
        val request = buildRequest("/api/genie/user/preferences", "PUT", body)
        executeRequest<Unit>(request, Unit::class.java)
    }

    // ── Convenience ──────────────────────────────────────────────────────────

    fun shutdown() {
        scope.cancel()
        httpClient.dispatcher.executorService.shutdown()
        httpClient.connectionPool.evictAll()
    }
}

// Suspend Cancellable
private suspend fun <T> Call.await(): Response = suspendCancellableCoroutine { cont ->
    cont.invokeOnCancellation { cancel() }
    enqueue(object : Callback {
        override fun onFailure(call: Call, e: IOException) { cont.resumeWithException(GenieError.NetworkError(e)) }
        override fun onResponse(call: Call, response: Response) { cont.resume(response) }
    })
}

// Shorthand
private inline fun <T> kotlinx.coroutines.CoroutineScope.e(crossinline block: suspend () -> T): T {
    return runBlocking { block() }
}

// Extension for executeRequest
private suspend inline fun <reified T> GenieClient.executeRequest(request: Request, clazz: Class<T>): T {
    val body = httpClient.newCall(request).await().body?.string() ?: ""
    return when {
        T::class == Unit::class -> Unit as T
        else -> json.decodeFromString(clazz.kotlin.javaObjectType, body)
    }
}

// GenieActivity stub (exported for manifest)
class GenieActivity : android.app.Activity()

// Re-export for convenience
typealias GenieClientInstance = GenieClient
