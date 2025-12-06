import { Checkbox, createDisclosure } from "@hope-ui/solid"
import { createSignal, onCleanup } from "solid-js"
import { ModalFolderChoose } from "~/components"
import { useFetch, usePath, useRouter, useT } from "~/hooks"
import { selectedObjs } from "~/store"
import { bus, fsCopy, fsMove, handleRespWithNotifySuccess } from "~/utils"

export const Copy = () => {
  const t = useT()
  const { isOpen, onOpen, onClose } = createDisclosure()
  const [loading, ok] = useFetch(fsCopy)
  const { pathname } = useRouter()
  const { refresh } = usePath()
  const [overwrite, setOverwrite] = createSignal(false)
  const handler = (name: string) => {
    if (name === "copy") {
      onOpen()
      setOverwrite(false)
    }
  }
  bus.on("tool", handler)
  onCleanup(() => {
    bus.off("tool", handler)
  })
  return (
    <ModalFolderChoose
      header={t("home.toolbar.choose_dst_folder")}
      opened={isOpen()}
      onClose={onClose}
      loading={loading()}
      footerSlot={
        <Checkbox
          mr="auto"
          checked={overwrite()}
          onChange={() => {
            setOverwrite(!overwrite())
          }}
        >
          {t("home.conflict_policy.overwrite_existing")}
        </Checkbox>
      }
      onSubmit={async (dst) => {
        // 处理租户端路径
        let path = pathname();
        if (path.startsWith("/@tenant/data")) {
          // 租户端路径需要转换为实际路径
          path = path.substring("/@tenant/data".length) || "/";
        }
        const resp = await ok(
          path,
          dst,
          selectedObjs().map((obj) => obj.name),
          overwrite(),
        )
        handleRespWithNotifySuccess(resp, () => {
          refresh()
          onClose()
        })
      }}
    />
  )
}

export const Move = () => {
  const t = useT()
  const { isOpen, onOpen, onClose } = createDisclosure()
  const [loading, ok] = useFetch(fsMove)
  const { pathname } = useRouter()
  const { refresh } = usePath()
  const [overwrite, setOverwrite] = createSignal(false)
  const handler = (name: string) => {
    if (name === "move") {
      onOpen()
      setOverwrite(false)
    }
  }
  bus.on("tool", handler)
  onCleanup(() => {
    bus.off("tool", handler)
  })
  return (
    <ModalFolderChoose
      header={t("home.toolbar.choose_dst_folder")}
      opened={isOpen()}
      onClose={onClose}
      loading={loading()}
      footerSlot={
        <Checkbox
          mr="auto"
          checked={overwrite()}
          onChange={() => {
            setOverwrite(!overwrite())
          }}
        >
          {t("home.conflict_policy.overwrite_existing")}
        </Checkbox>
      }
      onSubmit={async (dst) => {
        // 处理租户端路径
        let path = pathname();
        if (path.startsWith("/@tenant/data")) {
          // 租户端路径需要转换为实际路径
          path = path.substring("/@tenant/data".length) || "/";
        }
        const resp = await ok(
          path,
          dst,
          selectedObjs().map((obj) => obj.name),
          overwrite(),
        )
        handleRespWithNotifySuccess(resp, () => {
          refresh()
          onClose()
        })
      }}
    />
  )
}