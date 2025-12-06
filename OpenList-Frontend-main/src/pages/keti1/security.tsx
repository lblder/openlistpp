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
  Switch,
} from "@hope-ui/solid"
import { createSignal, For, Show } from "solid-js"
import { useManageTitle, useT } from "~/hooks"
import { BiSolidEdit, BiSolidTrash, BiSolidPlusCircle, BiSolidSave, BiSolidLock, BiSolidUser, BiSolidShieldAlt2 } from "solid-icons/bi"
import { handleResp, notify } from "~/utils"

// 模拟的后端API调用
const api = {
  getSecurityConfigs: async () => {
    return new Promise(resolve => setTimeout(() => resolve({ code: 200, message: "Success", data: { content: [...mockAuthModes, ...mockUsers, ...mockPermissions] } }), 500))
  },
  createSecurityConfig: async (data: any) => {
    return new Promise(resolve => setTimeout(() => resolve({ code: 200, message: "Success" }), 500))
  },
  updateSecurityConfig: async (id: string, data: any) => {
    return new Promise(resolve => setTimeout(() => resolve({ code: 200, message: "Success" }), 500))
  },
  deleteSecurityConfig: async (id: string) => {
    return new Promise(resolve => setTimeout(() => resolve({ code: 200, message: "Success" }), 500))
  },
}

interface AuthMode {
  id: string
  name: string
  type: string
  status: "active" | "inactive"
}

interface User {
  id: string
  username: string
  role: string
  lastLogin: string
  status: "active" | "inactive"
}

interface Permission {
  id: string
  resourceName: string
  permission: string
  role: string
  status: "active" | "inactive"
}

// 模拟静态数据
const mockAuthModes: AuthMode[] = [
  { id: "auth-01", name: "LDAP认证", type: "LDAP", status: "active" },
  { id: "auth-02", name: "OAuth2.0", type: "OAuth", status: "active" },
  { id: "auth-03", name: "JWT令牌", type: "JWT", status: "inactive" },
  { id: "auth-04", name: "本地认证", type: "Local", status: "active" },
]

const mockUsers: User[] = [
  { id: "user-01", username: "admin", role: "管理员", lastLogin: "2023-10-15 14:30:22", status: "active" },
  { id: "user-02", username: "operator", role: "操作员", lastLogin: "2023-10-14 09:15:45", status: "active" },
  { id: "user-03", username: "auditor", role: "审计员", lastLogin: "2023-10-10 16:42:11", status: "active" },
  { id: "user-04", username: "guest", role: "访客", lastLogin: "2023-09-28 11:20:03", status: "inactive" },
]

const mockPermissions: Permission[] = [
  { id: "perm-01", resourceName: "数据管理", permission: "读写", role: "管理员", status: "active" },
  { id: "perm-02", resourceName: "系统配置", permission: "只读", role: "操作员", status: "active" },
  { id: "perm-03", resourceName: "日志审计", permission: "读写", role: "审计员", status: "active" },
  { id: "perm-04", resourceName: "报表查看", permission: "只读", role: "访客", status: "active" },
]

