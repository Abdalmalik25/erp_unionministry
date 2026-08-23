/**
 * useTwoFactor - hook لإدارة المصادقة الثنائية (2FA)
 */
import { useState, useCallback } from 'react';
import { verifyTOTP, setupTwoFactor, getTwoFactorSettings, storeTwoFactorSettings, disableTwoFactor } from '../utils/totp';
interface TwoFactorState {
    isEnabled: boolean;
    isLoading: boolean;
    error: string | null;
    qrCode: string | null;
    backupCodes: string[];
}
export function useTwoFactor(userId: string) {
    const [state, setState] = useState<TwoFactorState>({
        isEnabled: false,
        isLoading: false,
        error: null,
        qrCode: null,
        backupCodes: [],
    });
    const enable = useCallback(() => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        try {
            const setup = setupTwoFactor(userId);
            storeTwoFactorSettings(userId, setup.secret, setup.backupCodes);
            setState(prev => ({
                ...prev,
                isEnabled: true,
                isLoading: false,
                qrCode: setup.qrCode,
                backupCodes: setup.backupCodes,
            }));
        }
        catch (error) {
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: 'فشل في إعداد المصادقة الثنائية',
            }));
        }
    }, [userId]);
    const verify = useCallback(async (token: string): Promise<boolean> => {
        const settings = getTwoFactorSettings(userId);
        if (!settings)
            return false;
        setState(prev => ({ ...prev, isLoading: true }));
        try {
            const isValid = await verifyTOTP(settings.secret, token);
            setState(prev => ({ ...prev, isLoading: false }));
            return isValid;
        }
        catch (error) {
            setState(prev => ({ ...prev, isLoading: false }));
            return false;
        }
    }, [userId]);
    const disable = useCallback(() => {
        disableTwoFactor(userId);
        setState(prev => ({
            ...prev,
            isEnabled: false,
            qrCode: null,
            backupCodes: [],
        }));
    }, [userId]);
    return {
        ...state,
        enable,
        verify,
        disable,
    };
}
