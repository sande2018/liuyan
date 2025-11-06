// API请求封装
async function apiRequest(url, method = 'GET', data = null) {
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        },
    };
    
    if (data) {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error('网络请求失败');
        }
        return await response.json();
    } catch (error) {
        console.error('API请求错误:', error);
        alert('网络请求失败，请稍后重试');
        return null;
    }
}

// 管理员登录
async function adminLogin() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const errorElement = document.getElementById('loginError');
    
    if (!username || !password) {
        errorElement.textContent = '请输入用户名和密码';
        return;
    }
    
    const data = {
        username: username,
        password: password
    };
    
    const result = await apiRequest('http://localhost:5000/api/admin/login', 'POST', data);
    if (result && result.success) {
        // 登录成功，切换到管理界面
        localStorage.setItem('adminLoggedIn', 'true');
        showSection('adminSection');
        loadMessages();
    } else {
        errorElement.textContent = '用户名或密码错误';
    }
}

// 切换显示的界面
function showSection(sectionId) {
    // 隐藏所有section
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    // 显示目标section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
}

// 加载所有留言
async function loadMessages() {
    const result = await apiRequest('http://localhost:5000/api/admin/messages');
    if (result) {
        displayMessages(result);
    }
}

// 显示所有留言
function displayMessages(messages) {
    const container = document.getElementById('messagesContainer');
    container.innerHTML = '';
    
    if (messages.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #7f8c8d; padding: 50px;">暂无留言</p>';
        return;
    }
    
    messages.forEach(message => {
        const messageItem = document.createElement('div');
        messageItem.className = 'message-item';
        
        // 构建回复HTML
        let repliesHtml = '';
        if (message.replies.length > 0) {
            repliesHtml = `
                <div class="replies-section">
                    <h3>回复</h3>
                    ${message.replies.map(reply => `
                        <div class="reply-item">
                            <div class="reply-header">
                                <span class="reply-sender">管理员</span>
                                <span class="reply-time">${reply.created_at}</span>
                            </div>
                            <div class="reply-content">${reply.content}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        messageItem.innerHTML = `
            <div class="message-header">
                <div class="message-info">
                    <span class="message-id">留言ID: ${message.id}</span>
                    <span class="message-time">${message.created_at}</span>
                </div>
            </div>
            <div class="message-content">${message.content}</div>
            ${repliesHtml}
            <div class="reply-form">
                <textarea id="replyContent-${message.id}" placeholder="请输入回复内容..." rows="3"></textarea>
                <button class="reply-btn" onclick="replyToMessage(${message.id})">回复</button>
            </div>
        `;
        
        container.appendChild(messageItem);
    });
}

// 回复留言
async function replyToMessage(messageId) {
    const textarea = document.getElementById(`replyContent-${messageId}`);
    const content = textarea.value.trim();
    
    if (!content) {
        alert('请输入回复内容');
        return;
    }
    
    const data = {
        content: content
    };
    
    const result = await apiRequest(`http://localhost:5000/api/admin/reply/${messageId}`, 'POST', data);
    if (result && result.success) {
        // 清空回复框
        textarea.value = '';
        // 重新加载留言
        loadMessages();
        // 显示通知
        showNotification();
    }
}

// 显示通知
function showNotification() {
    const badge = document.getElementById('notificationBadge');
    badge.style.display = 'inline-block';
    
    // 3秒后隐藏通知
    setTimeout(() => {
        badge.style.display = 'none';
    }, 3000);
}

// 退出登录
function logout() {
    localStorage.removeItem('adminLoggedIn');
    showSection('loginSection');
    // 清空表单
    document.getElementById('loginForm').reset();
    document.getElementById('loginError').textContent = '';
}

// 定时检查新留言和回复
setInterval(() => {
    if (localStorage.getItem('adminLoggedIn') === 'true') {
        loadMessages();
    }
}, 20000); // 每20秒检查一次

// 初始化页面
document.addEventListener('DOMContentLoaded', () => {
    // 检查是否已登录
    if (localStorage.getItem('adminLoggedIn') === 'true') {
        showSection('adminSection');
        loadMessages();
    } else {
        showSection('loginSection');
    }
    
    // 登录表单提交事件
    document.getElementById('loginForm').addEventListener('submit', (e) => {
        e.preventDefault();
        adminLogin();
    });
    
    // 退出登录按钮事件
    document.getElementById('logoutBtn').addEventListener('click', logout);
});