import os, glob, re

tools_dir = "C:/Users/LiSai/Desktop/claude/Toolkit/tools"

descriptions = {
    "json.html": "在线JSON格式化和压缩工具，支持JSON校验、美化排版、压缩为单行，纯浏览器处理无需上传",
    "base64.html": "在线Base64编码解码工具，支持字符串和文件Base64互转，纯前端处理保护数据隐私",
    "timestamp.html": "在线时间戳转换工具，支持Unix秒级和毫秒级时间戳与日期时间互转，精确快捷",
    "qrcode.html": "在线二维码生成器，支持文本、网址、WiFi、名片等二维码生成，无需注册免费使用",
    "color.html": "在线颜色格式转换工具，支持HEX、RGB、HSL、HSV、CMYK等颜色模式互转含色板",
    "unit.html": "在线单位换算工具，支持长度、重量、面积、体积、温度、压力等常用单位转换",
    "text.html": "在线文本处理工具，支持大小写转换、行排序、去重、统计字数、反转等文本操作",
    "convert.html": "在线进制转换工具，支持二进制、八进制、十进制、十六进制任意进制互转计算",
    "hash.html": "在线哈希计算工具，支持MD5、SHA1、SHA256、SHA512等算法，纯本地计算不上传",
    "password.html": "在线随机密码生成器，自定义长度、包含字符类型，生成强密码保护账户安全",
    "url.html": "在线URL编码解码工具，支持URL参数编解码、中文URL处理，快速准确",
    "currency.html": "在线汇率换算工具，支持人民币、美元、欧元等多国货币实时汇率转换计算",
    "math.html": "在线数学计算器，支持基础运算、三角函数、对数、指数等科学计算功能",
    "photo.html": "在线证件照制作工具，一键换底色、裁剪为一寸二寸等标准尺寸，纯本地处理不上传",
    "claude.html": "Claude Code安装配置教程，VS Code集成、命令行使用、API配置完整指南",
    "blog-ai-server.html": "云服务器AI玩法教程，买完云服务器如何搭配AI应用发挥最大价值",
    "Hermes.html": "Hermes安装配置指南，Hermes工具完整安装部署教程",
    "OpenClaw.html": "OpenClaw安装配置指南，OpenClaw完整安装部署教程",
    "scan.html": "在线文档扫描仪，自动检测边缘、透视校正、多页PDF导出，纯浏览器处理保护隐私",
}

fallback = "在线工具箱提供JSON格式化、时间戳转换、Base64编码等实用工具，无需注册完全免费"

updated = 0
for fname, desc in descriptions.items():
    path = os.path.join(tools_dir, fname)
    if not os.path.exists(path):
        print(f"  ❌ {fname} not found")
        continue
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    old_pattern = r'<meta name="description" content="[^"]*">'
    new_tag = f'<meta name="description" content="{desc}">'
    content = re.sub(old_pattern, new_tag, content)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"  OK {fname}")
    updated += 1

# Update index.html homepage description
index_path = "C:/Users/LiSai/Desktop/claude/Toolkit/index.html"
if os.path.exists(index_path):
    with open(index_path, 'r', encoding='utf-8') as f:
        content = f.read()
    index_desc = '免费实用的在线工具集合，包含JSON格式化、时间戳转换、Base64编码解码、二维码生成、颜色转换等20+工具，纯浏览器处理不上传服务器，保护隐私安全'
    content = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{index_desc}">', content)
    with open(index_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"  OK index.html")

print(f"\nDone! Updated {updated + 1} files.")
