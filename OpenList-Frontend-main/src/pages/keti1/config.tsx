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
} from "@hope-ui/solid"
import { createSignal, For, Show } from "solid-js"
import { useManageTitle, useT } from "~/hooks"
import { BiSolidEdit, BiSolidTrash, BiSolidPlusCircle, BiSolidSave, BiSolidCog, BiSolidChart, BiSolidFileImport, BiSolidNetworkChart } from "solid-icons/bi"
import { handleResp, notify } from "~/utils"

// 模拟的后端API调用
const api = {
  getDataConfigs: async () => {
    return new Promise(resolve => setTimeout(() => resolve({ code: 200, message: "Success", data: { content: [...mockDataStructures, ...mockMetadataModes, ...mockIndicators] } }), 500))
  },
  createDataConfig: async (data: any) => {
    return new Promise(resolve => setTimeout(() => resolve({ code: 200, message: "Success" }), 500))
  },
  updateDataConfig: async (id: string, data: any) => {
    return new Promise(resolve => setTimeout(() => resolve({ code: 200, message: "Success" }), 500))
  },
  deleteDataConfig: async (id: string) => {
    return new Promise(resolve => setTimeout(() => resolve({ code: 200, message: "Success" }), 500))
  },
}

interface DataStructure {
  id: string
  name: string
  format: string
  suffix: string
  status: "active" | "inactive"
}

interface MetadataMode {
  id: string
  name: string
  mode: string
  status: "active" | "inactive"
}

interface Indicator {
  id: string
  name: string
  type: string
  status: "active" | "inactive"
}

// 模拟静态数据
const mockDataStructures: DataStructure[] = [
  { id: "ds-01", name: "关系型数据库", format: "SQL", suffix: ".sql", status: "active" },
  { id: "ds-02", name: "文档数据库", format: "JSON/BSON", suffix: ".json/.bson", status: "active" },
  { id: "ds-03", name: "键值存储", format: "Key-Value", suffix: ".kv", status: "inactive" },
  { id: "ds-04", name: "图数据库", format: "Graph", suffix: ".graph", status: "active" },
  { id: "ds-05", name: "列式存储", format: "Columnar", suffix: ".col", status: "active" },
]

const mockMetadataModes: MetadataMode[] = [
  { id: "mm-01", name: "Schema模式", mode: "Schema-based", status: "active" },
  { id: "mm-02", name: "标签模式", mode: "Tag-based", status: "active" },
  { id: "mm-03", name: "混合模式", mode: "Hybrid", status: "inactive" },
]

const mockIndicators: Indicator[] = [
  { id: "ind-01", name: "性能指标", type: "Performance", status: "active" },
  { id: "ind-02", name: "业务指标", type: "Business", status: "active" },
  { id: "ind-03", name: "安全指标", type: "Security", status: "active" },
  { id: "ind-04", name: "自定义指标", type: "Custom", status: "active" },
]

