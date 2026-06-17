type ChartType =
  | 'line'
  | 'bar'
  | 'pie'
  | 'doughnut'
  | 'radar'
  | 'polarArea'
  | 'bubble'
  | 'scatter';

interface ChartData {
  labels?: string[];
  datasets: ChartDataset[];
}

interface ChartDataset {
  label?: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  fill?: boolean;
  tension?: number;
}

interface ChartOptions {
  responsive?: boolean;
  maintainAspectRatio?: boolean;
  plugins?: {
    legend?: {
      display?: boolean;
      position?: 'top' | 'bottom' | 'left' | 'right';
    };
    tooltip?: {
      enabled?: boolean;
    };
    title?: {
      display?: boolean;
      text?: string;
    };
  };
  scales?: {
    x?: {
      display?: boolean;
      title?: { display?: boolean; text?: string };
    };
    y?: {
      display?: boolean;
      title?: { display?: boolean; text?: string };
      beginAtZero?: boolean;
    };
  };
}

interface GeneratedChart {
  type: ChartType;
  data: ChartData;
  options: ChartOptions;
}

// Color palettes
const colorPalettes = {
  default: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'],
  gradient: ['#667eea', '#764ba2'],
  warm: ['#f093fb', '#f5576c'],
  cool: ['#4facfe', '#00f2fe'],
  earth: ['#d29922', '#e2e8f0']
};

export class ChartService {
  // Generate chart data for different types
  static generateChart(type: string, data: any, options?: any): GeneratedChart {
    const chartType = this.mapWidgetTypeToChart(type);
    const chartData = this.processData(type, data);
    const chartOptions = this.getDefaultOptions(type, options);

    return {
      type: chartType,
      data: chartData,
      options: chartOptions
    };
  }

  // Map widget types to chart.js types
  private static mapWidgetTypeToChart(widgetType: string): ChartType {
    const mapping: Record<string, ChartType> = {
      'line-chart': 'line',
      'area-chart': 'line',
      'bar-chart': 'bar',
      'pie-chart': 'pie',
      'donut': 'doughnut',
      'scatter-chart': 'scatter',
      'bubble-chart': 'bubble',
      'radar': 'radar',
      'polar': 'polarArea'
    };

    return mapping[widgetType] || 'bar';
  }

  // Process raw data into chart format
  private static processData(type: string, data: any): ChartData {
    if (!data) {
      return this.generateMockData(type);
    }

    if (Array.isArray(data)) {
      return {
        labels: data.map((_, i) => `Item ${i + 1}`),
        datasets: [{
          label: 'Data',
          data: data.map(v => typeof v === 'object' ? v.value : v),
          backgroundColor: colorPalettes.default,
          borderColor: colorPalettes.default.map(c => c),
          borderWidth: 1
        }]
      };
    }

    if (data.labels && data.datasets) {
      return data;
    }

    if (data.labels && data.data) {
      return {
        labels: data.labels,
        datasets: [{
          label: data.label || 'Data',
          data: data.data,
          backgroundColor: data.backgroundColor || colorPalettes.default,
          borderColor: data.borderColor || colorPalettes.default,
          borderWidth: data.borderWidth || 1
        }]
      };
    }

    return this.generateMockData(type);
  }

  // Generate mock data for demonstration
  private static generateMockData(type: string): ChartData {
    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const values = [12, 19, 3, 5, 2, 3].map(() => Math.round(Math.random() * 100));

    switch (type) {
      case 'line':
      case 'area-chart':
        return {
          labels,
          datasets: [{
            label: 'Revenue',
            data: values,
            borderColor: '#3b82f6',
            backgroundColor: type === 'area-chart' ? 'rgba(59, 130, 246, 0.2)' : undefined,
            fill: type === 'area-chart',
            tension: 0.4
          }]
        };

      case 'bar':
        return {
          labels,
          datasets: [{
            label: 'Sales',
            data: values,
            backgroundColor: colorPalettes.default,
            borderWidth: 0
          }]
        };

      case 'pie':
      case 'donut':
        return {
          labels: ['Category A', 'Category B', 'Category C', 'Category D'],
          datasets: [{
            data: [30, 25, 25, 20],
            backgroundColor: colorPalettes.default,
            borderWidth: 0
          }]
        };

      case 'radar':
        return {
          labels: ['Speed', 'Reliability', 'Comfort', 'Safety', 'Efficiency'],
          datasets: [{
            label: 'Performance',
            data: [65, 59, 90, 81, 56],
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.2)'
          }]
        };

      default:
        return {
          labels,
          datasets: [{
            label: 'Data',
            data: values,
            backgroundColor: colorPalettes.default,
            borderWidth: 0
          }]
        };
    }
  }

  // Get default options for chart type
  private static getDefaultOptions(type: string, customOptions?: any): ChartOptions {
    const defaults: ChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top'
        },
        tooltip: {
          enabled: true
        }
      }
    };

    if (type.includes('line') || type.includes('area')) {
      defaults.scales = {
        y: {
          display: true,
          beginAtZero: true
        },
        x: {
          display: true
        }
      };
    }

    if (type.includes('bar')) {
      defaults.scales = {
        y: {
          display: true,
          beginAtZero: true
        },
        x: {
          display: true
        }
      };
    }

    if (customOptions) {
      return { ...defaults, ...customOptions };
    }

    return defaults;
  }

  // Generate color palette
  static getColorPalette(name: keyof typeof colorPalettes = 'default'): string[] {
    return colorPalettes[name];
  }

  // Generate gradient colors
  static generateGradient(startColor: string, endColor: string, steps: number): string[] {
    const colors: string[] = [];
    const start = this.hexToRgb(startColor);
    const end = this.hexToRgb(endColor);

    for (let i = 0; i < steps; i++) {
      const ratio = i / (steps - 1);
      const r = Math.round(start.r + (end.r - start.r) * ratio);
      const g = Math.round(start.g + (end.g - start.g) * ratio);
      const b = Math.round(start.b + (end.b - start.b) * ratio);
      colors.push(`rgb(${r}, ${g}, ${b})`);
    }

    return colors;
  }

  // Helper: Convert hex to RGB
  private static hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  // Format chart data for export
  static formatForExport(chart: GeneratedChart): any {
    return {
      type: chart.type,
      labels: chart.data.labels,
      datasets: chart.data.datasets.map(ds => ({
        label: ds.label,
        data: ds.data,
        backgroundColor: Array.isArray(ds.backgroundColor)
          ? ds.backgroundColor
          : [ds.backgroundColor]
      }))
    };
  }
}
