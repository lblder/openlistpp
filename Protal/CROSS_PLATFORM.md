# Protal 跨平台兼容性改进

## 问题

原始代码中 tshark 路径硬编码为 Windows 路径，导致在 Linux 部署时需要手动修改多个文件：
- `app.py` 第 15 行
- `utils/pcap_reader.py` 第 9 行

## 解决方案

### 1. `utils/pcap_reader.py` 改进

**修改前**:
```python
tshark_path = r"D:\Software\Wireshark\tshark.exe"
```

**修改后**:
```python
def get_tshark_path():
    # 1. 检查环境变量 TSHARK_PATH
    if 'TSHARK_PATH' in os.environ:
        return os.environ['TSHARK_PATH']
    
    # 2. 尝试从系统 PATH 中找到 tshark
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
```

**优先级**:
1. 环境变量 `TSHARK_PATH` (最高优先级)
2. 系统 PATH 中的 tshark
3. 平台特定的默认路径
4. 让 pyshark 自动查找

---

### 2. `app.py` 改进

**修改前**:
```python
TSHARK_DIR = r"D:\Software\Wireshark"
os.environ["PATH"] = TSHARK_DIR + os.pathsep + os.environ["PATH"]
```

**修改后**:
```python
if sys.platform == 'win32':
    # Windows: 将 Wireshark 目录添加到 PATH
    TSHARK_DIR = r"D:\Software\Wireshark"
    os.environ["PATH"] = TSHARK_DIR + os.pathsep + os.environ["PATH"]
    logger.info(f"Windows 系统: 已将 Wireshark 目录添加到 PATH")
else:
    # Linux/Mac: tshark 通常已在系统 PATH 中
    logger.info(f"Linux/Mac 系统: 使用系统 PATH 中的 tshark")
```

**改进**:
- 只在 Windows 系统上修改 PATH
- Linux/Mac 系统直接使用系统安装的 tshark

---

## 使用方法

### Windows 部署

无需修改，代码会自动尝试以下路径：
1. `D:\Software\Wireshark\tshark.exe`
2. `C:\Program Files\Wireshark\tshark.exe`
3. `C:\Program Files (x86)\Wireshark\tshark.exe`

如果 Wireshark 安装在其他位置，可以设置环境变量：
```powershell
$env:TSHARK_PATH = "E:\MyApps\Wireshark\tshark.exe"
python app.py
```

### Linux 部署

**完全自动化，无需修改任何代码！**

只需确保 tshark 已安装：
```bash
# Ubuntu/Debian
sudo apt install -y wireshark tshark

# CentOS
sudo yum install -y wireshark wireshark-cli

# 验证
which tshark  # 应该显示 /usr/bin/tshark
```

如果 tshark 安装在非标准位置，可以设置环境变量：
```bash
export TSHARK_PATH=/opt/wireshark/bin/tshark
python app.py
```

或在 systemd 服务文件中设置：
```ini
[Service]
Environment="TSHARK_PATH=/opt/wireshark/bin/tshark"
```

---

## 部署文档更新

`DEPLOYMENT_LINUX.md` 已更新，移除了手动修改配置文件的步骤：

**删除的步骤**:
```bash
# 配置 Tshark 路径 (如果不是默认路径)
vim app.py
# 修改第 15 行: TSHARK_DIR = "/usr/bin"
```

**新增说明**:
> **注意**: 代码已经自动适配 Linux 系统，会自动使用 `/usr/bin/tshark`，无需手动修改配置文件。

---

## 测试

### Windows 测试
```powershell
cd D:\Code\work\OL\Protal
conda activate pcap
python app.py
# 应该看到: "Windows 系统: 已将 Wireshark 目录添加到 PATH"
```

### Linux 测试
```bash
cd /opt/openlist/Protal
conda activate pcap
python app.py
# 应该看到: "Linux/Mac 系统: 使用系统 PATH 中的 tshark"
```

---

## 优势

1. ✅ **零配置部署**: Linux 部署时无需修改任何代码
2. ✅ **跨平台兼容**: 同一套代码可在 Windows/Linux/Mac 运行
3. ✅ **灵活配置**: 支持环境变量自定义 tshark 路径
4. ✅ **智能查找**: 自动尝试多个常见路径
5. ✅ **向后兼容**: 原有 Windows 部署不受影响

---

## 总结

通过这次改进，Protal 服务现在可以：
- 在 Windows 上开箱即用
- 在 Linux 上零配置部署
- 通过环境变量灵活配置
- 自动适配不同操作系统

**部署 Linux 时不再需要修改任何代码文件！** 🎉
