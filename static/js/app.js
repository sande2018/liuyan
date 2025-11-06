// 生成唯一用户ID（基于时间戳和随机数的哈希）
function generateUserId() {
    const timestamp = new Date().getTime();
    const random = Math.random().toString(36).substring(2, 10);
    return btoa(timestamp + random).substring(0, 16);
}

// 获取或生成用户ID
function getUserId() {
    let userId = localStorage.getItem('userId');
    if (!userId) {
        userId = generateUserId();
        localStorage.setItem('userId', userId);
    }
    return userId;
}

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

// 提交留言
async function submitMessage() {
    const content = document.getElementById('messageContent').value.trim();
    if (!content) return;
    
    const userId = getUserId();
    const data = {
        content: content,
        user_id: userId
    };
    
    const result = await apiRequest('http://localhost:5000/api/user/message', 'POST', data);
    if (result && result.success) {
        // 保存到本地缓存
        localStorage.setItem('userMessage', JSON.stringify(result.message));
        // 显示留言
        displayMessage(result.message);
        // 清空表单
        document.getElementById('messageContent').value = '';
    }
}

// 显示留言
function displayMessage(message) {
    const messageDisplay = document.getElementById('messageDisplay');
    const userMessageContent = document.getElementById('userMessageContent');
    const userMessageTime = document.getElementById('userMessageTime');
    
    userMessageContent.textContent = message.content;
    userMessageTime.textContent = message.created_at;
    messageDisplay.style.display = 'block';
    
    // 显示回复
    displayReplies(message.replies);
    
    // 切换到查看模式
    toggleEditMode(false);
}

// 显示回复
function displayReplies(replies) {
    const repliesContainer = document.getElementById('repliesContainer');
    repliesContainer.innerHTML = '';
    
    replies.forEach(reply => {
        const replyCard = document.createElement('div');
        replyCard.className = 'message-card admin-message';
        replyCard.innerHTML = `
            <div class="message-header">
                <span class="message-sender">管理员</span>
                <span class="message-time">${reply.created_at}</span>
            </div>
            <div class="message-content">${reply.content}</div>
        `;
        repliesContainer.appendChild(replyCard);
    });
}

// 切换编辑模式
function toggleEditMode(editing) {
    const submitBtn = document.getElementById('submitBtn');
    const editBtn = document.getElementById('editBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const messageContent = document.getElementById('messageContent');
    
    if (editing) {
        submitBtn.style.display = 'none';
        editBtn.style.display = 'inline-block';
        cancelBtn.style.display = 'inline-block';
        messageContent.disabled = false;
    } else {
        submitBtn.style.display = 'inline-block';
        editBtn.style.display = 'none';
        cancelBtn.style.display = 'none';
        messageContent.disabled = true;
    }
}

// 编辑留言
function editMessage() {
    const messageContent = document.getElementById('messageContent');
    const userMessage = JSON.parse(localStorage.getItem('userMessage'));
    
    if (userMessage) {
        messageContent.value = userMessage.content;
        toggleEditMode(true);
    }
}

// 保存修改
async function saveEdit() {
    const content = document.getElementById('messageContent').value.trim();
    if (!content) return;
    
    const userMessage = JSON.parse(localStorage.getItem('userMessage'));
    const userId = getUserId();
    
    const data = {
        content: content,
        user_id: userId
    };
    
    const result = await apiRequest(`http://localhost:5000/api/user/message/${userMessage.id}`, 'PUT', data);
    if (result && result.success) {
        // 更新本地缓存
        userMessage.content = content;
        localStorage.setItem('userMessage', JSON.stringify(userMessage));
        // 更新显示
        document.getElementById('userMessageContent').textContent = content;
        toggleEditMode(false);
    }
}

// 取消修改
function cancelEdit() {
    const userMessage = JSON.parse(localStorage.getItem('userMessage'));
    if (userMessage) {
        document.getElementById('messageContent').value = userMessage.content;
    } else {
        document.getElementById('messageContent').value = '';
    }
    toggleEditMode(false);
}

// 检查是否有本地留言
function checkLocalMessage() {
    const userMessage = localStorage.getItem('userMessage');
    if (userMessage) {
        // 从服务器获取最新的留言和回复
        fetchLatestMessage();
    }
}

// 从服务器获取最新的留言和回复
async function fetchLatestMessage() {
    const userId = getUserId();
    const result = await apiRequest(`http://localhost:5000/api/user/message/${userId}`);
    
    if (result && result.success) {
        // 更新本地缓存
        localStorage.setItem('userMessage', JSON.stringify(result.message));
        // 显示留言
        displayMessage(result.message);
    }
}

// 定时检查新回复
setInterval(() => {
    const userMessage = localStorage.getItem('userMessage');
    if (userMessage) {
        fetchLatestMessage();
    }
}, 30000); // 每30秒检查一次

// 初始化页面
document.addEventListener('DOMContentLoaded', () => {
    // 检查本地留言
    checkLocalMessage();
    
    // 表单提交事件
    document.getElementById('messageForm').addEventListener('submit', (e) => {
        e.preventDefault();
        submitMessage();
    });
    
    // 编辑按钮事件
    document.getElementById('editBtn').addEventListener('click', saveEdit);
    
    // 取消按钮事件
    document.getElementById('cancelBtn').addEventListener('click', cancelEdit);
    
    // 点击留言内容进入编辑模式
    const userMessageContent = document.getElementById('userMessageContent');
    if (userMessageContent) {
        userMessageContent.addEventListener('click', editMessage);
    }
});