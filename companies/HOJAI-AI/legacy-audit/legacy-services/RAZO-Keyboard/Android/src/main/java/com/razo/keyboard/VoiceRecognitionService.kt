package com.razo.keyboard

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.*
import org.json.JSONObject
import java.io.OutputStream
import java.net.HttpURLConnection
import java.net.URL

/**
 * Voice Recognition Service
 *
 * Foreground service for continuous voice listening:
 * - Wake word detection ("Hey Genie")
 * - Voice activity detection
 * - Continuous listening mode
 */
class VoiceRecognitionService : Service() {

    companion object {
        private const val TAG = "VoiceService"
        private const val CHANNEL_ID = "razo_voice_channel"
        private const val NOTIFICATION_ID = 1001

        private const val SAMPLE_RATE = 16000
        private const val CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_MONO
        private const val AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT

        // Wake words
        private val WAKE_WORDS = listOf(
            "hey genie", "hey razo", "hey rezo", "ok genie", "ok razo"
        )

        // Service URLs
        private const val VOICE_API_URL = "http://localhost:4631/voice/process"
        private const val INTENT_URL = "http://localhost:4650/route"
    }

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var audioRecord: AudioRecord? = null
    private var isRecording = false

    private var wakeWordCallback: ((String) -> Unit)? = null
    private var transcriptCallback: ((String) -> Unit)? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START_LISTENING -> startListening()
            ACTION_STOP_LISTENING -> stopListening()
        }
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    // ==================== Recording ====================

    private fun startListening() {
        if (isRecording) return

        val bufferSize = AudioRecord.getMinBufferSize(SAMPLE_RATE, CHANNEL_CONFIG, AUDIO_FORMAT)

        try {
            audioRecord = AudioRecord(
                MediaRecorder.AudioSource.MIC,
                SAMPLE_RATE,
                CHANNEL_CONFIG,
                AUDIO_FORMAT,
                bufferSize
            )

            if (audioRecord?.state != AudioRecord.STATE_INITIALIZED) {
                Log.e(TAG, "Failed to initialize AudioRecord")
                return
            }

            isRecording = true
            audioRecord?.startRecording()

            // Show notification
            val notification = createNotification("Listening...")
            startForeground(NOTIFICATION_ID, notification)

            // Start processing in background
            scope.launch {
                processAudio(bufferSize)
            }

            Log.i(TAG, "Voice listening started")
        } catch (e: SecurityException) {
            Log.e(TAG, "Permission denied", e)
        }
    }

    private fun stopListening() {
        isRecording = false
        audioRecord?.stop()
        audioRecord?.release()
        audioRecord = null
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
        Log.i(TAG, "Voice listening stopped")
    }

    private suspend fun processAudio(bufferSize: Int) {
        val buffer = ShortArray(bufferSize)

        while (isRecording) {
            val read = audioRecord?.read(buffer, 0, bufferSize) ?: 0

            if (read > 0) {
                // Convert to bytes for processing
                val audioBytes = ByteArray(read * 2)
                for (i in 0 until read) {
                    audioBytes[i * 2] = (buffer[i].toInt() and 0xFF).toByte()
                    audioBytes[i * 2 + 1] = (buffer[i].toInt() shr 8 and 0xFF).toByte()
                }

                // Process through voice API
                val result = processVoiceChunk(audioBytes)

                result?.let {
                    val text = it.optString("text", "")
                    val isFinal = it.optBoolean("final", false)

                    if (text.isNotEmpty()) {
                        // Check for wake word
                        val detectedWakeWord = detectWakeWord(text)
                        if (detectedWakeWord != null) {
                            wakeWordCallback?.invoke(detectedWakeWord)
                            broadcastWakeWord(detectedWakeWord)
                        }

                        // Send transcript
                        if (isFinal) {
                            transcriptCallback?.invoke(text)
                            broadcastTranscript(text)
                        }
                    }
                }
            }

            delay(100) // Small delay to prevent CPU hogging
        }
    }

    // ==================== Voice Processing ====================

    private suspend fun processVoiceChunk(audio: ByteArray): JSONObject? {
        return withContext(Dispatchers.IO) {
            try {
                val url = URL(VOICE_API_URL)
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "POST"
                connection.setRequestProperty("Content-Type", "application/octet-stream")
                connection.doOutput = true

                connection.outputStream.use { it.write(audio) }

                if (connection.responseCode == 200) {
                    val response = connection.inputStream.bufferedReader().readText()
                    JSONObject(response)
                } else {
                    null
                }
            } catch (e: Exception) {
                null
            }
        }
    }

    // ==================== Wake Word Detection ====================

    private fun detectWakeWord(text: String): String? {
        val lowerText = text.lowercase()
        return WAKE_WORDS.find { lowerText.contains(it) }
    }

    private fun broadcastWakeWord(wakeWord: String) {
        val intent = Intent(ACTION_WAKE_WORD_DETECTED).apply {
            putExtra(EXTRA_WAKE_WORD, wakeWord)
            setPackage(packageName)
        }
        sendBroadcast(intent)
    }

    private fun broadcastTranscript(text: String) {
        val intent = Intent(ACTION_TRANSCRIPT_READY).apply {
            putExtra(EXTRA_TRANSCRIPT, text)
            setPackage(packageName)
        }
        sendBroadcast(intent)
    }

    // ==================== Notification ====================

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "RAZO Voice",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "RAZO keyboard voice listening"
                setShowBadge(false)
            }

            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun createNotification(text: String): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("RAZO Keyboard")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .build()
    }

    // ==================== Callbacks ====================

    fun setWakeWordCallback(callback: (String) -> Unit) {
        wakeWordCallback = callback
    }

    fun setTranscriptCallback(callback: (String) -> Unit) {
        transcriptCallback = callback
    }

    // ==================== Cleanup ====================

    override fun onDestroy() {
        super.onDestroy()
        scope.cancel()
        stopListening()
    }

    // ==================== Intent Actions ====================

    companion object {
        const val ACTION_START_LISTENING = "com.razo.keyboard.START_LISTENING"
        const val ACTION_STOP_LISTENING = "com.razo.keyboard.STOP_LISTENING"
        const val ACTION_WAKE_WORD_DETECTED = "com.razo.keyboard.WAKE_WORD_DETECTED"
        const val ACTION_TRANSCRIPT_READY = "com.razo.keyboard.TRANSCRIPT_READY"

        const val EXTRA_WAKE_WORD = "wake_word"
        const val EXTRA_TRANSCRIPT = "transcript"
    }
}
