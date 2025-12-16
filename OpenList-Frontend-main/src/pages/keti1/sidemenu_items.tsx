import { SideMenuItemProps } from "./SideMenu"
import {
  BsShieldLock,
  BsBucket,
  BsKey,
  BsFolder,
} from "solid-icons/bs"
import { Component, lazy } from "solid-js"

export type SideMenuItem = SideMenuItemProps & {
  component?: Component
  children?: SideMenuItem[]
}

export const side_menu_items: SideMenuItem[] = [

  {
    title: "数据集成",
    icon: BsFolder,
    to: "/keti1/data",
    component: lazy(() => import("./integration")),
  },
  {
    title: "数据管理",
    icon: BsBucket,
    to: "/keti1/management",
    component: lazy(() => import("./data-security")),
  },
  {
    title: "数据保障",
    icon: BsShieldLock,
    to: "/keti1/protection",
    component: lazy(() => import("./security")),
  },

]