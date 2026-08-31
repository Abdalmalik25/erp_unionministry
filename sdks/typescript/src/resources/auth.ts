import { BaseResource } from '../base-resource';
import { LoginRequest, LoginResponse, User } from '../types';

export class AuthResource extends BaseResource {
  /**
   * Authenticate user and obtain JWT tokens
   */
  async login(data: LoginRequest): Promise<LoginResponse> {
    return this.client.request<LoginResponse>({
      method: 'POST',
      url: '/auth/login',
      data,
    });
  }

  /**
   * Logout and invalidate current session
   */
  async logout(): Promise<void> {
    await this.client.request({ method: 'POST', url: '/auth/logout' });
  }

  /**
   * Get current authenticated user
   */
  async me(): Promise<User> {
    return this.client.request<User>({ method: 'GET', url: '/auth/me' });
  }

  /**
   * Verify MFA code
   */
  async verifyMFA(code: string, sessionId: string): Promise<{ verified: boolean }> {
    return this.client.request({ method: 'POST', url: '/auth/mfa/verify', data: { code, sessionId } });
  }

  /**
   * Refresh access token
   */
  async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    return this.client.request({ method: 'POST', url: '/auth/refresh', data: { refreshToken } });
  }

  /**
   * Change password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await this.client.request({
      method: 'POST',
      url: '/auth/change-password',
      data: { currentPassword, newPassword },
    });
  }
}