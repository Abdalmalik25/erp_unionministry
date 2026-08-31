import { BaseResource } from '../base-resource';
import { Payment, PaymentCreate, QueryParams } from '../types';

export class PaymentsResource extends BaseResource {
  async list(params?: QueryParams & { employerId?: string; type?: string; status?: string }): Promise<{ items: Payment[]; pagination: any }> {
    return this.client.requestPaginated<Payment>({
      method: 'GET',
      url: `/payments${this.buildQuery(this.withPagination(params))}`,
    });
  }

  async get(id: string): Promise<Payment> {
    return this.client.request<Payment>({ method: 'GET', url: `/payments/${id}` });
  }

  async create(data: PaymentCreate): Promise<Payment> {
    return this.client.request<Payment>({ method: 'POST', url: '/payments', data });
  }

  async verify(id: string, verificationReference: string): Promise<Payment> {
    return this.client.request<Payment>({
      method: 'POST',
      url: `/payments/${id}/verify`,
      data: { verificationReference },
    });
  }
}