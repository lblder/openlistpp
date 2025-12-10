import {
  Box,
  Button,
  HStack,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  VStack,
  Badge,
  IconButton,
  Icon,
  Text,
  useColorModeValue,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Input,
  FormLabel,
  FormControl,
  FormErrorMessage,
  Textarea,
  Select,
  SelectContent,
  SelectListbox,
  SelectOption,
  SelectOptionText,
  SelectTrigger,
  SelectValue,
  Progress,
} from "@hope-ui/solid"
import { createSignal, For, Show, onMount } from "solid-js"
import { useManageTitle, useT } from "~/hooks"
import { BiSolidEdit, BiSolidTrash, BiSolidPlusCircle, BiSolidSave, BiSolidFileImport, BiSolidData, BiRegularTime, BiRegularUser, BiRegularDetail } from "solid-icons/bi"
import { handleResp, notify, r } from "~/utils"

// PCAP Analysis API
const pcapApi = {
  listFiles: async () => {
    return r.get("/keti1/pcap/list")
  },
  parseFile: async (filename: string) => {
    return r.post("/keti1/pcap/parse", { filename })
  },
}

// 模拟的后端API调用 (保留用于其他Tab)
const api = {
  getDataParsingConfigs: async () => {
    return new Promise(resolve => setTimeout(() => resolve({ code: 200, message: "Success", data: mockParsingConfigs }), 500))
  },
  getDataTransformationConfigs: async () => {
    return new Promise(resolve => setTimeout(() => resolve({ code: 200, message: "Success", data: mockTransformationConfigs }), 500))
  },
  createConfig: async (type: string, data: any) => {
    return new Promise(resolve => setTimeout(() => resolve({ code: 200, message: "Success" }), 500))
  },
  updateConfig: async (type: string, id: string, data: any) => {
    return new Promise(resolve => setTimeout(() => resolve({ code: 200, message: "Success" }), 500))
  },
  deleteConfig: async (type: string, id: string) => {
    return new Promise(resolve => setTimeout(() => resolve({ code: 200, message: "Success" }), 500))
  },
}

interface ParsingConfig {
  id: string
  name: string
  sourceFormat: string
  targetFormat: string
  parserType: string
  status: "active" | "inactive"
}

interface TransformationConfig {
  id: string
  name: string
  sourceStructure: string
  targetStructure: string
  mappingRule: string
  status: "active" | "inactive"
}

interface StructureConfig {
  id: string
  name: string
  description: string
  fieldCount: number
  createdTime: string
}

interface AuditLog {
  id: string
  timestamp: string
  operator: string
  action: string
  target: string
  result: "success" | "failure"
}

// PCAP Analysis interfaces
interface PcapPacketItem {
  address: string
  value: any
  type: string
  description?: string
  other?: Record<string, any>
}

interface PcapPacket {
  packet_no: string
  timestamp: string
  src_ip: string
  dst_ip: string
  protocol: string
  info: string
  items: PcapPacketItem[]
  other?: Record<string, any>
}

interface PcapParseResult {
  data: PcapPacket[]
  meta: {
    filename: string
    total_scanned: number
    valid_packets: number
  }
}

// 模拟静态数据
const mockParsingConfigs: ParsingConfig[] = [
  { id: "parse-01", name: "XML到JSON解析器", sourceFormat: "XML", targetFormat: "JSON", parserType: "结构化解析", status: "active" },
  { id: "parse-02", name: "CSV到数据库解析器", sourceFormat: "CSV", targetFormat: "Database", parserType: "批量导入", status: "active" },
  { id: "parse-03", name: "日志文件解析器", sourceFormat: "Log", targetFormat: "Structured Data", parserType: "正则表达式", status: "inactive" },
  { id: "parse-04", name: "二进制数据解析器", sourceFormat: "Binary", targetFormat: "Hex", parserType: "字节流解析", status: "active" },
]

