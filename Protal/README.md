# 🦈 Industrial PCAP Analysis Microservice (工控协议分析微服务)

  

这是一个基于 **Flask** 和 **Pyshark (Tshark)** 构建的轻量级工控协议分析微服务。

它作为一个**无状态后端服务**，接收 PCAP 文件路径，利用 Wireshark 强大的内核自动识别工控协议（支持 Modbus, S7,  CIP,  Omron_Fins_Tcp 四种协议），并返回 JSON 格式的统计报告。

## 🛠️ 环境依赖

在使用本服务前，请确保服务器/本机已安装以下软件：

1.  **Python 3.8+**
2.  **Wireshark** (必须安装，因为底层依赖 `tshark.exe`)
      * *默认路径*: `C:\Program Files\Wireshark\tshark.exe`

## 📦 安装部署

### 1\. 克隆代码或下载项目

将 `app.py` 放入项目目录。

### 2\. 安装 Python 依赖库

在项目目录下打开终端，运行：

```bash
conda create -n pcap python==3.10
conda activate pcap
pip install -r requirements.txt
```

### 3\. 配置 Tshark 路径 (可选)

如果您的 Wireshark 安装在非默认目录（如 D 盘），请打开 `app.py`，修改以下配置：

```python
# app.py 第 15 行左右
TSHARK_DIR = r"D:\Software\Wireshark"  # 注意这里只写目录，不写 .exe
```

## 🚀 启动服务

```bash
python app.py
```

启动成功后，您将看到如下输出：

```text
🌍 工控协议分析服务已启动...
👉 接口地址: http://127.0.0.1:5001/api/analyze
 * Running on http://0.0.0.0:5001
```

-----

## 📡 API 接口文档

### 协议分析接口

  * **URL**: `/api/analyze`
  * **Method**: `POST`
  * **Content-Type**: `application/json`

#### 请求参数 (Request)

| 参数名 | 类型 | 必填 | 说明 |
| :--- | :--- | :--- | :--- |
| `path` | string | 是 | **服务器本地**的 PCAP 文件绝对路径 (如 `D:\pcap_data\test.pcap`) |

**请求示例 (JSON):**

```json
{
    "path": "D:\\pcap_data\\1.pcap"
}
```

*(注意：Windows 路径中的反斜杠 `\` 在 JSON 中建议替换为 `/` 或使用双反斜杠 `\\`)*

#### 响应参数 (Response)

| 参数名 | 类型 | 说明 |
| :--- | :--- | :--- |
| `msg` | string | 状态 (`success` 或 `error`) |
| code | string | 状态码 |
| data | object | 协议统计字典 (协议名: 数量)，按数量倒序排列 |
|  |  |  |

**响应示例 (JSON):**

```json
{
    "msg": "success",
    "code": "200",
    "data": {
        "total_scanned": 78,
        "valid_packets": 41,
        "filename": "1.pcapng",
        "protocols": [
            {
                "dst_ip": "10.33.14.114",
                "info": "Siemens S7Comm Packet",
                "items": [
                    {
                        "address": "DB 1.DBX 0.0 BYTE 8",
                        "description": "Writing Value to PLC",
                        "other": {
                            "raw_hex": "0x3fe5f762b36422ce"
                        },
                        "type": "Write Request",
                        "value": "4604358197344740046"
                    }
                ],
                "other": {
                    "func_code": 5,
                    "job_type": "Write Var Request",
                    "pdu_ref": "575",
                    "rosctr": 1
                },
                "packet_no": "1",
                "protocol": "Siemens S7Comm",
                "src_ip": "10.60.83.222",
                "timestamp": "2025-12-07 13:18:24.684951"
            },
        ]
    }
}
```

-----

## 🧪 测试方法

您可以使用以下任意一种方式验证服务是否正常。

### 方法 1: 使用 Curl (命令行)

```bash
curl -X POST -H "Content-Type: application/json" -d "{\"path\": \"D:/pcap_data/test.pcap\"}" http://localhost:5001/api/analyze
```

### 方法 2: 使用 Python 脚本 (模拟客户端)

创建一个 `test_client.py` 文件：

```python
import requests

url = "http://localhost:5001/api/analyze"
payload = {"path": r"D:\pcap_data\test.pcap"} # 修改为真实存在的路径

try:
    resp = requests.post(url, json=payload)
    print(resp.json())
except Exception as e:
    print("连接失败:", e)
```

-----

## ❓ 常见问题 (Troubleshooting)

**Q1: 报错 `TsharkNotFoundException`**

> **A:** Python 找不到 Tshark。请确认 Wireshark 已安装，并在 `app.py` 中修改 `TSHARK_DIR` 为正确的 Wireshark 安装目录。

**Q2: 报错 `no running event loop`**

> **A:** 这是 Windows 下 `asyncio` 的已知问题。本项目已内置 `nest_asyncio` 修复补丁。请确保您已运行 `pip install nest_asyncio`。

**Q3: 报错 `File not found`**

> **A:** 接口接收的是**服务器端**的文件路径。如果 Python 服务运行在服务器 A，Java 运行在服务器 B，您必须先将文件上传到服务器 A，然后把服务器 A 上的路径传给接口。

**Q4: 路径中有中文导致报错**

> **A:** Tshark 对中文路径支持不佳。强烈建议将待分析的 PCAP 文件存放在**全英文路径**下（如 `D:\pcap_data\`）。