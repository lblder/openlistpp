import os
import sys
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS

# 引入你之前写好的分析逻辑
from utils.pcap_reader import pcap_generator
from processors import get_processor
from utils.converter import PcapConverter
from config.settings import config

# --- 配置日志 ---
logging.basicConfig(level=config.LOG_LEVEL, format=config.LOG_FORMAT)
logger = logging.getLogger(__name__)


# --- 配置 Tshark 路径 ---
# (现在逻辑已移至 config/settings.py 和 utils/pcap_reader.py，无需在此修改 PATH)
tshark_path = config.get_tshark_path()
if tshark_path and sys.platform == 'win32':
    # 可选：如果需要在 Python 之外调用 tshark，仍可加入 PATH
    os.environ["PATH"] = os.path.dirname(tshark_path) + os.pathsep + os.environ["PATH"]
    logger.info(f"Windows 系统: 已将 Tshark 路径添加到 PATH: {os.path.dirname(tshark_path)}")
else:
    logger.info(f"Tshark 路径检测: {tshark_path if tshark_path else '未找到 (可能依赖系统 PATH)'}")


# --- 初始化 Flask ---
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes
# 配置 JSON 显示中文不乱码
app.config['JSON_AS_ASCII'] = config.JSON_AS_ASCII


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



@app.route('/api/convert', methods=['POST'])
def api_convert():
    """
    文件格式转换接口
    Input (JSON):
    {
        "input_path": "D:/data/1.pcapng",
        "output_path": "D:/data/1.pcap",  (可选)
        "overwrite": false  (可选)
    }
    """
    try:
        # 1. 获取参数
        req_data = request.get_json()
        if not req_data or 'input_path' not in req_data:
            return jsonify({"code": 400, "msg": "缺少必要参数 'input_path'"}), 400

        input_path = req_data['input_path']
        output_path = req_data.get('output_path', None)
        overwrite = req_data.get('overwrite', False)

        # 路径解析函数: 将虚拟路径转换为物理路径
        def resolve_path(path):
            if not path:
                return None
            # 如果是虚拟路径 /keti1/data/...
            if path.replace('\\', '/').startswith('/keti1/data'):
                # 去除前缀 /keti1/data
                rel_path = path.replace('\\', '/')[len('/keti1/data'):].lstrip('/')
                return os.path.join(config.DATA_ROOT, rel_path)
            # 否则假设是绝对路径（或者其他处理方式，视需求而定）
            return path

        input_path = resolve_path(input_path)
        if output_path:
            output_path = resolve_path(output_path)

        # 2. 检查输入文件是否存在
        if not os.path.exists(input_path):
            return jsonify({"code": 404, "msg": f"输入文件不存在: {input_path}"}), 404

        # 3. 执行转换
        converter = PcapConverter()
        result = converter.convert_to_pcap(input_path, output_path, overwrite)

        # 4. 返回结果
        if result['success']:
            return jsonify({
                "code": 200,
                "msg": "success",
                "data": result
            })
        else:
            return jsonify({
                "code": 400,
                "msg": result.get('error', '转换失败'),
                "data": result
            }), 400

    except Exception as e:
        logger.error(f"转换 API 异常: {e}")
        return jsonify({"code": 500, "msg": f"服务器内部错误: {str(e)}"}), 500


