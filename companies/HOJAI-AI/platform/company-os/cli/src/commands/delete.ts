/**
 * Delete Company Command
 */

import chalk from 'chalk';
import axios from 'axios';
import inquirer from 'inquirer';

const API_BASE = process.env.COMPANY_OS_API || 'http://localhost:4010';

interface DeleteOptions {
  force: boolean;
}

export async function deleteCompany(companyId: string, options: DeleteOptions) {
  // Confirm unless --force
  if (!options.force) {
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `Delete company ${companyId}? This cannot be undone.`,
        default: false,
      },
    ]);

    if (!confirm) {
      console.log(chalk.yellow('\nCancelled.\n'));
      return;
    }
  }

  try {
    await axios.delete(`${API_BASE}/api/company/${companyId}`);
    console.log(chalk.green(`\n✅ Company ${companyId} deleted.\n`));
  } catch (error: any) {
    console.log(chalk.red('\n❌ Failed to delete company'));
    console.log(error.response?.data?.error || error.message);
    process.exit(1);
  }
}
