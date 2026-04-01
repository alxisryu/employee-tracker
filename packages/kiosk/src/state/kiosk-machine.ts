import type { ScanParseResult } from '@/src/utils/qr-parser';

export type KioskScreen = 'idle' | 'processing' | 'success' | 'error' | 'manual' | 'guest';

export type ErrorType = 'scan' | 'network' | 'backend' | 'unknown';

export interface KioskState {
  screen: KioskScreen;
  /** Set during processing to know what to submit */
  pendingEmployeeId: string | null;
  pendingIdentifier: string | null; // for manual (email/id input by user)
  pendingGuestData: GuestData | null;
  /** Set after success */
  employeeName: string | null;
  successMessage: string | null;
  /** Set after error */
  errorType: ErrorType | null;
  errorMessage: string | null;
  /** Raw scan result for audit */
  lastScanResult: ScanParseResult | null;
}

export interface GuestData {
  fullName: string;
  company?: string;
  host?: string;
  reason?: string;
}

export type KioskAction =
  | { type: 'SCAN_DETECTED'; payload: ScanParseResult }
  | { type: 'MANUAL_SUBMIT'; payload: { identifier: string } }
  | { type: 'GUEST_SUBMIT'; payload: GuestData }
  | { type: 'SUBMIT_SUCCESS'; payload: { employeeName?: string; message: string } }
  | { type: 'SUBMIT_ERROR'; payload: { errorType: ErrorType; message: string } }
  | { type: 'SHOW_MANUAL' }
  | { type: 'SHOW_GUEST' }
  | { type: 'RESET' };

export const initialKioskState: KioskState = {
  screen: 'idle',
  pendingEmployeeId: null,
  pendingIdentifier: null,
  pendingGuestData: null,
  employeeName: null,
  successMessage: null,
  errorType: null,
  errorMessage: null,
  lastScanResult: null,
};

export function kioskReducer(state: KioskState, action: KioskAction): KioskState {
  switch (action.type) {
    case 'SCAN_DETECTED':
      if (state.screen !== 'idle') return state;
      return {
        ...initialKioskState,
        screen: 'processing',
        pendingEmployeeId: action.payload.employeeUuid,
        lastScanResult: action.payload,
      };

    case 'MANUAL_SUBMIT':
      if (state.screen !== 'manual') return state;
      return {
        ...initialKioskState,
        screen: 'processing',
        pendingIdentifier: action.payload.identifier,
      };

    case 'GUEST_SUBMIT':
      if (state.screen !== 'guest') return state;
      return {
        ...initialKioskState,
        screen: 'processing',
        pendingGuestData: action.payload,
      };

    case 'SUBMIT_SUCCESS':
      return {
        ...state,
        screen: 'success',
        employeeName: action.payload.employeeName ?? null,
        successMessage: action.payload.message,
        pendingEmployeeId: null,
        pendingIdentifier: null,
        pendingGuestData: null,
      };

    case 'SUBMIT_ERROR':
      return {
        ...state,
        screen: 'error',
        errorType: action.payload.errorType,
        errorMessage: action.payload.message,
        pendingEmployeeId: null,
        pendingIdentifier: null,
        pendingGuestData: null,
      };

    case 'SHOW_MANUAL':
      return { ...initialKioskState, screen: 'manual' };

    case 'SHOW_GUEST':
      return { ...initialKioskState, screen: 'guest' };

    case 'RESET':
      return { ...initialKioskState };

    default:
      return state;
  }
}
