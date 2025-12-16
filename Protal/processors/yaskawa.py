# processors/yaskawa.py
from .base import BaseProtocolProcessor
import logging

logger = logging.getLogger(__name__)


class YaskawaProcessor(BaseProtocolProcessor):
    # 如果 Wireshark 没有 yaskawa 层，我们可能需要监听 'data' 或 'udp' 层
    # 这里我们设置为 'yaskawa'，但在 get_processor 里建议增加端口判断逻辑
    protocol_id = 'yaskawa'

    # 常见命令代码 (Command No.)
    COMMANDS = {
        '0x70': 'Read Byte',
        '0x71': 'Write Byte',
        '0x72': 'Read IO',
        '0x73': 'Write IO',
        '0x74': 'Read Register',
        '0x75': 'Write Register',
        '0x7A': 'Read Alarm',
        '0x7B': 'Write Alarm'
    }

    # 全局字典：用于请求-响应关联
    # Key: Packet_ID (Request ID), Value: {command, context_info}
    pending_requests = {}

    def parse(self, pkt):
        try:
            # 1. 获取数据源
            # 安川协议通常没有标准的 dissector，数据通常在 UDP 或 TCP 的 payload 里
            # 我们尝试获取 'data' 层 (Raw Payload)
            if hasattr(pkt, 'data'):
                raw_payload = pkt.data.data  # 比如 "59:45:52:43:..."
            elif hasattr(pkt, 'udp') and hasattr(pkt.udp, 'payload'):
                raw_payload = pkt.udp.payload
            elif hasattr(pkt, 'tcp') and hasattr(pkt.tcp, 'payload'):
                raw_payload = pkt.tcp.payload
            else:
                return None

            # 2. 预处理 Hex 字符串
            hex_str = raw_payload.replace(':', '').lower()

            # 3. 校验头部标志 'YERC' (0x59455243)
            # 安川 HSE 协议头固定以 "YERC" 开头 (4 bytes)
            if not hex_str.startswith('59455243'):
                return None

            # 4. 解析头部关键信息 (基于 HSE 协议手册)
            # Byte 0-3: Identifier (YERC)
            # Byte 4-5: Header Length
            # Byte 6-7: Data Length
            # Byte 8: Reserve
            # Byte 9: Processing Division (1: Robot, 2: File, etc.)
            # Byte 10: ACK (0: Req, 1: Resp, etc.)
            # Byte 11: Request ID (Packet ID) - 用于关联
            # Byte 12-15: Block No (Request ID Extension)
            # Byte 24-25: Command No

            # 提取 Request ID (Byte 11 -> Index 22-24)
            req_id = hex_str[22:24]

            # 提取 ACK 标志 (Byte 10 -> Index 20-22)
            # 通常 0x00=Request, 0x01=Response
            ack_flag = hex_str[20:22]
            is_response = (ack_flag != '00')

            # 提取数据
            data_objects = self._extract_data(hex_str, req_id, is_response)

            # 生成描述
            cmd_no = "Unknown"
            if len(hex_str) >= 52:
                # Command No 在 Byte 24-25 (Index 48-52)
                cmd_hex = "0x" + hex_str[48:52].upper().replace('00', '')  # 简化的提取
                cmd_name = self.COMMANDS.get(cmd_hex[-4:], f"Cmd {cmd_hex}")
                cmd_no = cmd_name

            desc_type = "Response" if is_response else "Request"
            desc = f"Yaskawa HSE {desc_type} ({cmd_no})"

            return self.create_standard_result(
                pkt,
                protocol_name="Yaskawa HSE",
                data_objects=data_objects,
                extra_info={"info": desc, "req_id": req_id}
            )

        except Exception as e:
            logger.debug(f"Yaskawa parse error: {e}")
            return None

    def _extract_data(self, hex_str, req_id, is_response):
        items = []

        # 头部长度通常是 32 bytes (64 hex chars)，之后是数据
        HEADER_LEN = 32 * 2

        # 如果长度不够头部，直接返回
        if len(hex_str) < HEADER_LEN:
            return items

        # ==========================================
        # 场景 A: 响应包 (Response)
        # ==========================================
        if is_response:
            # 1. 查找关联信息
            context = self.pending_requests.pop(req_id, None)

            # 2. 提取状态码 (通常在 Payload 的前几个字节，或者头部 Status 字段)
            # 简单起见，我们假设数据部分包含具体值
            payload = hex_str[HEADER_LEN:]

            if payload:
                # 解析读取到的数据
                # 假设返回的是一组整数
                items.append({
                    "type": "Response Data",
                    "value": payload,
                    "address": f"{context['cmd_info']} (Context)" if context else "N/A",
                    "raw_hex": f"0x{payload[:10]}..."
                })
            else:
                items.append({
                    "type": "Response ACK",
                    "value": "Success (No Data)",
                    "address": "N/A"
                })

        # ==========================================
        # 场景 B: 请求包 (Request)
        # ==========================================
        else:
            # Command No (Byte 24-25 -> Index 48-52)
            cmd_hex = "0x" + hex_str[48:52]

            # Instance / Attribute (Byte 26-28) -> 类似于地址
            instance = hex_str[52:56]
            attr = hex_str[56:58]

            # 数据部分 (如果有写入值)
            payload = hex_str[HEADER_LEN:]

            # 记录请求上下文
            self.pending_requests[req_id] = {
                "cmd": cmd_hex,
                "cmd_info": f"Inst:{instance} Attr:{attr}"
            }

            items.append({
                "type": "Request",
                "value": f"Cmd: {self.COMMANDS.get(cmd_hex, cmd_hex)}",
                "address": f"Inst:{instance} Attr:{attr}",
                "raw_hex": f"0x{payload}" if payload else "N/A"
            })

        return items