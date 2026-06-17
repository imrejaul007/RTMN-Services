import mongoose, { Document, Schema } from 'mongoose';

// Documentation Types
export enum DocType {
  MANUAL = 'manual',
  QUICK_START = 'quick_start',
  DATASHEET = 'datasheet',
  TROUBLESHOOTING = 'troubleshooting',
  WARRANTY_INFO = 'warranty_info',
  FAQ = 'faq',
  VIDEO = 'video',
  API_REFERENCE = 'api_reference',
  INSTALLATION = 'installation',
  SAFETY = 'safety',
  COMPLIANCE = 'compliance',
  RELEASE_NOTES = 'release_notes',
  CUSTOM = 'custom'
}

// Documentation Format
export enum DocFormat {
  PDF = 'pdf',
  HTML = 'html',
  MARKDOWN = 'markdown',
  VIDEO = 'video',
  EXTERNAL = 'external',
  TEXT = 'text'
}

// Documentation Content Block
export interface IDocContentBlock {
  type: 'text' | 'image' | 'video' | 'code' | 'table' | 'list';
  content: string;
  order: number;
  metadata?: Record<string, any>;
}

// Documentation Version
export interface IDocVersion {
  version: string;
  releasedDate: Date;
  changelog?: string;
  isCurrent: boolean;
}

// Documentation Interface
export interface IDocumentation extends Document {
  tenantId: string;
  productId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  type: DocType;
  format: DocFormat;
  content: string; // Main content or URL
  contentBlocks?: IDocContentBlock[]; // Structured content
  version?: IDocVersion;
  url?: string; // External URL if applicable
  language: string;
  isPublished: boolean;
  isFeatured: boolean;
  tags: string[];
  viewCount: number;
  downloadCount: number;
  lastViewed?: Date;
  relatedDocuments: mongoose.Types.ObjectId[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Documentation Schema
const DocContentBlockSchema = new Schema<IDocContentBlock>(
  {
    type: {
      type: String,
      enum: ['text', 'image', 'video', 'code', 'table', 'list'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    order: {
      type: Number,
      default: 0
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  { _id: false }
);

const DocVersionSchema = new Schema<IDocVersion>(
  {
    version: {
      type: String,
      required: true
    },
    releasedDate: {
      type: Date,
      default: Date.now
    },
    changelog: String,
    isCurrent: {
      type: Boolean,
      default: false
    }
  },
  { _id: false }
);

const DocumentationSchema = new Schema<IDocumentation>(
  {
    tenantId: {
      type: String,
      required: true,
      index: true
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      index: 'text'
    },
    description: String,
    type: {
      type: String,
      enum: Object.values(DocType),
      default: DocType.MANUAL,
      index: true
    },
    format: {
      type: String,
      enum: Object.values(DocFormat),
      default: DocFormat.HTML,
      index: true
    },
    content: {
      type: String,
      default: ''
    },
    contentBlocks: [DocContentBlockSchema],
    version: DocVersionSchema,
    url: String,
    language: {
      type: String,
      default: 'en'
    },
    isPublished: {
      type: Boolean,
      default: false,
      index: true
    },
    isFeatured: {
      type: Boolean,
      default: false
    },
    tags: {
      type: [String],
      default: []
    },
    viewCount: {
      type: Number,
      default: 0
    },
    downloadCount: {
      type: Number,
      default: 0
    },
    lastViewed: Date,
    relatedDocuments: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Documentation'
      }
    ],
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true,
    collection: 'documentations'
  }
);

// Indexes
DocumentationSchema.index({ tenantId: 1, productId: 1 });
DocumentationSchema.index({ tenantId: 1, productId: 1, type: 1 });
DocumentationSchema.index({ tenantId: 1, isPublished: 1, isFeatured: 1 });
DocumentationSchema.index({ title: 'text', description: 'text' });
DocumentationSchema.index({ tenantId: 1, tags: 1 });

// Method to increment view count
DocumentationSchema.methods.incrementViews = function () {
  this.viewCount += 1;
  this.lastViewed = new Date();
};

// Method to increment download count
DocumentationSchema.methods.incrementDownloads = function () {
  this.downloadCount += 1;
};

// Static method to find published documentation
DocumentationSchema.statics.findPublished = function (
  tenantId: string,
  productId?: mongoose.Types.ObjectId
) {
  const query: any = { tenantId, isPublished: true };
  if (productId) {
    query.productId = productId;
  }
  return this.find(query).sort({ isFeatured: -1, viewCount: -1 });
};

// Static method to find by type
DocumentationSchema.statics.findByType = function (
  tenantId: string,
  productId: mongoose.Types.ObjectId,
  type: DocType
) {
  return this.find({
    tenantId,
    productId,
    type,
    isPublished: true
  }).sort({ isFeatured: -1, viewCount: -1 });
};

// Static method to find featured documentation
DocumentationSchema.statics.findFeatured = function (
  tenantId: string,
  productId?: mongoose.Types.ObjectId
) {
  const query: any = { tenantId, isPublished: true, isFeatured: true };
  if (productId) {
    query.productId = productId;
  }
  return this.find(query);
};

// Export the model
export const Documentation = mongoose.model<IDocumentation>('Documentation', DocumentationSchema);
export default Documentation;
