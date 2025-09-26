import { SideMenuItem } from "./SideMenu"
import {
  BsPersonCircle,
  BsShieldLock,
  BsBucket,
} from "solid-icons/bs"
import { Component, lazy } from "solid-js"

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
  },
]