// _homework/static/js/app/main.js

console.log('📈 주식/뉴스 기능 JavaScript 로드 완료!');

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
                <div class="stock-info">
                <span class="stock-name">${data.companyName}</span>
                <span class="stock-code">${data.code}</span>
                </div>
                <button class="favorite-btn" data-stock-code="${data.code}" data-stock-name="${currentStockQuery || data.companyName}"
                        style="display: flex !important; 
                               visibility: visible !important; 
                               opacity: 1 !important;
                               align-items: center !important;
                               justify-content: center !important;
                               min-width: 36px !important;
                               min-height: 36px !important;
                               background: none !important;
                               border: none !important;
                               cursor: pointer !important;
                               border-radius: 50% !important;
                               padding: 8px !important;">
                    <i class="bi bi-star" id="favorite-icon" 
                       style="font-size: 1.2rem !important; color: #6c757d !important;"></i>
                </button>
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
            
            <div class="stock-actions">
                <button class="btn btn-primary stock-detail-btn">
                    <i class="bi bi-graph-up-arrow"></i>
                    자세한 분석 보러가기
                </button>
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
    
    // --- 자세히 보러가기 버튼 이벤트 리스너 추가 ---
    const detailButton = stockContainer.querySelector('.stock-detail-btn');
    if (detailButton) {
        detailButton.addEventListener('click', () => {
            console.log('주식 상세 페이지로 이동:', currentStockQuery);
            
            // 사용자가 검색한 기업명만 전달
            const params = new URLSearchParams({
                search: currentStockQuery
            });
            
            // stock 페이지로 이동
            window.location.href = `/jembot/stock/?${params.toString()}`;
        });
    }

    // --- 즐겨찾기 버튼 관련 기능 (DOM 렌더링 후 실행) ---
    setTimeout(() => {
        console.log('메인 페이지 즐겨찾기 버튼 설정 시작:', data.companyName);
        const favoriteBtn = stockContainer.querySelector('.favorite-btn');
        const favoriteIcon = stockContainer.querySelector('#favorite-icon');
        
        console.log('즐겨찾기 버튼 요소 확인:', {favoriteBtn, favoriteIcon});
    
    if (favoriteBtn && favoriteIcon) {
        console.log('즐겨찾기 버튼 요소 찾음, 상태 확인 시작');
        
        // 버튼이 이미 인라인 스타일로 설정되어 있지만 한번 더 확실히 설정
        console.log('즐겨찾기 버튼 요소 최종 확인:', {
            display: favoriteBtn.style.display,
            visibility: favoriteBtn.style.visibility,
            opacity: favoriteBtn.style.opacity
        });
        
        // 현재 즐겨찾기 상태 확인
        checkFavoriteStatus(data.code, favoriteIcon);
        
        // 즐겨찾기 버튼 클릭 이벤트
        favoriteBtn.addEventListener('click', () => {
            console.log('메인 페이지 즐겨찾기 버튼 클릭됨');
            toggleFavorite(data.code, data.companyName, favoriteIcon);
        });
        console.log('즐겨찾기 버튼 이벤트 리스너 연결 완료');
    } else {
        console.error('즐겨찾기 버튼 요소를 찾을 수 없습니다!');
        console.log('favoriteBtn 찾기 시도:', stockContainer.querySelector('.favorite-btn'));
        console.log('favoriteIcon 찾기 시도:', stockContainer.querySelector('#favorite-icon'));
        console.log('stockContainer HTML:', stockContainer.innerHTML);
    }
    }, 100); // setTimeout 종료
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
    const csrfMeta = document.querySelector('meta[name="csrf-token"]');
    if (csrfMeta) {
        const token = csrfMeta.getAttribute('content') || csrfMeta.content;
        console.log('CSRF 토큰 확인:', token ? '토큰 있음' : '토큰 없음');
        return token;
    }
    
    // fallback: 쿠키에서 가져오기
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'csrftoken') {
            console.log('CSRF 토큰 쿠키에서 발견');
            return value;
        }
    }
    
    console.warn('CSRF 토큰을 찾을 수 없습니다!');
    return '';
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

    searchButton.addEventListener('click', performSearch);
    
    searchInput.addEventListener('keyup', function (event) {
        if (event.key === 'Enter') {
            performSearch();
        }
    });
});

// =================================================================================================
// 즐겨찾기 관련 함수들
// =================================================================================================

