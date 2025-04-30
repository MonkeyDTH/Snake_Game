document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const scoreDisplay = document.getElementById('score');
    const highScoreDisplay = document.getElementById('highScore');
    const finalScoreDisplay = document.getElementById('finalScore');
    const gameOverScreen = document.getElementById('gameOver');
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const restartBtn = document.getElementById('restartBtn');
    const difficultySelect = document.getElementById('difficultySelect');
    
    // 排行榜相关元素
    const leaderboardScreen = document.getElementById('leaderboard');
    const leaderboardBtn = document.getElementById('leaderboardBtn');
    const closeLeaderboardBtn = document.getElementById('closeLeaderboardBtn');
    const saveScoreBtn = document.getElementById('saveScoreBtn');
    const playerNameInput = document.getElementById('playerName');
    const leaderboardBody = document.getElementById('leaderboardBody');

    // 游戏变量
    const gridSize = 20; // 每个格子的大小
    let snake = [{x: 160, y: 200}, {x: 140, y: 200}, {x: 120, y: 200}];
    let food = {};
    let specialFood = null;
    let direction = 'RIGHT';
    let nextDirection = 'RIGHT';
    let score = 0;
    let highScore = localStorage.getItem('snakeHighScore') || 0;
    let gameInterval;
    let gameSpeed = parseInt(difficultySelect.value);
    let isPaused = false;
    let isGameOver = false;
    let specialFoodTimer;
    
    // 排行榜数据
    let leaderboardData = [];
    
    // 服务器地址 - 根据实际部署情况修改
    const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:8080/api' 
        : '/api'; // 生产环境下使用相对路径
    
    // 初始化时从服务器获取排行榜数据
    fetchLeaderboard();

    highScoreDisplay.textContent = highScore;
    
    // 初始化排行榜
    updateLeaderboardDisplay();

    // 初始化游戏
    function init() {
        snake = [{x: 160, y: 200}, {x: 140, y: 200}, {x: 120, y: 200}];
        direction = 'RIGHT';
        nextDirection = 'RIGHT';
        score = 0;
        scoreDisplay.textContent = score;
        generateFood();
        isGameOver = false;
        gameOverScreen.style.display = 'none';
        
        // 清除之前的定时器
        if (gameInterval) clearInterval(gameInterval);
        if (specialFoodTimer) clearTimeout(specialFoodTimer);
        
        // 设置游戏速度
        gameSpeed = parseInt(difficultySelect.value);
        
        // 开始游戏循环
        gameInterval = setInterval(update, gameSpeed);
        
        // 随机生成特殊食物
        scheduleSpecialFood();
    }

    function scheduleSpecialFood() {
        // 清除之前的特殊食物
        specialFood = null;
        
        // 随机5-15秒后生成特殊食物
        const randomTime = Math.floor(Math.random() * 10000) + 5000;
        specialFoodTimer = setTimeout(() => {
            generateSpecialFood();
            
            // 特殊食物存在5秒
            setTimeout(() => {
                specialFood = null;
                scheduleSpecialFood();
            }, 5000);
        }, randomTime);
    }

    function generateSpecialFood() {
        // 防止生成在蛇身上或普通食物上
        do {
            specialFood = {
                x: Math.floor(Math.random() * (canvas.width / gridSize)) * gridSize,
                y: Math.floor(Math.random() * (canvas.height / gridSize)) * gridSize,
                points: Math.floor(Math.random() * 3) + 3 // 3-5分
            };
        } while (
            snake.some(segment => segment.x === specialFood.x && segment.y === specialFood.y) ||
            (food.x === specialFood.x && food.y === specialFood.y)
        );
    }

    function update() {
        if (isPaused || isGameOver) return;

        // 更新方向
        direction = nextDirection;
        
        // 移动蛇
        const head = {...snake[0]};
        
        switch(direction) {
            case 'UP': head.y -= gridSize; break;
            case 'DOWN': head.y += gridSize; break;
            case 'LEFT': head.x -= gridSize; break;
            case 'RIGHT': head.x += gridSize; break;
        }

        // 检测碰撞
        if (checkCollision(head)) {
            gameOver();
            return;
        }

        snake.unshift(head);

        // 吃到食物
        let ate = false;
        
        // 吃到普通食物
        if (head.x === food.x && head.y === food.y) {
            score += 10;
            ate = true;
            generateFood();
            playSound('eat');
        } 
        // 吃到特殊食物
        else if (specialFood && head.x === specialFood.x && head.y === specialFood.y) {
            score += specialFood.points * 10;
            ate = true;
            specialFood = null;
            scheduleSpecialFood();
        }
        
        if (ate) {
            // 更新分数
            scoreDisplay.textContent = score;
            
            // 更新最高分
            if (score > highScore) {
                highScore = score;
                highScoreDisplay.textContent = highScore;
                localStorage.setItem('snakeHighScore', highScore);
            }
            
            // 加速（可选，根据分数提高难度）
            if (score % 50 === 0 && gameSpeed > 70) {
                clearInterval(gameInterval);
                gameSpeed -= 10;
                gameInterval = setInterval(update, gameSpeed);
            }
        } else {
            snake.pop(); // 没吃到就移除尾巴
        }

        draw();
    }

    function draw() {
        // 清空画布
        ctx.fillStyle = '#34495e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 绘制网格（可选）
        ctx.strokeStyle = '#2c3e50';
        for (let i = 0; i < canvas.width; i += gridSize) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, canvas.height);
            ctx.stroke();
        }
        for (let j = 0; j < canvas.height; j += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, j);
            ctx.lineTo(canvas.width, j);
            ctx.stroke();
        }

        // 绘制蛇
        snake.forEach((segment, index) => {
            // 蛇头和蛇身使用不同颜色
            if (index === 0) {
                ctx.fillStyle = '#2ecc71'; // 蛇头颜色
            } else {
                // 渐变色蛇身
                const greenValue = Math.floor(46 + (index * 5) % 150);
                ctx.fillStyle = `rgb(46, ${greenValue}, 113)`;
            }
            
            // 圆角矩形
            roundRect(ctx, segment.x, segment.y, gridSize, gridSize, 5);
            
            // 蛇头添加眼睛
            if (index === 0) {
                ctx.fillStyle = '#000';
                
                // 根据方向绘制眼睛
                const eyeSize = 3;
                const eyeOffset = 5;
                
                if (direction === 'RIGHT') {
                    ctx.beginPath();
                    ctx.arc(segment.x + gridSize - eyeOffset, segment.y + eyeOffset, eyeSize, 0, Math.PI * 2);
                    ctx.arc(segment.x + gridSize - eyeOffset, segment.y + gridSize - eyeOffset, eyeSize, 0, Math.PI * 2);
                    ctx.fill();
                } else if (direction === 'LEFT') {
                    ctx.beginPath();
                    ctx.arc(segment.x + eyeOffset, segment.y + eyeOffset, eyeSize, 0, Math.PI * 2);
                    ctx.arc(segment.x + eyeOffset, segment.y + gridSize - eyeOffset, eyeSize, 0, Math.PI * 2);
                    ctx.fill();
                } else if (direction === 'UP') {
                    ctx.beginPath();
                    ctx.arc(segment.x + eyeOffset, segment.y + eyeOffset, eyeSize, 0, Math.PI * 2);
                    ctx.arc(segment.x + gridSize - eyeOffset, segment.y + eyeOffset, eyeSize, 0, Math.PI * 2);
                    ctx.fill();
                } else if (direction === 'DOWN') {
                    ctx.beginPath();
                    ctx.arc(segment.x + eyeOffset, segment.y + gridSize - eyeOffset, eyeSize, 0, Math.PI * 2);
                    ctx.arc(segment.x + gridSize - eyeOffset, segment.y + gridSize - eyeOffset, eyeSize, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        });

        // 绘制普通食物（苹果形状）
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.arc(food.x + gridSize/2, food.y + gridSize/2, gridSize/2, 0, Math.PI * 2);
        ctx.fill();
        
        // 绘制食物的小叶子
        ctx.fillStyle = '#27ae60';
        ctx.beginPath();
        ctx.ellipse(food.x + gridSize/2, food.y + 2, 3, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 绘制特殊食物（如果存在）
        if (specialFood) {
            // 闪烁效果
            const now = Date.now();
            if (Math.floor(now / 200) % 2 === 0) {
                ctx.fillStyle = '#f1c40f'; // 金色
            } else {
                ctx.fillStyle = '#f39c12'; // 橙色
            }
            
            // 星形特殊食物
            drawStar(ctx, specialFood.x + gridSize/2, specialFood.y + gridSize/2, 5, gridSize/2, gridSize/4);
            
            // 显示分值
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${specialFood.points}x`, specialFood.x + gridSize/2, specialFood.y + gridSize/2 + 3);
        }
        
        // 如果游戏暂停，显示暂停信息
        if (isPaused) {
            // 暂停时显示半透明覆盖层
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 30px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('已暂停', canvas.width/2, canvas.height/2);
        }
    }

    // 绘制圆角矩形
    function roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();
    }

    // 绘制星形
    function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
        let rot = Math.PI / 2 * 3;
        let x = cx;
        let y = cy;
        let step = Math.PI / spikes;

        ctx.beginPath();
        ctx.moveTo(cx, cy - outerRadius);
        
        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
        }
        
        ctx.lineTo(cx, cy - outerRadius);
        ctx.closePath();
        ctx.fill();
    }

    function changeDirection(event) {
        // 防止快速连续按键导致自杀
        const key = event.keyCode;
        
        // 阻止方向键滚动页面
        if ([37, 38, 39, 40].includes(key)) {
            event.preventDefault();
        }
        
        const newDirection = {
            37: 'LEFT',
            38: 'UP',
            39: 'RIGHT',
            40: 'DOWN',
            65: 'LEFT',  // A
            87: 'UP',    // W
            68: 'RIGHT', // D
            83: 'DOWN'   // S
        }[key];

        // 防止反向移动
        if (newDirection) {
            const opposites = {
                UP: 'DOWN',
                DOWN: 'UP',
                LEFT: 'RIGHT',
                RIGHT: 'LEFT'
            };
            
            if (newDirection !== opposites[direction]) {
                nextDirection = newDirection;
            }
        }
        
        // 空格键暂停/继续
        if (key === 32) {
            togglePause();
        }
    }

    function checkCollision(head) {
        // 撞墙
        if (head.x < 0 || head.x >= canvas.width || head.y < 0 || head.y >= canvas.height) {
            return true;
        }
        
        // 撞到自己（从第二个身体部分开始检查，避免误判）
        for (let i = 1; i < snake.length; i++) {
            if (head.x === snake[i].x && head.y === snake[i].y) {
                return true;
            }
        }
        
        return false;
    }

    function generateFood() {
        // 防止生成在蛇身上
        do {
            food = {
                x: Math.floor(Math.random() * (canvas.width / gridSize)) * gridSize,
                y: Math.floor(Math.random() * (canvas.height / gridSize)) * gridSize
            };
        } while (snake.some(segment => segment.x === food.x && segment.y === food.y));
    }

    function gameOver() {
        clearInterval(gameInterval);
        if (specialFoodTimer) clearTimeout(specialFoodTimer);
        
        isGameOver = true;
        finalScoreDisplay.textContent = score;
        gameOverScreen.style.display = 'block';
        
        // 自动填充上次使用的名字
        playerNameInput.value = localStorage.getItem('playerName') || '';
        
        // 播放游戏结束音效
        playSound('gameOver');
    }

    function resetGame() {
        init();
    }

    function togglePause() {
        isPaused = !isPaused;
        pauseBtn.textContent = isPaused ? '继续' : '暂停';
        
        draw(); // 立即重绘以显示暂停状态
    }

    // 简单的音效系统
    function playSound(type) {
        // 如果浏览器支持 AudioContext
        if (window.AudioContext || window.webkitAudioContext) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const audioCtx = new AudioContext();
            
            let oscillator = audioCtx.createOscillator();
            let gainNode = audioCtx.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            if (type === 'eat') {
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
                gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
                oscillator.start();
                oscillator.stop(audioCtx.currentTime + 0.1);
            } else if (type === 'gameOver') {
                oscillator.type = 'sawtooth';
                oscillator.frequency.setValueAtTime(110, audioCtx.currentTime);
                gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
                oscillator.start();
                oscillator.frequency.exponentialRampToValueAtTime(55, audioCtx.currentTime + 1);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1);
                oscillator.stop(audioCtx.currentTime + 1);
            }
        }
    }
    
    // 从服务器获取排行榜数据
    function fetchLeaderboard() {
        fetch(`${API_URL}/leaderboard`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('网络响应不正常');
                }
                return response.json();
            })
            .then(data => {
                leaderboardData = data;
                updateLeaderboardDisplay();
            })
            .catch(error => {
                console.error('获取排行榜失败:', error);
                // 如果服务器获取失败，回退到本地存储
                leaderboardData = JSON.parse(localStorage.getItem('snakeLeaderboard')) || [];
                updateLeaderboardDisplay();
            });
    }
    
    // 保存分数到排行榜
    function saveScore() {
        const playerName = playerNameInput.value.trim() || "匿名玩家";
        
        // 保存玩家名字以便下次使用
        localStorage.setItem('playerName', playerName);
        
        // 创建新的排行榜条目
        const newEntry = {
            name: playerName,
            score: score,
            date: new Date().toLocaleDateString(),
            difficulty: difficultySelect.options[difficultySelect.selectedIndex].text
        };
        
        // 发送到服务器
        fetch(`${API_URL}/leaderboard`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(newEntry)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('网络响应不正常');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                leaderboardData = data.leaderboard;
                updateLeaderboardDisplay();
                
                // 隐藏游戏结束界面，显示排行榜
                gameOverScreen.style.display = 'none';
                leaderboardScreen.style.display = 'block';
            }
        })
        .catch(error => {
            console.error('保存分数失败:', error);
            
            // 如果服务器保存失败，回退到本地存储
            // 添加到排行榜数据
            leaderboardData.push(newEntry);
            
            // 按分数排序（从高到低）
            leaderboardData.sort((a, b) => b.score - a.score);
            
            // 只保留前10名
            if (leaderboardData.length > 10) {
                leaderboardData = leaderboardData.slice(0, 10);
            }
            
            // 保存到本地存储
            localStorage.setItem('snakeLeaderboard', JSON.stringify(leaderboardData));
            
            // 更新排行榜显示
            updateLeaderboardDisplay();
            
            // 隐藏游戏结束界面，显示排行榜
            gameOverScreen.style.display = 'none';
            leaderboardScreen.style.display = 'block';
        });
    }
    
    // 更新排行榜显示
    function updateLeaderboardDisplay() {
        // 清空现有内容
        leaderboardBody.innerHTML = '';
        
        // 添加每一行数据
        leaderboardData.forEach((entry, index) => {
            const row = document.createElement('tr');
            
            // 排名列
            const rankCell = document.createElement('td');
            rankCell.textContent = index + 1;
            row.appendChild(rankCell);
            
            // 玩家名列
            const nameCell = document.createElement('td');
            nameCell.textContent = entry.name;
            row.appendChild(nameCell);
            
            // 分数列
            const scoreCell = document.createElement('td');
            scoreCell.textContent = entry.score;
            row.appendChild(scoreCell);
            
            // 日期列
            const dateCell = document.createElement('td');
            dateCell.textContent = entry.date;
            row.appendChild(dateCell);
            
            // 将行添加到表格
            leaderboardBody.appendChild(row);
        });
        
        // 如果没有数据，显示提示信息
        if (leaderboardData.length === 0) {
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = 4;
            cell.textContent = '暂无记录';
            cell.style.textAlign = 'center';
            row.appendChild(cell);
            leaderboardBody.appendChild(row);
        }
    }
    
    // 显示排行榜
    function showLeaderboard() {
        fetchLeaderboard(); // 每次显示排行榜时从服务器获取最新数据
        leaderboardScreen.style.display = 'block';
    }
    
    // 隐藏排行榜
    function hideLeaderboard() {
        leaderboardScreen.style.display = 'none';
    }

    // 事件监听
    document.addEventListener('keydown', changeDirection);
    startBtn.addEventListener('click', resetGame);
    pauseBtn.addEventListener('click', togglePause);
    restartBtn.addEventListener('click', resetGame);
    
    // 排行榜相关事件监听
    leaderboardBtn.addEventListener('click', showLeaderboard);
    closeLeaderboardBtn.addEventListener('click', hideLeaderboard);
    saveScoreBtn.addEventListener('click', saveScore);
    
    // 移动端控制
    const upBtn = document.querySelector('.mobile-btn-up');
    const leftBtn = document.querySelector('.mobile-btn-left');
    const rightBtn = document.querySelector('.mobile-btn-right');
    const downBtn = document.querySelector('.mobile-btn-down');
    
    upBtn.addEventListener('click', () => {
        if (direction !== 'DOWN') {
            nextDirection = 'UP';
        }
    });
    
    leftBtn.addEventListener('click', () => {
        if (direction !== 'RIGHT') {
            nextDirection = 'LEFT';
        }
    });
    
    rightBtn.addEventListener('click', () => {
        if (direction !== 'LEFT') {
            nextDirection = 'RIGHT';
        }
    });
    
    downBtn.addEventListener('click', () => {
        if (direction !== 'UP') {
            nextDirection = 'DOWN';
        }
    });
    
    // 阻止移动端滑动时的页面滚动
    document.addEventListener('touchmove', function(e) {
        e.preventDefault();
    }, { passive: false });
    
    // 难度选择
    difficultySelect.addEventListener('change', function() {
        if (!isGameOver && !isPaused) {
            clearInterval(gameInterval);
            gameSpeed = parseInt(this.value);
            gameInterval = setInterval(update, gameSpeed);
        }
    });

    // 初始绘制
    draw();
});

// 全屏功能
const fullscreenBtn = document.getElementById('fullscreenBtn');
fullscreenBtn.addEventListener('click', toggleFullScreen);

function toggleFullScreen() {
    const gameContainer = document.querySelector('.game-container');
    
    if (!document.fullscreenElement) {
        if (gameContainer.requestFullscreen) {
            gameContainer.requestFullscreen();
        } else if (gameContainer.mozRequestFullScreen) { // Firefox
            gameContainer.mozRequestFullScreen();
        } else if (gameContainer.webkitRequestFullscreen) { // Chrome, Safari, Opera
            gameContainer.webkitRequestFullscreen();
        } else if (gameContainer.msRequestFullscreen) { // IE/Edge
            gameContainer.msRequestFullscreen();
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }
}

// 添加触摸滑动控制
let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener('touchstart', function(e) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    e.preventDefault();
}, false);

canvas.addEventListener('touchmove', function(e) {
    e.preventDefault();
}, false);

canvas.addEventListener('touchend', function(e) {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;
    
    // 判断滑动方向
    if (Math.abs(dx) > Math.abs(dy)) {
        // 水平滑动
        if (dx > 0 && direction !== 'LEFT') {
            nextDirection = 'RIGHT';
        } else if (dx < 0 && direction !== 'RIGHT') {
            nextDirection = 'LEFT';
        }
    } else {
        // 垂直滑动
        if (dy > 0 && direction !== 'UP') {
            nextDirection = 'DOWN';
        } else if (dy < 0 && direction !== 'DOWN') {
            nextDirection = 'UP';
        }
    }
    
    e.preventDefault();
}, false);

// 调整画布大小和游戏网格
function resizeGame() {
    const canvas = document.getElementById('gameCanvas');
    const computedStyle = window.getComputedStyle(canvas);
    const width = parseInt(computedStyle.width);
    const height = parseInt(computedStyle.height);
    
    // 设置画布的实际尺寸与CSS尺寸一致
    canvas.width = width;
    canvas.height = height;
    
    // 重新绘制游戏
    if (!isGameOver && !isPaused) {
        draw();
    }
}

// 监听窗口大小变化
window.addEventListener('resize', resizeGame);

// 初始化时调整大小
document.addEventListener('DOMContentLoaded', function() {
    // ... existing code ...
    
    // 调整游戏大小
    resizeGame();
    
    init();
});

// ... existing code ...
