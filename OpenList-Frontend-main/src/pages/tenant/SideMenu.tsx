import { Box, Center, Icon, Text, VStack, HStack } from "@hope-ui/solid"
import { useLocation, useNavigate } from "@solidjs/router"
import { Component, createMemo, For, JSXElement, Show } from "solid-js"
import { useT } from "~/hooks"

export interface SideMenuItemProps {
  title: string
  icon: Component<{ size: number }>
  to?: string
  role?: number
  external?: boolean
  refresh?: boolean
  children?: SideMenuItemProps[]
  group?: string
}

export interface SideMenuItem extends SideMenuItemProps {
  component?: Component
}

interface Props {
  items: SideMenuItem[]
}

export const SideMenu = (props: Props) => {
  const navigate = useNavigate()
  const location = useLocation()
  const t = useT()
  const active = (to?: string) => {
    if (!to) return false
    return (
      location.pathname === to ||
      location.pathname.startsWith(to.endsWith("/") ? to : to + "/")
    )
  }
  const onClick = (item: SideMenuItem) => {
    if (item.to) {
      if (item.external) {
        window.open(item.to, "_blank")
        return
      }
      if (item.refresh) {
        window.location.href = item.to
        return
      }
      navigate(item.to)
    }
  }
  const filtered_items = createMemo(() =>
    props.items.filter((item) => {
      return !item.group
    }),
  )
  return (
    <VStack spacing="$1" w="$full">
      <For each={filtered_items()}>
        {(item) => (
          <Box
            as="button"
            w="$full"
            px="$4"
            py="$3"
            display="flex"
            flexDirection="column"
            alignItems="start"
            transition="all 0.2s ease-in-out"
            border="none"
            cursor="pointer"
            bgColor={active(item.to) ? "$primary5" : "transparent"}
            onClick={() => onClick(item)}
            _hover={{
              bgColor: active(item.to) ? "$primary5" : "$primary2",
            }}
            css={{
              "&:focus": {
                outline: "none",
              },
            }}
          >
            <HStack spacing="$3">
              <Show when={item.icon}>
                <Icon
                  as={item.icon}
                  boxSize="$5"
                  color={active(item.to) ? "$primary11" : "$neutral11"}
                />
              </Show>
              <Text
                size={{ "@initial": "$sm", "@sm": "$md" }}
                css={{
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                fontWeight={active(item.to) ? "$medium" : "$normal"}
                color={active(item.to) ? "$primary11" : "$neutral11"}
              >
                {t(item.title)}
              </Text>
            </HStack>
          </Box>
        )}
      </For>
    </VStack>
  )
}