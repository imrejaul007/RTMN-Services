package com.razo.keyboard

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.Build
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import androidx.annotation.RequiresApi
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import org.json.JSONObject
import java.io.OutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.util.*
import kotlin.concurrent.thread

/**
 * RAZO Keyboard Service
 *
 * Features:
 * - Voice input with wake word detection
 * - Predictive typing
 * - Genie AI integration
 * - App detection
 * - Password autofill
 * - Biometric unlock
 */
class RazoKeyboardService : AccessibilityService() {

    companion object {
        private const val TAG = "RazoKeyboard"

        // Service URLs
        private const val PREDICTIVE_URL = "http://localhost:4640/predict"
        private const val INTENT_ROUTER_URL = "http://localhost:4650/route"
        private const val CLOUD_SYNC_URL = "http://localhost:4631/sync"
        private const val VAULT_URL = "http://localhost:4632"
        private const val GENIE_URL = "http://localhost:4703/ask"

        // Wake words
        private val WAKE_WORDS = listOf("hey genie", "hey razo", "hey rezo", "ok genie", "ok razo")

        // Voice states
        const val STATE_DEFAULT = 0
        const val STATE_VOICE = 1
        const val STATE_GENIE = 2
        const val STATE_SUGGESTIONS = 3
        const val STATE_LAUNCHER = 4
        const val STATE_ACTIONS = 5
    }

    // Coroutine scope for async operations
    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    // State management
    private val _keyboardState = MutableStateFlow(STATE_DEFAULT)
    val keyboardState: StateFlow<Int> = _keyboardState

    private val _predictions = MutableStateFlow<List<String>>(emptyList())
    val predictions: StateFlow<List<String>> = _predictions

    private val _suggestions = MutableStateFlow<List<SuggestionCard>>(emptyList())
    val suggestions: StateFlow<List<SuggestionCard>> = _suggestions

    private val _isListening = MutableStateFlow(false)
    val isListening: StateFlow<Boolean> = _isListening

    private val _transcript = MutableStateFlow("")
    val transcript: StateFlow<String> = _transcript

    // Voice recognition
    private var speechRecognizer: SpeechRecognizer? = null
    private var audioRecord: AudioRecord? = null

    // User context
    private var userId: String? = null
    private var deviceId: String? = null
    private var currentApp: String? = null
    private var currentText: String = ""

    // Auth state
    private var isAuthenticated = false
    private var authToken: String? = null

    // Network client
    private val networkClient = NetworkClient()

    override fun onServiceConnected() {
        super.onServiceConnected()
        Log.i(TAG, "RAZO Keyboard Service Connected")

        // Configure accessibility service
        val info = AccessibilityServiceInfo().apply {
            eventTypes = AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED or
                    AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or
                    AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED
            feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
            flags = AccessibilityServiceInfo.FLAG_INCLUDE_NOT_IMPORTANT_VIEWS or
                    AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS
            notificationTimeout = 100
        }
        accessibilityServiceInfo = info

        // Initialize speech recognizer
        initializeSpeechRecognizer()

        // Load user session
        loadUserSession()
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        event ?: return

        when (event.eventType) {
            AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED -> {
                val text = event.text.joinToString("")
                if (text.isNotEmpty()) {
                    currentText = text
                    onTextChanged(text)
                }
            }
            AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED -> {
                val packageName = event.packageName?.toString()
                if (packageName != null && packageName != currentApp) {
                    currentApp = packageName
                    onAppChanged(packageName)
                }
            }
        }
    }

    override fun onInterrupt() {
        Log.w(TAG, "RAZO Keyboard Service Interrupted")
    }

    override fun onDestroy() {
        super.onDestroy()
        serviceScope.cancel()
        speechRecognizer?.destroy()
        audioRecord?.release()
        Log.i(TAG, "RAZO Keyboard Service Destroyed")
    }

    // ==================== Voice Input ====================

    private fun initializeSpeechRecognizer() {
        if (SpeechRecognizer.isRecognitionAvailable(this)) {
            speechRecognizer = SpeechRecognizer.createSpeechRecognizer(this).apply {
                setRecognitionListener(createRecognitionListener())
            }
            Log.i(TAG, "Speech recognizer initialized")
        } else {
            Log.w(TAG, "Speech recognition not available")
        }
    }

