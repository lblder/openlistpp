# utils/converter.py
import os
import sys
import subprocess
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


from config.settings import config


class PcapConverter:
    """
    数据包格式转换器
    支持将各种抓包格式转换为标准 PCAP 格式
    """
    
    # 支持的输入格式
    SUPPORTED_FORMATS = {
        '.pcapng': 'PCAP Next Generation',
        '.cap': 'Capture File',
        '.snoop': 'Snoop Capture',
        '.erf': 'Endace ERF',
        '.tr1': 'Visual Networks',
        '.fdc': 'NetXray',
        '.syc': 'Sniffer Portable',
        '.bfr': 'Novell LANalyzer',
        '.atc': 'Accellent 5Views',
        '.acp': 'Accellent 5Views',
        '.trc': 'HP-UX nettl',
        '.trc0': 'HP-UX nettl',
        '.enc': 'Encore',
        '.pkt': 'Packet',
        '.tpc': 'Tektronix',
        '.wpz': 'WildPackets',
        '.5vw': '5Views'
    }
    
    def __init__(self, tshark_path=None):
        """
        初始化转换器
        
        Args:
            tshark_path: tshark 可执行文件路径（可选）
        """
        self.tshark_path = tshark_path or config.get_tshark_path()
        if not self.tshark_path:
            raise RuntimeError("未找到 tshark，请确保已安装 Wireshark")
            
        # Derive editcap path (usually in same directory as tshark)
        tshark_dir = os.path.dirname(self.tshark_path)
        self.editcap_path = os.path.join(tshark_dir, "editcap.exe" if os.name == 'nt' else "editcap")
        if not os.path.exists(self.editcap_path):
             # Fallback: try to just use 'editcap' command
             self.editcap_path = "editcap"

        logger.info(f"使用 tshark: {self.tshark_path}")
        logger.info(f"使用 editcap: {self.editcap_path}")
    
    def is_supported(self, file_path):
        """
        检查文件格式是否支持转换
        
        Args:
            file_path: 文件路径
            
        Returns:
            bool: 是否支持
        """
        ext = Path(file_path).suffix.lower()
        return ext in self.SUPPORTED_FORMATS or ext == '.pcap'
    
    def get_format_name(self, file_path):
        """
        获取文件格式名称
        
        Args:
            file_path: 文件路径
            
        Returns:
            str: 格式名称
        """
        ext = Path(file_path).suffix.lower()
        if ext == '.pcap':
            return 'Standard PCAP (无需转换)'
        return self.SUPPORTED_FORMATS.get(ext, 'Unknown Format')
    
    def convert_to_pcap(self, input_file, output_file=None, overwrite=False):
        """
        将输入文件转换为 PCAP 格式
        
        Args:
            input_file: 输入文件路径
            output_file: 输出文件路径（可选，默认为同名 .pcap 文件）
            overwrite: 是否覆盖已存在的文件
            
        Returns:
            dict: 转换结果
                {
                    "success": bool,
                    "input_file": str,
                    "output_file": str,
                    "input_format": str,
                    "file_size": int,
                    "message": str
                }
        """
        try:
            # 1. 验证输入文件
            if not os.path.exists(input_file):
                return {
                    "success": False,
                    "error": f"输入文件不存在: {input_file}"
                }
            
            input_path = Path(input_file)
            input_ext = input_path.suffix.lower()
            
            # 2. 检查是否已经是 PCAP 格式
            if input_ext == '.pcap':
                return {
                    "success": True,
                    "input_file": str(input_path.absolute()),
                    "output_file": str(input_path.absolute()),
                    "input_format": "Standard PCAP",
                    "file_size": os.path.getsize(input_file),
                    "message": "文件已经是 PCAP 格式，无需转换"
                }
            
            # 3. 检查格式是否支持
            if not self.is_supported(input_file):
                return {
                    "success": False,
                    "error": f"不支持的文件格式: {input_ext}",
                    "supported_formats": list(self.SUPPORTED_FORMATS.keys())
                }
            
            # 4. 确定输出文件路径
            if output_file is None:
                output_file = input_path.with_suffix('.pcap')
            else:
                output_file = Path(output_file)
            
            # 5. 检查输出文件是否已存在
            if output_file.exists() and not overwrite:
                return {
                    "success": False,
                    "error": f"输出文件已存在: {output_file}",
                    "hint": "设置 overwrite=True 以覆盖"
                }
            
            # 6. 执行转换
            logger.info(f"开始转换: {input_file} -> {output_file}")
            
            # 使用 editcap 进行转换 (比 tshark 更适合单纯的格式转换)
            # editcap -F <fmt> <infile> <outfile>
            
            # Determine output format from extension
            output_ext = output_file.suffix.lower()
            tshark_fmt = 'pcapng' if output_ext == '.pcapng' else 'pcap'

            cmd = [
                self.editcap_path,
                '-F', tshark_fmt,
                str(input_path.absolute()),
                str(output_file.absolute())
            ]
            
            # 执行命令
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300  # 5分钟超时
            )
            
            # 7. 检查转换结果
            if result.returncode != 0:
                error_msg = result.stderr.strip() if result.stderr else "未知错误"
                
                # Check directly for the specific write error
                if "can't be written" in error_msg:
                    logger.warning(f"由于封装格式问题转换失败，尝试强制转换为 Ethernet 封装: {input_file}")
                    
                    # Fallback: Force Ethernet encapsulation
                    # This is common for HP-UX nettl or other proprietary formats that actually contain Ethernet frames
                    fallback_cmd = [
                        self.editcap_path,
                        '-F', tshark_fmt,
                        '-T', 'ether', 
                        str(input_path.absolute()),
                        str(output_file.absolute())
                    ]
                    
                    fallback_result = subprocess.run(
                        fallback_cmd,
                        capture_output=True,
                        text=True,
                        timeout=300
                    )
                    
                    if fallback_result.returncode == 0:
                        logger.info(f"Fallback 转换成功: {output_file}")
                        # Update output size for return
                        output_size = os.path.getsize(output_file)
                        return {
                            "success": True,
                            "input_file": str(input_path.absolute()),
                            "output_file": str(output_file.absolute()),
                            "input_format": self.get_format_name(input_file),
                            "input_size": os.path.getsize(input_file),
                            "output_size": output_size,
                            "message": "转换成功 (强制 Ethernet 封装)"
                        }
                    else:
                        # Fallback also failed, report original error + fallback error
                        fallback_error = fallback_result.stderr.strip()
                        logger.error(f"Fallback 也失败: {fallback_error}")
                        return {
                            "success": False,
                            "error": f"转换失败 (不兼容的封装格式): {error_msg}. (尝试强制转换也失败: {fallback_error})",
                            "command": ' '.join(fallback_cmd)
                        }

                logger.error(f"转换失败: {error_msg}")
                return {
                    "success": False,
                    "error": f"工具执行失败: {error_msg}",
                    "command": ' '.join(cmd)
                }
            
            # 8. 验证输出文件
            if not output_file.exists():
                return {
                    "success": False,
                    "error": "转换完成但未生成输出文件"
                }
            
            output_size = os.path.getsize(output_file)
            
            logger.info(f"转换成功: {output_file} ({output_size} bytes)")
            
            return {
                "success": True,
                "input_file": str(input_path.absolute()),
                "output_file": str(output_file.absolute()),
                "input_format": self.get_format_name(input_file),
                "input_size": os.path.getsize(input_file),
                "output_size": output_size,
                "message": "转换成功"
            }
            
        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "error": "转换超时（超过 5 分钟）"
            }
        except Exception as e:
            logger.error(f"转换异常: {e}")
            return {
                "success": False,
                "error": f"转换异常: {str(e)}"
            }
    
    def batch_convert(self, input_dir, output_dir=None, recursive=False):
        """
        批量转换目录中的所有支持格式文件
        
        Args:
            input_dir: 输入目录
            output_dir: 输出目录（可选，默认为输入目录）
            recursive: 是否递归处理子目录
            
        Returns:
            dict: 批量转换结果
        """
        if not os.path.isdir(input_dir):
            return {
                "success": False,
                "error": f"输入路径不是目录: {input_dir}"
            }
        
        input_path = Path(input_dir)
        output_path = Path(output_dir) if output_dir else input_path
        
        # 确保输出目录存在
        output_path.mkdir(parents=True, exist_ok=True)
        
        results = {
            "success": True,
            "total": 0,
            "converted": 0,
            "skipped": 0,
            "failed": 0,
            "details": []
        }
        
        # 查找所有支持的文件
        pattern = '**/*' if recursive else '*'
        for file_path in input_path.glob(pattern):
            if not file_path.is_file():
                continue
            
            ext = file_path.suffix.lower()
            if ext not in self.SUPPORTED_FORMATS and ext != '.pcap':
                continue
            
            results["total"] += 1
            
            # 构造输出文件路径
            relative_path = file_path.relative_to(input_path)
            output_file = output_path / relative_path.with_suffix('.pcap')
            output_file.parent.mkdir(parents=True, exist_ok=True)
            
            # 执行转换
            convert_result = self.convert_to_pcap(
                str(file_path),
                str(output_file),
                overwrite=True
            )
            
            if convert_result["success"]:
                if "无需转换" in convert_result.get("message", ""):
                    results["skipped"] += 1
                else:
                    results["converted"] += 1
            else:
                results["failed"] += 1
            
            results["details"].append({
                "file": str(file_path),
                "result": convert_result
            })
        
        return results


# 便捷函数
def convert_file(input_file, output_file=None, tshark_path=None):
    """
    便捷函数：转换单个文件
    
    Args:
        input_file: 输入文件路径
        output_file: 输出文件路径（可选）
        tshark_path: tshark 路径（可选）
        
    Returns:
        dict: 转换结果
    """
    converter = PcapConverter(tshark_path)
    return converter.convert_to_pcap(input_file, output_file)


def get_supported_formats():
    """
    获取支持的文件格式列表
    
    Returns:
        dict: 格式字典
    """
    return PcapConverter.SUPPORTED_FORMATS.copy()
