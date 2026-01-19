/**
 * Life Reset Tracker - Core Logic
 */

// --- 配置与状态管理 ---

const CONFIG = {
    storageKey: 'life_reset_data_v1',
    milestones: [3, 7, 15, 30, 60, 90, 180, 360],
    defaultRewards: {
        3: '🎯 小确幸：一杯好咖啡',
        7: '🌟 休息日：看一部电影',
        15: '🎮 放松：玩一天游戏',
        30: '🍽️ 美食：一顿大餐',
        60: '🛍️ 购物：买一件想要的东西',
        90: '✈️ 短途旅行',
        180: '🎁 大礼物：给自己的奖励',
        360: '🏆 终极奖励：实现一个愿望'
    }
};

let state = {
    checkIns: {}, // Format: "YYYY-MM-DD": true
    rewards: { ...CONFIG.defaultRewards },
    leverageTasks: [], // Array of { id, text, completed }
    lastVisit: new Date().toISOString().split('T')[0]
};

// --- 初始化 ---

function init() {
    loadState();
    renderHeader();
    renderStats();
    renderCalendar();
    renderCheckInButton();
    renderMilestones();
    renderLeverageTasks();
    checkMilestoneAchievement();
    
    // 设置定时刷新（每分钟检查一次日期变更）
    setInterval(() => {
        const today = getTodayStr();
        if (today !== state.lastVisit) {
            state.lastVisit = today;
            saveState();
            location.reload(); // 简单处理跨天
        }
    }, 60000);
}

// --- 数据持久化 ---

function loadState() {
    const stored = localStorage.getItem(CONFIG.storageKey);
    if (stored) {
        const parsed = JSON.parse(stored);
        state = { ...state, ...parsed };
        // 确保 rewards 合并（处理新版本可能增加的字段）
        state.rewards = { ...CONFIG.defaultRewards, ...state.rewards };
    }
}

function saveState() {
    localStorage.setItem(CONFIG.storageKey, JSON.stringify(state));
}

// --- 核心逻辑 ---

