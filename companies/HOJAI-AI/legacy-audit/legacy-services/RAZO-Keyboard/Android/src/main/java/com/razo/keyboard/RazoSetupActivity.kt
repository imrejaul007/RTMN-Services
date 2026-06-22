package com.razo.keyboard

import android.app.Activity
import android.app.AlertDialog
import android.content.Intent
import android.content.SharedPreferences
import android.os.Bundle
import android.provider.Settings
import android.view.View
import android.view.inputmethod.InputMethodManager
import android.widget.*
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/**
 * RAZO Setup Activity
 *
 * First-run setup for RAZO Keyboard:
 * - Enable keyboard
 * - Enable accessibility service
 * - Enable autofill service
 * - CorpID authentication
 * - Biometric setup
 */
class RazoSetupActivity : Activity() {

    companion object {
        private const val PREFS_NAME = "razo_setup"
        private const val KEY_SETUP_COMPLETE = "setup_complete"
        private const val KEY_AUTH_TOKEN = "auth_token"

        private const val CORPID_URL = "http://localhost:4702/auth"
    }

    private lateinit var prefs: SharedPreferences

    // UI Elements
    private lateinit var progressBar: ProgressBar
    private lateinit var statusText: TextView
    private lateinit var setupButton: Button
    private lateinit var skipButton: Button

