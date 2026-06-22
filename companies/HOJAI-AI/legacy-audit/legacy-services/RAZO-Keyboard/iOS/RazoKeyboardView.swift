import UIKit

// MARK: - Delegate Protocol

protocol RazoKeyboardViewDelegate: AnyObject {
    func keyboardView(_ view: RazoKeyboardView, didTapKey key: String)
    func keyboardView(_ view: RazoKeyboardView, didSelectPrediction prediction: String)
    func keyboardView(_ view: RazoKeyboardView, didTapApp appId: String)
}

// MARK: - Keyboard View

/**
 * RAZO Keyboard View
 *
 * Custom keyboard view with:
 * - QWERTY layout
 * - Prediction row
 * - Voice input button
 * - Shift/caps lock
 * - Symbol/number keys
 */
class RazoKeyboardView: UIView {

    // MARK: - Properties

    weak var delegate: RazoKeyboardViewDelegate?

    private var currentState: RazoKeyboardViewController.KeyboardState = .default
    private var isShifted = false
    private var isCapsLock = false

    // Views
    private let predictionRow = UIStackView()
    private let keyboardContainer = UIStackView()
    private let voiceOverlay = UIView()
    private let voiceLabel = UILabel()
    private let transcriptLabel = UILabel()

    // Keyboard layouts
    private let row1Letters = ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"]
    private let row2Letters = ["a", "s", "d", "f", "g", "h", "j", "k", "l"]
    private let row3Letters = ["z", "x", "c", "v", "b", "n", "m"]

    private let row1Symbols = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"]
    private let row2Symbols = ["-", "/", ":", ";", "(", ")", "$", "&", "@", "\""]
    private let row3Symbols = [".", ",", "?", "!", "'"]

