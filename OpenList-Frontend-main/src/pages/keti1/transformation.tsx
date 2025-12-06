import { Center, Heading } from "@hope-ui/solid"
import { useT } from "~/hooks"

const Transformation = () => {
  const t = useT()
  return (
    <Center h="$full">
      <Heading>数据转化</Heading>
    </Center>
  )
}

export default Transformation