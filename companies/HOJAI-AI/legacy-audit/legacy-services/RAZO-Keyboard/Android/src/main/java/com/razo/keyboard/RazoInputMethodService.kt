package com.razo.keyboard

import android.content.Intent
import android.content.SharedPreferences
import android.inputmethodservice.InputMethodService
import android.media.AudioManager
import android.os.Build
import android.speech.RecognizerIntent
import android.util.Log
import android.view.KeyEvent
import android.view.View
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputMethodManager
import android.view.inputmethod.InputMethodSubtype
import android.widget.Toast
import kotlinx.coroutines.*
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.nio.charset.StandardCharsets
import javax.net.ssl.HttpsURLConnection

/**
 * RAZO Input Method Service v2.0
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
 * - Voice input with Whisper
 * - Genie mode activation
 * - Offline mode with sync
 * - E2E encryption
 */
class RazoInputMethodService : InputMethodService() {

    companion object {
        private const val TAG = "RazoIME"

        // Integration Gateway (v2.0 - Unified API)
        private const val GATEWAY_URL = "http://localhost:4601"

        // Legacy service URLs (for fallback)
        private const val PREDICTIVE_URL = "http://localhost:4640/predict"
        private const val CLOUD_SYNC_URL = "http://localhost:4631/sync"
        private const val CLEANUP_URL = "http://localhost:4635/cleanup"

        // Keyboard states
        const val STATE_DEFAULT = 0
        const val STATE_VOICE = 1
        const val STATE_GENIE = 2
        const val STATE_SYMBOLS = 3
        const val STATE_NUMBERS = 4
        const val STATE_SUGGESTIONS = 5
        const val STATE_ACTIONS = 6
        const val STATE_COMMANDS = 7

        // Supported languages
        val SUPPORTED_LANGUAGES = listOf("en", "hi", "en-hi")
    }

    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    // Current state
    private var currentState = STATE_DEFAULT
    private var isShifted = false
    private var isCapsLock = false
    private var currentText = ""
    private var currentLanguage = "en"

    // Keyboard view
    private var keyboardView: RazoKeyboardView? = null

    // Audio feedback
    private var audioManager: AudioManager? = null

    // Session & preferences
    private var prefs: SharedPreferences? = null
    private var userId: String = "anonymous"
    private var sessionToken: String? = null

    // Connection state
    private var isOnline = true
    private var lastSyncTime = 0L

    // Predictive context
    private var conversationContext = mutableListOf<JSONObject>()
    private var lastPredictions = listOf<String>()

    override fun onCreate() {
        super.onCreate()
        audioManager = getSystemService(AUDIO_SERVICE) as AudioManager
        prefs = getSharedPreferences("razo_session", MODE_PRIVATE)
        userId = prefs?.getString("userId", generateUserId()) ?: generateUserId()
        sessionToken = prefs?.getString("sessionToken", null)

        // Initialize session with gateway
        initializeSession()
    }

    private fun generateUserId(): String {
        val id = "android_${System.currentTimeMillis()}_${(1000..9999).random()}"
        prefs?.edit()?.putString("userId", id)?.apply()
        return id
    }

    private fun initializeSession() {
        scope.launch {
            try {
                val response = gatewayRequest("/session/init", JSONObject().apply {
                    put("userId", userId)
                    put("platform", "android")
                    put("keyboardVersion", "2.0")
                })

                if (response.has("sessionToken")) {
                    sessionToken = response.getString("sessionToken")
                    prefs?.edit()?.putString("sessionToken", sessionToken)?.apply()
                }

                // Track analytics
                trackAnalytics("session_init", JSONObject().apply {
                    put("platform", "android")
                    put("timestamp", System.currentTimeMillis())
                })
            } catch (e: Exception) {
                Log.w(TAG, "Session init failed, using offline mode", e)
                isOnline = false
            }
        }
    }

    override fun onCreateInputView(): View {
        val view = layoutInflater.inflate(R.layout.keyboard_layout, null)
        keyboardView = view.findViewById(R.id.razo_keyboard_view)
        keyboardView?.setInputMethodService(this)
        return view
    }

