import {
  VStack,
  Input,
  Heading,
  HStack,
  IconButton,
  Checkbox,
  Text,
  Badge,
  Progress,
  ProgressIndicator,
  Button,
  Box,
  Stack,
} from "@hope-ui/solid"
import { createSignal, For, Show, onMount } from "solid-js"
import { Resp } from "~/types"
import { usePath, useRouter, useT } from "~/hooks"
import { getMainColor } from "~/store"
import {
  RiDocumentFolderUploadFill,
  RiDocumentFileUploadFill,
} from "solid-icons/ri"
import { getFileSize, notify, pathJoin, r } from "~/utils"
import { asyncPool } from "~/utils/async_pool"
import { createStore } from "solid-js/store"
import { UploadFileProps, StatusBadge } from "./types"
import { File2Upload, traverseFileTree } from "./util"
import { SelectWrapper } from "~/components"
import { getUploads } from "./uploads"

const UploadFile = (props: UploadFileProps) => {
  const t = useT()
  return (
    <VStack
      w="$full"
      spacing="$1"
      rounded="$lg"
      border="1px solid $neutral7"
      alignItems="start"
      p="$2"
      _hover={{
        border: `1px solid ${getMainColor()}`,
      }}
    >
      <Text
        css={{
          wordBreak: "break-all",
        }}
      >
        {props.path}
      </Text>
      <HStack spacing="$2">
        <Badge colorScheme={StatusBadge[props.status]}>
          {t(`home.upload.${props.status}`)}
        </Badge>
        <Text>{getFileSize(props.speed)}/s</Text>
      </HStack>
      <Progress
        w="$full"
        trackColor="$info3"
        rounded="$full"
        value={props.progress}
        size="sm"
      >
        <ProgressIndicator color={getMainColor()} rounded="$md" />
        {/* <ProgressLabel /> */}
      </Progress>
      <Text color="$danger10">{props.msg}</Text>
    </VStack>
  )
}

