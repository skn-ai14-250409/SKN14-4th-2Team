// _homework/static/js/app/main_chat.js
console.log('💬 채팅 기능 JavaScript 로드 완료!');
console.log('🔥 현재 시각:', new Date());

// 전역 변수
let currentSessionId = null;
let currentLevel = 'basic';

// DOM 로드 완료 후 실행
document.addEventListener('DOMContentLoaded', function() {
    console.log('채팅 페이지 JavaScript 시작!');
    console.log('DOM 요소 확인:');
    console.log('- 새 채팅 버튼:', document.getElementById('new-chat-btn'));
    console.log('- 전송 버튼:', document.querySelector('.chat-search-button button'));
    console.log('- 입력창:', document.querySelector('.chat-input input'));
    console.log('- 세션 목록:', document.getElementById('chat-sessions-list'));
    
    // 초기 환영 메시지 표시
    initializeChatMessages();
    
    initializeEventListeners();
    loadChatSessions();
});

// 초기 채팅 메시지 설정
function initializeChatMessages() {
    clearChatMessages();
    addBotMessage('안녕하세요! 무엇을 도와드릴까요?', null);
}

// 이벤트 리스너 초기화
function initializeEventListeners() {
    console.log('이벤트 리스너 초기화 시작...');
    
    // 새 채팅 버튼
    const newChatBtn = document.getElementById('new-chat-btn');
    if (newChatBtn) {
        console.log('새 채팅 버튼 이벤트 리스너 등록');
        newChatBtn.addEventListener('click', function() {
            console.log('새 채팅 버튼 클릭됨!');
            createNewChatSession();
        });
    } else {
        console.error('새 채팅 버튼을 찾을 수 없습니다!');
    }
    
    // 메시지 전송 버튼
    const sendBtn = document.querySelector('.chat-search-button button');
    if (sendBtn) {
        console.log('전송 버튼 이벤트 리스너 등록');
        sendBtn.addEventListener('click', function() {
            console.log('전송 버튼 클릭됨!');
            sendMessage();
        });
    } else {
        console.error('전송 버튼을 찾을 수 없습니다!');
    }
    
    // 입력창 엔터키
    const input = document.querySelector('.chat-input input');
    if (input) {
        console.log('입력창 엔터키 이벤트 리스너 등록');
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                console.log('엔터키 눌림!');
                sendMessage();
            }
        });
    } else {
        console.error('입력창을 찾을 수 없습니다!');
    }
    
    // 레벨 선택 라디오 버튼
    const radioButtons = document.querySelectorAll('input[name="btnradio"]');
    console.log('라디오 버튼 개수:', radioButtons.length);
    radioButtons.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.checked) {
                currentLevel = this.id === 'btnradio1' ? 'basic' : 
                              this.id === 'btnradio2' ? 'intermediate' : 'advanced';
                console.log('난이도 변경:', currentLevel);
            }
        });
    });
    
    // 세션 삭제 버튼 이벤트 (동적 요소용)
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('session-delete')) {
            console.log('세션 삭제 버튼 클릭됨!');
            e.preventDefault();
            const sessionId = e.target.dataset.sessionId;
            if (sessionId) {
                deleteSession(sessionId);
            }
        }
        
        // 세션 클릭 이벤트 (드롭다운 버튼 제외)
        if (e.target.closest('.chat-list__box') && !e.target.closest('.dropdown')) {
            const sessionBox = e.target.closest('.chat-list__box');
            const sessionId = sessionBox.dataset.sessionId;
            if (sessionId) {
                console.log('세션 클릭됨:', sessionId);
                loadChatHistory(sessionId);
            }
        }
    });
    
    console.log('이벤트 리스너 초기화 완료!');
}

// 새 채팅 세션 생성
async function createNewChatSession() {
    console.log('새 채팅 세션 생성 시도...');
    try {
        const csrfToken = getCSRFToken();
        console.log('CSRF Token:', csrfToken);
        
        const response = await fetch('/jembot/api/sessions/create/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            },
            body: JSON.stringify({
                title: '새로운 대화'
            })
        });
        
        console.log('응답 상태:', response.status);
        const data = await response.json();
        console.log('응답 데이터:', data);
        
        if (data.success) {
            currentSessionId = data.session.session_id;
            
            // 모든 세션에서 active 클래스 제거
            document.querySelectorAll('.chat-list__box').forEach(box => {
                box.classList.remove('active');
            });
            
            initializeChatMessages(); // 채팅 메시지 초기화
            loadChatSessions(); // 세션 목록 새로고침
            console.log('새 채팅 세션이 생성되었습니다:', currentSessionId);
            
            // 잠깐 후에 새로운 세션을 active로 표시
            setTimeout(() => {
                const newSessionBox = document.querySelector(`[data-session-id="${currentSessionId}"]`);
                if (newSessionBox) {
                    newSessionBox.classList.add('active');
                }
            }, 100);
        } else {
            console.error('세션 생성 실패:', data.error);
            alert('세션 생성 실패: ' + (data.error || '알 수 없는 오류'));
        }
    } catch (error) {
        console.error('Error creating new session:', error);
        alert('세션 생성 중 오류가 발생했습니다: ' + error.message);
    }
}

