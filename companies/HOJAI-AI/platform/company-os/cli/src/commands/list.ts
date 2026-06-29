/**
 * List Companies Command
 */

import chalk from 'chalk';
import axios from 'axios';

const API_BASE = process.env.COMPANY_OS_API || 'http://localhost:4010';

interface ListOptions {
  json: boolean;
}

export async function listCompanies(_options: ListOptions) {
  try {
    const response = await axios.get(`${API_BASE}/api/companies`);

    const companies = response.data.companies || [];

    if (companies.length === 0) {
      console.log(chalk.yellow('\nNo companies found.\n'));
      return;
    }

    if (_options.json) {
      console.log(JSON.stringify(companies, null, 2));
      return;
    }

    console.log(chalk.blue(`\n📋 Companies (${companies.length})\n`));

    companies.forEach((company: any, index: number) => {
      console.log(chalk.bold(`${index + 1}. ${company.name}`));
      console.log(`   ID: ${company.companyId}`);
      console.log(`   Industry: ${company.industry}`);
      console.log(`   Status: ${company.status || 'active'}`);
      if (company.departments) {
        console.log(`   Departments: ${company.departments.join(', ')}`);
      }
      console.log('');
    });
  } catch (error: any) {
    console.log(chalk.red('\n❌ Failed to list companies'));
    console.log(error.message);
    process.exit(1);
  }
}
