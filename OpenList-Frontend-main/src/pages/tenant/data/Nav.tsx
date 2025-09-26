import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbProps,
  BreadcrumbSeparator,
} from "@hope-ui/solid"
import { Link } from "@solidjs/router"
import { createMemo, For, Show } from "solid-js"
import { usePath, useRouter, useT } from "~/hooks"
import { getSetting, local } from "~/store"
import { encodePath, hoverColor, joinBase } from "~/utils"

export const Nav = () => {
  const { pathname, isShare } = useRouter()
  const paths = createMemo(() => {
    if (!isShare()) {
      const segments = pathname().split("/").filter(Boolean)
      // 只过滤前缀中的 @tenant 和 data，保留实际的 @tenant 文件夹
      const filteredSegments = segments.filter((seg, index) => {
        // 只过滤开头的 @tenant 前缀
        if (index === 0 && seg === "@tenant") return false
        // 只过滤紧跟在 @tenant 后面的 data
        if (index === 1 && seg === "data" && segments[0] === "@tenant") return false
        // 保留其他所有路径段，包括名为 @tenant 的文件夹
        return true
      })
      return ["", ...filteredSegments]
    } else {
      const p = pathname().split("/").filter(Boolean)
      return [`@s/${p[1] ?? ""}`, ...p.slice(2)]
    }
  })
  const t = useT()
  const { setPathAs } = usePath()

  const stickyProps = createMemo<BreadcrumbProps>(() => {
    const mask: BreadcrumbProps = {
      _after: {
        content: "",
        backgroundColor: "$background",
        position: "absolute",
        height: "100%",
        width: "99vw",
        zIndex: -1,
        transform: "translateX(-50%)",
        left: "50%",
        top: 0,
      },
    }

    switch (local["position_of_header_navbar"]) {
      case "only_navbar_sticky":
        return { ...mask, position: "sticky", zIndex: "$sticky", top: 0 }
      case "sticky":
        return { ...mask, position: "sticky", zIndex: "$sticky", top: 60 }
      default:
        return {
          _after: undefined,
          position: undefined,
          zIndex: undefined,
          top: undefined,
        }
    }
  })

  return (
    <Breadcrumb {...stickyProps} background="$background" class="nav" w="$full">
      <For each={paths()}>
        {(name, i) => {
          const isLast = createMemo(() => i() === paths().length - 1)
          let path = paths()
            .slice(0, i() + 1)
            .join("/")
          // 构建完整的租户路径，包含 /@tenant/data 前缀
          if (path && !path.startsWith("/@tenant/data")) {
            // 确保正确的斜杠分隔符
            path = "/@tenant/data" + (path.startsWith("/") ? "" : "/") + path
          } else if (!path) {
            path = "/@tenant/data"
          }
          const href = encodePath(path)
          let text = () => name
          if (!isShare() && text() === "") {
            text = () => getSetting("home_icon") + t("tenant.sidemenu.data")
          } else if (isShare() && i() === 0) {
            text = () => getSetting("share_icon") + t("manage.sidemenu.shares")
          }
          return (
            <BreadcrumbItem class="nav-item">
              <BreadcrumbLink
                class="nav-link"
                css={{
                  wordBreak: "break-all",
                }}
                color="unset"
                _hover={{ backgroundColor: hoverColor(), color: "unset" }}
                _active={{ transform: "scale(.95)", transition: "0.1s" }}
                cursor="pointer"
                p="$1"
                rounded="$lg"
                currentPage={isLast()}
                as={isLast() ? undefined : Link}
                href={joinBase(href)}
                onMouseEnter={() => setPathAs(path)}
              >
                {text()}
              </BreadcrumbLink>
              <Show when={!isLast()}>
                <BreadcrumbSeparator class="nav-separator" />
              </Show>
            </BreadcrumbItem>
          )
        }}
      </For>
    </Breadcrumb>
  )
}