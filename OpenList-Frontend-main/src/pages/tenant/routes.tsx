import { lazy } from "solid-js"
import { Center, Heading } from "@hope-ui/solid"
import { trimLeft } from "~/utils"
import { side_menu_items, SideMenuItem } from "./sidemenu_items"
import { Route } from "@solidjs/router"

type RouteItem = Pick<SideMenuItem, "to" | "component">

const Placeholder = (props: { title: string; to: string }) => {
  return (
    <Center h="$full">
      <Heading>{props.title}</Heading>
    </Center>
  )
}

const get_routes = (items: SideMenuItem[], acc: RouteItem[] = []) => {
  items.forEach((item) => {
    if (item.children) {
      // 为父级菜单项添加路由
      if (item.to) {
        const trimmedPath = trimLeft(item.to, "/@tenant");
        acc.push({
          to: trimmedPath,
          component:
            item.component ||
            (() => <Placeholder title={item.title} to={item.to || "empty"} />),
        });
      }
      
      // 为子菜单项添加路由
      get_routes(item.children, acc)
    } else {
      if (item.to) {
        const trimmedPath = trimLeft(item.to, "/@tenant");
        acc.push({
          to: trimmedPath,
          component:
            item.component ||
            (() => <Placeholder title={item.title} to={item.to || "empty"} />),
        })
        
        // 为 data 路由添加动态路由支持
        if (trimmedPath === "/data") {
          acc.push({
            to: "/data/*",
            component: item.component,
          });
        }
      }
    }
  })
  return acc
}

const routes = get_routes(side_menu_items)
export { routes }