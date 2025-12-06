import { Center, Heading } from "@hope-ui/solid"
import { useT } from "~/hooks"

const Monitoring = () => {
  const t = useT()
  return (
    <Center h="$full">
      <Heading>数据监控</Heading>
    </Center>
  )
}

export default Monitoring