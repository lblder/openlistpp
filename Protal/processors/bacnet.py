from .base import BaseProtocolProcessor
import logging

logger = logging.getLogger(__name__)


class BacnetProcessor(BaseProtocolProcessor):
    protocol_id = 'BACNET'

    APDU_TYPES = {
        0: 'Confirmed-REQ',  # 确认请求
        1: 'Unconfirmed-REQ',  # 非确认请求
        2: 'Simple-ACK',
        3: 'Complex-ACK',
        4: 'Segment-ACK',
        5: 'Error',
        6: 'Reject',
        7: 'Abort'
    }

    def parse(self, pkt):
        try:
            if hasattr(pkt, 'bacapp'):
                layer = pkt.bacapp
            else:
                return None

            # 1. 提取 APDU 类型
            raw_type = self._get_field_val(layer, 'type')
            try:
                type_int = int(str(raw_type), 0)
            except:
                type_int = -1

            type_desc = self.APDU_TYPES.get(type_int, f"Unknown({type_int})")

            # 2. 提取服务名 (关键修正点)
            # 你的字段列表中有 'confirmed_service'，这是 BACnet 请求的关键字段
            service_str = "Unknown"

            # 优先尝试 confirmed_service
            svc_val = self._get_field_val(layer, 'confirmed_service')
            if svc_val:
                service_str = str(svc_val)
            else:
                # 备用：尝试 unconfirmed_service (虽然你的列表里没写，但为了兼容性保留)
                svc_val = self._get_field_val(layer, 'unconfirmed_service')
                if svc_val:
                    service_str = str(svc_val)
                else:
                    # 最后尝试通用的 'service'
                    svc_val = self._get_field_val(layer, 'service')
                    if svc_val:
                        service_str = str(svc_val)

            # 3. 提取核心数据
            data_objects = self._extract_bacnet_data(layer, type_int, service_str)

            # 4. 生成摘要
            invoke_id = self._get_field_val(layer, 'invoke_id')
            extra_info = {
                "apdu_type": type_desc,
                "service": service_str,
                "invoke_id": invoke_id
            }

            return self.create_standard_result(
                pkt,
                protocol_name="BACnet/IP",
                data_objects=data_objects,
                extra_info=extra_info
            )

        except Exception as e:
            logger.debug(f"BACnet parse error: {e}")
            return None

    def _extract_bacnet_data(self, layer, type_int, service_str):
        items = []

        # 1. 获取对象 ID (关键修正点)
        # 优先尝试你提供的 'objectidentifier' (无下划线)
        obj_id = self._get_field_val(layer, 'objectidentifier')
        if not obj_id:
            # 备用：如果失败，尝试用 type + instance 拼接
            o_type = self._get_field_val(layer, 'objecttype')
            o_inst = self._get_field_val(layer, 'instance_number')
            if o_type and o_inst:
                obj_id = f"{o_type}:{o_inst}"
            else:
                # 最后尝试带下划线的标准名
                obj_id = self._get_field_val(layer, 'object_identifier')

        # 2. 获取属性 ID
        prop_id = self._get_field_val(layer, 'property_identifier')

        # 3. 构造地址描述
        addr_str = "N/A"
        if obj_id:
            addr_str = f"Obj: {obj_id}"
            if prop_id:
                addr_str += f" / Prop: {prop_id}"

        # === 场景 A: 读/写 请求 (Confirmed-REQ) ===
        if type_int == 0:
            # 写操作 -> 包含值
            if 'write' in service_str.lower():
                val = self._extract_property_value(layer)
                items.append({
                    "address": addr_str,
                    "value": val,
                    "type": "Write Request",
                    "description": f"Writing to {addr_str}",
                    "raw_hex": str(val)
                })
            # 读操作 -> 无值
            elif 'read' in service_str.lower():
                items.append({
                    "address": addr_str,
                    "value": "Requesting Value...",
                    "type": "Read Request",
                    "description": f"Reading {addr_str}"
                })
            else:
                items.append({
                    "address": addr_str,
                    "value": service_str,
                    "type": "Request",
                    "description": "Service Call"
                })

        # === 场景 B: 响应 (Complex-ACK) ===
        elif type_int == 3:
            # 响应包通常包含值
            val = self._extract_property_value(layer)
            items.append({
                "address": addr_str,
                "value": val,
                "type": "Read Response",
                "description": "Read Result",
                "raw_hex": str(val)
            })

        # === 场景 C: 其他 ===
        else:
            items.append({
                "address": addr_str,
                "value": self.APDU_TYPES.get(type_int, "Unknown"),
                "type": "Info",
                "description": f"Status: {service_str}"
            })

        return items

    def _extract_property_value(self, layer):
        """
        尝试提取 BACnet 值。
        注意：你提供的字段列表中没有包含 'property_value' 或 'real' 等值字段。
        这通常意味着当前的 layer 只是一个请求头。
        如果有值，PyShark 会动态生成新的字段名，这里保留遍历逻辑以防万一。
        """
        # 常见的值字段名
        candidates = ['property_value', 'real', 'boolean', 'unsigned_integer',
                      'signed_integer', 'character_string', 'bit_string', 'enumerated']

        for key in candidates:
            # 使用 hasattr 检查，防止报错
            if hasattr(layer, key):
                return self._get_field_val(layer, key)

        return "Unknown/No Value"

    def _get_field_val(self, layer, field_name):
        """
        健壮的字段提取：优先取 showname_value
        """
        if not hasattr(layer, field_name):
            return None

        field = layer.get_field(field_name)

        # 1. 优先取 showname_value (最清晰)
        if hasattr(field, 'showname_value') and field.showname_value:
            return field.showname_value

        # 2. 其次取 show
        if hasattr(field, 'show') and field.show:
            return field.show

        # 3. 处理列表情况 (取第一个)
        if hasattr(field, 'all_fields') and field.all_fields:
            # 递归检查第一个元素
            first = field.all_fields[0]
            if hasattr(first, 'showname_value') and first.showname_value:
                return first.showname_value
            return first.show

        return str(field)