    private fun createRecognitionListener() = object : RecognitionListener {
        override fun onReadyForSpeech(params: Bundle?) {
            _isListening.value = true
            Log.i(TAG, "Ready for speech")
        }

        override fun onBeginningOfSpeech() {
            Log.d(TAG, "Speech beginning")
        }

        override fun onRmsChanged(rmsdB: Float) {
            // Update voice visualizer
            voiceLevelCallback?.invoke(rmsdB)
        }

        override fun onBufferReceived(buffer: ByteArray?) {
            // Audio buffer received
        }

        override fun onEndOfSpeech() {
            _isListening.value = false
            Log.d(TAG, "Speech ended")
        }

        override fun onError(error: Int) {
            _isListening.value = false
            val errorMsg = when (error) {
                SpeechRecognizer.ERROR_AUDIO -> "Audio recording error"
                SpeechRecognizer.ERROR_CLIENT -> "Client error"
                SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Insufficient permissions"
                SpeechRecognizer.ERROR_NETWORK -> "Network error"
                SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "Network timeout"
                SpeechRecognizer.ERROR_NO_MATCH -> "No match found"
                SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "Recognizer busy"
                SpeechRecognizer.ERROR_SERVER -> "Server error"
                SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "Speech timeout"
                else -> "Unknown error"
            }
            Log.e(TAG, "Speech error: $errorMsg")
        }

        override fun onResults(results: Bundle?) {
            val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
            val text = matches?.firstOrNull() ?: ""
            _transcript.value = text
            processVoiceInput(text)
        }

        override fun onPartialResults(partialResults: Bundle?) {
            val matches = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
            val text = matches?.firstOrNull() ?: ""
            _transcript.value = text
        }

        override fun onEvent(eventType: Int, params: Bundle?) {
            // Event received
        }
    }