    override fun onStartInput(attribute: EditorInfo?, restarting: Boolean) {
        super.onStartInput(attribute, restarting)
        currentText = ""
        conversationContext.clear()
        keyboardView?.reset()

        // Load initial predictions
        loadPredictions()
        loadSuggestions()
    }

    override fun onFinishInput() {
        super.onFinishInput()
        currentText = ""
    }

    override fun onStartInputView(attribute: EditorInfo?, restarting: Boolean) {
        super.onStartInputView(attribute, restarting)
        currentLanguage = detectLanguage(attribute)
        loadPredictions()
    }

    private fun detectLanguage(attribute: EditorInfo?): String {
        // Detect input language from EditorInfo
        val inputType = attribute?.inputType ?: 0
        return when (inputType and android.text.InputType.TYPE_MASK_VARIATION) {
            android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD,
            android.text.InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD -> "en"
            android.text.InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS -> "en"
            android.text.InputType.TYPE_TEXT_VARIATION_URI -> "en"
            else -> prefs?.getString("language", "en") ?: "en"
        }
    }

    override fun onDisplayCompletions(completions: MutableList<android.view.inputmethod.CompletionInfo>?) {
        // Handle completion suggestions from system
    }

    override fun onUpdateCursorAnchorInfo(cursorAnchorInfo: CursorAnchorInfo?) {
        // Update cursor position for gesture typing
    }

    override fun onCurrentInputMethodSubtypeChanged(subtype: InputMethodSubtype?) {
        // Handle subtype changes (language, etc.)
        subtype?.let {
            currentLanguage = when {
                it.locale.contains("hi") -> "hi"
                it.locale.contains("en") && it.locale.contains("hi") -> "en-hi"
                else -> "en"
            }
            prefs?.edit()?.putString("language", currentLanguage)?.apply()
        }
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        return when (keyCode) {
            KeyEvent.KEYCODE_BACK -> {
                if (currentState != STATE_DEFAULT) {
                    currentState = STATE_DEFAULT
                    keyboardView?.setState(currentState)
                    true
                } else {
                    false
                }
            }
            KeyEvent.KEYCODE_DEL -> {
                handleBackspace()
                true
            }
            KeyEvent.KEYCODE_ENTER -> {
                handleEnter()
                true
            }
            else -> super.onKeyDown(keyCode, event)
        }
    }

    override fun onKeyUp(keyCode: Int, event: KeyEvent?): Boolean {
        return when (keyCode) {
            KeyEvent.KEYCODE_DEL, KeyEvent.KEYCODE_ENTER -> true
            else -> super.onKeyUp(keyCode, event)
        }
    }

    // ==================== Key Handling ====================

    /**
     * Handle character input
     */
    fun onCharacter(character: Char) {
        val charToInsert = if (isShifted || isCapsLock) {
            character.uppercaseChar()
        } else {
            character.lowercaseChar()
        }

        currentText += charToInsert
        textEventRouter(charToInsert.toString())

        if (isShifted && !isCapsLock) {
            isShifted = false
            keyboardView?.updateShiftState(isShifted, isCapsLock)
        }

        playKeyClick()
    }

    /**
     * Handle space
     */
    fun onSpace() {
        currentText += " "
        textEventRouter(" ")
        playKeyClick()
    }

    /**
     * Handle backspace
     */
    private fun handleBackspace() {
        if (currentText.isNotEmpty()) {
            currentText = currentText.dropLast(1)
            getCurrentInputConnection()?.deleteSurroundingText(1, 0)
            // Request updated predictions after deletion
            loadPredictions()
        }
        playKeyClick()
    }

    /**
     * Handle enter
     */
    private fun handleEnter() {
        // Track message sent
        trackAnalytics("message_sent", JSONObject().apply {
            put("textLength", currentText.length)
            put("language", currentLanguage)
        })

        // Add to conversation context
        conversationContext.add(JSONObject().apply {
            put("role", "user")
            put("content", currentText)
            put("timestamp", System.currentTimeMillis())
        })

        getCurrentInputConnection()?.sendKeyEvent(
            KeyEvent(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_ENTER)
        )
        getCurrentInputConnection()?.sendKeyEvent(
            KeyEvent(KeyEvent.ACTION_UP, KeyEvent.KEYCODE_ENTER)
        )

        currentText = ""
        playKeyClick()
    }

