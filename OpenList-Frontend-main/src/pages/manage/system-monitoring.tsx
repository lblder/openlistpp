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
  HStack
} from "@hope-ui/solid";
import { createSignal } from "solid-js";
import { useManageTitle, useT } from "~/hooks";
import { getMainColor } from "~/store";

// 模拟监控数据类型
interface SystemMetric {
  name: string;
  value: number;
  unit: string;
  status?: "normal" | "warning" | "critical";
}

// 模拟数据
const mockMetrics: SystemMetric[] = [
  { name: "cpu_usage", value: 75, unit: "%", status: "warning" },
  { name: "memory_usage", value: 60, unit: "%", status: "normal" },
  { name: "disk_usage", value: 45, unit: "%", status: "normal" },
  { name: "network_traffic", value: 200, unit: "MB/s", status: "normal" },
];

const MetricCard = (props: { metric: SystemMetric }) => {
  const t = useT();
  const getStatusColor = () => {
    switch (props.metric.status) {
      case "critical":
        return "$danger9";
      case "warning":
        return "$warning9";
      default:
        return "$success9";
    }
  };

  return (
    <VStack
      w="$full"
      spacing="$2"
      rounded="$lg"
      border="1px solid $neutral7"
      background={useColorModeValue("$neutral2", "$neutral3")()}
      p="$4"
      _hover={{
        border: `1px solid ${getMainColor()}`,
      }}
    >
      <HStack w="$full" justifyContent="space-between">
        <Text fontWeight="$semibold">{t(`system-monitoring.${props.metric.name}`)}</Text>
        <Box 
          w="$3" 
          h="$3" 
          rounded="$full" 
          bg={getStatusColor()}
        />
      </HStack>
      <Flex justifyContent="space-between" alignItems="end" w="$full" mt="$2">
        <Heading size="3xl">{props.metric.value.toFixed(1)}</Heading>
        <Text fontSize="$lg" color="$neutral11">{props.metric.unit}</Text>
      </Flex>
    </VStack>
  );
};

const SystemMonitoring = () => {
  const t = useT();
  useManageTitle("manage.sidemenu.system-monitoring");
  const [metrics, setMetrics] = createSignal<SystemMetric[]>(mockMetrics);

  const refreshData = () => {
    // 模拟刷新数据
    const updatedMetrics = metrics().map(metric => ({
      ...metric,
      value: metric.value + (Math.random() * 10 - 5) // 随机波动
    }));
    setMetrics(updatedMetrics);
  };

  return (
    <VStack spacing="$4" alignItems="stretch">
      <Flex justifyContent="space-between" alignItems="center">
        <Heading size="2xl">{t("system-monitoring.title")}</Heading>
        <Button colorScheme="accent" onClick={refreshData}>
          {t("global.refresh")}
        </Button>
      </Flex>
      
      <Grid 
        templateColumns={{
          "@initial": "1fr",
          "@md": "repeat(2, 1fr)",
          "@lg": "repeat(4, 1fr)"
        }} 
        gap="$4"
      >
        <For each={metrics()}>
          {(metric) => (
            <GridItem>
              <MetricCard metric={metric} />
            </GridItem>
          )}
        </For>
      </Grid>
    </VStack>
  );
};

export default SystemMonitoring;