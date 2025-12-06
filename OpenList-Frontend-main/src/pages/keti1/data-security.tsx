import { Component, createSignal, createEffect, For, Show } from "solid-js";
import {
    Box, VStack, HStack,
    Button, Input, Textarea, Table, Thead, Tbody, Tr, Th, Td,
    Text, Badge, IconButton, Icon,
    Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalOverlay,
    FormControl, FormLabel, FormErrorMessage
} from "@hope-ui/solid";
import { BiSolidEdit, BiSolidTrash, BiSolidPlusCircle, BiSolidSave } from "solid-icons/bi";
import { notify, handleResp } from "~/utils";
import * as addonApi from "~/utils/addon";
import { useManageTitle } from "~/hooks";

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
    useManageTitle("数据安全管理");

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

    // 加载数据


    const loadProtocols = async () => {
        setLoading(true);
        try {
            const resp: any = await addonApi.getICSProtocols();
            handleResp(resp, (data: any) => {
                setProtocols(data.content || data || []);
            });
        } catch (error) {
            console.error('加载工控协议失败:', error);
            setProtocols([]);
        } finally {
            setLoading(false);
        }
    };

    const loadDevices = async () => {
        setLoading(true);
        try {
            const resp: any = await addonApi.getICSDevices();
            handleResp(resp, (data: any) => {
                setDevices(data.content || data || []);
            });
        } catch (error) {
            console.error('加载工控设备失败:', error);
            setDevices([]);
        } finally {
            setLoading(false);
        }
    };

    const loadPoints = async () => {
        setLoading(true);
        try {
            const resp: any = await addonApi.getICSDevicePoints();
            handleResp(resp, (data: any) => {
                setPoints(data.content || data || []);
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
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
    };

    const getModalTitle = () => {
        const action = currentProtocol() || currentDevice() || currentPoint() ? "编辑" : "新增";
        const type = activeTab() === 0 ? "工控协议" : activeTab() === 1 ? "工控设备" : "设备场量点";
        return `${action}${type}`;
    };

    return (
        <VStack spacing="$4" alignItems="stretch" w="$full">
            <Text fontSize="$xl" fontWeight="$bold">众测数据保障系统</Text>

            <VStack spacing="$4" alignItems="stretch">
                <HStack spacing="$2" borderBottom="1px solid $neutral6" pb="$2">
                    <Button variant={activeTab() === 0 ? "solid" : "ghost"} colorScheme={activeTab() === 0 ? "primary" : "neutral"} onClick={() => setActiveTab(0)}>工控协议管理</Button>
                    <Button variant={activeTab() === 1 ? "solid" : "ghost"} colorScheme={activeTab() === 1 ? "primary" : "neutral"} onClick={() => setActiveTab(1)}>工控设备管理</Button>
                    <Button variant={activeTab() === 2 ? "solid" : "ghost"} colorScheme={activeTab() === 2 ? "primary" : "neutral"} onClick={() => setActiveTab(2)}>设备场量点管理</Button>
                </HStack>

                {/* 顶部操作栏 */}
                <HStack justifyContent="flex-end">
                    <Button leftIcon={<Icon as={BiSolidPlusCircle} />} colorScheme="primary" onClick={openAddModal}>
                        新增
                    </Button>
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
