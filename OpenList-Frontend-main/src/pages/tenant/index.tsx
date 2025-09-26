import { Box, Center, Flex, useColorModeValue } from "@hope-ui/solid"
import { FullLoading, SwitchColorMode, SwitchLanguageWhite } from "~/components"
import { useT, useTitle } from "~/hooks"
import { Header } from "./Header"
import { SideMenu } from "./SideMenu"
import { side_menu_items } from "./sidemenu_items"
import { Route, Routes } from "@solidjs/router"
import { For, Suspense } from "solid-js"
import { routes } from "./routes"

const Tenant = () => {
  const t = useT()
  useTitle(() => t("tenant.title"))
  return (
    <Box
      css={{
        "--hope-colors-background": "var(--hope-colors-loContrast)",
      }}
      bgColor="$background"
      w="$full"
    >
      <Header />
      <Flex w="$full" h="calc(100vh - 64px)">
        <Box
          display={{ "@initial": "none", "@sm": "block" }}
          w="$56"
          h="$full"
          shadow="$md"
          bgColor={useColorModeValue("$background", "$neutral2")()}
          overflowY="auto"
        >
          <SideMenu items={side_menu_items} />
          <Center>
            <Box p="$2" color="$neutral11">
              <SwitchLanguageWhite />
              <SwitchColorMode />
            </Box>
          </Center>
        </Box>
        <Box
          w={{
            "@initial": "$full",
            "@sm": "calc(100% - 14rem)",
          }}
          p="$4"
          overflowY="auto"
        >
          <Suspense fallback={<FullLoading />}>
            <Routes>
              <For each={routes}>
                {(route) => {
                  // 为租户端数据管理添加动态路由支持
                  if (route.to === "/data") {
                    return (
                      <>
                        <Route path={route.to} component={route.component} />
                        <Route path={`${route.to}/*`} component={route.component} />
                      </>
                    )
                  }
                  // 处理其他可能包含动态参数的路由
                  if (route.to.includes("/*")) {
                    return <Route path={route.to} component={route.component} />
                  }
                  return <Route path={route.to} component={route.component} />
                }}
              </For>
            </Routes>
          </Suspense>
        </Box>
      </Flex>
    </Box>
  )
}

export default Tenant