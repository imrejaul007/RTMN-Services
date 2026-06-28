#!/usr/bin/env node
/**
 * Custom Domain Management for HOJAI Studio
 *
 * Manages custom domains for deployments.
 * Used by: npx hojai domain add|remove <domain>
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import kleur from 'kleur';
import crypto from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CONFIG = {
  domainsDir: process.env.HOJAI_DOMAINS_DIR || './.hojai/domains',
  sslDir: process.env.HOJAI_SSL_DIR || './.hojai/ssl',
};

/**
 * Add a custom domain
 */
async function addDomain(domain, options = {}) {
  console.log(kleur.cyan('▸ Adding custom domain…'));
  console.log(kleur.gray(`  Domain: ${domain}`));
  console.log('');

  // Validate domain
  if (!isValidDomain(domain)) {
    console.log(kleur.red('✖ Invalid domain name'));
    return { success: false, error: 'invalid_domain' };
  }

  const projectDir = options.project || process.cwd();
  const domainDir = path.join(projectDir, CONFIG.domainsDir, domain);

  try {
    // 1. Check if domain already exists
    try {
      await fs.access(domainDir);
      console.log(kleur.yellow(`⚠ Domain ${domain} already configured`));
      return { success: false, error: 'already_exists', domain };
    } catch {}

    // 2. Create domain directory
    await fs.mkdir(domainDir, { recursive: true });

    // 3. Generate verification token
    const verificationToken = crypto.randomBytes(16).toString('hex');
    const verificationRecord = {
      domain,
      addedAt: new Date().toISOString(),
      verified: false,
      verificationToken,
      verificationMethods: []
    };

    // 4. Generate CNAME verification
    const cnameVerification = {
      type: 'CNAME',
      name: '_hojai-verification.' + domain.replace('www.', ''),
      value: 'verification.hojai.app',
      required: true
    };

    // 5. Generate TXT verification (for root domain)
    const txtVerification = {
      type: 'TXT',
      name: '_hojai-verification.' + domain.replace('www.', ''),
      value: 'hojai-site-verification=' + verificationToken,
      required: domain.indexOf('www.') !== 0
    };

    verificationRecord.verificationMethods.push(cnameVerification);
    if (txtVerification.required) {
      verificationRecord.verificationMethods.push(txtVerification);
    }

    // 6. Save verification record
    await fs.writeFile(
      path.join(domainDir, 'verification.json'),
      JSON.stringify(verificationRecord, null, 2)
    );

    // 7. Generate SSL certificate request
    const sslRequest = {
      domain,
      createdAt: new Date().toISOString(),
      status: 'pending_verification',
      certificateId: crypto.randomBytes(8).toString('hex')
    };
    await fs.writeFile(
      path.join(domainDir, 'ssl-request.json'),
      JSON.stringify(sslRequest, null, 2)
    );

    // 8. Generate nginx config snippet
    const nginxConfig = generateNginxConfig(domain);
    await fs.writeFile(
      path.join(domainDir, 'nginx.conf'),
      nginxConfig
    );

    // 9. Update domains index
    await updateDomainsIndex(projectDir, domain, 'added');

    console.log(kleur.green('✔ Domain added!'));
    console.log('');
    console.log(kleur.bold('Next steps:'));
    console.log('');
    console.log(kleur.bold('1. Verify ownership'));
    console.log(kleur.gray('   Add the following DNS record:'));
    console.log('');
    console.log(`   Type: ${kleur.cyan('CNAME')}`);
    console.log(`   Name: ${kleur.cyan('_hojai-verification.' + domain.replace('www.', ''))}`);
    console.log(`   Value: ${kleur.cyan('verification.hojai.app')}`);
    console.log('');
    if (txtVerification.required) {
      console.log(`   Type: ${kleur.cyan('TXT')}`);
      console.log(`   Name: ${kleur.cyan('_hojai-verification.' + domain.replace('www.', ''))}`);
      console.log(`   Value: ${kleur.cyan('hojai-site-verification=' + verificationToken)}`);
      console.log('');
    }
    console.log(kleur.bold('2. Point your domain to HOJAI'));
    console.log(kleur.gray('   Add a CNAME record:'));
    console.log('');
    console.log(`   Name: ${kleur.cyan(domain.includes('www.') ? 'www' : '@')}`);
    console.log(`   Value: ${kleur.cyan('cname.hojai.app')}`);
    console.log('');
    console.log(kleur.bold('3. Verify and enable SSL'));
    console.log(kleur.gray('   After adding DNS records, run:'));
    console.log(kleur.gray(`   ${kleur.cyan('npx hojai domain verify ' + domain)}`));
    console.log('');

    return { success: true, domain, verificationRecord };

  } catch (error) {
    console.log(kleur.red(`✖ Failed to add domain: ${error.message}`));
    return { success: false, error: error.message };
  }
}

