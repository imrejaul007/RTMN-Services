/**
 * Operations OS - Demand Forecasting & Scenario Planning Module
 * ML-based forecasting and what-if scenario analysis
 */

const { db } = require('../db/database');

class DemandForecast {
  constructor() {
    this.db = db;
  }

  /**
   * Create a forecast model
   */
  createForecast(data) {
    const id = this.db.generateId('FORECAST');

    const forecast = {
      id,
      name: data.name,
      type: data.type || 'demand', // demand, revenue, capacity, inventory
      entity: data.entity, // product, service, region, etc.
      entityId: data.entityId,
      granularity: data.granularity || 'daily', // hourly, daily, weekly, monthly
      horizon: data.horizon || 30, // days to forecast
      model: data.model || 'moving_average', // moving_average, linear, exponential, ml
      parameters: data.parameters || this.getDefaultParameters(data.model),
      data: data.data || [],
      forecasts: [],
      confidence: data.confidence || 0.95,
      status: 'ready', // draft, training, ready, failed
      lastTrained: null,
      accuracy: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: data.userId,
    };

    this.db.set('forecasts', id, forecast);
    return forecast;
  }

  /**
   * Get default parameters for model
   */
  getDefaultParameters(model) {
    const defaults = {
      moving_average: { window: 7 },
      linear: { window: 30 },
      exponential: { alpha: 0.3 },
      ml: { features: ['historical', 'seasonality', 'trend'] },
    };
    return defaults[model] || {};
  }

  /**
   * Add historical data point
   */
  addDataPoint(forecastId, dataPoint) {
    const forecast = this.db.get('forecasts', forecastId);
    if (!forecast) return null;

    const point = {
      id: this.db.generateId('DP'),
      forecastId,
      date: dataPoint.date,
      value: dataPoint.value,
      metadata: dataPoint.metadata || {},
      addedAt: new Date().toISOString(),
    };

    forecast.data.push(point);
    forecast.data.sort((a, b) => new Date(a.date) - new Date(b.date));
    this.db.set('forecasts', forecastId, forecast);

    return point;
  }

  /**
   * Train forecast model
   */
  train(forecastId) {
    const forecast = this.db.get('forecasts', forecastId);
    if (!forecast) return null;

    forecast.status = 'training';
    this.db.set('forecasts', forecastId, forecast);

    // Simple moving average for now (ML integration would go here)
    const values = forecast.data.map(d => d.value);
    if (values.length < 7) {
      forecast.status = 'failed';
      forecast.error = 'Insufficient data';
      this.db.set('forecasts', forecastId, forecast);
      return forecast;
    }

    // Calculate forecast
    const forecastValues = this.generateForecast(values, forecast);

    forecast.forecasts = forecastValues;
    forecast.status = 'ready';
    forecast.lastTrained = new Date().toISOString();
    forecast.accuracy = this.calculateAccuracy(forecast);
    this.db.set('forecasts', forecastId, forecast);

    return forecast;
  }

  /**
   * Generate forecast values
   */
  generateForecast(values, forecast) {
    const results = [];
    const horizon = forecast.horizon;
    const model = forecast.model;

    let baseValue;
    let trend = 0;

    // Calculate base value and trend
    if (values.length >= 7) {
      const recent = values.slice(-7);
      baseValue = recent.reduce((a, b) => a + b, 0) / recent.length;

      if (values.length >= 14) {
        const older = values.slice(-14, -7);
        trend = (recent.reduce((a, b) => a + b, 0) / 7) - (older.reduce((a, b) => a + b, 0) / 7);
      }
    } else {
      baseValue = values.reduce((a, b) => a + b, 0) / values.length;
    }

    // Detect seasonality
    const seasonality = this.detectSeasonality(values);

    // Generate forecast
    const lastDate = new Date(forecast.data[forecast.data.length - 1]?.date || Date.now());

    for (let i = 1; i <= horizon; i++) {
      const date = new Date(lastDate);
      date.setDate(date.getDate() + i);

      let value;
      const seasonalFactor = seasonality?.factor || 1;

      switch (model) {
        case 'moving_average':
          value = baseValue;
          break;
        case 'linear':
          value = baseValue + (trend * i);
          break;
        case 'exponential':
          value = baseValue * Math.pow(1 + forecast.parameters.alpha, i);
          break;
        default:
          value = baseValue + (trend * i);
      }

      // Apply seasonality
      value = value * seasonalFactor;

      // Calculate confidence interval
      const confidenceFactor = 1.96 * (baseValue * 0.1 * Math.sqrt(i / 7));

      results.push({
        date: date.toISOString().split('T')[0],
        value: Math.round(value * 100) / 100,
        lower: Math.round((value - confidenceFactor) * 100) / 100,
        upper: Math.round((value + confidenceFactor) * 100) / 100,
        confidence: forecast.confidence,
      });
    }

    return results;
  }

