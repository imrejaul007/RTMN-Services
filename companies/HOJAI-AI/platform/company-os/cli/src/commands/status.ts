/**
 * Status Command
 */

import chalk from 'chalk';
import axios from 'axios';

const API_BASE = process.env.COMPANY_OS_API || 'http://localhost:4010';

export async function showStatus(companyId: string) {
  try {
    const response = await axios.get(`${API_BASE}/api/company/${companyId}/state`);

    if (!response.data) {
      console.log(chalk.red(`\n❌ Company ${companyId} not found.\n`));
      return;
    }

    const company = response.data;

    console.log(chalk.blue(`\n📊 Status: ${company.name}\n`));
    console.log(chalk.bold('Company ID:'), company.companyId);
    console.log(chalk.bold('Industry:'), company.industry);
    console.log(chalk.bold('Status:'), company.status || 'active');

    if (company.departments?.length) {
      console.log(chalk.bold('\n📦 Departments:'));
      company.departments.forEach((dept: string) => {
        console.log(`   • ${dept}`);
      });
    }

    if (company.extensions?.length) {
      console.log(chalk.bold('\n🔌 Extensions:'));
      company.extensions.forEach((ext: string) => {
        console.log(`   • ${ext}`);
      });
    }

    if (company.workers?.length) {
      console.log(chalk.bold('\n🤖 AI Workers:'));
      company.workers.forEach((worker: string) => {
        console.log(`   • ${worker}`);
      });
    }

    console.log('');
  } catch (error: any) {
    console.log(chalk.red('\n❌ Failed to get status'));
    console.log(error.message);
    process.exit(1);
  }
}
