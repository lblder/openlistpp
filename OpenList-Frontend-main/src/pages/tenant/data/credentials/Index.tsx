import {
    Box,
    Button,
    Grid,
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
    useColorModeValue,
    Alert,
    AlertIcon,
    AlertTitle,
    AlertDescription,
    Switch as HopeSwitch,
} from "@hope-ui/solid"
import { createSignal, For, Show } from "solid-js"
import { useManageTitle, useT } from "~/hooks"
import { BiSolidEdit, BiSolidTrash, BiSolidPlusCircle, BiSolidKey } from "solid-icons/bi"
import { Paginator } from "~/components/Paginator"
import { handleResp, notify } from "~/utils"

// 模拟的后端API调用
const api = {
    getCredentials: async (page: number, pageSize: number) => {
        console.log(`Fetching credentials: page=${page}, pageSize=${pageSize}`)
        // 实际应为: const resp = await r.get(`/admin/credentials/list?page=${page}&size=${pageSize}`);
        // return handleResp(resp);
        return new Promise(resolve => {
            setTimeout(() => {
                const items = mockCredentials.slice((page - 1) * pageSize, page * pageSize)
                resolve({ code: 200, message: "Success", data: { content: items, total: mockCredentials.length } })
            }, 500)
        })
    },
    createCredential: async (data: any) => {
        console.log("Creating credential:", data)
        // 实际应为: const resp = await r.post("/admin/credentials/create", data);
        // return handleResp(resp);
        return new Promise(resolve => setTimeout(() => resolve({ code: 200, message: "Success" }), 500))
    },
    updateCredential: async (id: string, data: any) => {
        console.log(`Updating credential ${id}:`, data)
        // 实际应为: const resp = await r.put(`/admin/credentials/update/${id}`, data);
        // return handleResp(resp);
        return new Promise(resolve => setTimeout(() => resolve({ code: 200, message: "Success" }), 500))
    },
    deleteCredential: async (id: string) => {
        console.log(`Deleting credential ${id}`)
        // 实际应为: const resp = await r.delete(`/admin/credentials/delete/${id}`);
        // return handleResp(resp);
        return new Promise(resolve => setTimeout(() => resolve({ code: 200, message: "Success" }), 500))
    },
}

// 1. 数据结构定义
interface Credential {
    id: string
    userId: string
    accessKey: string
    passwordEncrypted: string
    mfaEnabled: boolean
    createdAt: string
}

// 2. 模拟静态数据
const mockCredentials: Credential[] = [
    { id: "cred-001", userId: "user-alpha", accessKey: "AKIAIOSFODNN7EXAMPLE", passwordEncrypted: "**********", mfaEnabled: true, createdAt: "2024-09-20 10:00:00" },
    { id: "cred-002", userId: "user-beta", accessKey: "AKIAI44QH8DHBEXAMPLE", passwordEncrypted: "**********", mfaEnabled: false, createdAt: "2024-09-21 11:30:00" },
    { id: "cred-003", userId: "service-gamma", accessKey: "AKIA3J5B3L5N6EXAMPLE", passwordEncrypted: "**********", mfaEnabled: true, createdAt: "2024-09-22 14:00:00" },
]

