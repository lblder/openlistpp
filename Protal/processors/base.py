# processors/base.py
import json


class BaseProtocolProcessor:
    """
    所有协议处理器的基类，负责统一输出格式
    """

    # 定义标准字段 (Top Level)
    STANDARD_PACKET_FIELDS = ['packet_no', 'timestamp', 'src_ip', 'dst_ip', 'protocol', 'info', 'items']

    # 定义标准数据项字段 (Item Level)
    # 任何不在这里面的字段，都会被自动移到 'other' 中
    STANDARD_ITEM_FIELDS = ['address', 'value', 'description', 'type']

    def create_standard_result(self, pkt, protocol_name, data_objects, extra_info=None):
        """
        统一格式生成器

        Args:
            pkt: PyShark 数据包对象
            protocol_name: 协议名称 (如 "Modbus TCP")
            data_objects: 提取出的数据列表 (包含各种杂乱字段)
            extra_info: 额外的包级别信息 (如 func_code, tns)
        """
        if extra_info is None:
            extra_info = {}

        # 1. 统一数据项 (Items Normalization)
        normalized_items = []
        for item in data_objects:
            standard_item = {
                "address": "N/A",
                "value": "N/A",
                "other": {}  # 专门存放协议特有字段
            }

            # --- 智能字段映射 ---
            # 把各种叫法的地址统一映射为 'address'
            if 'register_id' in item:
                standard_item['address'] = item.pop('register_id')
            elif 'address' in item:
                standard_item['address'] = item.pop('address')

            # 把各种叫法的值统一映射为 'value'
            if 'value' in item:
                standard_item['value'] = item.pop('value')

            # 处理其他标准字段 (type, description)
            for field in ['type', 'description']:
                if field in item:
                    standard_item[field] = item.pop(field)

            # --- 剩余字段归档 ---
            # 剩下的所有字段 (raw_hex, area_code, unit_id 等) 全部塞入 other
            # 并将 extra_info 里的信息也合并进来（如果是针对该 item 的上下文）
            standard_item['other'].update(item)

            normalized_items.append(standard_item)

        # 2. 统一包结构 (Packet Normalization)
        # 将 extra_info 中不属于标准字段的内容也放入包级的 other
        packet_other = {}
        info_desc = extra_info.pop('info', f"{protocol_name} Packet")

        for k, v in extra_info.items():
            packet_other[k] = v

        result = {
            "packet_no": str(pkt.number),
            "timestamp": str(pkt.sniff_time),
            "src_ip": str(pkt.ip.src),
            "dst_ip": str(pkt.ip.dst),
            "protocol": protocol_name,
            "info": info_desc,  # 摘要描述
            "items": normalized_items,  # 统一后的数据列表
            "other": packet_other  # 包级别的特有字段 (如 tns, sid, func_code)
        }

        return result