/**
 * Health Command
 */

import chalk from 'chalk';
import axios from 'axios';

const API_BASE = process.env.COMPANY_OS_API || 'http://localhost:4010';

export async function showHealth() {
  try {
    // Check main health
    const healthRes = await axios.get(`${API_BASE}/health`);
    const health = healthRes.data;

    console.log(chalk.blue('\n🏥 CompanyOS Health\n'));
    console.log(chalk.bold('Status:'), health.status || 'healthy');
    console.log(chalk.bold('Version:'), health.version || '1.0.0');
    console.log(chalk.bold('Port:'), health.port);

    // Check fleet health
    try {
      const fleetRes = await axios.get(`${API_BASE}/api/fleet/health`);
      const fleet = fleetRes.data;

      console.log(chalk.bold('\n🤖 Fleet Status:'));
      console.log(`   Total Workers: ${fleet.total}`);
      console.log(`   Healthy: ${chalk.green(fleet.healthy)}`);
      console.log(`   Degraded: ${chalk.yellow(fleet.degraded)}`);
      console.log(`   Unhealthy: ${chalk.red(fleet.unhealthy)}`);
    } catch {
      console.log(chalk.yellow('\n⚠️  Fleet health not available'));
    }

    // Check packs
    try {
      const packsRes = await axios.get(`${API_BASE}/api/packs`);
      console.log(chalk.bold('\n📦 Department Packs:'));
      console.log(`   Available: ${packsRes.data.count || packsRes.data.packs?.length || 0}`);
    } catch {
      // Ignore
    }

    console.log('');

    // Overall status
    if (health.status === 'healthy') {
      console.log(chalk.green('✅ All systems operational\n'));
    } else {
      console.log(chalk.yellow('⚠️  Some systems may be degraded\n'));
    }
  } catch (error: any) {
    console.log(chalk.red('\n❌ CompanyOS is not running'));
    console.log(chalk.yellow(`\nStart it with:`));
    console.log(chalk.cyan('  cd ../control-plane && npm start\n'));
    process.exit(1);
  }
}
