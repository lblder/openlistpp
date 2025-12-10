import os
import logging
from flask import Flask, request, jsonify

# 引入你之前写好的分析逻辑
from utils.pcap_reader import pcap_generator
from processors import get_processor

# --- 配置日志 ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)



TSHARK_DIR = r"D:\Software\Wireshark"  # 注意这里只写目录，不写 .exe

# 将 Wireshark 目录添加到系统 PATH 环境变量的前面
os.environ["PATH"] = TSHARK_DIR + os.pathsep + os.environ["PATH"]

# 测试一下是否生效
logger.info(f"当前 PATH 已包含 Wireshark: {'Wireshark' in os.environ['PATH']}")


# --- 初始化 Flask ---
app = Flask(__name__)
# 配置 JSON 显示中文不乱码
app.config['JSON_AS_ASCII'] = False


# --- 核心分析函数 (复用你之前的逻辑) ---
def analyze_industrial_pcap(file_path):
    """
    分析 PCAP 文件的核心逻辑
    """
    results = []
    packet_count = 0

    # 如果用户没指定协议，默认开启所有常见工控协议

    logger.info(f"开始分析文件: {file_path}")

    try:
        # 使用生成器迭代读取
        for pkt in pcap_generator(file_path):
            packet_count += 1

            # 1. 动态获取处理器 (Modbus/Omron/S7)
            print("正在处理包:", pkt.number)
            processor = get_processor(pkt)

            # 2. 解析数据
            if processor:
                # print("正在处理数据:", pkt.number)
                parsed_data = processor.parse(pkt)
                if parsed_data:
                    results.append(parsed_data)

        return {
            "success": True,
            "total_scanned": packet_count,
            "packets_found": len(results),
            "data": results
        }

    except Exception as e:
        logger.error(f"底层分析中断: {str(e)}")
        # 抛出异常以便外层捕获
        raise RuntimeError(f"分析失败: {str(e)}")


# --- API 路由定义 ---

@app.route('/api/analyze', methods=['POST'])
def api_analyze():
    """
    API 接口
    Input (JSON):
    {
        "path": "D:/data/1.pcapng",
        "type": "auto"  (可选: 'modbus', 'omron', 's7', 'auto')
    }
    """
    try:
        # 1. 获取参数
        req_data = request.get_json()
        if not req_data or 'path' not in req_data:
            return jsonify({"code": 400, "msg": "缺少必要参数 'path'"}), 400

        file_path = req_data['path']
        protocol_type = req_data.get('type', 'auto').lower()

        # 2. 检查文件是否存在
        # 注意: 这里检查的是服务器(运行Flask的电脑)上的路径
        if not os.path.exists(file_path):
            return jsonify({"code": 404, "msg": f"文件不存在: {file_path}"}), 404

        # 4. 执行分析
        result = analyze_industrial_pcap(file_path)

        # 5. 返回结果
        return jsonify({
            "code": 200,
            "msg": "success",
            "data": {
                "filename": os.path.basename(file_path),
                "total_scanned": result['total_scanned'],
                "valid_packets": result['packets_found'],
                "protocols": result['data']
            }
        })

    except Exception as e:
        logger.error(f"API 异常: {e}")
        return jsonify({"code": 500, "msg": f"服务器内部错误: {str(e)}"}), 500


@app.route('/', methods=['GET'])
def index():
    return jsonify({
        "status": "running",
        "service": "Industrial Protocol Analyzer API",
        "endpoints": ["POST /api/analyze"]
    })


# --- 启动入口 ---
if __name__ == "__main__":
    print(f"🌍 工控协议分析服务已启动...")
    print(f"👉 接口地址: http://127.0.0.1:5001/api/analyze")
    print('1111111111111111')
    # debug=True 方便调试，正式部署请改为 False
    app.run(host='0.0.0.0', port=5001, debug=True)