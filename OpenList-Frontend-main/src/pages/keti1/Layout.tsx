import { Box, Flex, Center, useColorModeValue } from "@hope-ui/solid"
import { Header } from "./Header"

const Layout = () => {
  return (
    <>
      <Header />
      <Flex w="$full" h="calc(100vh - 64px)">
        <Box
          w="$56"
          h="$full"
          id="keti1-sidebar"
        >
          {/* 侧边栏内容 */}
        </Box>
        <Box
          w="calc(100% - 14rem)"
          h="$full"
          id="keti1-content"
        >
          {/* 主要内容区域 */}
        </Box>
      </Flex>
    </>
  )
}

export default Layout