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

// 安全配置模式相关接口 (SecConfigMode)
export interface SecConfigMode {
  id?: number
  mode_name: string
  description: string
  created_at?: string
}

// 安全防护规则相关接口 (SecFirewallRule)
export interface SecFirewallRule {
  id?: number
  rule_name: string
  direction: string // INPUT/OUTPUT
  protocol: string  // tcp/udp/icmp/all
  src_ip: string    // 0.0.0.0/0
  dst_port: string
  action: string    // ACCEPT/DROP/REJECT
  is_active: number // 1/0
}

// 策略编排关联相关接口
export interface SecModeRuleRelation {
  id?: number
  mode_id: number
  rule_id: number
  sort_order: number
  mode?: SecConfigMode
  rule?: SecFirewallRule
}

// 安全配置模式 API
export const getSecConfigModes = (page = 1, per_page = 10): Promise<PResp<SecConfigMode[]>> => {
  return r.get("/keti1/sec-config-mode/list", { params: { page, per_page } })
}

export const getSecConfigMode = (id: number): Promise<PResp<SecConfigMode>> => {
  return r.get(`/keti1/sec-config-mode/get/${id}`)
}

export const createSecConfigMode = (data: any): Promise<PResp<SecConfigMode>> => {
  return r.post("/keti1/sec-config-mode/create", data)
}

export const updateSecConfigMode = (id: number, data: any): Promise<PResp<SecConfigMode>> => {
  return r.put(`/keti1/sec-config-mode/update/${id}`, data)
}

export const deleteSecConfigMode = (id: number): Promise<PResp<null>> => {
  return r.delete(`/keti1/sec-config-mode/delete/${id}`)
}

// 安全防护规则 API
export const getSecFirewallRules = (page = 1, per_page = 10): Promise<PResp<SecFirewallRule[]>> => {
  return r.get("/keti1/sec-firewall-rule/list", { params: { page, per_page } })
}

export const getSecFirewallRule = (id: number): Promise<PResp<SecFirewallRule>> => {
  return r.get(`/keti1/sec-firewall-rule/get/${id}`)
}

export const createSecFirewallRule = (data: any): Promise<PResp<SecFirewallRule>> => {
  return r.post("/keti1/sec-firewall-rule/create", data)
}

export const updateSecFirewallRule = (id: number, data: any): Promise<PResp<SecFirewallRule>> => {
  return r.put(`/keti1/sec-firewall-rule/update/${id}`, data)
}

export const deleteSecFirewallRule = (id: number): Promise<PResp<null>> => {
  return r.delete(`/keti1/sec-firewall-rule/delete/${id}`)
}

export const deleteSecFirewallRules = (ids: number[]): Promise<PResp<null>> => {
  return r.post(`/keti1/sec-firewall-rule/batch_delete`, { ids })
}

export const importSecFirewallRules = (file: File): Promise<PResp<any>> => {
  const formData = new FormData()
  formData.append("file", file)
  return r.post("/keti1/sec-firewall-rule/import", formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  })
}

export const downloadSecFirewallRuleTemplate = (format: 'csv' | 'json') => {
  const url = `/api/keti1/sec-firewall-rule/template?format=${format}`
  window.open(url, '_blank')
}

// 策略编排 API
export const getModeRules = (mode_id: number): Promise<PResp<SecFirewallRule[]>> => {
  return r.get(`/keti1/sec-orchestration/list-rules/${mode_id}`)
}

export const assignRuleToMode = (mode_id: number, rule_id: number): Promise<PResp<any>> => {
  return r.post("/keti1/sec-orchestration/assign", { mode_id, rule_id })
}

export const removeRuleFromMode = (mode_id: number, rule_id: number): Promise<PResp<any>> => {
  return r.post("/keti1/sec-orchestration/remove", { mode_id, rule_id })
}

export const reorderModeRules = (mode_id: number, rule_ids: number[]): Promise<PResp<any>> => {
  return r.post("/keti1/sec-orchestration/reorder", { mode_id, rule_ids })
}

export const downloadSecConfigModeScript = (mode_id: number) => {
  const url = `/api/keti1/sec-orchestration/export-script/${mode_id}`
  window.open(url, '_blank')
}

export const generateIptablesCommand = (rule: SecFirewallRule): string => {
  let cmd = `iptables -A ${rule.direction}`
  if (rule.protocol) cmd += ` -p ${rule.protocol}`
  if (rule.src_ip && rule.src_ip !== '0.0.0.0/0') cmd += ` -s ${rule.src_ip}`
  if (rule.dst_port) cmd += ` --dport ${rule.dst_port}`
  if (rule.action) cmd += ` -j ${rule.action}`
  return cmd
}