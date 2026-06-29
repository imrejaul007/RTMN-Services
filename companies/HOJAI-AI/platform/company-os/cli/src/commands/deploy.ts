/**
 * Deploy AI Worker Command
 */

import chalk from 'chalk';
import axios from 'axios';

const API_BASE = process.env.COMPANY_OS_API || 'http://localhost:4010';

export async function deployWorker(companyId: string, workerId: string) {
  console.log(chalk.blue(`\n🚀 Deploying ${workerId} to ${companyId}...\n`));

  try {
    const response = await axios.post(`${API_BASE}/api/company/${companyId}/workers/deploy`, {
      workerId,
    });

    if (response.data.success) {
      console.log(chalk.green('\n✅ Worker deployed successfully!\n'));
    } else {
      console.log(chalk.red('\n❌ Deployment failed'));
      console.log(response.data.error);
      process.exit(1);
    }
  } catch (error: any) {
    console.log(chalk.red('\n❌ Deployment failed'));
    console.log(error.response?.data?.error || error.message);
    process.exit(1);
  }
}
