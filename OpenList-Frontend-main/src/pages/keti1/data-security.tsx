import { Component, createSignal, createEffect, For, Show } from "solid-js";
import {
    Box, VStack, HStack,
    Button, Input, Textarea, Table, Thead, Tbody, Tr, Th, Td,
    Text, Badge, IconButton, Icon,
    Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalOverlay,
    FormControl, FormLabel, FormErrorMessage,
    Select, SelectTrigger, SelectValue, SelectContent, SelectListbox, SelectOption, SelectOptionText,
    Progress, Alert, AlertIcon, AlertTitle, AlertDescription
} from "@hope-ui/solid";
import { BiSolidEdit, BiSolidTrash, BiSolidPlusCircle, BiSolidSave, BiSolidFileImport, BiSolidData, BiRegularTime, BiRegularUser, BiRegularDetail } from "solid-icons/bi";
import { r } from "~/utils";
import { notify, handleResp } from "~/utils";
import * as addonApi from "~/utils/addon";
import { useManageTitle } from "~/hooks";
import { Paginator } from "~/components/Paginator";
import DataConversion from "./management";

// PCAP Analysis API
const pcapApi = {
    listFiles: async () => {
        return r.get("/keti1/pcap/list")
    },
    parseFile: async (filename: string) => {
        return r.post("/keti1/pcap/parse", { filename })
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

const mockAuditLogs: AuditLog[] = [
    { id: "audit-01", timestamp: "2023-06-01 10:05:22", operator: "admin", action: "新增解析配置", target: "XMLParser", result: "success" },
    { id: "audit-02", timestamp: "2023-06-01 11:30:15", operator: "user1", action: "执行数据转换", target: "SensorData.json", result: "success" },
    { id: "audit-03", timestamp: "2023-06-02 09:12:44", operator: "admin", action: "删除结构定义", target: "LegacyStruct", result: "failure" },
    { id: "audit-04", timestamp: "2023-06-02 15:45:30", operator: "manager", action: "导出审计日志", target: "All Logs", result: "success" },
    { id: "audit-05", timestamp: "2023-06-03 08:20:10", operator: "system", action: "自动备份", target: "Database", result: "success" },
]

// 类型定义 - 与后端 addon_models.go 保持一致


interface ICSProtocol {
    id?: number;
    name: string;
    version: string;
    scene: string;         // 适用场景
    remark: string;        // 协议备注说明
    status: number;        // 状态：1=启用，0=禁用
    created_at?: string;
}

interface ICSDevice {
    id?: number;
    device_name: string;      // 设备名称
    protocol_id: number;      // 关联协议ID
    scene: string;            // 所属工控场景
    status: number;           // 状态：1=正常，0=停用
    remark: string;           // 设备描述或备注
    created_at?: string;
    protocol?: ICSProtocol;   // 关联的协议对象
}

interface ICSDevicePoint {
    id?: number;
    device_id: number;        // 关联设备ID
    point_name: string;       // 场量名称
    point_type: string;       // 场量类型：模拟量/开关量/状态量
    address: string;          // 寄存器地址
    unit: string;             // 单位
    tags: string;             // 标签
    status: number;           // 状态：1=正常，0=禁用
    created_at?: string;
    device?: ICSDevice;       // 关联的设备对象
}

const DataSecurityManagement: Component = () => {
    useManageTitle("数据管理");

    // 标签页状态
    const [activeTab, setActiveTab] = createSignal(0);
    const [loading, setLoading] = createSignal(false);

    // 模态框状态
    const [isModalOpen, setIsModalOpen] = createSignal(false);
    const [formErrors, setFormErrors] = createSignal<{ [key: string]: string }>({});



    // 工控协议相关状态
    const [protocols, setProtocols] = createSignal<ICSProtocol[]>([]);
    const [currentProtocol, setCurrentProtocol] = createSignal<ICSProtocol | null>(null);
    const [protocolForm, setProtocolForm] = createSignal<ICSProtocol>({
        name: "",
        version: "",
        scene: "",
        remark: "",
        status: 1
    });

    // 工控设备相关状态
    const [devices, setDevices] = createSignal<ICSDevice[]>([]);
    const [currentDevice, setCurrentDevice] = createSignal<ICSDevice | null>(null);
    const [deviceForm, setDeviceForm] = createSignal<ICSDevice>({
        device_name: "",
        protocol_id: 0,
        scene: "",
        remark: "",
        status: 1
    });

    // 设备场量点相关状态
    const [points, setPoints] = createSignal<ICSDevicePoint[]>([]);
    const [currentPoint, setCurrentPoint] = createSignal<ICSDevicePoint | null>(null);
    const [pointForm, setPointForm] = createSignal<ICSDevicePoint>({
        point_name: "",
        device_id: 0,
        point_type: "",
        address: "",
        unit: "",
        tags: "",
        status: 1
    });

    // 分页状态
    const [protocolPage, setProtocolPage] = createSignal(1);
    const [protocolPageSize, setProtocolPageSize] = createSignal(7);
    const [protocolTotal, setProtocolTotal] = createSignal(0);

    const [devicePage, setDevicePage] = createSignal(1);
    const [devicePageSize, setDevicePageSize] = createSignal(7);
    const [deviceTotal, setDeviceTotal] = createSignal(0);

    const [pointPage, setPointPage] = createSignal(1);
    const [pointPageSize, setPointPageSize] = createSignal(7);
    const [pointTotal, setPointTotal] = createSignal(0);

    // Data Migration States
    const [pcapFiles, setPcapFiles] = createSignal<string[]>([]);
    const [selectedFile, setSelectedFile] = createSignal("");
    const [parseResult, setParseResult] = createSignal<PcapParseResult | null>(null);
    const [parsing, setParsing] = createSignal(false);
    const [expandedPackets, setExpandedPackets] = createSignal<Set<string>>(new Set());

    const [transformationForm, setTransformationForm] = createSignal<TransformationConfig>({
        id: "", name: "", sourceStructure: "", targetStructure: "", mappingRule: "", status: "active"
    });
    const [parsingForm, setParsingForm] = createSignal<ParsingConfig>({
        id: "", name: "", sourceFormat: "", targetFormat: "", parserType: "", status: "active"
    });
    const [currentTransformation, setCurrentTransformation] = createSignal<TransformationConfig | null>(null);
    const [currentParsing, setCurrentParsing] = createSignal<ParsingConfig | null>(null);

    // 加载数据


    // 加载数据
    const loadPcapFiles = async () => {
        // setLoading(true); // Avoid global loading for background fetch
        const resp = await pcapApi.listFiles();
        handleResp(resp, (data: any) => {
            setPcapFiles(data || []);
        });
        // setLoading(false);
    };

    const handleParsePcap = async () => {
        if (!selectedFile()) {
            notify.warning("请先选择 PCAP 文件");
            return;
        }

        setParsing(true);
        setParseResult(null);
        const resp = await pcapApi.parseFile(selectedFile());
        handleResp(resp, (result: any) => {
            setParseResult(result as PcapParseResult);
            notify.success(`解析完成！共扫描 ${result.meta?.total_scanned || 0} 个数据包，识别 ${result.meta?.valid_packets || 0} 个有效包`);
        }, (msg: string) => {
            notify.error(msg || "解析失败");
        });
        setParsing(false);
    };

    const togglePacketExpansion = (packetNo: string) => {
        const expanded = new Set(expandedPackets());
        if (expanded.has(packetNo)) {
            expanded.delete(packetNo);
        } else {
            expanded.add(packetNo);
        }
        setExpandedPackets(expanded);
    };

    const deleteMockConfig = async (id: string) => {
        if (confirm("确定要删除此项配置吗？")) {
            notify.success("删除成功");
        }
    }


    const loadProtocols = async (page = protocolPage(), size = protocolPageSize()) => {
        setLoading(true);
        try {
            const resp: any = await addonApi.getICSProtocols(page, size);
            handleResp(resp, (data: any) => {
                setProtocols(data.content || []);
                setProtocolTotal(data.total || 0);
            });
        } catch (error) {
            console.error('加载工控协议失败:', error);
            setProtocols([]);
        } finally {
            setLoading(false);
        }
    };

    const loadDevices = async (page = devicePage(), size = devicePageSize()) => {
        setLoading(true);
        try {
            const resp: any = await addonApi.getICSDevices(page, size);
            handleResp(resp, (data: any) => {
                setDevices(data.content || []);
                setDeviceTotal(data.total || 0);
            });
        } catch (error) {
            console.error('加载工控设备失败:', error);
            setDevices([]);
        } finally {
            setLoading(false);
        }
    };

    const loadPoints = async (page = pointPage(), size = pointPageSize()) => {
        setLoading(true);
        try {
            const resp: any = await addonApi.getICSDevicePoints(page, size);
            handleResp(resp, (data: any) => {
                setPoints(data.content || []);
                setPointTotal(data.total || 0);
            });
        } catch (error) {
            console.error('加载设备场量点失败:', error);
            setPoints([]);
        } finally {
            setLoading(false);
        }
    };

    // 初始化加载所有数据
    createEffect(() => {
        loadProtocols();
        loadDevices();
        loadPoints();
        loadPcapFiles();
    });

    // 表单验证


    const validateProtocolForm = () => {
        const errors: { [key: string]: string } = {};
        if (!protocolForm().name) errors.name = "协议名称不能为空";
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const validateDeviceForm = () => {
        const errors: { [key: string]: string } = {};
        if (!deviceForm().device_name) errors.device_name = "设备名称不能为空";
        if (!deviceForm().protocol_id) errors.protocol_id = "请选择关联协议";
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const validatePointForm = () => {
        const errors: { [key: string]: string } = {};
        if (!pointForm().point_name) errors.point_name = "场量名称不能为空";
        if (!pointForm().device_id) errors.device_id = "请选择关联设备";
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // 分页处理
    const handleProtocolPageChange = (page: number) => {
        setProtocolPage(page);
        loadProtocols(page, protocolPageSize());
    };

    const handleProtocolPageSizeChange = (size: number) => {
        setProtocolPageSize(size);
        setProtocolPage(1);
        loadProtocols(1, size);
    };

    const handleDevicePageChange = (page: number) => {
        setDevicePage(page);
        loadDevices(page, devicePageSize());
    };

    const handleDevicePageSizeChange = (size: number) => {
        setDevicePageSize(size);
        setDevicePage(1);
        loadDevices(1, size);
    };

    const handlePointPageChange = (page: number) => {
        setPointPage(page);
        loadPoints(page, pointPageSize());
    };

    const handlePointPageSizeChange = (size: number) => {
        setPointPageSize(size);
        setPointPage(1);
        loadPoints(1, size);
    };

    // 表单提交


    const handleProtocolSubmit = async () => {
        if (!validateProtocolForm()) return;
        setLoading(true);
        try {
            const form = protocolForm();
            if (currentProtocol()) {
                const resp: any = await addonApi.updateICSProtocol(currentProtocol()!.id!, form);
                handleResp(resp, () => {
                    notify.success("协议更新成功");
                    loadProtocols();
                    closeModal();
                });
            } else {
                const resp: any = await addonApi.createICSProtocol(form);
                handleResp(resp, () => {
                    notify.success("协议创建成功");
                    loadProtocols();
                    closeModal();
                });
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDeviceSubmit = async () => {
        if (!validateDeviceForm()) return;
        setLoading(true);
        try {
            const form = deviceForm();
            if (currentDevice()) {
                const resp: any = await addonApi.updateICSDevice(currentDevice()!.id!, form);
                handleResp(resp, () => {
                    notify.success("设备更新成功");
                    loadDevices();
                    closeModal();
                });
            } else {
                const resp: any = await addonApi.createICSDevice(form);
                handleResp(resp, () => {
                    notify.success("设备创建成功");
                    loadDevices();
                    closeModal();
                });
            }
        } finally {
            setLoading(false);
        }
    };

    const handlePointSubmit = async () => {
        if (!validatePointForm()) return;
        setLoading(true);
        try {
            const form = pointForm();
            if (currentPoint()) {
                const resp: any = await addonApi.updateICSDevicePoint(currentPoint()!.id!, form);
                handleResp(resp, () => {
                    notify.success("场量点更新成功");
                    loadPoints();
                    closeModal();
                });
            } else {
                const resp: any = await addonApi.createICSDevicePoint(form);
                handleResp(resp, () => {
                    notify.success("场量点创建成功");
                    loadPoints();
                    closeModal();
                });
            }
        } finally {
            setLoading(false);
        }
    };

    // 删除操作


    const deleteProtocol = async (id: number) => {
        if (confirm("确认删除该工控协议吗？")) {
            setLoading(true);
            try {
                const resp: any = await addonApi.deleteICSProtocol(id);
                handleResp(resp, () => {
                    notify.success("协议删除成功");
                    loadProtocols();
                    loadDevices(); // 关联数据可能受影响
                });
            } finally {
                setLoading(false);
            }
        }
    };

    const deleteDevice = async (id: number) => {
        if (confirm("确认删除该工控设备吗？")) {
            setLoading(true);
            try {
                const resp: any = await addonApi.deleteICSDevice(id);
                handleResp(resp, () => {
                    notify.success("设备删除成功");
                    loadDevices();
                    loadPoints(); // 关联数据可能受影响
                });
            } finally {
                setLoading(false);
            }
        }
    };

    const deletePoint = async (id: number) => {
        if (confirm("确认删除该设备场量点吗？")) {
            setLoading(true);
            try {
                const resp: any = await addonApi.deleteICSDevicePoint(id);
                handleResp(resp, () => {
                    notify.success("场量点删除成功");
                    loadPoints();
                });
            } finally {
                setLoading(false);
            }
        }
    };

    // 打开模态框
    const openAddModal = () => {
        setFormErrors({});
        if (activeTab() === 0) {
            setCurrentProtocol(null);
            setProtocolForm({ name: "", version: "", scene: "", remark: "", status: 1 });
        } else if (activeTab() === 1) {
            setCurrentDevice(null);
            setDeviceForm({ device_name: "", protocol_id: 0, scene: "", remark: "", status: 1 });
        } else if (activeTab() === 2) {
            setCurrentPoint(null);
            setPointForm({ point_name: "", device_id: 0, point_type: "", address: "", unit: "", tags: "", status: 1 });
        } else if (activeTab() === 3) {
            setCurrentTransformation(null);
            setTransformationForm({ id: "", name: "", sourceStructure: "", targetStructure: "", mappingRule: "", status: "active" });
        } else if (activeTab() === 4) {
            setCurrentParsing(null);
            setParsingForm({ id: "", name: "", sourceFormat: "", targetFormat: "", parserType: "", status: "active" });
        }
        setIsModalOpen(true);
    };

    const openEditModal = (item: any) => {
        setFormErrors({});
        if (activeTab() === 0) {
            setCurrentProtocol(item);
            setProtocolForm({ ...item });
        } else if (activeTab() === 1) {
            setCurrentDevice(item);
            setDeviceForm({ ...item });
        } else if (activeTab() === 2) {
            setCurrentPoint(item);
            setPointForm({ ...item });
        } else if (activeTab() === 3) {
            setCurrentTransformation(item);
            setTransformationForm({ ...item });
        } else if (activeTab() === 4) {
            setCurrentParsing(item);
            setParsingForm({ ...item });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
    };

    const getModalTitle = () => {
        const action = currentProtocol() || currentDevice() || currentPoint() || currentTransformation() || currentParsing() ? "编辑" : "新增";
        const typeMap: { [key: number]: string } = {
            0: "工控协议",
            1: "工控设备",
            2: "设备场量点",
            3: "数据转换配置",
            4: "数据解析配置"
        };
        return `${action}${typeMap[activeTab()] || ""}`;
    };

    return (
        <VStack spacing="$4" alignItems="stretch" w="$full">
            <Text fontSize="$xl" fontWeight="$bold">众测数据保障系统</Text>

            <VStack spacing="$4" alignItems="stretch">
                <HStack spacing="$2" borderBottom="1px solid $neutral6" pb="$2" justifyContent="space-between">
                    <HStack spacing="$2">
                        <Button variant={activeTab() === 0 ? "solid" : "ghost"} colorScheme={activeTab() === 0 ? "primary" : "neutral"} onClick={() => setActiveTab(0)}>工控协议管理</Button>
                        <Button variant={activeTab() === 1 ? "solid" : "ghost"} colorScheme={activeTab() === 1 ? "primary" : "neutral"} onClick={() => setActiveTab(1)}>工控设备管理</Button>
                        <Button variant={activeTab() === 2 ? "solid" : "ghost"} colorScheme={activeTab() === 2 ? "primary" : "neutral"} onClick={() => setActiveTab(2)}>设备场量点管理</Button>
                        <Button variant={activeTab() === 3 ? "solid" : "ghost"} colorScheme={activeTab() === 3 ? "primary" : "neutral"} onClick={() => setActiveTab(3)}>数据转换</Button>
                        <Button variant={activeTab() === 4 ? "solid" : "ghost"} colorScheme={activeTab() === 4 ? "primary" : "neutral"} onClick={() => setActiveTab(4)}>数据解析</Button>
                        <Button variant={activeTab() === 5 ? "solid" : "ghost"} colorScheme={activeTab() === 5 ? "primary" : "neutral"} onClick={() => setActiveTab(5)}>数据审计</Button>
                    </HStack>
                    <Show when={activeTab() !== 5}>
                        <Button leftIcon={<Icon as={BiSolidPlusCircle} />} colorScheme="primary" onClick={openAddModal}>
                            新增
                        </Button>
                    </Show>
                </HStack>

                {/* 安全策略管理面板 */}


                {/* 工控协议管理面板 */}
                <Show when={activeTab() === 0}>
                    <Box overflowX="auto" borderWidth="1px" borderRadius="$lg">
                        <Table dense>
                            <Thead>
                                <Tr>
                                    <Th>ID</Th>
                                    <Th>协议名称</Th>
                                    <Th>版本</Th>
                                    <Th>适用场景</Th>
                                    <Th>状态</Th>
                                    <Th>创建时间</Th>
                                    <Th>操作</Th>
                                </Tr>
                            </Thead>
                            <Tbody>
                                <For each={protocols()}>
                                    {(protocol) => (
                                        <Tr>
                                            <Td>{protocol.id}</Td>
                                            <Td>{protocol.name}</Td>
                                            <Td>{protocol.version}</Td>
                                            <Td>{protocol.scene}</Td>
                                            <Td>
                                                <Badge colorScheme={protocol.status === 1 ? "success" : "danger"}>
                                                    {protocol.status === 1 ? "启用" : "禁用"}
                                                </Badge>
                                            </Td>
                                            <Td>{protocol.created_at}</Td>
                                            <Td>
                                                <HStack spacing="$2">
                                                    <IconButton aria-label="编辑" icon={<BiSolidEdit />} size="sm" onClick={() => openEditModal(protocol)} />
                                                    <IconButton aria-label="删除" icon={<BiSolidTrash />} colorScheme="danger" size="sm" onClick={() => deleteProtocol(protocol.id!)} />
                                                </HStack>
                                            </Td>
                                        </Tr>
                                    )}
                                </For>
                            </Tbody>
                        </Table>
                    </Box>
                    <HStack justifyContent="flex-end" pt="$4">
                        <Paginator
                            total={protocolTotal()}
                            defaultCurrent={protocolPage()}
                            defaultPageSize={protocolPageSize()}
                            onChange={handleProtocolPageChange}
                            colorScheme="primary"
                        />
                    </HStack>
                </Show>

                {/* 工控设备管理面板 */}
                <Show when={activeTab() === 1}>
                    <Box overflowX="auto" borderWidth="1px" borderRadius="$lg">
                        <Table dense>
                            <Thead>
                                <Tr>
                                    <Th>ID</Th>
                                    <Th>设备名称</Th>
                                    <Th>协议</Th>
                                    <Th>工控场景</Th>
                                    <Th>状态</Th>
                                    <Th>创建时间</Th>
                                    <Th>操作</Th>
                                </Tr>
                            </Thead>
                            <Tbody>
                                <For each={devices()}>
                                    {(device) => (
                                        <Tr>
                                            <Td>{device.id}</Td>
                                            <Td>{device.device_name}</Td>
                                            <Td>{device.protocol?.name || "未知协议"}</Td>
                                            <Td>{device.scene}</Td>
                                            <Td>
                                                <Badge colorScheme={device.status === 1 ? "success" : "danger"}>
                                                    {device.status === 1 ? "正常" : "停用"}
                                                </Badge>
                                            </Td>
                                            <Td>{device.created_at}</Td>
                                            <Td>
                                                <HStack spacing="$2">
                                                    <IconButton aria-label="编辑" icon={<BiSolidEdit />} size="sm" onClick={() => openEditModal(device)} />
                                                    <IconButton aria-label="删除" icon={<BiSolidTrash />} colorScheme="danger" size="sm" onClick={() => deleteDevice(device.id!)} />
                                                </HStack>
                                            </Td>
                                        </Tr>
                                    )}
                                </For>
                            </Tbody>
                        </Table>
                    </Box>
                    <HStack justifyContent="flex-end" pt="$4">
                        <Paginator
                            total={deviceTotal()}
                            defaultCurrent={devicePage()}
                            defaultPageSize={devicePageSize()}
                            onChange={handleDevicePageChange}
                            colorScheme="primary"
                        />
                    </HStack>
                </Show>

                {/* 设备场量点管理面板 */}
                <Show when={activeTab() === 2}>
                    <Box overflowX="auto" borderWidth="1px" borderRadius="$lg">
                        <Table dense>
                            <Thead>
                                <Tr>
                                    <Th>ID</Th>
                                    <Th>场量名称</Th>
                                    <Th>所属设备</Th>
                                    <Th>类型</Th>
                                    <Th>地址</Th>
                                    <Th>状态</Th>
                                    <Th>操作</Th>
                                </Tr>
                            </Thead>
                            <Tbody>
                                <For each={points()}>
                                    {(point) => (
                                        <Tr>
                                            <Td>{point.id}</Td>
                                            <Td>{point.point_name}</Td>
                                            <Td>{point.device?.device_name || "未知设备"}</Td>
                                            <Td>{point.point_type}</Td>
                                            <Td>{point.address}</Td>
                                            <Td>
                                                <Badge colorScheme={point.status === 1 ? "success" : "danger"}>
                                                    {point.status === 1 ? "正常" : "禁用"}
                                                </Badge>
                                            </Td>
                                            <Td>
                                                <HStack spacing="$2">
                                                    <IconButton aria-label="编辑" icon={<BiSolidEdit />} size="sm" onClick={() => openEditModal(point)} />
                                                    <IconButton aria-label="删除" icon={<BiSolidTrash />} colorScheme="danger" size="sm" onClick={() => deletePoint(point.id!)} />
                                                </HStack>
                                            </Td>
                                        </Tr>
                                    )}
                                </For>
                            </Tbody>
                        </Table>
                    </Box>
                    <HStack justifyContent="flex-end" pt="$4">
                        <Paginator
                            total={pointTotal()}
                            defaultCurrent={pointPage()}
                            defaultPageSize={pointPageSize()}
                            onChange={handlePointPageChange}
                            colorScheme="primary"
                        />
                    </HStack>
                </Show>

                {/* 数据转换管理面板 */}
                <Show when={activeTab() === 3}>
                    <Box borderWidth="1px" borderRadius="$lg" overflow="hidden">
                        <DataConversion />
                    </Box>
                </Show>

                {/* 数据解析管理面板 */}
                <Show when={activeTab() === 4}>
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
                                            <Table dense>
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
                                                                                <Table dense>
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


                    </VStack>
                </Show>

                {/* 数据审计管理面板 */}
                <Show when={activeTab() === 5}>
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
            </VStack>

            {/* 通用模态框 */}
            <Modal opened={isModalOpen()} onClose={closeModal} size="lg">
                <ModalOverlay />
                <ModalContent>
                    <ModalCloseButton />
                    <ModalHeader>{getModalTitle()}</ModalHeader>
                    <ModalBody>
                        <VStack spacing="$4">
                            {/* 安全策略表单 */}


                            {/* 工控协议表单 */}
                            {/* 工控协议表单 */}
                            <Show when={activeTab() === 0}>
                                <FormControl invalid={!!formErrors().name}>
                                    <FormLabel>协议名称</FormLabel>
                                    <Input value={protocolForm().name} onInput={(e) => setProtocolForm({ ...protocolForm(), name: e.currentTarget.value })} />
                                    <FormErrorMessage>{formErrors().name}</FormErrorMessage>
                                </FormControl>
                                <FormControl>
                                    <FormLabel>版本</FormLabel>
                                    <Input value={protocolForm().version} onInput={(e) => setProtocolForm({ ...protocolForm(), version: e.currentTarget.value })} />
                                </FormControl>
                                <FormControl>
                                    <FormLabel>适用场景</FormLabel>
                                    <Input value={protocolForm().scene} onInput={(e) => setProtocolForm({ ...protocolForm(), scene: e.currentTarget.value })} />
                                </FormControl>
                                <FormControl>
                                    <FormLabel>状态</FormLabel>
                                    <select
                                        class="hope-select"
                                        style={{
                                            "background-color": "var(--hope-colors-neutral3)",
                                            "border-color": "transparent",
                                            "color": "var(--hope-colors-neutral12)",
                                            "height": "2.5rem",
                                            "padding-inline-start": "1rem",
                                            "padding-inline-end": "2rem",
                                            "border-radius": "var(--hope-radii-md)",
                                            "font-size": "var(--hope-fontSizes-sm)",
                                            "outline": "none",
                                            "border-width": "1px",
                                            "transition": "border-color 200ms"
                                        }}
                                        value={String(protocolForm().status)}
                                        onChange={(e) => setProtocolForm({ ...protocolForm(), status: parseInt(e.currentTarget.value) })}
                                    >
                                        <option value="1">启用</option>
                                        <option value="0">禁用</option>
                                    </select>
                                </FormControl>
                                <FormControl>
                                    <FormLabel>备注</FormLabel>
                                    <Textarea value={protocolForm().remark} onInput={(e) => setProtocolForm({ ...protocolForm(), remark: e.currentTarget.value })} />
                                </FormControl>
                            </Show>

                            {/* 工控设备表单 */}
                            {/* 工控设备表单 */}
                            <Show when={activeTab() === 1}>
                                <FormControl invalid={!!formErrors().device_name}>
                                    <FormLabel>设备名称</FormLabel>
                                    <Input value={deviceForm().device_name} onInput={(e) => setDeviceForm({ ...deviceForm(), device_name: e.currentTarget.value })} />
                                    <FormErrorMessage>{formErrors().device_name}</FormErrorMessage>
                                </FormControl>
                                <FormControl invalid={!!formErrors().protocol_id}>
                                    <FormLabel>关联协议</FormLabel>
                                    <select
                                        class="hope-select"
                                        style={{
                                            "background-color": "var(--hope-colors-neutral3)",
                                            "border-color": "transparent",
                                            "color": "var(--hope-colors-neutral12)",
                                            "height": "2.5rem",
                                            "padding-inline-start": "1rem",
                                            "padding-inline-end": "2rem",
                                            "border-radius": "var(--hope-radii-md)",
                                            "font-size": "var(--hope-fontSizes-sm)",
                                            "outline": "none",
                                            "border-width": "1px",
                                            "transition": "border-color 200ms"
                                        }}
                                        value={String(deviceForm().protocol_id)}
                                        onChange={(e) => setDeviceForm({ ...deviceForm(), protocol_id: parseInt(e.currentTarget.value) })}
                                    >
                                        <option value="0">选择协议</option>
                                        <For each={protocols()}>
                                            {(protocol) => (
                                                <option value={protocol.id}>{protocol.name}</option>
                                            )}
                                        </For>
                                    </select>
                                    <FormErrorMessage>{formErrors().protocol_id}</FormErrorMessage>
                                </FormControl>
                                <FormControl>
                                    <FormLabel>工控场景</FormLabel>
                                    <Input value={deviceForm().scene} onInput={(e) => setDeviceForm({ ...deviceForm(), scene: e.currentTarget.value })} />
                                </FormControl>
                                <FormControl>
                                    <FormLabel>状态</FormLabel>
                                    <select
                                        class="hope-select"
                                        style={{
                                            "background-color": "var(--hope-colors-neutral3)",
                                            "border-color": "transparent",
                                            "color": "var(--hope-colors-neutral12)",
                                            "height": "2.5rem",
                                            "padding-inline-start": "1rem",
                                            "padding-inline-end": "2rem",
                                            "border-radius": "var(--hope-radii-md)",
                                            "font-size": "var(--hope-fontSizes-sm)",
                                            "outline": "none",
                                            "border-width": "1px",
                                            "transition": "border-color 200ms"
                                        }}
                                        value={String(deviceForm().status)}
                                        onChange={(e) => setDeviceForm({ ...deviceForm(), status: parseInt(e.currentTarget.value) })}
                                    >
                                        <option value="1">正常</option>
                                        <option value="0">停用</option>
                                    </select>
                                </FormControl>
                                <FormControl>
                                    <FormLabel>备注</FormLabel>
                                    <Textarea value={deviceForm().remark} onInput={(e) => setDeviceForm({ ...deviceForm(), remark: e.currentTarget.value })} />
                                </FormControl>
                            </Show>

                            {/* 设备场量点表单 */}
                            {/* 设备场量点表单 */}
                            <Show when={activeTab() === 2}>
                                <FormControl invalid={!!formErrors().point_name}>
                                    <FormLabel>场量名称</FormLabel>
                                    <Input value={pointForm().point_name} onInput={(e) => setPointForm({ ...pointForm(), point_name: e.currentTarget.value })} />
                                    <FormErrorMessage>{formErrors().point_name}</FormErrorMessage>
                                </FormControl>
                                <FormControl invalid={!!formErrors().device_id}>
                                    <FormLabel>关联设备</FormLabel>
                                    <select
                                        class="hope-select"
                                        style={{
                                            "background-color": "var(--hope-colors-neutral3)",
                                            "border-color": "transparent",
                                            "color": "var(--hope-colors-neutral12)",
                                            "height": "2.5rem",
                                            "padding-inline-start": "1rem",
                                            "padding-inline-end": "2rem",
                                            "border-radius": "var(--hope-radii-md)",
                                            "font-size": "var(--hope-fontSizes-sm)",
                                            "outline": "none",
                                            "border-width": "1px",
                                            "transition": "border-color 200ms"
                                        }}
                                        value={String(pointForm().device_id)}
                                        onChange={(e) => setPointForm({ ...pointForm(), device_id: parseInt(e.currentTarget.value) })}
                                    >
                                        <option value="0">选择设备</option>
                                        <For each={devices()}>
                                            {(device) => (
                                                <option value={device.id}>{device.device_name}</option>
                                            )}
                                        </For>
                                    </select>
                                    <FormErrorMessage>{formErrors().device_id}</FormErrorMessage>
                                </FormControl>
                                <FormControl>
                                    <FormLabel>场量类型</FormLabel>
                                    <Input value={pointForm().point_type} onInput={(e) => setPointForm({ ...pointForm(), point_type: e.currentTarget.value })} />
                                </FormControl>
                                <FormControl>
                                    <FormLabel>地址</FormLabel>
                                    <Input value={pointForm().address} onInput={(e) => setPointForm({ ...pointForm(), address: e.currentTarget.value })} />
                                </FormControl>
                                <FormControl>
                                    <FormLabel>单位</FormLabel>
                                    <Input value={pointForm().unit} onInput={(e) => setPointForm({ ...pointForm(), unit: e.currentTarget.value })} />
                                </FormControl>
                                <FormControl>
                                    <FormLabel>状态</FormLabel>
                                    <select
                                        class="hope-select"
                                        style={{
                                            "background-color": "var(--hope-colors-neutral3)",
                                            "border-color": "transparent",
                                            "color": "var(--hope-colors-neutral12)",
                                            "height": "2.5rem",
                                            "padding-inline-start": "1rem",
                                            "padding-inline-end": "2rem",
                                            "border-radius": "var(--hope-radii-md)",
                                            "font-size": "var(--hope-fontSizes-sm)",
                                            "outline": "none",
                                            "border-width": "1px",
                                            "transition": "border-color 200ms"
                                        }}
                                        value={String(pointForm().status)}
                                        onChange={(e) => setPointForm({ ...pointForm(), status: parseInt(e.currentTarget.value) })}
                                    >
                                        <option value="1">正常</option>
                                        <option value="0">禁用</option>
                                    </select>
                                </FormControl>
                            </Show>

                            {/* 数据转换表单 */}
                            <Show when={activeTab() === 3}>
                                <FormControl>
                                    <FormLabel>源结构</FormLabel>
                                    <Input
                                        value={transformationForm().sourceStructure}
                                        onInput={(e) => setTransformationForm({ ...transformationForm(), sourceStructure: e.currentTarget.value })}
                                    />
                                </FormControl>

                                <FormControl>
                                    <FormLabel>目标结构</FormLabel>
                                    <Input
                                        value={transformationForm().targetStructure}
                                        onInput={(e) => setTransformationForm({ ...transformationForm(), targetStructure: e.currentTarget.value })}
                                    />
                                </FormControl>

                                <FormControl>
                                    <FormLabel>映射规则</FormLabel>
                                    <Textarea
                                        value={transformationForm().mappingRule}
                                        onInput={(e) => setTransformationForm({ ...transformationForm(), mappingRule: e.currentTarget.value })}
                                    />
                                </FormControl>
                            </Show>

                            {/* 数据解析表单 */}
                            <Show when={activeTab() === 4}>
                                <FormControl>
                                    <FormLabel>源格式</FormLabel>
                                    <Input
                                        value={parsingForm().sourceFormat}
                                        onInput={(e) => setParsingForm({ ...parsingForm(), sourceFormat: e.currentTarget.value })}
                                    />
                                </FormControl>

                                <FormControl>
                                    <FormLabel>目标格式</FormLabel>
                                    <Input
                                        value={parsingForm().targetFormat}
                                        onInput={(e) => setParsingForm({ ...parsingForm(), targetFormat: e.currentTarget.value })}
                                    />
                                </FormControl>

                                <FormControl>
                                    <FormLabel>解析类型</FormLabel>
                                    <Select value={parsingForm().parserType} onChange={(val) => setParsingForm({ ...parsingForm(), parserType: val })}>
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
                                </FormControl>
                            </Show>
                        </VStack>
                    </ModalBody>
                    <ModalFooter>
                        <HStack spacing="$2">
                            <Button onClick={closeModal} variant="subtle">取消</Button>
                            <Button
                                onClick={() => {
                                    if (activeTab() === 0) handleProtocolSubmit();
                                    else if (activeTab() === 1) handleDeviceSubmit();
                                    else if (activeTab() === 2) handlePointSubmit();
                                    else if (activeTab() === 3 || activeTab() === 4) {
                                        // Mock save
                                        notify.success("保存成功");
                                        closeModal();
                                    }
                                }}
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
    );
};

export default DataSecurityManagement;
