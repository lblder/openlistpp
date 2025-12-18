import { Component, createSignal, createEffect, For, Show } from "solid-js";
import {
  Box, VStack, HStack,
  Button, Input, Textarea, Table, Thead, Tbody, Tr, Th, Td,
  Text, Badge, IconButton, Icon,
  Modal, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalOverlay,
  FormControl, FormLabel, FormErrorMessage,
  Select, SelectContent, SelectListbox, SelectOption, SelectOptionText, SelectTrigger, SelectValue,
  Checkbox
} from "@hope-ui/solid";
import { BiSolidEdit, BiSolidTrash, BiSolidPlusCircle, BiSolidSave, BiRegularChevronsUp, BiRegularChevronsDown, BiRegularUpArrow, BiRegularDownArrow, BiRegularX, BiSolidCloudUpload, BiSolidDownload, BiRegularCopy } from "solid-icons/bi";
import { notify, handleResp } from "~/utils";
import * as addonApi from "~/utils/addon";
import { useManageTitle } from "~/hooks";
import { Paginator } from "~/components/Paginator";

const SecurityConfiguration: Component = () => {
  useManageTitle("数据保障");

  // 标签页状态
  const [activeTab, setActiveTab] = createSignal(0);
  const [loading, setLoading] = createSignal(false);

  // 模态框状态
  const [isModalOpen, setIsModalOpen] = createSignal(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = createSignal(false);
  const [isImportModalOpen, setIsImportModalOpen] = createSignal(false);
  const [importFile, setImportFile] = createSignal<File | null>(null);
  const [formErrors, setFormErrors] = createSignal<{ [key: string]: string }>({});

  // 数据状态
  const [modes, setModes] = createSignal<addonApi.SecConfigMode[]>([]);
  const [rules, setRules] = createSignal<addonApi.SecFirewallRule[]>([]);
  const [selectedRuleIds, setSelectedRuleIds] = createSignal<number[]>([]);
  const [rulePage, setRulePage] = createSignal(1);
  const [rulePageSize, setRulePageSize] = createSignal(7);
  const [ruleTotal, setRuleTotal] = createSignal(0);

  // 编排相关状态
  const [selectedModeId, setSelectedModeId] = createSignal<number | null>(null);
  const [modeRules, setModeRules] = createSignal<addonApi.SecFirewallRule[]>([]);
  const [availableRules, setAvailableRules] = createSignal<addonApi.SecFirewallRule[]>([]);
  const [selectedRuleToAssign, setSelectedRuleToAssign] = createSignal<number | null>(null);

  // 表单状态
  const [currentMode, setCurrentMode] = createSignal<addonApi.SecConfigMode | null>(null);
  const [modeForm, setModeForm] = createSignal<addonApi.SecConfigMode>({
    mode_name: "",
    description: ""
  });

  const [currentRule, setCurrentRule] = createSignal<addonApi.SecFirewallRule | null>(null);
  const [ruleForm, setRuleForm] = createSignal<addonApi.SecFirewallRule>({
    rule_name: "",
    direction: "INPUT",
    protocol: "tcp",
    src_ip: "0.0.0.0/0",
    dst_port: "",
    action: "ACCEPT",
    is_active: 1
  });

  // 加载数据
  const loadModes = async () => {
    setLoading(true);
    try {
      const resp: any = await addonApi.getSecConfigModes(1, 100); // 暂时获取前100条
      handleResp(resp, (data: any) => {
        setModes(data.content || []);
      });
    } finally {
      setLoading(false);
    }
  };



  const loadRules = async (page = rulePage(), size = rulePageSize()) => {
    setLoading(true);
    try {
      const resp: any = await addonApi.getSecFirewallRules(page, size);
      handleResp(resp, (data: any) => {
        setRules(data.content || []);
        setRuleTotal(data.total || 0);
        setSelectedRuleIds([]); // 重置选中的规则
      });
    } finally {
      setLoading(false);
    }
  };

  const loadModeRules = async (modeId: number) => {
    setLoading(true);
    try {
      const resp: any = await addonApi.getModeRules(modeId);
      handleResp(resp, (data: any) => {
        setModeRules(data || []);
      });
    } finally {
      setLoading(false);
    }
  };

  // 初始化加载
  createEffect(() => {
    if (activeTab() === 0) loadModes();
    if (activeTab() === 1) loadRules();
    if (activeTab() === 2) {
      loadModes();
      loadRules(); // 加载规则供选择
    }
  });

  // 监听编排模式选择
  createEffect(() => {
    if (activeTab() === 2 && selectedModeId()) {
      loadModeRules(selectedModeId()!);
    } else {
      setModeRules([]);
    }
  });

  // 表单操作
  const openAddMode = () => {
    setCurrentMode(null);
    setModeForm({ mode_name: "", description: "" });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditMode = (mode: addonApi.SecConfigMode) => {
    setCurrentMode(mode);
    setModeForm({ ...mode });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openAddRule = () => {
    setCurrentRule(null);
    setRuleForm({
      rule_name: "",
      direction: "INPUT",
      protocol: "tcp",
      src_ip: "0.0.0.0/0",
      dst_port: "",
      action: "ACCEPT",
      is_active: 1
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditRule = (rule: addonApi.SecFirewallRule) => {
    setCurrentRule(rule);
    setRuleForm({ ...rule });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openAssignModal = async () => {
    if (!selectedModeId()) {
      notify.warning("请先选择一个任务维度");
      return;
    }

    // 加载所有策略（不分页）
    setLoading(true);
    try {
      const resp: any = await addonApi.getSecFirewallRules(1, 1000); // 获取最多1000条策略
      handleResp(resp, (data: any) => {
        const allRules = data.content || [];
        // 过滤掉已经分配的规则
        const assignedIds = modeRules().map(r => r.id);
        const available = allRules.filter((r: addonApi.SecFirewallRule) => !assignedIds.includes(r.id));
        setAvailableRules(available);
        setSelectedRuleToAssign(null);
        setIsAssignModalOpen(true);
      });
    } finally {
      setLoading(false);
    }
  };

  // 排序处理
  const handleRulePageChange = (page: number) => {
    setRulePage(page);
    loadRules(page, rulePageSize());
  };

  const handleRulePageSizeChange = (size: number) => {
    setRulePageSize(size);
    setRulePage(1);
    loadRules(1, size);
  };

  // 提交处理
  const handleModeSubmit = async () => {
    if (!modeForm().mode_name) {
      setFormErrors({ mode_name: "任务名称不能为空" });
      return;
    }
    setLoading(true);
    try {
      if (currentMode()) {
        const resp: any = await addonApi.updateSecConfigMode(currentMode()!.id!, modeForm());
        handleResp(resp, () => {
          notify.success("更新成功");
          loadModes();
          setIsModalOpen(false);
        });
      } else {
        const resp: any = await addonApi.createSecConfigMode(modeForm());
        handleResp(resp, () => {
          notify.success("创建成功");
          loadModes();
          setIsModalOpen(false);
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRuleSubmit = async () => {
    if (!ruleForm().rule_name) {
      setFormErrors({ rule_name: "策略名称不能为空" });
      return;
    }
    setLoading(true);
    try {
      if (currentRule()) {
        const resp: any = await addonApi.updateSecFirewallRule(currentRule()!.id!, ruleForm());
        handleResp(resp, () => {
          notify.success("更新成功");
          loadRules();
          setIsModalOpen(false);
        });
      } else {
        const resp: any = await addonApi.createSecFirewallRule(ruleForm());
        handleResp(resp, () => {
          notify.success("创建成功");
          loadRules();
          setIsModalOpen(false);
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRule = async () => {
    if (!selectedRuleToAssign()) {
      notify.warning("请选择要添加的策略");
      return;
    }
    setLoading(true);
    try {
      const resp: any = await addonApi.assignRuleToMode(selectedModeId()!, selectedRuleToAssign()!);
      handleResp(resp, () => {
        notify.success("添加策略成功");
        loadModeRules(selectedModeId()!);
        setIsAssignModalOpen(false);
      });
    } finally {
      setLoading(false);
    }
  };

  // 删除处理
  const handleDeleteMode = async (id: number) => {
    if (confirm("确定要删除此任务吗？关联的编排关系也将被删除。")) {
      const resp: any = await addonApi.deleteSecConfigMode(id);
      handleResp(resp, () => {
        notify.success("删除成功");
        loadModes();
        if (selectedModeId() === id) setSelectedModeId(null);
      });
    }
  };

  const handleDeleteRule = async (id: number) => {
    if (confirm("确定要删除此策略吗？")) {
      const resp: any = await addonApi.deleteSecFirewallRule(id);
      handleResp(resp, () => {
        notify.success("删除成功");
        loadRules();
      });
    }
  };

  const handleBatchDeleteRules = async () => {
    if (selectedRuleIds().length === 0) return;
    if (confirm(`确定要删除选中的 ${selectedRuleIds().length} 条策略吗？`)) {
      setLoading(true);
      try {
        const resp: any = await addonApi.deleteSecFirewallRules(selectedRuleIds());
        handleResp(resp, () => {
          notify.success("批量删除成功");
          loadRules();
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const toggleSelectAllRules = (checked: boolean) => {
    if (checked) {
      setSelectedRuleIds(rules().map(r => r.id!));
    } else {
      setSelectedRuleIds([]);
    }
  };

  const toggleSelectRule = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedRuleIds([...selectedRuleIds(), id]);
    } else {
      setSelectedRuleIds(selectedRuleIds().filter(rid => rid !== id));
    }
  };

  const handleRemoveRuleFromMode = async (ruleId: number) => {
    if (confirm("确定要从该任务移除此策略吗？")) {
      const resp: any = await addonApi.removeRuleFromMode(selectedModeId()!, ruleId);
      handleResp(resp, () => {
        notify.success("移除成功");
        loadModeRules(selectedModeId()!);
      });
    }
  };

  // 排序处理
  const moveRule = async (index: number, direction: 'up' | 'down') => {
    const currentRules = [...modeRules()];
    if (direction === 'up' && index > 0) {
      [currentRules[index], currentRules[index - 1]] = [currentRules[index - 1], currentRules[index]];
    } else if (direction === 'down' && index < currentRules.length - 1) {
      [currentRules[index], currentRules[index + 1]] = [currentRules[index + 1], currentRules[index]];
    } else {
      return;
    }

    // 更新本地状态以立即反映UI
    setModeRules(currentRules);

    // 发送请求保存顺序
    const ruleIds = currentRules.map(r => r.id!);
    try {
      await addonApi.reorderModeRules(selectedModeId()!, ruleIds);
      // notify.success("顺序已更新");
    } catch (e) {
      notify.error("更新顺序失败");
      loadModeRules(selectedModeId()!); // 恢复原状
    }
  };

  return (
    <VStack spacing="$4" alignItems="stretch" w="$full" h="$full">
      <HStack justifyContent="space-between">
        <Text fontSize="$xl" fontWeight="$bold">数据保障</Text>
      </HStack>

      <HStack spacing="$2" borderBottom="1px solid $neutral6" pb="$2" justifyContent="space-between">
        <HStack spacing="$2">
          <Button variant={activeTab() === 0 ? "solid" : "ghost"} colorScheme={activeTab() === 0 ? "primary" : "neutral"} onClick={() => setActiveTab(0)}>任务维度管理</Button>
          <Button variant={activeTab() === 1 ? "solid" : "ghost"} colorScheme={activeTab() === 1 ? "primary" : "neutral"} onClick={() => setActiveTab(1)}>安全防护策略</Button>
          <Button variant={activeTab() === 2 ? "solid" : "ghost"} colorScheme={activeTab() === 2 ? "primary" : "neutral"} onClick={() => setActiveTab(2)}>安全配置管理</Button>
        </HStack>

        {/* 右侧操作按钮 */}
        <HStack spacing="$2">
          <Show when={activeTab() === 0}>
            <Button leftIcon={<Icon as={BiSolidPlusCircle} />} colorScheme="primary" onClick={openAddMode}>新增任务</Button>
          </Show>
          <Show when={activeTab() === 1}>
            <Show when={selectedRuleIds().length > 0}>
              <Button leftIcon={<Icon as={BiSolidTrash} />} colorScheme="danger" onClick={handleBatchDeleteRules}>批量删除 ({selectedRuleIds().length})</Button>
            </Show>
            <Button leftIcon={<Icon as={BiSolidCloudUpload} />} colorScheme="accent" onClick={() => { setImportFile(null); setIsImportModalOpen(true); }}>导入策略</Button>
            <Button leftIcon={<Icon as={BiSolidPlusCircle} />} colorScheme="primary" onClick={openAddRule}>新增策略</Button>
          </Show>
        </HStack>
      </HStack>

      <Box flex="1" overflowY="auto">
        {/* 模式管理 */}
        <Show when={activeTab() === 0}>
          <VStack alignItems="stretch" spacing="$4">
            {/* <HStack justifyContent="flex-end">
              <Button leftIcon={<Icon as={BiSolidPlusCircle} />} colorScheme="primary" onClick={openAddMode}>新增模式</Button>
            </HStack> */}
            <Box borderWidth="1px" borderRadius="$lg" overflowX="auto">
              <Table dense>
                <Thead>
                  <Tr>
                    <Th>ID</Th>
                    <Th>任务名称</Th>
                    <Th>描述</Th>
                    <Th>操作</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  <For each={modes()}>
                    {(mode) => (
                      <Tr>
                        <Td>{mode.id}</Td>
                        <Td>{mode.mode_name}</Td>
                        <Td>{mode.description}</Td>
                        <Td>
                          <HStack spacing="$2">
                            <IconButton aria-label="编辑" icon={<BiSolidEdit />} size="sm" onClick={() => openEditMode(mode)} />
                            <IconButton aria-label="删除" icon={<BiSolidTrash />} colorScheme="danger" size="sm" onClick={() => handleDeleteMode(mode.id!)} />
                          </HStack>
                        </Td>
                      </Tr>
                    )}
                  </For>
                </Tbody>
              </Table>
            </Box>
          </VStack>
        </Show>

        {/* 规则管理 */}
        <Show when={activeTab() === 1}>
          <VStack alignItems="stretch" spacing="$4">
            {/* <HStack justifyContent="space-between" spacing="$2">
              <Show when={selectedRuleIds().length > 0}>
                <Button leftIcon={<Icon as={BiSolidTrash} />} colorScheme="danger" onClick={handleBatchDeleteRules}>批量删除 ({selectedRuleIds().length})</Button>
              </Show>
              <HStack spacing="$2" ml="auto">
                <Button leftIcon={<Icon as={BiSolidCloudUpload} />} colorScheme="accent" onClick={() => { setImportFile(null); setIsImportModalOpen(true); }}>导入规则</Button>
                <Button leftIcon={<Icon as={BiSolidPlusCircle} />} colorScheme="primary" onClick={openAddRule}>新增规则</Button>
              </HStack>
            </HStack> */}
            <Box borderWidth="1px" borderRadius="$lg" overflowX="auto">
              <Table dense>
                <Thead>
                  <Tr>
                    <Th>
                      <Checkbox
                        checked={rules().length > 0 && selectedRuleIds().length === rules().length}
                        onChange={(e) => toggleSelectAllRules(e.currentTarget.checked)}
                      />
                    </Th>
                    <Th>ID</Th>
                    <Th>策略名称</Th>
                    <Th>方向</Th>
                    <Th>协议</Th>
                    <Th>源IP</Th>
                    <Th>目标端口</Th>
                    <Th>动作</Th>
                    <Th>状态</Th>
                    <Th>操作</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  <For each={rules()}>
                    {(rule) => (
                      <Tr>
                        <Td>
                          <Checkbox
                            checked={selectedRuleIds().includes(rule.id!)}
                            onChange={(e) => toggleSelectRule(rule.id!, e.currentTarget.checked)}
                          />
                        </Td>
                        <Td>{rule.id}</Td>
                        <Td>{rule.rule_name}</Td>
                        <Td><Badge colorScheme={rule.direction === 'INPUT' ? 'info' : 'warning'}>{rule.direction}</Badge></Td>
                        <Td>{rule.protocol}</Td>
                        <Td>{rule.src_ip}</Td>
                        <Td>{rule.dst_port || 'All'}</Td>
                        <Td><Badge colorScheme={rule.action === 'ACCEPT' ? 'success' : rule.action === 'DROP' ? 'danger' : 'warning'}>{rule.action}</Badge></Td>
                        <Td><Badge variant="outline" colorScheme={rule.is_active === 1 ? 'success' : 'neutral'}>{rule.is_active === 1 ? '启用' : '禁用'}</Badge></Td>
                        <Td>
                          <HStack spacing="$2">
                            <IconButton aria-label="复制脚本" icon={<BiRegularCopy />} size="sm" colorScheme="neutral" onClick={() => {
                              const cmd = addonApi.generateIptablesCommand(rule);
                              navigator.clipboard.writeText(cmd).then(() => notify.success("脚本已复制到剪切板"));
                            }} />
                            <IconButton aria-label="编辑" icon={<BiSolidEdit />} size="sm" onClick={() => openEditRule(rule)} />
                            <IconButton aria-label="删除" icon={<BiSolidTrash />} colorScheme="danger" size="sm" onClick={() => handleDeleteRule(rule.id!)} />
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
                total={ruleTotal()}
                defaultCurrent={rulePage()}
                defaultPageSize={rulePageSize()}
                onChange={handleRulePageChange}
                colorScheme="primary"
              />
            </HStack>
          </VStack>
        </Show>

        {/* 策略编排 */}
        <Show when={activeTab() === 2}>
          <HStack alignItems="flex-start" spacing="$4" h="$full">
            {/* 左侧：模式选择 */}
            <Box w="300px" borderWidth="1px" borderRadius="$lg" p="$4" h="$full" bg="$neutral2">
              <Text fontWeight="bold" mb="$4">选择任务维度</Text>
              <VStack spacing="$2" alignItems="stretch">
                <For each={modes()}>
                  {(mode) => (
                    <Box
                      p="$3"
                      borderRadius="$md"
                      bg={selectedModeId() === mode.id ? "$primary3" : undefined}
                      cursor="pointer"
                      borderWidth="1px"
                      borderColor={selectedModeId() === mode.id ? "$primary9" : "transparent"}
                      onClick={() => setSelectedModeId(mode.id!)}
                      _hover={{ bg: "$primary2" }}
                    >
                      <Text fontWeight="medium">{mode.mode_name}</Text>
                      <Text fontSize="$xs" color="$neutral10" noOfLines={1}>{mode.description || "无描述"}</Text>
                    </Box>
                  )}
                </For>
              </VStack>
            </Box>

            {/* 右侧：规则编排 */}
            <Box flex="1" borderWidth="1px" borderRadius="$lg" p="$4" h="$full">
              <Show when={selectedModeId()} fallback={
                <VStack h="$full" justifyContent="center">
                  <Text color="$neutral10">请从左侧选择一个任务维度以开始编排</Text>
                </VStack>
              }>
                <VStack h="$full" alignItems="stretch" spacing="$4">
                  <HStack justifyContent="space-between">
                    <Text fontWeight="bold">策略执行顺序 (从上到下)</Text>
                    <HStack spacing="$2">
                      <Button leftIcon={<Icon as={BiSolidDownload} />} size="sm" variant="outline" onClick={() => addonApi.downloadSecConfigModeScript(selectedModeId()!)}>导出脚本</Button>
                      <Button leftIcon={<Icon as={BiSolidPlusCircle} />} size="sm" colorScheme="primary" onClick={openAssignModal}>添加策略</Button>
                    </HStack>
                  </HStack>

                  <Box flex="1" overflowY="auto" borderWidth="1px" borderRadius="$md">
                    <Table>
                      <Thead>
                        <Tr>
                          <Th w="50px">顺序</Th>
                          <Th>策略名称</Th>
                          <Th>动作</Th>
                          <Th>详情</Th>
                          <Th>排序</Th>
                          <Th>操作</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        <For each={modeRules()}>
                          {(rule, i) => (
                            <Tr>
                              <Td><Badge>{i() + 1}</Badge></Td>
                              <Td>{rule.rule_name}</Td>
                              <Td><Badge colorScheme={rule.action === 'ACCEPT' ? 'success' : 'danger'}>{rule.action}</Badge></Td>
                              <Td fontSize="$xs" color="$neutral10">
                                {rule.protocol} | {rule.src_ip} {"->"} {rule.dst_port || 'All'}
                              </Td>
                              <Td>
                                <HStack spacing="$1">
                                  <IconButton
                                    aria-label="上移"
                                    icon={<BiRegularUpArrow />}
                                    size="xs"
                                    variant="ghost"
                                    disabled={i() === 0}
                                    onClick={() => moveRule(i(), 'up')}
                                  />
                                  <IconButton
                                    aria-label="下移"
                                    icon={<BiRegularDownArrow />}
                                    size="xs"
                                    variant="ghost"
                                    disabled={i() === modeRules().length - 1}
                                    onClick={() => moveRule(i(), 'down')}
                                  />
                                </HStack>
                              </Td>
                              <Td>
                                <IconButton
                                  aria-label="移除"
                                  icon={<BiRegularX />}
                                  size="sm"
                                  colorScheme="danger"
                                  variant="ghost"
                                  onClick={() => handleRemoveRuleFromMode(rule.id!)}
                                />
                              </Td>
                            </Tr>
                          )}
                        </For>
                        <Show when={modeRules().length === 0}>
                          <Tr>
                            <Td colSpan={6} textAlign="center" py="$8" color="$neutral10">暂无关联策略</Td>
                          </Tr>
                        </Show>
                      </Tbody>
                    </Table>
                  </Box>
                </VStack>
              </Show>
            </Box>
          </HStack>
        </Show>
      </Box>

      {/* 编辑/新增模式模态框 */}
      <Modal opened={isModalOpen() && activeTab() === 0} onClose={() => setIsModalOpen(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalCloseButton />
          <ModalHeader>{currentMode() ? "编辑任务" : "新增任务"}</ModalHeader>
          <ModalBody>
            <VStack spacing="$4">
              <FormControl invalid={!!formErrors().mode_name}>
                <FormLabel>任务名称</FormLabel>
                <Input value={modeForm().mode_name} onInput={(e) => setModeForm({ ...modeForm(), mode_name: e.currentTarget.value })} />
                <FormErrorMessage>{formErrors().mode_name}</FormErrorMessage>
              </FormControl>
              <FormControl>
                <FormLabel>描述</FormLabel>
                <Textarea value={modeForm().description} onInput={(e) => setModeForm({ ...modeForm(), description: e.currentTarget.value })} />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button onClick={handleModeSubmit} loading={loading()}>保存</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 编辑/新增规则模态框 */}
      <Modal opened={isModalOpen() && activeTab() === 1} onClose={() => setIsModalOpen(false)} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalCloseButton />
          <ModalHeader>{currentRule() ? "编辑策略" : "新增策略"}</ModalHeader>
          <ModalBody>
            <VStack spacing="$4">
              <FormControl invalid={!!formErrors().rule_name}>
                <FormLabel>策略名称</FormLabel>
                <Input value={ruleForm().rule_name} onInput={(e) => setRuleForm({ ...ruleForm(), rule_name: e.currentTarget.value })} />
                <FormErrorMessage>{formErrors().rule_name}</FormErrorMessage>
              </FormControl>
              <HStack w="$full" spacing="$4">
                <FormControl>
                  <FormLabel>方向</FormLabel>
                  <select
                    class="hope-select"
                    value={ruleForm().direction}
                    onChange={(e) => setRuleForm({ ...ruleForm(), direction: e.currentTarget.value })}
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
                  >
                    <option value="INPUT">INPUT (入站)</option>
                    <option value="OUTPUT">OUTPUT (出站)</option>
                  </select>
                </FormControl>
                <FormControl>
                  <FormLabel>协议</FormLabel>
                  <Input value={ruleForm().protocol} onInput={(e) => setRuleForm({ ...ruleForm(), protocol: e.currentTarget.value })} placeholder="tcp/udp/icmp" />
                </FormControl>
              </HStack>
              <HStack w="$full" spacing="$4">
                <FormControl>
                  <FormLabel>源IP</FormLabel>
                  <Input value={ruleForm().src_ip} onInput={(e) => setRuleForm({ ...ruleForm(), src_ip: e.currentTarget.value })} placeholder="0.0.0.0/0" />
                </FormControl>
                <FormControl>
                  <FormLabel>目标端口</FormLabel>
                  <Input value={ruleForm().dst_port} onInput={(e) => setRuleForm({ ...ruleForm(), dst_port: e.currentTarget.value })} placeholder="80,443" />
                </FormControl>
              </HStack>
              <HStack w="$full" spacing="$4">
                <FormControl>
                  <FormLabel>动作</FormLabel>
                  <select
                    class="hope-select"
                    value={ruleForm().action}
                    onChange={(e) => setRuleForm({ ...ruleForm(), action: e.currentTarget.value })}
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
                  >
                    <option value="ACCEPT">ACCEPT</option>
                    <option value="DROP">DROP</option>
                    <option value="REJECT">REJECT</option>
                  </select>
                </FormControl>
                <FormControl>
                  <FormLabel>状态</FormLabel>
                  <select
                    class="hope-select"
                    value={String(ruleForm().is_active)}
                    onChange={(e) => setRuleForm({ ...ruleForm(), is_active: parseInt(e.currentTarget.value) })}
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
                  >
                    <option value="1">启用</option>
                    <option value="0">禁用</option>
                  </select>
                </FormControl>
              </HStack>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button onClick={handleRuleSubmit} loading={loading()}>保存</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 添加规则关联模态框 */}
      <Modal opened={isAssignModalOpen()} onClose={() => setIsAssignModalOpen(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalCloseButton />
          <ModalHeader>添加策略到当前任务</ModalHeader>
          <ModalBody>
            <VStack spacing="$4">
              <FormControl>
                <FormLabel>选择策略</FormLabel>
                <select
                  class="hope-select"
                  value={selectedRuleToAssign() || ""}
                  onChange={(e) => setSelectedRuleToAssign(parseInt(e.currentTarget.value))}
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
                >
                  <option value="">请选择...</option>
                  <For each={availableRules()}>
                    {(rule) => (
                      <option value={rule.id}>{rule.rule_name} ({rule.action})</option>
                    )}
                  </For>
                </select>
                <Show when={availableRules().length === 0}>
                  <Text fontSize="$xs" color="$warning9" mt="$1">没有更多可用策略</Text>
                </Show>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button onClick={handleAssignRule} loading={loading()} disabled={!selectedModeId() || !selectedRuleToAssign()}>添加</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      {/* 导入规则模态框 */}
      <Modal opened={isImportModalOpen()} onClose={() => setIsImportModalOpen(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalCloseButton />
          <ModalHeader>批量导入策略</ModalHeader>
          <ModalBody>
            <VStack spacing="$4" alignItems="stretch">
              <Text fontSize="$sm" color="$neutral10">支持上传 CSV 或 JSON 格式的策略文件。</Text>
              <input
                type="file"
                accept=".csv,.json"
                onChange={(e) => {
                  const file = e.currentTarget.files?.[0];
                  if (file) setImportFile(file);
                }}
              />
              <HStack spacing="$4" pt="$2">
                <Button leftIcon={<Icon as={BiSolidDownload} />} variant="outline" size="sm" onClick={() => addonApi.downloadSecFirewallRuleTemplate('csv')}>下载 CSV 模板</Button>
                <Button leftIcon={<Icon as={BiSolidDownload} />} variant="outline" size="sm" onClick={() => addonApi.downloadSecFirewallRuleTemplate('json')}>下载 JSON 模板</Button>
              </HStack>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button
              onClick={async () => {
                if (!importFile()) return;
                setLoading(true);
                try {
                  const resp: any = await addonApi.importSecFirewallRules(importFile()!);
                  handleResp(resp, () => {
                    notify.success("导入成功");
                    loadRules();
                    setIsImportModalOpen(false);
                  });
                } finally {
                  setLoading(false);
                }
              }}
              loading={loading()}
              disabled={!importFile()}
            >
              开始导入
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
};

export default SecurityConfiguration;