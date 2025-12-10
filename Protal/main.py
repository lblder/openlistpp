# main.py
import logging
from utils.pcap_reader import pcap_generator
from processors import get_processor

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def analyze_industrial_pcap(file_path):
    """
    分析 PCAP 文件，自动识别协议并提取数据
    """
    results = []
    packet_count = 0

    # 定义宽泛的过滤器，涵盖所有目标协议
    # 这样可以一次性读取文件，然后在 Python 层面分发
    broad_filter = "modbus || fins || s7comm || tcp.port==502 || udp.port==9600 || tcp.port==102"

    logger.info(f"开始分析文件: {file_path}")

    try:
        for pkt in pcap_generator(file_path, display_filter=broad_filter):
            packet_count += 1

            # 1. 动态获取处理器
            processor = get_processor(pkt)

            # 2. 如果找到了对应的处理器，则执行解析
            if processor:
                parsed_data = processor.parse(pkt)
                if parsed_data:
                    results.append(parsed_data)
                    # logger.info(f"解析成功 [包#{packet_count}]: {parsed_data['protocol']}")

            if packet_count % 100 == 0:
                print(f"已扫描 {packet_count} 个数据包...", end='\r')

        return {
            "success": True,
            "total_scanned": packet_count,
            "packets_found": len(results),
            "data": results
        }

    except Exception as e:
        logger.error(f"分析中断: {e}")
        return {
            "success": False,
            "error": str(e),
            "total_scanned": packet_count,
            "data": []
        }


# --- 测试入口 ---
if __name__ == "__main__":
    # 替换为你的文件路径
    # test_file = r"D:\User\work\Protal\data3\Modbus\1.pcapng"
    test_file = r"D:\Code\work\OL\Protal\test\1.pcapng"
    # test_file = "./data3/Omron_Fins_Tcp/烟雾浓度探测_D0.pcapng"

    result = analyze_industrial_pcap(test_file)

    if result['success']:
        print(f"\n✅ 分析完成！")
        print(f"总扫描包数: {result['total_scanned']}")
        print(f"提取有效包数: {result['packets_found']}")

        # 简单统计一下各协议数量
        proto_counts = {}
        for p in result['data']:
            proto = p['protocol']
            proto_counts[proto] = proto_counts.get(proto, 0) + 1
        print(f"协议分布: {proto_counts}")

        # 打印前2条数据示例
        if result['data']:
            print("\n--- 数据示例 (前2条) ---")
            for item in result['data'][:2]:
                print(item)
    else:
        print(f"\n❌ 分析失败: {result['error']}")