import { SideMenuItemProps } from "./SideMenu"
import {
  BsPersonCircle,
  BsShieldLock,
  BsBucket,
  BsKey,
  BsFolder,
  BsTools,
} from "solid-icons/bs"
import { Component, lazy } from "solid-js"

export type SideMenuItem = SideMenuItemProps & {
  component?: Component
  children?: SideMenuItem[]
}

export const side_menu_items: SideMenuItem[] = [
  {
    title: "数据管理",
    icon: BsFolder,
    to: "/keti1/data",
    component: lazy(() => import("./data/Layout")),
  },
  {
    title: "数据配置",
    icon: BsShieldLock,
    to: "/keti1/config",
    component: lazy(() => import("./config")),
  },
  {
    title: "安全配置",
    icon: BsKey,
    to: "/keti1/security",
    component: lazy(() => import("./security")),
  },
  {
    title: "数据集成",
    icon: BsBucket,
    to: "/keti1/integration",
    component: lazy(() => import("./integration")),
  },
  {
    title: "数据转化",
    icon: BsTools,
    to: "/keti1/transformation",
    component: lazy(() => import("./transformation")),
  },
  {
    title: "数据监控",
    icon: BsPersonCircle,
    to: "/keti1/monitoring",
    component: lazy(() => import("./monitoring")),
  },
]