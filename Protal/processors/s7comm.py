from .base import BaseProtocolProcessor
import logging
import re

logger = logging.getLogger(__name__)


class S7CommProcessor(BaseProtocolProcessor):
    protocol_id = 'S7COMM'

    def parse(self, pkt):
        try:
            # 兼容处理：有些版本叫 s7comm，有些可能叫 s7
            if hasattr(pkt, 's7comm'):
                s7_layer = pkt.s7comm
            elif hasattr(pkt, 's7'):
                s7_layer = pkt.s7
            else:
                return None

            # ROSCTR: 1=Job(请求), 3=Ack_Data(响应)
            # Function: 4=Read Var, 5=Write Var
            rosctr_raw = getattr(s7_layer, 'header_rosctr', '0')
            func_code_raw = getattr(s7_layer, 'param_func', '0')

            try:
                rosctr = int(str(rosctr_raw), 0)
                func_code = int(str(func_code_raw), 0)
            except:
                rosctr = 0
                func_code = 0

            # 生成任务描述
            job_description = "Unknown S7 Job"
            if rosctr == 3 and func_code == 4:
                job_description = "Read Var Response"
            elif rosctr == 1 and func_code == 5:
                job_description = "Write Var Request"
            elif rosctr == 1 and func_code == 4:
                job_description = "Read Var Request"

            # 提取数据
            data_objects = self._extract_data(s7_layer, rosctr, func_code)

            # 准备额外信息
            extra_info = {
                "job_type": job_description,
                "rosctr": rosctr,
                "func_code": func_code,
                "pdu_ref": getattr(s7_layer, 'header_pduref', 'N/A')
            }

            return self.create_standard_result(
                pkt,
                protocol_name="Siemens S7Comm",
                data_objects=data_objects,
                extra_info=extra_info
            )
        except Exception as e:
            logger.debug(f"S7 parse error: {e}")
            return None

    def _extract_data(self, s7_layer, rosctr, func_code):
        items = []

        # ---------------------------------------------------------
        # 场景 A: 读变量响应 (Read Var Response)
        # ---------------------------------------------------------
        if rosctr == 3 and func_code == 4:
            # 响应包通常不带 Item 地址，只带数据
            raw_vals = self._get_data_values(s7_layer)

            for i, val_hex in enumerate(raw_vals):
                clean_hex = val_hex.replace(':', '')
                # 尝试转十进制显示
                try:
                    # 如果数据较短 (如 2字节/4字节)，转为数字更直观
                    if len(clean_hex) <= 8:
                        val_display = str(int(clean_hex, 16))
                    else:
                        val_display = f"0x{clean_hex}"
                except:
                    val_display = f"0x{clean_hex}"

                items.append({
                    "address": f"Item_{i + 1} (Response)",
                    "value": val_display,
                    "type": "Read Response",
                    "description": "Read Success",
                    "raw_hex": f"0x{clean_hex}"
                })

        # ---------------------------------------------------------
        # 场景 B: 写变量请求 (Write Var Request)
        # ---------------------------------------------------------
        elif rosctr == 1 and func_code == 5:
            # 1. 直接提取 param_item 字符串 (最准确！)
            # 截图显示格式为: "Item [1]: (DB 1.DBX 0.0 BYTE 8)"
            raw_addrs = self._get_field_list(s7_layer, 'param_item')

            # 2. 提取数据值
            raw_vals = self._get_data_values(s7_layer)

            # 3. 配对
            count = min(len(raw_addrs), len(raw_vals))
            for i in range(count):
                # 清洗地址字符串
                # 从 "Item [1]: (DB 1.DBX 0.0 BYTE 8)" 提取 "DB 1.DBX 0.0 BYTE 8"
                raw_addr_str = raw_addrs[i]
                addr_clean = self._clean_address_string(raw_addr_str)

                # 处理数据值
                clean_hex = raw_vals[i].replace(':', '')
                try:
                    if len(clean_hex) <= 16:
                        val_int = int(clean_hex, 16)
                        val_display = str(val_int)
                    else:
                        val_display = f"0x{clean_hex}"
                except:
                    val_display = f"0x{clean_hex}"

                items.append({
                    "address": addr_clean,
                    "value": val_display,
                    "type": "Write Request",
                    "description": "Writing Value to PLC",
                    "raw_hex": f"0x{clean_hex}"
                })

        return items

    def _get_field_list(self, layer, field_name):
        if not hasattr(layer, field_name):
            return []

        field = layer.get_field(field_name)

        # 1. 优先尝试从 all_fields 获取 (针对列表)
        # 必须同时满足：有这个属性 AND 列表不为空
        if hasattr(field, 'all_fields') and field.all_fields:
            return [f.showname_value for f in field.all_fields]

        # 2. 如果是单个对象 (Fallback)
        # 针对 param_item 这种字段，show 可能是空的，优先取 showname_value
        if hasattr(field, 'showname_value') and field.showname_value:
            return [field.showname_value]

        if hasattr(field, 'showname') and field.showname:
            return [field.showname]

        if hasattr(field, 'show') and field.show:
            return [field.show]

        # 3. 最后的保底：直接转字符串
        return [str(field)]

    def _get_data_values(self, layer):
        """辅助函数：尝试从 data 或 resp_data 获取数据"""
        # 写请求的数据在 'data'，读响应的数据可能在 'resp_data' 或 'data'
        vals = []
        if hasattr(layer, 'resp_data'):
            vals = self._get_field_list(layer, 'resp_data')


        # 过滤掉非 hex 数据 (有时 PyShark 会返回无关信息)
        return [v for v in vals if self._is_hex_string(v)]

    def _clean_address_string(self, raw_str):
        """
        清洗 param_item 字符串
        输入: "Item [1]: (DB 1.DBX 0.0 BYTE 8)"
        输出: "DB 1.DBX 0.0 BYTE 8"
        """
        # 使用正则提取括号内的内容
        match = re.search(r'\((.*?)\)', raw_str)
        if match:
            return match.group(1)
        return raw_str  # 如果没匹配到，返回原样

    def _is_hex_string(self, s):
        """简单判断是否为 Hex 数据 (包含 0-9, a-f, :)"""
        clean = s.replace(':', '')
        try:
            int(clean, 16)
            return True
        except:
            return False