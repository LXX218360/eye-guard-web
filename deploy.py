#!/usr/bin/env python3
"""
一键部署脚本：在 PythonAnywhere Bash 中运行此脚本，自动从 GitHub 同步最新前端文件
使用方法：
1. 打开 PythonAnywhere → Bash
2. 粘贴以下命令：
   curl -sL https://raw.githubusercontent.com/LXX218360/eye-guard-web/main/deploy.py -o deploy.py && python deploy.py
3. 然后去 Web 页面点 Reload
"""
import os
import sys

GITHUB_RAW = 'https://raw.githubusercontent.com/LXX218360/eye-guard-web/main'
FILES = [
    'app.js',
    'index.html',
    'style.css',
    'hmac-security.js',
    'face_landmarker.task',
]
HOME = os.path.expanduser('~')

def download_file(name):
    """从 GitHub 下载文件到当前目录"""
    url = f'{GITHUB_RAW}/{name}'
    print(f'  下载 {name} ...', end=' ', flush=True)
    try:
        import urllib.request
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        resp = urllib.request.urlopen(req, timeout=60)
        data = resp.read()
        filepath = os.path.join(HOME, name)
        with open(filepath, 'wb') as f:
            f.write(data)
        print(f'OK ({len(data)//1024}KB)')
        return True
    except Exception as e:
        print(f'FAIL ({e})')
        return False

def main():
    print('=' * 50)
    print('护眼精灵 - 一键部署脚本')
    print('从 GitHub 同步最新文件到 PythonAnywhere')
    print('=' * 50)
    print()

    ok = 0
    fail = 0
    for f in FILES:
        if download_file(f):
            ok += 1
        else:
            fail += 1

    print()
    print(f'完成: {ok} 成功, {fail} 失败')
    if fail == 0:
        print('所有文件已更新，请去 Web 页面点 Reload 按钮。')
    else:
        print(f'部分文件下载失败，请检查网络后重试。')
    print()

if __name__ == '__main__':
    main()
