/**
 * Forecast Model - MongoDB Schema for Financial Forecasts
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IForecast extends Document {
  _id: mongoose.Types.ObjectId;
  date: Date;
  predictedInflow: number;
  predictedOutflow: number;
  netCashFlow: number;
  confidence: number;
  horizon: number;
  factors: Array<{
    name: string;
    impact: number;
    description: string;
  }>;
  actualInflow?: number;
  actualOutflow?: number;
  variance?: number;
  createdAt: Date;
  updatedAt: Date;
}

const ForecastFactorSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    impact: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const ForecastSchema = new Schema<IForecast>(
  {
    date: {
      type: Date,
      required: true,
      index: true,
    },
    predictedInflow: {
      type: Number,
      required: true,
    },
    predictedOutflow: {
      type: Number,
      required: true,
    },
    netCashFlow: {
      type: Number,
      required: true,
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    horizon: {
      type: Number,
      required: true,
      min: 1,
      index: true,
    },
    factors: [ForecastFactorSchema],
    actualInflow: {
      type: Number,
    },
    actualOutflow: {
      type: Number,
    },
    variance: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
ForecastSchema.index({ date: 1, horizon: 1 });
ForecastSchema.index({ horizon: 1, createdAt: -1 });

export const Forecast = mongoose.model<IForecast>('Forecast', ForecastSchema);
