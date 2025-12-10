# processors/modbus.py
from .base import BaseProtocolProcessor
import logging

logger = logging.getLogger(__name__)


class ModbusProcessor(BaseProtocolProcessor):
    protocol_id = 'MODBUS'

    def parse(self, pkt):
        try:
            mb = pkt.modbus
            func_code = getattr(mb, 'func_code', '0')

            data_objects = self._extract_data(mb, func_code)

            return self.create_standard_result(
                pkt,
                protocol_name="Modbus",
                data_objects=data_objects,
                extra_info={"func_code": func_code}
            )
        except Exception as e:
            logger.debug(f"Modbus parse error: {e}")
            return None

    def _determine_type(self, func_code):
        """根据功能码判断数据类型"""
        fc = int(func_code)
        if fc in [1, 5, 15]:
            return "Coil"  # 线圈
        elif fc in [2]:
            return "Discrete Input"  # 离散输入
        elif fc in [4]:
            return "Input Register"  # 输入寄存器
        elif fc in [3, 6, 16, 23]:
            return "Holding Register"  # 保持寄存器
        return "Unknown"

    def _extract_data(self, mb, func_code):
        items = []

        # 1. 尝试提取 16位 寄存器值
        if hasattr(mb, 'regval_uint16'):
            raw_field = mb.get_field('regval_uint16')
            data_type = self._determine_type(func_code)
            items.extend(self._process_values(mb, raw_field, data_type))

        # 2. 尝试提取 位 (Bit) 值 (针对线圈)
        # Wireshark 中线圈值有时解析为 bit_val 或其他字段，视具体版本而定
        # 这里仅作逻辑演示，实际字段需根据抓包确认
        elif hasattr(mb, 'bit_val'):
            raw_field = mb.get_field('bit_val')
            items.extend(self._process_values(mb, raw_field, "Coil"))

        return items

    def _process_values(self, mb, raw_field, data_type):
        result_list = []
        raw_vals = [f.show for f in raw_field.all_fields] if hasattr(raw_field, 'all_fields') else [raw_field.show]

        # 尝试获取基准地址
        base_addr = 0
        has_addr = False
        if hasattr(mb, 'reference_num'):
            try:
                base_addr = int(mb.reference_num)
                has_addr = True
            except:
                pass

        for i, val in enumerate(raw_vals):
            try:
                clean_val = int(val, 0)
            except:
                clean_val = val

            addr_str = str(base_addr + i) if has_addr else f"Unknown+{i}"

            result_list.append({
                "address": addr_str,
                "value": clean_val,
                "type": data_type,  # 明确这是寄存器还是线圈
                "protocol_specific": {"base_addr": base_addr} if has_addr else {}
            })

        return result_list