const SecurityConfig = () => {
  const t = useT()
  useManageTitle("安全配置")

  // 状态定义
  const [loading, setLoading] = createSignal(false)
  
  // 模态框状态
  const [isModalOpen, setIsModalOpen] = createSignal(false)
  const [modalType, setModalType] = createSignal<"auth_mode" | "user" | "permission">("auth_mode")
  const [editingItem, setEditingItem] = createSignal<AuthMode | User | Permission | null>(null)
  const [name, setName] = createSignal("")
  const [detail, setDetail] = createSignal("") // 类型/角色/权限
  const [username, setUsername] = createSignal("") // 仅用于用户
  const [lastLogin, setLastLogin] = createSignal("") // 仅用于用户
  const [resourceName, setResourceName] = createSignal("") // 仅用于权限
  const [status, setStatus] = createSignal<"active" | "inactive">("active")
  const [formErrors, setFormErrors] = createSignal<{ [key: string]: string }>({})

  // 页面逻辑
  const refresh = async () => {
    setLoading(true)
    const resp: any = await api.getSecurityConfigs()
    // handleResp(resp, (data) => setDataConfigs(data.content))
    setLoading(false)
  }

  const openAddModal = (type: "auth_mode" | "user" | "permission") => {
    setModalType(type)
    setEditingItem(null)
    setName("")
    setDetail("")
    setUsername("")
    setLastLogin("")
    setResourceName("")
    setStatus("active")
    setFormErrors({})
    setIsModalOpen(true)
  }

  const openEditModal = (type: "auth_mode" | "user" | "permission", item: AuthMode | User | Permission) => {
    setModalType(type)
    setEditingItem(item)
    setName(item.name || (item as User).username || "")
    setStatus(item.status)
    setFormErrors({})
    
    if (type === "auth_mode") {
      const authItem = item as AuthMode;
      setDetail(authItem.type)
    } else if (type === "user") {
      const userItem = item as User;
      setDetail(userItem.role)
      setUsername(userItem.username)
      setLastLogin(userItem.lastLogin)
    } else {
      const permItem = item as Permission;
      setDetail(permItem.permission)
      setResourceName(permItem.resourceName)
    }
    
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
  }

  const validateForm = () => {
    const errors: { [key: string]: string } = {}
    if (!name() && modalType() !== "user") errors.name = "名称不能为空"
    if (!username() && modalType() === "user") errors.username = "用户名不能为空"
    if (!detail()) errors.detail = modalType() === "auth_mode" ? "认证类型不能为空" : 
                                 modalType() === "user" ? "角色不能为空" : "权限不能为空"
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSave = async () => {
    if (!validateForm()) return

    let data: any;
    if (modalType() === "auth_mode") {
      data = {
        name: name(),
        type: detail(),
        status: status(),
      }
    } else if (modalType() === "user") {
      data = {
        username: username(),
        role: detail(),
        lastLogin: lastLogin(),
        status: status(),
      }
    } else {
      data = {
        resourceName: resourceName(),
        permission: detail(),
        status: status(),
      }
    }

    setLoading(true)
    const resp = editingItem()
      ? await api.updateSecurityConfig(editingItem()!.id, data)
      : await api.createSecurityConfig(data)

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
    const resp = await api.deleteSecurityConfig(id)
    handleResp(resp, () => {
      notify.success("删除成功")
      refresh()
    })
    setLoading(false)
  }

  // 获取模态框标题
  const getModalTitle = () => {
    if (editingItem()) {
      return modalType() === "auth_mode" ? "编辑认证方式" : 
             modalType() === "user" ? "编辑用户" : "编辑权限"
    }
    return modalType() === "auth_mode" ? "新增认证方式" : 
           modalType() === "user" ? "新增用户" : "新增权限"
  }

  // 获取详情字段标签
  const getDetailLabel = () => {
    return modalType() === "auth_mode" ? "认证类型" : 
           modalType() === "user" ? "角色" : "权限"
  }

  return (
    <VStack w="$full" spacing="$5">
      <HStack w="$full" justifyContent="space-between" flexWrap="wrap" gap="$2">
        <Text fontSize="$2xl" fontWeight="bold">安全配置</Text>
        <Button colorScheme="accent" onClick={refresh} loading={loading()}>
          刷新
        </Button>
      </HStack>

      {/* 认证方式部分 */}
      <Box w="$full" borderWidth="1px" borderRadius="$lg" p="$4" background={useColorModeValue("$neutral2", "$neutral3")()}>
        <HStack w="$full" justifyContent="space-between" mb="$4">
          <HStack spacing="$2">
            <Icon as={BiSolidLock} color="$primary9" />
            <Text fontWeight="$semibold" fontSize="$lg">认证方式</Text>
          </HStack>
          <Button 
            leftIcon={<Icon as={BiSolidPlusCircle} />} 
            onClick={() => openAddModal("auth_mode")}
            colorScheme="primary"
          >
            新增
          </Button>
        </HStack>
        
        <Box overflowX="auto">
          <Table dense>
            <Thead>
              <Tr>
                <Th>认证名称</Th>
                <Th>认证类型</Th>
                <Th>状态</Th>
                <Th>操作</Th>
              </Tr>
            </Thead>
            <Tbody>
              <For each={mockAuthModes}>
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
                          onClick={() => openEditModal("auth_mode", item)} 
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
          支持多种认证方式，包括LDAP、OAuth2.0、JWT令牌等，保障系统访问安全。
        </Text>
      </Box>

      {/* 用户管理部分 */}
      <Box w="$full" borderWidth="1px" borderRadius="$lg" p="$4" background={useColorModeValue("$neutral2", "$neutral3")()}>
        <HStack w="$full" justifyContent="space-between" mb="$4">
          <HStack spacing="$2">
            <Icon as={BiSolidUser} color="$accent9" />
            <Text fontWeight="$semibold" fontSize="$lg">用户管理</Text>
          </HStack>
          <Button 
            leftIcon={<Icon as={BiSolidPlusCircle} />} 
            onClick={() => openAddModal("user")}
            colorScheme="accent"
          >
            新增
          </Button>
        </HStack>
        
        <Box overflowX="auto">
          <Table dense>
            <Thead>
              <Tr>
                <Th>用户名</Th>
                <Th>角色</Th>
                <Th>最后登录</Th>
                <Th>状态</Th>
                <Th>操作</Th>
              </Tr>
            </Thead>
            <Tbody>
              <For each={mockUsers}>
                {(item) => (
                  <Tr>
                    <Td>
                      <Text fontWeight="$medium">{item.username}</Text>
                    </Td>
                    <Td>{item.role}</Td>
                    <Td>{item.lastLogin}</Td>
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
                          onClick={() => openEditModal("user", item)} 
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
          管理系统用户账号，分配不同角色权限，跟踪用户活动日志。
        </Text>
      </Box>

      {/* 权限配置部分 */}
      <Box w="$full" borderWidth="1px" borderRadius="$lg" p="$4" background={useColorModeValue("$neutral2", "$neutral3")()}>
        <HStack w="$full" justifyContent="space-between" mb="$4">
          <HStack spacing="$2">
            <Icon as={BiSolidShieldAlt2} color="$info9" />
            <Text fontWeight="$semibold" fontSize="$lg">权限配置</Text>
          </HStack>
          <Button 
            leftIcon={<Icon as={BiSolidPlusCircle} />} 
            onClick={() => openAddModal("permission")}
            colorScheme="info"
          >
            新增
          </Button>
        </HStack>
        
        <Box overflowX="auto">
          <Table dense>
            <Thead>
              <Tr>
                <Th>资源名称</Th>
                <Th>权限</Th>
                <Th>角色</Th>
                <Th>状态</Th>
                <Th>操作</Th>
              </Tr>
            </Thead>
            <Tbody>
              <For each={mockPermissions}>
                {(item) => (
                  <Tr>
                    <Td>
                      <Text fontWeight="$medium">{item.resourceName}</Text>
                    </Td>
                    <Td>{item.permission}</Td>
                    <Td>{item.role}</Td>
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
                          onClick={() => openEditModal("permission", item)} 
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
          配置细粒度的资源访问权限，确保用户只能访问授权范围内的资源。
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
              <Show when={modalType() === "auth_mode" || modalType() === "permission"}>
                <FormControl invalid={!!formErrors().name}>
                  <FormLabel>{modalType() === "auth_mode" ? "认证名称" : "资源名称"}</FormLabel>
                  <Input
                    value={name() || resourceName()}
                    onInput={(e) => modalType() === "auth_mode" ? setName(e.currentTarget.value) : setResourceName(e.currentTarget.value)}
                    placeholder={`请输入${modalType() === "auth_mode" ? "认证名称" : "资源名称"}`}
                  />
                  <FormErrorMessage>{formErrors().name}</FormErrorMessage>
                </FormControl>
              </Show>

              <Show when={modalType() === "user"}>
                <FormControl invalid={!!formErrors().username}>
                  <FormLabel>用户名</FormLabel>
                  <Input
                    value={username()}
                    onInput={(e) => setUsername(e.currentTarget.value)}
                    placeholder="请输入用户名"
                  />
                  <FormErrorMessage>{formErrors().username}</FormErrorMessage>
                </FormControl>
              </Show>

              <FormControl invalid={!!formErrors().detail}>
                <FormLabel>{getDetailLabel()}</FormLabel>
                <Input
                  value={detail()}
                  onInput={(e) => setDetail(e.currentTarget.value)}
                  placeholder={`请输入${getDetailLabel()}`}
                />
                <FormErrorMessage>{formErrors().detail}</FormErrorMessage>
              </FormControl>

              <Show when={modalType() === "user"}>
                <FormControl>
                  <FormLabel>最后登录</FormLabel>
                  <Input
                    value={lastLogin()}
                    onInput={(e) => setLastLogin(e.currentTarget.value)}
                    placeholder="请输入最后登录时间"
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

export default SecurityConfig