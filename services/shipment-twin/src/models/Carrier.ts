import mongoose, { Document, Schema } from 'mongoose';

// Carrier Service Type
export interface ICarrierService {
  name: string;
  code: string;
  estimatedDays?: number;
  pricePerKg?: number;
}

// Carrier Document Interface
export interface ICarrier extends Document {
  code: string;
  name: string;
  description?: string;
  trackingUrl: string;
  apiKey?: string;
  active: boolean;
  services: ICarrierService[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Carrier Schema
const CarrierServiceSchema = new Schema<ICarrierService>(
  {
    name: { type: String, required: true },
    code: { type: String, required: true },
    estimatedDays: Number,
    pricePerKg: Number
  },
  { _id: false }
);

const CarrierSchema = new Schema<ICarrier>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      index: true
    },
    name: {
      type: String,
      required: true
    },
    description: String,
    trackingUrl: {
      type: String,
      required: true
    },
    apiKey: {
      type: String,
      select: false
    },
    active: {
      type: Boolean,
      default: true,
      index: true
    },
    services: [CarrierServiceSchema],
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true,
    collection: 'carriers'
  }
);

// Method to check if carrier is available
CarrierSchema.methods.isAvailable = function () {
  return this.active;
};

// Static method to get active carriers
CarrierSchema.statics.getActive = function () {
  return this.find({ active: true }).sort({ name: 1 });
};

// Static method to find by code
CarrierSchema.statics.findByCode = function (code: string) {
  return this.findOne({ code: code.toUpperCase() });
};

// Pre-save hook to uppercase code
CarrierSchema.pre('save', function (next) {
  if (this.isModified('code')) {
    this.code = this.code.toUpperCase();
  }
  next();
});

// Default carriers seed data
CarrierSchema.statics.seedDefaults = async function () {
  const defaults = [
    {
      code: 'FEDEX',
      name: 'FedEx',
      description: 'FedEx Corporation - Global shipping',
      trackingUrl: 'https://www.fedex.com/fedextrack/?tracknumbers=',
      services: [
        { name: 'FedEx Ground', code: 'GROUND', estimatedDays: 5, pricePerKg: 2.5 },
        { name: 'FedEx Express', code: 'EXPRESS', estimatedDays: 2, pricePerKg: 8.0 },
        { name: 'FedEx Overnight', code: 'OVERNIGHT', estimatedDays: 1, pricePerKg: 15.0 }
      ]
    },
    {
      code: 'UPS',
      name: 'United Parcel Service',
      description: 'UPS - Global logistics',
      trackingUrl: 'https://www.ups.com/track?tracknum=',
      services: [
        { name: 'UPS Ground', code: 'GROUND', estimatedDays: 5, pricePerKg: 2.3 },
        { name: 'UPS 3-Day', code: '3DAY', estimatedDays: 3, pricePerKg: 6.5 },
        { name: 'UPS Next Day Air', code: 'NEXT_DAY', estimatedDays: 1, pricePerKg: 14.0 }
      ]
    },
    {
      code: 'DHL',
      name: 'DHL Express',
      description: 'DHL - International shipping',
      trackingUrl: 'https://www.dhl.com/en/express/tracking.html?AWB=',
      services: [
        { name: 'DHL Express', code: 'EXPRESS', estimatedDays: 3, pricePerKg: 10.0 },
        { name: 'DHL Economy', code: 'ECONOMY', estimatedDays: 7, pricePerKg: 4.0 }
      ]
    },
    {
      code: 'USPS',
      name: 'United States Postal Service',
      description: 'USPS - US domestic shipping',
      trackingUrl: 'https://tools.usps.com/go/TrackConfirmAction?tLabels=',
      services: [
        { name: 'Priority Mail', code: 'PRIORITY', estimatedDays: 3, pricePerKg: 3.5 },
        { name: 'First Class', code: 'FIRST', estimatedDays: 5, pricePerKg: 2.0 },
        { name: 'Parcel Select', code: 'SELECT', estimatedDays: 7, pricePerKg: 1.5 }
      ]
    },
    {
      code: 'DTDC',
      name: 'DTDC Express',
      description: 'DTDC - India domestic and international',
      trackingUrl: 'https://www.dtdc.in/tracking/tracking_results.asp?Ttype=awb_no&Trk_No=',
      services: [
        { name: 'Surface', code: 'SURFACE', estimatedDays: 7, pricePerKg: 1.0 },
        { name: 'Express', code: 'EXPRESS', estimatedDays: 3, pricePerKg: 5.0 }
      ]
    }
  ];

  for (const carrier of defaults) {
    await this.findOneAndUpdate(
      { code: carrier.code },
      carrier,
      { upsert: true, new: true }
    );
  }
};

export const Carrier = mongoose.model<ICarrier>('Carrier', CarrierSchema);