    // Setup steps
    private var isKeyboardEnabled = false
    private var isAccessibilityEnabled = false
    private var isAutofillEnabled = false
    private var isAuthenticated = false
    private var isBiometricEnabled = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.setup_activity)

        prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE)

        initViews()
        checkExistingSetup()
    }

    private fun initViews() {
        progressBar = findViewById(R.id.setup_progress)
        statusText = findViewById(R.id.status_text)
        setupButton = findViewById(R.id.setup_button)
        skipButton = findViewById(R.id.skip_button)

        setupButton.setOnClickListener { startSetup() }
        skipButton.setOnClickListener { completeSetup() }
    }

    private fun checkExistingSetup() {
        if (prefs.getBoolean(KEY_SETUP_COMPLETE, false)) {
            // Already set up, check if keyboard is enabled
            if (isKeyboardEnabled()) {
                finish()
                return
            }
        }
        updateStatus()
    }

    // ==================== Setup Flow ====================

    private fun startSetup() {
        updateStatus("Checking system requirements...")

        lifecycleScope.launch {
            // Step 1: Enable keyboard
            updateStatus("Enable RAZO Keyboard...")
            enableKeyboard()
            if (!isKeyboardEnabled) {
                showKeyboardEnableDialog()
                return@launch
            }

            // Step 2: Enable accessibility
            updateStatus("Enable Accessibility Service...")
            enableAccessibility()
            if (!isAccessibilityEnabled) {
                showAccessibilityDialog()
                return@launch
            }

            // Step 3: Authenticate
            updateStatus("Authenticate with CorpID...")
            authenticateWithCorpID()

            // Step 4: Setup biometric (optional)
            if (canUseBiometric()) {
                updateStatus("Setup Biometric...")
                setupBiometric()
            }

            // Complete
            completeSetup()
        }
    }

    private fun completeSetup() {
        prefs.edit().putBoolean(KEY_SETUP_COMPLETE, true).apply()

        Toast.makeText(this, "RAZO Keyboard is ready!", Toast.LENGTH_SHORT).show()
        finish()
    }

    // ==================== Keyboard Enable ====================

    private fun enableKeyboard() {
        val imm = getSystemService(INPUT_METHOD_SERVICE) as InputMethodManager
        val enabledList = imm.enabledInputMethodList

        isKeyboardEnabled = enabledList.any {
            it.packageName == packageName
        }
    }

    private fun showKeyboardEnableDialog() {
        AlertDialog.Builder(this)
            .setTitle("Enable RAZO Keyboard")
            .setMessage("To use RAZO Keyboard, you need to enable it in system settings.")
            .setPositiveButton("Open Settings") { _, _ ->
                val intent = Intent(Settings.ACTION_INPUT_METHOD_SETTINGS)
                startActivity(intent)
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun isKeyboardEnabled(): Boolean {
        val imm = getSystemService(INPUT_METHOD_SERVICE) as InputMethodManager
        val enabledList = imm.enabledInputMethodList
        return enabledList.any { it.packageName == packageName }
    }

    // ==================== Accessibility ====================

    private fun enableAccessibility() {
        // Check if accessibility service is enabled
        val enabledServices = Settings.Secure.getString(
            contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        )

        isAccessibilityEnabled = enabledServices?.contains(packageName) == true
    }

    private fun showAccessibilityDialog() {
        AlertDialog.Builder(this)
            .setTitle("Enable Accessibility Service")
            .setMessage("RAZO Keyboard needs accessibility permission to:\n\n• Read text from apps\n• Detect app context\n• Provide smart suggestions\n• Enable voice input")
            .setPositiveButton("Open Settings") { _, _ ->
                val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
                startActivity(intent)
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    // ==================== CorpID Authentication ====================

    private suspend fun authenticateWithCorpID() {
        updateStatus("Authenticating with CorpID...")

        try {
            val response = authenticate()
            if (response.success) {
                isAuthenticated = true
                prefs.edit()
                    .putString(KEY_AUTH_TOKEN, response.token)
                    .putString("userId", response.userId)
                    .apply()
                updateStatus("✓ Authenticated")
            } else {
                showLoginDialog()
            }
        } catch (e: Exception) {
            // Use anonymous mode
            isAuthenticated = true
            updateStatus("✓ Using offline mode")
        }
    }

    private suspend fun authenticate(): AuthResponse {
        return with(java.util.concurrent.CompletableFuture<AuthResponse>()) { future ->
            try {
                val url = URL(CORPID_URL)
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "POST"
                connection.setRequestProperty("Content-Type", "application/json")
                connection.doOutput = true

                val body = JSONObject().apply {
                    put("deviceId", getDeviceId())
                }

                connection.outputStream.use { it.write(body.toString().toByteArray()) }

                if (connection.responseCode == 200) {
                    val response = connection.inputStream.bufferedReader().readText()
                    val json = JSONObject(response)
                    future.complete(AuthResponse(
                        success = true,
                        token = json.optString("token"),
                        userId = json.optString("userId")
                    ))
                } else {
                    future.complete(AuthResponse(success = false))
                }
            } catch (e: Exception) {
                future.complete(AuthResponse(success = false))
            }
        }.get()
    }

    private fun showLoginDialog() {
        val dialogView = layoutInflater.inflate(R.layout.login_dialog, null)
        val phoneInput = dialogView.findViewById<EditText>(R.id.phone_input)
        val otpInput = dialogView.findViewById<EditText>(R.id.otp_input)
        val sendOtpButton = dialogView.findViewById<Button>(R.id.send_otp_button)
        val loginButton = dialogView.findViewById<Button>(R.id.login_button)

        var otpSent = false

        sendOtpButton.setOnClickListener {
            val phone = phoneInput.text.toString()
            if (phone.length == 10) {
                // Send OTP (simplified)
                otpSent = true
                Toast.makeText(this, "OTP sent to $phone", Toast.LENGTH_SHORT).show()
                otpInput.visibility = View.VISIBLE
                loginButton.visibility = View.VISIBLE
                sendOtpButton.visibility = View.GONE
            } else {
                Toast.makeText(this, "Enter valid phone number", Toast.LENGTH_SHORT).show()
            }
        }

        loginButton.setOnClickListener {
            if (otpSent && otpInput.text.toString().length == 4) {
                // Verify OTP (simplified)
                isAuthenticated = true
                prefs.edit()
                    .putString("userId", "user_${phoneInput.text}")
                    .apply()
            }
        }

        AlertDialog.Builder(this)
            .setTitle("Login to RAZO")
            .setView(dialogView)
            .setCancelable(false)
            .show()
    }

    // ==================== Biometric ====================

    private fun canUseBiometric(): Boolean {
        val biometricManager = BiometricManager.from(this)
        return biometricManager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG) ==
                BiometricManager.BIOMETRIC_SUCCESS
    }

    private fun setupBiometric() {
        val executor = ContextCompat.getMainExecutor(this)

        val biometricPrompt = BiometricPrompt(this, executor,
            object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    super.onAuthenticationSucceeded(result)
                    isBiometricEnabled = true
                    prefs.edit().putBoolean("biometric_enabled", true).apply()
                    updateStatus("✓ Biometric enabled")
                }

                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    super.onAuthenticationError(errorCode, errString)
                    // User can skip biometric
                }
            })

        val promptInfo = BiometricPrompt.PromptInfo.Builder()
            .setTitle("Enable Biometric Unlock")
            .setSubtitle("Use fingerprint or face to unlock RAZO Vault")
            .setNegativeButtonText("Skip")
            .build()

        biometricPrompt.authenticate(promptInfo)
    }

    // ==================== Helpers ====================

    private fun updateStatus(text: String? = null) {
        runOnUiThread {
            text?.let { statusText.text = it }

            // Update progress
            var progress = 0
            if (isKeyboardEnabled) progress += 20
            if (isAccessibilityEnabled) progress += 20
            if (isAutofillEnabled) progress += 20
            if (isAuthenticated) progress += 20
            if (isBiometricEnabled) progress += 20

            progressBar.progress = progress
        }
    }

    private fun getDeviceId(): String {
        return android.provider.Settings.Secure.getString(
            contentResolver,
            android.provider.Settings.Secure.ANDROID_ID
        )
    }

    // ==================== Data Classes ====================

    data class AuthResponse(
        val success: Boolean,
        val token: String = "",
        val userId: String = ""
    )
}
