// _homework/static/js/app/main.js

console.log('JavaScript 파일이 로드되었습니다!');

const sideButtonHandler = () => {
    const $buttons = document.querySelectorAll('#news-button, #stock-button');
    const $news_container = document.querySelector('#news-container');
    const $stock_container = document.querySelector('#stock-container');
    const $searchInput = document.querySelector('.choices-input__box input');

    $buttons.forEach(button => {
        button.addEventListener('click', function () {
            // 모든 버튼에서 'active' 클래스 제거
            $buttons.forEach(btn => btn.classList.remove('active'));
            // 클릭된 버튼에 'active' 클래스 추가
            this.classList.add('active');

            // '뉴스' 버튼 클릭 시
            if (this.id === 'news-button') {
                $stock_container.style.display = 'none';
                $news_container.style.display = 'block';
                $searchInput.placeholder = '뉴스 검색';

                // 검색어 연동 및 플레이스홀더 로직
                if (currentStockQuery) {
                    searchNews(currentStockQuery);
                } else {
                    initializeNewsContainer();
                }

            // '주식' 버튼 클릭 시
            } else if (this.id === 'stock-button') {
                $news_container.style.display = 'none';
                $stock_container.style.display = 'flex';
                $searchInput.placeholder = '주식 검색';

                // 주식 정보가 없을 때만 플레이스홀더를 표시합니다.
                if (!$stock_container.querySelector('.stock-box')) {
                    initializeStockContainer();
                }
            }
        });
    });

    // 페이지 로드 시 '주식' 버튼을 기본적으로 활성화
    const stockButton = document.querySelector('#stock-button');
    if (stockButton) {
        stockButton.click(); // 클릭 이벤트를 발생시켜 초기 상태 설정
    }
};

// 뉴스 검색 함수
const searchNews = async (query) => {
    console.log('검색 시작:', query);
    try {
        const response = await fetch('/jembot/api/crawl-news/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: query })
        });
        
        console.log('응답 상태:', response.status);
        const data = await response.json();
        console.log('응답 데이터:', data);
        
        if (data.success) {
            displayNews(data.news);
        } else {
            console.error('뉴스 검색 실패:', data.error);
        }
    } catch (error) {
        console.error('뉴스 검색 오류:', error);
    }
};

// 뉴스 표시 함수
const displayNews = (newsList) => {
    console.log('뉴스 표시 시작:', newsList);
    const newsContainer = document.querySelector('#news-container');
    const searchInput = document.querySelector('.choices-input__box input');
    const query = searchInput.value.trim(); // 현재 검색어 가져오기

    if (!newsContainer) {
        console.error('뉴스 컨테이너를 찾을 수 없습니다!');
        return;
    }
    
    // 기존 뉴스 제거
    newsContainer.innerHTML = '';
    
    // 새 뉴스 추가
    newsList.forEach((news, index) => {
        console.log(`뉴스 ${index + 1}:`, news);
        const newsBox = document.createElement('div');
        newsBox.className = 'news-box';
        
        // 검색어 하이라이팅 적용
        const highlightedTitle = highlightQuery(news.title, query);
        const highlightedContent = highlightQuery(news.content, query);

        newsBox.innerHTML = `
            <div class="news-box__top">
                <div class="news-label__mark">${news.press || '뉴스'}</div>
                <div class="news-label__time">${news.time || '방금전'}</div>
            </div>
            <div class="news-title">
                <a href="${news.link}" target="_blank">${highlightedTitle}</a>
            </div>
            <div class="news-content">
                ${highlightedContent}
            </div>
        `;
        
        newsContainer.appendChild(newsBox);
    });
    
    console.log('뉴스 표시 완료!');
};

/**
 * 텍스트 내에서 검색어를 찾아 strong 태그로 감싸 하이라이트합니다.
 * @param {string} text - 원본 텍스트
 * @param {string} query - 검색어
 * @returns {string} - 하이라이트 처리된 HTML 문자열
 */
function highlightQuery(text, query) {
    if (!query || !text) {
        return text;
    }
    // 정규식을 사용하여 대소문자 구분 없이 모든 일치 항목을 찾습니다.
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<strong>$1</strong>');
}

// =================================================================================================
// 주식 정보 관련
// =================================================================================================

