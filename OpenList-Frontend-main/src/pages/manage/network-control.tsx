import { JSX, Show } from "solid-js";

import {
  Box,
  Button,
  Flex,
  Grid,
  GridItem,
  Heading,
  Text,
  VStack,
  useColorModeValue,
  HStack,
  Input,
  FormControl,
  FormLabel,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  IconButton,
  Icon,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription
} from "@hope-ui/solid";
import { createSignal } from "solid-js";
import { For } from "solid-js/web";
import { useManageTitle, useT } from "~/hooks";
import { getMainColor } from "~/store";
import { BiSolidEdit, BiSolidTrash, BiSolidCheckCircle } from "solid-icons/bi";

// 模拟网络控制数据类型
interface Container {
  id: string;
  name: string;
  image: string;
  state: "running" | "exited" | "created";
  ports: string;
  created: string;
}

interface ContainerWithHost extends Container {
  hostName: string;
}

interface NetworkHost {
  id: number;
  name: string;
  ipAddress: string;
  username: string;
  password: string;
  sshPort: number;
  status: "Online" | "Offline" | "Pending";
  dockerInstalled: boolean;
  javaInstalled: boolean;
  lastCheckTime?: string;
  containers: Container[];
}

// 模拟数据
const mockNetworkHosts: NetworkHost[] = [
  {
    id: 1,
    name: "Web Server",
    ipAddress: "192.168.1.10",
    username: "root",
    password: "securepass123",
    sshPort: 22,
    status: "Online",
    dockerInstalled: true,
    javaInstalled: true,
    lastCheckTime: "2024-09-19 14:30:00",
    containers: [
      {
        id: "c1",
        name: "nginx",
        image: "nginx:latest",
        state: "running",
        ports: "80:80",
        created: "2024-09-18 10:20:00"
      },
      {
        id: "c2",
        name: "redis",
        image: "redis:alpine",
        state: "running",
        ports: "6379:6379",
        created: "2024-09-18 11:15:00"
      }
    ]
  },
  {
    id: 2,
    name: "DB Server",
    ipAddress: "192.168.1.20",
    username: "root",
    password: "securepass456",
    sshPort: 22,
    status: "Offline",
    dockerInstalled: true,
    javaInstalled: false,
    lastCheckTime: "2024-09-19 12:45:00",
    containers: [
      {
        id: "c3",
        name: "mysql",
        image: "mysql:8.0",
        state: "exited",
        ports: "3306:3306",
        created: "2024-09-17 09:30:00"
      }
    ]
  },
  {
    id: 3,
    name: "App Server",
    ipAddress: "192.168.1.30",
    username: "root",
    password: "securepass789",
    sshPort: 22,
    status: "Pending",
    dockerInstalled: false,
    javaInstalled: true,
    lastCheckTime: "2024-09-19 13:20:00",
    containers: []
  }
];