const DataConfig = () => {
  const t = useT()
  useManageTitle("数据配置")

  // 状态定义
  const [loading, setLoading] = createSignal(false)
  
  // 模态框状态
  const [isModalOpen, setIsModalOpen] = createSignal(false)
  const [modalType, setModalType] = createSignal<"data_structure" | "metadata" | "indicator">("data_structure")
  const [editingItem, setEditingItem] = createSignal<DataStructure | MetadataMode | Indicator | null>(null)
  const [name, setName] = createSignal("")
  const [detail, setDetail] = createSignal("") // 格式/模式/类型
  const [suffix, setSuffix] = createSignal("") // 仅用于数据结构
  const [status, setStatus] = createSignal<"active" | "inactive">("active")
  const [formErrors, setFormErrors] = createSignal<{ [key: string]: string }>({})

  // 页面逻辑
  const refresh = async () => {
    setLoading(true)
    const resp: any = await api.getDataConfigs()
    // handleResp(resp, (data) => setDataConfigs(data.content))
    setLoading(false)
  }

  const openAddModal = (type: "data_structure" | "metadata" | "indicator") => {
    setModalType(type)
    setEditingItem(null)
    setName("")
    setDetail("")
    setSuffix("")
    setStatus("active")
    setFormErrors({})
    setIsModalOpen(true)
  }

  const openEditModal = (type: "data_structure" | "metadata" | "indicator", item: DataStructure | MetadataMode | Indicator) => {
    setModalType(type)
    setEditingItem(item)
    setName(item.name)
    setStatus(item.status)
    setFormErrors({})
    
    if (type === "data_structure") {
      const dsItem = item as DataStructure;
      setDetail(dsItem.format)
      setSuffix(dsItem.suffix)
    } else if (type === "metadata") {
      const mmItem = item as MetadataMode;
      setDetail(mmItem.mode)
    } else {
      const indItem = item as Indicator;
      setDetail(indItem.type)
    }
    
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
  }

  const validateForm = () => {
    const errors: { [key: string]: string } = {}
    if (!name()) errors.name = "名称不能为空"
    if (!detail()) errors.detail = modalType() === "data_structure" ? "格式不能为空" : 
                                 modalType() === "metadata" ? "模式不能为空" : "类型不能为空"
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSave = async () => {
    if (!validateForm()) return

    let data: any;
    if (modalType() === "data_structure") {
      data = {
        name: name(),
        format: detail(),
        suffix: suffix(),
        status: status(),
      }
    } else if (modalType() === "metadata") {
      data = {
        name: name(),
        mode: detail(),
        status: status(),
      }
    } else {
      data = {
        name: name(),
        type: detail(),
        status: status(),
      }
    }

    setLoading(true)
    const resp = editingItem()
      ? await api.updateDataConfig(editingItem()!.id, data)
      : await api.createDataConfig(data)

    handleResp(resp, () => {
      notify.success("操作成功")
      closeModal()
      refresh()
    })
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除此项吗？")) return
    setLoading(true)
    const resp = await api.deleteDataConfig(id)
    handleResp(resp, () => {
      notify.success("删除成功")
      refresh()
    })
    setLoading(false)
  }

  // 获取模态框标题
  const getModalTitle = () => {
    if (editingItem()) {
      return modalType() === "data_structure" ? "编辑数据结构" : 
             modalType() === "metadata" ? "编辑元数据模式" : "编辑指标类型"
    }
    return modalType() === "data_structure" ? "新增数据结构" : 
           modalType() === "metadata" ? "新增元数据模式" : "新增指标类型"
  }

  // 获取详情字段标签
  const getDetailLabel = () => {
    return modalType() === "data_structure" ? "格式" : 
           modalType() === "metadata" ? "模式" : "类型"
  }

  return (
    <VStack w="$full" spacing="$5">
      <HStack w="$full" justifyContent="space-between" flexWrap="wrap" gap="$2">
        <Text fontSize="$2xl" fontWeight="bold">数据配置</Text>
        <Button colorScheme="accent" onClick={refresh} loading={loading()}>
          刷新
        </Button>
      </HStack>

      {/* 数据集成部分 */}
      <Box w="$full" borderWidth="1px" borderRadius="$lg" p="$4" background={useColorModeValue("$neutral2", "$neutral3")()}>
        <HStack w="$full" justifyContent="space-between" mb="$4">
          <HStack spacing="$2">
            <Icon as={BiSolidNetworkChart} color="$primary9" />
            <Text fontWeight="$semibold" fontSize="$lg">数据集成</Text>
          </HStack>
          <Button 
            leftIcon={<Icon as={BiSolidPlusCircle} />} 
            onClick={() => openAddModal("data_structure")}
            colorScheme="primary"
          >
            新增
          </Button>
        </HStack>
        
        <Box overflowX="auto">
          <Table dense>
            <Thead>
              <Tr>
                <Th>数据结构</Th>
                <Th>格式</Th>
                <Th>后缀</Th>
                <Th>状态</Th>
                <Th>操作</Th>
              </Tr>
            </Thead>
            <Tbody>
              <For each={mockDataStructures}>
                {(item) => (
                  <Tr>
                    <Td>
                      <Text fontWeight="$medium">{item.name}</Text>
                    </Td>
                    <Td>{item.format}</Td>
                    <Td>{item.suffix}</Td>
                    <Td>
                      <Badge colorScheme={item.status === "active" ? "success" : "neutral"}>
                        {item.status === "active" ? "启用" : "禁用"}
                      </Badge>
                    </Td>
                    <Td>
                      <HStack spacing="$2">
                        <IconButton 
                          aria-label="编辑" 
                          icon={<BiSolidEdit />} 
                          colorScheme="accent" 
                          size="sm" 
                          onClick={() => openEditModal("data_structure", item)} 
                        />
                        <IconButton 
                          aria-label="删除" 
                          icon={<BiSolidTrash />} 
                          colorScheme="danger" 
                          size="sm" 
                          onClick={() => handleDelete(item.id)} 
                        />
                      </HStack>
                    </Td>
                  </Tr>
                )}
              </For>
            </Tbody>
          </Table>
        </Box>
        
        <Text fontSize="$sm" color="$neutral11" mt="$2">
          支持工控系统的不少于5种数据结构的数据集成，包括关系型、文档型、键值对、图数据库等多种数据源。
        </Text>
      </Box>

      {/* 元数据配置部分 */}
      <Box w="$full" borderWidth="1px" borderRadius="$lg" p="$4" background={useColorModeValue("$neutral2", "$neutral3")()}>
        <HStack w="$full" justifyContent="space-between" mb="$4">
          <HStack spacing="$2">
            <Icon as={BiSolidCog} color="$accent9" />
            <Text fontWeight="$semibold" fontSize="$lg">元数据配置</Text>
          </HStack>
          <Button 
            leftIcon={<Icon as={BiSolidPlusCircle} />} 
            onClick={() => openAddModal("metadata")}
            colorScheme="accent"
          >
            新增
          </Button>
        </HStack>
        
        <Box overflowX="auto">
          <Table dense>
            <Thead>
              <Tr>
                <Th>配置名称</Th>
                <Th>模式</Th>
                <Th>状态</Th>
                <Th>操作</Th>
              </Tr>
            </Thead>
            <Tbody>
              <For each={mockMetadataModes}>
                {(item) => (
                  <Tr>
                    <Td>
                      <Text fontWeight="$medium">{item.name}</Text>
                    </Td>
                    <Td>{item.mode}</Td>
                    <Td>
                      <Badge colorScheme={item.status === "active" ? "success" : "neutral"}>
                        {item.status === "active" ? "启用" : "禁用"}
                      </Badge>
                    </Td>
                    <Td>
                      <HStack spacing="$2">
                        <IconButton 
                          aria-label="编辑" 
                          icon={<BiSolidEdit />} 
                          colorScheme="accent" 
                          size="sm" 
                          onClick={() => openEditModal("metadata", item)} 
                        />
                        <IconButton 
                          aria-label="删除" 
                          icon={<BiSolidTrash />} 
                          colorScheme="danger" 
                          size="sm" 
                          onClick={() => handleDelete(item.id)} 
                        />
                      </HStack>
                    </Td>
                  </Tr>
                )}
              </For>
            </Tbody>
          </Table>
        </Box>
        
        <Text fontSize="$sm" color="$neutral11" mt="$2">
          支持不少于3种元数据配置模式，提供灵活的元数据管理方案。
        </Text>
      </Box>

      {/* 指标管理部分 */}
      <Box w="$full" borderWidth="1px" borderRadius="$lg" p="$4" background={useColorModeValue("$neutral2", "$neutral3")()}>
        <HStack w="$full" justifyContent="space-between" mb="$4">
          <HStack spacing="$2">
            <Icon as={BiSolidChart} color="$info9" />
            <Text fontWeight="$semibold" fontSize="$lg">指标管理</Text>
          </HStack>
          <Button 
            leftIcon={<Icon as={BiSolidPlusCircle} />} 
            onClick={() => openAddModal("indicator")}
            colorScheme="info"
          >
            新增
          </Button>
        </HStack>
        
        <Box overflowX="auto">
          <Table dense>
            <Thead>
              <Tr>
                <Th>指标名称</Th>
                <Th>类型</Th>
                <Th>状态</Th>
                <Th>操作</Th>
              </Tr>
            </Thead>
            <Tbody>
              <For each={mockIndicators}>
                {(item) => (
                  <Tr>
                    <Td>
                      <Text fontWeight="$medium">{item.name}</Text>
                    </Td>
                    <Td>{item.type}</Td>
                    <Td>
                      <Badge colorScheme={item.status === "active" ? "success" : "neutral"}>
                        {item.status === "active" ? "启用" : "禁用"}
                      </Badge>
                    </Td>
                    <Td>
                      <HStack spacing="$2">
                        <IconButton 
                          aria-label="编辑" 
                          icon={<BiSolidEdit />} 
                          colorScheme="accent" 
                          size="sm" 
                          onClick={() => openEditModal("indicator", item)} 
                        />
                        <IconButton 
                          aria-label="删除" 
                          icon={<BiSolidTrash />} 
                          colorScheme="danger" 
                          size="sm" 
                          onClick={() => handleDelete(item.id)} 
                        />
                      </HStack>
                    </Td>
                  </Tr>
                )}
              </For>
            </Tbody>
          </Table>
        </Box>
        
        <Text fontSize="$sm" color="$neutral11" mt="$2">
          支持不少于3种标准数据指标管理的方式和自定义数据指标管理模式，满足多样化的业务需求。
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

              <FormControl invalid={!!formErrors().detail}>
                <FormLabel>{getDetailLabel()}</FormLabel>
                <Input
                  value={detail()}
                  onInput={(e) => setDetail(e.currentTarget.value)}
                  placeholder={`请输入${getDetailLabel()}`}
                />
                <FormErrorMessage>{formErrors().detail}</FormErrorMessage>
              </FormControl>

              <Show when={modalType() === "data_structure"}>
                <FormControl>
                  <FormLabel>后缀</FormLabel>
                  <Input
                    value={suffix()}
                    onInput={(e) => setSuffix(e.currentTarget.value)}
                    placeholder="请输入文件后缀"
                  />
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

export default DataConfig