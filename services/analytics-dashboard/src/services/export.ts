import { Dashboard } from '../models/Dashboard';
import { Widget } from '../models/Widget';
import { DataEngine } from './dataEngine';

type ExportFormat = 'json' | 'csv' | 'xlsx' | 'pdf';

interface ExportOptions {
  format: ExportFormat;
  data: any;
  filename?: string;
  options?: {
    includeMetadata?: boolean;
    includeTimestamp?: boolean;
    columns?: string[];
  };
}

interface DashboardExportOptions {
  dashboardId: string;
  format: ExportFormat;
  includeWidgets?: boolean;
  includeData?: boolean;
}

export class ExportService {
  // Main export function
  static async export(options: ExportOptions): Promise<any> {
    const { format, data, filename, options: exportOptions } = options;

    switch (format) {
      case 'json':
        return this.exportJSON(data, filename, exportOptions);
      case 'csv':
        return this.exportCSV(data, filename, exportOptions);
      case 'xlsx':
        return this.exportXLSX(data, filename, exportOptions);
      case 'pdf':
        return this.exportPDF(data, filename, exportOptions);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  // Export dashboard
  static async exportDashboard(options: DashboardExportOptions): Promise<any> {
    const { dashboardId, format, includeWidgets, includeData } = options;

    const dashboard = Dashboard.getById(dashboardId);
    if (!dashboard) {
      throw new Error('Dashboard not found');
    }

    const exportData: any = {
      dashboard: {
        id: dashboard.id,
        name: dashboard.name,
        description: dashboard.description,
        industry: dashboard.industry,
        config: dashboard.config,
        filters: dashboard.filters,
        createdAt: dashboard.createdAt,
        updatedAt: dashboard.updatedAt
      }
    };

    if (includeWidgets) {
      const widgets = Widget.getByDashboard(dashboardId);
      exportData.widgets = widgets.map(w => ({
        id: w.id,
        name: w.name,
        description: w.description,
        type: w.type,
        position: w.position,
        style: w.style,
        config: w.config
      }));

      if (includeData) {
        exportData.widgetData = {};
        for (const widget of widgets) {
          const data = await DataEngine.getWidgetData(widget);
          exportData.widgetData[widget.id] = data;
        }
      }
    }

    return this.export({
      format,
      data: exportData,
      filename: `dashboard-${dashboard.name.toLowerCase().replace(/\s+/g, '-')}`,
      options: { includeMetadata: true, includeTimestamp: true }
    });
  }

  // Export to JSON
  private static exportJSON(data: any, filename?: string, options?: any): any {
    const exportData = options?.includeMetadata ? {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      data
    } : data;

    return {
      success: true,
      format: 'json',
      filename: `${filename || 'export'}.json`,
      mimeType: 'application/json',
      content: JSON.stringify(exportData, null, 2),
      size: JSON.stringify(exportData).length
    };
  }

  // Export to CSV
  private static exportCSV(data: any, filename?: string, options?: any): any {
    let csvContent = '';

    if (Array.isArray(data)) {
      if (data.length === 0) {
        csvContent = '';
      } else if (typeof data[0] === 'object') {
        const headers = options?.columns || Object.keys(data[0]);
        csvContent = headers.join(',') + '\n';

        data.forEach(row => {
          const values = headers.map(header => {
            const value = row[header];
            if (value === null || value === undefined) return '';
            if (typeof value === 'string' && value.includes(',')) {
              return `"${value}"`;
            }
            return value;
          });
          csvContent += values.join(',') + '\n';
        });
      } else {
        csvContent = data.join('\n');
      }
    } else if (typeof data === 'object') {
      // Handle datasets with labels and data
      if (data.labels && data.datasets) {
        const labels = data.labels;
        csvContent = 'Label,' + data.datasets.map((ds: any) => ds.label || 'Value').join(',') + '\n';

        labels.forEach((label: string, index: number) => {
          const values = data.datasets.map((ds: any) => ds.data[index] ?? '');
          csvContent += `${label},${values.join(',')}\n`;
        });
      } else {
        // Flatten object to key,value pairs
        csvContent = 'Key,Value\n';
        Object.entries(data).forEach(([key, value]) => {
          csvContent += `${key},${value}\n`;
        });
      }
    }

    return {
      success: true,
      format: 'csv',
      filename: `${filename || 'export'}.csv`,
      mimeType: 'text/csv',
      content: csvContent,
      size: csvContent.length
    };
  }

  // Export to XLSX (simplified - returns structure for client-side conversion)
  private static exportXLSX(data: any, filename?: string, options?: any): any {
    // Since we're in Node.js without xlsx library, we'll provide the structure
    // The actual XLSX conversion would happen on the client
    const workbook = {
      sheets: this.convertToSheetStructure(data)
    };

    return {
      success: true,
      format: 'xlsx',
      filename: `${filename || 'export'}.xlsx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      content: JSON.stringify(workbook),
      structure: workbook,
      note: 'XLSX conversion requires client-side processing'
    };
  }

  // Convert data to sheet structure
  private static convertToSheetStructure(data: any): any[] {
    const sheets: any[] = [];

    if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
      sheets.push({
        name: 'Data',
        headers: Object.keys(data[0]),
        rows: data.map(row => Object.values(row))
      });
    } else if (typeof data === 'object') {
      if (data.labels && data.datasets) {
        sheets.push({
          name: 'Chart Data',
          headers: ['Label', ...data.datasets.map((ds: any) => ds.label || 'Value')],
          rows: data.labels.map((label: string, i: number) => [
            label,
            ...data.datasets.map((ds: any) => ds.data[i] ?? '')
          ])
        });
      } else {
        sheets.push({
          name: 'Summary',
          headers: ['Key', 'Value'],
          rows: Object.entries(data).map(([k, v]) => [k, v])
        });
      }
    }

    return sheets;
  }

  // Export to PDF (simplified - returns structure for PDF generation)
  private static exportPDF(data: any, filename?: string, options?: any): any {
    return {
      success: true,
      format: 'pdf',
      filename: `${filename || 'export'}.pdf`,
      mimeType: 'application/pdf',
      content: {
        title: filename || 'Analytics Report',
        generatedAt: new Date().toISOString(),
        sections: this.generatePDFSections(data)
      },
      note: 'PDF generation requires client-side processing or a PDF library'
    };
  }

  // Generate PDF sections from data
  private static generatePDFSections(data: any): any[] {
    const sections: any[] = [];

    if (data.dashboard) {
      sections.push({
        title: 'Dashboard',
        type: 'header',
        content: {
          name: data.dashboard.name,
          description: data.dashboard.description,
          industry: data.dashboard.industry
        }
      });
    }

    if (data.widgets) {
      sections.push({
        title: 'Widgets',
        type: 'list',
        items: data.widgets.map((w: any) => ({
          name: w.name,
          type: w.type,
          position: `(${w.position.x}, ${w.position.y})`
        }))
      });
    }

    if (data.widgetData) {
      sections.push({
        title: 'Widget Data',
        type: 'data',
        items: Object.entries(data.widgetData).map(([id, values]) => ({
          widgetId: id,
          data: values
        }))
      });
    }

    return sections;
  }

  // Batch export multiple dashboards
  static async exportBatch(dashboardIds: string[], format: ExportFormat): Promise<any> {
    const results: any[] = [];
    const errors: any[] = [];

    for (const id of dashboardIds) {
      try {
        const result = await this.exportDashboard({
          dashboardId: id,
          format,
          includeWidgets: true,
          includeData: false
        });
        results.push(result);
      } catch (error) {
        errors.push({ dashboardId: id, error: (error as Error).message });
      }
    }

    return {
      total: dashboardIds.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors
    };
  }
}
