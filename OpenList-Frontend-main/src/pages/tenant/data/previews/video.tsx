import { Box, Button, HStack, Text, useColorModeValue } from "@hope-ui/solid"
import { ArtPlayerIconsSubtitle } from "~/components/icons"
import { useLink, useRouter, useT } from "~/hooks"
import { getMainColor, getSettingBool, objStore } from "~/store"
import { ObjType } from "~/types"
import { ext, pathDir, pathJoin } from "~/utils"
import Artplayer from "artplayer"
import { type Option } from "artplayer/types/option"
import { type Setting } from "artplayer/types/setting"
import Hls from "hls.js"
// import mpegts from "@harmonyjs/media-stream"
import mpegts from "flv.js"
import { currentLang } from "~/app/i18n"
import { onCleanup, onMount } from "solid-js"
import { useNavigate } from "@solidjs/router"
import { AutoHeightPlugin, VideoBox } from "./video_box"

const Preview = () => {
  const { proxyLink } = useLink()
  const { to } = useRouter()
  let videos = objStore.objs.filter((obj) => obj.type === ObjType.VIDEO)
  if (videos.length === 0) {
    videos = [objStore.obj]
  }
  const next_video = () => {
    const index = videos.findIndex((f) => f.name === objStore.obj.name)
    if (index < videos.length - 1) {
      // 在租户端使用相对路径导航，避免跳出框架
      to(
        videos[index + 1].name +
          "?auto_fullscreen=" +
          player.fullscreen,
      )
    }
  }
  const previous_video = () => {
    const index = videos.findIndex((f) => f.name === objStore.obj.name)
    if (index > 0) {
      // 在租户端使用相对路径导航，避免跳出框架
      to(
        videos[index - 1].name +
          "?auto_fullscreen=" +
          player.fullscreen,
      )
    }
  }
  let player: Artplayer
  let flvPlayer: mpegts.Player
  let hlsPlayer: Hls
  let option: Option = {
    container: "#video-player",
    url: objStore.raw_url,
    title: objStore.obj.name,
    volume: 0.5,
    autoplay: getSettingBool("video_autoplay"),
    autoSize: false,
    autoMini: true,
    loop: false,
    flip: true,
    playbackRate: true,
    aspectRatio: true,
    screenshot: true,
    setting: true,
    hotkey: true,
    pip: true,
    mutex: true,
    fullscreen: true,
    fullscreenWeb: true,
    subtitleOffset: true,
    miniProgressBar: false,
    playsInline: true,
    theme: getMainColor(),
    // layers: [],
    // settings: [],
    // contextmenu: [],
    controls: [
      {
        name: "previous-button",
        index: 10,
        position: "left",
        html: '<svg fill="none" stroke-width="2" xmlns="http://www.w3.org/2000/svg" height="22" width="22" class="icon icon-tabler icon-tabler-player-track-prev-filled" width="1em" height="1em" viewBox="0 0 24 24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="overflow: visible; color: currentcolor;"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M20.341 4.247l-8 7a1 1 0 0 0 0 1.506l8 7c.647 .565 1.659 .106 1.659 -.753v-14c0 -.86 -1.012 -1.318 -1.659 -.753z" stroke-width="0" fill="currentColor"></path><path d="M9.341 4.247l-8 7a1 1 0 0 0 0 1.506l8 7c.647 .565 1.659 .106 1.659 -.753v-14c0 -.86 -1.012 -1.318 -1.659 -.753z" stroke-width="0" fill="currentColor"></path></svg>',
        tooltip: "Previous",
        click: function () {
          previous_video()
        },
      },
      {
        name: "next-button",
        index: 11,
        position: "left",
        html: '<svg fill="none" stroke-width="2" xmlns="http://www.w3.org/2000/svg" height="22" width="22" class="icon icon-tabler icon-tabler-player-track-next-filled" width="1em" height="1em" viewBox="0 0 24 24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="overflow: visible; color: currentcolor;"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M2 5v14c0 .86 1.012 1.318 1.659 .753l8 -7a1 1 0 0 0 0 -1.506l-8 -7c-.647 -.565 -1.659 -.106 -1.659 .753z" stroke-width="0" fill="currentColor"></path><path d="M13 5v14c0 .86 1.012 1.318 1.659 .753l8 -7a1 1 0 0 0 0 -1.506l-8 -7c-.647 -.565 -1.659 -.106 -1.659 .753z" stroke-width="0" fill="currentColor"></path></svg>',
        tooltip: "Next",
        click: function () {
          next_video()
        },
      },
    ],
    quality: [],
    // highlight: [],
    plugins: [AutoHeightPlugin],
    whitelist: [],
    settings: [],
    // subtitle:{}
    moreVideoAttr: {
      // @ts-ignore
      "webkit-playsinline": true,
      playsInline: true,
      crossOrigin: "anonymous",
    },
    type: ext(objStore.obj.name),
    customType: {
      flv: function (video: HTMLMediaElement, url: string) {
        flvPlayer = mpegts.createPlayer(
          {
            type: "flv",
            url: url,
          },
          { referrerPolicy: "same-origin" },
        )
        flvPlayer.attachMediaElement(video)
        flvPlayer.load()
      },
      m3u8: function (video: HTMLMediaElement, url: string) {
        hlsPlayer = new Hls()
        hlsPlayer.loadSource(url)
        hlsPlayer.attachMedia(video)
        if (!video.src) {
          video.src = url
        }
      },
    },
    lang: ["en", "zh-cn", "zh-tw"].includes(currentLang().toLowerCase())
      ? (currentLang().toLowerCase() as string)
      : "en",
    lock: true,
    fastForward: true,
    autoPlayback: true,
    autoOrientation: true,
    airplay: true,
  }
  const subtitle = objStore.related.filter((obj) => {
    for (const ext of [".srt", ".ass", ".vtt"]) {
      if (obj.name.endsWith(ext)) {
        return true
      }
    }
    return false
  })
  const danmu = objStore.related.find((obj) => {
    for (const ext of [".xml"]) {
      if (obj.name.endsWith(ext)) {
        return true
      }
    }
    return false
  })

  // TODO: add a switch in manage panel to choose whether to enable `libass-wasm`
  const enableEnhanceAss = true

  if (subtitle.length != 0) {
    let isEnhanceAssMode = false

    // set default subtitle
    const defaultSubtitle = subtitle[0]
    if (enableEnhanceAss && ext(defaultSubtitle.name).toLowerCase() === "ass") {
      isEnhanceAssMode = true
      option.plugins?.push(
        artplayerPluginAss({
          // debug: true,
          subUrl: proxyLink(defaultSubtitle, true),
        }),
      )
    } else {
      option.subtitle = {
        url: proxyLink(defaultSubtitle, true),
        type: ext(defaultSubtitle.name),
        escape: false,
      }
    }

    // render subtitle toggle menu
    const innerMenu: Setting[] = [
      {
        id: "setting_subtitle_display",
        html: "Display",
        tooltip: "Show",
        switch: true,
        onSwitch: function (item: Setting) {
          item.tooltip = item.switch ? "Hide" : "Show"
          setSubtitleVisible(!item.switch)

          // sync menu subtitle tooltip
          const menu_sub = option.settings?.find(
            (_) => _.id === "setting_subtitle",
          )
          menu_sub && (menu_sub.tooltip = item.tooltip)

          return !item.switch
        },
      },
    ]
    subtitle.forEach((item, i) => {
      innerMenu.push({
        default: i === 0,
        html: (
          <span
            title={item.name}
            style={{
              "max-width": "200px",
              overflow: "hidden",
              "text-overflow": "ellipsis",
              "word-break": "break-all",
              "white-space": "normal",
              display: "-webkit-box",
              "-webkit-line-clamp": "2",
              "-webkit-box-orient": "vertical",
            }}
          >
            {item.name}
          </span>
        ),
        name: item.name,
        click: function (item: Setting) {
          // update subtitle
          if (
            enableEnhanceAss &&
            ext(item.name).toLowerCase() === "ass" &&
            !isEnhanceAssMode
          ) {
            isEnhanceAssMode = true
            player.plugins.artplayerPluginAss.switch(
              proxyLink(item, true),
              true,
            )
          } else if (
            enableEnhanceAss &&
            ext(item.name).toLowerCase() !== "ass" &&
            isEnhanceAssMode
          ) {
            isEnhanceAssMode = false
            player.plugins.artplayerPluginAss.destroy()
            player.subtitle.switch(proxyLink(item, true), {
              name: item.name,
            })
          } else if (isEnhanceAssMode) {
            player.plugins.artplayerPluginAss.switch(
              proxyLink(item, true),
              true,
            )
          } else {
            player.subtitle.switch(proxyLink(item, true), {
              name: item.name,
            })
          }

          // update current selected subtitle
          const menu_sub = option.settings?.find(
            (_) => _.id === "setting_subtitle",
          )
          menu_sub && (menu_sub.tooltip = item.name)
        },
      })
    })

    // add subtitle setting
    option.settings?.push({
      id: "setting_subtitle",
      html: "Subtitle",
      tooltip: defaultSubtitle.name,
      selector: innerMenu,
    })

    // add subtitle toggle button
    option.controls?.push({
      name: "subtitle-toggle",
      position: "right",
      index: 10,
      html: <ArtPlayerIconsSubtitle />,
      tooltip: "Show",
      click: function (item: any) {
        item.tooltip = item.tooltip == "Show" ? "Hide" : "Show"
        setSubtitleVisible(item.tooltip == "Show")
      },
    } as any)
  }

  if (danmu) {
    option.plugins?.push(
      artplayerPluginDanmuku({
        danmuku: proxyLink(danmu, true),
      }),
    )
  }

  onMount(() => {
    player = new Artplayer(option)
    player.on("destroy", () => {
      flvPlayer?.destroy()
      hlsPlayer?.destroy()
    })
  })

  onCleanup(() => {
    player?.destroy()
  })

  const setSubtitleVisible = (visible: boolean) => {
    const $sub = document.querySelector(".art-subtitle") as HTMLElement
    const $ctl = document.querySelector(
      ".art-control-subtitle-toggle",
    ) as HTMLElement
    if ($sub && $ctl) {
      $sub.style.display = visible ? "block" : "none"
      $ctl.style.color = visible
        ? useColorModeValue("$neutral12", "$neutral2")()
        : useColorModeValue("$neutral9", "$neutral6")()
    }
  }

  return (
    <VideoBox>
      <Box w="$full" id="video-player" />
    </VideoBox>
  )
}

export default Preview