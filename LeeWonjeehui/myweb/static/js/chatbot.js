document.getElementById('sendBtn').onclick = sendMessage;
document.getElementById('userInput').addEventListener('keypress', function (e) {
  if (e.key === 'Enter') sendMessage();
});

function sendMessage() {
  const input = document.getElementById('userInput');
  const msg = input.value.trim();
  if (!msg) return;
  addMessage('user', msg);
  input.value = '';
  // 난이도 확인
  const level = document.querySelector('input[name="level"]:checked').value;

  // TODO: AI 실제 응답 처리 (API 호출 등)
  setTimeout(() => {
    addMessage('ai', `[${level.toUpperCase()}] 답변 예시입니다.`);
  }, 800);
}

function addMessage(sender, text) {
  const messages = document.getElementById('messages');
  const msgDiv = document.createElement('div');
  msgDiv.className = 'message ' + (sender === 'user' ? 'user' : 'ai');
  msgDiv.textContent = text;
  messages.appendChild(msgDiv);
  messages.scrollTop = messages.scrollHeight;
}

// 탭 전환 (뉴스/주식)
document.querySelectorAll('.tab').forEach((tabBtn) => {
  tabBtn.onclick = () => {
    document.querySelectorAll('.tab').forEach((t) => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });
    tabBtn.classList.add('active');
    tabBtn.setAttribute('aria-selected', 'true');

    const tabName = tabBtn.getAttribute('data-tab');
    const infoContent = document.getElementById('infoContent');
    const searchInput = document.getElementById('searchInput');

    if (tabName === 'news') {
      infoContent.textContent = '최신 뉴스 정보 예시입니다.';
      searchInput.placeholder = '뉴스 검색어 입력';
    } else if (tabName === 'stock') {
      infoContent.textContent = '최신 주식 정보 예시입니다.';
      searchInput.placeholder = '주식 종목명 입력';
    }
  };
});

// 검색 버튼 이벤트
document.getElementById('searchBtn').onclick = () => {
  const keyword = document.getElementById('searchInput').value.trim();
  if (!keyword) {
    alert('검색어를 입력해주세요.');
    return;
  }
  const activeTab = document.querySelector('.tab.active').getAttribute('data-tab');
  const infoContent = document.getElementById('infoContent');

  if (activeTab === 'news') {
    // TODO: 뉴스 API 연동 코드 작성
    infoContent.innerHTML = `'${keyword}'에 대한 뉴스 검색 결과 예시입니다.`;
  } else if (activeTab === 'stock') {
    // TODO: 주식 API 연동 코드 작성
    infoContent.innerHTML = `'${keyword}'에 대한 주식 정보 검색 결과 예시입니다.`;
  }
};
