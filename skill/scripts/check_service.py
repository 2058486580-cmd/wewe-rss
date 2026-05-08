#!/usr/bin/env python3
"""检查 WeWe RSS Docker 服务是否运行"""
import socket
import subprocess
import sys

DEFAULT_HOST = "localhost"
DEFAULT_PORT = 4000

def check_service() -> bool:
    """检查服务是否可用"""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(2)
        result = sock.connect_ex((DEFAULT_HOST, DEFAULT_PORT))
        sock.close()
        return result == 0
    except socket.error:
        return False

def check_docker_container() -> str | None:
    """检查 Docker 容器是否运行，返回容器名称"""
    try:
        result = subprocess.run(
            ["docker", "ps", "--format", "{{.Names}}"],
            capture_output=True, text=True, timeout=5
        )
        for line in result.stdout.strip().split('\n'):
            if 'wewe-rss' in line.lower():
                return line
        return None
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return None

if __name__ == "__main__":
    if check_service():
        print(f"服务运行正常: {DEFAULT_HOST}:{DEFAULT_PORT}")
        sys.exit(0)

    container = check_docker_container()
    if container:
        print(f"Docker 容器运行中: {container}，但服务端口未响应", file=sys.stderr)
        print("提示：检查端口映射是否正确 (docker-compose.yml 中 ports: 4000:4000)", file=sys.stderr)
    else:
        print(f"服务未运行: {DEFAULT_HOST}:{DEFAULT_PORT}", file=sys.stderr)
        print("提示：请运行 docker-compose up -d 启动服务", file=sys.stderr)
    sys.exit(1)
