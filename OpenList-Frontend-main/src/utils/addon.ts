import { r } from "./index"
import type { PResp } from "~/types"

// 安全策略相关接口 - 与后端 addon_models.go 保持一致
export interface SecurityStrategy {
  id?: number
  name: string
  category: string           // 策略分类
  level: string              // 策略级别：高/中/低
  params?: any               // 策略参数（JSON）
  description: string
  status: number             // 状态：1=启用，0=禁用
  created_at?: string
  updated_at?: string
}

// 工控协议相关接口 - 与后端 addon_models.go 保持一致
export interface ICSProtocol {
  id?: number
  name: string
  version: string
  scene: string              // 适用场景
  remark: string             // 协议备注说明
  status: number             // 状态：1=启用，0=禁用
  created_at?: string
}

// 工控设备相关接口 - 与后端 addon_models.go 保持一致
export interface ICSDevice {
  id?: number
  device_name: string        // 设备名称
  protocol_id: number        // 关联协议ID
  scene: string              // 所属工控场景
  status: number             // 状态：1=正常，0=停用
  remark: string             // 设备描述或备注
  created_at?: string
  protocol?: ICSProtocol     // 关联的协议对象
}

// 设备场量点相关接口 - 与后端 addon_models.go 保持一致
export interface ICSDevicePoint {
  id?: number
  device_id: number          // 关联设备ID
  point_name: string         // 场量名称
  point_type: string         // 场量类型：模拟量/开关量/状态量
  address: string            // 寄存器地址
  unit: string               // 单位
  tags: string               // 标签
  status: number             // 状态：1=正常，0=禁用
  created_at?: string
  device?: ICSDevice         // 关联的设备对象
}

// 安全策略相关API
export const getSecurityStrategies = (page = 1, per_page = 10): Promise<PResp<SecurityStrategy[]>> => {
  return r.get("/keti1/security-strategy/list", {
    params: { page, per_page }
  })
}

export const getSecurityStrategy = (id: number): Promise<PResp<SecurityStrategy>> => {
  return r.get(`/keti1/security-strategy/get/${id}`)
}

export const createSecurityStrategy = (data: any): Promise<PResp<SecurityStrategy>> => {
  return r.post("/keti1/security-strategy/create", data)
}

export const updateSecurityStrategy = (id: number, data: any): Promise<PResp<SecurityStrategy>> => {
  return r.put(`/keti1/security-strategy/update/${id}`, data)
}

export const deleteSecurityStrategy = (id: number): Promise<PResp<null>> => {
  return r.delete(`/keti1/security-strategy/delete/${id}`)
}

// 工控协议相关API
export const getICSProtocols = (page = 1, per_page = 10): Promise<PResp<ICSProtocol[]>> => {
  return r.get("/keti1/ics-protocol/list", {
    params: { page, per_page }
  })
}

export const getICSProtocol = (id: number): Promise<PResp<ICSProtocol>> => {
  return r.get(`/keti1/ics-protocol/get/${id}`)
}

export const createICSProtocol = (data: any): Promise<PResp<ICSProtocol>> => {
  return r.post("/keti1/ics-protocol/create", data)
}

export const updateICSProtocol = (id: number, data: any): Promise<PResp<ICSProtocol>> => {
  return r.put(`/keti1/ics-protocol/update/${id}`, data)
}

export const deleteICSProtocol = (id: number): Promise<PResp<null>> => {
  return r.delete(`/keti1/ics-protocol/delete/${id}`)
}

// 工控设备相关API
export const getICSDevices = (page = 1, per_page = 10): Promise<PResp<ICSDevice[]>> => {
  return r.get("/keti1/ics-device/list", {
    params: { page, per_page }
  })
}

export const getICSDevice = (id: number): Promise<PResp<ICSDevice>> => {
  return r.get(`/keti1/ics-device/get/${id}`)
}

export const createICSDevice = (data: any): Promise<PResp<ICSDevice>> => {
  return r.post("/keti1/ics-device/create", data)
}

export const updateICSDevice = (id: number, data: any): Promise<PResp<ICSDevice>> => {
  return r.put(`/keti1/ics-device/update/${id}`, data)
}

export const deleteICSDevice = (id: number): Promise<PResp<null>> => {
  return r.delete(`/keti1/ics-device/delete/${id}`)
}

// 设备场量点相关API
export const getICSDevicePoints = (page = 1, per_page = 10): Promise<PResp<ICSDevicePoint[]>> => {
  return r.get("/keti1/ics-device-point/list", {
    params: { page, per_page }
  })
}

export const getICSDevicePoint = (id: number): Promise<PResp<ICSDevicePoint>> => {
  return r.get(`/keti1/ics-device-point/get/${id}`)
}

export const createICSDevicePoint = (data: any): Promise<PResp<ICSDevicePoint>> => {
  return r.post("/keti1/ics-device-point/create", data)
}

export const updateICSDevicePoint = (id: number, data: any): Promise<PResp<ICSDevicePoint>> => {
  return r.put(`/keti1/ics-device-point/update/${id}`, data)
}

export const deleteICSDevicePoint = (id: number): Promise<PResp<null>> => {
  return r.delete(`/keti1/ics-device-point/delete/${id}`)
}