function getTodayStr() {
    const now = new Date();
    // 处理时区问题，使用本地时间
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function calculateStats() {
    const checkInDates = Object.keys(state.checkIns).sort();
    const total = checkInDates.length;
    
    // 计算连续打卡
    let streak = 0;
    const today = getTodayStr();
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    // 如果今天打卡了，从今天开始算
    // 如果今天没打卡，看昨天是否打卡，如果昨天也没打，streak为0
    
    let currentCheck = today;
    if (!state.checkIns[today]) {
        currentCheck = yesterday;
    }
    
    if (state.checkIns[currentCheck]) {
        streak = 1;
        let checkDate = new Date(currentCheck);
        while (true) {
            checkDate.setDate(checkDate.getDate() - 1);
            const dateStr = checkDate.toISOString().split('T')[0];
            if (state.checkIns[dateStr]) {
                streak++;
            } else {
                break;
            }
        }
    }

    // 计算下一个里程碑
    const nextMilestone = CONFIG.milestones.find(m => m > streak) || 360;
    
    // 计算已达成里程碑数量
    const achievementCount = CONFIG.milestones.filter(m => streak >= m).length;

    return { total, streak, nextMilestone, achievementCount };
}

function toggleCheckIn() {
    const today = getTodayStr();
    if (state.checkIns[today]) {
        delete state.checkIns[today];
    } else {
        state.checkIns[today] = true;
        createConfetti(); // 打卡特效
        checkMilestoneAchievement(true);
    }
    saveState();
    renderStats();
    renderCalendar(); // 只需要局部更新，但全部渲染也够快
    renderCheckInButton();
    renderMilestones();
}

// --- 渲染函数 ---

function renderHeader() {
    const dateOpts = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    document.getElementById('current-date').textContent = new Date().toLocaleDateString('zh-CN', dateOpts);
}

function renderStats() {
    const { total, streak, nextMilestone, achievementCount } = calculateStats();
    
    animateValue('streak-count', parseInt(document.getElementById('streak-count').textContent), streak, 500);
    animateValue('total-count', parseInt(document.getElementById('total-count').textContent), total, 500);
    document.getElementById('next-milestone').textContent = nextMilestone;
    document.getElementById('achievement-count').textContent = achievementCount;
}

function renderCheckInButton() {
    const btn = document.getElementById('check-in-btn');
    const today = getTodayStr();
    const isChecked = !!state.checkIns[today];
    const statusText = document.getElementById('today-status');
    const btnText = document.getElementById('btn-text');
    const btnIcon = document.getElementById('btn-icon');

    if (isChecked) {
        btn.classList.add('checked', 'active'); // Keep active style but different look
        btn.classList.remove('bg-slate-800'); // Clean up
        btnText.textContent = '今日已完成';
        btnIcon.textContent = '✅';
        statusText.textContent = '太棒了！今天已经向前迈进了一步。';
        statusText.classList.add('text-emerald-400');
    } else {
        btn.classList.remove('checked');
        btn.classList.add('active'); // Pulse animation
        btnText.textContent = '立即打卡';
        btnIcon.textContent = '✨';
        statusText.textContent = '今天还没有打卡，完成每日杠杆了吗？';
        statusText.classList.remove('text-emerald-400');
    }
    
    // 解绑旧事件重新绑定，防止多次绑定
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.addEventListener('click', toggleCheckIn);
}

function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';
    
    const today = new Date();
    // 生成过去365天（约52周）
    const totalDays = 365; // 简化处理，显示最近一年
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - totalDays);
    
    // 调整到之前的周一，保持日历整齐
    while (startDate.getDay() !== 1) {
        startDate.setDate(startDate.getDate() - 1);
    }

    const weeks = [];
    let currentWeek = [];
    let loopDate = new Date(startDate);
    
    // 生成直到今天（或本周日）
    const endDate = new Date(today);
    while (endDate.getDay() !== 0) {
        endDate.setDate(endDate.getDate() + 1);
    }

    while (loopDate <= endDate) {
        const dateStr = loopDate.toISOString().split('T')[0];
        const dayOfWeek = loopDate.getDay(); // 0 is Sunday
        
        currentWeek.push({
            date: dateStr,
            level: state.checkIns[dateStr] ? 4 : 0 // 简化：只有0和4两级，后续可扩展
        });

        if (dayOfWeek === 0) { // Sunday, end of week
            weeks.push(currentWeek);
            currentWeek = [];
        }
        
        loopDate.setDate(loopDate.getDate() + 1);
    }
    
    // 渲染周列
    weeks.forEach(week => {
        const col = document.createElement('div');
        col.className = 'flex flex-col gap-1';
        
        week.forEach(day => {
            const cell = document.createElement('div');
            // 根据level选择颜色
            let bgClass = 'bg-slate-800';
            if (day.level > 0) bgClass = 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]';
            
            cell.className = `calendar-day ${bgClass}`;
            cell.dataset.tooltip = `${day.date} ${day.level > 0 ? '已打卡' : '未打卡'}`;
            col.appendChild(cell);
        });
        
        grid.appendChild(col);
    });
    
    // 滚动到最右边
    setTimeout(() => {
        grid.scrollLeft = grid.scrollWidth;
    }, 100);

    // 渲染月份标签（简化版，只显示最近几个月）
    const monthLabels = document.getElementById('month-labels');
    monthLabels.innerHTML = '';
    // 简单的逻辑：每隔4周放一个月份
    for (let i = 0; i < weeks.length; i += 4) {
        const label = document.createElement('div');
         // 计算该周的大致月份
        const labelDate = new Date(startDate);
        labelDate.setDate(labelDate.getDate() + i * 7);
        label.textContent = labelDate.toLocaleDateString('zh-CN', { month: 'short' });
        label.style.width = '52px'; // 4 * (12+4) approx
        monthLabels.appendChild(label);
    }
}

function renderMilestones() {
    const grid = document.getElementById('milestones-grid');
    grid.innerHTML = '';
    
    const { streak } = calculateStats();
    
    CONFIG.milestones.forEach(days => {
        const isUnlocked = streak >= days;
        const reward = state.rewards[days];
        
        const card = document.createElement('div');
        card.className = `relative p-3 rounded-xl border transition-all duration-300 cursor-pointer ${
            isUnlocked 
                ? 'bg-emerald-900/30 border-emerald-500/50 hover:border-emerald-400' 
                : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'
        }`;
        
        card.innerHTML = `
            <div class="text-xs text-slate-400 mb-1">连续 ${days} 天</div>
            <div class="text-xl mb-1">${isUnlocked ? '🔓' : '🔒'}</div>
            <div class="text-xs truncate text-slate-300" title="${reward}">${reward}</div>
        `;
        
        card.addEventListener('click', () => {
            openCustomRewardModal(days);
        });
        
        grid.appendChild(card);
    });
}

// --- 每日杠杆任务 ---

function renderLeverageTasks() {
    const list = document.getElementById('leverage-list');
    list.innerHTML = '';
    
    state.leverageTasks.forEach(task => {
        const item = document.createElement('div');
        item.className = 'flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 group hover:border-emerald-500/30 transition-all';
        item.innerHTML = `
            <button class="w-5 h-5 rounded border border-slate-600 flex items-center justify-center transition-colors ${task.completed ? 'bg-emerald-500 border-emerald-500' : 'hover:border-emerald-500'}" onclick="toggleTask(${task.id})">
                ${task.completed ? '<span class="text-white text-xs">✓</span>' : ''}
            </button>
            <span class="flex-1 text-sm ${task.completed ? 'text-slate-500 line-through' : 'text-slate-200'}">${task.text}</span>
            <button class="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" onclick="deleteTask(${task.id})">×</button>
        `;
        list.appendChild(item);
    });
    
    if (state.leverageTasks.length === 0) {
        list.innerHTML = '<div class="text-center text-sm text-slate-600 py-4">还没有添加今日杠杆任务</div>';
    }
}

