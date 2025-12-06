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
import { createSignal, For, Show } from "solid-js"
import { useManageTitle, useT } from "~/hooks"
import { BiSolidEdit, BiSolidTrash, BiSolidPlusCircle, BiSolidSave, BiSolidFileImport, BiSolidData } from "solid-icons/bi"
import { handleResp, notify } from "~/utils"

// 模拟的后端API调用
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

const DataIntegration = () => {
  const t = useT()
  useManageTitle("数据集成")

  // 状态定义
  const [loading, setLoading] = createSignal(false)
  
  // 模态框状态
  const [isModalOpen, setIsModalOpen] = createSignal(false)
  const [modalType, setModalType] = createSignal<"parsing" | "transformation">("parsing")
  const [editingItem, setEditingItem] = createSignal<ParsingConfig | TransformationConfig | null>(null)
  
  // 表单字段状态
  const [name, setName] = createSignal("")
  const [sourceFormat, setSourceFormat] = createSignal("")
  const [targetFormat, setTargetFormat] = createSignal("")
  const [parserType, setParserType] = createSignal("")
  const [sourceStructure, setSourceStructure] = createSignal("")
  const [targetStructure, setTargetStructure] = createSignal("")
  const [mappingRule, setMappingRule] = createSignal("")
  const [status, setStatus] = createSignal<"active" | "inactive">("active")
  const [formErrors, setFormErrors] = createSignal<{ [key: string]: string }>({})

  // 页面逻辑
  const refresh = async () => {
    setLoading(true)
    const parseResp: any = await api.getDataParsingConfigs()
    const transResp: any = await api.getDataTransformationConfigs()
    // handleResp(parseResp, (data) => setParsingConfigs(data))
    // handleResp(transResp, (data) => setTransformationConfigs(data))
    setLoading(false)
  }

  const openAddModal = (type: "parsing" | "transformation") => {
    setModalType(type)
    setEditingItem(null)
    setName("")
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

  const openEditModal = (type: "parsing" | "transformation", item: ParsingConfig | TransformationConfig) => {
    setModalType(type)
    setEditingItem(item)
    setName(item.name)
    setStatus(item.status)
    setFormErrors({})
    
    if (type === "parsing") {
      const parseItem = item as ParsingConfig;
      setSourceFormat(parseItem.sourceFormat)
      setTargetFormat(parseItem.targetFormat)
      setParserType(parseItem.parserType)
    } else {
      const transItem = item as TransformationConfig;
      setSourceStructure(transItem.sourceStructure)
      setTargetStructure(transItem.targetStructure)
      setMappingRule(transItem.mappingRule)
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
    } else {
      if (!sourceStructure()) errors.sourceStructure = "源结构不能为空"
      if (!targetStructure()) errors.targetStructure = "目标结构不能为空"
      if (!mappingRule()) errors.mappingRule = "映射规则不能为空"
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSave = async () => {
    if (!validateForm()) return

    let data: any;
    if (modalType() === "parsing") {
      data = {
        name: name(),
        sourceFormat: sourceFormat(),
        targetFormat: targetFormat(),
        parserType: parserType(),
        status: status(),
      }
    } else {
      data = {
        name: name(),
        sourceStructure: sourceStructure(),
        targetStructure: targetStructure(),
        mappingRule: mappingRule(),
        status: status(),
      }
    }

    setLoading(true)
    const resp = editingItem()
      ? await api.updateConfig(modalType(), editingItem()!.id, data)
      : await api.createConfig(modalType(), data)

    handleResp(resp, () => {
      notify.success("操作成功")
      closeModal()
      refresh()
    })
    setLoading(false)
  }

  const handleDelete = async (type: "parsing" | "transformation", id: string) => {
    if (!confirm("确定要删除此项吗？")) return
    setLoading(true)
    const resp = await api.deleteConfig(type, id)
    handleResp(resp, () => {
      notify.success("删除成功")
      refresh()
    })
    setLoading(false)
  }

  // 获取模态框标题
  const getModalTitle = () => {
    if (editingItem()) {
      return modalType() === "parsing" ? "编辑数据解析配置" : "编辑数据转换配置"
    }
    return modalType() === "parsing" ? "新增数据解析配置" : "新增数据转换配置"
  }

  return (
    <VStack w="$full" spacing="$5">
      <HStack w="$full" justifyContent="space-between" flexWrap="wrap" gap="$2">
        <Text fontSize="$2xl" fontWeight="bold">数据集成</Text>
        <Button colorScheme="accent" onClick={refresh} loading={loading()}>
          刷新
        </Button>
      </HStack>

      {/* 数据解析部分 */}
      <Box 
        w="$full" 
        borderWidth="1px" 
        borderRadius="$lg" 
        p="$4" 
        background={useColorModeValue("$neutral2", "$neutral3")()}
      >
        <HStack w="$full" justifyContent="space-between" mb="$4">
          <HStack spacing="$2">
            <Icon as={BiSolidFileImport} color="$primary9" />
            <Text fontWeight="$semibold" fontSize="$lg">数据解析</Text>
          </HStack>
        </HStack>
        
        <HStack spacing="$6" alignItems="flex-start">
          {/* 左侧文件选择区域 */}
          <VStack w="30%" spacing="$4">
            <FormControl>
              <FormLabel>选择文件</FormLabel>
              <Select defaultValue="">
                <SelectTrigger>
                  <SelectValue placeholder="请选择要解析的文件" />
                </SelectTrigger>
                <SelectContent>
                  <SelectListbox>
                    <SelectOption value="file1.json">
                      <SelectOptionText>file1.json</SelectOptionText>
                    </SelectOption>
                    <SelectOption value="file2.xml">
                      <SelectOptionText>file2.xml</SelectOptionText>
                    </SelectOption>
                    <SelectOption value="file3.csv">
                      <SelectOptionText>file3.csv</SelectOptionText>
                    </SelectOption>
                    <SelectOption value="file4.txt">
                      <SelectOptionText>file4.txt</SelectOptionText>
                    </SelectOption>
                  </SelectListbox>
                </SelectContent>
              </Select>
            </FormControl>
            
            <HStack spacing="$3">
              <Button colorScheme="primary">确定</Button>
              <Button variant="outline">重置</Button>
            </HStack>
          </VStack>
          
          {/* 右侧解析结果显示区域 */}
          <Box w="70%" borderWidth="1px" borderRadius="$md" p="$4">
            <Text fontWeight="$semibold" mb="$3">解析结果</Text>
            <Box overflowX="auto">
              <Table dense>
                <Thead>
                  <Tr>
                    <Th>字段名</Th>
                    <Th>类型</Th>
                    <Th>示例值</Th>
                    <Th>描述</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  <Tr>
                    <Td>id</Td>
                    <Td>String</Td>
                    <Td>"12345"</Td>
                    <Td>唯一标识符</Td>
                  </Tr>
                  <Tr>
                    <Td>name</Td>
                    <Td>String</Td>
                    <Td>"张三"</Td>
                    <Td>用户姓名</Td>
                  </Tr>
                  <Tr>
                    <Td>age</Td>
                    <Td>Number</Td>
                    <Td>25</Td>
                    <Td>年龄</Td>
                  </Tr>
                  <Tr>
                    <Td>email</Td>
                    <Td>String</Td>
                    <Td>"zhangsan@example.com"</Td>
                    <Td>电子邮箱</Td>
                  </Tr>
                </Tbody>
              </Table>
            </Box>
          </Box>
        </HStack>
        
        <Text fontSize="$sm" color="$neutral11" mt="$2">
          数据解析功能支持多种数据格式的解析，包括结构化、半结构化和非结构化数据，可将原始数据转换为目标格式以便后续处理。
        </Text>
      </Box>

      {/* 数据转换部分 */}
      <Box 
        w="$full" 
        borderWidth="1px" 
        borderRadius="$lg" 
        p="$4" 
        background={useColorModeValue("$neutral2", "$neutral3")()}
      >
        <HStack w="$full" justifyContent="space-between" mb="$4">
          <HStack spacing="$2">
            <Icon as={BiSolidData} color="$accent9" />
            <Text fontWeight="$semibold" fontSize="$lg">数据转换</Text>
          </HStack>
        </HStack>
        
        <VStack w="$full" spacing="$4">
          {/* 转换选择行 */}
          <HStack w="$full" alignItems="center" spacing="$4">
            <Text minWidth="80px">选择文件:</Text>
            <Box flex="1">
              <Select defaultValue="">
                <SelectTrigger>
                  <SelectValue placeholder="请选择要转换的文件" />
                </SelectTrigger>
                <SelectContent>
                  <SelectListbox>
                    <SelectOption value="data1.json">
                      <SelectOptionText>data1.json</SelectOptionText>
                    </SelectOption>
                    <SelectOption value="data2.xml">
                      <SelectOptionText>data2.xml</SelectOptionText>
                    </SelectOption>
                    <SelectOption value="data3.csv">
                      <SelectOptionText>data3.csv</SelectOptionText>
                    </SelectOption>
                  </SelectListbox>
                </SelectContent>
              </Select>
            </Box>
            
            <Text>转出</Text>
            
            <Box flex="1">
              <Select defaultValue="">
                <SelectTrigger>
                  <SelectValue placeholder="请选择转换格式" />
                </SelectTrigger>
                <SelectContent>
                  <SelectListbox>
                    <SelectOption value="json">
                      <SelectOptionText>JSON</SelectOptionText>
                    </SelectOption>
                    <SelectOption value="xml">
                      <SelectOptionText>XML</SelectOptionText>
                    </SelectOption>
                    <SelectOption value="csv">
                      <SelectOptionText>CSV</SelectOptionText>
                    </SelectOption>
                    <SelectOption value="yaml">
                      <SelectOptionText>YAML</SelectOptionText>
                    </SelectOption>
                  </SelectListbox>
                </SelectContent>
              </Select>
            </Box>
            
            <Button colorScheme="accent">开始转换</Button>
          </HStack>
          
          {/* 进度条 */}
          <VStack w="$full" spacing="$2">
            <Text alignSelf="flex-start">转换进度</Text>
            <Progress w="$full" value={60} colorScheme="accent" />
            <Text alignSelf="flex-end" fontSize="$sm" color="$neutral11">60%</Text>
          </VStack>
          
          {/* 转换结果 */}
          <Box w="$full" borderWidth="1px" borderRadius="$md" p="$4">
            <Text fontWeight="$semibold" mb="$3">转换结果</Text>
            <Box overflowX="auto">
              <Alert status="success">
                <AlertIcon />
                <Box flex="1">
                  <AlertTitle>转换完成!</AlertTitle>
                  <AlertDescription display="block">
                    文件 data1.json 已成功转换为 XML 格式
                  </AlertDescription>
                </Box>
              </Alert>
            </Box>
          </Box>
        </VStack>
        
        <Text fontSize="$sm" color="$neutral11" mt="$2">
          数据转换功能支持数据结构的转换和映射，包括字段映射、数据清洗、格式标准化等操作，确保数据在不同系统间的兼容性。
        </Text>
      </Box>

      {/* 添加/编辑模态框 */}
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
                      <SelectValue placeholder="请选择解析类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectListbox>
                        <SelectOption value="结构化解析">
                          <SelectOptionText>结构化解析</SelectOptionText>
                        </SelectOption>
                        <SelectOption value="批量导入">
                          <SelectOptionText>批量导入</SelectOptionText>
                        </SelectOption>
                        <SelectOption value="正则表达式">
                          <SelectOptionText>正则表达式</SelectOptionText>
                        </SelectOption>
                        <SelectOption value="字节流解析">
                          <SelectOptionText>字节流解析</SelectOptionText>
                        </SelectOption>
                      </SelectListbox>
                    </SelectContent>
                  </Select>
                  <FormErrorMessage>{formErrors().parserType}</FormErrorMessage>
                </FormControl>
              </Show>

              <Show when={modalType() === "transformation"}>
                <FormControl invalid={!!formErrors().sourceStructure}>
                  <FormLabel>源结构</FormLabel>
                  <Input
                    value={sourceStructure()}
                    onInput={(e) => setSourceStructure(e.currentTarget.value)}
                    placeholder="请输入源数据结构"
                  />
                  <FormErrorMessage>{formErrors().sourceStructure}</FormErrorMessage>
                </FormControl>

                <FormControl invalid={!!formErrors().targetStructure}>
                  <FormLabel>目标结构</FormLabel>
                  <Input
                    value={targetStructure()}
                    onInput={(e) => setTargetStructure(e.currentTarget.value)}
                    placeholder="请输入目标数据结构"
                  />
                  <FormErrorMessage>{formErrors().targetStructure}</FormErrorMessage>
                </FormControl>

                <FormControl invalid={!!formErrors().mappingRule}>
                  <FormLabel>映射规则</FormLabel>
                  <Textarea
                    value={mappingRule()}
                    onInput={(e) => setMappingRule(e.currentTarget.value)}
                    placeholder="请输入映射规则"
                    rows={3}
                  />
                  <FormErrorMessage>{formErrors().mappingRule}</FormErrorMessage>
                </FormControl>
              </Show>

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