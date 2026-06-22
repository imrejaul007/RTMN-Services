import { Platform } from 'react-native';
import { apiClient } from './apiClient';
import { logger } from '../../utils/logger';

export interface UploadedImage {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

export interface UploadResponse {
  success: boolean;
  message: string;
  data: UploadedImage;
}

export interface MultipleUploadResponse {
  success: boolean;
  message: string;
  data: UploadedImage[];
}

type ImageType = 'banner' | 'icon' | 'deal' | 'general';

// SECURITY: Define proper type for React Native file upload object
// React Native requires uri, name, and type fields for FormData file attachments
interface RNFileObject {
  uri: string;
  name: string;
  type: string;
}

// SECURITY: Allowlist of permitted image MIME types to prevent malicious file uploads
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
]);

// SECURITY: Allowlist of permitted image extensions
const ALLOWED_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'heic',
  'heif',
]);

/**
 * SECURITY: Validate file extension and MIME type before upload.
 * Returns an error message if validation fails, null if valid.
 */
function validateImageFile(fileName: string, mimeType: string): string | null {
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (!extension || !ALLOWED_EXTENSIONS.has(extension)) {
    return `Invalid file extension: .${extension || 'unknown'}. Allowed: ${[...ALLOWED_EXTENSIONS].join(', ')}`;
  }
  if (!ALLOWED_MIME_TYPES.has(mimeType.toLowerCase())) {
    return `Invalid file type: ${mimeType}. Allowed: ${[...ALLOWED_MIME_TYPES].join(', ')}`;
  }
  return null;
}

class UploadsService {
  /**
   * Convert URI to Blob for web platform
   */
  private async uriToBlob(uri: string): Promise<Blob> {
    const response = await fetch(uri);
    return response.blob();
  }

  /**
   * Upload a single image
   * @param uri - Local file URI from image picker
   * @param type - Type of image (banner, icon, deal, general)
   * @param folder - Optional folder name
   */
  async uploadImage(
    uri: string,
    type: ImageType = 'general',
    folder: string = 'campaigns'
  ): Promise<UploadedImage> {
    try {
      logger.info('[Uploads] Uploading image:', { uri, type, folder, platform: Platform.OS });

      // Create form data
      const formData = new FormData();

      // Get filename from URI
      const uriParts = uri.split('/');
      let fileName = uriParts[uriParts.length - 1];

      // Handle blob URLs on web
      if (fileName.startsWith('blob:') || !fileName.includes('.')) {
        fileName = `image_${Date.now()}.jpg`;
      }

      const fileType = fileName.split('.').pop()?.toLowerCase() || 'jpg';
      const mimeType = `image/${fileType === 'jpg' ? 'jpeg' : fileType}`;

      // SECURITY: Validate file type before upload
      const validationError = validateImageFile(fileName, mimeType);
      if (validationError) {
        logger.error('[Uploads] File validation failed:', validationError);
        throw new Error(validationError);
      }

      if (Platform.OS === 'web') {
        // Web: Convert URI to Blob and append
        const blob = await this.uriToBlob(uri);
        formData.append('image', blob, fileName);
      } else {
        // Native: Use React Native specific format with proper typing
        const rnFile: RNFileObject = {
          uri,
          name: fileName,
          type: mimeType,
        };
        formData.append('image', rnFile as unknown as Blob);
      }

      formData.append('type', type);
      formData.append('folder', folder);

      // Make request with multipart/form-data
      const response = await apiClient.uploadFile<UploadedImage>('admin/uploads/image', formData);

      if (response.success && response.data) {
        logger.info('[Uploads] Image uploaded:', response.data.url);
        return response.data;
      }

      throw new Error(response.message || 'Failed to upload image');
    } catch (error: unknown) {
      logger.error('[Uploads] Upload error:', error instanceof Error ? error.message : String(error));
      throw new Error(error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Upload multiple images
   * @param uris - Array of local file URIs
   * @param folder - Optional folder name
   */
  async uploadMultipleImages(
    uris: string[],
    folder: string = 'campaigns'
  ): Promise<UploadedImage[]> {
    try {
      logger.info('[Uploads] Uploading multiple images:', uris.length);

      const formData = new FormData();

      for (let i = 0; i < uris.length; i++) {
        const uri = uris[i];
        const uriParts = uri.split('/');
        let fileName = uriParts[uriParts.length - 1];

        if (fileName.startsWith('blob:') || !fileName.includes('.')) {
          fileName = `image_${Date.now()}_${i}.jpg`;
        }

        const fileType = fileName.split('.').pop()?.toLowerCase() || 'jpg';
        const mimeType = `image/${fileType === 'jpg' ? 'jpeg' : fileType}`;

        // SECURITY: Validate each file type before upload
        const validationError = validateImageFile(fileName, mimeType);
        if (validationError) {
          logger.error(`[Uploads] File validation failed for index ${i}: ${validationError}`);
          throw new Error(`File ${i + 1}: ${validationError}`);
        }

        if (Platform.OS === 'web') {
          const blob = await this.uriToBlob(uri);
          formData.append('images', blob, fileName);
        } else {
          // Native: Use React Native specific format with proper typing
          const rnFile: RNFileObject = {
            uri,
            name: fileName,
            type: mimeType,
          };
          formData.append('images', rnFile as unknown as Blob);
        }
      }

      formData.append('folder', folder);

      const response = await apiClient.uploadFile<UploadedImage[]>(
        'admin/uploads/multiple',
        formData
      );

      if (response.success && response.data) {
        logger.info('[Uploads] Images uploaded:', response.data.length);
        return response.data;
      }

      throw new Error(response.message || 'Failed to upload images');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[Uploads] Multiple upload error:', message);
      throw new Error(message || 'Failed to upload images');
    }
  }

  /**
   * Delete an image from Cloudinary
   * @param publicId - Cloudinary public ID
   */
  async deleteImage(publicId: string): Promise<void> {
    try {
      logger.info('[Uploads] Deleting image:', publicId);

      const response = await apiClient.post('admin/uploads/delete', { publicId });

      if (!response.success) {
        throw new Error(response.message || 'Failed to delete image');
      }

      logger.info('[Uploads] Image deleted');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[Uploads] Delete error:', message);
      throw new Error(message || 'Failed to delete image');
    }
  }
}

export const uploadsService = new UploadsService();
export default uploadsService;