// 메시지 전송
async function sendMessage() {
    const input = document.querySelector('.chat-input input');
    const message = input.value.trim();
    
    if (!message) {
        console.log('메시지가 비어있습니다.');
        return;
    }
    
    console.log('메시지 전송:', message, '현재 세션:', currentSessionId, '레벨:', currentLevel);
    
    // 사용자 메시지 표시
    addUserMessage(message);
    input.value = '';
    
    // 로딩 메시지 표시
    const loadingId = showLoadingMessage();
    
    try {
        const csrfToken = getCSRFToken();
        console.log('메시지 전송 CSRF Token:', csrfToken);
        
        const response = await fetch('/jembot/api/chat/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            },
            body: JSON.stringify({
                message: message,
                level: currentLevel,
                session_id: currentSessionId
            })
        });
        
        console.log('메시지 전송 응답 상태:', response.status);
        const data = await response.json();
        console.log('메시지 전송 응답 데이터:', data);
        
        // 로딩 메시지 제거
        hideLoadingMessage(loadingId);
        
        if (data.success) {
            // 서버에서 받은 레벨을 사용하거나, 없으면 현재 선택된 레벨 사용
            const responseLevel = data.level || currentLevel;
            console.log('응답 레벨:', responseLevel);
            
            addBotMessage(data.bot_message, responseLevel);
            
            // 새 세션인 경우 세션 ID 저장
            if (data.session_id) {
                currentSessionId = data.session_id;
                console.log('새 세션 ID 저장:', currentSessionId);
            }
            
            // 제목이 업데이트된 경우 세션 목록 새로고침
            if (data.updated_title) {
                console.log('세션 제목 업데이트:', data.updated_title);
                loadChatSessions();
            }
        } else {
            console.error('메시지 전송 실패:', data.error);
            addBotMessage('죄송합니다. 오류가 발생했습니다: ' + (data.error || '알 수 없는 오류'));
        }
    } catch (error) {
        console.error('Error sending message:', error);
        // 로딩 메시지 제거
        hideLoadingMessage(loadingId);
        addBotMessage('서버 연결 오류가 발생했습니다: ' + error.message);
    }
}

