/**
 * HOJAI Performance Dashboard - Seed Script
 *
 * Seeds demo data for testing the Performance Dashboard API.
 */

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai-performance';

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Import models
    const { EmployeeProfile, KPI, Evaluation } = await import('../models/performanceModel.js');

    // Clear existing demo data
    console.log('Clearing existing demo data...');
    await EmployeeProfile.deleteMany({ tenantId: 'demo' });
    await KPI.deleteMany({ tenantId: 'demo' });
    await Evaluation.deleteMany({ tenantId: 'demo' });

    const departments = ['Engineering', 'Sales', 'Support', 'Marketing', 'Operations'];
    const roles = ['Junior', 'Senior', 'Lead', 'Manager'];
    const firstNames = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn', 'Avery', 'Sage', 'Drew'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];

    console.log('Creating demo employees...');

    const demoEmployees = [];
    const currentPeriod = new Date().toISOString().slice(0, 7);

    for (let i = 1; i <= 25; i++) {
      const employeeId = `emp_${String(i).padStart(3, '0')}`;
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const department = departments[Math.floor(Math.random() * departments.length)];
      const role = roles[Math.floor(Math.random() * roles.length)];
      const level = Math.floor(Math.random() * 5) + 1;
      const baseSalary = 50000 + (level * 10000) + (Math.random() * 20000);

      const employee = new EmployeeProfile({
        employeeId,
        tenantId: 'demo',
        name: `${firstName} ${lastName}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@demo.hojai.ai`,
        role: `${role} ${department}`,
        department,
        level,
        baseSalary: Math.round(baseSalary),
        hourlyRate: Math.round(baseSalary / (22 * 8)),
        hireDate: new Date(Date.now() - Math.random() * 730 * 24 * 60 * 60 * 1000), // Up to 2 years ago
        status: 'active',
      });

      await employee.save();
      demoEmployees.push(employee);

      // Generate KPIs for last 6 months
      for (let m = 0; m < 6; m++) {
        const periodDate = new Date();
        periodDate.setMonth(periodDate.getMonth() - m);
        const period = periodDate.toISOString().slice(0, 7);

        const tasksCompleted = Math.floor(Math.random() * 150) + 50;
        const tasksFailed = Math.floor(Math.random() * tasksCompleted * 0.1);
        const totalTasksAttempted = tasksCompleted + tasksFailed;
        const qualityScore = Math.floor(Math.random() * 35) + 60;
        const customerSatisfaction = Math.floor(Math.random() * 30) + 65;
        const revenueGenerated = Math.floor(Math.random() * 30000) + 5000;
        const errorRate = tasksFailed / totalTasksAttempted;
        const escalationRate = Math.random() * 0.15;

        const kpi = new KPI({
          kpiId: `kpi_${employeeId}_${period}`,
          employeeId,
          tenantId: 'demo',
          period,
          tasksCompleted,
          tasksFailed,
          tasksInProgress: Math.floor(Math.random() * 5),
          tasksCancelled: Math.floor(Math.random() * 3),
          totalTasksAttempted,
          avgResponseTime: Math.floor(Math.random() * 3000) + 500,
          minResponseTime: Math.floor(Math.random() * 500) + 100,
          maxResponseTime: Math.floor(Math.random() * 5000) + 3000,
          p95ResponseTime: Math.floor(Math.random() * 4000) + 1000,
          customerSatisfaction,
          qualityScore,
          revenueGenerated,
          revenuePerTask: revenueGenerated / tasksCompleted,
          conversionRate: Math.random() * 0.3 + 0.7,
          errorRate,
          escalationRate,
          escalationCount: Math.floor(escalationRate * tasksCompleted),
          utilizationRate: Math.random() * 0.3 + 0.7,
          avgResolutionTime: Math.floor(Math.random() * 2000) + 500,
          throughputPerHour: Math.random() * 3 + 2,
          peerRating: Math.floor(Math.random() * 25) + 70,
          teamContributionScore: Math.floor(Math.random() * 30) + 65,
        });

        await kpi.save();

        // Create evaluation for current period
        if (m === 0) {
          const overallScore = Math.floor(
            qualityScore * 0.3 +
            (tasksCompleted / 200) * 100 * 0.25 +
            (1 - errorRate) * 100 * 0.2 +
            Math.random() * 30 * 0.15 +
            Math.random() * 40 * 0.1
          );

          const evaluation = new Evaluation({
            evaluationId: `eval_${employeeId}_${period}`,
            employeeId,
            tenantId: 'demo',
            evaluatorId: 'system',
            period,
            periodType: 'monthly',
            qualityScore: Math.floor(qualityScore + Math.random() * 5),
            productivityScore: Math.floor((tasksCompleted / 200) * 100 + Math.random() * 10),
            reliabilityScore: Math.floor((1 - errorRate) * 100),
            collaborationScore: Math.floor(Math.random() * 25 + 65),
            growthScore: Math.floor(Math.random() * 40 + 50),
            overallScore: Math.min(100, Math.max(0, overallScore)),
            percentileRank: Math.random(),
            tenantPercentileRank: Math.random(),
            status: 'completed',
            completedAt: new Date(),
          });

          await evaluation.save();
        }
      }

      process.stdout.write(`\rCreated ${i}/25 employees with KPIs...`);
    }

    console.log('\n');
    console.log('='.repeat(60));
    console.log('Demo data seeded successfully!');
    console.log('='.repeat(60));
    console.log(`Total Employees: ${demoEmployees.length}`);
    console.log(`Departments: ${departments.join(', ')}`);
    console.log(`Period: ${currentPeriod}`);
    console.log('='.repeat(60));

    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

seed();
