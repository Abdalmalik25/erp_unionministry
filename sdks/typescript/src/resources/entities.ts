import { BaseResource } from '../base-resource';
import { Entity, EntityCreate, EntityUpdate, PaginatedResponse, QueryParams } from '../types';

export class EntitiesResource extends BaseResource {
  /**
   * List all entities (employers, unions, etc.)
   */
  async list(params?: QueryParams & { type?: string; status?: string }): Promise<{ items: Entity[]; pagination: any }> {
    return this.client.requestPaginated<Entity>({
      method: 'GET',
      url: `/entities${this.buildQuery(this.withPagination(params))}`,
    });
  }

  /**
   * Get entity by ID
   */
  async get(id: string): Promise<Entity> {
    return this.client.request<Entity>({ method: 'GET', url: `/entities/${id}` });
  }

  /**
   * Create a new entity
   */
  async create(data: EntityCreate): Promise<Entity> {
    return this.client.request<Entity>({ method: 'POST', url: '/entities', data });
  }

  /**
   * Update an entity
   */
  async update(id: string, data: Partial<EntityUpdate>): Promise<Entity> {
    return this.client.request<Entity>({ method: 'PUT', url: `/entities/${id}`, data });
  }

  /**
   * Soft-delete an entity
   */
  async delete(id: string): Promise<void> {
    await this.client.request({ method: 'DELETE', url: `/entities/${id}` });
  }

  /**
   * Get members of an entity
   */
  async members(id: string, params?: QueryParams): Promise<{ items: any[]; pagination: any }> {
    return this.client.requestPaginated({
      method: 'GET',
      url: `/entities/${id}/members${this.buildQuery(this.withPagination(params))}`,
    });
  }

  /**
   * Get activities of an entity
   */
  async activities(id: string, params?: QueryParams): Promise<{ items: any[]; pagination: any }> {
    return this.client.requestPaginated({
      method: 'GET',
      url: `/entities/${id}/activities${this.buildQuery(this.withPagination(params))}`,
    });
  }

  /**
   * List board members
   */
  async boardMembers(params?: QueryParams & { entityId?: string }): Promise<{ items: any[]; pagination: any }> {
    return this.client.requestPaginated({
      method: 'GET',
      url: `/board-members${this.buildQuery(this.withPagination(params))}`,
    });
  }

  /**
   * Create board member
   */
  async createBoardMember(data: any): Promise<any> {
    return this.client.request({ method: 'POST', url: '/board-members', data });
  }

  /**
   * Update board member
   */
  async updateBoardMember(id: string, data: any): Promise<any> {
    return this.client.request({ method: 'PUT', url: `/board-members/${id}`, data });
  }

  /**
   * Delete board member
   */
  async deleteBoardMember(id: string): Promise<void> {
    await this.client.request({ method: 'DELETE', url: `/board-members/${id}` });
  }
}