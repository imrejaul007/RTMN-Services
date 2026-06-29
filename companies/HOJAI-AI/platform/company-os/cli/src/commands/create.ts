/**
 * Create Company Command
 */

import chalk from 'chalk';
import axios from 'axios';

const API_BASE = process.env.COMPANY_OS_API || 'http://localhost:4010';

interface CreateOptions {
  industry: string;
  departments: string;
  ai: string;
}

export async function createCompany(name: string, options: CreateOptions) {
  console.log(chalk.blue(`\n🚀 Creating company: ${name}\n`));

  // Parse departments
  const departments = options.departments.split(',').map(d => d.trim());

  // Parse AI config
  let aiDepartments: Record<string, any> = {};
  if (options.ai) {
    try {
      aiDepartments = JSON.parse(options.ai);
    } catch {
      console.log(chalk.yellow('⚠️  Invalid AI config JSON, ignoring...'));
    }
  }

  // Create company
  try {
    const response = await axios.post(`${API_BASE}/api/company/create`, {
      name,
      industry: options.industry,
      departments,
      ai_departments: aiDepartments,
    });

    if (response.data.success) {
      console.log(chalk.green('\n✅ Company created successfully!\n'));
      console.log(chalk.bold('Company ID:'), response.data.companyId);
      console.log(chalk.bold('Manifest:'), `保存在 ${API_BASE}/api/company/${response.data.companyId}/manifest`);

      if (response.data.manifest?.composition) {
        console.log('\n📦 Installed:');
        console.log(`   Departments: ${response.data.manifest.composition.departments?.length || 0}`);
        console.log(`   Extensions: ${response.data.manifest.composition.extensions?.length || 0}`);
        console.log(`   AI Workers: ${response.data.manifest.composition.aiWorkers?.length || 0}`);
      }
    } else {
      console.log(chalk.red('\n❌ Failed to create company'));
      console.log(response.data.error);
      process.exit(1);
    }
  } catch (error: any) {
    console.log(chalk.red('\n❌ Connection failed'));
    console.log(error.message);
    console.log(chalk.yellow(`\nIs the CompanyOS Control Plane running on ${API_BASE}?`));
    process.exit(1);
  }
}
