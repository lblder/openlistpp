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
    title: "tenant.sidemenu.profile",
    icon: BsPersonCircle,
    to: "/@tenant/profile",
    component: lazy(() => import("./Profile")),
  },
  {
    title: "tenant.sidemenu.certificates",
    icon: BsShieldLock,
    to: "/@tenant/certificates",
    component: lazy(() => import("./Certificates")),
  },
  {
    title: "tenant.sidemenu.data",
    icon: BsBucket,
    to: "/@tenant/data",
    component: lazy(() => import("./data/Layout")),
    children: [
      {
        title: "tenant.sidemenu.data.credentials",
        icon: BsKey,
        to: "/@tenant/data/credentials",
        component: lazy(() => import("./data/credentials/Index")),
      },
      {
        title: "tenant.sidemenu.data.business",
        icon: BsFolder,
        to: "/@tenant/data/business",
        component: lazy(() => import("./data/business/Index")),
      },
      {
        title: "tenant.sidemenu.data.tools",
        icon: BsTools,
        to: "/@tenant/data/tools",
        component: lazy(() => import("./data/tools/Index")),
      },
    ],
  },
]