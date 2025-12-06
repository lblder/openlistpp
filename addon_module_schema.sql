/********************************************************************
* 项目名称：安全策略 & 工控协议/设备场量 增量模块
* 文件用途：创建模块所需全部数据表（4 张）
* 日期：2024-12-03
********************************************************************/

/**************************************************************
* 1. 表：security_strategy（安全防护策略表）
* 用途：存储 100+ 种安全防护策略，可在前端页面配置与筛选
**************************************************************/
/*
DROP TABLE IF EXISTS ics_device_point;
DROP TABLE IF EXISTS ics_device;
DROP TABLE IF EXISTS ics_protocol;
DROP TABLE IF EXISTS security_strategy;
*/

CREATE TABLE security_strategy (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    name VARCHAR(255) NOT NULL COMMENT '策略名称，例如 “端口访问控制”、“数据脱敏策略”',
    category VARCHAR(100) NOT NULL COMMENT '策略分类，例如 网络安全/数据安全/身份安全',
    level VARCHAR(50) NOT NULL COMMENT '策略级别：高/中/低',
    params JSON COMMENT '策略参数（JSON 格式，例如阈值、规则等）',
    description TEXT COMMENT '策略详细描述',
    status TINYINT NOT NULL DEFAULT 1 COMMENT '状态：1=启用，0=禁用',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    INDEX idx_category(category),
    INDEX idx_level(level)
) COMMENT='安全防护策略表（支持 100 种以上策略配置）';



/**************************************************************
* 2. 表：ics_protocol（工控协议表）
* 用途：管理不少于 10 种工控协议（如 Modbus/IEC104/OPC-UA）
**************************************************************/


CREATE TABLE ics_protocol (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    name VARCHAR(100) NOT NULL COMMENT '工控协议名称',
    version VARCHAR(50) COMMENT '协议版本号',
    scene VARCHAR(100) NOT NULL COMMENT '适用场景，如 电力/轨交/石化',
    remark TEXT COMMENT '协议备注说明',
    status TINYINT NOT NULL DEFAULT 1 COMMENT '状态：1=启用，0=禁用',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',

    UNIQUE KEY uk_protocol_name(name),
    INDEX idx_scene(scene)
) COMMENT='工控协议表（支持 10+ 协议）';


/**************************************************************
* 3. 表：ics_device（工控设备表）
* 用途：存储各种工控设备，与协议 & 场景关联
**************************************************************/

CREATE TABLE ics_device (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '设备主键ID',
    device_name VARCHAR(255) NOT NULL COMMENT '设备名称，例如 “变电站采集终端”',
    protocol_id BIGINT NOT NULL COMMENT '关联协议ID（ics_protocol.id）',
    scene VARCHAR(100) NOT NULL COMMENT '所属工控场景，例如 电力/轨交/石化',
    status TINYINT NOT NULL DEFAULT 1 COMMENT '状态：1=正常，0=停用',
    remark TEXT COMMENT '设备描述或备注',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',

    INDEX idx_protocol_id(protocol_id),
    INDEX idx_scene(scene),

    CONSTRAINT fk_device_protocol
        FOREIGN KEY (protocol_id)
        REFERENCES ics_protocol(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) COMMENT='工控设备表（支持按协议和场景分类管理设备）';


/**************************************************************
* 4. 表：ics_device_point（设备场量 / 点表）
* 用途：记录设备的所有“场量”（不少于 100 种）
* 场量例子：电压、电流、温度、开关量、状态量等
**************************************************************/

CREATE TABLE ics_device_point (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    device_id BIGINT NOT NULL COMMENT '关联设备ID（ics_device.id）',
    point_name VARCHAR(255) NOT NULL COMMENT '场量名称，例如 Ua、Ia、温度',
    point_type VARCHAR(100) NOT NULL COMMENT '场量类型：模拟量/开关量/状态量等',
    address VARCHAR(100) COMMENT '寄存器地址，例如 40001、30005',
    unit VARCHAR(50) COMMENT '单位，例如 V、A、℃、% 等',
    tags VARCHAR(255) COMMENT '标签（如 电压/温度/告警 等）',
    status TINYINT NOT NULL DEFAULT 1 COMMENT '状态：1=正常，0=禁用',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',

    INDEX idx_device_id(device_id),
    INDEX idx_point_type(point_type),

    CONSTRAINT fk_point_device
        FOREIGN KEY (device_id)
        REFERENCES ics_device(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
) COMMENT='工控设备场量表（支持 100+ 场量配置）';
