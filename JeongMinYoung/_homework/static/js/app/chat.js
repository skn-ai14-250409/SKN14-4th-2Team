class ChatBot {
    constructor() {
        this.chatMessages = document.querySelector('#chat-messages');
        this.chatInput = document.querySelector('#chat-input');
        this.sendButton = document.querySelector('#send-btn');
        this.levelButtons = document.querySelectorAll('input[name="btnradio"]');
        this.newChatBtn = document.querySelector('#new-chat-btn');
        this.sessionsContainer = document.querySelector('#chat-sessions-container');
        
        this.currentLevel = 'basic';
        this.isLoading = false;
        this.sessionId = '';
        this.chatHistory = [];
        this.currentSessionId = null;
        this.sessions = [];
        
        // CSRF 토큰 가져오기
        this.csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ||
                        document.querySelector('[name=csrfmiddlewaretoken]')?.value;
        
        this.init();
    }
    
    init() {
        // 이벤트 리스너 등록
        if (this.sendButton) {
            this.sendButton.addEventListener('click', () => this.sendMessage());
        }
        
        if (this.chatInput) {
            this.chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendMessage();
                }
            });
        }
        
        // 새 채팅 버튼 이벤트
        if (this.newChatBtn) {
            this.newChatBtn.addEventListener('click', () => this.startNewChat());
        }
        
        // 레벨 선택 이벤트
        this.levelButtons.forEach(button => {
            button.addEventListener('change', (e) => {
                if (e.target.checked) {
                    console.log('레벨 버튼 변경:', e.target.id);
                    const levelNumber = e.target.id.replace('btnradio', '');
                    this.setLevel(levelNumber);
                }
            });
        });
        
        // 초기 레벨 설정 (기본값: 초급)
        this.setLevel('1');
        
        // 로그인 상태 확인 후 세션 관련 기능 초기화
        if (this.isUserLoggedIn()) {
            this.loadSessions();
        } else {
            this.showLoginMessage();
        }
    }
    
    isUserLoggedIn() {
        // 서버에서 렌더링된 사용자 정보 확인
        const userInfo = window.userInfo;
        return userInfo && userInfo.id;
    }
    
    showLoginMessage() {
        if (this.chatMessages) {
            this.chatMessages.innerHTML = `
                <div class="chat-start__container">
                    <div class="chat-start__inside">
                        <div class="brand-name">JemBot</div>
                        <div class="chat-start__time">로그인이 필요합니다</div>
                    </div>
                </div>
                <div class="chat-bot">
                    <div class="chat-bot__content">
                        안녕하세요! 챗봇을 사용하려면 먼저 로그인해주세요.
                        <br><br>
                        <a href="/jembot/login/" class="login-link">구글 로그인하기</a>
                    </div>
                    <div class="chat-bot__time">${this.getCurrentTime()}</div>
                </div>
            `;
        }
    }
    
    async loadSessions() {
        try {
            console.log('DEBUG: loadSessions 호출됨, URL: /jembot/api/sessions/');
            const response = await fetch('/jembot/api/sessions/');
            
            if (!response.ok) {
                if (response.status === 302 || response.status === 401) {
                    // 로그인이 필요한 상태
                    this.showLoginMessage();
                    return;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('세션 데이터 로드:', data);
            
            if (data.sessions) {
                console.log('📂 서버에서 로드된 세션들:', data.sessions);
                this.sessions = data.sessions;
                console.log('📂 this.sessions 업데이트됨:', this.sessions);
                this.sessions.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
                this.renderSessions();
                
                if (this.sessions.length > 0 && !this.currentSessionId) {
                    this.loadSession(this.sessions[0].session_id);
                } else if (this.sessions.length === 0) {
                    this.initializeChatWindow();
                }
            } else {
                this.sessions = [];
                this.initializeChatWindow();
            }
        } catch (error) {
            console.error('세션 로드 오류:', error);
            this.sessions = [];
            this.initializeChatWindow();
        }
    }
    
    renderSessions() {
        console.log('🎨 renderSessions 호출됨, 세션 개수:', this.sessions.length);
        console.log('🎨 세션 목록:', this.sessions);
        
        if (!this.sessionsContainer) {
            console.error('❌ sessionsContainer를 찾을 수 없습니다!');
            return;
        }
        
        this.sessionsContainer.innerHTML = '';
        
        if (this.sessions.length === 0) {
            console.log('📭 세션이 없어서 빈 메시지 표시');
            this.sessionsContainer.innerHTML = '<div class="chat-list__empty">저장된 대화가 없습니다.</div>';
            return;
        }
        
        console.log('📝 세션 요소들 생성 시작');
        this.sessions.forEach((session, index) => {
            console.log(`📝 세션 ${index + 1} 생성:`, session);
            const sessionElement = this.createSessionElement(session);
            this.sessionsContainer.appendChild(sessionElement);
        });
        console.log('✅ 세션 목록 렌더링 완료');
    }
    
    createSessionElement(session) {
        const sessionDiv = document.createElement('div');
        sessionDiv.className = 'chat-session-item';
        sessionDiv.dataset.sessionId = session.session_id;
        
        if (session.session_id === this.currentSessionId) {
            sessionDiv.classList.add('active');
        }
        
        const title = session.title || '새로운 대화';
        const time = new Date(session.updated_at).toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        sessionDiv.innerHTML = `
            <div class="session-title">${title}</div>
            <div class="session-time">${time}</div>
            <div class="session-delete" onclick="chatBot.deleteSession('${session.session_id}')">
                <i class="bi bi-trash"></i>
            </div>
        `;
        
        sessionDiv.addEventListener('click', (e) => {
            if (!e.target.closest('.session-delete')) {
                this.loadSession(session.session_id);
            }
        });
        
        return sessionDiv;
    }
    
    async loadSession(sessionId) {
        try {
            const response = await fetch(`/jembot/api/sessions/${sessionId}/history/`);
            const data = await response.json();
            
            if (data.success) {
                this.currentSessionId = sessionId;
                this.sessionId = sessionId;
                this.chatHistory = data.history || [];
                
                this.updateActiveSession(sessionId);
                this.renderChatHistory();
            }
        } catch (error) {
            console.error('세션 로드 오류:', error);
        }
    }
    
    updateActiveSession(sessionId) {
        document.querySelectorAll('.chat-session-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const currentSession = document.querySelector(`[data-session-id="${sessionId}"]`);
        if (currentSession) {
            currentSession.classList.add('active');
        }
    }
    
    renderChatHistory() {
        if (!this.chatMessages) return;
        
        this.chatMessages.innerHTML = '';
        
        const currentTime = this.getCurrentTime();
        const startMessageHTML = `
            <div class="chat-start__container">
                <div class="chat-start__inside">
                    <div class="brand-name">JemBot</div>
                    <div class="chat-start__time">Today ${currentTime}</div>
                </div>
            </div>
        `;
        this.chatMessages.insertAdjacentHTML('beforeend', startMessageHTML);
        
        this.chatHistory.forEach(msg => {
            if (msg.type === 'user') {
                this.addUserMessage(msg.content, msg.timestamp, false);
            } else if (msg.type === 'bot') {
                this.addBotMessage(msg.content, msg.timestamp, msg.level || 'basic', false);
            }
        });
        
        this.scrollToBottom();
    }
    
    initializeChatWindow() {
        if (!this.chatMessages) return;
        
        this.chatMessages.innerHTML = '';
        const currentTime = this.getCurrentTime();
        const startMessageHTML = `
            <div class="chat-start__container">
                <div class="chat-start__inside">
                    <div class="brand-name">JemBot</div>
                    <div class="chat-start__time">Today ${currentTime}</div>
                </div>
            </div>
            <div class="chat-bot">
                <div class="chat-bot__content">안녕하세요! 무엇을 도와드릴까요?</div>
                <div class="chat-bot__time">${currentTime}</div>
            </div>
        `;
        this.chatMessages.insertAdjacentHTML('beforeend', startMessageHTML);
        this.scrollToBottom();
    }
    
    setLevel(levelNumber) {
        const levelMap = {
            '1': 'basic',
            '2': 'intermediate', 
            '3': 'advanced'
        };
        
        this.currentLevel = levelMap[levelNumber] || 'basic';
        console.log('레벨 설정:', levelNumber, '→', this.currentLevel);
        
        const buttonId = `btnradio${levelNumber}`;
        const button = document.getElementById(buttonId);
        if (button) {
            button.checked = true;
        }
    }
    
    async sendMessage() {
        if (!this.isUserLoggedIn()) {
            alert('로그인이 필요한 서비스입니다.');
            window.location.href = '/jembot/login/';
            return;
        }
        
        const message = this.chatInput.value.trim();
        if (!message || this.isLoading) return;
        
        this.addUserMessage(message);
        this.chatInput.value = '';
        this.scrollToBottom();
        
        this.isLoading = true;
        this.addLoadingMessage();
        this.scrollToBottom();
        
        try {
            const response = await fetch('/jembot/api/chat/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.csrfToken,
                },
                body: JSON.stringify({
                    message: message,
                    level: this.currentLevel,
                    session_id: this.sessionId,
                    chat_history: this.chatHistory
                })
            });
            
            const data = await response.json();
            
            this.removeLoadingMessage();
            
            if (data.success) {
                console.log('💬 메시지 전송 성공, 응답 데이터:', data);
                
                if (data.session_id) {
                    console.log('🆔 세션 ID 업데이트:', this.sessionId, '→', data.session_id);
                    this.sessionId = data.session_id;
                    this.currentSessionId = data.session_id;
                }
                
                this.addBotMessage(data.bot_message, data.timestamp, data.level);
                
                this.chatHistory.push({
                    type: 'user',
                    content: message,
                    timestamp: this.getCurrentTime()
                });
                this.chatHistory.push({
                    type: 'bot',
                    content: data.bot_message,
                    timestamp: data.timestamp,
                    level: data.level
                });
                
                // 새 세션이 생성된 경우 세션 목록 새로고침
                if (data.is_first_message) {
                    this.loadSessions();
                }
            } else {
                this.addBotMessage('죄송합니다. 오류가 발생했습니다: ' + (data.error || '알 수 없는 오류'), this.getCurrentTime());
            }
            
        } catch (error) {
            console.error('Chat API Error:', error);
            this.removeLoadingMessage();
            this.addBotMessage('죄송합니다. 서버와의 연결에 문제가 발생했습니다.', this.getCurrentTime());
        }
        
        this.isLoading = false;
        this.scrollToBottom();
    }
    
    addUserMessage(message, time = null, saveToHistory = true) {
        if (!this.chatMessages) return;
        
        const currentTime = time || this.getCurrentTime();
        const userMessageHTML = `
            <div class="chat-user">
                <div class="chat-user__time">${currentTime}</div>
                <div class="chat-user__content">${this.escapeHtml(message)}</div>
            </div>
        `;
        this.chatMessages.insertAdjacentHTML('beforeend', userMessageHTML);
        
        if (saveToHistory) {
            this.chatHistory.push({
                type: 'user',
                content: message,
                timestamp: currentTime
            });
        }
    }
    
    addBotMessage(message, timestamp, level = 'basic', saveToHistory = true) {
        if (!this.chatMessages) return;
        
        const levelMap = {
            'basic': '초급',
            'intermediate': '중급',
            'advanced': '고급'
        };
        
        const levelText = levelMap[level] || '초급';
        const levelClass = level === 'intermediate' ? 'intermediate_answer__mark' : 
                          level === 'advanced' ? 'advanced_answer__mark' : 'beginner_answer__mark';
        
        const botMessageHTML = `
            <div class="chat-bot" id="${level}_answer">
                <div class="${levelClass}">${levelText}</div>
                <div class="chat-bot__content">${this.formatMessage(message)}</div>
                <div class="chat-bot__time">${timestamp}</div>
            </div>
        `;
        this.chatMessages.insertAdjacentHTML('beforeend', botMessageHTML);
        
        if (saveToHistory) {
            this.chatHistory.push({
                type: 'bot',
                content: message,
                timestamp: timestamp,
                level: level
            });
        }
    }
    
    addLoadingMessage() {
        if (!this.chatMessages) return;
        
        const loadingHTML = `
            <div class="chat-bot loading-message" id="loading-message">
                <div class="chat-bot__content">
                    <div class="loading-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
                <div class="chat-bot__time">${this.getCurrentTime()}</div>
            </div>
        `;
        this.chatMessages.insertAdjacentHTML('beforeend', loadingHTML);
    }
    
    removeLoadingMessage() {
        const loadingMessage = document.getElementById('loading-message');
        if (loadingMessage) {
            loadingMessage.remove();
        }
    }
    
    formatMessage(message) {
        return this.escapeHtml(message).replace(/\n/g, '<br>');
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    getCurrentTime() {
        const now = new Date();
        return now.getHours().toString().padStart(2, '0') + ':' + 
               now.getMinutes().toString().padStart(2, '0');
    }
    
    scrollToBottom() {
        if (this.chatMessages) {
            setTimeout(() => {
                this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
            }, 100);
        }
    }
    
    async deleteSession(sessionId) {
        if (!confirm('이 대화를 삭제하시겠습니까?')) return;
        
        try {
            const response = await fetch(`/jembot/api/sessions/${sessionId}/delete/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': this.csrfToken,
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.sessions = this.sessions.filter(s => s.session_id !== sessionId);
                this.renderSessions();
                
                if (sessionId === this.currentSessionId) {
                    this.currentSessionId = null;
                    this.sessionId = '';
                    this.chatHistory = [];
                    
                    if (this.sessions.length > 0) {
                        this.loadSession(this.sessions[0].session_id);
                    } else {
                        this.initializeChatWindow();
                    }
                }
            } else {
                alert('대화를 삭제할 수 없습니다.');
            }
        } catch (error) {
            console.error('세션 삭제 오류:', error);
            alert('서버 연결에 문제가 있습니다.');
        }
    }
    
    formatMessage(message) {
        if (!message) return '';
        
        try {
            // marked 라이브러리가 로드되어 있으면 마크다운 렌더링
            if (typeof marked !== 'undefined') {
                // marked 설정
                marked.setOptions({
                    breaks: true,        // 줄바꿈 처리
                    gfm: true,          // GitHub Flavored Markdown
                    sanitize: false,    // HTML 허용
                    highlight: function(code, lang) {
                        // 코드 하이라이팅 (기본)
                        return `<code class="language-${lang || 'text'}">${this.escapeHtml(code)}</code>`;
                    }.bind(this)
                });
                
                // 마크다운을 HTML로 변환
                let html = marked.parse(message);
                
                // 추가 스타일링 클래스 적용
                html = this.enhanceMarkdownStyling(html);
                
                return html;
            } else {
                // marked가 없으면 기본 텍스트 처리
                return this.basicMarkdownFormat(message);
            }
        } catch (error) {
            console.error('마크다운 렌더링 오류:', error);
            return this.escapeHtml(message);
        }
    }
    
    enhanceMarkdownStyling(html) {
        // 테이블에 부트스트랩 클래스 추가
        html = html.replace(/<table>/g, '<table class="table table-striped table-sm markdown-table">');
        
        // 코드 블록에 스타일 클래스 추가
        html = html.replace(/<pre><code/g, '<pre class="markdown-code-block"><code');
        
        // 인라인 코드에 스타일 클래스 추가
        html = html.replace(/<code>/g, '<code class="markdown-inline-code">');
        
        // 인용구에 스타일 클래스 추가
        html = html.replace(/<blockquote>/g, '<blockquote class="markdown-blockquote">');
        
        return html;
    }
    
    basicMarkdownFormat(message) {
        // 간단한 마크다운 처리 (fallback)
        return message
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  // **bold**
            .replace(/\*(.*?)\*/g, '<em>$1</em>')              // *italic*
            .replace(/`(.*?)`/g, '<code class="markdown-inline-code">$1</code>')  // `code`
            .replace(/\n/g, '<br>')                            // 줄바꿈
            .replace(/### (.*?)(?=\n|$)/g, '<h3>$1</h3>')      // ### 헤더
            .replace(/## (.*?)(?=\n|$)/g, '<h2>$1</h2>')       // ## 헤더
            .replace(/# (.*?)(?=\n|$)/g, '<h1>$1</h1>');       // # 헤더
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    async startNewChat() {
        if (!this.isUserLoggedIn()) {
            alert('로그인이 필요한 서비스입니다.');
            window.location.href = '/jembot/login/';
            return;
        }
        
        try {
            const response = await fetch('/jembot/api/sessions/create/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.csrfToken,
                },
                body: JSON.stringify({
                    title: '새로운 대화'
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('새 세션 생성 응답:', data);
            
            if (data.success) {
                console.log('🎯 새 세션 생성 성공:', data.session);
                
                this.currentSessionId = data.session.session_id;
                this.sessionId = data.session.session_id;
                this.chatHistory = [];
                
                // 세션을 로컬 목록에 추가
                const newSession = {
                    id: data.session.id,
                    session_id: data.session.session_id,
                    title: data.session.title,
                    created_at: data.session.created_at,
                    updated_at: data.session.created_at
                };
                console.log('📝 로컬 세션 목록에 추가:', newSession);
                console.log('📊 추가 전 세션 개수:', this.sessions.length);
                
                this.sessions.push(newSession);
                console.log('📊 추가 후 세션 개수:', this.sessions.length);
                
                // updated_at 순으로 재정렬 (최신순)
                this.sessions.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
                
                // 화면 즉시 업데이트
                console.log('🔄 세션 목록 화면 업데이트 시작');
                this.renderSessions();
                this.updateActiveSession(this.currentSessionId);
                
                // 채팅창 초기화
                this.initializeChatWindow();
                
            } else {
                console.error('세션 생성 실패:', data.error);
                alert('새 대화를 시작할 수 없습니다.');
            }
        } catch (error) {
            console.error('새 세션 생성 오류:', error);
            alert('서버 연결에 문제가 있습니다.');
        }
    }
}

// 전역 변수로 chatBot 인스턴스 생성
let chatBot;

// 페이지 로드 시 채팅봇 초기화
document.addEventListener('DOMContentLoaded', () => {
    chatBot = new ChatBot();
}); 