let stockChart = null; // 차트 인스턴스를 저장할 변수
let currentStockQuery = ''; // 현재 조회된 주식의 원본 검색어를 저장할 변수

/**
 * 주식 정보를 API에 요청하고 결과를 표시합니다.
 * @param {string} query - 검색할 기업명
 */
const searchStock = async (query, period = '1m') => { // 기본 기간 파라미터 '1m'으로 변경
    if (!query.trim()) {
        alert('기업명을 입력해주세요.');
        return;
    }
    console.log('주식 정보 검색 시작:', query);
    const stockContainer = document.querySelector('#stock-container');
    stockContainer.innerHTML = `<div class="stock-placeholder"><i class="bi bi-hourglass-split"></i><div>데이터를 불러오는 중...</div></div>`;

    try {
        const response = await fetch('/jembot/api/get-stock-info/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken()
            },
            body: JSON.stringify({ query: query, period: period }) // period 전송
        });
        const data = await response.json();
        console.log('주식 정보 응답 데이터:', data);

        if (data.success) {
            currentStockQuery = query; // 검색 성공 시, 원본 검색어를 저장
            displayStockInfo(data);
            
            // 주식 검색 완료 이벤트 발생 (댓글 시스템에 알림)
            console.log('main.js: 주식 검색 성공, 댓글 시스템에 알림 시작');
            if (typeof window.onStockSearchCompleted === 'function') {
                // data.code에서 .KS나 .KQ 제거하여 KRX 코드만 추출
                const stockCode = data.code.replace(/\.(KS|KQ)$/, '');
                console.log('main.js: 추출된 주식 코드:', stockCode, '원본:', data.code);
                window.onStockSearchCompleted(stockCode);
            } else {
                console.log('main.js: onStockSearchCompleted 함수를 찾을 수 없음');
            }
        } else {
            // 오류 메시지의 \n을 <br> 태그로 변환하여 줄바꿈을 적용합니다.
            const errorMessage = data.error.replace(/\\n/g, '<br>');
            stockContainer.innerHTML = `<div class="stock-placeholder"><i class="bi bi-x-circle"></i><div>${errorMessage || '정보를 가져오는데 실패했습니다.'}</div></div>`;
            console.error('주식 정보 검색 실패:', data.error);
        }
    } catch (error) {
        stockContainer.innerHTML = `<div class="stock-placeholder"><i class="bi bi-wifi-off"></i><div>서버와 통신할 수 없습니다.</div></div>`;
        console.error('주식 정보 검색 오류:', error);
    }
};

/**
 * 받아온 주식 정보와 차트를 화면에 표시합니다.
 * @param {object} data - API로부터 받은 주식 데이터
 */