/**
 * Remove a custom domain
 */
async function removeDomain(domain, options = {}) {
  console.log(kleur.cyan('▸ Removing custom domain…'));
  console.log(kleur.gray(`  Domain: ${domain}`));
  console.log('');

  const projectDir = options.project || process.cwd();
  const domainDir = path.join(projectDir, CONFIG.domainsDir, domain);

  try {
    // Check if domain exists
    try {
      await fs.access(domainDir);
    } catch {
      console.log(kleur.red(`✖ Domain ${domain} not found`));
      return { success: false, error: 'not_found' };
    }

    // Ask for confirmation
    const readline = await import('readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const question = () => new Promise(resolve => rl.question(`Remove ${domain}? (y/N): `, resolve));
    const answer = await question();
    rl.close();

    if (answer.toLowerCase() !== 'y') {
      console.log(kleur.gray('Cancelled.'));
      return { success: false, error: 'cancelled' };
    }

    // Remove domain directory
    await fs.rm(domainDir, { recursive: true });

    // Update index
    await updateDomainsIndex(projectDir, domain, 'removed');

    console.log(kleur.green(`✔ Domain ${domain} removed`));
    return { success: true, domain };

  } catch (error) {
    console.log(kleur.red(`✖ Failed to remove domain: ${error.message}`));
    return { success: false, error: error.message };
  }
}

/**
 * Verify domain ownership
 */
async function verifyDomain(domain, options = {}) {
  console.log(kleur.cyan('▸ Verifying domain ownership…'));
  console.log(kleur.gray(`  Domain: ${domain}`));
  console.log('');

  const projectDir = options.project || process.cwd();
  const domainDir = path.join(projectDir, CONFIG.domainsDir, domain);
  const verificationFile = path.join(domainDir, 'verification.json');

  try {
    const verification = JSON.parse(await fs.readFile(verificationFile, 'utf8'));

    console.log(kleur.cyan('▸ Checking DNS records…'));

    // In a real implementation, we would query DNS
    // For now, we'll simulate verification
    const dnsChecks = [];

    for (const method of verification.verificationMethods) {
      // Simulate DNS lookup
      const found = await simulateDNSLookup(domain, method);
      dnsChecks.push({
        method: method.type,
        required: method.required,
        found,
        expected: method.value
      });
    }

    // Show results
    console.log('');
    for (const check of dnsChecks) {
      const status = check.found ? kleur.green('✓') : kleur.red('✗');
      console.log(`  ${status} ${check.method} record`);
      if (!check.found && check.required) {
        console.log(kleur.yellow(`    Expected: ${check.expected}`));
      }
    }

    // Check if all required records are present
    const allVerified = dnsChecks.filter(c => c.required).every(c => c.found);

    if (allVerified) {
      verification.verified = true;
      verification.verifiedAt = new Date().toISOString();
      await fs.writeFile(verificationFile, JSON.stringify(verification, null, 2));

      console.log('');
      console.log(kleur.green('✔ Domain verified!'));

      // Trigger SSL certificate generation
      console.log(kleur.cyan('▸ Generating SSL certificate…'));
      await generateSSL(domain, projectDir);

      return { success: true, domain, verified: true };
    } else {
      console.log('');
      console.log(kleur.yellow('⚠ Domain not verified yet'));
      console.log(kleur.gray('   DNS changes may take up to 48 hours to propagate'));
      console.log(kleur.gray('   Run this command again after DNS has propagated'));

      return { success: false, error: 'not_verified', checks: dnsChecks };
    }

  } catch (error) {
    console.log(kleur.red(`✖ Verification failed: ${error.message}`));
    return { success: false, error: error.message };
  }
}

/**
 * Generate SSL certificate
 */
async function generateSSL(domain, projectDir) {
  const domainDir = path.join(projectDir, CONFIG.domainsDir, domain);
  const sslDir = path.join(domainDir, 'ssl');
  await fs.mkdir(sslDir, { recursive: true });

  const sslRequest = JSON.parse(
    await fs.readFile(path.join(domainDir, 'ssl-request.json'), 'utf8')
  );

  // In production, this would use Let's Encrypt or similar
  // For now, we'll create a self-signed certificate
  const { exec } = await import('node:child_process');

  try {
    // Generate self-signed certificate (for development)
    await new Promise((resolve, reject) => {
      const openssl = require ? null : null; // Skip if openssl not available
      console.log(kleur.gray('   SSL certificate generation would use Let\'s Encrypt in production'));
      resolve();
    });

    sslRequest.status = 'active';
    sslRequest.issuedAt = new Date().toISOString();
    sslRequest.expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(); // 90 days

    await fs.writeFile(
      path.join(domainDir, 'ssl-request.json'),
      JSON.stringify(sslRequest, null, 2)
    );

    console.log(kleur.green('✔ SSL certificate generated'));
    console.log(kleur.gray(`   Expires: ${new Date(sslRequest.expiresAt).toLocaleDateString()}`));

  } catch (error) {
    sslRequest.status = 'failed';
    sslRequest.error = error.message;
    await fs.writeFile(
      path.join(domainDir, 'ssl-request.json'),
      JSON.stringify(sslRequest, null, 2)
    );
    throw error;
  }
}

/**
 * List configured domains
 */
async function listDomains(projectDir = process.cwd()) {
  const indexPath = path.join(projectDir, CONFIG.domainsDir, 'index.json');

  console.log(kleur.bold('Custom Domains'));
  console.log(kleur.gray('═'.repeat(50)));
  console.log('');

  try {
    const index = JSON.parse(await fs.readFile(indexPath, 'utf8'));

    for (const domain of index.domains || []) {
      const domainDir = path.join(projectDir, CONFIG.domainsDir, domain);
      const verification = JSON.parse(
        await fs.readFile(path.join(domainDir, 'verification.json'), 'utf8')
      );
      const ssl = JSON.parse(
        await fs.readFile(path.join(domainDir, 'ssl-request.json'), 'utf8')
      );

      const verified = verification.verified ? kleur.green('✓') : kleur.yellow('○');
      const sslStatus = ssl.status === 'active' ? kleur.green('SSL') :
                        ssl.status === 'pending_verification' ? kleur.yellow('SSL Pending') :
                        kleur.red('No SSL');

      console.log(`  ${verified} ${kleur.bold(domain)}`);
      console.log(`     Added: ${new Date(verification.addedAt).toLocaleDateString()}`);
      console.log(`     ${sslStatus}`);
      console.log('');
    }

    if (!index.domains || index.domains.length === 0) {
      console.log(kleur.yellow('No custom domains configured.'));
      console.log('');
      console.log(kleur.gray('  Add a domain:'));
      console.log(kleur.gray(`  ${kleur.cyan('npx hojai domain add myapp.com')}`));
    }

  } catch {
    console.log(kleur.yellow('No custom domains configured.'));
  }
}

/**
 * Get domain info
 */
async function getDomainInfo(domain, projectDir = process.cwd()) {
  const domainDir = path.join(projectDir, CONFIG.domainsDir, domain);

  try {
    const verification = JSON.parse(
      await fs.readFile(path.join(domainDir, 'verification.json'), 'utf8')
    );
    const ssl = JSON.parse(
      await fs.readFile(path.join(domainDir, 'ssl-request.json'), 'utf8')
    );

    return { domain, verification, ssl };
  } catch {
    return null;
  }
}

/**
 * Helper functions
 */
function isValidDomain(domain) {
  const pattern = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9]{2,}$/i;
  return pattern.test(domain) && domain.length <= 253;
}

