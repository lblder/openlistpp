export type CertificateType = "user" | "node";

export type CertificateStatus = "pending" | "valid" | "expiring" | "revoked" | "rejected";

export interface Certificate {
  id: number;
  name: string;
  type: CertificateType;
  status: CertificateStatus;
  owner: string;
  owner_id: number;
  content: string;
  issued_date: string;
  expiration_date: string;
  created_at: string;
  updated_at: string;
}

export interface CertificateRequest {
  id: number;
  user_name: string;
  user_id: number;
  type: CertificateType;
  status: CertificateStatus;
  reason: string;
  approved_by?: string;
  approved_at?: string;
  rejected_by?: string;
  rejected_at?: string;
  rejected_reason?: string;
  created_at: string;
  updated_at: string;
}