package com.razo.keyboard

import android.app.assist.AssistStructure
import android.os.Build
import android.os.CancellationSignal
import android.service.autofill.*
import android.view.autofill.AutofillId
import android.view.autofill.AutofillValue
import android.widget.RemoteViews
import androidx.annotation.RequiresApi
import kotlinx.coroutines.*
import org.json.JSONObject

/**
 * RAZO Autofill Service
 *
 * Provides password autofill capabilities:
 * - Password field detection
 * - Vault integration
 * - Biometric unlock
 * - One-tap autofill
 */
@RequiresApi(Build.VERSION_CODES.O)
class RazoAutofillService : AutofillService() {

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    companion object {
        private const val TAG = "RazoAutofill"

        private const val VAULT_URL = "http://localhost:4632"
        private const val SYNC_URL = "http://localhost:4631"

        // Field types to autofill
        private val USERNAME_HINTS = listOf(
            "username", "email", "user", "login", "signin", "account"
        )
        private val PASSWORD_HINTS = listOf(
            "password", "pass", "pwd", "secret"
        )
    }

    override fun onFillRequest(
        request: FillRequest,
        cancellationSignal: CancellationSignal,
        callback: FillCallback
    ) {
        val context = request.fillContexts.lastOrNull() ?: run {
            callback.onSuccess(null)
            return
        }

        val structure = context.structure
        val parsedFields = parseStructure(structure)

        if (parsedFields.usernameId == null && parsedFields.passwordId == null) {
            callback.onSuccess(null)
            return
        }

        // Check if user is authenticated
        if (!isUserAuthenticated()) {
            // Return authentication response
            val authResponse = FillResponse.Builder()
                .setAuthentication(
                    arrayOf(parsedFields.usernameId, parsedFields.passwordId).filterNotNull().toTypedArray(),
                    createAuthPresentation(),
                    android.content.Intent(this, RazoSetupActivity::class.java)
                )
                .build()
            callback.onSuccess(authResponse)
            return
        }

        // Get saved passwords for this app
        scope.launch {
            val passwords = getSavedPasswords()

            if (passwords.isEmpty()) {
                callback.onSuccess(null)
                return@launch
            }

            val responseBuilder = FillResponse.Builder()

            // Create dataset for each saved password
            passwords.forEach { entry ->
                val datasetBuilder = Dataset.Builder()

                entry.username?.let { username ->
                    parsedFields.usernameId?.let { id ->
                        datasetBuilder.setValue(
                            id,
                            AutofillValue.forText(username),
                            createUsernamePresentation(entry.site)
                        )
                    }
                }

                entry.password?.let { password ->
                    parsedFields.passwordId?.let { id ->
                        datasetBuilder.setValue(
                            id,
                            AutofillValue.forText(password),
                            createPasswordPresentation(entry.site)
                        )
                    }
                }

                try {
                    responseBuilder.addDataset(datasetBuilder.build())
                } catch (e: Exception) {
                    // Dataset might be empty
                }
            }

            try {
                callback.onSuccess(responseBuilder.build())
            } catch (e: Exception) {
                callback.onSuccess(null)
            }
        }
    }

    override fun onSaveRequest(
        request: SaveRequest,
        cancellationSignal: CancellationSignal,
        callback: SaveCallback
    ) {
        val context = request.fillContexts.lastOrNull() ?: run {
            callback.onSuccess()
            return
        }

        val structure = context.structure
        val parsedFields = parseStructure(structure)

        val appPackage = structure.activityComponent?.packageName ?: "unknown"
        val username = parsedFields.usernameValue
        val password = parsedFields.passwordValue

        if (username == null && password == null) {
            callback.onSuccess()
            return
        }

        // Save to vault
        scope.launch {
            try {
                val entry = PasswordEntry(
                    site = appPackage,
                    username = username ?: "",
                    password = password ?: ""
                )
                savePassword(entry)
                callback.onSuccess()
            } catch (e: Exception) {
                callback.onFailure("Failed to save password")
            }
        }
    }

    // ==================== Structure Parsing ====================

    private fun parseStructure(structure: AssistStructure): ParsedFields {
        val result = ParsedFields()

        for (i in 0 until structure.windowNodeCount) {
            val windowNode = structure.getWindowNodeAt(i)
            parseNode(windowNode.rootViewNode, result)
        }

        return result
    }

