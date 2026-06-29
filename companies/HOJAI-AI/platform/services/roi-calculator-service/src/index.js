/**
 * ROI Calculator Service
 * Calculate ROI for AI workforce
 */

class ROICalculator {
  constructor(config) {
    this.aiEngineUrl = config.aiEngineUrl;
  }

  // Calculate ROI for hiring an AI employee
  async calculate({ employee, tasksPerMonth, avgTaskHours, humanCostPerHour }) {
    const monthlyHours = tasksPerMonth * avgTaskHours;
    const humanMonthlyCost = monthlyHours * humanCostPerHour;

    const aiMonthlyCost = employee.cost; // From registry

    const monthlySavings = humanMonthlyCost - aiMonthlyCost;
    const annualSavings = monthlySavings * 12;
    const roi = ((humanMonthlyCost - aiMonthlyCost) / aiMonthlyCost) * 100;

    return {
      employeeId: employee.id,
      employeeName: employee.name,
      tasksPerMonth,
      avgTaskHours,
      humanCostPerHour,
      humanMonthlyCost,
      aiMonthlyCost,
      monthlySavings,
      annualSavings,
      roiPercent: roi.toFixed(1),
      paybackMonths: aiMonthlyCost > 0 ? (1 / (monthlySavings / aiMonthlyCost)).toFixed(1) : 0,
    };
  }

  // Calculate department ROI
  async calculateDepartment({ department }) {
    const employeeROIs = await Promise.all(
      department.employees.map(emp =>
        this.calculate({
          employee: emp,
          tasksPerMonth: emp.tasksPerMonth,
          avgTaskHours: emp.avgTaskHours,
          humanCostPerHour: emp.humanCostPerHour,
        })
      )
    );

    const totalHumanCost = employeeROIs.reduce((sum, r) => sum + r.humanMonthlyCost, 0);
    const totalAICost = employeeROIs.reduce((sum, r) => sum + r.aiMonthlyCost, 0);
    const totalMonthlySavings = totalHumanCost - totalAICost;
    const totalAnnualSavings = totalMonthlySavings * 12;

    return {
      department: department.name,
      employeeCount: department.employees.length,
      monthlyCosts: {
        human: totalHumanCost,
        ai: totalAICost,
      },
      annualSavings: totalAnnualSavings,
      roiPercent: ((totalHumanCost - totalAICost) / totalAICost * 100).toFixed(1),
      employees: employeeROIs,
    };
  }

  // Compare scenarios
  async compareScenarios({ current, proposed }) {
    const [currentROI, proposedROI] = await Promise.all([
      this.calculateScenario(current),
      this.calculateScenario(proposed),
    ]);

    return {
      current: currentROI,
      proposed: proposedROI,
      improvement: {
        monthlySavings: proposedROI.monthlySavings - currentROI.monthlySavings,
        roiGain: proposedROI.roiPercent - currentROI.roiPercent,
      },
    };
  }

  async calculateScenario(scenario) {
    const totalMonthlyCost = scenario.employees.reduce((sum, e) => sum + e.monthlyCost, 0);
    const totalSavedHours = scenario.savedHours || 0;
    const totalSavedCost = totalSavedHours * (scenario.hourlyRate || 1500);

    return {
      totalMonthlyCost,
      totalSavedCost,
      monthlySavings: totalSavedCost - totalMonthlyCost,
      roiPercent: totalMonthlyCost > 0 ? (((totalSavedCost - totalMonthlyCost) / totalMonthlyCost) * 100).toFixed(1) : 0,
    };
  }
}

module.exports = ROICalculator;
