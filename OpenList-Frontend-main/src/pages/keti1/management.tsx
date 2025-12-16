import {
    Alert,
    AlertDescription,
    AlertIcon,
    AlertTitle,
    Badge,
    Box,
    Button,
    Container,
    FormControl,
    FormLabel,
    Heading,
    HStack,
    Icon,
    Input,
    Select,
    SelectContent,
    SelectIcon,
    SelectListbox,
    SelectOption,
    SelectOptionIndicator,
    SelectOptionText,
    SelectPlaceholder,
    SelectTrigger,
    SelectValue,
    SimpleGrid,
    Switch,
    Text,
    VStack,
} from "@hope-ui/solid";
import { createSignal, onMount, For, Show, createEffect } from "solid-js";
import {
    RiDocumentFileUploadFill,
    RiSystemCheckLine,
    RiSystemInformationFill
} from "solid-icons/ri";
import { notify, r } from "~/utils";

interface FileSystemItem {
    name: string;
    is_dir: boolean;
    path: string;
    abs_path: string;
}

export default function DataConversion() {
    // State
    const [formats, setFormats] = createSignal<string[]>([]);
    const [loadingFormats, setLoadingFormats] = createSignal(false);

    // File Selection State
    const [folders, setFolders] = createSignal<FileSystemItem[]>([]);
    const [files, setFiles] = createSignal<FileSystemItem[]>([]);

    const [selectedFolder, setSelectedFolder] = createSignal<string>("");
    const [selectedFile, setSelectedFile] = createSignal<string>("");
    const [selectedFileItem, setSelectedFileItem] = createSignal<FileSystemItem | null>(null);

    const [outputFormat, setOutputFormat] = createSignal<"pcap" | "pcapng">("pcapng");
    const [outputFilename, setOutputFilename] = createSignal("");

    // Single Conversion State
    const [singleOverwrite, setSingleOverwrite] = createSignal(false);
    const [convertingSingle, setConvertingSingle] = createSignal(false);

    const fetchFormats = async () => {
        setLoadingFormats(true);
        try {
            const res = await r.get("/keti1/convert/formats");
            if (res.code === 200) {
                setFormats(res.data.supported_formats);
            } else {
                notify.error(`获取格式失败: ${res.msg}`);
            }
        } catch (e) {
            notify.error("无法连接到转换服务");
        } finally {
            setLoadingFormats(false);
        }
    };

    const fetchFolders = async () => {
        try {
            const { fsList } = await import("~/utils/api");

            const rootPath = "/keti1/data";

            const res = await fsList(rootPath, "", 1, 1000);
            if (res.code === 200) {
                const content = res.data.content || [];
                const dirs = content.filter((item: any) => item.is_dir);
                setFolders(dirs.map((d: any) => ({
                    name: d.name,
                    is_dir: true,
                    path: `${rootPath}/${d.name}`,
                    abs_path: ""
                })));
            } else {
                notify.error(`获取目录失败: ${res.message}`);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const fetchFiles = async (folderPath: string) => {
        setFiles([]);
        setSelectedFile("");
        setSelectedFileItem(null);
        try {
            const { fsList } = await import("~/utils/api");
            const res = await fsList(folderPath, "", 1, 1000);
            if (res.code === 200) {
                const content = res.data.content || [];
                const fileItems = content.filter((item: any) => !item.is_dir);
                setFiles(fileItems.map((f: any) => ({
                    name: f.name,
                    is_dir: false,
                    path: `${folderPath}/${f.name}`,
                    abs_path: ""
                })));
            } else {
                notify.error(`获取文件失败: ${res.message}`);
            }
        } catch (e) {
            console.error(e);
        }
    };

    createEffect(() => {
        const item = selectedFileItem();
        if (item) {
            const name = item.name;
            const nameWithoutExt = name.substring(0, name.lastIndexOf('.')) || name;
            setOutputFilename(`${nameWithoutExt}.${outputFormat()}`);
        } else {
            // If format changes but file remains, update extension
            // logic handled by re-triggering effect on item change or explicit format change handler
        }
    });

    // Effect to update extension when format changes
    createEffect(() => {
        const format = outputFormat();
        const currentName = outputFilename();
        if (currentName) {
            const nameWithoutExt = currentName.substring(0, currentName.lastIndexOf('.')) || currentName;
            setOutputFilename(`${nameWithoutExt}.${format}`);
        }
    });

    const handleSingleConvert = async () => {
        if (!selectedFileItem()) {
            notify.warning("请选择源文件");
            return;
        }
        if (!outputFilename()) {
            notify.warning("请输入输出文件名");
            return;
        }

        const inputVirtualPath = selectedFileItem()!.path;
        // Construct output path based on format
        // pcap -> /keti1/data/pcap/
        // pcapng -> /keti1/data/pcapng/
        const outputDir = outputFormat() === "pcap" ? "pcap" : "pcapng";
        const outputVirtualPath = `/keti1/data/${outputDir}/${outputFilename()}`;

        setConvertingSingle(true);
        try {
            const res = await r.post("/keti1/convert/single", {
                input_path: inputVirtualPath,
                output_path: outputVirtualPath,
                overwrite: singleOverwrite(),
            });
            if (res.code === 200) {
                notify.success(`转换成功`);
            } else {
                let errorMsg = res.msg || res.message || res.data?.error || "未知错误";
                if (typeof errorMsg === 'string' && errorMsg.includes("输出文件已存在")) {
                    // Extract filename from the path
                    const parts = errorMsg.split(/[\\/]/);
                    const filename = parts[parts.length - 1];
                    errorMsg = `输出文件已存在: /${outputDir}/${filename}`;
                }
                notify.error(`转换失败: ${errorMsg}`);
            }
        } catch (e) {
            notify.error("转换过程中发生网络错误");
        } finally {
            setConvertingSingle(false);
        }
    };

    onMount(() => {
        fetchFormats();
        fetchFolders();
    });

    return (
        <Container maxW="$4xl" p="$4">
            <VStack spacing="$4" alignItems="stretch">

                {/* Header */}
                <Box>
                    <Heading size="xl" color="$primary11">数据格式转换</Heading>
                    <Text color="$neutral10" fontSize="sm">将特定格式数据包转换为 PCAP 标准格式</Text>
                </Box>

                {/* Main Conversion Card - Compact Design */}
                <Box
                    border="1px solid $neutral5"
                    rounded="$lg"
                    bg="$neutral1"
                    shadow="$sm"
                    overflow="hidden"
                >
                    <Box p="$6">
                        <VStack spacing="$5" alignItems="stretch">

                            {/* Row 1: Source Selection (2 Columns) */}
                            <SimpleGrid columns={{ "@initial": 1, "@md": 2 }} gap="$4">
                                {/* Folder Selection */}
                                <FormControl required>
                                    <FormLabel fontSize="sm" fontWeight="$medium">数据目录</FormLabel>
                                    <Select
                                        value={selectedFolder()}
                                        onChange={(val) => {
                                            setSelectedFolder(val);
                                            fetchFiles(val);
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectPlaceholder>请选择文件夹</SelectPlaceholder>
                                            <SelectValue />
                                            <SelectIcon />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectListbox>
                                                <For each={folders()}>
                                                    {(item) => (
                                                        <SelectOption value={item.path}>
                                                            <SelectOptionText>{item.name}</SelectOptionText>
                                                            <SelectOptionIndicator><Icon as={RiSystemCheckLine} /></SelectOptionIndicator>
                                                        </SelectOption>
                                                    )}
                                                </For>
                                            </SelectListbox>
                                        </SelectContent>
                                    </Select>
                                </FormControl>

                                {/* File Selection */}
                                <FormControl required>
                                    <FormLabel fontSize="sm" fontWeight="$medium">源文件</FormLabel>
                                    <Select
                                        value={selectedFile()}
                                        onChange={(val) => {
                                            setSelectedFile(val);
                                            const item = files().find(f => f.path === val);
                                            setSelectedFileItem(item || null);
                                        }}
                                        disabled={!selectedFolder()}
                                    >
                                        <SelectTrigger>
                                            <SelectPlaceholder>请选择文件</SelectPlaceholder>
                                            <SelectValue />
                                            <SelectIcon />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectListbox>
                                                <For each={files()}>
                                                    {(item) => (
                                                        <SelectOption value={item.path}>
                                                            <SelectOptionText>{item.name}</SelectOptionText>
                                                            <SelectOptionIndicator><Icon as={RiSystemCheckLine} /></SelectOptionIndicator>
                                                        </SelectOption>
                                                    )}
                                                </For>
                                            </SelectListbox>
                                        </SelectContent>
                                    </Select>
                                </FormControl>
                            </SimpleGrid>

                            {/* Row 2: Format & Output Setting */}
                            <SimpleGrid columns={{ "@initial": 1, "@md": 3 }} gap="$4">
                                {/* Format Selection */}
                                <FormControl>
                                    <FormLabel fontSize="sm" fontWeight="$medium">目标格式</FormLabel>
                                    <Select
                                        value={outputFormat()}
                                        onChange={(val: any) => setOutputFormat(val)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                            <SelectIcon />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectListbox>
                                                <SelectOption value="pcapng">
                                                    <SelectOptionText>PCAPNG (推荐)</SelectOptionText>
                                                    <SelectOptionIndicator><Icon as={RiSystemCheckLine} /></SelectOptionIndicator>
                                                </SelectOption>
                                                <SelectOption value="pcap">
                                                    <SelectOptionText>PCAP (兼容)</SelectOptionText>
                                                    <SelectOptionIndicator><Icon as={RiSystemCheckLine} /></SelectOptionIndicator>
                                                </SelectOption>
                                            </SelectListbox>
                                        </SelectContent>
                                    </Select>
                                </FormControl>

                                {/* Output Filename (Span 2 cols) */}
                                <FormControl style={{ "grid-column": "span 2" }}>
                                    <FormLabel fontSize="sm" fontWeight="$medium">输出文件名</FormLabel>
                                    <HStack spacing="$0" alignItems="stretch">
                                        <Box
                                            bg="$neutral3"
                                            px="$3"
                                            display="flex"
                                            alignItems="center"
                                            border="1px solid $neutral6"
                                            borderRight="none"
                                            borderTopLeftRadius="$md"
                                            borderBottomLeftRadius="$md"
                                        >
                                            <Text color="$neutral11" fontSize="sm" fontWeight="$bold">/{outputFormat()}/</Text>
                                        </Box>
                                        <Input
                                            size="md"
                                            placeholder="输入文件名"
                                            value={outputFilename()}
                                            onInput={(e) => setOutputFilename(e.currentTarget.value)}
                                            borderTopLeftRadius="0"
                                            borderBottomLeftRadius="0"
                                        />
                                    </HStack>
                                </FormControl>
                            </SimpleGrid>

                            <Box h="1px" bg="$neutral4" />

                            {/* Row 3: Action & Options */}
                            <HStack justifyContent="space-between" alignItems="center">
                                <FormControl display="flex" alignItems="center" w="auto">
                                    <Switch
                                        id="single-overwrite"
                                        size="sm"
                                        checked={singleOverwrite()}
                                        onChange={(e) => setSingleOverwrite(e.currentTarget.checked)}
                                        colorScheme="primary"
                                    />
                                    <FormLabel for="single-overwrite" mb="0" ml="$2" fontSize="sm" cursor="pointer">覆盖文件</FormLabel>
                                </FormControl>

                                <Button
                                    onClick={handleSingleConvert}
                                    loading={convertingSingle()}
                                    colorScheme="primary"
                                    size="md"
                                    px="$6"
                                >
                                    开始转换
                                </Button>
                            </HStack>
                        </VStack>
                    </Box>

                    {/* Footer: Supported Formats */}
                    <Box bg="$neutral2" p="$3" borderTop="1px solid $neutral4">
                        <Box overflowX="auto" style={{ "white-space": "nowrap" }}>
                            <HStack spacing="$2">
                                <Text fontSize="xs" color="$neutral10" fontWeight="$bold">支持格式:</Text>
                                <Show when={formats().length > 0} fallback={<Text fontSize="xs" color="$neutral9">...</Text>}>
                                    <For each={formats()}>
                                        {(fmt) => <Badge colorScheme="neutral" variant="outline" fontSize="xs" px="$1.5">{fmt}</Badge>}
                                    </For>
                                </Show>
                            </HStack>
                        </Box>
                    </Box>
                </Box>
            </VStack>
        </Container>
    );
}