  /**
   * Detect seasonality in data
   */
  detectSeasonality(values) {
    if (values.length < 30) return null;

    // Simple weekly seasonality detection
    const weeklyPattern = [0, 0, 0, 0, 0, 0, 0];
    const weeklyCount = [0, 0, 0, 0, 0, 0, 0];

    for (let i = 0; i < values.length; i++) {
      const dayOfWeek = new Date(values[i].date || Date.now()).getDay();
      weeklyPattern[dayOfWeek] += values[i].value;
      weeklyCount[dayOfWeek]++;
    }

    const avg = values.reduce((a, b) => a + b.value || a + b, 0) / values.length;
    const factors = weeklyPattern.map((sum, i) =>
      weeklyCount[i] > 0 ? (sum / weeklyCount[i]) / avg : 1
    );

    return {
      pattern: 'weekly',
      factors,
      avg,
    };
  }

  /**
   * Calculate accuracy metrics
   */
  calculateAccuracy(forecast) {
    if (forecast.data.length < 14) return null;

    // Use last 20% for validation
    const validationSize = Math.floor(forecast.data.length * 0.2);
    const trainData = forecast.data.slice(0, -validationSize);
    const testData = forecast.data.slice(-validationSize);

    const trainAvg = trainData.reduce((a, b) => a + b.value, 0) / trainData.length;
    const predictions = testData.map(() => trainAvg);

    let mape = 0;
    testData.forEach((actual, i) => {
      mape += Math.abs((actual.value - predictions[i]) / actual.value);
    });
    mape = (mape / testData.length) * 100;

    return {
      mape: Math.round((100 - mape) * 100) / 100, // Accuracy %
      testSize: validationSize,
    };
  }

  /**
   * Get forecast with predictions
   */
  getForecast(forecastId) {
    const forecast = this.db.get('forecasts', forecastId);
    if (!forecast) return null;

    return {
      ...forecast,
      historical: forecast.data,
      predictions: forecast.forecasts,
      summary: this.getForecastSummary(forecast),
    };
  }

  /**
   * Get forecast summary
   */
  getForecastSummary(forecast) {
    if (!forecast.forecasts || forecast.forecasts.length === 0) {
      return { error: 'No forecast generated' };
    }

    const values = forecast.forecasts.map(f => f.value);

    return {
      avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
      min: Math.round(Math.min(...values)),
      max: Math.round(Math.max(...values)),
      total: Math.round(values.reduce((a, b) => a + b, 0)),
      period: {
        start: forecast.forecasts[0]?.date,
        end: forecast.forecasts[forecast.forecasts.length - 1]?.date,
      },
    };
  }

  /**
   * Compare multiple forecasts
   */
  compareForecasts(forecastIds) {
    const forecasts = forecastIds
      .map(id => this.db.get('forecasts', id))
      .filter(Boolean);

    if (forecasts.length === 0) {
      return { error: 'No forecasts found' };
    }

    return {
      forecasts: forecasts.map(f => ({
        id: f.id,
        name: f.name,
        type: f.type,
        accuracy: f.accuracy,
        summary: this.getForecastSummary(f),
      })),
      comparison: this.generateComparison(forecasts),
    };
  }

  /**
   * Generate comparison summary
   */
  generateComparison(forecasts) {
    const summaries = forecasts.map(f => ({
      id: f.id,
      avg: f.forecasts?.reduce((a, b) => a + b.value, 0) / (f.forecasts?.length || 1) || 0,
      total: f.forecasts?.reduce((a, b) => a + b.value, 0) || 0,
    }));

    const maxAvg = Math.max(...summaries.map(s => s.avg));

    return summaries.map(s => ({
      ...s,
      vsMax: maxAvg > 0 ? Math.round((s.avg / maxAvg) * 100) : 0,
    }));
  }
}