const displayStockInfo = (data) => {
    const stockContainer = document.querySelector('#stock-container');
    if (!stockContainer) {
        console.error('주식 컨테이너를 찾을 수 없습니다!');
        return;
    }

    const changeValue = parseFloat(data.changePercent);
    let changeClass = 'neutral';
    if (changeValue > 0) changeClass = 'positive';
    if (changeValue < 0) changeClass = 'negative';
    
    // 등락 방향에 따라 아이콘을 설정하고, 기존 부호(+,-)는 제거합니다.
    const arrow = changeValue > 0 ? '▲' : (changeValue < 0 ? '▼' : '');
    const priceChangeString = data.priceChange.replace(/[+-]/, '');
    const changePercentString = data.changePercent.replace(/[+-]/, '');

    // 기간 선택 버튼 HTML
    const periods = { '1d': '1D', '1w': '1W', '1m': '1M', '1y': '1Y' };
    let periodButtonsHtml = '<div class="stock-period-selector">';
    for (const key in periods) {
        // API 응답에 포함된 period 값으로 활성 버튼을 동적으로 설정
        const isActive = key === data.period; 
        periodButtonsHtml += `<button class="period-button ${isActive ? 'active' : ''}" data-period="${key}">${periods[key]}</button>`;
    }
    periodButtonsHtml += '</div>';

    const stockInfoHtml = `
        <div class="stock-box">
            <div class="stock-header">
                <span class="stock-name">${data.companyName}</span>
                <span class="stock-code">${data.code}</span>
            </div>

            <div class="stock-price-section">
                <div class="current-price">₩${data.latestPrice}</div>
                <div class="price-change ${changeClass}">
                    ${arrow} ${priceChangeString} (${changePercentString}%)
                </div>
                <div class="update-time">${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} KST</div>
            </div>

            ${periodButtonsHtml}

            <div class="stock-chart">
                <canvas id="stockChart"></canvas>
            </div>

            <div class="stock-details">
                <div class="detail-row">
                    <div class="detail-item">
                        <span class="label">시가총액</span>
                        <span class="value">${data.marketCap}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">거래량</span>
                        <span class="value">${data.volume}</span>
                    </div>
                </div>
                <div class="detail-row">
                    <div class="detail-item">
                        <span class="label">52주 최고</span>
                        <span class="value">${data.fiftyTwoWeekHigh}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">52주 최저</span>
                        <span class="value">${data.fiftyTwoWeekLow}</span>
                    </div>
                </div>
                <div class="detail-row">
                    <div class="detail-item">
                        <span class="label">${data.per_label}</span>
                        <span class="value">${data.per_value}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">${data.pbr_label}</span>
                        <span class="value">${data.pbr_value}</span>
                    </div>
                </div>
                <div class="detail-row">
                    <div class="detail-item">
                        <span class="label">당일 최고가</span>
                        <span class="value">${data.dayHigh}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">당일 최저가</span>
                        <span class="value">${data.dayLow}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    stockContainer.innerHTML = stockInfoHtml;

    // 차트 생성
    const ctx = document.getElementById('stockChart').getContext('2d');
    if (stockChart) {
        stockChart.destroy(); // 이전 차트가 있으면 파괴
    }

    // --- 2번째 디자인: 그라데이션과 부드러운 곡선 ---
    const positiveColor = '#1dbf60';
    const negativeColor = '#e74c3c';
    const chartColor = changeValue >= 0 ? positiveColor : negativeColor;

    const gradient = ctx.createLinearGradient(0, 0, 0, 120); // 차트 높이에 맞춰 그라데이션 생성
    const gradientStartColor = changeValue >= 0 ? 'rgba(29, 191, 96, 0.3)' : 'rgba(231, 76, 60, 0.3)';
    gradient.addColorStop(0, gradientStartColor);
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');


    stockChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.chartData.labels.slice(-30), // 최근 30개 데이터만 표시
            datasets: [{
                data: data.chartData.data.slice(-30),
                borderColor: chartColor,
                borderWidth: 2.5,
                tension: 0.4, // 곡선을 더 부드럽게
                fill: true,
                backgroundColor: gradient, // 그라데이션 배경 적용
                pointRadius: 0,
                pointHoverRadius: 5, // 마우스 올렸을 때 점 크기
                pointHoverBackgroundColor: chartColor,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { 
                    display: true,
                    ticks: { padding: 5 },
                    grid: { 
                        color: 'rgba(0, 0, 0, 0.05)',
                        borderDash: [3, 3], // 그리드 선을 점선으로
                        drawBorder: false,
                    }
                },
                x: { 
                    display: true,
                    ticks: { display: false }, // X축 레이블 숨기기
                    grid: { display: false } // X축 그리드 숨기기
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: { 
                    enabled: true,
                    backgroundColor: '#222',
                    padding: 10,
                    cornerRadius: 5,
                    titleFont: { size: 14 },
                    bodyFont: { size: 12 }
                }
            }
        }
    });

    // --- 이름 길이에 따른 폰트 크기 동적 조절 ---
    const stockNameElement = stockContainer.querySelector('.stock-name');
    if (stockNameElement && stockNameElement.offsetHeight > 30) { // 기준 높이(1줄일 때)를 초과하면
        stockNameElement.classList.add('stock-name--long');
    }

    // --- 기간 선택 버튼 이벤트 리스너 추가 ---
    stockContainer.querySelectorAll('.period-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const selectedPeriod = e.target.dataset.period;
            
            if (!currentStockQuery) {
                console.error("오류: 현재 조회된 주식의 검색어를 찾을 수 없습니다.");
                return;
            }

            // 모든 버튼 active 해제 후 클릭된 버튼만 active
            stockContainer.querySelectorAll('.period-button').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');

            updateStockChart(currentStockQuery, selectedPeriod); // 저장된 원본 검색어 사용
        });
    });
};

/**
 * 차트 데이터만 새로 요청하여 업데이트합니다.
 * @param {string} query - 기업명
 * @param {string} period - 기간
 */
const updateStockChart = async (query, period) => {
    console.log(`차트 업데이트 요청: ${query}, 기간: ${period}`);
    try {
        const response = await fetch('/jembot/api/get-stock-info/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
            body: JSON.stringify({ query: query, period: period })
        });
        const data = await response.json();
        if (data.success && stockChart) {
            const chartData = data.chartData;

            // --- 디버깅 로그: 데이터 변경 확인 ---
            const oldDataSample = stockChart.data.datasets[0].data.slice(0, 5);
            const newDataSample = chartData.data.slice(0, 5);
            console.log("기존 차트 데이터 (샘플):", oldDataSample);
            console.log("새로 받은 데이터 (샘플):", newDataSample);
            console.log("데이터 변경 여부:", JSON.stringify(oldDataSample) !== JSON.stringify(newDataSample));

            // 차트 데이터 업데이트
            stockChart.data.labels = chartData.labels;
            stockChart.data.datasets[0].data = chartData.data;

            // 등락에 따른 색상 업데이트
            const latestPrice = chartData.data[chartData.data.length - 1];
            const previousPrice = chartData.data.length > 1 ? chartData.data[chartData.data.length - 2] : latestPrice;
            const changeValue = latestPrice - previousPrice;
            const positiveColor = '#1dbf60';
            const negativeColor = '#e74c3c';
            const chartColor = changeValue >= 0 ? positiveColor : negativeColor;
            const gradientStartColor = changeValue >= 0 ? 'rgba(29, 191, 96, 0.3)' : 'rgba(231, 76, 60, 0.3)';
            
            const gradient = stockChart.ctx.createLinearGradient(0, 0, 0, 120);
            gradient.addColorStop(0, gradientStartColor);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            stockChart.data.datasets[0].borderColor = chartColor;
            stockChart.data.datasets[0].backgroundColor = gradient;
            stockChart.data.datasets[0].pointHoverBackgroundColor = chartColor;

            stockChart.update();
            console.log("차트 업데이트 완료");
        } else {
            console.error('차트 업데이트 실패:', data.error);
        }
    } catch (error) {
        console.error('차트 업데이트 오류:', error);
    }
};

/**
 * 초기 뉴스 컨테이너 상태를 설정합니다.
 */
const initializeNewsContainer = () => {
    const newsContainer = document.querySelector('#news-container');
    if(newsContainer) {
        newsContainer.innerHTML = `
            <div class="news-placeholder">
                <i class="bi bi-search"></i>
                <div>궁금한 키워드를 검색하여<br>최신 뉴스를 확인하세요.</div>
            </div>
        `;
    }
}

/**
 * 초기 주식 컨테이너 상태를 설정합니다.
 */
const initializeStockContainer = () => {
    const stockContainer = document.querySelector('#stock-container');
    if(stockContainer) {
        stockContainer.innerHTML = `
            <div class="stock-placeholder">
                <i class="bi bi-search"></i>
                <div>궁금한 기업명을 검색하여<br>주식 정보를 확인하세요.</div>
            </div>
        `;
    }
}


// =================================================================================================
// 이벤트 핸들러 및 초기화
// =================================================================================================

// CSRF 토큰을 가져오는 함수
function getCsrfToken() {
    const csrfToken = document.querySelector('meta[name="csrf-token"]').content;
    return csrfToken;
}

// 검색 입력 이벤트
document.addEventListener('DOMContentLoaded', function () {
    sideButtonHandler();

    const searchInput = document.querySelector('.choices-input__box input');
    const searchButton = document.querySelector('.choices-search-button button');

    const performSearch = () => {
        const query = searchInput.value;
        if (searchInput.placeholder === '뉴스 검색') {
            searchNews(query);
        } else if (searchInput.placeholder === '주식 검색') {
            searchStock(query);
        }
    };

    if (searchButton) {
        searchButton.addEventListener('click', performSearch);
    }
    
    if (searchInput) {
        searchInput.addEventListener('keyup', function (event) {
            if (event.key === 'Enter') {
                performSearch();
            }
        });
    }
});

// ㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡ 대화 저장    ㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡ
// let isFirstMessage = true;

// function saveChatToList(message) {
//     // AJAX로 서버에 저장 요청
//     fetch('/jembot/save_chat/', {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json',
//             'X-CSRFToken': getCookie('csrftoken'),
//         },
//         body: JSON.stringify({ message }),
//     });
// }

// document.querySelector('.chat-input__box input').addEventListener('keydown', function(e) {
//     if (e.key === 'Enter' && this.value.trim() !== '') {
//         if (isFirstMessage) {
//             saveChatToList(this.value.trim());
//             isFirstMessage = false;
//         }
//         sendMessage();
//     }
// });


// document.querySelector('.chat-search-button button').addEventListener('click', function() {
//     const input = document.querySelector('.chat-input__box input');
//     if (input.value.trim() !== '') {
//         if (isFirstMessage) {
//             saveChatToList(input.value.trim());
//             isFirstMessage = false;
//         }
//         sendMessage(); 
//     }
// });

// // CSRF 토큰 가져오기 함수
// function getCookie(name) {
//     let cookieValue = null;
//     if (document.cookie && document.cookie !== '') {
//         const cookies = document.cookie.split(';');
//         for (let i = 0; i < cookies.length; i++) {
//             const cookie = cookies[i].trim();
//             if (cookie.substring(0, name.length + 1) === (name + '=')) {
//                 cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
//                 break;
//             }
//         }
//     }
//     return cookieValue;
// }
// ㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡ 대화 저장 끝 ㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡㅡ


// OpenAI 챗봇 기능
const initializeChatbot = () => {
    const chatInput = document.querySelector('.chat-input__box input');
    const sendButton = document.querySelector('.chat-search-button button');
    const chatMessages = document.querySelector('.chat-messages');
    
    if (!chatInput || !sendButton || !chatMessages) {
        console.error('챗봇 요소를 찾을 수 없습니다.');
        return;
    }
    
    // 현재 채팅 세션 ID 저장
    let currentSessionId = null;
    let isNewSession = true;

    // 메시지 전송 함수
    const sendMessage = async () => {
        const message = chatInput.value.trim();
        if (!message) return;
        
        // 사용자 메시지 추가
        addUserMessage(message);
        chatInput.value = '';
        
        // 로딩 표시
        const loadingId = addLoadingMessage();
        
        try {
            // 선택된 레벨 확인
            const activeButton = document.querySelector('.btn-group .btn-check:checked + .btn');
            let selectedLevel = 'BASIC'; // 기본값
            if (activeButton) {
                const buttonText = activeButton.textContent.trim();
                if (buttonText === '초급') {
                    selectedLevel = 'BASIC';
                } else if (buttonText === '중급') {
                    selectedLevel = 'INTERMEDIATE';
                } else if (buttonText === '고급') {
                    selectedLevel = 'ADVANCED';
                }
            }

            const requestBody = {
                message: message,
                session_id: currentSessionId,
                is_new_session: isNewSession,
                level: selectedLevel
            };

            const response = await fetch('/jembot/api/chat/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken()
                },
                body: JSON.stringify(requestBody)
            });
            
            const data = await response.json();
            
            // 로딩 메시지 제거
            removeLoadingMessage(loadingId);
            
            if (data.response) {
                addBotMessage(data.response, data.timestamp);
                
                // 세션 ID 업데이트 (첫 메시지인 경우)
                if (data.session_id && !currentSessionId) {
                    currentSessionId = data.session_id;
                    isNewSession = false;
                    console.log('새 채팅 세션 생성:', currentSessionId);
                    
                    // 채팅 세션 목록 업데이트
                    loadChatSessions();
                }
            } else {
                addBotMessage('죄송합니다. 응답을 생성하는 중에 오류가 발생했습니다.', data.timestamp);
            }
        } catch (error) {
            console.error('챗봇 API 오류:', error);
            removeLoadingMessage(loadingId);
            addBotMessage('죄송합니다. 서버와의 연결에 문제가 발생했습니다.', formatTime(new Date()));
        }
    };
    
    // 사용자 메시지 추가
    const addUserMessage = (message) => {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-user';
        
        const time = formatTime(new Date());
        
        messageDiv.innerHTML = `
            <div class="chat-user__time">${time}</div>
            <div class="chat-user__content">${message}</div>
        `;
        
        chatMessages.appendChild(messageDiv);
        scrollToBottom();
    };
    
    // 봇 메시지 추가
    const addBotMessage = (message, timestamp) => {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-bot';
        
        // 활성화된 버튼 확인
        const activeButton = document.querySelector('.btn-group .btn-check:checked + .btn');
        let levelMark = '';
        
        if (activeButton) {
            const buttonText = activeButton.textContent.trim();
            if (buttonText === '초급') {
                levelMark = '<div class="beginner_answer__mark">초급</div>';
            } else if (buttonText === '중급') {
                levelMark = '<div class="intermediate_answer__mark">중급</div>';
            } else if (buttonText === '고급') {
                levelMark = '<div class="advanced_answer__mark">고급</div>';
            }
        }
        
        messageDiv.innerHTML = `
            ${levelMark}
            <div class="chat-bot__content">${message}</div>
            <div class="chat-bot__time">${timestamp}</div>
        `;
        
        chatMessages.appendChild(messageDiv);
        scrollToBottom();
    };

    // 저장된 레벨과 함께 봇 메시지 추가
    const addBotMessageWithLevel = (message, timestamp, level) => {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-bot';
        
        // 레벨에 따른 라벨 생성
        let levelMark = '';
        if (level === 'BASIC') {
            levelMark = '<div class="beginner_answer__mark">초급</div>';
        } else if (level === 'INTERMEDIATE') {
            levelMark = '<div class="intermediate_answer__mark">중급</div>';
        } else if (level === 'ADVANCED') {
            levelMark = '<div class="advanced_answer__mark">고급</div>';
        }
        
        messageDiv.innerHTML = `
            ${levelMark}
            <div class="chat-bot__content">${message}</div>
            <div class="chat-bot__time">${timestamp}</div>
        `;
        
        chatMessages.appendChild(messageDiv);
        scrollToBottom();
    };
    
    // 로딩 메시지 추가
    const addLoadingMessage = () => {
        const loadingId = 'loading-' + Date.now();
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-bot';
        messageDiv.id = loadingId;
        
        messageDiv.innerHTML = `
            <div class="chat-bot__content">
                <div class="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        
        chatMessages.appendChild(messageDiv);
        scrollToBottom();
        return loadingId;
    };
    
    // 로딩 메시지 제거
    const removeLoadingMessage = (loadingId) => {
        const loadingElement = document.getElementById(loadingId);
        if (loadingElement) {
            loadingElement.remove();
        }
    };
    
    // 스크롤을 맨 아래로
    const scrollToBottom = () => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    };
    
    // 이벤트 리스너 등록
    sendButton.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // 채팅 세션 목록 로드
    const loadChatSessions = async () => {
        try {
            const response = await fetch('/jembot/api/chat-sessions/', {
                method: 'GET',
                headers: {
                    'X-CSRFToken': getCsrfToken()
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                displayChatSessions(data.sessions);
                return data.sessions; // 세션 목록 반환
            } else {
                console.error('채팅 세션 로드 실패:', data.error);
                return [];
            }
        } catch (error) {
            console.error('채팅 세션 로드 오류:', error);
            return [];
        }
    };

    // 채팅 세션 목록 표시
    const displayChatSessions = (sessions) => {
        const chatListContainer = document.getElementById('chatListContainer');
        if (!chatListContainer) return;

        // 기존 내용 지우기
        chatListContainer.innerHTML = '';

        if (sessions.length === 0) {
            chatListContainer.innerHTML = '<div class="chat-list__empty">저장된 대화가 없습니다.</div>';
            return;
        }

        sessions.forEach(session => {
            const chatBox = document.createElement('div');
            chatBox.className = 'chat-list__box';
            chatBox.setAttribute('data-session-id', session.session_id); // 삭제 시 식별용
            chatBox.innerHTML = `
                <div class="chat-list__text">
                    <div class="chat-list__title">${session.title}</div>
                    <div class="chat-list__time">${formatDate(session.updated_at)}</div>
                </div>
                <div class="dropdown">
                    <button class="btn btn-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false"></button>
                    <ul class="dropdown-menu">
                        <li><button class="dropdown-item" type="button" onclick="shareSession('${session.session_id}')">Share</button></li>
                        <li><button class="dropdown-item" type="button" onclick="renameSession('${session.session_id}')">Rename</button></li>
                        <li><button class="dropdown-item" type="button" onclick="deleteSession('${session.session_id}')">Delete</button></li>
                    </ul>
                </div>
            `;
            
            // 제목 클릭 시 대화 로드
            const titleElement = chatBox.querySelector('.chat-list__text');
            titleElement.addEventListener('click', () => loadChatSession(session.session_id));
            titleElement.style.cursor = 'pointer';
            
            chatListContainer.appendChild(chatBox);
        });
    };

    // 특정 채팅 세션 로드
    const loadChatSession = async (sessionId) => {
        try {
            const response = await fetch(`/jembot/api/chat-messages/${sessionId}/`, {
                method: 'GET',
                headers: {
                    'X-CSRFToken': getCsrfToken()
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                // 기존 대화 내용 지우기
                chatMessages.innerHTML = '';
                
                // 세션 정보 업데이트
                currentSessionId = sessionId;
                isNewSession = false;
                
                // 메시지 표시
                data.messages.forEach(message => {
                    if (message.message_type === 'user') {
                        addUserMessage(message.content);
                    } else if (message.message_type === 'system') {
                        // JemBot Message 표시
                        addJemBotMessageFromContent(message.content);
                    } else {
                        // 환영 메시지는 전용 함수 사용
                        if (message.content === '안녕하세요 무엇을 도와드릴까요?') {
                            addWelcomeBotMessage(message.content, message.timestamp);
                        } else {
                            // 저장된 레벨과 함께 봇 메시지 표시
                            addBotMessageWithLevel(message.content, message.timestamp, message.level);
                        }
                    }
                });
                
                console.log('채팅 세션 로드 완료:', sessionId);
            } else {
                console.error('채팅 세션 로드 실패:', data.error);
            }
        } catch (error) {
            console.error('채팅 세션 로드 오류:', error);
        }
    };

    // 새 대화 시작
    const startNewChat = () => {
        currentSessionId = null;
        isNewSession = true;
        chatMessages.innerHTML = '';
        
        // JemBot 환영 메시지 추가
        addInitialBotMessage();
        
        console.log('새 대화 시작');
    };

    // 초기 봇 메시지 추가 (새 대화 시작 시)
    const addInitialBotMessage = () => {
        const now = new Date();
        const time = formatTime(now);
        
        // 비인증 사용자의 경우 프론트엔드에서 JemBot Message 표시 (하루에 한 번)
        const userAuthenticated = document.querySelector('meta[name="user-authenticated"]');
        if (!userAuthenticated || userAuthenticated.getAttribute('content') !== 'true') {
            const today = now.toDateString();
            const lastJemBotDate = localStorage.getItem('lastJemBotDate');
            
            if (!lastJemBotDate || lastJemBotDate !== today) {
                addJemBotMessage(now);
                localStorage.setItem('lastJemBotDate', today);
            }
        }
        
        addWelcomeBotMessage('안녕하세요 무엇을 도와드릴까요?', time);
    };

    // 환영 메시지 전용 (초급 라벨 없음)
    const addWelcomeBotMessage = (message, timestamp) => {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-bot';
        
        messageDiv.innerHTML = `
            <div class="chat-bot__content">${message}</div>
            <div class="chat-bot__time">${timestamp}</div>
        `;
        
        chatMessages.appendChild(messageDiv);
        scrollToBottom();
    };

    // JemBot Message 추가
    const addJemBotMessage = (now) => {
        const timeString = formatTime(now);
        
        const jembotDiv = document.createElement('div');
        jembotDiv.className = 'chat-start__inside';
        jembotDiv.innerHTML = `
            <div class="jembot-message-time">
                <span class="jembot-title">JemBot Message</span><br>
                Today ${timeString}
            </div>
        `;
        
        chatMessages.appendChild(jembotDiv);
    };

    // 저장된 JemBot Message 내용으로 표시
    const addJemBotMessageFromContent = (content) => {
        const jembotDiv = document.createElement('div');
        jembotDiv.className = 'chat-start__inside';
        
        // "JemBot Message" 부분에 스타일 적용
        const formattedContent = content.replace(
            'JemBot Message', 
            '<span class="jembot-title">JemBot Message</span>'
        ).replace('\n', '<br>');
        
        jembotDiv.innerHTML = `
            <div class="jembot-message-time">
                ${formattedContent}
            </div>
        `;
        
        chatMessages.appendChild(jembotDiv);
    };

    // 새 대화 버튼 이벤트 (있는 경우)
    const newChatButton = document.querySelector('.new-chat-btn');
    if (newChatButton) {
        newChatButton.addEventListener('click', startNewChat);
    }

    // 로그인된 사용자인 경우 채팅 세션 로드
    if (document.querySelector('meta[name="user-authenticated"]')) {
        loadChatSessions().then(() => {
            // 세션 로드 후 채팅창이 비어있으면 환영 메시지 표시
            if (chatMessages.children.length === 0) {
                addInitialBotMessage();
            }
        });
    } else {
        // 비로그인 사용자도 초기 환영 메시지 표시
        addInitialBotMessage();
    }

    // 전역으로 함수 노출 (드롭다운에서 사용)
    window.loadChatSessions = loadChatSessions;
};

// 시간 포맷팅 함수 (오후 08:00 형식)
const formatTime = (date) => {
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const period = hours >= 12 ? '오후' : '오전';
    const displayHours = String(hours % 12 || 12).padStart(2, '0');
    
    return `${period} ${displayHours}:${minutes}`;
};

// 날짜 포맷팅 함수
const formatDate = (dateString) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    hours = hours % 12;
    hours = hours ? hours : 12; // 0시는 12시로 표시
    
    return `${year}/${month}/${day} ${hours}:${minutes}${ampm}`;
};

// 세션 공유 기능
const shareSession = (sessionId) => {
    console.log('공유 기능:', sessionId);
    // TODO: 세션 공유 기능 구현
    alert('공유 기능은 곧 출시될 예정입니다.');
};

// 세션 이름 변경 기능
const renameSession = (sessionId) => {
    const newTitle = prompt('새로운 대화 제목을 입력하세요:');
    if (newTitle && newTitle.trim()) {
        console.log('이름 변경:', sessionId, newTitle);
        // TODO: 세션 이름 변경 API 구현
        alert('이름 변경 기능은 곧 출시될 예정입니다.');
    }
};

// 세션 삭제 기능
const deleteSession = async (sessionId) => {
    if (confirm('정말로 이 대화를 삭제하시겠습니까?\n삭제된 대화는 복구할 수 없습니다.')) {
        try {
            const response = await fetch(`/jembot/api/chat-sessions/${sessionId}/delete/`, {
                method: 'DELETE',
                headers: {
                    'X-CSRFToken': getCsrfToken()
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                // UI에서 해당 세션 제거
                const chatBox = document.querySelector(`[data-session-id="${sessionId}"]`);
                if (chatBox) {
                    chatBox.remove();
                }
                
                // 현재 보고 있는 대화가 삭제된 경우 채팅창 초기화
                const currentSessionElement = document.querySelector('.current-session');
                if (currentSessionElement && currentSessionElement.dataset.sessionId === sessionId) {
                    const chatMessages = document.querySelector('.chat-messages');
                    if (chatMessages) {
                        chatMessages.innerHTML = '';
                    }
                    // 새 대화 모드로 변경
                    if (typeof startNewChat === 'function') {
                        startNewChat();
                    }
                }
                
                // 대화 목록 새로고침
                if (window.loadChatSessions && typeof window.loadChatSessions === 'function') {
                    window.loadChatSessions();
                }
                
                alert('대화가 성공적으로 삭제되었습니다.');
            } else {
                alert('삭제 중 오류가 발생했습니다: ' + data.error);
            }
        } catch (error) {
            console.error('세션 삭제 오류:', error);
            alert('삭제 중 오류가 발생했습니다.');
        }
    }
};

// 페이지 로드 시 챗봇 초기화
document.addEventListener('DOMContentLoaded', () => {
    initializeChatbot();
});