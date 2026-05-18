#!/usr/bin/env python3
import os
import re

DOMAIN = "https://toolkit.skin"
ADSENSE_CODE = '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6560822080596473" crossorigin="anonymous"></script>'

def update_html_file(filepath, is_root=False):
    """更新单个 HTML 文件"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 提取页面标题
    title_match = re.search(r'<title>(.*?)</title>', content)
    page_title = title_match.group(1) if title_match else "在线工具箱"
    
    # 确定 CSS 路径
    css_path = "css/style.css" if is_root else "../css/style.css"
    
    # 新的 head 内容
    new_head = f'''<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{page_title}</title>
    <meta name="description" content="在线工具箱提供 JSON格式化、时间戳转换、Base64编码、颜色拾取器、二维码生成等实用工具，无需注册，完全免费。">
    <meta name="keywords" content="在线工具,JSON格式化,时间戳转换,Base64编码,二维码生成,颜色转换,URL编码,工具箱">
    <meta name="author" content="TOOLKIT.SKIN">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="{DOMAIN}/{filepath.replace('/workspace/projects/', '').replace('index.html', '')}">
    <meta property="og:title" content="{page_title}">
    <meta property="og:description" content="免费在线工具箱，提供多种实用工具，包括JSON格式化、时间戳转换、Base64编码等。">
    <meta property="og:url" content="{DOMAIN}/{filepath.replace('/workspace/projects/', '').replace('index.html', '')}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="TOOLKIT.SKIN 在线工具箱">
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="{page_title}">
    <link rel="stylesheet" href="{css_path}">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    {ADSENSE_CODE}'''
    
    # 替换 head 内容
    content = re.sub(r'<head>.*?</head>', new_head, content, flags=re.DOTALL)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"Updated: {filepath}")

# 更新 index.html
update_html_file('/workspace/projects/index.html', is_root=True)

# 更新所有工具页面
tools_dir = '/workspace/projects/tools'
for filename in os.listdir(tools_dir):
    if filename.endswith('.html'):
        update_html_file(os.path.join(tools_dir, filename))

print("All HTML files updated!")
