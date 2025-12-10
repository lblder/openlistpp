# processors/omron.py
from .base import BaseProtocolProcessor
import logging

logger = logging.getLogger(__name__)


class OmronFinsProcessor(BaseProtocolProcessor):
    protocol_id = 'omron'

    # FINS 内存区域代码映射
    MEMORY_AREAS = {
        '82': 'DM (Data Memory)',
        'B0': 'CIO',
        '30': 'CIO-Alt',
        '31': 'WR',
        '32': 'HR',
        '33': 'AR'
    }

    # 全局字典：用于存储未完成的请求信息
    pending_requests = {}

    def parse(self, pkt):
        try:
            # 1. 获取协议层
            if hasattr(pkt, 'omron'):
                fins_layer = pkt.omron
            elif hasattr(pkt, 'fins'):
                fins_layer = pkt.fins
            else:
                return None

            # 2. 提取事务 ID (SID)
            raw_sid = getattr(fins_layer, 'sid', '0')
            sid = str(raw_sid)

            # 3. 提取数据
            data_objects = self._extract_data(fins_layer, sid)

            # 4. 生成摘要描述
            raw_cmd = str(getattr(fins_layer, 'command', 'Unknown')).replace('0x', '')

            # 准备传递给基类的额外信息 (这些会被放入 other)
            extra_info = {
                "sid": sid,
                "raw_cmd": raw_cmd
            }

            if hasattr(fins_layer, 'response_code'):
                resp_code = getattr(fins_layer, 'response_code', '')
                extra_info["response_code"] = resp_code

                # 优化描述
                addr_hint = ""
                # 安全检查 data_objects 是否有数据
                if data_objects and 'address' in data_objects[0]:
                    addr_val = data_objects[0]['address']
                    if 'Context' in str(addr_val):
                        addr_hint = f" [Ref: {addr_val}]"

                desc = f"Response (Code: {resp_code}){addr_hint}"

            elif hasattr(fins_layer, 'memory_address'):
                desc = f"Request (Cmd: {raw_cmd})"
            else:
                desc = f"Fins Packet {raw_cmd}"

            extra_info["info"] = desc

            # 5. 调用基类生成标准结果
            return self.create_standard_result(
                pkt,
                protocol_name="Omron FINS",
                data_objects=data_objects,
                extra_info=extra_info
            )

        except Exception as e:
            logger.error(f"Omron parse error: {e}")
            return None

    def _extract_data(self, fins_layer, sid):
        """
        数据提取逻辑
        注意：这里生成的字典包含所有字段，基类会自动把非标准字段移到 'other'
        """
        items = []

        # ==========================================
        # 场景 A: 响应包 (Response)
        # ==========================================
        if hasattr(fins_layer, 'response_code'):
            resp_code = str(getattr(fins_layer, 'response_code', 'Unknown'))
            status_msg = "Success" if resp_code in ['00', '0000', '0'] else "Error"

            # --- 关联逻辑 ---
            req_context = self.pending_requests.pop(sid, None)

            if req_context:
                addr_str = f"{req_context['addr']} (Context)"
                area_name = req_context['area_name']
                area_code = req_context['area_code']
            else:
                addr_str = "N/A (Response)"
                area_name = "N/A"
                area_code = "N/A"

            # 构造响应项
            # 注意：area_name, area_code, raw_hex 会被基类放入 other
            items.append({
                "address": addr_str,  # 标准字段
                "value": f"Return Code: {resp_code}",  # 标准字段
                "type": "Response Packet",  # 标准字段
                "description": status_msg,  # 标准字段

                # --- 以下字段会自动进入 other ---
                "raw_hex": resp_code,
                "area_name": area_name,
                "area_code": area_code,
                "is_response": True
            })
            return items

        # ==========================================
        # 场景 B: 请求包 (Request)
        # ==========================================
        elif hasattr(fins_layer, 'memory_address'):
            try:
                start_addr_raw = getattr(fins_layer, 'memory_address', '0')
                start_addr = int(str(start_addr_raw), 0)

                area_code_raw = str(getattr(fins_layer, 'memory_area_read', '00')).replace('0x', '').upper()
                area_name = self.MEMORY_AREAS.get(area_code_raw, f"Area {area_code_raw}")

                # 存储上下文
                self.pending_requests[sid] = {
                    'addr': start_addr,
                    'area_name': area_name,
                    'area_code': area_code_raw
                }

            except ValueError:
                start_addr = 0
                area_name = "Unknown"
                area_code_raw = "00"

            # 2. 写请求数据提取
            if hasattr(fins_layer, 'command_data'):
                raw_data = str(getattr(fins_layer, 'command_data', ''))
                items.extend(self._parse_hex_stream(raw_data, start_addr, area_name, area_code_raw))

            # 3. 读请求信息提取
            else:
                num_items = getattr(fins_layer, 'memory_numitems', 'Unknown')
                items.append({
                    "address": str(start_addr),  # 标准字段
                    "value": f"Requesting {num_items} words",  # 标准字段
                    "type": "Read Request",  # 标准字段

                    # --- 以下字段会自动进入 other ---
                    "area_name": area_name,
                    "area_code": area_code_raw,
                    "num_items": num_items,
                    "raw_hex": "N/A"
                })

            return items

        return items

    def _parse_hex_stream(self, raw_data_str, start_addr, area_name, area_code):
        parsed_items = []
        if not raw_data_str:
            return parsed_items

        hex_str = raw_data_str.replace(':', '')
        words = [hex_str[i:i + 4] for i in range(0, len(hex_str), 4)]

        for i, word_hex in enumerate(words):
            if len(word_hex) == 4:
                try:
                    val_int = int(word_hex, 16)
                    parsed_items.append({
                        "address": str(start_addr + i),  # 标准字段 (原 register_id)
                        "value": val_int,  # 标准字段
                        "type": "Write Data",  # 标准字段

                        # --- 以下字段会自动进入 other ---
                        "raw_hex": f"0x{word_hex}",
                        "area_name": area_name,
                        "area_code": area_code
                    })
                except ValueError:
                    continue
        return parsed_items