// 세션 삭제
async function deleteSession(sessionId) {
    if (!confirm('이 대화를 삭제하시겠습니까?')) return;
    
    console.log('세션 삭제 시도:', sessionId);
    
    try {
        const response = await fetch(`/jembot/api/sessions/${sessionId}/delete/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCSRFToken()
            }
        });
        
        console.log('세션 삭제 응답 상태:', response.status);
        const data = await response.json();
        console.log('세션 삭제 응답 데이터:', data);
        
        if (data.success) {
            loadChatSessions(); // 세션 목록 새로고침
            
            // 삭제된 세션이 현재 세션이면 초기화
            if (sessionId === currentSessionId) {
                currentSessionId = null;
                initializeChatMessages();
            }
            alert('세션이 삭제되었습니다.');
        } else {
            alert('세션 삭제에 실패했습니다: ' + (data.error || '알 수 없는 오류'));
        }
    } catch (error) {
        console.error('Error deleting session:', error);
        alert('세션 삭제 중 오류가 발생했습니다: ' + error.message);
    }
}

// 채팅 세션 목록 로드
async function loadChatSessions() {
    console.log('채팅 세션 목록 로드 시도...');
    try {
        const response = await fetch('/jembot/api/sessions/');
        console.log('세션 목록 응답 상태:', response.status);
        const data = await response.json();
        console.log('세션 목록 응답 데이터:', data);
        
        const sessionsList = document.getElementById('chat-sessions-list');
        if (!sessionsList) {
            console.error('chat-sessions-list 엘리먼트를 찾을 수 없습니다.');
            return;
        }
        
        if (data.sessions && data.sessions.length > 0) {
            console.log('실제 세션 데이터로 목록 업데이트:', data.sessions.length, '개');
            
            // 실제 세션 데이터가 있을 때만 업데이트
            const sessionHtml = data.sessions.map(session => `
                <div class="chat-list__box" data-session-id="${session.session_id}">
                    <div class="chat-list__text">
                        <div class="chat-list__title">${escapeHtml(session.title)}</div>
                        <div class="chat-list__time">${formatDate(session.updated_at)}</div>
                    </div>
                    <div class="dropdown">
                        <button class="btn btn-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false"></button>
                        <ul class="dropdown-menu">
                            <li><button class="dropdown-item session-delete" type="button" data-session-id="${session.session_id}">삭제</button></li>
                        </ul>
                    </div>
                </div>
            `).join('');
            
            // 실제 세션 데이터로 교체
            sessionsList.innerHTML = sessionHtml;
        } else {
            console.log('세션 데이터가 없거나 비어있음. 플레이스홀더 표시.');
            // 세션이 없을 때 플레이스홀더 표시
            sessionsList.innerHTML = `
                <div class="no-sessions-placeholder" style="text-align: center; padding: 20px; color: #666; font-size: 14px;">
                    <i class="bi bi-chat-dots" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
                    아직 채팅 세션이 없습니다.<br>
                    + 버튼을 클릭해서 새 대화를 시작하세요!
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading chat sessions:', error);
    }
}

// 채팅 히스토리 로드
async function loadChatHistory(sessionId) {
    console.log('채팅 히스토리 로드:', sessionId);
    
    try {
        const response = await fetch(`/jembot/api/sessions/${sessionId}/history/`);
        console.log('히스토리 응답 상태:', response.status);
        const data = await response.json();
        console.log('히스토리 응답 데이터:', data);
        
        if (data.success) {
            currentSessionId = sessionId;
            
            // 모든 세션 박스에서 active 클래스 제거
            document.querySelectorAll('.chat-list__box').forEach(box => {
                box.classList.remove('active');
            });
            
            // 현재 선택된 세션에 active 클래스 추가
            const selectedBox = document.querySelector(`[data-session-id="${sessionId}"]`);
            if (selectedBox) {
                selectedBox.classList.add('active');
            }
            
            // 채팅 창 초기화
            clearChatMessages();
            
            // 히스토리 메시지들 표시
            if (data.messages && data.messages.length > 0) {
                data.messages.forEach(message => {
                    if (message.message_type === 'user') {
                        addUserMessage(message.content);
                    } else if (message.message_type === 'bot') {
                        // 레벨 정보를 소문자로 변환
                        const level = message.level ? message.level.toLowerCase() : 'basic';
                        addBotMessage(message.content, level);
                    }
                });
            } else {
                // 히스토리가 없으면 기본 환영 메시지
                addBotMessage('안녕하세요! 무엇을 도와드릴까요?', null);
            }
            
            console.log('채팅 히스토리 로드 완료. 현재 세션:', currentSessionId);
        } else {
            console.error('히스토리 로드 실패:', data.error);
            alert('채팅 히스토리를 불러오는데 실패했습니다: ' + (data.error || '알 수 없는 오류'));
        }
    } catch (error) {
        console.error('Error loading chat history:', error);
        alert('채팅 히스토리 로드 중 오류가 발생했습니다: ' + error.message);
    }
}

// 사용자 메시지 추가
function addUserMessage(message) {
    const chatMessages = document.querySelector('.chat-messages');
    if (!chatMessages) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-user';
    messageDiv.innerHTML = `
        <div class="chat-user__time">${getCurrentTime()}</div>
        <div class="chat-user__content">${escapeHtml(message)}</div>
    `;
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

// 마크다운을 HTML로 변환하는 함수
function renderMarkdown(text) {
    if (typeof marked !== 'undefined') {
        // marked.js가 로드되어 있는 경우
        const renderer = new marked.Renderer();
        
        // 마크다운 옵션 설정
        marked.setOptions({
            renderer: renderer,
            gfm: true,
            breaks: true,
            pedantic: false,
            sanitize: false,
            smartLists: true,
            smartypants: false
        });
        
        return marked.parse(text);
    } else {
        // marked.js가 없는 경우 간단한 마크다운 파싱
        return simpleMarkdownParse(text);
    }
}

// 간단한 마크다운 파싱 함수 (fallback)
function simpleMarkdownParse(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  // **볼드**
        .replace(/\*(.*?)\*/g, '<em>$1</em>')              // *이탤릭*
        .replace(/`(.*?)`/g, '<code>$1</code>')            // `인라인 코드`
        .replace(/### (.*$)/gim, '<h3>$1</h3>')           // ### 제목3
        .replace(/## (.*$)/gim, '<h2>$1</h2>')            // ## 제목2
        .replace(/# (.*$)/gim, '<h1>$1</h1>')             // # 제목1
        .replace(/^\- (.*$)/gim, '<ul><li>$1</li></ul>')   // - 리스트
        .replace(/\n/g, '<br>');                          // 줄바꿈
}

// 봇 메시지 추가
function addBotMessage(message, level = 'basic') {
    const chatMessages = document.querySelector('.chat-messages');
    if (!chatMessages) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-bot';
    
    let levelMark = '';
    let levelClass = '';
    
    console.log('봇 메시지 레벨:', level);
    
    // level이 null이 아닌 경우에만 레벨 마크를 표시
    if (level === 'intermediate') {
        levelMark = '<div class="intermediate_answer__mark">중급</div>';
        levelClass = ' id="intermediate_answer"';
    } else if (level === 'advanced') {
        levelMark = '<div class="advanced_answer__mark">고급</div>';
        levelClass = ' id="advanced_answer"';
    } else if (level === 'basic') {
        levelMark = '<div class="beginner_answer__mark">초급</div>';
        levelClass = ' id="beginner_answer"';
    }
    // level이 null인 경우 levelMark와 levelClass는 빈 문자열로 유지
    
    // 마크다운을 HTML로 변환
    const renderedMessage = renderMarkdown(message);
    
    messageDiv.innerHTML = `
        ${levelMark}
        <div class="chat-bot__content markdown-content">${renderedMessage}</div>
        <div class="chat-bot__time">${getCurrentTime()}</div>
    `;
    
    // 레벨에 따른 ID 설정
    if (levelClass) {
        messageDiv.setAttribute('id', levelClass.replace(' id="', '').replace('"', ''));
    }
    
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

// 로딩 메시지 표시
function showLoadingMessage() {
    const chatMessages = document.querySelector('.chat-messages');
    if (!chatMessages) return null;
    
    const loadingId = 'loading-' + Date.now();
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'chat-bot loading-message';
    loadingDiv.id = loadingId;
    
    loadingDiv.innerHTML = `
        <div class="chat-bot__content">
            <span class="loading-dots">
                <span></span>
                <span></span>
                <span></span>
            </span>
            <span style="margin-left: 2px;">생각 중...</span>
        </div>
        <div class="chat-bot__time">${getCurrentTime()}</div>
    `;
    
    chatMessages.appendChild(loadingDiv);
    scrollToBottom();
    
    return loadingId;
}

// 로딩 메시지 제거
function hideLoadingMessage(loadingId) {
    if (!loadingId) return;
    
    const loadingElement = document.getElementById(loadingId);
    if (loadingElement) {
        loadingElement.remove();
    }
}

// 채팅 메시지 초기화
function clearChatMessages() {
    const chatMessages = document.querySelector('.chat-messages');
    if (!chatMessages) return;
    
    chatMessages.innerHTML = `
        <div class="chat-start__container">
            <div class="chat-start__inside">
                <div class="brand-name">JemBot Message</div>
                <div class="chat-start__time">Today ${getCurrentTime()}</div>
            </div>
        </div>
    `;
}

// 유틸리티 함수들
function getCurrentTime() {
    return new Date().toLocaleTimeString('ko-KR', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
    });
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getCSRFToken() {
    // CSRF 토큰을 다양한 방법으로 시도
    let token = document.querySelector('[name=csrfmiddlewaretoken]')?.value;
    if (token) {
        console.log('CSRF 토큰 찾음 (input):', token.substring(0, 10) + '...');
        return token;
    }
    
    token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    if (token) {
        console.log('CSRF 토큰 찾음 (meta):', token.substring(0, 10) + '...');
        return token;
    }
    
    // 쿠키에서 찾기
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'csrftoken') {
            console.log('CSRF 토큰 찾음 (cookie):', value.substring(0, 10) + '...');
            return value;
        }
    }
    
    console.warn('CSRF 토큰을 찾을 수 없습니다.');
    return '';
}

function scrollToBottom() {
    const chatMessages = document.querySelector('.chat-messages');
    if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}