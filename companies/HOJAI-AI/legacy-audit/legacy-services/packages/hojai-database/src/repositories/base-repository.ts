/**
 * HOJAI Base Repository
 * Generic CRUD operations with tenant isolation
 */

import mongoose, { Model, FilterQuery, UpdateQuery, Document } from 'mongoose';

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sort?: Record<string, 1 | -1>;
  select?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export abstract class BaseRepository<T extends Document> {
  protected model: Model<T>;

  constructor(model: Model<T>) {
    this.model = model;
  }

  /**
   * Create a new document
   */
  async create(data: Partial<T>): Promise<T> {
    const doc = new this.model(data);
    return doc.save();
  }

  /**
   * Find by ID
   */
  async findById(id: string | mongoose.Types.ObjectId): Promise<T | null> {
    return this.model.findById(id).exec();
  }

  /**
   * Find one document
   */
  async findOne(filter: FilterQuery<T>): Promise<T | null> {
    return this.model.findOne(filter).exec();
  }

  /**
   * Find multiple documents
   */
  async find(filter: FilterQuery<T>, options?: PaginationOptions): Promise<T[]> {
    let query = this.model.find(filter);

    if (options?.select) {
      query = query.select(options.select);
    }

    if (options?.sort) {
      query = query.sort(options.sort);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.page && options?.limit) {
      query = query.skip((options.page - 1) * options.limit);
    }

    return query.exec();
  }

  /**
   * Find with pagination
   */
  async findPaginated(
    filter: FilterQuery<T>,
    options?: PaginationOptions
  ): Promise<PaginatedResult<T>> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;

    const [data, total] = await Promise.all([
      this.find(filter, { ...options, page, limit }),
      this.model.countDocuments(filter).exec()
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Update by ID
   */
  async updateById(
    id: string | mongoose.Types.ObjectId,
    update: UpdateQuery<T>
  ): Promise<T | null> {
    return this.model.findByIdAndUpdate(id, update, { new: true }).exec();
  }

  /**
   * Update one document
   */
  async updateOne(
    filter: FilterQuery<T>,
    update: UpdateQuery<T>
  ): Promise<T | null> {
    return this.model.findOneAndUpdate(filter, update, { new: true }).exec();
  }

  /**
   * Update multiple documents
   */
  async updateMany(
    filter: FilterQuery<T>,
    update: UpdateQuery<T>
  ): Promise<number> {
    const result = await this.model.updateMany(filter, update).exec();
    return result.modifiedCount;
  }

  /**
   * Delete by ID
   */
  async deleteById(id: string | mongoose.Types.ObjectId): Promise<boolean> {
    const result = await this.model.findByIdAndDelete(id).exec();
    return !!result;
  }

  /**
   * Delete one document
   */
  async deleteOne(filter: FilterQuery<T>): Promise<boolean> {
    const result = await this.model.findOneAndDelete(filter).exec();
    return !!result;
  }

  /**
   * Delete multiple documents
   */
  async deleteMany(filter: FilterQuery<T>): Promise<number> {
    const result = await this.model.deleteMany(filter).exec();
    return result.deletedCount || 0;
  }

  /**
   * Count documents
   */
  async count(filter: FilterQuery<T> = {}): Promise<number> {
    return this.model.countDocuments(filter).exec();
  }

  /**
   * Check if document exists
   */
  async exists(filter: FilterQuery<T>): Promise<boolean> {
    const doc = await this.model.exists(filter).exec();
    return !!doc;
  }

  /**
   * Aggregate pipeline
   */
  async aggregate(pipeline: mongoose.PipelineStage[]): Promise<any[]> {
    return this.model.aggregate(pipeline).exec();
  }

  /**
   * Bulk insert
   */
  async bulkInsert(docs: Partial<T>[]): Promise<T[]> {
    const result = await this.model.insertMany(docs);
    return result as T[];
  }

  /**
   * Find and update or create
   */
  async upsert(
    filter: FilterQuery<T>,
    update: UpdateQuery<T>
  ): Promise<T | null> {
    return this.model.findOneAndUpdate(filter, update, {
      new: true,
      upsert: true
    }).exec();
  }
}
