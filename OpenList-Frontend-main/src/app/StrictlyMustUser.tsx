import { JSXElement, createSignal, Match, Switch } from "solid-js"
import { FullScreenLoading } from "~/components"
import { useFetch, useT } from "~/hooks"
import { Me, setMe } from "~/store"
import { PResp } from "~/types"
import { r, handleResp } from "~/utils"

const StrictlyMustUser = (props: { children: JSXElement }) => {
  const t = useT()
  const [loading, data] = useFetch((): PResp<Me> => r.get("/me"))
  const [authenticated, setAuthenticated] = createSignal<boolean | null>(null)
  
  ;(async () => {
    handleResp(await data(), setMe, (_errMsg) => {
      // 认证失败，标记为未认证
      setAuthenticated(false)
    }, () => {
      // 认证成功
      setAuthenticated(true)
    })
  })()
  
  // 如果仍在加载且认证状态未知，显示加载界面
  if (loading() && authenticated() === null) {
    return <FullScreenLoading />
  }
  
  // 只有认证成功的用户才能看到内容
  return authenticated() ? props.children : null
}

export { StrictlyMustUser }