const mockTransformationConfigs: TransformationConfig[] = [
  { id: "trans-01", name: "传感器数据标准化", sourceStructure: "Raw Sensor Data", targetStructure: "Standardized Format", mappingRule: "字段映射+单位转换", status: "active" },
  { id: "trans-02", name: "设备数据聚合", sourceStructure: "Device Metrics", targetStructure: "Aggregated Data", mappingRule: "时间窗口聚合", status: "active" },
  { id: "trans-03", name: "异常数据清洗", sourceStructure: "Raw Data", targetStructure: "Clean Data", mappingRule: "异常值识别与剔除", status: "inactive" },
  { id: "trans-04", name: "数据脱敏处理", sourceStructure: "Sensitive Data", targetStructure: "Anonymized Data", mappingRule: "字段加密/替换", status: "active" },
]

const mockStructureConfigs: StructureConfig[] = [
  { id: "struct-01", name: "工控协议标准头", description: "定义Modbus/S7等协议的通用头部结构", fieldCount: 12, createdTime: "2023-01-10 10:00:00" },
  { id: "struct-02", name: "设备状态上报格式", description: "终端设备定时上报的状态数据包", fieldCount: 8, createdTime: "2023-01-12 14:30:00" },
  { id: "struct-03", name: "告警日志结构", description: "安全审计系统的标准告警日志", fieldCount: 25, createdTime: "2023-02-01 09:15:00" },
]

const mockAuditLogs: AuditLog[] = [
  { id: "audit-01", timestamp: "2023-06-01 10:05:22", operator: "admin", action: "新增解析配置", target: "XMLParser", result: "success" },
  { id: "audit-02", timestamp: "2023-06-01 11:30:15", operator: "user1", action: "执行数据转换", target: "SensorData.json", result: "success" },
  { id: "audit-03", timestamp: "2023-06-02 09:12:44", operator: "admin", action: "删除结构定义", target: "LegacyStruct", result: "failure" },
  { id: "audit-04", timestamp: "2023-06-02 15:45:30", operator: "manager", action: "导出审计日志", target: "All Logs", result: "success" },
  { id: "audit-05", timestamp: "2023-06-03 08:20:10", operator: "system", action: "自动备份", target: "Database", result: "success" },
]

