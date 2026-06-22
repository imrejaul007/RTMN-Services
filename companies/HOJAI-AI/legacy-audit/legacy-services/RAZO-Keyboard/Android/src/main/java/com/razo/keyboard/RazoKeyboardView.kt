package com.razo.keyboard

import android.content.Context
import android.graphics.Color
import android.graphics.PorterDuff
import android.graphics.drawable.GradientDrawable
import android.util.TypedValue
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.widget.*
import androidx.core.view.setMargins
import kotlinx.coroutines.*
import org.json.JSONObject

/**
 * RAZO Keyboard View
 *
 * Custom keyboard view with:
 * - QWERTY layout
 * - Prediction row
 * - Voice input
 * - Shift/caps lock
 * - Symbol/number keys
 * - State-based rendering
 */
class RazoKeyboardView(context: Context) : LinearLayout(context) {

    companion object {
        // Keyboard layouts
        private val ROW1 = listOf("q", "w", "e", "r", "t", "y", "u", "i", "o", "p")
        private val ROW2 = listOf("a", "s", "d", "f", "g", "h", "j", "k", "l")
        private val ROW3 = listOf("shift", "z", "x", "c", "v", "b", "n", "m", "backspace")
        private val ROW4 = listOf("123", "globe", "voice", "space", "enter")

        private val ROW1_SYMBOLS = listOf("1", "2", "3", "4", "5", "6", "7", "8", "9", "0")
        private val ROW2_SYMBOLS = listOf("-", "/", ":", ";", "(", ")", "$", "&", "@", "\"")
        private val ROW3_SYMBOLS = listOf("#+=", ".", ",", "?", "!", "'", "backspace")
        private val ROW4_SYMBOLS = listOf("ABC", "globe", "voice", "space", "enter")

        private const val KEY_HEIGHT = 48
        private const val PREDICTION_HEIGHT = 40
        private const val KEY_SPACING = 4
    }

    private var inputMethodService: RazoInputMethodService? = null
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    // State
    private var currentState = RazoInputMethodService.STATE_DEFAULT
    private var isShifted = false
    private var isCapsLock = false

    // Views
    private val predictionRow: LinearLayout
    private val keyboardContainer: LinearLayout

    // Predictions
    private var predictions = mutableListOf<String>()

    init {
        orientation = VERTICAL
        setBackgroundColor(Color.parseColor("#F0F0F0"))

        // Prediction row
        predictionRow = LinearLayout(context).apply {
            orientation = HORIZONTAL
            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, dpToPx(PREDICTION_HEIGHT))
            setPadding(dpToPx(8), dpToPx(4), dpToPx(8), dpToPx(4))
            gravity = Gravity.CENTER_VERTICAL
        }
        addView(predictionRow)