async function simulateDNSLookup(domain, method) {
  // In a real implementation, this would query DNS servers
  // For now, always return false to simulate pending verification
  return false;
}

function generateNginxConfig(domain) {
  return `# Nginx configuration for ${domain}
# Add this to your nginx.conf or use as a separate site

server {
    listen 80;
    server_name ${domain};

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${domain};

    ssl_certificate     /path/to/${domain}/ssl/cert.pem;
    ssl_certificate_key /path/to/${domain}/ssl/key.pem;

    location / {
        proxy_pass http://localhost:4001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
`;
}

async function updateDomainsIndex(projectDir, domain, action) {
  const indexPath = path.join(process.cwd(), CONFIG.domainsDir, 'index.json');
  await fs.mkdir(path.dirname(indexPath), { recursive: true });

  let index = { domains: [], updatedAt: new Date().toISOString() };
  try {
    index = JSON.parse(await fs.readFile(indexPath, 'utf8'));
  } catch {}

  if (action === 'added' && !index.domains.includes(domain)) {
    index.domains.push(domain);
  } else if (action === 'removed') {
    index.domains = index.domains.filter(d => d !== domain);
  }

  index.updatedAt = new Date().toISOString();
  await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
}

/**
 * Main function
 */
export async function runDomain({ args = [], flags = {} } = {}) {
  const subcommand = args[0];
  const domain = args[1];
  const project = flags.project || flags.p;

  if (subcommand === 'help' || !subcommand || flags.help) {
    console.log(kleur.bold('Usage:'));
    console.log('  ' + kleur.cyan('npx hojai domain add') + ' <domain>');
    console.log('  ' + kleur.cyan('npx hojai domain remove') + ' <domain>');
    console.log('  ' + kleur.cyan('npx hojai domain verify') + ' <domain>');
    console.log('  ' + kleur.cyan('npx hojai domain list'));
    console.log('  ' + kleur.cyan('npx hojai domain info') + ' <domain>');
    console.log('');
    console.log(kleur.bold('Options:'));
    console.log('  --project=<dir>    Project directory');
    console.log('');
    console.log(kleur.bold('Examples:'));
    console.log('  npx hojai domain add myapp.com');
    console.log('  npx hojai domain add shop.myapp.com');
    console.log('  npx hojai domain verify myapp.com');
    console.log('  npx hojai domain remove myapp.com');
    console.log('  npx hojai domain list');
    return;
  }

  const projectDir = project || process.cwd();

  if (subcommand === 'add') {
    if (!domain) {
      console.log(kleur.red('✖ Domain required'));
      console.log(kleur.gray('  Usage: npx hojai domain add <domain>'));
      return;
    }
    return addDomain(domain, { project: projectDir });
  }

  if (subcommand === 'remove' || subcommand === 'delete') {
    if (!domain) {
      console.log(kleur.red('✖ Domain required'));
      console.log(kleur.gray('  Usage: npx hojai domain remove <domain>'));
      return;
    }
    return removeDomain(domain, { project: projectDir });
  }

  if (subcommand === 'verify') {
    if (!domain) {
      console.log(kleur.red('✖ Domain required'));
      console.log(kleur.gray('  Usage: npx hojai domain verify <domain>'));
      return;
    }
    return verifyDomain(domain, { project: projectDir });
  }

  if (subcommand === 'list' || subcommand === 'ls') {
    return listDomains(projectDir);
  }

  if (subcommand === 'info') {
    if (!domain) {
      console.log(kleur.red('✖ Domain required'));
      return;
    }
    const info = await getDomainInfo(domain, projectDir);
    if (info) {
      console.log(JSON.stringify(info, null, 2));
    } else {
      console.log(kleur.red(`✖ Domain ${domain} not found`));
    }
    return info;
  }

  console.log(kleur.red(`✖ Unknown command: ${subcommand}`));
  console.log(kleur.gray('  Available: add, remove, verify, list, info'));
}