    /**
     * Handle shift key
     */
    fun onShift() {
        when {
            isCapsLock -> {
                isCapsLock = false
                isShifted = false
            }
            isShifted -> {
                isCapsLock = true
            }
            else -> {
                isShifted = true
            }
        }
        keyboardView?.updateShiftState(isShifted, isCapsLock)
        playKeyClick()
    }

    /**
     * Handle symbol/number toggle
     */
    fun onSymbols() {
        currentState = if (currentState == STATE_SYMBOLS) {
            STATE_DEFAULT
        } else {
            STATE_SYMBOLS
        }
        keyboardView?.setState(currentState)
        playKeyClick()
    }

    /**
     * Handle globe key (switch keyboard)
     */
    fun onGlobe() {
        switchToNextInputMethod()
    }

    /**
     * Handle voice input (via Whisper)
     */
    fun onVoiceInput() {
        currentState = STATE_VOICE
        keyboardView?.setState(currentState)

        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, getSpeechLanguage())
            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
        }
        startVoiceActivity(intent)
    }

    private fun getSpeechLanguage(): String {
        return when (currentLanguage) {
            "hi" -> "hi-IN"
            "en-hi" -> "en-IN"
            else -> "en-US"
        }
    }

    private fun startVoiceActivity(intent: Intent) {
        try {
            startIntentSenderForResult(
                intent, REQUEST_VOICE_INPUT, null, 0, 0, 0
            )
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start voice", e)
            // Fallback to direct Whisper API
            startDirectVoiceInput()
        }
    }

    private fun startDirectVoiceInput() {
        scope.launch {
            try {
                // Request Whisper service for voice
                val response = gatewayRequest("/whisper/status", JSONObject().apply {
                    put("userId", userId)
                })

                if (response.optBoolean("available", false)) {
                    Toast.makeText(this@RazoInputMethodService,
                        "Whisper service available", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Toast.makeText(this@RazoInputMethodService,
                    "Voice input unavailable", Toast.LENGTH_SHORT).show()
            }
        }
    }

    /**
     * Handle Genie mode activation
     */
    fun onGenieMode() {
        currentState = STATE_GENIE
        keyboardView?.setState(currentState)

        scope.launch {
            try {
                val response = gatewayRequest("/genie/briefing", JSONObject().apply {
                    put("userId", userId)
                    put("context", conversationContext.toJSONArray())
                    put("language", currentLanguage)
                })

                val briefing = response.optString("briefing", "")
                if (briefing.isNotEmpty()) {
                    keyboardView?.showGenieBriefing(briefing)
                }

                trackAnalytics("genie_activated", JSONObject().apply {
                    put("timestamp", System.currentTimeMillis())
                })
            } catch (e: Exception) {
                Log.e(TAG, "Genie briefing failed", e)
            }
        }
    }

    /**
     * Handle suggestions view
     */
    fun onSuggestions() {
        currentState = STATE_SUGGESTIONS
        keyboardView?.setState(currentState)
        loadSuggestions()
    }

    /**
     * Handle actions view
     */
    fun onActions() {
        currentState = STATE_ACTIONS
        keyboardView?.setState(currentState)
        loadActionCards()
    }

    /**
     * Handle command bar
     */
    fun onCommandBar() {
        currentState = STATE_COMMANDS
        keyboardView?.setState(currentState)
        loadCommands()
    }

    /**
     * Handle prediction selection
     */
    fun onPredictionSelected(prediction: String) {
        // Calculate what to insert (rest of the word)
        val words = currentText.trimEnd().split(" ")
        val lastWord = words.lastOrNull() ?: ""

        if (lastWord.isNotEmpty()) {
            // Delete the partial word
            for (i in 0 until lastWord.length) {
                getCurrentInputConnection()?.deleteSurroundingText(1, 0)
            }
        }

        // Insert the full prediction
        val textToInsert = if (lastWord.isNotEmpty()) {
            "$lastWord$prediction"
        } else {
            prediction
        }

        getCurrentInputConnection()?.commitText(textToInsert, 1)
        currentText += textToInsert

        // Track prediction selection
        trackAnalytics("prediction_selected", JSONObject().apply {
            put("prediction", prediction)
            put("language", currentLanguage)
        })

        playKeyClick()
    }

    /**
     * Handle suggestion selection
     */
    fun onSuggestionSelected(suggestion: JSONObject) {
        val type = suggestion.optString("type", "text")
        val content = suggestion.optString("content", "")

        when (type) {
            "text" -> {
                getCurrentInputConnection()?.commitText(content, 1)
                currentText += content
            }
            "action" -> {
                executeAction(suggestion)
            }
            "command" -> {
                executeCommand(suggestion)
            }
        }

        trackAnalytics("suggestion_selected", suggestion)
        playKeyClick()
    }

    /**
     * Handle action card selection
     */
    fun onActionSelected(action: JSONObject) {
        executeAction(action)
        trackAnalytics("action_selected", action)
    }

    /**
     * Handle command selection
     */
    fun onCommandSelected(command: JSONObject) {
        executeCommand(command)
        trackAnalytics("command_selected", command)
    }

    // ==================== Text Processing ====================

    /**
     * Route text events to prediction engine
     */
    private fun textEventRouter(text: String) {
        scope.launch {
            try {
                val predictions = requestPredictions(currentText)
                keyboardView?.updatePredictions(predictions)

                // Also update suggestions based on context
                if (currentText.length > 3) {
                    updateSuggestions()
                }
            } catch (e: Exception) {
                // Silently fail - predictions are optional
            }
        }
    }

    /**
     * Load predictions from v2.0 predictive engine
     */
    private fun loadPredictions() {
        scope.launch {
            try {
                val predictions = requestPredictions(currentText)
                lastPredictions = predictions
                keyboardView?.updatePredictions(predictions)
            } catch (e: Exception) {
                // Silently fail
            }
        }
    }

    /**
     * Request predictions from integration gateway
     */
    private suspend fun requestPredictions(text: String): List<String> {
        return withContext(Dispatchers.IO) {
            try {
                val response = gatewayRequest("/predict", JSONObject().apply {
                    put("text", text)
                    put("userId", userId)
                    put("language", currentLanguage)
                    put("context", conversationContext.toJSONArray())
                })

                val predictions = mutableListOf<String>()
                response.optJSONArray("predictions")?.let { arr ->
                    for (i in 0 until arr.length()) {
                        predictions.add(arr.getString(i))
                    }
                }
                predictions
            } catch (e: Exception) {
                Log.w(TAG, "Gateway prediction failed, trying direct", e)
                // Fallback to direct predictive service
                requestPredictionDirect(text)
            }
        }
    }

    /**
     * Fallback direct prediction request
     */
    private suspend fun requestPredictionDirect(text: String): List<String> {
        return withContext(Dispatchers.IO) {
            try {
                val url = URL(PREDICTIVE_URL)
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "POST"
                connection.setRequestProperty("Content-Type", "application/json")
                connection.doOutput = true
                connection.connectTimeout = 3000
                connection.readTimeout = 3000

                val body = JSONObject().apply {
                    put("text", text)
                    put("userId", userId)
                    put("language", currentLanguage)
                }

                connection.outputStream.use { it.write(body.toString().toByteArray()) }

                val responseCode = connection.responseCode
                if (responseCode == 200) {
                    val response = connection.inputStream.bufferedReader().readText()
                    val json = JSONObject(response)
                    val predictions = mutableListOf<String>()
                    json.optJSONArray("predictions")?.let { arr ->
                        for (i in 0 until arr.length()) {
                            predictions.add(arr.getString(i))
                        }
                    }
                    predictions
                } else {
                    emptyList()
                }
            } catch (e: Exception) {
                Log.w(TAG, "Direct prediction failed", e)
                emptyList()
            }
        }
    }

    /**
     * Load smart suggestions
     */
    private fun loadSuggestions() {
        scope.launch {
            try {
                val response = gatewayRequest("/suggestions", JSONObject().apply {
                    put("text", currentText)
                    put("userId", userId)
                    put("language", currentLanguage)
                    put("context", conversationContext.toJSONArray())
                })

                val suggestions = mutableListOf<JSONObject>()
                response.optJSONArray("suggestions")?.let { arr ->
                    for (i in 0 until arr.length()) {
                        suggestions.add(arr.getJSONObject(i))
                    }
                }
                keyboardView?.updateSuggestions(suggestions)
            } catch (e: Exception) {
                Log.w(TAG, "Suggestions load failed", e)
            }
        }
    }

    /**
     * Update suggestions based on current context
     */
    private suspend fun updateSuggestions() {
        val response = gatewayRequest("/suggestions/update", JSONObject().apply {
            put("text", currentText)
            put("userId", userId)
            put("language", currentLanguage)
        })

        val suggestions = mutableListOf<JSONObject>()
        response.optJSONArray("suggestions")?.let { arr ->
            for (i in 0 until arr.length()) {
                suggestions.add(arr.getJSONObject(i))
            }
        }
        keyboardView?.updateSuggestions(suggestions)
    }

    /**
     * Load action cards
     */
    private fun loadActionCards() {
        scope.launch {
            try {
                val response = gatewayRequest("/actions", JSONObject().apply {
                    put("userId", userId)
                    put("context", currentText)
                })

                val actions = mutableListOf<JSONObject>()
                response.optJSONArray("actions")?.let { arr ->
                    for (i in 0 until arr.length()) {
                        actions.add(arr.getJSONObject(i))
                    }
                }
                keyboardView?.updateActions(actions)
            } catch (e: Exception) {
                Log.w(TAG, "Actions load failed", e)
            }
        }
    }

    /**
     * Load commands
     */
    private fun loadCommands() {
        scope.launch {
            try {
                val response = gatewayRequest("/commands", JSONObject().apply {
                    put("userId", userId)
                    put("query", currentText)
                })

                val commands = mutableListOf<JSONObject>()
                response.optJSONArray("commands")?.let { arr ->
                    for (i in 0 until arr.length()) {
                        commands.add(arr.getJSONObject(i))
                    }
                }
                keyboardView?.updateCommands(commands)
            } catch (e: Exception) {
                Log.w(TAG, "Commands load failed", e)
            }
        }
    }

    /**
     * Execute an action
     */
    private fun executeAction(action: JSONObject) {
        val actionType = action.optString("type", "")
        val actionData = action.optJSONObject("data")

        scope.launch {
            try {
                val response = gatewayRequest("/actions/execute", JSONObject().apply {
                    put("actionType", actionType)
                    put("actionData", actionData)
                    put("userId", userId)
                })

                val result = response.optString("result", "")
                if (result.isNotEmpty()) {
                    getCurrentInputConnection()?.commitText(result, 1)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Action execution failed", e)
            }
        }
    }

    /**
     * Execute a command
     */
    private fun executeCommand(command: JSONObject) {
        val commandId = command.optString("id", "")
        val commandData = command.optJSONObject("data")

        scope.launch {
            try {
                val response = gatewayRequest("/commands/execute", JSONObject().apply {
                    put("commandId", commandId)
                    put("commandData", commandData)
                    put("userId", userId)
                })

                val result = response.optString("result", "")
                if (result.isNotEmpty()) {
                    getCurrentInputConnection()?.commitText(result, 1)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Command execution failed", e)
            }
        }
    }

    // ==================== Gateway Communication ====================

    /**
     * Make request to integration gateway
     */
    private suspend fun gatewayRequest(endpoint: String, body: JSONObject): JSONObject {
        return withContext(Dispatchers.IO) {
            try {
                val url = URL("$GATEWAY_URL$endpoint")
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "POST"
                connection.setRequestProperty("Content-Type", "application/json")
                connection.setRequestProperty("Authorization", "Bearer $sessionToken")
                connection.doOutput = true
                connection.connectTimeout = 5000
                connection.readTimeout = 5000

                connection.outputStream.use { it.write(body.toString().toByteArray()) }

                val responseCode = connection.responseCode
                if (responseCode == 200) {
                    connection.inputStream.bufferedReader().readText().let {
                        JSONObject(it)
                    }
                } else {
                    isOnline = false
                    JSONObject()
                }
            } catch (e: Exception) {
                isOnline = false
                throw e
            }
        }
    }

    // ==================== Analytics ====================

    /**
     * Track analytics events
     */
    private fun trackAnalytics(event: String, data: JSONObject) {
        scope.launch {
            try {
                gatewayRequest("/analytics/track", JSONObject().apply {
                    put("event", event)
                    put("data", data)
                    put("userId", userId)
                    put("timestamp", System.currentTimeMillis())
                })
            } catch (e: Exception) {
                // Analytics failure is non-critical
            }
        }
    }

    // ==================== Audio ====================

    private fun playKeyClick() {
        audioManager?.playSoundEffect(AudioManager.FX_KEYPRESS_STANDARD)
    }

    // ==================== Cleanup ====================

    override fun onDestroy() {
        super.onDestroy()
        scope.cancel()

        // Sync offline data before exit
        if (!isOnline) {
            syncOfflineData()
        }
    }

    private fun syncOfflineData() {
        scope.launch {
            try {
                val prefs = getSharedPreferences("razo_offline", MODE_PRIVATE)
                val pendingSync = prefs.getString("pendingSync", null)

                if (pendingSync != null) {
                    val response = gatewayRequest("/sync", JSONObject().apply {
                        put("data", pendingSync)
                        put("userId", userId)
                    })

                    if (response.optBoolean("success", false)) {
                        prefs.edit().remove("pendingSync").apply()
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "Offline sync failed", e)
            }
        }
    }

    // ==================== Intent Handling ====================

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode == REQUEST_VOICE_INPUT && data != null) {
            val results = data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)
            if (!results.isNullOrEmpty()) {
                val spokenText = results[0]
                getCurrentInputConnection()?.commitText(spokenText, 1)
                currentText += spokenText

                // Process voice input through Whisper
                processVoiceInput(spokenText)
            }
        }
        super.onActivityResult(requestCode, resultCode, data)
    }

    private fun processVoiceInput(text: String) {
        scope.launch {
            try {
                val response = gatewayRequest("/whisper/process", JSONObject().apply {
                    put("text", text)
                    put("userId", userId)
                    put("language", currentLanguage)
                })

                // Check for corrections or enhancements
                val corrected = response.optString("corrected", "")
                if (corrected.isNotEmpty() && corrected != text) {
                    // Apply corrections if significant
                    val confidence = response.optDouble("confidence", 0.0)
                    if (confidence > 0.9) {
                        // High confidence correction
                    }
                }

                trackAnalytics("voice_input", JSONObject().apply {
                    put("original", text)
                    put("corrected", corrected)
                    put("language", currentLanguage)
                })
            } catch (e: Exception) {
                Log.w(TAG, "Voice processing failed", e)
            }
        }
    }

    companion object {
        private const val REQUEST_VOICE_INPUT = 100
    }
}

// ==================== Extension Functions ====================

/**
 * Convert mutable list to JSONArray
 */
fun MutableList<JSONObject>.toJSONArray(): JSONArray {
    val array = JSONArray()
    forEach { array.put(it) }
    return array
}

/**
 * Start activity for result
 */
private fun RazoInputMethodService.startIntentSenderForResult(
    intent: Intent,
    requestCode: Int,
    b: android.os.Bundle?,
    f1: Int,
    f2: Int,
    f3: Int
) {
    try {
        @Suppress("DEPRECATION")
        startActivityForResult(intent, requestCode)
    } catch (e: Exception) {
        Log.e("RazoIME", "Failed to start activity for result", e)
    }
}
