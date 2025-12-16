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
import { BiSolidEdit, BiSolidTrash, BiSolidDownload, BiSolidFileImage, BiSolidFileDoc, BiSolidFileJson, BiSolidFileArchive, BiSolidData } from "solid-icons/bi"
import { createStorageSignal } from "@solid-primitives/storage"
import { handleResp, notify } from "~/utils"

// 模拟的后端API调用
const api = {
    getDataAssets: async () => {
        // 实际应为: const resp = await r.get("/admin/data-assets/list");
        // return handleResp(resp);
        return new Promise(resolve => setTimeout(() => resolve({ code: 200, message: "Success", data: { content: mockDataAssets } }), 500))
    },
    deleteDataAsset: async (id: string) => {
        // 实际应为: const resp = await r.delete(`/admin/data-assets/delete/${id}`);
        // return handleResp(resp);
        return new Promise(resolve => setTimeout(() => resolve({ code: 200, message: "Success" }), 500))
    },
}

// 1. 数据结构和类型
type DataAssetType = "image" | "document" | "config" | "log" | "dataset"
interface DataAsset {
    id: string
    name: string
    type: DataAssetType
    size: string
    path: string
    lastModified: string
}

// 2. 模拟静态数据
const mockDataAssets: DataAsset[] = [
    { id: "asset-01", name: "logo.png", type: "image", size: "15 KB", path: "/images/", lastModified: "2024-09-22 09:15:00" },
    { id: "asset-02", name: "report.pdf", type: "document", size: "1.2 MB", path: "/documents/", lastModified: "2024-09-21 18:30:00" },
    { id: "asset-03", name: "nginx.conf", type: "config", size: "5 KB", path: "/configs/", lastModified: "2024-09-20 11:00:00" },
    { id: "asset-04", name: "app-2024-09-22.log", type: "log", size: "50 MB", path: "/logs/", lastModified: "2024-09-22 23:59:00" },
    { id: "asset-05", name: "user_data.csv", type: "dataset", size: "10 MB", path: "/datasets/", lastModified: "2024-09-19 14:00:00" },
    { id: "asset-06", name: "user_guide.docx", type: "document", size: "800 KB", path: "/documents/", lastModified: "2024-09-22 10:00:00" },
]

// 辅助函数：根据类型获取图标和颜色
const getAssetStyle = (type: DataAssetType) => {
    switch (type) {
        case "image": return { icon: BiSolidFileImage, color: "success" }
        case "document": return { icon: BiSolidFileDoc, color: "info" }
        case "config": return { icon: BiSolidFileJson, color: "warning" }
        case "log": return { icon: BiSolidFileArchive, color: "neutral" }
        case "dataset": return { icon: BiSolidData, color: "primary" }
        default: return { icon: BiSolidData, color: "neutral" }
    }
}

// 网格视图项
const DataAssetGridItem = (props: { item: DataAsset; onDelete: (id: string) => void }) => {
    const t = useT()
    const style = getAssetStyle(props.item.type)
    return (
        <VStack
            w="$full" spacing="$3" rounded="$lg" border="1px solid $neutral7"
            background={useColorModeValue("$neutral2", "$neutral3")()} p="$4"
            _hover={{ borderColor: "$primary7" }} alignItems="start"
        >
            <HStack w="$full" justifyContent="space-between">
                <HStack spacing="$2">
                    <Icon as={style.icon} boxSize="$6" color={`$${style.color}9`} />
                    <Text fontWeight="$semibold" noOfLines={1}>{props.item.name}</Text>
                </HStack>
                <Badge colorScheme={style.color}>{t(`tenant.data.business.types.${props.item.type}`)}</Badge>
            </HStack>
            <Text fontSize="$sm" color="$neutral11">Path: {props.item.path}</Text>
            <Text fontSize="$sm" color="$neutral11">Size: {props.item.size}</Text>
            <Text fontSize="$xs" color="$neutral10">Last Modified: {props.item.lastModified}</Text>
            <HStack spacing="$2" w="$full" justifyContent="flex-end">
                <IconButton aria-label={t("global.download")} icon={<BiSolidDownload />} colorScheme="primary" size="sm" />
                <IconButton aria-label={t("global.edit")} icon={<BiSolidEdit />} colorScheme="accent" size="sm" />
                <IconButton aria-label={t("global.delete")} icon={<BiSolidTrash />} colorScheme="danger" size="sm" onClick={() => props.onDelete(props.item.id)} />
            </HStack>
        </VStack>
    )
}