@app.route('/api/convert/batch', methods=['POST'])
def api_batch_convert():
    """
    批量转换接口
    Input (JSON):
    {
        "input_dir": "D:/data/captures",
        "output_dir": "D:/data/pcaps",  (可选)
        "recursive": false  (可选)
    }
    """
    try:
        # 1. 获取参数
        req_data = request.get_json()
        if not req_data or 'input_dir' not in req_data:
            return jsonify({"code": 400, "msg": "缺少必要参数 'input_dir'"}), 400

        input_dir = req_data['input_dir']
        output_dir = req_data.get('output_dir', None)
        recursive = req_data.get('recursive', False)

        # 路径解析函数 (复用)
        def resolve_path(path):
            if not path:
                return None
            if path.replace('\\', '/').startswith('/keti1/data'):
                rel_path = path.replace('\\', '/')[len('/keti1/data'):].lstrip('/')
                return os.path.join(config.DATA_ROOT, rel_path)
            return path

        input_dir = resolve_path(input_dir)
        if output_dir:
            output_dir = resolve_path(output_dir)

        # 2. 检查输入目录是否存在
        if not os.path.isdir(input_dir):
            return jsonify({"code": 404, "msg": f"输入目录不存在: {input_dir}"}), 404

        # 3. 执行批量转换
        converter = PcapConverter()
        result = converter.batch_convert(input_dir, output_dir, recursive)

        # 4. 返回结果
        return jsonify({
            "code": 200,
            "msg": "success",
            "data": result
        })

    except Exception as e:
        logger.error(f"批量转换 API 异常: {e}")
        return jsonify({"code": 500, "msg": f"服务器内部错误: {str(e)}"}), 500


@app.route('/api/formats', methods=['GET'])
def api_formats():
    """
    查询支持的文件格式
    """
    try:
        converter = PcapConverter()
        return jsonify({
            "code": 200,
            "msg": "success",
            "data": {
                "supported_formats": converter.SUPPORTED_FORMATS,
                "total": len(converter.SUPPORTED_FORMATS)
            }
        })
    except Exception as e:
        logger.error(f"查询格式 API 异常: {e}")
        return jsonify({"code": 500, "msg": f"服务器内部错误: {str(e)}"}), 500


@app.route('/api/fs/list', methods=['GET'])
def api_fs_list():
    """
    获取指定路径下的文件和文件夹列表
    Input (Query):
    ?path=optional_subdir
    """
    try:
        # 获取相对路径参数
        rel_path = request.args.get('path', '')
        # 如果是相对路径，去除开头的 [./] 或者 [\]
        if rel_path.startswith('./') or rel_path.startswith('.\\'):
             rel_path = rel_path[2:]
        
        # 构建绝对路径
        base_path = config.DATA_ROOT
        target_path = os.path.join(base_path, rel_path)
        
        # 安全检查：防止路径遍历攻击
        # absolute_target = os.path.abspath(target_path)
        # absolute_base = os.path.abspath(base_path)
        # if not absolute_target.startswith(absolute_base):
        #    return jsonify({"code": 403, "msg": "Access denied: Path traversal detected"}), 403

        if not os.path.exists(target_path):
             return jsonify({"code": 404, "msg": f"Path not found: {target_path}"}), 404
             
        items = []
        try:
            with os.scandir(target_path) as entries:
                for entry in entries:
                    items.append({
                        "name": entry.name,
                        "is_dir": entry.is_dir(),
                        "path": os.path.join(rel_path, entry.name).replace('\\', '/'), # 返回相对路径
                        "abs_path": entry.path.replace('\\', '/') # 返回绝对路径
                    })
        except Exception as e:
             return jsonify({"code": 500, "msg": f"Error scanning directory: {str(e)}"}), 500
             
        # 排序：文件夹在前，文件在后
        items.sort(key=lambda x: (not x['is_dir'], x['name'].lower()))
        
        return jsonify({
            "code": 200,
            "msg": "success",
            "data": items
        })

    except Exception as e:
        logger.error(f"文件列表 API 异常: {e}")
        return jsonify({"code": 500, "msg": f"服务器内部错误: {str(e)}"}), 500


@app.route('/', methods=['GET'])
def index():
    return jsonify({
        "status": "running",
        "service": "Industrial Protocol Analyzer API",
        "endpoints": [
            "POST /api/analyze",
            "POST /api/convert",
            "POST /api/convert/batch",
            "GET /api/formats"
        ]
    })


# --- 启动入口 ---
if __name__ == "__main__":
    print(f"🌍 工控协议分析服务已启动...")
    print(f"👉 接口地址: http://{config.HOST}:{config.PORT}/api/analyze")
    # print('1111111111111111')
    # debug=True 方便调试，正式部署请改为 False
    app.run(host=config.HOST, port=config.PORT, debug=config.DEBUG)