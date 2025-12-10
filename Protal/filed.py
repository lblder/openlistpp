import pyshark
import os


def list_pyshark_fields(path_input, display_filter=None, packet_count=3):
    """
    智能分析函数：支持传入 '文件夹路径' 或 '单个文件路径'
    """
    # 1. 判断传入的是文件还是文件夹
    files_to_process = []

    if os.path.isfile(path_input):
        files_to_process.append(path_input)
    elif os.path.isdir(path_input):
        for filename in os.listdir(path_input):
            if filename.endswith(('.pcap', '.pcapng', '.cap')):
                files_to_process.append(os.path.join(path_input, filename))
    else:
        print(f"❌ 路径不存在或无效: {path_input}")
        return

    # 2. 开始处理文件列表
    for file_path in files_to_process:
        print(f"\n{'=' * 60}")
        print(f"📄 正在分析文件: {os.path.basename(file_path)}")
        print(f"{'=' * 60}")

        try:
            # display_filter 负责“筛选数据包”
            cap = pyshark.FileCapture(file_path, display_filter=display_filter)

            count = 0
            for pkt in cap:
                if count >= packet_count:
                    break

                print(f"\n📦 包编号: {pkt.number} | 协议概览: {pkt.highest_layer}")

                # 遍历所有层
                for layer in pkt.layers:
                    # =================================================
                    # 🔥 核心修改：手动过滤层名称 🔥
                    # 如果设置了过滤器，且当前层名字不包含过滤器关键字，就跳过
                    # 例如：过滤器是 'cip'，那么 'eth', 'ip', 'tcp' 都会被跳过
                    # =================================================
                    if display_filter:
                        # 使用 lower() 忽略大小写
                        # 注意：有些层名可能叫 'cip_io' 或 'enip'，这里用 "in" 来模糊匹配
                        if display_filter.lower() not in layer.layer_name.lower():
                            continue

                    print(f"\n  🔹 层名称: {layer.layer_name.upper()} (pkt.{layer.layer_name})")

                    # 打印字段
                    field_names = layer.field_names
                    if not field_names:
                        print("       (无字段)")
                        continue

                    for field in field_names:
                        try:
                            val = getattr(layer, field)
                            print(f"       • {field:<30} = {str(val)[:50]}")
                        except:
                            pass

                count += 1

            cap.close()

        except Exception as e:
            print(f"❌ 分析出错: {e}")


# --- 测试 ---
if __name__ == "__main__":
    target_folder = r"D:\User\work\Protal\data3\CIP"

    # 这里设置你想看的协议名称
    filter_keyword = "cip"

    print(f"开始扫描文件夹: {target_folder} (只显示 {filter_keyword} 层)")

    # 这里的 display_filter 既用于底层抓包过滤，也用于我们上层的显示过滤
    list_pyshark_fields(target_folder, display_filter=filter_keyword)