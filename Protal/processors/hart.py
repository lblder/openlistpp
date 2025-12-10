from .base import BaseProtocolProcessor
import logging

logger = logging.getLogger(__name__)


class HartIpProcessor(BaseProtocolProcessor):
    protocol_id = 'HART_IP'

    # 消息 ID 映射表
    MESSAGE_IDS = {
        0: 'Session Initiate',
        1: 'Session Close',
        2: 'Keep Alive',
        3: 'Pass Through'  # 包裹着 HART 命令
    }

    # 消息类型映射
    MSG_TYPES = {
        0: 'Request',
        1: 'Response',
        2: 'Notification'
    }

    # 常见 HART 命令描述
    HART_COMMANDS = {
        0: 'Read Unique Identifier',
        1: 'Read Primary Variable',
        2: 'Read Loop Current and Percent of Range',
        3: 'Read Dynamic Variables and Current',
        6: 'Write Polling Address',
        48: 'Read Additional Device Status',
    }

    def parse(self, pkt):
        try:
            if not hasattr(pkt, 'hart_ip'):
                return None

            hip = pkt.hart_ip

            # 1. 提取 HART-IP 头部基础信息 (使用你提供的字段名)
            # 使用 getattr 安全获取，防止字段不存在报错
            msg_id = int(getattr(hip, 'message_id', -1))
            msg_type = int(getattr(hip, 'message_type', -1))
            status = getattr(hip, 'status', '0')

            # 【修正点1】使用 transaction_id 作为序列号
            seq_num = getattr(hip, 'transaction_id', '0')

            msg_desc = self.MESSAGE_IDS.get(msg_id, f"Unknown Type {msg_id}")
            type_desc = self.MSG_TYPES.get(msg_type, "Unknown")

            # 2. 核心分流处理
            data_objects = []

            # === 场景 A: Pass Through (透传 HART 命令) ===
            if msg_id == 3:
                # 尝试获取内层的 HART 协议数据
                if hasattr(pkt, 'hart_ip'):
                    hart_layer = pkt.hart
                    hart_data = self._parse_hart_command(hart_layer, msg_type)
                    data_objects.extend(hart_data)

                    # 尝试获取具体的命令号用于摘要
                    cmd_code = getattr(hart_layer, 'command', '?')
                    cmd_name = self.HART_COMMANDS.get(int(cmd_code), 'Unknown') if str(
                        cmd_code).isdigit() else 'Unknown'
                    info_desc = f"HART Cmd {cmd_code} ({cmd_name})"
                else:
                    info_desc = f"HART-IP {msg_desc}"
                    data_objects.append({
                        "address": "Target Device",
                        "value": "Encrypted/Raw Data",
                        "type": "PassThrough Payload",
                        "description": "Inner HART frame not parsed"
                    })

            # === 场景 B: 会话管理 (Session Initiate/Close/KeepAlive) ===
            else:
                info_desc = f"HART-IP {msg_desc} ({type_desc})"
                # 传入 hip 对象以提取特定的 session 字段
                mgmt_data = self._parse_management_body(hip, msg_id, msg_type)
                data_objects.extend(mgmt_data)

            # 3. 生成结果
            extra_info = {
                "message_id": msg_id,
                "message_type": type_desc,
                "sequence_number": seq_num,  # 这里实际上记录的是 transaction_id
                "status_code": status
            }

            return self.create_standard_result(
                pkt,
                protocol_name="HART-IP",
                data_objects=data_objects,
                extra_info=extra_info
            )

        except Exception as e:
            logger.debug(f"HART-IP parse error: {e}")
            return None

    def _parse_hart_command(self, hart, msg_type_int):
        """解析内嵌的 HART 协议层"""
        items = []

        # 获取地址 (Long Address)
        raw_addr = getattr(hart, 'address_long', None) or getattr(hart, 'long_address', 'Unknown')
        if raw_addr and len(str(raw_addr)) > 5:
            addr_str = str(raw_addr).replace(':', '').lower()
        else:
            addr_str = str(raw_addr)

        cmd = getattr(hart, 'command', '0')
        cmd_desc = self.HART_COMMANDS.get(int(cmd), "Unknown Command") if str(cmd).isdigit() else "Cmd"

        # Response
        if msg_type_int == 1:
            resp_code = getattr(hart, 'response_code', '0')
            dev_status = getattr(hart, 'device_status', '0')

            items.append({
                "address": addr_str,
                "value": f"Code: {resp_code} | Status: {dev_status}",
                "type": "Command Response",
                "description": f"Response to {cmd_desc} ({cmd})"
            })

            # 尝试提取特定数据 (如 Command 48)
            spec_status = getattr(hart, 'device_specific_status', None)
            if spec_status:
                items.append({
                    "address": addr_str,
                    "value": str(spec_status).replace(':', ''),
                    "type": "Device Specific Status",
                    "description": "Diagnostic Data (Cmd 48)"
                })

        # Request
        else:
            items.append({
                "address": addr_str,
                "value": f"Command: {cmd}",
                "type": "Command Request",
                "description": f"Requesting {cmd_desc}"
            })

        return items

    def _parse_management_body(self, hip, msg_id, msg_type_int):
        """解析会话管理数据"""
        items = []
        addr_label = "HART-IP Gateway"

        # Session Initiate (Message ID 0)
        if msg_id == 0:
            if msg_type_int == 0:  # Request
                # 【修正点2】使用你提供的准确字段名
                timer = getattr(hip, 'session_init_inactivity_close_timer', 'Unknown')
                host_type = getattr(hip, 'session_init_master_type', 'Unknown')

                # 有时 master_type 是数字，转换一下更易读
                host_type_str = "Primary" if str(host_type) == '1' else str(host_type)

                items.append({
                    "address": addr_label,
                    "value": f"Timeout: {timer}ms",
                    "type": "Session Config",
                    "description": f"Initiate Request (Host: {host_type_str})"
                })
            else:  # Response
                items.append({
                    "address": addr_label,
                    "value": "Session Established",
                    "type": "Session Status",
                    "description": "Initiate Response"
                })

        elif msg_id == 2:  # Keep Alive
            items.append({
                "address": addr_label,
                "value": "Keep-Alive Signal",
                "type": "Heartbeat",
                "description": "Network Check"
            })

        return items