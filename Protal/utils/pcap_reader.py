import pyshark
import asyncio
import logging
import sys
import os
import traceback

logger = logging.getLogger(__name__)

# 跨平台 tshark 路径配置
# 优先级: 环境变量 TSHARK_PATH > 系统 PATH > 默认路径
def get_tshark_path():
    # 1. 检查环境变量
    if 'TSHARK_PATH' in os.environ:
        return os.environ['TSHARK_PATH']
    
    # 2. 尝试从 PATH 中找到 tshark
    import shutil
    tshark_in_path = shutil.which('tshark')
    if tshark_in_path:
        return tshark_in_path
    
    # 3. 平台特定的默认路径
    if sys.platform == 'win32':
        # Windows 常见路径
        possible_paths = [
            r"D:\Software\Wireshark\tshark.exe",
            r"C:\Program Files\Wireshark\tshark.exe",
            r"C:\Program Files (x86)\Wireshark\tshark.exe",
        ]
        for path in possible_paths:
            if os.path.exists(path):
                return path
    else:
        # Linux/Mac 默认路径
        return '/usr/bin/tshark'
    
    # 4. 如果都找不到，返回 None，让 pyshark 自己找
    return None

tshark_path = get_tshark_path()
def pcap_generator(file_path):
    """
    通用生成器：负责文件加载和数据包迭代
    """
    loop = asyncio.new_event_loop()

    # 1. 路径处理
    abs_file_path = os.path.abspath(file_path)
    if not os.path.exists(abs_file_path):
        raise FileNotFoundError(f"❌ 文件未找到: {abs_file_path}")

    cap = None
    try:
        # 如果你知道 tshark 路径，请取消注释下一行并填入
        # tshark_path = r"D:\Program Files\Wireshark\tshark.exe"

        cap = pyshark.FileCapture(
            abs_file_path,
            eventloop = loop,
            tshark_path=tshark_path,
        )

        for pkt in cap:
            yield pkt

    except Exception as e:
        error_details = traceback.format_exc()
        logger.error(f"❌ PCAP Reader 错误:\n{error_details}")

        # 这里的错误通常是 TShark 相关的
        if "TShark" in str(e) or "NotImplementedError" in str(e):
            logger.error("💡 提示: 请确保 Wireshark 已安装且 tshark.exe 在系统 PATH 中")

        raise RuntimeError(f"底层解析失败: {type(e).__name__} (详情见日志)") from e

    finally:
        # 清理资源
        if cap:
            try:
                cap.close()
            except:
                pass