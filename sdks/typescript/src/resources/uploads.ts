import { BaseResource } from '../base-resource';
import { UploadResponse, Upload } from '../types';

export class UploadsResource extends BaseResource {
  /**
   * Upload a file. The file can be a File, Blob, or any axios-compatible type.
   */
  async uploadFile(
    file: File | Blob,
    options?: {
      category?: 'documents' | 'images' | 'certificates' | 'contracts';
      entityType?: string;
      entityId?: string;
    }
  ): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (options?.category) formData.append('category', options.category);
    if (options?.entityType) formData.append('entityType', options.entityType);
    if (options?.entityId) formData.append('entityId', options.entityId);

    return this.client.request<UploadResponse>({
      method: 'POST',
      url: '/uploads',
      data: formData,
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }

  /** Get upload metadata */
  async get(id: string): Promise<Upload> {
    return this.client.request<Upload>({ method: 'GET', url: `/uploads/${id}` });
  }

  /** Delete upload */
  async delete(id: string): Promise<void> {
    await this.client.request({ method: 'DELETE', url: `/uploads/${id}` });
  }
}