const DataIntegration = () => {
  const t = useT()
  useManageTitle("数据集成")

  // 状态定义
  const [activeTab, setActiveTab] = createSignal(0) // 0:结构管理, 1:数据转换, 2:数据解析, 3:数据审计
  const [loading, setLoading] = createSignal(false)

  // 模态框状态
  const [isModalOpen, setIsModalOpen] = createSignal(false)
  const [modalType, setModalType] = createSignal<"parsing" | "transformation" | "structure">("parsing")
  const [editingItem, setEditingItem] = createSignal<any>(null)

  // 表单字段状态
  const [name, setName] = createSignal("")
  const [description, setDescription] = createSignal("") // For Structure
  const [sourceFormat, setSourceFormat] = createSignal("")
  const [targetFormat, setTargetFormat] = createSignal("")
  const [parserType, setParserType] = createSignal("")
  const [sourceStructure, setSourceStructure] = createSignal("")
  const [targetStructure, setTargetStructure] = createSignal("")
  const [mappingRule, setMappingRule] = createSignal("")
  const [status, setStatus] = createSignal<"active" | "inactive">("active")
  const [formErrors, setFormErrors] = createSignal<{ [key: string]: string }>({})

  // PCAP parsing state
  const [pcapFiles, setPcapFiles] = createSignal<string[]>([])
  const [selectedFile, setSelectedFile] = createSignal("")
  const [parseResult, setParseResult] = createSignal<PcapParseResult | null>(null)
  const [parsing, setParsing] = createSignal(false)
  const [expandedPackets, setExpandedPackets] = createSignal<Set<string>>(new Set())

  // 页面逻辑
  const refresh = async () => {
    setLoading(true)
    // 模拟刷新，实际应重新请求API
    setTimeout(() => setLoading(false), 500)
  }

  const openAddModal = (type: "parsing" | "transformation" | "structure") => {
    setModalType(type)
    setEditingItem(null)
    setName("")
    setDescription("")
    setSourceFormat("")
    setTargetFormat("")
    setParserType("")
    setSourceStructure("")
    setTargetStructure("")
    setMappingRule("")
    setStatus("active")
    setFormErrors({})
    setIsModalOpen(true)
  }

  const openEditModal = (type: "parsing" | "transformation" | "structure", item: any) => {
    setModalType(type)
    setEditingItem(item)
    setName(item.name)
    setFormErrors({})

    if (type === "parsing") {
      setSourceFormat(item.sourceFormat)
      setTargetFormat(item.targetFormat)
      setParserType(item.parserType)
      setStatus(item.status)
    } else if (type === "transformation") {
      setSourceStructure(item.sourceStructure)
      setTargetStructure(item.targetStructure)
      setMappingRule(item.mappingRule)
      setStatus(item.status)
    } else if (type === "structure") {
      setDescription(item.description)
    }

    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
  }

  const validateForm = () => {
    const errors: { [key: string]: string } = {}
    if (!name()) errors.name = "名称不能为空"

    if (modalType() === "parsing") {
      if (!sourceFormat()) errors.sourceFormat = "源格式不能为空"
      if (!targetFormat()) errors.targetFormat = "目标格式不能为空"
      if (!parserType()) errors.parserType = "解析类型不能为空"
    } else if (modalType() === "transformation") {
      if (!sourceStructure()) errors.sourceStructure = "源结构不能为空"
      if (!targetStructure()) errors.targetStructure = "目标结构不能为空"
      if (!mappingRule()) errors.mappingRule = "映射规则不能为空"
    } else if (modalType() === "structure") {
      if (!description()) errors.description = "描述不能为空"
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSave = async () => {
    if (!validateForm()) return
    setLoading(true)
    // 模拟保存
    setTimeout(() => {
      notify.success("操作成功")
      closeModal()
      setLoading(false)
    }, 500)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除此项吗？")) return
    setLoading(true)
    setTimeout(() => {
      notify.success("删除成功")
      setLoading(false)
    }, 500)
  }

  // 获取模态框标题
  const getModalTitle = () => {
    const action = editingItem() ? "编辑" : "新增"
    const typeMap = {
      "parsing": "数据解析配置",
      "transformation": "数据转换配置",
      "structure": "数据结构"
    }
    return `${action}${typeMap[modalType()]}`
  }

  // PCAP file functions
  const loadPcapFiles = async () => {
    setLoading(true)
    const resp = await pcapApi.listFiles()
    handleResp(resp, (data: any) => {
      setPcapFiles(data || [])
    })
    setLoading(false)
  }

  const handleParsePcap = async () => {
    if (!selectedFile()) {
      notify.warning("请先选择 PCAP 文件")
      return
    }

    setParsing(true)
    setParseResult(null)
    const resp = await pcapApi.parseFile(selectedFile())
    handleResp(resp, (result: any) => {
      setParseResult(result as PcapParseResult)
      notify.success(`解析完成！共扫描 ${result.meta?.total_scanned || 0} 个数据包，识别 ${result.meta?.valid_packets || 0} 个有效包`)
    }, (msg: string) => {
      notify.error(msg || "解析失败")
    })
    setParsing(false)
  }

  const togglePacketExpansion = (packetNo: string) => {
    const expanded = new Set(expandedPackets())
    if (expanded.has(packetNo)) {
      expanded.delete(packetNo)
    } else {
      expanded.add(packetNo)
    }
    setExpandedPackets(expanded)
  }

  // Load PCAP files on mount
  onMount(() => {
    loadPcapFiles()
  })


  return (
    <VStack w="$full" spacing="$4" h="$full">
      <HStack justifyContent="space-between" w="$full">
        <Text fontSize="$xl" fontWeight="$bold">数据集成</Text>
      </HStack>

      {/* Tabs */}
      <HStack spacing="$2" borderBottom="1px solid $neutral6" pb="$2" justifyContent="space-between" w="$full">
        <HStack spacing="$2">
          <Button variant={activeTab() === 0 ? "solid" : "ghost"} colorScheme={activeTab() === 0 ? "primary" : "neutral"} onClick={() => setActiveTab(0)}>数据结构管理</Button>
          <Button variant={activeTab() === 1 ? "solid" : "ghost"} colorScheme={activeTab() === 1 ? "primary" : "neutral"} onClick={() => setActiveTab(1)}>数据转换</Button>
          <Button variant={activeTab() === 2 ? "solid" : "ghost"} colorScheme={activeTab() === 2 ? "primary" : "neutral"} onClick={() => setActiveTab(2)}>数据解析</Button>
          <Button variant={activeTab() === 3 ? "solid" : "ghost"} colorScheme={activeTab() === 3 ? "primary" : "neutral"} onClick={() => setActiveTab(3)}>数据审计</Button>
        </HStack>

        {/* Actions */}
        <HStack spacing="$2">
          <Show when={activeTab() === 0}>
            <Button leftIcon={<Icon as={BiSolidPlusCircle} />} colorScheme="primary" onClick={() => openAddModal("structure")}>新增结构</Button>
          </Show>
          <Show when={activeTab() === 1}>
            <Button leftIcon={<Icon as={BiSolidPlusCircle} />} colorScheme="primary" onClick={() => openAddModal("transformation")}>新增转换配置</Button>
          </Show>
          <Show when={activeTab() === 2}>
            <Button leftIcon={<Icon as={BiSolidPlusCircle} />} colorScheme="primary" onClick={() => openAddModal("parsing")}>新增解析配置</Button>
          </Show>
          <Button colorScheme="accent" variant="outline" onClick={refresh} loading={loading()}>刷新</Button>
        </HStack>
      </HStack>

      <Box flex="1" overflowY="auto" w="$full">
        {/* Tab 0: 数据结构管理 */}
        <Show when={activeTab() === 0}>
          <Box borderWidth="1px" borderRadius="$lg" overflowX="auto" p="$4">
            <Table dense>
              <Thead>
                <Tr>
                  <Th>ID</Th>
                  <Th>结构名称</Th>
                  <Th>描述</Th>
                  <Th>字段数量</Th>
                  <Th>创建时间</Th>
                  <Th>操作</Th>
                </Tr>
              </Thead>
              <Tbody>
                <For each={mockStructureConfigs}>
                  {(item) => (
                    <Tr>
                      <Td>{item.id}</Td>
                      <Td>{item.name}</Td>
                      <Td>{item.description}</Td>
                      <Td><Badge>{item.fieldCount}</Badge></Td>
                      <Td>{item.createdTime}</Td>
                      <Td>
                        <HStack spacing="$2">
                          <IconButton aria-label="编辑" icon={<BiSolidEdit />} size="sm" onClick={() => openEditModal("structure", item)} />
                          <IconButton aria-label="删除" icon={<BiSolidTrash />} colorScheme="danger" size="sm" onClick={() => handleDelete(item.id)} />
                        </HStack>
                      </Td>
                    </Tr>
                  )}
                </For>
              </Tbody>
            </Table>
          </Box>
        </Show>

        {/* Tab 1: 数据转换 */}
        <Show when={activeTab() === 1}>
          <VStack spacing="$4" alignItems="stretch">
            {/* 转换演示区 */}
            <Box p="$4" borderWidth="1px" borderRadius="$lg" bg="$neutral2">
              <Text fontWeight="bold" mb="$2">快速转换工具</Text>
              <HStack w="$full" alignItems="center" spacing="$4">
                <Text minWidth="80px">选择文件:</Text>
                <Box flex="1">
                  <Select defaultValue="">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectListbox>
                        <SelectOption value="1"><SelectOptionText>data.json</SelectOptionText></SelectOption>
                      </SelectListbox>
                    </SelectContent>
                  </Select>
                </Box>
                <Text>转出</Text>
                <Box flex="1">
                  <Select defaultValue="">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectListbox>
                        <SelectOption value="xml"><SelectOptionText>XML</SelectOptionText></SelectOption>
                      </SelectListbox>
                    </SelectContent>
                  </Select>
                </Box>
                <Button colorScheme="accent">开始转换</Button>
              </HStack>
              <VStack w="$full" spacing="$2" mt="$4">
                <HStack justifyContent="space-between"><Text fontSize="$xs">转换进度</Text><Text fontSize="$xs">60%</Text></HStack>
                <Progress w="$full" value={60} size="sm" />
              </VStack>
            </Box>

            {/* 配置列表 */}
            <Box borderWidth="1px" borderRadius="$lg" overflowX="auto" p="$4">
              <Text fontWeight="bold" mb="$4">转换配置列表</Text>
              <Table dense>
                <Thead>
                  <Tr>
                    <Th>名称</Th>
                    <Th>源结构</Th>
                    <Th>目标结构</Th>
                    <Th>映射规则</Th>
                    <Th>状态</Th>
                    <Th>操作</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  <For each={mockTransformationConfigs}>
                    {(item) => (
                      <Tr>
                        <Td>{item.name}</Td>
                        <Td>{item.sourceStructure}</Td>
                        <Td>{item.targetStructure}</Td>
                        <Td>{item.mappingRule}</Td>
                        <Td><Badge colorScheme={item.status === 'active' ? 'success' : 'neutral'}>{item.status}</Badge></Td>
                        <Td>
                          <HStack spacing="$2">
                            <IconButton aria-label="编辑" icon={<BiSolidEdit />} size="sm" onClick={() => openEditModal("transformation", item)} />
                            <IconButton aria-label="删除" icon={<BiSolidTrash />} colorScheme="danger" size="sm" onClick={() => handleDelete(item.id)} />
                          </HStack>
                        </Td>
                      </Tr>
                    )}
                  </For>
                </Tbody>
              </Table>
            </Box>
          </VStack>
        </Show>

        {/* Tab 2: 数据解析 */}
        <Show when={activeTab() === 2}>
          <VStack spacing="$4" alignItems="stretch">
            {/* PCAP 解析工具 */}
            <Box p="$4" borderWidth="1px" borderRadius="$lg" bg="$neutral2">
              <Text fontWeight="bold" mb="$4">PCAP 文件解析</Text>
              <HStack spacing="$4" alignItems="flex-start">
                <VStack w="35%" spacing="$4">
                  <FormControl>
                    <FormLabel>选择 PCAP 文件</FormLabel>
                    <Select value={selectedFile()} onChange={setSelectedFile}>
                      <SelectTrigger><SelectValue placeholder="请选择文件" /></SelectTrigger>
                      <SelectContent>
                        <SelectListbox>
                          <Show when={pcapFiles().length === 0}>
                            <SelectOption value="" disabled><SelectOptionText>暂无文件</SelectOptionText></SelectOption>
                          </Show>
                          <For each={pcapFiles()}>
                            {(file) => (
                              <SelectOption value={file}>
                                <SelectOptionText>{file}</SelectOptionText>
                              </SelectOption>
                            )}
                          </For>
                        </SelectListbox>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <Button
                    colorScheme="primary"
                    w="$full"
                    onClick={handleParsePcap}
                    loading={parsing()}
                    disabled={!selectedFile()}
                  >
                    开始解析
                  </Button>
                  <Show when={parseResult()}>
                    <VStack w="$full" spacing="$2" p="$3" bg="$success2" borderRadius="$md">
                      <Text fontSize="$sm" fontWeight="bold">解析统计</Text>
                      <HStack justifyContent="space-between" w="$full">
                        <Text fontSize="$xs">文件名:</Text>
                        <Text fontSize="$xs" fontWeight="bold">{parseResult()?.meta?.filename}</Text>
                      </HStack>
                      <HStack justifyContent="space-between" w="$full">
                        <Text fontSize="$xs">总包数:</Text>
                        <Badge colorScheme="info">{parseResult()?.meta?.total_scanned || 0}</Badge>
                      </HStack>
                      <HStack justifyContent="space-between" w="$full">
                        <Text fontSize="$xs">有效包:</Text>
                        <Badge colorScheme="success">{parseResult()?.meta?.valid_packets || 0}</Badge>
                      </HStack>
                    </VStack>
                  </Show>
                </VStack>

                <Box w="65%" borderWidth="1px" borderRadius="$md" p="$4" bg="$background" maxH="500px" overflowY="auto">
                  <Show when={!parseResult()} fallback={
                    <VStack alignItems="stretch" spacing="$2">
                      <Text fontWeight="bold" mb="$2">解析结果 ({parseResult()?.data?.length || 0} 个数据包)</Text>
                      <Table dense size="sm">
                        <Thead>
                          <Tr>
                            <Th>包号</Th>
                            <Th>协议</Th>
                            <Th>源IP</Th>
                            <Th>目标IP</Th>
                            <Th>信息</Th>
                            <Th>详情</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          <For each={parseResult()?.data?.slice(0, 50)}>
                            {(packet) => (
                              <>
                                <Tr>
                                  <Td>{packet.packet_no}</Td>
                                  <Td>
                                    <Badge colorScheme={
                                      packet.protocol.includes('Modbus') ? 'primary' :
                                        packet.protocol.includes('S7') ? 'success' :
                                          packet.protocol.includes('Omron') ? 'warning' :
                                            packet.protocol.includes('CIP') ? 'info' : 'neutral'
                                    }>
                                      {packet.protocol}
                                    </Badge>
                                  </Td>
                                  <Td fontSize="$xs">{packet.src_ip}</Td>
                                  <Td fontSize="$xs">{packet.dst_ip}</Td>
                                  <Td fontSize="$xs">{packet.info}</Td>
                                  <Td>
                                    <IconButton
                                      aria-label="展开详情"
                                      icon={<BiRegularDetail />}
                                      size="xs"
                                      variant="ghost"
                                      onClick={() => togglePacketExpansion(packet.packet_no)}
                                    />
                                  </Td>
                                </Tr>
                                <Show when={expandedPackets().has(packet.packet_no)}>
                                  <Tr>
                                    <Td colSpan={6} bg="$neutral2">
                                      <VStack alignItems="stretch" spacing="$2" p="$2">
                                        <Text fontSize="$xs" fontWeight="bold">数据项 ({packet.items?.length || 0}):</Text>
                                        <Table dense size="xs">
                                          <Thead>
                                            <Tr>
                                              <Th>地址</Th>
                                              <Th>值</Th>
                                              <Th>类型</Th>
                                              <Th>描述</Th>
                                            </Tr>
                                          </Thead>
                                          <Tbody>
                                            <For each={packet.items}>
                                              {(item) => (
                                                <Tr>
                                                  <Td fontSize="$xs">{item.address}</Td>
                                                  <Td fontSize="$xs" fontFamily="monospace">{String(item.value)}</Td>
                                                  <Td fontSize="$xs"><Badge size="xs">{item.type}</Badge></Td>
                                                  <Td fontSize="$xs">{item.description || '-'}</Td>
                                                </Tr>
                                              )}
                                            </For>
                                          </Tbody>
                                        </Table>
                                      </VStack>
                                    </Td>
                                  </Tr>
                                </Show>
                              </>
                            )}
                          </For>
                        </Tbody>
                      </Table>
                      <Show when={(parseResult()?.data?.length || 0) > 50}>
                        <Text fontSize="$xs" color="$neutral10" textAlign="center" mt="$2">
                          仅显示前 50 个数据包
                        </Text>
                      </Show>
                    </VStack>
                  }>
                    <VStack spacing="$2" alignItems="center" justifyContent="center" minH="200px">
                      <Text fontSize="$sm" color="$neutral10">请选择文件并点击"开始解析"</Text>
                      <Text fontSize="$xs" color="$neutral9">支持 Modbus, S7Comm, Omron FINS, CIP 协议</Text>
                    </VStack>
                  </Show>
                </Box>
              </HStack>
            </Box>

            {/* 配置列表 */}
            <Box borderWidth="1px" borderRadius="$lg" overflowX="auto" p="$4">
              <Text fontWeight="bold" mb="$4">解析配置列表</Text>
              <Table dense>
                <Thead>
                  <Tr>
                    <Th>名称</Th>
                    <Th>源格式</Th>
                    <Th>目标格式</Th>
                    <Th>解析类型</Th>
                    <Th>状态</Th>
                    <Th>操作</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  <For each={mockParsingConfigs}>
                    {(item) => (
                      <Tr>
                        <Td>{item.name}</Td>
                        <Td>{item.sourceFormat}</Td>
                        <Td>{item.targetFormat}</Td>
                        <Td>{item.parserType}</Td>
                        <Td><Badge colorScheme={item.status === 'active' ? 'success' : 'neutral'}>{item.status}</Badge></Td>
                        <Td>
                          <HStack spacing="$2">
                            <IconButton aria-label="编辑" icon={<BiSolidEdit />} size="sm" onClick={() => openEditModal("parsing", item)} />
                            <IconButton aria-label="删除" icon={<BiSolidTrash />} colorScheme="danger" size="sm" onClick={() => handleDelete(item.id)} />
                          </HStack>
                        </Td>
                      </Tr>
                    )}
                  </For>
                </Tbody>
              </Table>
            </Box>
          </VStack>
        </Show>

        {/* Tab 3: 数据审计 */}
        <Show when={activeTab() === 3}>
          <Box borderWidth="1px" borderRadius="$lg" overflowX="auto" p="$4">
            <Table dense>
              <Thead>
                <Tr>
                  <Th>时间</Th>
                  <Th>操作人</Th>
                  <Th>动作</Th>
                  <Th>对象</Th>
                  <Th>结果</Th>
                  <Th>详情</Th>
                </Tr>
              </Thead>
              <Tbody>
                <For each={mockAuditLogs}>
                  {(log) => (
                    <Tr>
                      <Td><HStack spacing="$1"><Icon as={BiRegularTime} color="$neutral10" /><Text>{log.timestamp}</Text></HStack></Td>
                      <Td><HStack spacing="$1"><Icon as={BiRegularUser} color="$neutral10" /><Text>{log.operator}</Text></HStack></Td>
                      <Td>{log.action}</Td>
                      <Td>{log.target}</Td>
                      <Td><Badge colorScheme={log.result === 'success' ? 'success' : 'danger'}>{log.result}</Badge></Td>
                      <Td>
                        <IconButton aria-label="查看详情" icon={<BiRegularDetail />} size="sm" variant="ghost" />
                      </Td>
                    </Tr>
                  )}
                </For>
              </Tbody>
            </Table>
          </Box>
        </Show>
      </Box>

      {/* 统一添加/编辑模态框 */}
      <Modal opened={isModalOpen()} onClose={closeModal} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalCloseButton />
          <ModalHeader>
            {getModalTitle()}
          </ModalHeader>
          <ModalBody>
            <VStack spacing="$4">
              <FormControl invalid={!!formErrors().name}>
                <FormLabel>名称</FormLabel>
                <Input
                  value={name()}
                  onInput={(e) => setName(e.currentTarget.value)}
                  placeholder="请输入名称"
                />
                <FormErrorMessage>{formErrors().name}</FormErrorMessage>
              </FormControl>

              {/* Data Structure Form */}
              <Show when={modalType() === "structure"}>
                <FormControl invalid={!!formErrors().description}>
                  <FormLabel>描述</FormLabel>
                  <Textarea
                    value={description()}
                    onInput={(e) => setDescription(e.currentTarget.value)}
                    placeholder="请输入结构描述"
                  />
                  <FormErrorMessage>{formErrors().description}</FormErrorMessage>
                </FormControl>
              </Show>

              {/* Parsing Form */}
              <Show when={modalType() === "parsing"}>
                <FormControl invalid={!!formErrors().sourceFormat}>
                  <FormLabel>源格式</FormLabel>
                  <Input
                    value={sourceFormat()}
                    onInput={(e) => setSourceFormat(e.currentTarget.value)}
                    placeholder="请输入源数据格式"
                  />
                  <FormErrorMessage>{formErrors().sourceFormat}</FormErrorMessage>
                </FormControl>

                <FormControl invalid={!!formErrors().targetFormat}>
                  <FormLabel>目标格式</FormLabel>
                  <Input
                    value={targetFormat()}
                    onInput={(e) => setTargetFormat(e.currentTarget.value)}
                    placeholder="请输入目标数据格式"
                  />
                  <FormErrorMessage>{formErrors().targetFormat}</FormErrorMessage>
                </FormControl>

                <FormControl invalid={!!formErrors().parserType}>
                  <FormLabel>解析类型</FormLabel>
                  <Select value={parserType()} onChange={setParserType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectListbox>
                        <SelectOption value="结构化解析"><SelectOptionText>结构化解析</SelectOptionText></SelectOption>
                        <SelectOption value="批量导入"><SelectOptionText>批量导入</SelectOptionText></SelectOption>
                        <SelectOption value="正则表达式"><SelectOptionText>正则表达式</SelectOptionText></SelectOption>
                        <SelectOption value="字节流解析"><SelectOptionText>字节流解析</SelectOptionText></SelectOption>
                      </SelectListbox>
                    </SelectContent>
                  </Select>
                  <FormErrorMessage>{formErrors().parserType}</FormErrorMessage>
                </FormControl>
              </Show>

              {/* Transformation Form */}
              <Show when={modalType() === "transformation"}>
                <FormControl invalid={!!formErrors().sourceStructure}>
                  <FormLabel>源结构</FormLabel>
                  <Input
                    value={sourceStructure()}
                    onInput={(e) => setSourceStructure(e.currentTarget.value)}
                  />
                  <FormErrorMessage>{formErrors().sourceStructure}</FormErrorMessage>
                </FormControl>

                <FormControl invalid={!!formErrors().targetStructure}>
                  <FormLabel>目标结构</FormLabel>
                  <Input
                    value={targetStructure()}
                    onInput={(e) => setTargetStructure(e.currentTarget.value)}
                  />
                  <FormErrorMessage>{formErrors().targetStructure}</FormErrorMessage>
                </FormControl>

                <FormControl invalid={!!formErrors().mappingRule}>
                  <FormLabel>映射规则</FormLabel>
                  <Textarea
                    value={mappingRule()}
                    onInput={(e) => setMappingRule(e.currentTarget.value)}
                  />
                  <FormErrorMessage>{formErrors().mappingRule}</FormErrorMessage>
                </FormControl>
              </Show>

              <Show when={modalType() !== "structure"}>
                <HStack w="$full" spacing="$4">
                  <Box flex="1">
                    <FormLabel mb="$2">状态</FormLabel>
                    <HStack spacing="$2">
                      <Button
                        size="sm"
                        colorScheme={status() === "active" ? "success" : "neutral"}
                        onClick={() => setStatus("active")}
                      >
                        启用
                      </Button>
                      <Button
                        size="sm"
                        colorScheme={status() === "inactive" ? "neutral" : "neutral"}
                        variant={status() === "inactive" ? "solid" : "outline"}
                        onClick={() => setStatus("inactive")}
                      >
                        禁用
                      </Button>
                    </HStack>
                  </Box>
                </HStack>
              </Show>

            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack spacing="$2">
              <Button onClick={closeModal} variant="subtle">
                取消
              </Button>
              <Button
                onClick={handleSave}
                loading={loading()}
                leftIcon={<Icon as={BiSolidSave} />}
              >
                保存
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  )
}

export default DataIntegration