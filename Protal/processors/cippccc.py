from .base import BaseProtocolProcessor
import logging

logger = logging.getLogger(__name__)


class CippcccProcessor(BaseProtocolProcessor):
    protocol_id = 'cip'

    CIP_SERVICES = {
        0x4C: 'Read Tag',
        0x4D: 'Write Tag',
        0x01: 'Get Attributes All',
        0x0E: 'Get Attribute Single',
        0x52: 'Unconnected Send'
    }

    # 全局字典：用于"记住"请求中的 Tag 名
    pending_tags = {}

    FIELD_MAP = {
        # 1. 服务码
        'sc': ['service', 'sc', 'cip_service', 'cip_sc'],

        # 2. 路径/Tag (A1 就在这里！)
        'path': ['cip_symbol', 'symbol', 'request_path', 'epath', 'path_segment', 'cip_path_segment'],

        # 3. 物理地址
        'class': ['class', 'cip_class'],
        'inst': ['instance', 'cip_instance'],

        # 4. 交易号 (用于关联)
        'tns': ['cip_pccc_tns_code', 'cip_tns', 'tns', 'trans_id', 'sequence_count', 'cip_sequence_count'],

        # 5. 数据载荷
        'data': ['data', 'cip_data']
    }

    def parse(self, pkt):
        try:
            # 【核心修改 1】收集所有存在的层
            # 如果同时有 cip 和 cipcm，这个列表里就会有两个对象
            layers = []
            if hasattr(pkt, 'cip'):
                layers.append(pkt.cip)
            if hasattr(pkt, 'cipcm'):
                layers.append(pkt.cipcm)

            # 如果完全没有 CIP 相关层，退出
            if not layers:
                return None

            # 1. 提取服务码 (在所有层中查找)
            raw_sc = self._get_field_from_layers(layers, 'sc', '0x00')
            try:
                sc_int = int(str(raw_sc), 0)
                is_response = (sc_int & 0x80) != 0
                func_code = sc_int & 0x7F
            except:
                sc_int = 0
                is_response = False
                func_code = 0

            # 2. 提取交易号 (在所有层中查找)
            raw_tns = self._get_field_from_layers(layers, 'tns', '0')
            tns_key = str(raw_tns)

            # 3. 智能地址/Tag 解析
            tag_name = None
            addr_info = "Unknown"

            if is_response:
                # === 响应包 ===
                tag_name = self.pending_tags.pop(tns_key, None)
                if tag_name:
                    addr_info = f"Tag: {tag_name} (Response)"
                else:
                    addr_info = self._get_physical_addr(layers)
            else:
                # === 请求包 ===
                # 【核心修改 2】优先在所有层里直接找文本 Tag (cip_symbol)
                found_path = self._get_field_from_layers(layers, 'path')

                # 如果找到的值看起来像 Tag (是文本且不是纯数字/Hex)，直接用
                if found_path and str(found_path).isalnum() and not str(found_path).startswith('0x'):
                    tag_name = str(found_path)

                # 如果没直接找到，再扫描所有层的所有路径字段，尝试解码
                if not tag_name:
                    raw_paths = self._get_all_path_segments(layers)
                    for p in raw_paths:
                        decoded = self._decode_cip_symbol(str(p))
                        if decoded:
                            tag_name = decoded
                            break

                if tag_name:
                    self.pending_tags[tns_key] = tag_name
                    addr_info = f"Tag: {tag_name}"
                else:
                    addr_info = self._get_physical_addr(layers)

            # 4. 提取数据值
            raw_data = self._get_field_from_layers(layers, 'data', None)
            data_objects = []
            service_name = self.CIP_SERVICES.get(func_code, f"Service 0x{func_code:02x}")

            # 记录 Tag
            if tag_name:
                data_objects.append({
                    "address": "CIP Path",
                    "value": tag_name,
                    "type": "Symbol Name",
                    "description": "Target Variable"
                })

            # 记录 Value
            if raw_data:
                hex_str = str(raw_data).replace(':', '')
                display_value = f"0x{hex_str}"

                try:
                    if len(hex_str) <= 16:
                        byte_data = bytes.fromhex(hex_str)
                        int_val = int.from_bytes(byte_data, byteorder='little')
                        display_value = str(int_val)
                except:
                    pass

                desc = f"{service_name} Value" if not is_response else "Response Payload"

                data_objects.append({
                    "address": addr_info,
                    "value": display_value,
                    "type": "Data Value",
                    "raw_hex": f"0x{hex_str}",
                    "description": desc
                })
            else:
                data_objects.append({
                    "address": addr_info,
                    "value": "Success" if is_response else service_name,
                    "type": "Operation",
                    "description": f"{service_name} - No Data"
                })

            extra_info = {
                "service_code": hex(sc_int),
                "is_response": is_response,
                "decoded_tag": tag_name if tag_name else "N/A"
            }

            return self.create_standard_result(
                pkt,
                protocol_name="CIP (Industrial)",
                data_objects=data_objects,
                extra_info=extra_info
            )

        except Exception as e:
            logger.debug(f"CIP parse error: {e}")
            return None

    def _get_field_from_layers(self, layers, key, default=None):
        """
        【新方法】在多个层（如 cip 和 cipcm）中查找字段
        """
        candidates = self.FIELD_MAP.get(key, [])
        # 遍历所有层
        for layer in layers:
            # 遍历所有可能的字段名
            for name in candidates:
                if hasattr(layer, name):
                    val = getattr(layer, name)
                    if val: return val  # 找到非空值就返回
        return default

    def _get_physical_addr(self, layers):
        # 同样在所有层里找 class 和 instance
        c = self._get_field_from_layers(layers, 'class')
        i = self._get_field_from_layers(layers, 'inst')
        if c and i: return f"Class {c} / Inst {i}"
        return "Unknown Target"

    def _get_all_path_segments(self, layers):
        segments = []
        # 遍历所有层，收集所有可能的路径数据
        for layer in layers:
            for field in ['cip_symbol', 'symbol', 'epath', 'request_path', 'path_segment', 'cip_path_segment']:
                if hasattr(layer, field):
                    val = getattr(layer, field)
                    if isinstance(val, list):
                        segments.extend(val)
                    else:
                        segments.append(val)
        return segments

    def _decode_cip_symbol(self, hex_str):
        try:
            if not hex_str: return None
            if len(hex_str) < 40 and hex_str.isalnum() and not hex_str.startswith('0x') and not hex_str.isdigit():
                return hex_str

            clean = hex_str.replace(':', '').replace(' ', '').lower()
            if '91' in clean:
                parts = clean.split('91')
                for part in parts[1:]:
                    if len(part) < 2: continue
                    try:
                        len_byte = int(part[0:2], 16)
                        if 0 < len_byte < 40:
                            expected_len = len_byte * 2
                            if len(part) >= 2 + expected_len:
                                ascii_hex = part[2: 2 + expected_len]
                                decoded = bytes.fromhex(ascii_hex).decode('utf-8')
                                if decoded.isprintable(): return decoded
                    except:
                        continue
        except:
            pass
        return None