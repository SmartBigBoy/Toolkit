import os

tools_dir = "C:/Users/LiSai/Desktop/claude/Toolkit/tools"

recommend_html = """
    <div class="tool-recommend container">
        <div class="tool-recommend-title">RECOMMENDED</div>
        <div id="tool-recommend"></div>
    </div>
"""

data_script = '<script src="../js/tools_data.js"></script>'

pages = {
    "photo.html": ('  <footer class="footer container">', '  ' + recommend_html.strip() + '\n'),
    "claude.html": ('<footer>', '\n' + '    <div class="tool-recommend container">\n        <div class="tool-recommend-title">RECOMMENDED</div>\n        <div id="tool-recommend"></div>\n    </div>\n' + '<footer>'),
    "Hermes.html": ('<footer>', '\n' + '    <div class="tool-recommend container">\n        <div class="tool-recommend-title">RECOMMENDED</div>\n        <div id="tool-recommend"></div>\n    </div>\n' + '<footer>'),
    "OpenClaw.html": ('<footer>', '\n' + '    <div class="tool-recommend container">\n        <div class="tool-recommend-title">RECOMMENDED</div>\n        <div id="tool-recommend"></div>\n    </div>\n' + '<footer>'),
    "blog-ai-server.html": ('<footer>', '\n' + '    <div class="tool-recommend container">\n        <div class="tool-recommend-title">RECOMMENDED</div>\n        <div id="tool-recommend"></div>\n    </div>\n' + '<footer>'),
}

for fname, (footer_marker, replacement) in pages.items():
    path = os.path.join(tools_dir, fname)
    if not os.path.exists(path):
        print(f"SKIP {fname}")
        continue

    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Add recommendation section
    if 'tool-recommend' not in content:
        content = content.replace(footer_marker, replacement)

    # Add data script reference
    if 'tools_data.js' not in content:
        if '<script>\nvar _hmt' in content:
            content = content.replace('<script>\nvar _hmt', data_script + '\n<script>\nvar _hmt')
        elif '<script>\n(function() { var hm' in content:
            content = content.replace('<script>\n(function() { var hm', data_script + '\n<script>\n(function() { var hm')
        else:
            # Try last </body> tag
            content = content.replace('</body>', data_script + '\n</body>')

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"OK {fname}")

print("Done!")