// 表格视图项
const DataAssetListItem = (props: { item: DataAsset; onDelete: (id: string) => void }) => {
    const t = useT()
    const style = getAssetStyle(props.item.type)
    return (
        <Tr>
            <Td>
                <HStack spacing="$2">
                    <Icon as={style.icon} color={`$${style.color}9`} />
                    <Text fontWeight="$medium">{props.item.name}</Text>
                </HStack>
            </Td>
            <Td><Badge colorScheme={style.color}>{t(`tenant.data.business.types.${props.item.type}`)}</Badge></Td>
            <Td>{props.item.size}</Td>
            <Td>{props.item.path}</Td>
            <Td>{props.item.lastModified}</Td>
            <Td>
                <HStack spacing="$2">
                    <IconButton aria-label={t("global.download")} icon={<BiSolidDownload />} colorScheme="primary" size="sm" />
                    <IconButton aria-label={t("global.edit")} icon={<BiSolidEdit />} colorScheme="accent" size="sm" />
                    <IconButton aria-label={t("global.delete")} icon={<BiSolidTrash />} colorScheme="danger" size="sm" onClick={() => props.onDelete(props.item.id)} />
                </HStack>
            </Td>
        </Tr>
    )
}

const BusinessData = () => {
    const t = useT()
    useManageTitle("tenant.data.business.title")

    // 状态定义
    const [dataAssets, setDataAssets] = createSignal<DataAsset[]>(mockDataAssets)
    const [loading, setLoading] = createSignal(false)
    const [layout, setLayout] = createStorageSignal<"grid" | "table">("business-data-layout", "grid")
    const [filterType, setFilterType] = createSignal<string>("all")

    // 3. 页面逻辑
    const refresh = async () => {
        setLoading(true)
        const resp: any = await api.getDataAssets()
        handleResp(resp, (data) => setDataAssets(data.content))
        setLoading(false)
    }

    const handleDelete = async (id: string) => {
        if (!confirm(t("tenant.data.business.confirm_delete"))) return;
        setLoading(true)
        const resp = await api.deleteDataAsset(id)
        handleResp(resp, () => {
            notify.success(t("global.delete_success"))
            refresh()
        })
        setLoading(false)
    }

    const filteredAssets = createMemo(() => {
        if (filterType() === 'all') return dataAssets();
        return dataAssets().filter(asset => asset.type === filterType());
    });

    return (
        <VStack w="$full" spacing="$5">
            <HStack w="$full" justifyContent="space-between" flexWrap="wrap" gap="$2">
                <Text fontSize="$2xl" fontWeight="bold">{t("tenant.data.business.title")}</Text>
                <HStack spacing="$2">
                    <Button colorScheme="accent" onClick={refresh} loading={loading()}>
                        {t("global.refresh")}
                    </Button>
                    <Button>{t("tenant.data.business.upload")}</Button>
                    <Select value={filterType()} onChange={setFilterType}>
                        <SelectTrigger>
                            <SelectValue>{t(`tenant.data.business.types.${filterType()}`)}</SelectValue>
                            <SelectIcon />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectListbox>
                                <For each={['all', 'image', 'document', 'config', 'log', 'dataset']}>
                                    {(item) => <SelectOption value={item}><SelectOptionText>{t(`tenant.data.business.types.${item}`)}</SelectOptionText></SelectOption>}
                                </For>
                            </SelectListbox>
                        </SelectContent>
                    </Select>
                    <HopeSwitch checked={layout() === "table"} onChange={(e: any) => setLayout(e.currentTarget.checked ? "table" : "grid")}>
                        {t("storages.other.table_layout")}
                    </HopeSwitch>
                </HStack>
            </HStack>

            {/* 4. UI渲染 */}
            <Show when={filteredAssets().length > 0}
                  fallback={
                      <Alert status="info" w="$full">
                          <AlertIcon />
                          <AlertTitle>{t("tenant.data.business.no_data")}</AlertTitle>
                          <AlertDescription>{t("tenant.data.business.no_data_desc")}</AlertDescription>
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
                        <For each={filteredAssets()}>
                            {(item) => <DataAssetGridItem item={item} onDelete={handleDelete} />}
                        </For>
                    </Grid>
                </Show>
                <Show when={layout() === 'table'}>
                    <Box w="$full" borderWidth="1px" borderRadius="$lg" p="$4" overflowX="auto"
                         background={useColorModeValue("$neutral2", "$neutral3")()}>
                        <Table dense>
                            <Thead>
                                <Tr>
                                    <Th>{t("tenant.data.business.name")}</Th>
                                    <Th>{t("tenant.data.business.type")}</Th>
                                    <Th>{t("tenant.data.business.size")}</Th>
                                    <Th>{t("tenant.data.business.path")}</Th>
                                    <Th>{t("tenant.data.business.last_modified")}</Th>
                                    <Th>{t("global.operations")}</Th>
                                </Tr>
                            </Thead>
                            <Tbody>
                                <For each={filteredAssets()}>
                                    {(item) => <DataAssetListItem item={item} onDelete={handleDelete} />}
                                </For>
                            </Tbody>
                        </Table>
                    </Box>
                </Show>
            </Show>
        </VStack>
    )
}

export default BusinessData