const NetworkControlItem = (props: { host: NetworkHost }) => {
  const t = useT();
  
  const getStatusColor = () => {
    switch (props.host.status) {
      case "Online":
        return "success";
      case "Offline":
        return "danger";
      default:
        return "warning";
    }
  };

  const getStatusText = () => {
    switch (props.host.status) {
      case "Online":
        return t("network-control.status_online");
      case "Offline":
        return t("network-control.status_offline");
      default:
        return t("network-control.status_pending");
    }
  };

  const getDockerStatus = () => {
    return props.host.dockerInstalled 
      ? { color: "success", text: t("network-control.docker_installed") }
      : { color: "danger", text: t("network-control.docker_not_installed") };
  };

  const getJavaStatus = () => {
    return props.host.javaInstalled 
      ? { color: "success", text: t("network-control.java_installed") }
      : { color: "danger", text: t("network-control.java_not_installed") };
  };

  return (
    <VStack
      w="$full"
      spacing="$3"
      rounded="$lg"
      border="1px solid $neutral7"
      background={useColorModeValue("$neutral2", "$neutral3")()}
      p="$4"
      _hover={{
        border: `1px solid ${getMainColor()}`,
      }}
    >
      <HStack w="$full" justifyContent="space-between">
        <Text fontWeight="$semibold" fontSize="$lg">
          {props.host.name}
        </Text>
        <Text
          fontWeight="$semibold"
          color={`$${getStatusColor()}9`}
        >
          {getStatusText()}
        </Text>
      </HStack>
      
      <Box w="$full">
        <Text fontSize="$sm" color="$neutral11">
          {t("network-control.ip_address")}: {props.host.ipAddress}:{props.host.sshPort}
        </Text>
        <HStack spacing="$2" mt="$1">
          <Badge colorScheme={getDockerStatus().color}>
            {getDockerStatus().text}
          </Badge>
          <Badge colorScheme={getJavaStatus().color}>
            {getJavaStatus().text}
          </Badge>
        </HStack>
        {props.host.lastCheckTime && (
          <Text fontSize="$xs" color="$neutral10" mt="$1">
            {t("network-control.last_check")}: {props.host.lastCheckTime}
          </Text>
        )}
      </Box>

      {(() => {
        const containers = Array.isArray(props.host.containers) ? props.host.containers : [];
        if (containers.length === 0) return null;
        return (
          <Box w="$full" mt="$3" pt="$2" borderTop="1px solid $neutral6">
            <Text fontWeight="$medium" mb="$2">
              {t("network-control.containers")}
            </Text>
            <Grid templateColumns="repeat(auto-fill, minmax(140px, 1fr))" gap="$2">
              <For each={containers as unknown as undefined} fallback={<></>}>
                {(container) => (
                  <GridItem>
                    <Box
                      borderWidth="1px"
                      rounded="$sm"
                      p="$2"
                      background={useColorModeValue("$neutral3", "$neutral4")()}
                    >
                      <Text fontSize="$sm" fontWeight="$medium" noOfLines={1}>
                        {container.name}
                      </Text>
                      <Text fontSize="$xs" color="$neutral10" noOfLines={1}>
                        {container.ports}
                      </Text>
                    </Box>
                  </GridItem>
                )}
              </For>
            </Grid>
          </Box>
        );
      })()}

      <HStack spacing="$2" mt="$2" w="$full" justifyContent="space-between">
        <Button size="sm">{t("network-control.check")}</Button>
        <Button size="sm" colorScheme="accent">
          {t("network-control.configure")}
        </Button>
        <Button size="sm" colorScheme="danger">
          {t("network-control.delete")}
        </Button>
      </HStack>
    </VStack>
  );
};

