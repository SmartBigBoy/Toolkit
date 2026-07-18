import os, glob, re

tools_dir = "C:/Users/LiSai/Desktop/claude/Toolkit/tools"

# List of tool pages to update (skip scan.html which has different structure)
pages = [
    "base64.html", "color.html", "convert.html", "currency.html",
    "hash.html", "json.html", "math.html", "password.html",
    "photo.html", "qrcode.html", "text.html", "timestamp.html",
    "unit.html", "url.html",
]

# The recommendation HTML to insert before the footer
recommend_html = """
    <div class="tool-recommend container">
        <div class="tool-recommend-title"><i class="fas fa-sync-alt"></i> 推荐工具</div>
        <div class="rec-grid" id="tool-recommend"></div>
    </div>
"""

# Script tag to add before Baidu analytics
data_script = '<script src="../js/tools_data.js"></script>'

for fname in pages:
    path = os.path.join(tools_dir, fname)
    if not os.path.exists(path):
        print(f"SKIP {fname} - not found")
        continue

    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Insert recommendation section before <footer class="footer
    if '<div class="tool-recommend' not in content:
        content = content.replace(
            '    <footer class="footer',
            recommend_html + '    <footer class="footer'
        )

    # 2. Add tools_data.js script before Baidu analytics
    if 'tools_data.js' not in content:
        content = content.replace(
            '<script>\nvar _hmt',
            data_script + '\n<script>\nvar _hmt'
        )

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"OK {fname}")

print("\nDone!")
