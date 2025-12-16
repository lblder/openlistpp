import { JSXElement, createSignal } from "solid-js"
import { FullScreenLoading } from "~/components"
import { useFetch, useRouter } from "~/hooks"
import { Me, setMe } from "~/store"
import { PResp } from "~/types"
import { r, handleRespWithoutNotify } from "~/utils"

const StrictlyMustUser = (props: { children: JSXElement }) => {
  const { to, pathname } = useRouter()
  const [loading, data] = useFetch((): PResp<Me> => r.get("/me"))
  const [authenticated, setAuthenticated] = createSignal<boolean | null>(null)

    ; (async () => {
      handleRespWithoutNotify(
        await data(),
        (userData) => {
          // 认证成功
          setMe(userData)
          setAuthenticated(true)
        },
        (_errMsg, code) => {
          // 认证失败
          setAuthenticated(false)

          // 如果是 401 未授权，重定向到登录页
          if (code === 401) {
            const currentPath = pathname()
            // 避免在 /@manage 首页无限重定向
            if (currentPath === "/@manage") {
              to("/")
            } else {
              to(`/@login?redirect=${encodeURIComponent(currentPath)}`)
            }
          }
        },
        true  // auth = true
      )
    })()

  // 如果仍在加载且认证状态未知，显示加载界面
  if (loading() && authenticated() === null) {
    return <FullScreenLoading />
  }

  // 只有认证成功的用户才能看到内容，否则显示加载（等待重定向）
  return authenticated() ? props.children : <FullScreenLoading />
}

export { StrictlyMustUser }