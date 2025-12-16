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
    useColorModeValue,
    Alert,
    AlertIcon,
    AlertTitle,
    AlertDescription,
    Switch as HopeSwitch,
    Select,
    SelectContent,
    SelectListbox,
    SelectOption,
    SelectOptionText,
    SelectTrigger,
    SelectValue,
    SelectIcon,
} from "@hope-ui/solid"
import { createSignal, For, Show, createMemo } from "solid-js"
import { useManageTitle, useT } from "~/hooks"
import { BiSolidEdit, BiSolidTrash, BiSolidDownload, BiSolidTerminal, BiSolidArchive, BiSolidWrench } from "solid-icons/bi"
import { createStorageSignal } from "@solid-primitives/storage"
import { handleResp, notify } from "~/utils"

// 模拟的后端API调用
const api = {
    getTools: async () => {
        // 实际应为: const resp = await r.get("/admin/tools/list");
        // return handleResp(resp);
        return new Promise(resolve => setTimeout(() => resolve({ code: 200, message: "Success", data: { content: mockSoftwareTools } }), 500))
    },
    deleteTool: async (id: string) => {
        // 实际应为: const resp = await r.delete(`/admin/tools/delete/${id}`);
        // return handleResp(resp);
        return new Promise(resolve => setTimeout(() => resolve({ code: 200, message: "Success" }), 500))
    },
}

// 1. 数据结构和类型
type SoftwareToolType = "script" | "package" | "repository" | "ide"
type SoftwareStatus = "installed" | "not_installed" | "deprecated"

interface SoftwareTool {
    id: string
    name: string
    type: SoftwareToolType
    version: string
    source: string
    status: SoftwareStatus
}

// 2. 模拟静态数据
const mockSoftwareTools: SoftwareTool[] = [
    { id: "tool-01", name: "backup.sh", type: "script", version: "1.2", source: "Internal Git", status: "installed" },
    { id: "tool-02", name: "Nginx", type: "package", version: "1.21.3", source: "APT", status: "installed" },
    { id: "tool-03", name: "MyWebApp", type: "repository", version: "2.0.1", source: "github.com/user/mywebapp", status: "not_installed" },
    { id: "tool-04", name: "VSCode Server", type: "ide", version: "1.80.1", source: "Official", status: "installed" },
    { id: "tool-05", name: "Redis", type: "package", version: "6.2.5", source: "DockerHub", status: "deprecated" },
]

// 辅助函数：获取样式
const getToolStyle = (type: SoftwareToolType) => {
    switch (type) {
        case "script": return { icon: BiSolidTerminal, color: "info" }
        case "package": return { icon: BiSolidArchive, color: "success" }
        case "repository": return { icon: BiSolidArchive, color: "primary" }
        case "ide": return { icon: BiSolidWrench, color: "warning" }
        default: return { icon: BiSolidWrench, color: "neutral" }
    }
}
const getStatusColor = (status: SoftwareStatus) => {
    if (status === "installed") return "success";
    if (status === "deprecated") return "danger";
    return "neutral";
}

// 网格视图项
const ToolGridItem = (props: { item: SoftwareTool; onDelete: (id: string) => void }) => {
    const t = useT()
    const style = getToolStyle(props.item.type)
    return (
        <VStack
            w="$full" spacing="$3" rounded="$lg" border="1px solid $neutral7"
            background={useColorModeValue("$neutral2", "$neutral3")()} p="$4"
            _hover={{ borderColor: "$primary7" }} alignItems="start"
        >
            <HStack w="$full" justifyContent="space-between">
                <HStack spacing="$2">
                    <Icon as={style.icon} boxSize="$6" color={`$${style.color}9`} />
                    <Text fontWeight="$semibold">{props.item.name}</Text>
                </HStack>
                <Badge colorScheme={getStatusColor(props.item.status)}>{t(`tenant.data.tools.status_values.${props.item.status}`)}</Badge>
            </HStack>
            <Text fontSize="$sm" color="$neutral11">Version: {props.item.version}</Text>
            <Text fontSize="$sm" color="$neutral11" noOfLines={1}>Source: {props.item.source}</Text>
            <HStack w="$full" justifyContent="flex-end">
                <Button size="sm">{props.item.status === 'installed' ? t('tenant.data.tools.uninstall') : t('tenant.data.tools.install')}</Button>
                <IconButton aria-label={t("global.delete")} icon={<BiSolidTrash />} colorScheme="danger" size="sm" onClick={() => props.onDelete(props.item.id)} />
            </HStack>
        </VStack>
    )
}

