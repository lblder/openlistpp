import requests

url = "http://localhost:5000/api/analyze"
payload = {"path": "D:\\Code\\work\\OL\\Protal\\test\\1.pcapng"} # 修改为真实存在的路径

try:
    resp = requests.post(url, json=payload)
    print(resp.json())
except Exception as e:
    print("连接失败:", e)