    // MARK: - Init

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupView()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupView()
    }

    // MARK: - Setup

    private func setupView() {
        backgroundColor = UIColor(red: 0.94, green: 0.94, blue: 0.94, alpha: 1.0)

        // Prediction row
        predictionRow.axis = .horizontal
        predictionRow.distribution = .fillEqually
        predictionRow.spacing = 8
        predictionRow.translatesAutoresizingMaskIntoConstraints = false
        addSubview(predictionRow)

        // Keyboard container
        keyboardContainer.axis = .vertical
        keyboardContainer.distribution = .fillEqually
        keyboardContainer.spacing = 8
        keyboardContainer.translatesAutoresizingMaskIntoConstraints = false
        addSubview(keyboardContainer)

        // Voice overlay
        voiceOverlay.backgroundColor = UIColor(red: 0.0, green: 0.48, blue: 1.0, alpha: 0.95)
        voiceOverlay.layer.cornerRadius = 16
        voiceOverlay.isHidden = true
        voiceOverlay.translatesAutoresizingMaskIntoConstraints = false
        addSubview(voiceOverlay)

        let micIcon = UILabel()
        micIcon.text = "🎙"
        micIcon.font = .systemFont(ofSize: 48)
        micIcon.textAlignment = .center
        micIcon.translatesAutoresizingMaskIntoConstraints = false
        voiceOverlay.addSubview(micIcon)

        voiceLabel.text = "Tap to speak..."
        voiceLabel.textColor = .white
        voiceLabel.font = .systemFont(ofSize: 16)
        voiceLabel.textAlignment = .center
        voiceLabel.translatesAutoresizingMaskIntoConstraints = false
        voiceOverlay.addSubview(voiceLabel)

        transcriptLabel.textColor = .white
        transcriptLabel.font = .systemFont(ofSize: 14)
        transcriptLabel.textAlignment = .center
        transcriptLabel.numberOfLines = 2
        transcriptLabel.translatesAutoresizingMaskIntoConstraints = false
        voiceOverlay.addSubview(transcriptLabel)

        // Constraints
        NSLayoutConstraint.activate([
            predictionRow.topAnchor.constraint(equalTo: topAnchor, constant: 8),
            predictionRow.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 8),
            predictionRow.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -8),
            predictionRow.heightAnchor.constraint(equalToConstant: 40),

            keyboardContainer.topAnchor.constraint(equalTo: predictionRow.bottomAnchor, constant: 8),
            keyboardContainer.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 4),
            keyboardContainer.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -4),
            keyboardContainer.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -8),

            voiceOverlay.topAnchor.constraint(equalTo: topAnchor),
            voiceOverlay.leadingAnchor.constraint(equalTo: leadingAnchor),
            voiceOverlay.trailingAnchor.constraint(equalTo: trailingAnchor),
            voiceOverlay.bottomAnchor.constraint(equalTo: bottomAnchor),

            micIcon.centerXAnchor.constraint(equalTo: voiceOverlay.centerXAnchor),
            micIcon.centerYAnchor.constraint(equalTo: voiceOverlay.centerYAnchor, constant: -20),

            voiceLabel.topAnchor.constraint(equalTo: micIcon.bottomAnchor, constant: 8),
            voiceLabel.centerXAnchor.constraint(equalTo: voiceOverlay.centerXAnchor),

            transcriptLabel.topAnchor.constraint(equalTo: voiceLabel.bottomAnchor, constant: 8),
            transcriptLabel.leadingAnchor.constraint(equalTo: voiceOverlay.leadingAnchor, constant: 16),
            transcriptLabel.trailingAnchor.constraint(equalTo: voiceOverlay.trailingAnchor, constant: -16)
        ])

        // Build initial keyboard
        buildKeyboard()
    }

    // MARK: - Keyboard Building

    private func buildKeyboard() {
        keyboardContainer.arrangedSubviews.forEach { $0.removeFromSuperview() }

        switch currentState {
        case .default, .genie:
            addRow(row1Letters)
            addRow(row2Letters)
            addRowWithShift(row3Letters)
            addBottomRow()
        case .symbols, .numbers:
            addRow(row1Symbols)
            addRow(row2Symbols)
            addRowWithSymbols(row3Symbols)
            addBottomRow()
        case .voice:
            // Voice mode shows overlay
            break
        }
    }

    private func addRow(_ keys: [String]) {
        let row = UIStackView()
        row.axis = .horizontal
        row.distribution = .fillEqually
        row.spacing = 4

        for key in keys {
            row.addArrangedSubview(createKey(key))
        }

        keyboardContainer.addArrangedSubview(row)
    }

    private func addRowWithShift(_ keys: [String]) {
        let row = UIStackView()
        row.axis = .horizontal
        row.spacing = 4

        // Shift key
        let shiftKey = createSpecialKey("shift", isShifted || isCapsLock)
        shiftKey.widthAnchor.constraint(equalToConstant: 44).isActive = true
        row.addArrangedSubview(shiftKey)

        // Letter keys
        let lettersStack = UIStackView()
        lettersStack.axis = .horizontal
        lettersStack.distribution = .fillEqually
        lettersStack.spacing = 4

        for key in keys {
            lettersStack.addArrangedSubview(createKey(key))
        }
        row.addArrangedSubview(lettersStack)

        // Backspace key
        let backspaceKey = createSpecialKey("backspace", false)
        backspaceKey.widthAnchor.constraint(equalToConstant: 44).isActive = true
        row.addArrangedSubview(backspaceKey)

        keyboardContainer.addArrangedSubview(row)
    }

    private func addRowWithSymbols(_ keys: [String]) {
        let row = UIStackView()
        row.axis = .horizontal
        row.spacing = 4

        // Symbol toggle
        let symbolKey = createSpecialKey("ABC", false)
        symbolKey.widthAnchor.constraint(equalToConstant: 44).isActive = true
        row.addArrangedSubview(symbolKey)

        // Symbol keys
        let symbolsStack = UIStackView()
        symbolsStack.axis = .horizontal
        symbolsStack.distribution = .fillEqually
        symbolsStack.spacing = 4

        for key in keys {
            symbolsStack.addArrangedSubview(createKey(key))
        }
        row.addArrangedSubview(symbolsStack)

        // Backspace key
        let backspaceKey = createSpecialKey("backspace", false)
        backspaceKey.widthAnchor.constraint(equalToConstant: 44).isActive = true
        row.addArrangedSubview(backspaceKey)

        keyboardContainer.addArrangedSubview(row)
    }

    private func addBottomRow() {
        let row = UIStackView()
        row.axis = .horizontal
        row.spacing = 4

        // 123 key
        let numberKey = createSpecialKey("123", currentState == .symbols)
        numberKey.widthAnchor.constraint(equalToConstant: 44).isActive = true
        row.addArrangedSubview(numberKey)

        // Globe key
        let globeKey = createSpecialKey("globe", false)
        globeKey.widthAnchor.constraint(equalToConstant: 40).isActive = true
        row.addArrangedSubview(globeKey)

        // Voice key
        let voiceKey = createSpecialKey("voice", false)
        voiceKey.widthAnchor.constraint(equalToConstant: 40).isActive = true
        row.addArrangedSubview(voiceKey)

        // Space key
        let spaceKey = createKey("space")
        row.addArrangedSubview(spaceKey)

        // Return key
        let returnKey = createSpecialKey("return", false)
        returnKey.widthAnchor.constraint(equalToConstant: 80).isActive = true
        row.addArrangedSubview(returnKey)

        keyboardContainer.addArrangedSubview(row)
    }

    // MARK: - Key Creation

    private func createKey(_ key: String) -> UIButton {
        let button = UIButton(type: .system)
        button.layer.cornerRadius = 5
        button.layer.shadowColor = UIColor.black.cgColor
        button.layer.shadowOffset = CGSize(width: 0, height: 1)
        button.layer.shadowOpacity = 0.2
        button.layer.shadowRadius = 1

        if key == "space" {
            button.setTitle("space", for: .normal)
            button.backgroundColor = .white
        } else {
            let displayKey = isShifted || isCapsLock ? key.uppercased() : key
            button.setTitle(displayKey, for: .normal)
            button.backgroundColor = .white
        }

        button.setTitleColor(.black, for: .normal)
        button.titleLabel?.font = .systemFont(ofSize: 22)
        button.tag = key.hashValue

        button.addTarget(self, action: #selector(keyTapped(_:)), for: .touchUpInside)
        button.addTarget(self, action: #selector(keyTouchDown(_:)), for: .touchDown)
        button.addTarget(self, action: #selector(keyTouchUp(_:)), for: [.touchUpInside, .touchUpOutside, .touchCancel])

        return button
    }

    private func createSpecialKey(_ key: String, _ isActive: Bool) -> UIButton {
        let button = UIButton(type: .system)

        switch key {
        case "shift":
            button.setTitle(isActive ? "⇪" : "⇧", for: .normal)
        case "backspace":
            button.setTitle("⌫", for: .normal)
        case "globe":
            button.setTitle("🌐", for: .normal)
        case "voice":
            button.setTitle("🎙", for: .normal)
        case "return":
            button.setTitle("return", for: .normal)
            button.titleLabel?.font = .systemFont(ofSize: 16)
        case "123", "ABC":
            button.setTitle(key, for: .normal)
            button.titleLabel?.font = .systemFont(ofSize: 16)
        default:
            button.setTitle(key, for: .normal)
        }

        button.backgroundColor = UIColor(red: 0.82, green: 0.82, blue: 0.82, alpha: 1.0)
        button.setTitleColor(.darkGray, for: .normal)
        button.layer.cornerRadius = 5

        button.addTarget(self, action: #selector(keyTapped(_:)), for: .touchUpInside)

        return button
    }

    // MARK: - Actions

    @objc private func keyTapped(_ sender: UIButton) {
        // Find the key
        var key = ""

        if let title = sender.currentTitle {
            switch title {
            case "⇧", "⇪":
                key = "shift"
            case "⌫":
                key = "backspace"
            case "🌐":
                key = "globe"
            case "🎙":
                key = "voice"
            case "return":
                key = "return"
            case "123", "ABC":
                key = title.lowercased()
            case "space":
                key = "space"
            default:
                key = title.lowercased()
            }
        }

        delegate?.keyboardView(self, didTapKey: key)
    }

    @objc private func keyTouchDown(_ sender: UIButton) {
        UIView.animate(withDuration: 0.1) {
            sender.backgroundColor = UIColor(red: 0.85, green: 0.85, blue: 0.85, alpha: 1.0)
            sender.transform = CGAffineTransform(scaleX: 1.1, y: 1.1)
        }
    }

    @objc private func keyTouchUp(_ sender: UIButton) {
        UIView.animate(withDuration: 0.1) {
            sender.backgroundColor = .white
            sender.transform = .identity
        }
    }

    // MARK: - State Management

    func setState(_ state: RazoKeyboardViewController.KeyboardState) {
        currentState = state
        buildKeyboard()
    }

    func updateShiftState(shifted: Bool, capsLock: Bool) {
        isShifted = shifted
        isCapsLock = capsLock
        buildKeyboard()
    }

    // MARK: - Predictions

    func updatePredictions(_ predictions: [String]) {
        predictionRow.arrangedSubviews.forEach { $0.removeFromSuperview() }

        if predictions.isEmpty() {
            // Show default quick actions
            let defaults = [".com", "?", "!"]
            for action in defaults {
                let button = createPredictionButton(action)
                predictionRow.addArrangedSubview(button)
            }
        } else {
            for prediction in predictions.prefix(3) {
                let button = createPredictionButton(prediction)
                predictionRow.addArrangedSubview(button)
            }
        }
    }

    private func createPredictionButton(_ text: String) -> UIButton {
        let button = UIButton(type: .system)
        button.setTitle(text, for: .normal)
        button.setTitleColor(UIColor(red: 0.0, green: 0.48, blue: 1.0, alpha: 1.0), for: .normal)
        button.titleLabel?.font = .systemFont(ofSize: 16)
        button.backgroundColor = UIColor(red: 0.91, green: 0.94, blue: 1.0, alpha: 1.0)
        button.layer.cornerRadius = 4

        button.addTarget(self, action: #selector(predictionTapped(_:)), for: .touchUpInside)

        return button
    }

    @objc private func predictionTapped(_ sender: UIButton) {
        if let prediction = sender.currentTitle {
            delegate?.keyboardView(self, didSelectPrediction: prediction)
        }
    }

    // MARK: - Voice UI

    func showVoiceUI() {
        voiceOverlay.isHidden = false
        voiceLabel.text = "Listening..."
    }

    func hideVoiceUI() {
        voiceOverlay.isHidden = true
        transcriptLabel.text = ""
    }

    func updateTranscript(_ text: String) {
        transcriptLabel.text = text
    }

    func showGenieResponse(_ command: String) {
        voiceLabel.text = "Processing..."
        // In production, show Genie response
    }
}