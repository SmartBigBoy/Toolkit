#!/usr/bin/env python3
import os
import re

def update_footer(filepath):
    """更新工具页面的 footer"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    old_footer = '''<footer class="footer">
        <div class="container">
            <p>&copy; 2025 在线工具箱 | 简洁高效的工具集合</p>
        </div>
    </footer>'''
    
    new_footer = '''<footer class="footer">
        <div class="container">
            <p>&copy; 2024 <a href="https://toolkit.skin" style="color: inherit; text-decoration: none;">TOOLKIT.SKIN</a> - 免费在线工具箱 | 
                <a href="../disclaimer.html" style="color: inherit;">免责声明</a>
            </p>
        </div>
    </footer>'''
    
    content = content.replace(old_footer, new_footer)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"Updated footer: {filepath}")

# 更新所有工具页面
tools_dir = '/workspace/projects/tools'
for filename in os.listdir(tools_dir):
    if filename.endswith('.html'):
        update_footer(os.path.join(tools_dir, filename))

print("All footers updated!")
