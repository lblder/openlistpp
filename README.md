# 快速上手

1、前端

编译构建

```shell
pnpm install
pnpm build
```

2、后端

编译运行

```shell
# 构建项目（会生成 openlist.exe 文件）
go build -o openlist.exe .
# 终端执行
.\openlist.exe server --dev
```

其他常用命令

```shell
# 查看帮助信息
.\openlist.exe --help

# 查看版本
.\openlist.exe version

# 停止服务（如果使用 start 启动）
.\openlist.exe stop
```

切换前端并编译

```
cd ..\OpenList-Frontend\
pnpm build
```

切换后端并编译

```
cd ..\OpenList-main\

go build -o openlist.exe .

.\openlist.exe server
```

