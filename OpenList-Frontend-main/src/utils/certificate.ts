import { r } from "./index"
import type { PResp, Certificate, CertificateRequest } from "~/types"

// 管理员接口
export const getCertificates = (page = 1, per_page = 10): Promise<PResp<Certificate[]>> => {
  return r.get("/admin/certificate/list", {
    params: { page, per_page }
  })
}

export const getCertificateRequests = (page = 1, per_page = 10): Promise<PResp<CertificateRequest[]>> => {
  return r.get("/admin/certificate/requests", {
    params: { page, per_page }
  })
}

export const createCertificate = (data: any): Promise<PResp<Certificate>> => {
  return r.post("/admin/certificate/create", data)
}

export const updateCertificate = (id: number, data: any): Promise<PResp<Certificate>> => {
  return r.put(`/admin/certificate/update/${id}`, data)
}

export const deleteCertificate = (id: number): Promise<PResp<null>> => {
  return r.delete(`/admin/certificate/delete/${id}`)
}

export const revokeCertificate = (id: number): Promise<PResp<null>> => {
  return r.post(`/admin/certificate/revoke/${id}`)
}

export const downloadCertificate = async (id: number): Promise<Blob> => {
  return r.post(`/admin/certificate/download/${id}`, {}, { responseType: 'blob' })
}

export const createCertificateRequest = (data: any): Promise<PResp<CertificateRequest>> => {
  return r.post("/admin/certificate/request/create", data)
}

export const approveCertificateRequest = (id: number): Promise<PResp<null>> => {
  return r.post(`/admin/certificate/request/approve/${id}`)
}

export const rejectCertificateRequest = (id: number, reason: string): Promise<PResp<null>> => {
  return r.post(`/admin/certificate/request/reject/${id}`, { reason })
}

// 数据处理模块 - 统一处理证书和证书申请数据
export const processCertificateData = (certificates: Certificate[]) => {
  return certificates.map(cert => ({
    ...cert,
    issued_date: new Date(cert.issued_date),
    expiration_date: new Date(cert.expiration_date)
  }))
}

export const processCertificateRequestData = (requests: CertificateRequest[]) => {
  return requests.map(request => ({
    ...request,
    created_at: new Date(request.created_at)
  }))
}

// 租户接口 (普通用户作为租户使用)
export const getTenantCertificate = (): Promise<PResp<Certificate | null>> => {
  return r.get("/tenant/certificate")
}

export const getTenantCertificateRequests = (): Promise<PResp<CertificateRequest[]>> => {
  return r.get("/tenant/certificate/requests")
}

export const createTenantCertificateRequest = (data: Pick<CertificateRequest, "type" | "reason">): Promise<PResp<CertificateRequest>> => {
  return r.post("/tenant/certificate/request", data)
}

export const downloadTenantCertificate = (): Promise<Blob> => {
  return r.get("/tenant/certificate/download", {
    responseType: "blob"
  })
}