/**
 * 특정 주식의 즐겨찾기 상태를 확인하고 아이콘을 업데이트합니다.
 * @param {string} stockCode - 주식 코드
 * @param {HTMLElement} iconElement - 즐겨찾기 아이콘 요소
 */
const checkFavoriteStatus = async (stockCode, iconElement) => {
    console.log(`즐겨찾기 상태 확인 시작: ${stockCode}`);
    try {
        const response = await fetch('/jembot/api/favorites/check/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken()
            },
            credentials: 'same-origin',
            body: JSON.stringify({ code: stockCode })
        });
        
        console.log('즐겨찾기 상태 확인 API 응답 상태:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('즐겨찾기 상태 확인 응답 데이터:', data);
        
        if (data.success) {
            updateFavoriteIcon(iconElement, data.is_favorite);
            console.log(`즐겨찾기 상태 업데이트 완료: ${data.is_favorite}`);
        } else {
            console.error('즐겨찾기 상태 확인 실패:', data.error);
        }
    } catch (error) {
        console.error('즐겨찾기 상태 확인 오류:', error);
        // 기본 상태로 설정 (비활성)
        updateFavoriteIcon(iconElement, false);
    }
};

/**
 * 즐겨찾기 아이콘 상태를 업데이트합니다.
 * @param {HTMLElement} iconElement - 즐겨찾기 아이콘 요소
 * @param {boolean} isFavorite - 즐겨찾기 여부
 */
const updateFavoriteIcon = (iconElement, isFavorite) => {
    console.log(`즐겨찾기 아이콘 업데이트: ${isFavorite ? '활성' : '비활성'}`);
    if (isFavorite) {
        iconElement.className = 'bi bi-star-fill';
        // CSS에서 색상을 관리하므로 인라인 스타일 제거
        iconElement.style.color = '';
        iconElement.style.fontSize = '1.2rem';
    } else {
        iconElement.className = 'bi bi-star';
        // CSS에서 색상을 관리하므로 인라인 스타일 제거
        iconElement.style.color = '';
        iconElement.style.fontSize = '1.2rem';
    }
    console.log('아이콘 클래스:', iconElement.className);
};

/**
 * 즐겨찾기 상태를 토글합니다.
 * @param {string} stockCode - 주식 코드
 * @param {string} stockName - 주식 이름
 * @param {HTMLElement} iconElement - 즐겨찾기 아이콘 요소
 */
const toggleFavorite = async (stockCode, stockName, iconElement) => {
    console.log(`즐겨찾기 토글 시작: ${stockName} (${stockCode})`);
    try {
        // 현재 즐겨찾기 상태 확인
        console.log('현재 즐겨찾기 상태 확인 중...');
        const checkResponse = await fetch('/jembot/api/favorites/check/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken()
            },
            credentials: 'same-origin',
            body: JSON.stringify({ code: stockCode })
        });
        
        const checkData = await checkResponse.json();
        console.log('현재 즐겨찾기 상태 응답:', checkData);
        
        if (!checkData.success) {
            alert('즐겨찾기 상태를 확인할 수 없습니다.');
            return;
        }
        
        const isFavorite = checkData.is_favorite;
        const url = isFavorite ? '/jembot/api/favorites/remove/' : '/jembot/api/favorites/add/';
        const requestData = isFavorite ? 
            { code: stockCode } : 
            { code: stockCode, name: stockName };
        
        console.log(`즐겨찾기 ${isFavorite ? '제거' : '추가'} 요청:`, {url, requestData});
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken()
            },
            credentials: 'same-origin',
            body: JSON.stringify(requestData)
        });
        
        const data = await response.json();
        console.log('즐겨찾기 토글 응답:', data);
        
        if (data.success) {
            // 아이콘 상태 업데이트
            updateFavoriteIcon(iconElement, !isFavorite);
            console.log(`즐겨찾기 토글 완료: ${stockName} ${!isFavorite ? '추가됨' : '제거됨'}`);
            
            // Stock 페이지가 열려있다면 즐겨찾기 목록 새로고침
            if (window.location.pathname.includes('/stock/')) {
                // Stock 페이지의 loadFavorites 함수 호출
                if (typeof loadFavorites === 'function') {
                    loadFavorites();
                }
            }
        } else {
            console.error('즐겨찾기 토글 실패:', data.error);
            alert(data.error || '즐겨찾기 처리 중 오류가 발생했습니다.');
        }
    } catch (error) {
        console.error('즐겨찾기 토글 오류:', error);
        alert('서버와 통신 중 오류가 발생했습니다.');
    }
};