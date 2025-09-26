import { Link, useLocation } from "@solidjs/router"
import { Anchor } from "@hope-ui/solid"
import { joinBase, encodePath } from "~/utils"
import { useRouter } from "~/hooks"
import { ComponentProps } from "solid-js"

export const LinkWithBase = (
  props: ComponentProps<typeof Link> & { encode?: boolean },
) => (
  <Link
    {...props}
    href={joinBase(props.encode ? encodePath(props.href) : props.href)}
  />
)

export const AnchorWithBase = (
  props: ComponentProps<typeof Anchor> & { cancelBase?: boolean },
) => (
  <Anchor
    {...props}
    href={props.cancelBase ? props.href : joinBase(props.href)}
  />
)

export const LinkWithPush = (props: ComponentProps<typeof LinkWithBase>) => {
  const { pushHref } = useRouter()
  const location = useLocation()
  
  // 租户端特殊处理：使用相对路径导航避免跳出框架
  if (location.pathname.startsWith("/@tenant/data")) {
    return <Link {...props} href={props.href} />
  }
  
  return <LinkWithBase {...props} href={pushHref(props.href)} />
}