        // Keyboard container
        keyboardContainer = LinearLayout(context).apply {
            orientation = VERTICAL
            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT)
        }
        addView(keyboardContainer)

        // Build initial keyboard
        buildKeyboard(ROW1, ROW2, ROW3, ROW4)
    }

    fun setInputMethodService(service: RazoInputMethodService) {
        inputMethodService = service
    }

    // ==================== Keyboard Building ====================

    private fun buildKeyboard(row1: List<String>, row2: List<String>, row3: List<String>, row4: List<String>) {
        keyboardContainer.removeAllViews()

        // Row 1
        keyboardContainer.addView(buildRow(row1, true))

        // Row 2
        keyboardContainer.addView(buildRow(row2, true))

        // Row 3
        keyboardContainer.addView(buildRow(row3, false))

        // Row 4
        keyboardContainer.addView(buildRow(row4, false))
    }

    private fun buildRow(keys: List<String>, equalWidth: Boolean): LinearLayout {
        return LinearLayout(context).apply {
            orientation = HORIZONTAL
            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, dpToPx(KEY_HEIGHT)).apply {
                topMargin = KEY_SPACING
            }
            gravity = Gravity.CENTER

            val keyWidth = if (equalWidth) {
                LayoutParams(0, LayoutParams.MATCH_PARENT, 1f)
            } else {
                LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.MATCH_PARENT)
            }

            keys.forEach { key ->
                val keyView = createKey(key)
                keyView.layoutParams = keyWidth
                addView(keyView)
            }
        }
    }

    private fun createKey(key: String): View {
        return when (key) {
            "shift" -> createSpecialKey("⇧", KEY_TYPE.SHIFT)
            "backspace" -> createSpecialKey("⌫", KEY_TYPE.BACKSPACE)
            "123" -> createSpecialKey("123", KEY_TYPE.SYMBOLS)
            "ABC" -> createSpecialKey("ABC", KEY_TYPE.SYMBOLS)
            "#+=" -> createSpecialKey("#+=", KEY_TYPE.SYMBOLS)
            "globe" -> createSpecialKey("🌐", KEY_TYPE.GLOBE)
            "voice" -> createSpecialKey("🎙", KEY_TYPE.VOICE)
            "space" -> createSpaceKey()
            "enter" -> createSpecialKey("↵", KEY_TYPE.ENTER)
            else -> createLetterKey(key)
        }
    }

    private fun createLetterKey(letter: String): Button {
        return Button(context).apply {
            text = if (isShifted || isCapsLock) letter.uppercase() else letter
            textSize = 18f
            setTextColor(Color.parseColor("#333333"))
            setBackgroundResource(R.drawable.key_background)
            layoutParams = LinearLayout.LayoutParams(0, LayoutParams.MATCH_PARENT, 1f).apply {
                setMargins(KEY_SPACING)
            }

            setOnClickListener {
                val char = if (isShifted || isCapsLock) letter[0].uppercaseChar() else letter[0]
                inputMethodService?.onCharacter(char)

                if (isShifted && !isCapsLock) {
                    isShifted = false
                    updateShiftState(isShifted, isCapsLock)
                    buildKeyboardState()
                }
            }

            setOnTouchListener { _, event ->
                if (event.action == MotionEvent.ACTION_DOWN) {
                    setBackgroundResource(R.drawable.key_background_pressed)
                } else {
                    setBackgroundResource(R.drawable.key_background)
                }
                false
            }
        }
    }

    private fun createSpecialKey(label: String, type: KEY_TYPE): Button {
        return Button(context).apply {
            text = label
            textSize = if (type == KEY_TYPE.VOICE) 24f else 14f
            setTextColor(Color.parseColor("#666666"))
            setBackgroundResource(R.drawable.key_special_background)
            layoutParams = LinearLayout.LayoutParams(
                if (type == KEY_TYPE.SPACE) LayoutParams.MATCH_PARENT else dpToPx(48),
                LayoutParams.MATCH_PARENT
            ).apply {
                setMargins(KEY_SPACING)
                if (type == KEY_TYPE.SPACE) {
                    weight = 4f
                }
            }

            setOnClickListener {
                when (type) {
                    KEY_TYPE.SHIFT -> inputMethodService?.onShift()
                    KEY_TYPE.BACKSPACE -> handleBackspace()
                    KEY_TYPE.SYMBOLS -> inputMethodService?.onSymbols()
                    KEY_TYPE.GLOBE -> inputMethodService?.onGlobe()
                    KEY_TYPE.VOICE -> inputMethodService?.onVoiceInput()
                    KEY_TYPE.ENTER -> handleEnter()
                    KEY_TYPE.SPACE -> inputMethodService?.onSpace()
                    else -> {}
                }
            }

            // Long press for repeat backspace
            if (type == KEY_TYPE.BACKSPACE) {
                setOnLongClickListener {
                    repeatBackspace()
                    true
                }
            }
        }
    }

    private fun createSpaceKey(): Button {
        return Button(context).apply {
            text = "space"
            textSize = 14f
            setTextColor(Color.parseColor("#666666"))
            setBackgroundResource(R.drawable.key_special_background)
            layoutParams = LinearLayout.LayoutParams(0, LayoutParams.MATCH_PARENT, 4f).apply {
                setMargins(KEY_SPACING)
            }

            setOnClickListener {
                inputMethodService?.onSpace()
            }
        }
    }

    // ==================== State Management ====================

    fun setState(state: Int) {
        currentState = state
        buildKeyboardState()
    }

    fun updateShiftState(shifted: Boolean, capsLock: Boolean) {
        isShifted = shifted
        isCapsLock = capsLock
    }

    private fun buildKeyboardState() {
        when (currentState) {
            RazoInputMethodService.STATE_DEFAULT -> {
                buildKeyboard(ROW1, ROW2, ROW3, ROW4)
            }
            RazoInputMethodService.STATE_SYMBOLS -> {
                buildKeyboard(ROW1_SYMBOLS, ROW2_SYMBOLS, ROW3_SYMBOLS, ROW4_SYMBOLS)
            }
            RazoInputMethodService.STATE_VOICE -> {
                showVoiceMode()
            }
            RazoInputMethodService.STATE_GENIE -> {
                showGenieMode()
            }
            else -> {
                buildKeyboard(ROW1, ROW2, ROW3, ROW4)
            }
        }
        updatePredictions(predictions)
    }

    private fun showVoiceMode() {
        keyboardContainer.removeAllViews()

        val voiceView = LinearLayout(context).apply {
            orientation = VERTICAL
            gravity = Gravity.CENTER
            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, dpToPx(120))

            val micIcon = TextView(context).apply {
                text = "🎙"
                textSize = 48f
                gravity = Gravity.CENTER
            }
            addView(micIcon)

            val instruction = TextView(context).apply {
                text = "Tap to speak..."
                textSize = 16f
                setTextColor(Color.parseColor("#666666"))
                gravity = Gravity.CENTER
            }
            addView(instruction)
        }

        keyboardContainer.addView(voiceView)
    }

    private fun showGenieMode() {
        keyboardContainer.removeAllViews()

        val genieView = LinearLayout(context).apply {
            orientation = VERTICAL
            gravity = Gravity.CENTER
            layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, dpToPx(120))

            val genieIcon = TextView(context).apply {
                text = "🧭"
                textSize = 48f
                gravity = Gravity.CENTER
            }
            addView(genieIcon)

            val instruction = TextView(context).apply {
                text = "Hey Genie, what can I do for you?"
                textSize = 16f
                setTextColor(Color.parseColor("#666666"))
                gravity = Gravity.CENTER
            }
            addView(instruction)
        }

        keyboardContainer.addView(genieView)
    }

    // ==================== Predictions ====================

    fun updatePredictions(newPredictions: List<String>) {
        predictions.clear()
        predictions.addAll(newPredictions)
        renderPredictions()
    }

    private fun renderPredictions() {
        predictionRow.removeAllViews()

        if (predictions.isEmpty()) {
            // Show default quick actions
            val quickActions = listOf(".com", "?", "!")
            quickActions.forEach { action ->
                val btn = Button(context).apply {
                    text = action
                    textSize = 14f
                    setTextColor(Color.parseColor("#333333"))
                    setBackgroundResource(R.drawable.prediction_background)
                    layoutParams = LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.WRAP_CONTENT,
                        LinearLayout.LayoutParams.MATCH_PARENT
                    ).apply {
                        setMargins(dpToPx(4))
                    }
                    setOnClickListener {
                        inputMethodService?.onPredictionSelected(action)
                    }
                }
                predictionRow.addView(btn)
            }
        } else {
            predictions.take(3).forEach { prediction ->
                val btn = Button(context).apply {
                    text = prediction
                    textSize = 14f
                    setTextColor(Color.parseColor("#007AFF"))
                    setBackgroundResource(R.drawable.prediction_background)
                    layoutParams = LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.WRAP_CONTENT,
                        LinearLayout.LayoutParams.MATCH_PARENT
                    ).apply {
                        setMargins(dpToPx(4))
                    }
                    setOnClickListener {
                        inputMethodService?.onPredictionSelected(prediction)
                    }
                }
                predictionRow.addView(btn)
            }
        }
    }

    // ==================== Key Actions ====================

    private fun handleBackspace() {
        // Handled via InputMethodService
    }

    private fun handleEnter() {
        // Handled via InputMethodService
    }

    private fun repeatBackspace() {
        // Start repeating backspace
        val job = scope.launch {
            while (isActive) {
                // Delete one character
                delay(100)
            }
        }
    }

    // ==================== Helpers ====================

    private fun dpToPx(dp: Int): Int {
        return TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            dp.toFloat(),
            resources.displayMetrics
        ).toInt()
    }

    fun reset() {
        isShifted = false
        isCapsLock = false
        currentState = RazoInputMethodService.STATE_DEFAULT
        predictions.clear()
        buildKeyboardState()
    }

    enum class KEY_TYPE {
        LETTER, SHIFT, BACKSPACE, SYMBOLS, GLOBE, VOICE, ENTER, SPACE
    }
}