    private fun parseNode(node: AssistStructure.ViewNode, result: ParsedFields) {
        val hints = node.autofillHints
        val id = node.autofillId
        val text = node.text?.toString()?.lowercase() ?: ""
        val inputType = node.inputType

        if (hints != null) {
            when {
                hints.contains(android.view.View.AUTOFILL_HINT_USERNAME) ||
                hints.contains(android.view.View.AUTOFILL_HINT_EMAIL_ADDRESS) -> {
                    result.usernameId = id
                }
                hints.contains(android.view.View.AUTOFILL_HINT_PASSWORD) -> {
                    result.passwordId = id
                }
            }
        } else if (id != null) {
            // Fallback to hint text matching
            when {
                USERNAME_HINTS.any { text.contains(it) } -> {
                    result.usernameId = id
                }
                PASSWORD_HINTS.any { text.contains(it) } -> {
                    result.passwordId = id
                }
            }
        }

        // Parse children
        for (i in 0 until node.childCount) {
            parseNode(node.getChildAt(i), result)
        }
    }

    // ==================== Vault Integration ====================

    private suspend fun getSavedPasswords(): List<PasswordEntry> {
        return withContext(Dispatchers.IO) {
            try {
                val url = java.net.URL("$VAULT_URL/password/list")
                val connection = url.openConnection() as java.net.HttpURLConnection
                connection.requestMethod = "POST"
                connection.setRequestProperty("Content-Type", "application/json")
                connection.doOutput = true

                val body = JSONObject().apply {
                    put("userId", getUserId())
                    put("token", getAuthToken())
                }

                connection.outputStream.use { it.write(body.toString().toByteArray()) }

                val responseCode = connection.responseCode
                if (responseCode == 200) {
                    val response = connection.inputStream.bufferedReader().readText()
                    val json = JSONObject(response)
                    val entries = json.optJSONArray("entries") ?: return@withContext emptyList()

                    (0 until entries.length()).map { i ->
                        val obj = entries.getJSONObject(i)
                        PasswordEntry(
                            site = obj.optString("site"),
                            username = obj.optString("username"),
                            password = obj.optString("password")
                        )
                    }
                } else {
                    emptyList()
                }
            } catch (e: Exception) {
                emptyList()
            }
        }
    }

    private suspend fun savePassword(entry: PasswordEntry): Boolean {
        return withContext(Dispatchers.IO) {
            try {
                val url = java.net.URL("$VAULT_URL/password/save")
                val connection = url.openConnection() as java.net.HttpURLConnection
                connection.requestMethod = "POST"
                connection.setRequestProperty("Content-Type", "application/json")
                connection.doOutput = true

                val body = JSONObject().apply {
                    put("site", entry.site)
                    put("username", entry.username)
                    put("password", entry.password)
                    put("userId", getUserId())
                    put("token", getAuthToken())
                }

                connection.outputStream.use { it.write(body.toString().toByteArray()) }

                val responseCode = connection.responseCode
                responseCode == 200
            } catch (e: Exception) {
                false
            }
        }
    }

    // ==================== Authentication ====================

    private fun isUserAuthenticated(): Boolean {
        val prefs = getSharedPreferences("razo_session", MODE_PRIVATE)
        return prefs.getString("authToken", null) != null
    }

    private fun getUserId(): String {
        val prefs = getSharedPreferences("razo_session", MODE_PRIVATE)
        return prefs.getString("userId", "anonymous") ?: "anonymous"
    }

    private fun getAuthToken(): String {
        val prefs = getSharedPreferences("razo_session", MODE_PRIVATE)
        return prefs.getString("authToken", "") ?: ""
    }

    // ==================== Presentations ====================

    private fun createAuthPresentation(): RemoteViews {
        return RemoteViews(packageName, R.layout.autofill_auth).apply {
            setTextViewText(R.id.autofill_title, "RAZO Vault")
            setTextViewText(R.id.autofill_subtitle, "Authenticate to autofill")
        }
    }

    private fun createUsernamePresentation(site: String): RemoteViews {
        return RemoteViews(packageName, R.layout.autofill_item).apply {
            setTextViewText(R.id.autofill_title, site)
            setTextViewText(R.id.autofill_subtitle, "Username")
        }
    }

    private fun createPasswordPresentation(site: String): RemoteViews {
        return RemoteViews(packageName, R.layout.autofill_item).apply {
            setTextViewText(R.id.autofill_title, site)
            setTextViewText(R.id.autofill_subtitle, "••••••••")
        }
    }

    // ==================== Cleanup ====================

    override fun onDestroy() {
        super.onDestroy()
        scope.cancel()
    }

    // ==================== Data Classes ====================

    data class ParsedFields(
        var usernameId: AutofillId? = null,
        var passwordId: AutofillId? = null,
        var usernameValue: String? = null,
        var passwordValue: String? = null
    )

    data class PasswordEntry(
        val site: String,
        val username: String,
        val password: String
    )
}
