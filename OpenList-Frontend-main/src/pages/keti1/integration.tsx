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
import { createSignal, For, Show, onMount } from "solid-js"
import { useManageTitle, useT } from "~/hooks"
import { BiSolidEdit, BiSolidTrash, BiSolidPlusCircle, BiSolidSave } from "solid-icons/bi"
import { handleResp, notify, r } from "~/utils"
import DataBrowser from "./data/Layout"

// Data Structure API
import { Resp } from "~/types"

const structureApi = {
  list: async (page: number, size: number) => {
    return r.get("/keti1/data-structure/list", { params: { page, per_page: size } }) as unknown as Promise<Resp<any>>
  },
  create: async (data: any) => {
    return r.post("/keti1/data-structure/create", data) as unknown as Promise<Resp<any>>
  },
  update: async (id: string, data: any) => {
    return r.put(`/keti1/data-structure/update/${id}`, data) as unknown as Promise<Resp<any>>
  },
  delete: async (id: string) => {
    return r.delete(`/keti1/data-structure/delete/${id}`) as unknown as Promise<Resp<any>>
  },
}

interface DataStructure {
  id: string
  name: string
  description: string
  allowed_extensions: string
  status: "active" | "inactive"
  created_at: string
}

const DataIntegration = () => {
  const t = useT()
  useManageTitle("数据集成")

  // 状态定义
  const [activeTab, setActiveTab] = createSignal(0) // 0:数据集成, 1:结构管理
  const [loading, setLoading] = createSignal(false)
  const [structures, setStructures] = createSignal<DataStructure[]>([])

  // 模态框状态
  const [isModalOpen, setIsModalOpen] = createSignal(false)
  const [editingItem, setEditingItem] = createSignal<DataStructure | null>(null)

  // 表单字段状态
  const [name, setName] = createSignal("")
  const [description, setDescription] = createSignal("")
  const [allowedExtensions, setAllowedExtensions] = createSignal("")
  const [status, setStatus] = createSignal<"active" | "inactive">("active")
  const [formErrors, setFormErrors] = createSignal<{ [key: string]: string }>({})

  // 页面逻辑
  const refresh = async () => {
    setLoading(true)
    const resp = await structureApi.list(1, 100)
    handleResp(resp, (data: any) => {
      setStructures(data.content || [])
    })
    setLoading(false)
  }

  onMount(() => {
    refresh()
  })

  const openAddModal = () => {
    setEditingItem(null)
    setName("")
    setDescription("")
    setAllowedExtensions("")
    setStatus("active")
    setFormErrors({})
    setIsModalOpen(true)
  }

  const openEditModal = (item: DataStructure) => {
    setEditingItem(item)
    setName(item.name)
    setDescription(item.description)
    setAllowedExtensions(item.allowed_extensions)
    setStatus(item.status)
    setFormErrors({})
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
  }

  const validateForm = () => {
    const errors: { [key: string]: string } = {}
    if (!name()) errors.name = "名称不能为空"

    if (activeTab() === 1) {
      if (!description()) errors.description = "描述不能为空"
      if (!allowedExtensions()) errors.allowedExtensions = "允许后缀不能为空"
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSave = async () => {
    if (!validateForm()) return
    setLoading(true)
    // 模拟保存
    const data = {
      name: name(),
      description: description(),
      allowed_extensions: allowedExtensions(),
      status: status(),
    }

    let resp
    if (editingItem()) {
      resp = await structureApi.update(editingItem()!.id, data)
    } else {
      resp = await structureApi.create(data)
    }

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
    const resp = await structureApi.delete(id)
    handleResp(resp, () => {
      notify.success("删除成功")
      refresh()
    })
    setLoading(false)
  }

  // 获取模态框标题
  const getModalTitle = () => {
    const action = editingItem() ? "编辑" : "新增"
    return `${action}数据结构`
  }


  return (
    <VStack w="$full" spacing="$4" h="$full">
      <HStack justifyContent="space-between" w="$full">
        <Text fontSize="$xl" fontWeight="$bold">数据集成</Text>
      </HStack>

      {/* Tabs */}
      <HStack spacing="$2" borderBottom="1px solid $neutral6" pb="$2" justifyContent="space-between" w="$full">
        <HStack spacing="$2">
          <Button variant={activeTab() === 0 ? "solid" : "ghost"} colorScheme={activeTab() === 0 ? "primary" : "neutral"} onClick={() => setActiveTab(0)}>数据集成</Button>
          <Button variant={activeTab() === 1 ? "solid" : "ghost"} colorScheme={activeTab() === 1 ? "primary" : "neutral"} onClick={() => setActiveTab(1)}>数据集成管理</Button>
        </HStack>

        {/* Actions */}
        <HStack spacing="$2">
          <Show when={activeTab() === 1}>
            <Button leftIcon={<Icon as={BiSolidPlusCircle} />} colorScheme="primary" onClick={openAddModal}>新增结构</Button>
          </Show>

          <Button colorScheme="accent" variant="outline" onClick={refresh} loading={loading()}>刷新</Button>
        </HStack>
      </HStack>

      <Box flex="1" overflowY="auto" w="$full">
        {/* Tab 0: 数据集成 */}
        <Show when={activeTab() === 0}>
          <Box w="$full" minH="$full" borderWidth="1px" borderRadius="$lg" overflow="hidden">
            <DataBrowser />
          </Box>
        </Show>

        {/* Tab 1: 数据集成管理 */}
        <Show when={activeTab() === 1}>
          <Box minH="$full" borderWidth="1px" borderRadius="$lg" overflowX="auto" p="$4">
            <Table dense>
              <Thead>
                <Tr>
                  <Th>ID</Th>
                  <Th>名称</Th>
                  <Th>描述</Th>
                  <Th>允许后缀</Th>
                  <Th>状态</Th>
                  <Th>创建时间</Th>
                  <Th>操作</Th>
                </Tr>
              </Thead>
              <Tbody>
                <For each={structures()}>
                  {(item) => (
                    <Tr>
                      <Td>{item.id}</Td>
                      <Td>{item.name}</Td>
                      <Td>{item.description}</Td>
                      <Td><Badge colorScheme="info">{item.allowed_extensions}</Badge></Td>
                      <Td><Badge colorScheme={item.status === 'active' ? 'success' : 'neutral'}>{item.status === 'active' ? '启用' : '禁用'}</Badge></Td>
                      <Td>{new Date(item.created_at).toLocaleString()}</Td>
                      <Td>
                        <HStack spacing="$2">
                          <IconButton aria-label="编辑" icon={<BiSolidEdit />} size="sm" onClick={() => openEditModal(item)} />
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
              <Show when={activeTab() === 1}>
                <FormControl invalid={!!formErrors().description}>
                  <FormLabel>描述</FormLabel>
                  <Textarea
                    value={description()}
                    onInput={(e) => setDescription(e.currentTarget.value)}
                    placeholder="请输入结构描述"
                  />
                  <FormErrorMessage>{formErrors().description}</FormErrorMessage>
                </FormControl>

                <FormControl invalid={!!formErrors().allowedExtensions}>
                  <FormLabel>允许的文件后缀 (逗号分隔)</FormLabel>
                  <Input
                    value={allowedExtensions()}
                    onInput={(e) => setAllowedExtensions(e.currentTarget.value)}
                    placeholder="例如: .pcap, .txt, .log"
                  />
                  <FormErrorMessage>{formErrors().allowedExtensions}</FormErrorMessage>
                </FormControl>

                <FormControl>
                  <FormLabel>状态</FormLabel>
                  <HStack spacing="$2">
                    <Button
                      size="sm"
                      variant={status() === "active" ? "solid" : "outline"}
                      colorScheme={status() === "active" ? "success" : "neutral"}
                      onClick={() => setStatus("active")}
                    >
                      启用
                    </Button>
                    <Button
                      size="sm"
                      variant={status() === "inactive" ? "solid" : "outline"}
                      colorScheme={status() === "inactive" ? "danger" : "neutral"}
                      onClick={() => setStatus("inactive")}
                    >
                      禁用
                    </Button>
                  </HStack>
                </FormControl>
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
    </VStack >
  )
}

export default DataIntegration