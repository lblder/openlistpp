import os
import sys

class Config:
    """
    基础配置类
    """
    # --- 服务配置 ---
    HOST = os.getenv('FLASK_HOST', '0.0.0.0')
    PORT = int(os.getenv('FLASK_PORT', 5001))
    DEBUG = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
    JSON_AS_ASCII = False

    # --- 日志配置 ---
    LOG_LEVEL = 'INFO'
    LOG_FORMAT = '%(asctime)s - %(levelname)s - %(message)s'

    # --- 数据目录配置 ---
    # 默认数据根目录，请根据实际情况修改
    DATA_ROOT = os.getenv('DATA_ROOT', r'C:\Code\OL\pcap\data' if sys.platform == 'win32' else '/app/data')


    # --- Tshark 配置 ---
    # Windows 下可能的 Tshark 安装路径 (优先级按列表顺序)
    TSHARK_WINDOWS_PATHS = [
        r"D:\Software\Wireshark\tshark.exe",
        r"C:\Software\CodingSoft\Wireshark\tshark.exe",
        r"C:\Program Files\Wireshark\tshark.exe",
        r"C:\Program Files (x86)\Wireshark\tshark.exe",
    ]

    # Linux/Mac 下可能的路径
    TSHARK_UNIX_PATHS = [
        '/usr/bin/tshark',
        '/usr/local/bin/tshark',
    ]

    @classmethod
    def get_tshark_path(cls):
        """
        获取 Tshark 路径的统一逻辑
        """
        # 1. 优先检查环境变量
        if 'TSHARK_PATH' in os.environ:
            path = os.environ['TSHARK_PATH']
            if os.path.exists(path):
                return path

        # 2. 检查系统 PATH
        import shutil
        tshark_in_path = shutil.which('tshark')
        if tshark_in_path:
            return tshark_in_path

        # 3. 检查预定义路径
        possible_paths = cls.TSHARK_WINDOWS_PATHS if sys.platform == 'win32' else cls.TSHARK_UNIX_PATHS
        
        for path in possible_paths:
            if os.path.exists(path):
                return path

        return None

# 导出配置实例
config = Config()
