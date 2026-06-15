import { SLAMeasurement } from '../types';
export class MeasurementModel {
  private measurements: Map<string, SLAMeasurement[]> = new Map();
  add(measurement: SLAMeasurement) {
    if (!this.measurements.has(measurement.slaId)) this.measurements.set(measurement.slaId, []);
    this.measurements.get(measurement.slaId)!.push(measurement);
  }
  findBySLA(slaId: string) { return this.measurements.get(slaId) || []; }
  findAll() {
    const all: SLAMeasurement[] = [];
    this.measurements.forEach(m => all.push(...m));
    return all;
  }
  count() { return this.findAll().length; }
}
export const measurementModel = new MeasurementModel();
export default measurementModel;