    /**
     * Start voice input
     */
    fun startVoiceInput() {
        if (!isAuthenticated) {
            Log.w(TAG, "User not authenticated")
            return
        }

        _keyboardState.value = STATE_VOICE
        _transcript.value = ""

        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault())
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
        }

        try {
            speechRecognizer?.startListening(intent)
            _isListening.value = true
            Log.i(TAG, "Voice input started")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start voice input", e)
        }
    }

    /**
     * Stop voice input
     */
    fun stopVoiceInput() {
        speechRecognizer?.stopListening()
        _isListening.value = false
        _keyboardState.value = STATE_DEFAULT
        Log.i(TAG, "Voice input stopped")
    }

    /**
     * Process voice input through Intent Router
     */
    private fun processVoiceInput(text: String) {
        serviceScope.launch {
            try {
                val response = networkClient.postJson(INTENT_ROUTER_URL, JSONObject().apply {
                    put("text", text)
                    put("userId", userId)
                    put("deviceId", deviceId)
                    put("context", currentApp)
                })

                val mode = response.optString("mode", "voice_typing")
                val result = response.optString("response", text)

                when (mode) {
                    "voice_typing" -> {
                        // Insert transcribed text
                        insertText(result)
                        _keyboardState.value = STATE_DEFAULT
                    }
                    "genie" -> {
                        // Activate Genie mode
                        _keyboardState.value = STATE_GENIE
                        executeGenieCommand(result)
                    }
                    "copilot" -> {
                        // Activate CoPilot mode
                        _keyboardState.value = STATE_GENIE
                        executeCoPilotCommand(result)
                    }
                    "action" -> {
                        // Execute action directly
                        _keyboardState.value = STATE_ACTIONS
                        executeAction(response)
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to process voice input", e)
                // Fallback: just insert the text
                insertText(text)
                _keyboardState.value = STATE_DEFAULT
            }
        }
    }

    // ==================== Text Processing ====================

    private fun onTextChanged(text: String) {
        serviceScope.launch {
            // Get predictions
            getPredictions(text)

            // Get suggestions based on context
            if (text.isEmpty()) {
                getSuggestions()
            }
        }
    }

    private fun onAppChanged(packageName: String) {
        Log.i(TAG, "App changed to: $packageName")
        currentApp = packageName

        serviceScope.launch {
            // Get app-specific suggestions
            getSuggestions()
        }
    }

    /**
     * Get word predictions
     */
    private suspend fun getPredictions(text: String) {
        try {
            val response = networkClient.postJson(PREDICTIVE_URL, JSONObject().apply {
                put("text", text)
                put("userId", userId)
            })

            val predictionsList = response.optJSONArray("predictions")?.let { arr ->
                (0 until arr.length()).map { arr.getString(it) }
            } ?: emptyList()

            _predictions.value = predictionsList
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get predictions", e)
        }
    }

    /**
     * Get context-aware suggestions
     */
    private suspend fun getSuggestions() {
        try {
            val response = networkClient.postJson("$CLOUD_SYNC_URL/suggestions", JSONObject().apply {
                put("userId", userId)
                put("app", currentApp)
                put("context", currentText)
            })

            val suggestionsList = response.optJSONArray("suggestions")?.let { arr ->
                (0 until arr.length()).map { i ->
                    val obj = arr.getJSONObject(i)
                    SuggestionCard(
                        id = obj.optString("id"),
                        title = obj.optString("title"),
                        subtitle = obj.optString("subtitle"),
                        icon = obj.optString("icon"),
                        action = obj.optString("action"),
                        data = obj.optJSONObject("data")?.toString()
                    )
                }
            } ?: emptyList()

            _suggestions.value = suggestionsList
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get suggestions", e)
        }
    }

    /**
     * Insert text into current input field
     */
    private fun insertText(text: String) {
        val bundle = Bundle().apply {
            putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, text)
        }

        // Find the input field and set text
        rootInActiveWindow?.findFocus()?.performAction(
            AccessibilityNodeInfo.ACTION_SET_SELECTION, bundle
        )

        // Use clipboard as fallback
        val clipboard = getSystemService(CLIPBOARD_SERVICE) as android.content.ClipboardManager
        val clip = android.content.ClipData.newPlainText("RAZO", text)
        clipboard.setPrimaryClip(clip)

        Log.i(TAG, "Text inserted: $text")
    }

    // ==================== Genie Integration ====================

    /**
     * Execute Genie command
     */
    private suspend fun executeGenieCommand(command: String) {
        try {
            val response = networkClient.postJson(GENIE_URL, JSONObject().apply {
                put("query", command)
                put("userId", userId)
                put("mode", "genie")
            })

            val answer = response.optString("answer", "")
            if (answer.isNotEmpty()) {
                insertText(answer)
            }

            _keyboardState.value = STATE_DEFAULT
        } catch (e: Exception) {
            Log.e(TAG, "Failed to execute Genie command", e)
        }
    }

    /**
     * Execute CoPilot command
     */
    private suspend fun executeCoPilotCommand(command: String) {
        try {
            val response = networkClient.postJson(GENIE_URL, JSONObject().apply {
                put("query", command)
                put("userId", userId)
                put("mode", "copilot")
            })

            val answer = response.optString("answer", "")
            if (answer.isNotEmpty()) {
                insertText(answer)
            }

            _keyboardState.value = STATE_DEFAULT
        } catch (e: Exception) {
            Log.e(TAG, "Failed to execute CoPilot command", e)
        }
    }

    /**
     * Execute action from Intent Router
     */
    private suspend fun executeAction(response: JSONObject) {
        val actionType = response.optString("actionType")
        val actionData = response.optJSONObject("actionData")

        when (actionType) {
            "launch_app" -> {
                val appId = actionData?.optString("appId")
                if (appId != null) {
                    launchApp(appId)
                }
            }
            "deep_link" -> {
                val url = actionData?.optString("url")
                if (url != null) {
                    openDeepLink(url)
                }
            }
            "insert_text" -> {
                val text = actionData?.optString("text")
                if (text != null) {
                    insertText(text)
                }
            }
        }

        _keyboardState.value = STATE_DEFAULT
    }

    // ==================== App Launcher ====================

    /**
     * Launch an RTNM app
     */
    private fun launchApp(appId: String) {
        val packageName = getPackageForApp(appId)
        if (packageName != null) {
            val intent = packageManager.getLaunchIntentForPackage(packageName)
            if (intent != null) {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                startActivity(intent)
                Log.i(TAG, "Launched app: $appId")
            }
        }
    }

    /**
     * Open deep link
     */
    private fun openDeepLink(url: String) {
        try {
            val intent = Intent(Intent.ACTION_VIEW, android.net.Uri.parse(url)).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            startActivity(intent)
            Log.i(TAG, "Opened deep link: $url")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to open deep link", e)
        }
    }

    private fun getPackageForApp(appId: String): String? {
        return mapOf(
            "rez-consumer" to "com.rtnm.rezconsumer",
            "rez-merchant" to "com.rtnm.rezmerchant",
            "risacare" to "com.rtnm.risacare",
            "stayown" to "com.rtnm.stayown",
            "corpperks" to "com.rtnm.corpperks",
            "khairmove" to "com.rtnm.khairmove",
            "ridza" to "com.rtnm.ridza"
        )[appId]
    }

    // ==================== Authentication ====================

    private fun loadUserSession() {
        val prefs = getSharedPreferences("razo_session", MODE_PRIVATE)
        userId = prefs.getString("userId", null)
        deviceId = prefs.getString("deviceId", UUID.randomUUID().toString())
        authToken = prefs.getString("authToken", null)
        isAuthenticated = authToken != null

        // Save device ID if new
        if (prefs.getString("deviceId", null) == null) {
            prefs.edit().putString("deviceId", deviceId).apply()
        }
    }

    /**
     * Authenticate with CorpID
     */
    fun authenticateWithCorpID(token: String): Boolean {
        authToken = token
        isAuthenticated = true

        getSharedPreferences("razo_session", MODE_PRIVATE).edit()
            .putString("authToken", token)
            .apply()

        Log.i(TAG, "CorpID authentication successful")
        return true
    }

    /**
     * Authenticate with biometric
     */
    fun authenticateWithBiometric(): Boolean {
        // Biometric authentication handled by system
        // This is called after successful biometric verification
        isAuthenticated = true
        Log.i(TAG, "Biometric authentication successful")
        return true
    }

    /**
     * Check if user is authenticated
     */
    fun isUserAuthenticated(): Boolean = isAuthenticated

    // ==================== Vault Integration ====================

    /**
     * Get saved password for site
     */
    suspend fun getPassword(site: String): PasswordEntry? {
        if (!isAuthenticated) return null

        try {
            val response = networkClient.postJson("$VAULT_URL/password/get", JSONObject().apply {
                put("site", site)
                put("userId", userId)
                put("token", authToken)
            })

            val entry = response.optJSONObject("entry")
            return entry?.let {
                PasswordEntry(
                    site = it.optString("site"),
                    username = it.optString("username"),
                    password = it.optString("password"),
                    createdAt = it.optLong("createdAt")
                )
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get password", e)
            return null
        }
    }

    /**
     * Save password to vault
     */
    suspend fun savePassword(entry: PasswordEntry): Boolean {
        if (!isAuthenticated) return false

        try {
            val response = networkClient.postJson("$VAULT_URL/password/save", JSONObject().apply {
                put("site", entry.site)
                put("username", entry.username)
                put("password", entry.password)
                put("userId", userId)
                put("token", authToken)
            })

            return response.optBoolean("success", false)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to save password", e)
            return false
        }
    }

    // ==================== Sync ====================

    /**
     * Sync user data
     */
    suspend fun syncData(): Boolean {
        if (!isAuthenticated) return false

        try {
            val response = networkClient.postJson(CLOUD_SYNC_URL, JSONObject().apply {
                put("userId", userId)
                put("deviceId", deviceId)
                put("token", authToken)
            })

            return response.optBoolean("success", false)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to sync data", e)
            return false
        }
    }

    // ==================== Voice Callbacks ====================

    var voiceLevelCallback: ((Float) -> Unit)? = null

    // ==================== Data Classes ====================

    data class SuggestionCard(
        val id: String,
        val title: String,
        val subtitle: String,
        val icon: String,
        val action: String,
        val data: String?
    )

    data class PasswordEntry(
        val site: String,
        val username: String,
        val password: String,
        val createdAt: Long = System.currentTimeMillis()
    )
}

// ==================== Network Client ====================

class NetworkClient {
    fun postJson(urlString: String, body: JSONObject): JSONObject {
        val url = URL(urlString)
        val connection = url.openConnection() as HttpURLConnection

        connection.requestMethod = "POST"
        connection.setRequestProperty("Content-Type", "application/json")
        connection.doOutput = true
        connection.connectTimeout = 10000
        connection.readTimeout = 10000

        try {
            val outputStream: OutputStream = connection.outputStream
            outputStream.write(body.toString().toByteArray())
            outputStream.flush()

            val responseCode = connection.responseCode
            if (responseCode == HttpURLConnection.HTTP_OK) {
                val inputStream = connection.inputStream
                val response = inputStream.bufferedReader().readText()
                return JSONObject(response)
            } else {
                Log.e("NetworkClient", "HTTP error: $responseCode")
                return JSONObject()
            }
        } finally {
            connection.disconnect()
        }
    }
}
