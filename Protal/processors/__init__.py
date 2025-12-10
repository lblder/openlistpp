# processors/__init__.py
from .modbus import ModbusProcessor
from .omron import OmronFinsProcessor
from .s7comm import S7CommProcessor
from .yaskawa import YaskawaProcessor
from .cippccc import CippcccProcessor
from .hart import HartIpProcessor
from .bacnet import BacnetProcessor


# 在这里注册所有可用的处理器实例
AVAILABLE_PROCESSORS = [
    ModbusProcessor(),
    OmronFinsProcessor(),
    S7CommProcessor(),
    YaskawaProcessor(),
    CippcccProcessor(),
    HartIpProcessor(),
    BacnetProcessor(),
]

def get_processor(pkt):
    """
    工厂模式：根据数据包内容，自动返回匹配的处理器
    """
    layer_names = [layer.layer_name for layer in pkt.layers]
    print(f"当前包 No.{pkt.number} 包含的层: {layer_names}")

    # pyshark 可以识别
    for processor in AVAILABLE_PROCESSORS:
        # 检查 pkt 对象中是否包含对应的协议层（如 pkt.modbus, pkt.fins）
        if processor.protocol_id in pkt:
            print(f"找到匹配的处理器: {processor.protocol_id}")
            return processor

    # 特征判断
    print("尝试特征判断...")
    try:
        raw_payload = None
        if hasattr(pkt, 'udp') and hasattr(pkt.udp, 'payload'):
            raw_payload = pkt.udp.payload
        elif hasattr(pkt, 'tcp') and hasattr(pkt.tcp, 'payload'):
            raw_payload = pkt.tcp.payload
        elif hasattr(pkt, 'data') and hasattr(pkt.data, 'data'):
            raw_payload = pkt.data.data

        if raw_payload:
            # 去除冒号，转小写
            hex_check = raw_payload.replace(':', '').lower()
            # 检查魔数 "YERC"
            if hex_check.startswith('59455243'):
                print(f"检测到 Yaskawa HSE 协议特征 (UDP/TCP Payload)")
                # 返回一个新的 YaskawaProcessor 实例，或者复用单例
                return AVAILABLE_PROCESSORS[3]  # 假设它是第4个
    except Exception:
        pass

    return None