const NetworkControl = () => {
  const t = useT(); // 确保已经导入并使用了useT()函数
  useManageTitle("manage.sidemenu.network-control");
  const [networkHosts, setNetworkHosts] = createSignal<NetworkHost[]>(mockNetworkHosts);
  const [allContainers, setAllContainers] = createSignal<ContainerWithHost[]>([]);

  const refreshData = () => {
    // 模拟刷新数据
    setNetworkHosts([...mockNetworkHosts]);
    // 更新容器列表
    const containers = mockNetworkHosts.flatMap(host => 
      host.containers.map(container => ({...container, hostName: host.name}))
    );
    setAllContainers(containers as ContainerWithHost[]);
  };

  // 初始化容器列表
  refreshData();

  const [hostname, setHostname] = createSignal("");
  const [ipAddress, setIpAddress] = createSignal("");
  const [username, setUsername] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [sshPort, setSshPort] = createSignal(22);
  const [isAddingHost, setIsAddingHost] = createSignal(false);

  const testConnection = () => {
    // 模拟测试连接
    console.log("Testing connection...");
  };

  const addHost = () => {
    setIsAddingHost(true);
    // 模拟添加主机
    setTimeout(() => {
      setIsAddingHost(false);
      console.log("Host added successfully!");
    }, 2000);
  };

  return (
    <VStack w="$full" spacing="$5">
      {/* 添加主机表单 */}
      <Box w="$full" p="$4" rounded="$lg" border="1px solid $neutral7" background={useColorModeValue("$neutral2", "$neutral3")()}
        _hover={{ border: `1px solid ${getMainColor()}` }}>
        <Text fontWeight="$medium" mb="$3">
          {t("network-control.add_host")}
        </Text>
        
        <Grid 
          templateColumns={{
            "@initial": "1fr",
            "@md": "repeat(2, 1fr)",
            "@lg": "repeat(3, 1fr)"
          }} 
          gap="$2"
        >
          <GridItem>
            <FormControl>
              <FormLabel fontSize="$sm" mb="$1">
                {t("network-control.hostname")}
              </FormLabel>
              <Input
                size="sm"
                value={hostname()}
                onChange={(e) => setHostname(e.currentTarget.value)}
                placeholder={t("network-control.hostname_placeholder")}
              />
              <Text fontSize="$xs" color="$neutral10" mt="$1">
                {t("network-control.hostname_tip")}
              </Text>
            </FormControl>
          </GridItem>
          <GridItem>
            <FormControl>
              <FormLabel fontSize="$sm" mb="$1">
                {t("network-control.ip_address")}
              </FormLabel>
              <Input
                size="sm"
                value={ipAddress()}
                onChange={(e) => setIpAddress(e.currentTarget.value)}
                placeholder="192.168.1.100"
                required
              />
            </FormControl>
          </GridItem>
          <GridItem>
            <FormControl>
              <FormLabel fontSize="$sm" mb="$1">
                {t("network-control.username")}
              </FormLabel>
              <Input
                size="sm"
                value={username()}
                onChange={(e) => setUsername(e.currentTarget.value)}
                placeholder="ubuntu"
                required
              />
            </FormControl>
          </GridItem>
          <GridItem>
            <FormControl>
              <FormLabel fontSize="$sm" mb="$1">
                {t("network-control.password")}
              </FormLabel>
              <Input
                size="sm"
                type="password"
                value={password()}
                onChange={(e) => setPassword(e.currentTarget.value)}
                placeholder={t("network-control.password_placeholder")}
                required
              />
            </FormControl>
          </GridItem>
          <GridItem>
            <FormControl>
              <FormLabel fontSize="$sm" mb="$1">
                {t("network-control.ssh_port")}
              </FormLabel>
              <Input
                size="sm"
                type="number"
                value={sshPort().toString()}
                onChange={(e) => setSshPort(parseInt(e.currentTarget.value) || 22)}
                placeholder="22"
                min="1"
                max="65535"
                defaultValue="22"
              />
            </FormControl>
          </GridItem>
        </Grid>

        <HStack spacing="$2" mt="$3">
          <Button
            size="sm"
            variant="outline"
            colorScheme="warning"
            onClick={testConnection}
          >
            {t("network-control.test_connection")}
          </Button>
          <Button
            size="sm"
            onClick={addHost}
            loading={isAddingHost()}
          >
            {t("network-control.add_host")}
          </Button>
        </HStack>
      </Box>

      {/* 主机列表 - 表格视图 */}
      <Box 
        w="$full"
        borderWidth="1px" 
        borderRadius="$lg" 
        p="$4"
        background={useColorModeValue("$neutral2", "$neutral3")()}
        _hover={{ border: `1px solid ${getMainColor()}` }}
      >
        <Flex justifyContent="space-between" alignItems="center" mb="$4">
          <Heading size="lg">{t("network-control.host_list")}</Heading>
          <HStack spacing="$2">
            <Button 
              size="sm" 
              colorScheme="accent" 
              onClick={refreshData}
            >
              {t("global.refresh")}
            </Button>
          </HStack>
        </Flex>
        
        {networkHosts().length > 0 ? (
          <Box overflowX="$scroll">
            <Table dense>
              <Thead>
                <Tr>
                  <Th>{t("network-control.hostname")}</Th>
                  <Th>{t("network-control.ip_address")}</Th>
                  <Th>{t("network-control.status")}</Th>
                  <Th>{t("network-control.docker")}</Th>
                  <Th>{t("network-control.java")}</Th>
                  <Th>{t("network-control.last_check")}</Th>
                  <Th>{t("network-control.containers")}</Th>
                  <Th>{t("global.operations")}</Th>
                </Tr>
              </Thead>
              <Tbody>
                <For each={[...networkHosts()] as any} fallback={<></>}>
                  {(host) => (
                    <Tr>
                      <Td>
                        <Text fontWeight="$medium">{host.name}</Text>
                      </Td>
                      <Td>
                        <Text>{host.ipAddress}:{host.sshPort}</Text>
                      </Td>
                      <Td>
                        <Badge 
                          colorScheme={
                            host.status === "Online" ? "success" : 
                            host.status === "Offline" ? "danger" : "warning"
                          }
                        >
                          {host.status === "Online" ? t("network-control.status_online") : 
                           host.status === "Offline" ? t("network-control.status_offline") : 
                           t("network-control.status_pending")}
                        </Badge>
                      </Td>
                      <Td>
                        <Badge 
                          colorScheme={host.dockerInstalled ? "success" : "danger"}
                        >
                          {host.dockerInstalled ? 
                            t("network-control.docker_installed") : 
                            t("network-control.docker_not_installed")}
                        </Badge>
                      </Td>
                      <Td>
                        <Badge 
                          colorScheme={host.javaInstalled ? "success" : "danger"}
                        >
                          {host.javaInstalled ? 
                            t("network-control.java_installed") : 
                            t("network-control.java_not_installed")}
                        </Badge>
                      </Td>
                      <Td>
                        <Text>{host.lastCheckTime || t("global.n_a")}</Text>
                      </Td>
                      <Td>
                        <Text>{host.containers.length} {t("network-control.containers")}</Text>
                      </Td>
                      <Td>
                        <HStack spacing="$2">
                          <IconButton
                            aria-label={t("network-control.check")}
                            icon={<BiSolidCheckCircle />}
                            colorScheme="primary"
                            size="sm"
                          />
                          <IconButton
                            aria-label={t("network-control.configure")}
                            icon={<BiSolidEdit />}
                            colorScheme="accent"
                            size="sm"
                          />
                          <IconButton
                            aria-label={t("network-control.delete")}
                            icon={<BiSolidTrash />}
                            colorScheme="danger"
                            size="sm"
                          />
                        </HStack>
                      </Td>
                    </Tr>
                  )}
                </For>
              </Tbody>
            </Table>
          </Box>
        ) : (
          <Alert status="info">
            <AlertIcon />
            <AlertTitle>{t("network-control.no_hosts")}</AlertTitle>
            <AlertDescription>{t("network-control.no_hosts_desc")}</AlertDescription>
          </Alert>
        )}
      </Box>

      {/* 容器管理部分 */}
      <Box 
        w="$full"
        borderWidth="1px" 
        borderRadius="$lg" 
        p="$4"
        background={useColorModeValue("$neutral2", "$neutral3")()}
        _hover={{ border: `1px solid ${getMainColor()}` }}
      >
        <Flex justifyContent="space-between" alignItems="center" mb="$4">
          <Heading size="lg">{t("network-control.container_management")}</Heading>
          <HStack spacing="$2">
            <Button 
              size="sm" 
              colorScheme="accent" 
              onClick={refreshData}
            >
              {t("global.refresh")}
            </Button>
          </HStack>
        </Flex>
        
        {/* 容器部署表单 */}
        <Box mb="$6" p="$4" rounded="$lg" border="1px solid $neutral7" background={useColorModeValue("$neutral1", "$neutral4")()}>
          <Text fontWeight="$medium" mb="$3">
            {t("network-control.deploy_container")}
          </Text>
          
          <Grid 
            templateColumns={{
              "@initial": "1fr",
              "@md": "repeat(2, 1fr)",
              "@lg": "repeat(4, 1fr)"
            }} 
            gap="$2"
          >
            <GridItem>
              <FormControl>
                <FormLabel fontSize="$sm" mb="$1">
                  {t("network-control.target_host")}
                </FormLabel>
                <select 
                  style={{
                    "width": "100%",
                    "padding": "8px 12px",
                    "border-radius": "6px",
                    "border": "1px solid #ddd",
                    "background": useColorModeValue("#fff", "#2d3748")(),
                    "color": useColorModeValue("#000", "#fff")()
                  }}
                >
                  <option value="">{t("network-control.select_host")}</option>
                  <For each={[...networkHosts()] as any} fallback={<></>}>
                    {(host) => (
                      <option value={host.id}>
                        {host.name} ({host.ipAddress})
                      </option>
                    )}
                  </For>
                </select>
              </FormControl>
            </GridItem>
            
            <GridItem>
              <FormControl>
                <FormLabel fontSize="$sm" mb="$1">
                  {t("network-control.image_name")}
                </FormLabel>
                <Input
                  size="sm"
                  placeholder={t("network-control.image_name_placeholder")}
                />
              </FormControl>
            </GridItem>
            
            <GridItem>
              <FormControl>
                <FormLabel fontSize="$sm" mb="$1">
                  {t("network-control.container_name")}
                </FormLabel>
                <Input
                  size="sm"
                  placeholder={t("network-control.container_name_placeholder")}
                />
              </FormControl>
            </GridItem>
            
            <GridItem>
              <FormControl>
                <FormLabel fontSize="$sm" mb="$1">
                  {t("network-control.ports_mapping")}
                </FormLabel>
                <Input
                  size="sm"
                  placeholder="8080:80"
                />
              </FormControl>
            </GridItem>
          </Grid>
          
          <HStack spacing="$2" mt="$3">
            <Button
              size="sm"
              colorScheme="primary"
            >
              {t("network-control.deploy")}
            </Button>
          </HStack>
        </Box>
        
        {/* 容器列表 */}
        <Box>
          <Heading size="md" mb="$4">{t("network-control.container_list")}</Heading>
          
          {/* 汇总所有主机的容器 */}
          {allContainers().length > 0 ? (
            <Box overflowX="$scroll">
              <Table dense>
                <Thead>
                  <Tr>
                    <Th>{t("network-control.container_id")}</Th>
                    <Th>{t("network-control.container_name")}</Th>
                    <Th>{t("network-control.image")}</Th>
                    <Th>{t("network-control.status")}</Th>
                    <Th>{t("network-control.ports")}</Th>
                    <Th>{t("network-control.host")}</Th>
                    <Th>{t("network-control.created")}</Th>
                    <Th>{t("global.operations")}</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  <For each={allContainers() as unknown as undefined}>
                    {(container) => (
                      <Tr>
                        <Td>
                          <Text fontFamily="monospace" fontSize="sm">
                            {container.id.substring(0, 12)}
                          </Text>
                        </Td>
                        <Td>
                          <Text fontWeight="$medium">{container.name}</Text>
                        </Td>
                        <Td>
                          <Text>{container.image}</Text>
                        </Td>
                        <Td>
                          <Badge 
                            colorScheme={
                              container.state === "running" ? "success" : 
                              container.state === "exited" ? "danger" : "warning"
                            }
                          >
                            {container.state === "running" ? t("network-control.status_running") : 
                             container.state === "exited" ? t("network-control.status_exited") : 
                             t("network-control.status_created")}
                          </Badge>
                        </Td>
                        <Td>
                          <Text>{container.ports}</Text>
                        </Td>
                        <Td>
                          <Text>{container.hostName}</Text>
                        </Td>
                        <Td>
                          <Text>{container.created}</Text>
                        </Td>
                        <Td>
                          <HStack spacing="$2">
                            {container.state === "running" ? (
                              <>
                                <IconButton
                                  aria-label={t("network-control.stop")}
                                  icon={<BiSolidEdit />}
                                  colorScheme="warning"
                                  size="sm"
                                />
                                <IconButton
                                  aria-label={t("network-control.restart")}
                                  icon={<BiSolidCheckCircle />}
                                  colorScheme="accent"
                                  size="sm"
                                />
                              </>
                            ) : (
                              <IconButton
                                aria-label={t("network-control.start")}
                                icon={<BiSolidCheckCircle />}
                                colorScheme="success"
                                size="sm"
                              />
                            )}
                            <IconButton
                              aria-label={t("network-control.delete")}
                              icon={<BiSolidTrash />}
                              colorScheme="danger"
                              size="sm"
                            />
                          </HStack>
                        </Td>
                      </Tr>
                    )}
                  </For>
                </Tbody>
              </Table>
            </Box>
          ) : (
            <Alert status="info">
              <AlertIcon />
              <AlertTitle>{t("network-control.no_containers")}</AlertTitle>
              <AlertDescription>{t("network-control.no_containers_desc")}</AlertDescription>
            </Alert>
          )}
        </Box>
      </Box>
    </VStack>
  );
};

export default NetworkControl;