const Upload = () => {
  const t = useT()
  const { pathname } = useRouter()
  const { refresh } = usePath()
  const [drag, setDrag] = createSignal(false)
  const [uploading, setUploading] = createSignal(false)
  const [asTask, setAsTask] = createSignal(false)
  const [overwrite, setOverwrite] = createSignal(false)
  const [rapid, setRapid] = createSignal(true)
  const [uploadFiles, setUploadFiles] = createStore<{
    uploads: UploadFileProps[]
  }>({
    uploads: [],
  })
  const allDone = () => {
    return uploadFiles.uploads.every(({ status }) =>
      ["success", "error"].includes(status),
    )
  }

  // Data Structure Logic
  const [activeStructures, setActiveStructures] = createSignal<any[]>([])
  onMount(async () => {
    try {
      const resp = await r.get("/keti1/data-structure/active") as unknown as Resp<any>
      if (resp.code === 200) {
        setActiveStructures(resp.data)
      }
    } catch (e) {
      console.error("Failed to fetch active data structures", e)
    }
  })

  let fileInput: HTMLInputElement = undefined!
  let folderInput: HTMLInputElement = undefined!

  const handleAddFiles = async (files: File[]) => {
    if (files.length === 0) return

    // Validate files against active structures
    const structures = activeStructures()
    const validFiles: File[] = []

    // If no active structures defined, do we allow everything? 
    // Requirement says: "manage different data structures... if matches allowed extensions then upload"
    // This implies if NO active structures, nothing can be uploaded? Or maybe we should skip validation if list is empty?
    // Let's assume strict mode: Must match an active structure.

    if (structures.length === 0) {
      // If no structures are defined, we might want to allow everything OR nothing.
      // Given the requirement "manage integration of DIFFERENT data structures", it implies a whitelist system.
      // However, if the system is fresh, it might block everything.
      // Let's allow everything if NO structures are defined to avoid bricking the system, 
      // OR warn user. 
      // Let's implement strict check but log warning.
      // User asked: "if matches condition, allow upload".
      // Let's check extensions.
    }

    const getAllowedExtensions = () => {
      const exts = new Set<string>()
      structures.forEach((s: any) => {
        if (s.allowed_extensions) {
          s.allowed_extensions.split(",").forEach((ext: string) => exts.add(ext.trim().toLowerCase()))
        }
      })
      return exts
    }

    const allowedExts = getAllowedExtensions()
    // If no extensions defined at all, maybe allow all? 
    // Let's enforce: If there are active structures, file MUST match one. 
    // If there are NO active structures, we allow uploading (fallback to default behavior).
    const enforceValidation = structures.length > 0

    for (const file of files) {
      if (enforceValidation) {
        const ext = "." + file.name.split(".").pop()?.toLowerCase()
        if (!allowedExts.has(ext)) {
          notify.warning(`文件 ${file.name} 的类型不在允许的上传列表中`)
          continue
        }
      }
      validFiles.push(file)
    }

    if (validFiles.length === 0) return

    setUploading(true)
    for (const file of validFiles) {
      const upload = File2Upload(file)
      setUploadFiles("uploads", (uploads) => [...uploads, upload])
    }
    for await (const ms of asyncPool(3, validFiles, handleFile)) {
      console.log(ms)
    }
    refresh(undefined, true)
  }
  const setUpload = (path: string, key: keyof UploadFileProps, value: any) => {
    setUploadFiles("uploads", (upload) => upload.path === path, key, value)
  }
  const uploaders = getUploads()
  const [curUploader, setCurUploader] = createSignal(uploaders[0])
  const handleFile = async (file: File) => {
    const path = file.webkitRelativePath ? file.webkitRelativePath : file.name
    setUpload(path, "status", "uploading")
    const uploadPath = pathJoin(pathname(), path)
    try {
      const err = await curUploader().upload(
        uploadPath,
        file,
        (key, value) => {
          setUpload(path, key, value)
        },
        asTask(),
        overwrite(),
        rapid(),
      )
      if (!err) {
        setUpload(path, "status", "success")
        setUpload(path, "progress", 100)
      } else {
        setUpload(path, "status", "error")
        setUpload(path, "msg", err.message)
      }
    } catch (e: any) {
      console.error(e)
      setUpload(path, "status", "error")
      setUpload(path, "msg", e.message)
    }
  }
  return (
    <VStack w="$full" pb="$2" spacing="$2">
      <Show
        when={!uploading()}
        fallback={
          <>
            <HStack spacing="$2">
              <Button
                colorScheme="accent"
                onClick={() => {
                  setUploadFiles("uploads", (_uploads) =>
                    _uploads.filter(
                      ({ status }) => !["success", "error"].includes(status),
                    ),
                  )
                  console.log(uploadFiles.uploads)
                }}
              >
                {t("home.upload.clear_done")}
              </Button>
              <Show when={allDone()}>
                <Button
                  onClick={() => {
                    setUploading(false)
                  }}
                >
                  {t("home.upload.back")}
                </Button>
              </Show>
            </HStack>
            <For each={uploadFiles.uploads}>
              {(upload) => <UploadFile {...upload} />}
            </For>
          </>
        }
      >
        <Input
          type="file"
          multiple
          ref={fileInput!}
          display="none"
          onChange={(e) => {
            // @ts-ignore
            handleAddFiles(Array.from(e.target.files ?? []))
          }}
        />
        <Input
          type="file"
          multiple
          // @ts-ignore
          webkitdirectory
          ref={folderInput!}
          display="none"
          onChange={(e) => {
            // @ts-ignore
            handleAddFiles(Array.from(e.target.files ?? []))
          }}
        />
        <VStack
          w="$full"
          justifyContent="center"
          border={`2px dashed ${drag() ? getMainColor() : "$neutral8"}`}
          rounded="$lg"
          spacing="$4"
          p="$6"
          minH="$56"
          onDragOver={(e: DragEvent) => {
            e.preventDefault()
            setDrag(true)
          }}
          onDragLeave={() => {
            setDrag(false)
          }}
          onDrop={async (e: DragEvent) => {
            e.preventDefault()
            e.stopPropagation()
            setDrag(false)
            const res: File[] = []
            const items = Array.from(e.dataTransfer?.items ?? [])
            const files = Array.from(e.dataTransfer?.files ?? [])
            let itemLength = items.length
            const folderEntries = []
            for (let i = 0; i < itemLength; i++) {
              const item = items[i]
              const entry = item.webkitGetAsEntry()
              if (entry?.isFile) {
                res.push(files[i])
              } else if (entry?.isDirectory) {
                folderEntries.push(entry)
              }
            }
            for (const entry of folderEntries) {
              const innerFiles = await traverseFileTree(entry)
              res.push(...innerFiles)
            }
            if (res.length === 0) {
              notify.warning(t("home.upload.no_files_drag"))
            }
            handleAddFiles(res)
          }}
        >
          <Show
            when={!drag()}
            fallback={<Heading>{t("home.upload.release")}</Heading>}
          >
            <Heading size="lg" textAlign="center">
              {t("home.upload.upload-tips")}
            </Heading>
            <Box w={{ "@initial": "80%", "@md": "30%" }}>
              <SelectWrapper
                value={curUploader().name}
                onChange={(name) => {
                  setCurUploader(
                    uploaders.find((uploader) => uploader.name === name)!,
                  )
                }}
                options={uploaders.map((uploader) => {
                  return {
                    label: uploader.name,
                    value: uploader.name,
                  }
                })}
              />
            </Box>
            <HStack spacing="$4">
              <VStack spacing="$2" alignItems="center">
                <IconButton
                  compact
                  size="xl"
                  aria-label={t("home.upload.upload_folder")}
                  colorScheme="accent"
                  icon={<RiDocumentFolderUploadFill size="1.2em" />}
                  onClick={() => {
                    folderInput.click()
                  }}
                />
                <Text fontSize="$sm" color="$neutral11" textAlign="center">
                  {t("home.upload.upload_folder")}
                </Text>
              </VStack>

              <VStack spacing="$2" alignItems="center">
                <IconButton
                  compact
                  size="xl"
                  aria-label={t("home.upload.upload_files")}
                  icon={<RiDocumentFileUploadFill size="1.2em" />}
                  onClick={() => {
                    fileInput.click()
                  }}
                />
                <Text fontSize="$sm" color="$neutral11" textAlign="center">
                  {t("home.upload.upload_files")}
                </Text>
              </VStack>
            </HStack>
            <Stack
              spacing={{ "@initial": "$2", "@md": "$4" }}
              direction={{ "@initial": "column", "@md": "row" }}
            >
              <Checkbox
                checked={asTask()}
                onChange={() => {
                  setAsTask(!asTask())
                }}
              >
                {t("home.upload.add_as_task")}
              </Checkbox>
              <Checkbox
                checked={overwrite()}
                onChange={() => {
                  setOverwrite(!overwrite())
                }}
              >
                {t("home.conflict_policy.overwrite_existing")}
              </Checkbox>
              <Checkbox
                checked={rapid()}
                onChange={() => {
                  setRapid(!rapid())
                }}
              >
                {t("home.upload.try_rapid")}
              </Checkbox>
            </Stack>
          </Show>
        </VStack>
      </Show>
    </VStack>
  )
}

export default Upload
