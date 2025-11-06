from flask import Flask, request, jsonify, render_template
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import hashlib

app = Flask(__name__)
CORS(app)  # 解决跨域问题

# 配置数据库
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///messages.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# 管理员模型
class Admin(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password = db.Column(db.String(128), nullable=False)

# 留言模型
class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    user_id = db.Column(db.String(128), nullable=False)  # 用哈希值标识用户
    replies = db.relationship('Reply', backref='message', lazy=True)

# 回复模型
class Reply(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    message_id = db.Column(db.Integer, db.ForeignKey('message.id'), nullable=False)

# 创建数据库表
with app.app_context():
    db.create_all()
    # 初始化管理员账号 (用户名: admin, 密码: admin123)
    if not Admin.query.filter_by(username='admin').first():
        admin = Admin(username='admin', password=hashlib.md5('admin123'.encode()).hexdigest())
        db.session.add(admin)
        db.session.commit()

# 管理员登录
@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    admin = Admin.query.filter_by(username=username).first()
    if admin and admin.password == hashlib.md5(password.encode()).hexdigest():
        return jsonify({'success': True, 'message': '登录成功'})
    else:
        return jsonify({'success': False, 'message': '用户名或密码错误'}), 401

# 获取所有留言（管理员）
@app.route('/api/admin/messages', methods=['GET'])
def get_all_messages():
    messages = Message.query.order_by(Message.created_at.desc()).all()
    result = []
    for msg in messages:
        replies = [{'id': r.id, 'content': r.content, 'created_at': r.created_at.strftime('%Y-%m-%d %H:%M:%S')} for r in msg.replies]
        result.append({
            'id': msg.id,
            'content': msg.content,
            'created_at': msg.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'user_id': msg.user_id,
            'replies': replies
        })
    return jsonify(result)

# 回复留言（管理员）
@app.route('/api/admin/reply/<int:message_id>', methods=['POST'])
def reply_message(message_id):
    data = request.get_json()
    content = data.get('content')
    
    message = Message.query.get(message_id)
    if not message:
        return jsonify({'success': False, 'message': '留言不存在'}), 404
    
    reply = Reply(content=content, message_id=message_id)
    db.session.add(reply)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'reply': {
            'id': reply.id,
            'content': reply.content,
            'created_at': reply.created_at.strftime('%Y-%m-%d %H:%M:%S')
        }
    })

# 提交留言（用户）
@app.route('/api/user/message', methods=['POST'])
def submit_message():
    data = request.get_json()
    content = data.get('content')
    user_id = data.get('user_id')
    
    message = Message(content=content, user_id=user_id)
    db.session.add(message)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': {
            'id': message.id,
            'content': message.content,
            'created_at': message.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'user_id': message.user_id,
            'replies': []
        }
    })

# 获取用户自己的留言
@app.route('/api/user/message/<string:user_id>', methods=['GET'])
def get_user_message(user_id):
    message = Message.query.filter_by(user_id=user_id).first()
    if not message:
        return jsonify({'success': False, 'message': '没有找到留言'}), 404
    
    replies = [{'id': r.id, 'content': r.content, 'created_at': r.created_at.strftime('%Y-%m-%d %H:%M:%S')} for r in message.replies]
    return jsonify({
        'success': True,
        'message': {
            'id': message.id,
            'content': message.content,
            'created_at': message.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'user_id': message.user_id,
            'replies': replies
        }
    })

# 更新用户留言
@app.route('/api/user/message/<int:message_id>', methods=['PUT'])
def update_message(message_id):
    data = request.get_json()
    content = data.get('content')
    user_id = data.get('user_id')
    
    message = Message.query.get(message_id)
    if not message or message.user_id != user_id:
        return jsonify({'success': False, 'message': '无权修改此留言'}), 403
    
    message.content = content
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': {
            'id': message.id,
            'content': message.content,
            'created_at': message.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'user_id': message.user_id
        }
    })

# 渲染用户页面
@app.route('/')
def index():
    return render_template('index.html')

# 渲染管理员页面
@app.route('/admin')
def admin():
    return render_template('admin.html')

if __name__ == '__main__':
    app.run(debug=True, port=5000)