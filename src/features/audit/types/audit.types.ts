export interface AuditLog {
  _id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
}

export interface AuditLogsResponse {
  logs: AuditLog[];
  total: number;
}
