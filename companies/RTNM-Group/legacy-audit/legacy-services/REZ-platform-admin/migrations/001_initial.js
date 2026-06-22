/**
 * REZ Platform Admin - Database Migrations
 * Run: npx sequelize-cli db:migrate
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // Companies table
    await queryInterface.createTable('companies', {
      company_id: { type: Sequelize.STRING, primaryKey: true },
      name: Sequelize.STRING,
      slug: Sequelize.STRING,
      type: Sequelize.ENUM('consumer', 'merchant', 'media', 'hospitality', 'corpperks', 'holding', 'rabtul'),
      status: { type: Sequelize.ENUM('active', 'suspended', 'inactive'), defaultValue: 'active' },
      settings: Sequelize.JSONB,
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE }
    });

    // Global users table
    await queryInterface.createTable('global_users', {
      user_id: { type: Sequelize.STRING, primaryKey: true },
      email: { type: Sequelize.STRING, unique: true },
      password_hash: Sequelize.STRING,
      name: Sequelize.STRING,
      role: Sequelize.ENUM('super_admin', 'cfo', 'cto', 'cmo', 'coo', 'chro', 'chief_ai_officer', 'viewer'),
      permissions: Sequelize.JSONB,
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      last_login: Sequelize.DATE,
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });

    // Company users table
    await queryInterface.createTable('company_users', {
      user_id: { type: Sequelize.STRING, primaryKey: true },
      company_id: Sequelize.STRING,
      email: Sequelize.STRING,
      password_hash: Sequelize.STRING,
      name: Sequelize.STRING,
      department: Sequelize.ENUM('engineering', 'marketing', 'sales', 'operations', 'finance', 'hr', 'support', 'admin'),
      role: Sequelize.ENUM('ceo', 'cto', 'cfo', 'cmo', 'coo', 'head', 'manager', 'lead', 'member', 'viewer'),
      permissions: Sequelize.JSONB,
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      last_login: Sequelize.DATE,
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });

    // API keys table
    await queryInterface.createTable('api_keys', {
      key_id: { type: Sequelize.STRING, primaryKey: true },
      name: Sequelize.STRING,
      user_id: Sequelize.STRING,
      company_id: Sequelize.STRING,
      scopes: Sequelize.JSONB,
      services: Sequelize.JSONB,
      expires_at: Sequelize.DATE,
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      last_used: Sequelize.DATE,
      usage_count: { type: Sequelize.INTEGER, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });

    // Audit log table
    await queryInterface.createTable('audit_logs', {
      log_id: { type: Sequelize.STRING, primaryKey: true },
      action: Sequelize.STRING,
      user_id: Sequelize.STRING,
      company_id: Sequelize.STRING,
      resource: Sequelize.STRING,
      method: Sequelize.STRING,
      path: Sequelize.STRING,
      request_body: Sequelize.JSONB,
      response_status: Sequelize.INTEGER,
      ip_address: Sequelize.STRING,
      user_agent: Sequelize.TEXT,
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });

    // Notifications table
    await queryInterface.createTable('notifications', {
      notification_id: { type: Sequelize.STRING, primaryKey: true },
      user_id: Sequelize.STRING,
      title: Sequelize.STRING,
      body: Sequelize.TEXT,
      type: Sequelize.ENUM('info', 'warning', 'error', 'success'),
      read: { type: Sequelize.BOOLEAN, defaultValue: false },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });

    // Settings table
    await queryInterface.createTable('settings', {
      setting_id: { type: Sequelize.STRING, primaryKey: true },
      category: Sequelize.STRING,
      key: Sequelize.STRING,
      value: Sequelize.JSONB,
      user_id: Sequelize.STRING,
      company_id: Sequelize.STRING,
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });

    // Indexes
    await queryInterface.addIndex('audit_logs', ['user_id', 'created_at']);
    await queryInterface.addIndex('notifications', ['user_id', 'read']);
    await queryInterface.addIndex('api_keys', ['user_id', 'is_active']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('settings');
    await queryInterface.dropTable('notifications');
    await queryInterface.dropTable('audit_logs');
    await queryInterface.dropTable('api_keys');
    await queryInterface.dropTable('company_users');
    await queryInterface.dropTable('global_users');
    await queryInterface.dropTable('companies');
  }
};