// Scenario Planning
class ScenarioPlanning {
  constructor() {
    this.db = db;
  }

  /**
   * Create a scenario
   */
  createScenario(data) {
    const id = this.db.generateId('SCEN');

    const scenario = {
      id,
      name: data.name,
      description: data.description || '',
      type: data.type || 'what_if', // what_if, risk, opportunity, strategic
      category: data.category || 'general',
      baseScenarioId: data.baseScenarioId || null,
      status: 'draft', // draft, active, completed
      assumptions: data.assumptions || [],
      variables: data.variables || [],
      outcomes: {},
      probability: data.probability || 0.5,
      impact: data.impact || 'medium',
      owner: data.owner || data.userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.db.set('scenarios', id, scenario);
    return scenario;
  }

  /**
   * Add variable to scenario
   */
  addVariable(scenarioId, variableData) {
    const scenario = this.db.get('scenarios', scenarioId);
    if (!scenario) return null;

    const variable = {
      id: this.db.generateId('VAR'),
      scenarioId,
      name: variableData.name,
      type: variableData.type || 'number', // number, percentage, boolean
      currentValue: variableData.currentValue,
      scenarioValue: variableData.scenarioValue,
      min: variableData.min,
      max: variableData.max,
      step: variableData.step || 1,
      unit: variableData.unit || '',
    };

    scenario.variables.push(variable);
    this.db.set('scenarios', scenarioId, scenario);
    return variable;
  }

  /**
   * Run what-if analysis
   */
  runWhatIf(scenarioId, model) {
    const scenario = this.db.get('scenarios', scenarioId);
    if (!scenario) return null;

    // Calculate impact based on variables
    const impact = this.calculateImpact(scenario, model);

    scenario.outcomes = impact;
    scenario.status = 'completed';
    scenario.runAt = new Date().toISOString();
    this.db.set('scenarios', scenarioId, scenario);

    return {
      scenario: {
        id: scenario.id,
        name: scenario.name,
      },
      outcomes: impact,
      recommendations: this.generateRecommendations(impact),
    };
  }

  /**
   * Calculate impact
   */
  calculateImpact(scenario, model) {
    const outcomes = {};

    // Calculate change for each variable
    scenario.variables.forEach(variable => {
      const current = variable.currentValue || 0;
      const scenarioVal = variable.scenarioValue || current;
      const change = scenarioVal - current;
      const changePercent = current !== 0 ? (change / current) * 100 : 0;

      outcomes[variable.name] = {
        current: current,
        scenario: scenarioVal,
        change,
        changePercent: Math.round(changePercent * 10) / 10,
      };
    });

    // Calculate compound impact
    const compoundChange = scenario.variables.reduce((acc, variable) => {
      const change = (variable.scenarioValue || variable.currentValue || 0) -
                    (variable.currentValue || 0);
      return acc * (1 + change / (variable.currentValue || 1));
    }, 1);

    outcomes.total = {
      change: Math.round((compoundChange - 1) * 10000) / 100,
      confidence: scenario.probability,
    };

    return outcomes;
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(outcomes) {
    const recommendations = [];

    Object.entries(outcomes).forEach(([key, data]) => {
      if (key === 'total') return;

      if (data.changePercent > 20) {
        recommendations.push({
          variable: key,
          type: 'warning',
          message: `${key} changes by ${data.changePercent}%`,
          action: 'Review and validate assumptions',
        });
      } else if (data.changePercent > 10) {
        recommendations.push({
          variable: key,
          type: 'info',
          message: `${key} changes by ${data.changePercent}%`,
          action: 'Monitor closely',
        });
      }
    });

    return recommendations;
  }

  /**
   * Compare scenarios
   */
  compareScenarios(scenarioIds) {
    const scenarios = scenarioIds
      .map(id => this.db.get('scenarios', id))
      .filter(Boolean);

    if (scenarios.length === 0) {
      return { error: 'No scenarios found' };
    }

    return {
      scenarios: scenarios.map(s => ({
        id: s.id,
        name: s.name,
        type: s.type,
        outcomes: s.outcomes,
        probability: s.probability,
      })),
      comparison: this.generateComparison(scenarios),
    };
  }

  /**
   * Generate comparison
   */
  generateComparison(scenarios) {
    const variables = new Set();
    scenarios.forEach(s => {
      s.variables.forEach(v => variables.add(v.name));
    });

    const comparison = {};

    variables.forEach(varName => {
      comparison[varName] = scenarios.map(s => {
        const variable = s.variables.find(v => v.name === varName);
        return {
          scenarioId: s.id,
          current: variable?.currentValue,
          scenario: variable?.scenarioValue,
        };
      });
    });

    return comparison;
  }
}

// Express routes
function registerDemandForecastRoutes(app) {
  const forecast = new DemandForecast();
  const scenarios = new ScenarioPlanning();

  // ============ FORECAST ============

  // Create forecast
  app.post('/api/forecasting/forecasts', (req, res) => {
    const f = forecast.createForecast({
      ...req.body,
      userId: req.user?.userId,
    });
    res.status(201).json(f);
  });

  // Get all forecasts
  app.get('/api/forecasting/forecasts', (req, res) => {
    const { type, status } = req.query;
    let forecasts = db.getAll('forecasts');

    if (type) forecasts = forecasts.filter(f => f.type === type);
    if (status) forecasts = forecasts.filter(f => f.status === status);

    res.json({ forecasts, total: forecasts.length });
  });

  // Get forecast
  app.get('/api/forecasting/forecasts/:id', (req, res) => {
    const f = forecast.getForecast(req.params.id);
    if (!f) return res.status(404).json({ error: 'Forecast not found' });
    res.json(f);
  });

  // Add data point
  app.post('/api/forecasting/forecasts/:id/data', (req, res) => {
    const point = forecast.addDataPoint(req.params.id, req.body);
    if (!point) return res.status(404).json({ error: 'Forecast not found' });
    res.status(201).json(point);
  });

  // Train model
  app.post('/api/forecasting/forecasts/:id/train', (req, res) => {
    const f = forecast.train(req.params.id);
    if (!f) return res.status(404).json({ error: 'Forecast not found' });
    res.json(f);
  });

  // Compare forecasts
  app.post('/api/forecasting/compare', (req, res) => {
    const { forecastIds } = req.body;
    if (!forecastIds || forecastIds.length < 2) {
      return res.status(400).json({ error: 'At least 2 forecast IDs required' });
    }
    const result = forecast.compareForecasts(forecastIds);
    res.json(result);
  });

  // ============ SCENARIOS ============

  // Create scenario
  app.post('/api/scenarios', (req, res) => {
    const s = scenarios.createScenario({
      ...req.body,
      userId: req.user?.userId,
    });
    res.status(201).json(s);
  });

  // Get all scenarios
  app.get('/api/scenarios', (req, res) => {
    const { type, status } = req.query;
    let all = db.getAll('scenarios');

    if (type) all = all.filter(s => s.type === type);
    if (status) all = all.filter(s => s.status === status);

    res.json({ scenarios: all, total: all.length });
  });

  // Get scenario
  app.get('/api/scenarios/:id', (req, res) => {
    const s = db.get('scenarios', req.params.id);
    if (!s) return res.status(404).json({ error: 'Scenario not found' });
    res.json(s);
  });

  // Add variable
  app.post('/api/scenarios/:id/variables', (req, res) => {
    const variable = scenarios.addVariable(req.params.id, req.body);
    if (!variable) return res.status(404).json({ error: 'Scenario not found' });
    res.status(201).json(variable);
  });

  // Run what-if
  app.post('/api/scenarios/:id/run', (req, res) => {
    const result = scenarios.runWhatIf(req.params.id, req.body.model);
    if (!result) return res.status(404).json({ error: 'Scenario not found' });
    res.json(result);
  });

  // Compare scenarios
  app.post('/api/scenarios/compare', (req, res) => {
    const { scenarioIds } = req.body;
    if (!scenarioIds || scenarioIds.length < 2) {
      return res.status(400).json({ error: 'At least 2 scenario IDs required' });
    }
    const result = scenarios.compareScenarios(scenarioIds);
    res.json(result);
  });
}

module.exports = { DemandForecast, ScenarioPlanning, registerDemandForecastRoutes };
