from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import json
import os
from datetime import datetime

app = Flask(__name__, static_folder='.')
CORS(app)  # 启用跨域资源共享

# 排行榜数据文件路径
LEADERBOARD_FILE = 'leaderboard.json'

# 确保排行榜文件存在
if not os.path.exists(LEADERBOARD_FILE):
    with open(LEADERBOARD_FILE, 'w', encoding='utf-8') as f:
        json.dump([], f)

# 静态文件服务 - 提供游戏前端文件
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

# 添加静态文件路由
@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

# 获取排行榜数据
@app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard():
    try:
        with open(LEADERBOARD_FILE, 'r', encoding='utf-8') as f:
            leaderboard = json.load(f)
        return jsonify(leaderboard)
    except Exception as e:
        print(f"获取排行榜失败: {e}")
        return jsonify({"error": "获取排行榜失败"}), 500

# 添加新的排行榜记录
@app.route('/api/leaderboard', methods=['POST'])
def add_leaderboard_entry():
    try:
        data = request.json
        name = data.get('name')
        score = data.get('score')
        date = data.get('date')
        difficulty = data.get('difficulty')
        
        # 验证数据
        if not all([name, score, date, difficulty]):
            return jsonify({"error": "缺少必要数据"}), 400
        
        # 读取现有排行榜
        with open(LEADERBOARD_FILE, 'r', encoding='utf-8') as f:
            leaderboard = json.load(f)
        
        # 添加新记录
        leaderboard.append({
            "name": name,
            "score": score,
            "date": date,
            "difficulty": difficulty
        })
        
        # 按分数排序（从高到低）
        leaderboard.sort(key=lambda x: x["score"], reverse=True)
        
        # 只保留前20名
        if len(leaderboard) > 20:
            leaderboard = leaderboard[:20]
        
        # 保存回文件
        with open(LEADERBOARD_FILE, 'w', encoding='utf-8') as f:
            json.dump(leaderboard, f, ensure_ascii=False)
        
        return jsonify({"success": True, "leaderboard": leaderboard})
    except Exception as e:
        print(f"添加排行榜记录失败: {e}")
        return jsonify({"error": "添加排行榜记录失败"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True)