function addTask(text) {
    if (!text.trim()) return;
    state.leverageTasks.push({
        id: Date.now(),
        text,
        completed: false
    });
    saveState();
    renderLeverageTasks();
}

function toggleTask(id) {
    const task = state.leverageTasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        saveState();
        renderLeverageTasks();
    }
}

function deleteTask(id) {
    state.leverageTasks = state.leverageTasks.filter(t => t.id !== id);
    saveState();
    renderLeverageTasks();
}

// 暴露给全局以便 HTML onclick 调用
window.toggleTask = toggleTask;
window.deleteTask = deleteTask;

// --- 弹窗逻辑 ---

function checkMilestoneAchievement(justCheckedIn = false) {
    if (!justCheckedIn) return;
    
    const { streak } = calculateStats();
    if (CONFIG.milestones.includes(streak)) {
        // 刚刚达到里程碑
        showRewardModal(streak, state.rewards[streak]);
    }
}

function showRewardModal(days, reward) {
    const modal = document.getElementById('reward-modal');
    document.getElementById('reward-days').textContent = days;
    document.getElementById('reward-content').textContent = reward;
    
    modal.classList.add('modal-show');
    createConfetti();
    
    document.getElementById('close-reward-btn').onclick = () => {
        modal.classList.remove('modal-show');
    };
}

// 每日杠杆弹窗
document.getElementById('add-leverage-btn').addEventListener('click', () => {
    const modal = document.getElementById('leverage-modal');
    const input = document.getElementById('leverage-input');
    input.value = '';
    modal.classList.add('modal-show');
    input.focus();
    
    const close = () => modal.classList.remove('modal-show');
    
    document.getElementById('cancel-leverage-btn').onclick = close;
    document.getElementById('leverage-modal-bg').onclick = close;
    
    document.getElementById('confirm-leverage-btn').onclick = () => {
        addTask(input.value);
        close();
    };
    
    // Enter 键提交
    input.onkeyup = (e) => {
        if (e.key === 'Enter') {
            addTask(input.value);
            close();
        }
    };
});

// 自定义奖励弹窗
function openCustomRewardModal(days) {
    const modal = document.getElementById('custom-reward-modal');
    const input = document.getElementById('custom-reward-input');
    
    document.getElementById('custom-reward-days').textContent = days;
    input.value = state.rewards[days] || '';
    
    modal.classList.add('modal-show');
    input.focus();
    
    const close = () => modal.classList.remove('modal-show');
    
    document.getElementById('cancel-custom-reward-btn').onclick = close;
    document.getElementById('custom-reward-modal-bg').onclick = close;
    
    document.getElementById('confirm-custom-reward-btn').onclick = () => {
        if (input.value.trim()) {
            state.rewards[days] = input.value.trim();
            saveState();
            renderMilestones();
            close();
        }
    };
}

// --- 工具函数 ---

function animateValue(objId, start, end, duration) {
    if (start === end) return;
    const range = end - start;
    let current = start;
    const increment = end > start ? 1 : -1;
    const stepTime = Math.abs(Math.floor(duration / range));
    const obj = document.getElementById(objId);
    
    const timer = setInterval(function() {
        current += increment;
        obj.textContent = current;
        if (current == end) {
            clearInterval(timer);
        }
    }, stepTime);
}

function createConfetti() {
    // 简单的纯 JS 烟花效果，不依赖外部库
    const colors = ['#34d399', '#10b981', '#059669', '#60a5fa', '#f59e0b'];
    
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.style.position = 'fixed';
        confetti.style.left = '50%';
        confetti.style.top = '50%';
        confetti.style.width = '8px';
        confetti.style.height = '8px';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.borderRadius = '2px';
        confetti.style.pointerEvents = 'none';
        confetti.style.zIndex = '9999';
        
        // Random direction
        const angle = Math.random() * Math.PI * 2;
        const velocity = 5 + Math.random() * 10;
        const tx = Math.cos(angle) * velocity * 20;
        const ty = Math.sin(angle) * velocity * 20;
        const rotate = Math.random() * 360;
        
        confetti.animate([
            { transform: 'translate(-50%, -50%) rotate(0deg)', opacity: 1 },
            { transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) rotate(${rotate}deg)`, opacity: 0 }
        ], {
            duration: 1000 + Math.random() * 1000,
            easing: 'cubic-bezier(0, .9, .57, 1)',
            fill: 'forwards'
        });
        
        document.body.appendChild(confetti);
        setTimeout(() => confetti.remove(), 2000);
    }
}

// 启动应用
document.addEventListener('DOMContentLoaded', init);
