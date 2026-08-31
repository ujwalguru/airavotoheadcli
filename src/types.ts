/**
 * Shared Type Definitions for Super Admin Panel
 */

export interface Cafe {
  id: number;
  cafe_name: string;
  owner_name: string;
  email: string;
  api_key: string;
  status: 'active' | 'suspended';
  created_at: string;
}

export interface AdminCounts {
  total: number;
  active: number;
  suspended: number;
}

export interface AdminAuthResponse {
  authenticated: boolean;
  user?: {
    username: string;
    role: string;
  };
}

export interface VerifyResponse {
  valid: boolean;
  status: 'active' | 'suspended' | 'not_found' | 'error';
  message: string;
  cafe_id?: number;
  cafe_name?: string;
  owner_name?: string;
}

export interface SystemLog {
  id: number;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  event: string;
  details: string;
}

export interface SystemHealth {
  uptime: number;
  memory: {
    rss: string;
    heapTotal: string;
    heapUsed: string;
  };
  database: string;
  version: string;
  nodeVersion: string;
  timestamp: string;
}

export interface DeviceStat {
  type: string;
  total: number;
  inUse: number;
  available?: number;
  seats?: any[];
  startTime?: string;
  endTime?: string;
  [key: string]: any;
}

export interface CafeEntry {
  id: string;
  customer: string;
  device: string;
  startTime: string;
  status: 'active' | 'completed';
}

export interface CafeLiveStatus {
  cafe_id: number;
  cafe_name: string;
  status: 'active' | 'suspended' | 'offline';
  license_status?: 'active' | 'suspended';
  is_online?: boolean;
  devices: DeviceStat[];
  recent_entries: CafeEntry[];
  last_heartbeat?: string;
  availability?: any[];
  cafe_details?: Record<string, any>;
  configurations?: {
    devices: any[];
    pricing: any[];
    happyHours: any[];
    happyHoursPricing: any[];
  };
}
