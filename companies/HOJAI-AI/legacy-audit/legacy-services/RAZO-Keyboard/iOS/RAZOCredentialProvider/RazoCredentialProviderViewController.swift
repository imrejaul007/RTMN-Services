import AuthenticationServices
import LocalAuthentication

/**
 * RAZO Credential Provider View Controller
 *
 * Provides password autofill capabilities:
 * - Password field detection
 * - Vault integration
 * - Biometric unlock
 * - One-tap autofill
 */
class RazoCredentialProviderViewController: ASCredentialProviderViewController {

    // MARK: - Properties

    private var passwords: [PasswordItem] = []
    private var tableView: UITableView!

    // MARK: - Lifecycle

    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
    }

    // MARK: - Setup

    private func setupUI() {
        view.backgroundColor = .systemBackground

        // Title
        let titleLabel = UILabel()
        titleLabel.text = "RAZO Vault"
        titleLabel.font = .systemFont(ofSize: 20, weight: .bold)
        titleLabel.textAlignment = .center
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(titleLabel)

        // Table View
        tableView = UITableView(frame: .zero, style: .insetGrouped)
        tableView.delegate = self
        tableView.dataSource = self
        tableView.register(UITableViewCell.self, forCellReuseIdentifier: "PasswordCell")
        tableView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(tableView)

        // Constraints
        NSLayoutConstraint.activate([
            titleLabel.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 16),
            titleLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            titleLabel.trailingAnchor.constraint(equalTo: view.trailingAnchor),

            tableView.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 16),
            tableView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            tableView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            tableView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
    }

    // MARK: - Credential Provider Methods

    override func prepareCredentialList(for serviceIdentifiers: [ASCredentialServiceIdentifier]) {
        // Called when the user selects a password field
        // Load passwords for the given service identifiers

        loadPasswords(for: serviceIdentifiers)

        if passwords.isEmpty {
            // Show empty state
            showEmptyState()
        }
    }

    override func provideCredentialWithoutUserInteraction(for credentialIdentity: ASPasswordCredentialIdentity) {
        // Try to provide credential without showing UI
        // This is called when AutoFill is triggered automatically

        let context = LAContext()
        var error: NSError?

        if context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) {
            // Use biometric to authenticate
            context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics,
                                   localizedReason: "Unlock RAZO Vault") { [weak self] success, _ in
                if success {
                    self?.getCredential(for: credentialIdentity)
                }
            }
        } else {
            // Fallback to passcode
            context.evaluatePolicy(.deviceOwnerAuthentication,
                                   localizedReason: "Unlock RAZO Vault") { [weak self] success, _ in
                if success {
                    self?.getCredential(for: credentialIdentity)
                }
            }
        }
    }

    override func prepareInterfaceToProvideCredential(for credentialIdentity: ASPasswordCredentialIdentity) {
        // Prepare the UI to provide a specific credential
        // Called when user selects a credential from QuickType bar

        authenticateAndProvide(for: credentialIdentity)
    }

    override func prepareInterfaceForExtensionConfiguration() {
        // Called when configuring the extension
        // Show setup instructions
    }

    // MARK: - Authentication

    private func authenticateAndProvide(for credentialIdentity: ASPasswordCredentialIdentity) {
        let context = LAContext()
        var error: NSError?

        // Check if biometric is available
        if context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) {
            context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics,
                                   localizedReason: "Unlock RAZO Vault") { [weak self] success, authError in
                if success {
                    self?.getCredential(for: credentialIdentity)
                } else {
                    self?.showAuthError()
                }
            }
        } else {
            // Use device passcode
            context.evaluatePolicy(.deviceOwnerAuthentication,
                                   localizedReason: "Unlock RAZO Vault") { [weak self] success, _ in
                if success {
                    self?.getCredential(for: credentialIdentity)
                } else {
                    self?.showAuthError()
                }
            }
        }
    }

    private func getCredential(for credentialIdentity: ASPasswordCredentialIdentity) {
        // Find the credential
        if let password = findPassword(for: credentialIdentity) {
            let credential = ASPasswordCredential(user: password.username, password: password.password)
            extensionContext.completeRequest(withSelectedCredential: credential, completionHandler: nil)
        } else {
            extensionContext.cancelRequest(withError: NSError(
                domain: ASExtensionErrorDomain,
                code: ASExtensionError.credentialIdentityNotFound.rawValue
            ))
        }
    }

    // MARK: - Data Loading

    private func loadPasswords(for serviceIdentifiers: [ASCredentialServiceIdentifier]) {
        // In production, load from vault service
        // For now, use mock data
        passwords = [
            PasswordItem(site: "google.com", username: "user@gmail.com", password: "password123"),
            PasswordItem(site: "facebook.com", username: "user@email.com", password: "password456"),
            PasswordItem(site: "twitter.com", username: "user", password: "password789")
        ]

        tableView.reloadData()
    }

    private func findPassword(for identity: ASPasswordCredentialIdentity) -> PasswordItem? {
        return passwords.first { $0.site == identity.serviceIdentifier.identifier }
    }

    // MARK: - UI States

    private func showEmptyState() {
        let emptyLabel = UILabel()
        emptyLabel.text = "No saved passwords"
        emptyLabel.textAlignment = .center
        emptyLabel.textColor = .secondaryLabel
        emptyLabel.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(emptyLabel)

        NSLayoutConstraint.activate([
            emptyLabel.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            emptyLabel.centerYAnchor.constraint(equalTo: view.centerYAnchor)
        ])
    }

    private func showAuthError() {
        let alert = UIAlertController(
            title: "Authentication Failed",
            message: "Please try again.",
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "OK", style: .default) { [weak self] _ in
            self?.extensionContext.cancelRequest(withError: NSError(
                domain: ASExtensionErrorDomain,
                code: ASExtensionError.userCanceled.rawValue
            ))
        })
        present(alert, animated: true)
    }
}

// MARK: - UITableViewDelegate & DataSource

extension RazoCredentialProviderViewController: UITableViewDelegate, UITableViewDataSource {

    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return passwords.count
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "PasswordCell", for: indexPath)
        let password = passwords[indexPath.row]

        var config = cell.defaultContentConfiguration()
        config.text = password.site
        config.secondaryText = password.username
        config.image = UIImage(systemName: "lock.fill")
        cell.contentConfiguration = config

        return cell
    }

    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)

        let password = passwords[indexPath.row]
        let credential = ASPasswordCredential(user: password.username, password: password.password)
        extensionContext.completeRequest(withSelectedCredential: credential, completionHandler: nil)
    }

    func tableView(_ tableView: UITableView, titleForHeaderInSection section: Int) -> String? {
        return "Saved Passwords"
    }
}

// MARK: - Data Model

struct PasswordItem {
    let site: String
    let username: String
    let password: String
}
