import { BaseResource } from '../base-resource';
import { Occupation, ISIC4Code, Governorate, QueryParams } from '../types';

export class DirectoriesResource extends BaseResource {
  /** List all national directories */
  async list(params?: QueryParams & { category?: string }): Promise<{ items: any[]; pagination: any }> {
    return this.client.requestPaginated({
      method: 'GET',
      url: `/national-directories${this.buildQuery(this.withPagination(params))}`,
    });
  }

  /** List occupations */
  async occupations(params?: QueryParams & { sectorId?: string; level?: string }): Promise<{ items: Occupation[]; pagination: any }> {
    return this.client.requestPaginated<Occupation>({
      method: 'GET',
      url: `/national-directories/occupations${this.buildQuery(this.withPagination(params))}`,
    });
  }

  /** List ISIC-4 codes */
  async isic4(params?: QueryParams & { section?: string }): Promise<{ items: ISIC4Code[]; pagination: any }> {
    return this.client.requestPaginated<ISIC4Code>({
      method: 'GET',
      url: `/isic4${this.buildQuery(this.withPagination(params))}`,
    });
  }

  /** List governorates (public — no auth required) */
  async governorates(includeDistricts = false): Promise<Governorate[]> {
    return this.client.request<Governorate[]>({
      method: 'GET',
      url: `/geography/governorates${this.buildQuery({ includeDistricts })}`,
    });
  }
}