const Credentials = () => {
    const t = useT()
    useManageTitle("tenant.data.credentials.title")

    // 状态定义
    const [credentials, setCredentials] = createSignal<Credential[]>(mockCredentials)
    const [loading, setLoading] = createSignal(false)
    const [isModalOpen, setIsModalOpen] = createSignal(false)
    const [editingCredential, setEditingCredential] = createSignal<Credential | null>(null)

    // 表单状态
    const [userId, setUserId] = createSignal("")
    const [password, setPassword] = createSignal("")
    const [mfaEnabled, setMfaEnabled] = createSignal(false)
    const [formErrors, setFormErrors] = createSignal<{ [key: string]: string }>({})

    // 3. 页面逻辑
    const refresh = async () => {
        setLoading(true)
        const resp: any = await api.getCredentials(1, 10)
        handleResp(resp, data => {
            setCredentials(data.content)
        })
        setLoading(false)
    }

    const openAddModal = () => {
        setEditingCredential(null)
        setUserId("")
        setPassword("")
        setMfaEnabled(false)
        setFormErrors({})
        setIsModalOpen(true)
    }

    const openEditModal = (credential: Credential) => {
        setEditingCredential(credential)
        setUserId(credential.userId)
        setPassword("") // 编辑时不显示旧密码
        setMfaEnabled(credential.mfaEnabled)
        setFormErrors({})
        setIsModalOpen(true)
    }

    const closeModal = () => {
        setIsModalOpen(false)
    }

    const validateForm = () => {
        const errors: { [key: string]: string } = {}
        if (!userId()) errors.userId = t("tenant.data.credentials.user_id_required")
        if (!editingCredential() && !password()) {
            errors.password = t("tenant.data.credentials.password_required")
        } else if (password() && password().length < 8) {
            errors.password = t("tenant.data.credentials.password_min_length")
        }
        setFormErrors(errors)
        return Object.keys(errors).length === 0
    }

    const handleSave = async () => {
        if (!validateForm()) return

        const data = {
            userId: userId(),
            password: password(),
            mfaEnabled: mfaEnabled(),
        }

        setLoading(true)
        const resp = editingCredential()
            ? await api.updateCredential(editingCredential()!.id, data)
            : await api.createCredential(data)

        handleResp(resp, () => {
            notify.success(t("global.operation_success"))
            closeModal()
            refresh()
        })
        setLoading(false)
    }

    const handleDelete = async (id: string) => {
        if (!confirm(t("tenant.data.credentials.confirm_delete"))) return
        setLoading(true)
        const resp = await api.deleteCredential(id)
        handleResp(resp, () => {
            notify.success(t("global.delete_success"))
            refresh()
        })
        setLoading(false)
    }

    return (
        <VStack w="$full" spacing="$5">
            <HStack w="$full" justifyContent="space-between">
                <Text fontSize="$2xl" fontWeight="bold">{t("tenant.data.credentials.title")}</Text>
                <HStack spacing="$2">
                    <Button colorScheme="accent" onClick={refresh} loading={loading()}>
                        {t("global.refresh")}
                    </Button>
                    <Button leftIcon={<Icon as={BiSolidPlusCircle} />} onClick={openAddModal}>
                        {t("global.add")}
                    </Button>
                </HStack>
            </HStack>

            {/* 4. UI渲染 */}
            <Box w="$full" borderWidth="1px" borderRadius="$lg" p="$4" overflowX="auto"
                 background={useColorModeValue("$neutral2", "$neutral3")()}>
                <Show when={credentials().length > 0}
                      fallback={
                          <Alert status="info">
                              <AlertIcon />
                              <AlertTitle>{t("tenant.data.credentials.no_credentials")}</AlertTitle>
                              <AlertDescription>{t("tenant.data.credentials.no_credentials_desc")}</AlertDescription>
                          </Alert>
                      }>
                    <Table dense>
                        <Thead>
                            <Tr>
                                <Th>{t("tenant.data.credentials.user_id")}</Th>
                                <Th>{t("tenant.data.credentials.access_key")}</Th>
                                <Th>{t("tenant.data.credentials.password")}</Th>
                                <Th>{t("tenant.data.credentials.mfa_status")}</Th>
                                <Th>{t("tenant.data.credentials.created_at")}</Th>
                                <Th>{t("global.operations")}</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            <For each={credentials()}>
                                {(item) => (
                                    <Tr>
                                        <Td fontWeight="$medium">{item.userId}</Td>
                                        <Td fontFamily="monospace">{item.accessKey}</Td>
                                        <Td>{item.passwordEncrypted}</Td>
                                        <Td>
                                            <Badge colorScheme={item.mfaEnabled ? "success" : "neutral"}>
                                                {item.mfaEnabled ? t("global.enabled") : t("global.disabled")}
                                            </Badge>
                                        </Td>
                                        <Td>{item.createdAt}</Td>
                                        <Td>
                                            <HStack spacing="$2">
                                                <IconButton
                                                    aria-label={t("global.edit")}
                                                    icon={<BiSolidEdit />}
                                                    colorScheme="accent"
                                                    size="sm"
                                                    onClick={() => openEditModal(item)}
                                                />
                                                <IconButton
                                                    aria-label={t("global.delete")}
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
                </Show>
            </Box>

            {/* 添加/编辑模态框 */}
            <Modal opened={isModalOpen()} onClose={closeModal}>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>
                        {editingCredential() ? t("tenant.data.credentials.edit_credential") : t("tenant.data.credentials.add_credential")}
                    </ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <VStack spacing="$4">
                            <FormControl invalid={!!formErrors().userId}>
                                <FormLabel>{t("tenant.data.credentials.user_id")}</FormLabel>
                                <Input
                                    value={userId()}
                                    onInput={(e) => setUserId(e.currentTarget.value)}
                                    placeholder={t("tenant.data.credentials.user_id_placeholder")}
                                />
                                <FormErrorMessage>{formErrors().userId}</FormErrorMessage>
                            </FormControl>
                            <FormControl invalid={!!formErrors().password}>
                                <FormLabel>{t("tenant.data.credentials.password")}</FormLabel>
                                <Input
                                    type="password"
                                    value={password()}
                                    onInput={(e) => setPassword(e.currentTarget.value)}
                                    placeholder={editingCredential() ? t("tenant.data.credentials.password_edit_placeholder") : t("tenant.data.credentials.password_placeholder")}
                                />
                                <FormErrorMessage>{formErrors().password}</FormErrorMessage>
                            </FormControl>
                            <FormControl>
                                <FormLabel>{t("tenant.data.credentials.mfa_status")}</FormLabel>
                                <HopeSwitch checked={mfaEnabled()} onChange={(e: any) => setMfaEnabled(e.currentTarget.checked)}>
                                    {mfaEnabled() ? t("global.enabled") : t("global.disabled")}
                                </HopeSwitch>
                            </FormControl>
                        </VStack>
                    </ModalBody>
                    <ModalFooter>
                        <HStack spacing="$2">
                            <Button onClick={closeModal} variant="subtle">
                                {t("global.cancel")}
                            </Button>
                            <Button onClick={handleSave} loading={loading()}>
                                {t("global.save")}
                            </Button>
                        </HStack>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </VStack>
    )
}

export default Credentials