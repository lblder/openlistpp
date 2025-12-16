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

    const structures = activeStructures()
    const validFiles: File[] = []

    // Get current folder information
    const currentPath = pathname()
    const pathSegments = currentPath.split("/").filter(Boolean)
    const currentFolderName = pathSegments[pathSegments.length - 1]

    // Common file extensions that should trigger strict folder-based validation
    const COMMON_EXTENSIONS = [
      'pcap', 'txt', 'log', 'json', 'xml', 'csv', 'pdf',
      'jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp',
      'mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv',
      'mp3', 'wav', 'flac', 'aac', 'ogg',
      'zip', 'rar', '7z', 'tar', 'gz',
      'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
      'html', 'css', 'js', 'ts', 'py', 'java', 'cpp', 'c', 'h',
      'md', 'yml', 'yaml', 'toml', 'ini', 'conf'
    ]

    // Build a map: extension (without dot) -> structure name
    // Example: "pcap" -> "网络数据包"
    const extensionToStructure = new Map<string, any>()
    structures.forEach((s: any) => {
      if (s.allowed_extensions) {
        // Extract extension without dot (e.g., ".pcap" -> "pcap")
        const ext = s.allowed_extensions.trim().toLowerCase().replace(/^\./, '')
        if (ext) {
          extensionToStructure.set(ext, s)
        }
      }
    })

    // Determine validation strategy
    let validationMode: 'none' | 'registered' | 'whitelist' = 'none'
    let allowedExtension: string = ''
    let structureName: string = ''

    if (currentFolderName && currentFolderName.toLowerCase() !== "data") {
      const folderLower = currentFolderName.toLowerCase()

      // Priority 1: Check if folder name matches a registered extension
      if (extensionToStructure.has(folderLower)) {
        validationMode = 'registered'
        allowedExtension = '.' + folderLower
        structureName = extensionToStructure.get(folderLower).name
      }
      // Priority 2: Check if folder name is in common extensions whitelist
      else if (COMMON_EXTENSIONS.includes(folderLower)) {
        validationMode = 'whitelist'
        allowedExtension = '.' + folderLower
      }
      // Otherwise: no validation (allow all files)
    }

    for (const file of files) {
      const fileName = file.name
      const ext = '.' + (fileName.split('.').pop()?.toLowerCase() || '')
      let shouldSkip = false

      if (validationMode === 'registered') {
        // Registered structure validation
        if (ext !== allowedExtension) {
          notify.warning(`文件 ${fileName} 的类型不在数据结构"${structureName}"允许的上传列表中（仅允许 ${allowedExtension} 文件）`)
          shouldSkip = true
        }
      } else if (validationMode === 'whitelist') {
        // Whitelist-based validation
        if (ext !== allowedExtension) {
          notify.warning(`文件 ${fileName} 类型(${ext})与当前文件夹(${currentFolderName})不匹配，无法上传（仅允许 ${allowedExtension} 文件）`)
          shouldSkip = true
        }
      }

      if (!shouldSkip) {
        validFiles.push(file)
      }
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