// 表格视图项
const ToolListItem = (props: { item: SoftwareTool; onDelete: (id: string) => void }) => {
    const t = useT()
    const style = getToolStyle(props.item.type)
    return (
        <Tr>
            <Td>
                <HStack spacing="$2">
                    <Icon as={style.icon} color={`$${style.color}9`} />
                    <Text fontWeight="$medium">{props.item.name}</Text>
                </HStack>
            </Td>
            <Td><Badge colorScheme={style.color}>{t(`tenant.data.tools.types.${props.item.type}`)}</Badge></Td>
            <Td>{props.item.version}</Td>
            <Td><Badge colorScheme={getStatusColor(props.item.status)}>{t(`tenant.data.tools.status_values.${props.item.status}`)}</Badge></Td>
            <Td noOfLines={1}>{props.item.source}</Td>
            <Td>
                <HStack spacing="$2">
                    <Button size="sm">{props.item.status === 'installed' ? t('tenant.data.tools.uninstall') : t('tenant.data.tools.install')}</Button>
                    <IconButton aria-label={t("global.delete")} icon={<BiSolidTrash />} colorScheme="danger" size="sm" onClick={() => props.onDelete(props.item.id)} />
                </HStack>
            </Td>
        </Tr>
    )
}

const ToolingSoftware = () => {
    const t = useT()
    useManageTitle("tenant.data.tools.title")

    const [tools, setTools] = createSignal<SoftwareTool[]>(mockSoftwareTools)
    const [loading, setLoading] = createSignal(false)
    const [layout, setLayout] = createStorageSignal<"grid" | "table">("tooling-software-layout", "grid")
    const [filterType, setFilterType] = createSignal<string>("all")

    const refresh = async () => {
        setLoading(true)
        const resp: any = await api.getTools()
        handleResp(resp, data => setTools(data.content))
        setLoading(false)
    }

    const handleDelete = async (id: string) => {
        if (!confirm(t("tenant.data.tools.confirm_delete"))) return;
        setLoading(true)
        const resp = await api.deleteTool(id)
        handleResp(resp, () => {
            notify.success(t("global.delete_success"))
            refresh()
        })
        setLoading(false)
    }

    const filteredTools = createMemo(() => {
        if (filterType() === 'all') return tools();
        return tools().filter(tool => tool.type === filterType());
    });

    return (
        <VStack w="$full" spacing="$5">
            <HStack w="$full" justifyContent="space-between" flexWrap="wrap" gap="$2">
                <Text fontSize="$2xl" fontWeight="bold">{t("tenant.data.tools.title")}</Text>
                <HStack spacing="$2">
                    <Button colorScheme="accent" onClick={refresh} loading={loading()}>
                        {t("global.refresh")}
                    </Button>
                    <Button>{t("global.add")}</Button>
                    <Select value={filterType()} onChange={setFilterType}>
                        <SelectTrigger>
                            <SelectValue>{t(`tenant.data.tools.types.${filterType()}`)}</SelectValue>
                            <SelectIcon />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectListbox>
                                <For each={['all', 'script', 'package', 'repository', 'ide']}>
                                    {(item) => <SelectOption value={item}><SelectOptionText>{t(`tenant.data.tools.types.${item}`)}</SelectOptionText></SelectOption>}
                                </For>
                            </SelectListbox>
                        </SelectContent>
                    </Select>
                    <HopeSwitch checked={layout() === "table"} onChange={(e: any) => setLayout(e.currentTarget.checked ? "table" : "grid")}>
                        {t("storages.other.table_layout")}
                    </HopeSwitch>
                </HStack>
            </HStack>

            <Show when={filteredTools().length > 0}
                  fallback={
                      <Alert status="info" w="$full">
                          <AlertIcon />
                          <AlertTitle>{t("tenant.data.tools.no_tools")}</AlertTitle>
                          <AlertDescription>{t("tenant.data.tools.no_tools_desc")}</AlertDescription>
                      </Alert>
                  }>
                <Show when={layout() === 'grid'}>
                    <Grid
                        w="$full" gap="$4"
                        templateColumns={{
                            "@initial": "repeat(1, 1fr)",
                            "@md": "repeat(2, 1fr)",
                            "@lg": "repeat(3, 1fr)",
                        }}
                    >
                        <For each={filteredTools()}>
                            {(item) => <ToolGridItem item={item} onDelete={handleDelete} />}
                        </For>
                    </Grid>
                </Show>
                <Show when={layout() === 'table'}>
                    <Box w="$full" borderWidth="1px" borderRadius="$lg" p="$4" overflowX="auto"
                         background={useColorModeValue("$neutral2", "$neutral3")()}>
                        <Table dense>
                            <Thead>
                                <Tr>
                                    <Th>{t("tenant.data.tools.name")}</Th>
                                    <Th>{t("tenant.data.tools.type")}</Th>
                                    <Th>{t("tenant.data.tools.version")}</Th>
                                    <Th>{t("tenant.data.tools.status")}</Th>
                                    <Th>{t("tenant.data.tools.source")}</Th>
                                    <Th>{t("global.operations")}</Th>
                                </Tr>
                            </Thead>
                            <Tbody>
                                <For each={filteredTools()}>
                                    {(item) => <ToolListItem item={item} onDelete={handleDelete} />}
                                </For>
                            </Tbody>
                        </Table>
                    </Box>
                </Show>
            </Show>
        </VStack>
    )
}

export default ToolingSoftware