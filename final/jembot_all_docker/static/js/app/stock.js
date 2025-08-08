// =================================================================================================
// 전역 함수들 (DOMContentLoaded 외부에서 접근 가능하도록)
// =================================================================================================

// 현재 검색된 회사명을 반환하는 함수 (전역)
    function getCurrentCompanyName() {
        if (window.lastSearchedCompany) {
            return window.lastSearchedCompany;
        }
        const companyNameElement = document.getElementById('companyName');
        if (companyNameElement && companyNameElement.textContent && companyNameElement.textContent !== '--') {
            return companyNameElement.textContent;
        }
        return null;
    }

// 차트 기간 변경 함수 (전역)
function updateStockChartByPeriod(period) {
        console.log(`stock.js: ${period} 기간 차트 업데이트 중...`);

    // 차트 로딩 메시지 표시
    showChartLoadingMessage();

        // 기존 차트가 있다면 제거
        if (window.stockChart) {
            window.stockChart.destroy();
        }

    // API에서 실제 데이터 가져오기 (차트만 업데이트하므로 loading=false)
        const currentCompanyName = getCurrentCompanyName();
        if (currentCompanyName) {
        fetchStockData(currentCompanyName, period, false); // loading=false로 설정
    }
}

// CSRF 토큰을 가져오는 함수
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// 로딩 메시지 표시
function showLoadingMessage() {
    const loadingMsg = document.getElementById("loadingMessage");
    const loadingWrapper = document.getElementById("stockEmptyState"); // 부모 요소

    if (loadingWrapper) {
        loadingWrapper.style.display = 'flex';  // 부모 보이게 설정
        loadingWrapper.style.flexDirection = 'column';
        loadingWrapper.style.alignItems = 'center';
        loadingWrapper.style.justifyContent = 'center';
    }

    if (loadingMsg) {
        loadingMsg.style.display = 'block';
        loadingMsg.style.justifyContent = 'center';
        loadingMsg.style.alignItems = 'center';
        loadingMsg.innerHTML = `<div class="stock-placeholder"><i class="bi bi-hourglass-split"></i><div>데이터를 불러오는 중...</div></div>`;
    }

    // 나머지 요소들 숨기기
    const emptyStateIcon = document.querySelector('.empty-state-icon');
    const emptyStateText = document.querySelector('.empty-state-text');
    if (emptyStateIcon) emptyStateIcon.style.display = 'none';
    if (emptyStateText) emptyStateText.style.display = 'none';

    const stockInfoDisplay = document.getElementById('stockInfoDisplay');
    const stockChartContainer = document.getElementById('stockChartContainer');
    const periodSelector = document.querySelector('.stock-period-selector');
    const chartDetails = document.querySelector('.chart-details');
    const jembotSummaryContainer = document.getElementById('jembotSummaryContainer');

    if (stockInfoDisplay) stockInfoDisplay.style.display = 'none';
    if (stockChartContainer) stockChartContainer.style.display = 'none';
    if (periodSelector) periodSelector.style.display = 'none';
    if (chartDetails) chartDetails.style.display = 'none';
    if (jembotSummaryContainer) jembotSummaryContainer.style.display = 'none';
}

// 로딩 메시지 숨기기
    function hideLoadingMessage() {
    const loadingMsg = document.getElementById("loadingMessage");
    if (loadingMsg) {
        loadingMsg.style.display = "none";
    }
}

// 차트 로딩 메시지 표시
function showChartLoadingMessage() {
    const chartLoadingMsg = document.getElementById("chartLoadingMessage");
    if (chartLoadingMsg) {
        chartLoadingMsg.style.display = "block";
    }
}

// 차트 로딩 메시지 숨기기
function hideChartLoadingMessage() {
    const chartLoadingMsg = document.getElementById("chartLoadingMessage");
    if (chartLoadingMsg) {
        chartLoadingMsg.style.display = "none";
    }
}

    // --- API에서 주식 데이터 가져오기 ---
    function fetchStockData(companyName, period, loading=true, showSuggestionsOnError=true) {
    console.log(`fetchStockData 함수 호출됨: ${companyName}, ${period}, loading=${loading}, showSuggestionsOnError=${showSuggestionsOnError}`);
    
        // 원본 검색어 저장 (기간 버튼 클릭 시 사용)
        if (period === '1일') {  // 최초 검색 시에만 저장
            window.lastSearchedCompany = companyName;
        }

        const periodMap = {
            '1일': '1d',
            '5일': '1w',
            '1개월': '1m',
            '6개월': '3m',
            '연중': '6m',
            '1년': '1y',
            '5년': '5y',
            '최대': 'max'
        };

        const apiPeriod = periodMap[period] || '1m';
        console.log(`stock.js: API 호출 - 기간: ${period}, API 기간: ${apiPeriod}`);

    if (loading) {
        showLoadingMessage();
        showReviewsLoading(); // 댓글 로딩 상태도 표시
    }

        fetch('/jembot/api/get-stock-info/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({
                query: companyName,
                period: apiPeriod
            })
        })
        .then(response => {
            console.log(`stock.js: API 응답 상태:`, response.status);
            return response.json();
        })
        .then(data => {
            console.log(`stock.js: API 응답 데이터:`, data);
            if (data.success) {
                console.log(`stock.js: API 성공 - UI 및 차트 업데이트 시작`);
                try {
                    hideSuggestions(); // 검색 성공 시 제안 숨기기
                    hideHeaderSuggestions(); // 헤더 제안도 숨기기
                    
                    if (loading) {
                        // 전체 로딩인 경우 (새로운 주식 검색)
                    showStockInfo(); // 검색 결과 표시
                    updateStockUI(data);
                    }
                    // 차트는 항상 업데이트 (기간 변경 시에도)
                    updateStockChart(data.chartData);
                } catch (error) {
                    console.error('UI/차트 업데이트 오류:', error);
                }
                hideLoadingMessage();
            } else {
            console.log(` API 오류: ${data.error}`);
            hideLoadingMessage();
            
            // 제안 표시 (최초 검색 시에만, 그리고 showSuggestionsOnError가 true일 때만)
            if (showSuggestionsOnError && period === '1일' && data.suggestions && data.suggestions.length > 0) {
                console.log('검색 제안 표시 시도:', data.suggestions);
                try {
                        showSuggestions(data.suggestions);
                        showHeaderSuggestions(data.suggestions);
                } catch (error) {
                    console.error('검색 제안 표시 오류:', error);
                    }
                } else {
                // 제안이 없거나 기간 변경인 경우 제안 숨기기
                    hideSuggestions();
                    hideHeaderSuggestions();
                }
            }
        })
        .catch(error => {
        console.log(` API 호출 오류:`, error);
            hideLoadingMessage();
            });
    }

// KRX 코드로 주식 정보를 가져오는 함수
function fetchStockDataByCode(krxCode, period, loading=true) {
    console.log(`fetchStockDataByCode 함수 호출됨: ${krxCode}, ${period}, loading=${loading}`);
    
    if (loading) {
        showLoadingMessage();
    }

    // 기간 매핑
    const periodMap = {
        '1일': '1d',
        '5일': '1w',
        '1개월': '1m',
        '6개월': '6m',
        '연중': '6m',
        '1년': '1y',
        '5년': '5y',
        '최대': 'max'
    };

    const apiPeriod = periodMap[period] || '1m';

    fetch('/jembot/api/get-stock-info-by-code/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({
            code: krxCode,
            period: apiPeriod
        })
    })
    .then(response => {
        console.log(`stock.js: API 응답 상태:`, response.status);
        return response.json();
    })
    .then(data => {
        console.log(`stock.js: API 응답 데이터:`, data);
        if (data.success) {
            console.log(`stock.js: API 성공 - UI 및 차트 업데이트 시작`);
            try {
                hideSuggestions(); // 검색 성공 시 제안 숨기기
                hideHeaderSuggestions(); // 헤더 제안도 숨기기
                
                if (loading) {
                    // 전체 로딩인 경우 (새로운 주식 검색)
                    showStockInfo(); // 검색 결과 표시
                    updateStockUI(data);
                    
                    // 헤더 검색창에 공식 회사명 표시
                    const headerSearchInput = document.getElementById('headerStockSearchInput');
                    if (headerSearchInput && data.companyName) {
                        headerSearchInput.value = data.companyName;
                        console.log(`KRX 코드 검색 후 헤더 검색창 업데이트: ${data.companyName}`);
                    }
                }
                // 차트는 항상 업데이트 (기간 변경 시에도)
                updateStockChart(data.chartData);
            } catch (error) {
                console.error('UI/차트 업데이트 오류:', error);
            }
            hideLoadingMessage();
        } else {
            console.log(` API 오류: ${data.error}`);
            hideLoadingMessage();
        }
    })
    .catch(error => {
        console.log(` API 호출 오류:`, error);
            hideLoadingMessage();
            });
    }

// RAG 분석 함수
function rag(title) {
    console.log(`rag 함수 호출됨: ${title}`);
    const rag_result = document.querySelector(".jembot-summary-item");
    if (rag_result) {
        rag_result.textContent = '분석중입니다...';
        console.log('RAG 분석 시작 메시지 표시 완료');
    } else {
        console.error('jembot-summary-item 요소를 찾을 수 없습니다');
    }
    
    fetch('/jembot/get-stock-rag/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({title: title})
    })
    .then((response) => {
        if (!response.ok) {
            throw new Error("HTTP 오류 상태: " + response.status);
        }
        return response.json();
    })
    .then((data) => {
        const markdownText = data['answer'] || "분석 결과가 없습니다.";
        // 마크다운을 HTML로 변환
        const htmlContent = convertMarkdownToHtml(markdownText);
        rag_result.innerHTML = htmlContent;
    })
    .catch((error) => {
        console.error("에러 발생:", error);
        rag_result.textContent = "서버 오류가 발생했습니다. 다시 시도해주세요.";
    });
}

// 마크다운을 HTML로 변환하는 함수
function convertMarkdownToHtml(markdown) {
    if (!markdown) return '';
    
    // 간단한 마크다운 변환 (개선 필요 시 marked.js 등 라이브러리 사용)
    return markdown
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  // **굵은 글씨**
        .replace(/\*(.*?)\*/g, '<em>$1</em>')              // *기울임*
        .replace(/### (.*?)(\n|$)/g, '<h3>$1</h3>')        // ### 제목3
        .replace(/## (.*?)(\n|$)/g, '<h2>$1</h2>')         // ## 제목2
        .replace(/# (.*?)(\n|$)/g, '<h1>$1</h1>')          // # 제목1
        .replace(/\n/g, '<br>')                            // 줄바꿈
        .replace(/- (.*?)(<br>|$)/g, '<li>$1</li>')        // - 리스트
        .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');        // 리스트 감싸기
}

// --- 주식 UI 업데이트 함수 (전역 스코프) ---
    function updateStockUI(data) {
        console.log('stock.js: UI 업데이트 시작 - 데이터:', data);

    // 주식 정보 영역 표시
    showStockInfo();
    console.log('주식 정보 영역 표시 완료');

        // 회사명 업데이트
        const companyNameElement = document.getElementById('companyName');
        if (companyNameElement) {
            companyNameElement.textContent = data.companyName;
        }

        // 주식 코드 업데이트
        const stockSymbolElement = document.getElementById('stockSymbol');
        if (stockSymbolElement) {
            stockSymbolElement.textContent = data.code;
        }

    // 즐겨찾기 버튼 표시 및 설정 (DOM 렌더링 후 실행)
    setTimeout(() => {
        // Yahoo Finance 코드에서 KRX 코드 추출 (예: 122350.KQ -> 122350)
        const krxCode = data.code.replace('.KS', '').replace('.KQ', '');
        const stockName = data.companyName || 'Unknown Stock';
        setupStockFavoriteButton(krxCode, stockName);
    }, 100);
    
    // 추가 안전장치: 더 긴 지연 후 재확인
    setTimeout(() => {
        const btn = document.getElementById('stockFavoriteBtn');
        if (btn && btn.style.display === 'none') {
            console.log('즐겨찾기 버튼이 숨겨져 있음, 다시 표시');
            btn.style.display = 'inline-flex';
            btn.style.visibility = 'visible';
            btn.style.opacity = '1';
        }
    }, 500);

        // 관련 종목 표시
        if (data.relatedStocks && data.relatedStocks.length > 0) {
            showRelatedStocks(data.relatedStocks);
        } else {
            hideRelatedStocks();
        }

        // 현재 가격 정보 업데이트
        const currentPriceElement = document.getElementById('currentPrice');
        if (currentPriceElement) {
            currentPriceElement.textContent = `₩${data.latestPrice}`;
        }

        // 가격 변동 정보 업데이트
        const priceChangeElement = document.getElementById('priceChange');
        if (priceChangeElement) {
            const isPositive = data.priceChange.startsWith('+');
            priceChangeElement.textContent = `${data.priceChange} (${data.changePercent}%) ${isPositive ? '↑' : '↓'} 오늘`;
            priceChangeElement.className = `price-change ${isPositive ? 'positive' : 'negative'}`;
        }

        // 업데이트 시간 업데이트
        const updateTimeElement = document.getElementById('updateTime');
        if (updateTimeElement) {
            const now = new Date();
            const timeString = now.toLocaleString('ko-KR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            updateTimeElement.textContent = `Updated: ${timeString} KST`;
        }

        // 상세 정보 업데이트
        const dayHighElement = document.getElementById('dayHigh');
        if (dayHighElement) dayHighElement.textContent = data.dayHigh;

        const fiftyTwoWeekHighElement = document.getElementById('fiftyTwoWeekHigh');
        if (fiftyTwoWeekHighElement) fiftyTwoWeekHighElement.textContent = data.fiftyTwoWeekHigh;

        const fiftyTwoWeekLowElement = document.getElementById('fiftyTwoWeekLow');
        if (fiftyTwoWeekLowElement) fiftyTwoWeekLowElement.textContent = data.fiftyTwoWeekLow;

        const marketCapElement = document.getElementById('marketCap');
        if (marketCapElement) marketCapElement.textContent = data.marketCap;

        const perLabelElement = document.getElementById('perLabel');
        if (perLabelElement) perLabelElement.textContent = data.per_label;

        const perValueElement = document.getElementById('perValue');
        if (perValueElement) perValueElement.textContent = data.per_value;

        const volumeElement = document.getElementById('volume');
        if (volumeElement) volumeElement.textContent = data.volume;

                           console.log('stock.js: UI 업데이트 완료');

        // API 데이터 저장 (인기 종목용)
        window.lastStockData = data;

        // 주식 정보가 업데이트되면 해당 주식의 댓글도 로드
        showReviewsLoading(); // 댓글 로딩 상태 표시
        loadReviews();
    }

// --- 실제 차트 데이터로 차트 업데이트 함수 (전역 스코프) ---
    function updateStockChart(chartData) {
        console.log(`stock.js: 차트 업데이트 시작 - 데이터:`, chartData);

        // 차트 로딩 메시지 숨기기
        hideChartLoadingMessage();

        // 기존 차트가 있다면 제거
        if (window.stockChart && typeof window.stockChart.destroy === 'function') {
            console.log('stock.js: 기존 차트 제거 중...');
            window.stockChart.destroy();
            window.stockChart = null;
        } else if (window.stockChart) {
            console.log('stock.js: 기존 차트 객체가 있지만 destroy 메서드가 없음');
            window.stockChart = null;
        }

        const ctx = document.getElementById('stockChart');
        if (ctx && chartData && Chart) {
            try {
                window.stockChart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: chartData.labels,
                        datasets: [{
                            label: '주가',
                            data: chartData.data,
                                                           borderColor: '#007bff',
                               backgroundColor: 'rgba(0, 123, 255, 0.1)',
                               borderWidth: 2,
                               fill: true,
                               tension: 0,
                            pointBackgroundColor: '#007bff',
                            pointBorderColor: '#fff',
                            pointBorderWidth: 2,
                            pointRadius: 0, // 기본적으로 점 숨김
                            pointHoverRadius: 6, // 호버 시에만 점 표시
                            pointHoverBackgroundColor: '#007bff',
                            pointHoverBorderColor: '#fff',
                            pointHoverBorderWidth: 2
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: false
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: false,
                                grid: {
                                    color: 'rgba(0, 0, 0, 0.05)',
                                    drawBorder: false
                                },
                                ticks: {
                                    color: '#6c757d',
                                    font: {
                                        size: 12
                                    },
                                    callback: function(value) {
                                        return '₩' + value.toLocaleString();
                                    }
                                }
                            },
                            x: {
                                grid: {
                                    display: false
                                },
                                ticks: {
                                    color: '#6c757d',
                                    font: {
                                        size: 12
                                    }
                                }
                            }
                        },
                        interaction: {
                            intersect: false,
                            mode: 'index'
                        },
                        elements: {
                            point: {
                                hoverBackgroundColor: '#007bff'
                            }
                        }
                    }
                });
                console.log('stock.js: 차트 생성 완료');
            } catch (error) {
                console.error('stock.js: 차트 생성 오류:', error);
                window.stockChart = null;
            }
        } else {
            console.error('stock.js: 차트 생성 실패 - ctx:', !!ctx, 'chartData:', !!chartData, 'Chart:', !!Chart);
        }
    }

// =================================================================================================
// DOMContentLoaded 이벤트
// =================================================================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log("stock.js: DOM 로드 완료");

    // --- 댓글 시간 업데이트 함수 ---
    function formatTimeAgo(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) return '방금 전';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}시간 전`;
        return `${Math.floor(diffInSeconds / 86400)}일 전`;
    }

    function updateCommentTimes() {
        const timeElements = document.querySelectorAll('.comment-time');
        timeElements.forEach(element => {
            const timestamp = element.getAttribute('data-timestamp');
            if (timestamp) {
                const date = new Date(parseInt(timestamp));
                element.textContent = formatTimeAgo(date);
            }
        });
    }



    // --- 차트 업데이트 함수 (기간 변경용) ---


    // --- 중복 함수들 제거됨 - 전역 스코프에 정의됨 ---
    // fetchStockData, rag, convertMarkdownToHtml, updateStockUI, updateStockChart는 전역에서 사용

    // 페이지 로드 시 초기 상태 표시
    showEmptyState();

    // --- 헤더 검색 기능 ---
    const headerSearchInput = document.getElementById('headerStockSearchInput');
    const headerSearchBtn = document.getElementById('headerStockSearchBtn');
    const headerSearch = document.getElementById('headerSearch');

    console.log('헤더 검색 요소 확인:', {
        headerSearch, 
        headerSearchInput, 
        headerSearchBtn
    });

    // 주식 페이지에서 헤더 검색창 표시
    if (headerSearch) {
        headerSearch.style.display = 'block';
        headerSearch.style.visibility = 'visible';
        headerSearch.style.opacity = '1';
        console.log('헤더 검색창 표시 완료');
    } else {
        console.error('헤더 검색창 요소를 찾을 수 없습니다!');
    }

    if (headerSearchInput && headerSearchBtn) {
        console.log('헤더 검색 이벤트 리스너 설정 시작');
        
        // 검색 버튼 클릭 이벤트
        headerSearchBtn.addEventListener('click', function() {
            console.log('헤더 검색 버튼 클릭됨');
            const searchTerm = headerSearchInput.value.trim();
            console.log('검색어:', searchTerm);
            if (searchTerm) {
                console.log(`stock.js: 헤더 검색어 "${searchTerm}"로 주식 검색 시작`);
                fetchStockData(searchTerm, '1일');
                rag(searchTerm);
            } else {
                console.log('검색어가 비어있습니다');
            }
        });

        // Enter 키 이벤트
        headerSearchInput.addEventListener('keydown', function(event) {
            if (event.key === 'Enter') {
                console.log('헤더 검색창 Enter 키 눌림');
                event.preventDefault(); // 기본 동작 방지
                const searchTerm = headerSearchInput.value.trim();
                console.log('Enter 키 검색어:', searchTerm);
                if (searchTerm) {
                    console.log(`stock.js: 헤더 Enter 키로 검색어 "${searchTerm}" 검색`);
                    hideHeaderSuggestions(); // 제안 목록 숨기기
                    fetchStockData(searchTerm, '1일');
                    rag(searchTerm);
                } else {
                    console.log('Enter 키: 검색어가 비어있습니다');
                }
            }
        });

        // 포커스 아웃 이벤트 (제안 숨기기)
        headerSearchInput.addEventListener('blur', function() {
            setTimeout(() => {
                hideHeaderSuggestions();
            }, 200); // 클릭 이벤트가 먼저 실행되도록 지연
        });
        
        console.log('헤더 검색 이벤트 리스너 설정 완료');
    } else {
        console.error('헤더 검색 입력 또는 버튼 요소를 찾을 수 없습니다!', {
            headerSearchInput: !!headerSearchInput,
            headerSearchBtn: !!headerSearchBtn
        });
    }



    // --- 즐겨찾기 목록 로드 ---
    loadFavorites();

    // --- URL 파라미터 확인 및 자동 검색 ---
    checkUrlParametersAndAutoSearch();

    // --- 댓글 시간 업데이트 시작 ---
    updateCommentTimes();
    setInterval(updateCommentTimes, 60000); // 1분마다 업데이트

    // ===================== 댓글 기능 초기화 =====================
    // 댓글 입력 버튼 이벤트
    const reviewSubmitBtn = document.getElementById('reviewSubmitBtn');
    if (reviewSubmitBtn) {
        reviewSubmitBtn.addEventListener('click', addReview);
    }
    // 엔터로 댓글 등록
    const reviewInput = document.getElementById('reviewInput');
    if (reviewInput) {
        reviewInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                addReview();
            }
        });
    }
    // 주식 정보가 로드될 때마다 댓글도 자동 로드 (최초 1회)
    loadReviews();

    // ===================== 기간 선택 버튼 이벤트 리스너 =====================
    const chartPeriodButtons = document.querySelectorAll('.stock-period-selector button');
    chartPeriodButtons.forEach(button => {
        button.addEventListener('click', function() {
            const period = this.textContent.trim();
            console.log(`기간 선택: ${period}`);
            
            // 모든 버튼에서 active 클래스 제거
            chartPeriodButtons.forEach(btn => btn.classList.remove('active'));
            // 클릭된 버튼에 active 클래스 추가
            this.classList.add('active');
            
            updateStockChartByPeriod(period);
        });
    });

    console.log("stock.js: 스크립트 실행 완료");
});

// --- 초기 상태 표시 ---
function showEmptyState() {
    const emptyState = document.getElementById('stockEmptyState');
    const stockInfoDisplay = document.getElementById('stockInfoDisplay');
    const stockChartContainer = document.getElementById('stockChartContainer');
    const periodSelector = document.querySelector('.stock-period-selector');
    const chartDetails = document.querySelector('.chart-details');

    if (emptyState) emptyState.style.display = 'flex';
    if (stockInfoDisplay) stockInfoDisplay.style.display = 'none';
    if (stockChartContainer) stockChartContainer.style.display = 'none';
    if (periodSelector) periodSelector.style.display = 'none';
    if (chartDetails) chartDetails.style.display = 'none';
}

// --- 검색 결과 표시 ---
function showStockInfo() {
    const emptyState = document.getElementById('stockEmptyState');
    const stockInfoDisplay = document.getElementById('stockInfoDisplay');
    const stockChartContainer = document.getElementById('stockChartContainer');
    const periodSelector = document.querySelector('.stock-period-selector');
    const chartDetails = document.querySelector('.chart-details');
    const rankingContainer = document.getElementById('rankingContainer');
    const popularStocksContainer = document.getElementById('popularStocksContainer');
    const jembotSummaryContainer = document.getElementById('jembotSummaryContainer');
    // stockSearch 변수 제거됨 - 헤더 검색창만 사용

    if (emptyState) emptyState.style.display = 'none';
    if (stockInfoDisplay) stockInfoDisplay.style.display = 'flex';
    if (stockChartContainer) stockChartContainer.style.display = 'block';
    if (periodSelector) periodSelector.style.display = 'flex';
    if (chartDetails) chartDetails.style.display = 'flex';
    if (jembotSummaryContainer) jembotSummaryContainer.style.display = 'block';
    // stockSearch 제거됨 - 헤더 검색창만 사용
    
    console.log('모든 주식 정보 요소 표시 완료');
}

// --- 검색 제안 표시 ---
function showSuggestions(suggestions) {
    // 헤더 검색 제안 요소 사용
    const suggestionsContainer = document.getElementById('headerSearchSuggestions');
    const suggestionsList = document.getElementById('headerSuggestionsList');
    
    if (!suggestionsContainer || !suggestionsList) {
        console.error('헤더 검색 제안 요소를 찾을 수 없습니다!');
        return;
    }

    console.log('검색 제안 표시:', suggestions.length, '개');
    console.log('검색 제안 목록:', suggestions);

    let suggestionsHtml = '';
    suggestions.forEach(suggestion => {
        suggestionsHtml += `<div class="suggestion-item">${suggestion}</div>`;
    });

    suggestionsList.innerHTML = suggestionsHtml;
    suggestionsContainer.style.display = 'block';

    // 제안 항목 클릭 이벤트 추가
    const suggestionItems = suggestionsList.querySelectorAll('.suggestion-item');
    suggestionItems.forEach(item => {
            item.addEventListener('click', function() {
            const selectedSuggestion = this.textContent;
            console.log('제안 선택됨:', selectedSuggestion);

            // 헤더 검색창에 선택된 제안 입력
                const headerSearchInput = document.getElementById('headerStockSearchInput');
                if (headerSearchInput) {
                headerSearchInput.value = selectedSuggestion;
                }

            // 검색 실행
            fetchStockData(selectedSuggestion, '1일');
            rag(selectedSuggestion);
            
            // 제안 숨기기
                hideSuggestions();
                hideHeaderSuggestions();
            });
        });
}

// --- 검색 제안 숨기기 ---
function hideSuggestions() {
    // 헤더 검색 제안 요소 사용
    const suggestionsContainer = document.getElementById('headerSearchSuggestions');
    if (suggestionsContainer) {
        suggestionsContainer.style.display = 'none';
    }
}

// --- 헤더 검색 제안 표시 ---
function showHeaderSuggestions(suggestions) {
    const suggestionsContainer = document.getElementById('headerSearchSuggestions');
    const suggestionsList = document.getElementById('headerSuggestionsList');

    if (suggestionsContainer && suggestionsList && suggestions && suggestions.length > 0) {
        suggestionsList.innerHTML = '';

        suggestions.forEach(company => {
            const item = document.createElement('div');
            item.className = 'header-suggestion-item';
            item.textContent = company;
            item.addEventListener('click', function() {
                console.log(`헤더 검색 제안 클릭: ${company}`);

                const headerSearchInput = document.getElementById('headerStockSearchInput');
                if (headerSearchInput) {
                    headerSearchInput.value = company;
                    console.log(`headerSearchInput에 값 설정: ${company}`);
                }
                hideHeaderSuggestions();
                hideSuggestions(); // 다른 검색 제안도 숨기기
                console.log(`헤더 검색 실행: ${company}`);
                fetchStockData(company, '1일');
            });
            suggestionsList.appendChild(item);
        });

        suggestionsContainer.style.display = 'block';
    }
}

// --- 헤더 검색 제안 숨기기 ---
function hideHeaderSuggestions() {
    const suggestionsContainer = document.getElementById('headerSearchSuggestions');
    if (suggestionsContainer) {
        suggestionsContainer.style.display = 'none';
    }
}




// --- 관련 종목 표시 ---
function showRelatedStocks(relatedStocks) {
    const relatedStocksContainer = document.getElementById('relatedStocks');
    const relatedStocksList = document.getElementById('relatedStocksList');

    if (relatedStocksContainer && relatedStocksList) {
        relatedStocksList.innerHTML = '';

        relatedStocks.forEach(stock => {
            const stockItem = document.createElement('div');
            stockItem.className = 'related-stock-item';
            stockItem.addEventListener('click', function() {
                console.log(`관련 종목 클릭: ${stock.name}`);

                // 헤더 검색창에 값 설정
                const headerSearchInput = document.getElementById('headerStockSearchInput');
                // stockSearchInput 제거됨 - 헤더 검색창만 사용

                if (headerSearchInput) {
                    headerSearchInput.value = stock.name;
                    console.log(`headerSearchInput에 값 설정: ${stock.name}`);
                }
                // stockSearchInput 제거됨 - 헤더 검색창만 사용

                // 검색 제안들 숨기기
                hideSuggestions();
                hideHeaderSuggestions();

                console.log(`관련 종목 검색 실행: ${stock.name}`);
                fetchStockData(stock.name, '1일');
            });

            stockItem.innerHTML = `
                <span class="related-stock-name">${stock.name}</span>
                <span class="related-stock-code">${stock.code}</span>
            `;

            relatedStocksList.appendChild(stockItem);
        });

        relatedStocksContainer.style.display = 'block';
        console.log('stock.js: 관련 종목 표시 완료');
    }
}

// --- 관련 종목 숨김 ---
function hideRelatedStocks() {
    const relatedStocksContainer = document.getElementById('relatedStocks');
    if (relatedStocksContainer) {
        relatedStocksContainer.style.display = 'none';
    }
}

// --- URL 파라미터 확인 및 자동 검색 함수 ---
function checkUrlParametersAndAutoSearch() {
    const urlParams = new URLSearchParams(window.location.search);
    const searchTerm = urlParams.get('search'); // 간단하게 'search' 파라미터만 확인
    
    if (searchTerm) {
        console.log(`stock.js: 메인 페이지에서 전달받은 검색어: "${searchTerm}"`);
        
        // 검색어를 입력창에 설정 (헤더 검색창만)
        setTimeout(() => {
            const headerSearchInput = document.getElementById('headerStockSearchInput');
            if (headerSearchInput) {
                headerSearchInput.value = searchTerm;
                console.log(`stock.js: 검색어 설정 완료: ${searchTerm}`);
                
                // 기존 검색 버튼 클릭 시뮬레이션 (기존 로직 활용)
                const searchBtn = document.getElementById('headerStockSearchBtn');
                if (searchBtn) {
                    searchBtn.click();
                }
            }
            
            // URL 파라미터 제거
            window.history.replaceState({}, document.title, window.location.pathname);
        }, 500);
    }
}

// =================================================================================================
// 즐겨찾기 관련 함수들
// =================================================================================================

/**
 * 즐겨찾기 목록을 서버에서 로드합니다.
 */
async function loadFavorites() {
    console.log('즐겨찾기 목록 로드 시작...');
    
    // 요소 존재 확인
    const favoritesContent = document.getElementById('favorites-content');
    if (!favoritesContent) {
        console.error('favorites-content 요소를 찾을 수 없습니다!');
        return;
    }
    
    try {
        console.log('API 호출 시작: /jembot/api/favorites/');
        const response = await fetch('/jembot/api/favorites/', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken()
            },
            credentials: 'same-origin'
        });
        
        console.log('API 응답 상태:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('API 응답 데이터:', data);
        
        if (data.success) {
            console.log(`즐겨찾기 ${data.count}개 로드 완료`);
            displayFavorites(data.favorites);
        } else {
            console.error('즐겨찾기 로드 실패:', data.error);
            showEmptyFavorites();
        }
    } catch (error) {
        console.error('즐겨찾기 로드 오류:', error);
        
        // 오류 상태에 따른 메시지 표시
        const favoritesContent = document.getElementById('favorites-content');
        if (favoritesContent) {
            if (error.message.includes('401') || error.message.includes('403')) {
                favoritesContent.innerHTML = `
                    <div class="favorites-placeholder" style="text-align: center; padding: 20px; color: #666; font-size: 14px;">
                        <i class="bi bi-exclamation-circle" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
                        즐겨찾기를 보려면 로그인이 필요합니다.
                    </div>
                `;
            } else {
                favoritesContent.innerHTML = `
                    <div class="favorites-placeholder" style="text-align: center; padding: 20px; color: #666; font-size: 14px;">
                        <i class="bi bi-wifi-off" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
                        즐겨찾기 목록을 불러올 수 없습니다.<br>
                        <small>오류: ${error.message}</small>
                    </div>
                `;
            }
        }
    }
}

/**
 * 즐겨찾기 목록을 화면에 표시합니다.
 * @param {Array} favorites - 즐겨찾기 배열
 */
function displayFavorites(favorites) {
    const favoritesContent = document.getElementById('favorites-content');
    if (!favoritesContent) {
        console.error('즐겨찾기 컨테이너를 찾을 수 없습니다!');
        return;
    }

    console.log('displayFavorites 호출됨:', favorites);
    
    if (!favorites || favorites.length === 0) {
        console.log('즐겨찾기가 없음, 빈 상태 표시');
        showEmptyFavorites();
        return;
    }

    // 즐겨찾기가 있을 때는 empty-favorites 클래스 제거
    favoritesContent.classList.remove('empty-favorites');
    
    // 즐겨찾기 목록 HTML 생성
    let favoritesHtml = '';
    favorites.forEach(favorite => {
        // 원본 KRX 코드 사용 (Yahoo Finance 변환 제거)
        favoritesHtml += `
            <div class="favorite-list__box" data-stock-code="${favorite.code}" data-stock-name="${favorite.name}">
                <div class="favorite-list__title">${favorite.name}</div>
                <div class="favorite-list__code">${favorite.code}</div>
                <div class="favorite-heart active">
                    <i class="bi bi-heart-fill"></i>
                    <span class="like-count">${favorite.favorite_count || 0}</span>
                </div>
            </div>
        `;
    });

    favoritesContent.innerHTML = favoritesHtml;

    // 즐겨찾기 항목 클릭 이벤트 추가
    const favoriteBoxes = favoritesContent.querySelectorAll('.favorite-list__box');
    favoriteBoxes.forEach(box => {
        box.addEventListener('click', handleFavoriteClick);
        
        // 하트 아이콘 클릭 이벤트 추가 (실제 DB 삭제)
        const favoriteHeart = box.querySelector('.favorite-heart');
        if (favoriteHeart) {
            favoriteHeart.addEventListener('click', (event) => {
                event.stopPropagation(); // 부모 클릭 이벤트 방지
                handleFavoriteRemove(box);
            });
        }
    });

    console.log(`즐겨찾기 ${favorites.length}개 표시 완료`);
}

/**
 * 즐겨찾기가 없을 때 빈 상태를 표시합니다.
 */
function showEmptyFavorites() {
    const favoritesContent = document.getElementById('favorites-content');
    if (favoritesContent) {
        // 즐겨찾기가 없을 때 중앙 정렬을 위한 클래스 추가
        favoritesContent.classList.add('empty-favorites');
        
        favoritesContent.innerHTML = `
            <div class="favorites-placeholder" style="text-align: center; padding: 20px; color: #666; font-size: 14px;">
                <i class="bi bi-star" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
                즐겨찾기한<br> 
                주식이 없습니다.<br>
                주식을 즐겨찾기해보세요!
            </div>
        `;
    }
}

/**
 * 즐겨찾기 항목 클릭 시 주식 정보를 로드합니다.
 * @param {Event} event - 클릭 이벤트
 */
function handleFavoriteClick(event) {
    // 하트 아이콘 클릭 시에는 이벤트 전파 중단
    if (event.target.closest('.favorite-heart')) {
        return;
    }

    const box = event.currentTarget;
    const stockCode = box.dataset.stockCode;
    const stockName = box.dataset.stockName;
    
    console.log(`즐겨찾기 주식 클릭: ${stockName} (${stockCode})`);
    
    // 직접 검색 함수 호출 (헤더 검색창 시뮬레이션 대신)
    console.log('즐겨찾기 클릭 - 직접 검색 실행:', stockName);
    
    // 검색 제안들 숨기기
    hideSuggestions();
    hideHeaderSuggestions();
    
    // 헤더 검색창 업데이트는 API 응답 후에 수행 (즐겨찾기 목록에서 클릭 시에는 즉시 업데이트하지 않음)
    
    // KRX 코드를 사용하되 일반 검색과 동일한 API 사용 (일관성 보장)
    console.log('즐겨찾기 목록에서 KRX 코드로 검색 시작:', stockCode);
    
    // 로딩 메시지 표시
    showLoadingMessage();
    showReviewsLoading(); // 댓글 로딩 상태도 표시
    
    // KRX 코드를 사용해서 일반 검색 API 호출 (백엔드에서 코드로 회사명을 찾아서 처리)
    fetch('/jembot/api/get-stock-info/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({
            query: stockCode,  // KRX 코드를 query로 전송
            period: '1d'
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            hideSuggestions();
            hideHeaderSuggestions();
            showStockInfo();
            updateStockUI(data);
            updateStockChart(data.chartData);
            
            // 헤더 검색창에 공식 회사명 표시
            const headerSearchInput = document.getElementById('headerStockSearchInput');
            if (headerSearchInput && data.companyName) {
                headerSearchInput.value = data.companyName;
                console.log(`즐겨찾기 클릭 후 헤더 검색창 업데이트: ${data.companyName}`);
            }
        } else {
            console.error('즐겨찾기 클릭 검색 실패:', data.error);
        }
        hideLoadingMessage();
    })
    .catch(error => {
        console.error('즐겨찾기 클릭 검색 오류:', error);
        hideLoadingMessage();
    });
    
    console.log('rag 함수 호출 시작');
    rag(stockName);
}

/**
 * Stock 페이지에서 즐겨찾기 버튼을 설정합니다.
 * @param {string} stockCode - 주식 코드
 * @param {string} stockName - 주식 이름
 */
async function setupStockFavoriteButton(stockCode, stockName) {
    console.log(`즐겨찾기 버튼 설정 시작: ${stockName} (${stockCode})`);
    
    const favoriteBtn = document.getElementById('stockFavoriteBtn');
    const favoriteIcon = document.getElementById('stockFavoriteIcon');
    
    console.log('즐겨찾기 버튼 요소 찾기:', {favoriteBtn, favoriteIcon});
    
    if (!favoriteBtn || !favoriteIcon) {
        console.error('즐겨찾기 버튼 요소를 찾을 수 없습니다.');
        console.log('DOM 요소 확인:', {
            favoriteBtn: document.getElementById('stockFavoriteBtn'),
            favoriteIcon: document.getElementById('stockFavoriteIcon'),
            stockInfoDisplay: document.getElementById('stockInfoDisplay')
        });
        return;
    }

    // 버튼 표시 (강제로 보이게 설정)
    favoriteBtn.style.display = 'inline-flex';
    favoriteBtn.style.visibility = 'visible';
    favoriteBtn.style.opacity = '1';
    console.log('즐겨찾기 버튼 표시 완료:', favoriteBtn.style.display);
    
    // 현재 즐겨찾기 상태 확인
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
        
        const data = await response.json();
        if (data.success) {
            updateStockFavoriteIcon(favoriteIcon, data.is_favorite);
            console.log(`즐겨찾기 상태: ${data.is_favorite ? '활성' : '비활성'}`);
        }
    } catch (error) {
        console.error('즐겨찾기 상태 확인 오류:', error);
    }

    // 즐겨찾기 버튼 클릭 이벤트 (기존 이벤트 제거 후 새로 추가)
    const newFavoriteBtn = favoriteBtn.cloneNode(true);
    favoriteBtn.parentNode.replaceChild(newFavoriteBtn, favoriteBtn);
    const finalBtn = document.getElementById('stockFavoriteBtn');
    const finalIcon = document.getElementById('stockFavoriteIcon');
    
    // 최종 스타일 강제 적용
    finalBtn.style.display = 'inline-flex';
    finalBtn.style.visibility = 'visible';
    finalBtn.style.opacity = '1';
    finalBtn.style.position = 'relative';
    finalBtn.style.zIndex = '10';
    
    finalIcon.style.fontSize = '1.1rem';
    finalIcon.style.color = '#6c757d';
    
    finalBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Stock 페이지 즐겨찾기 버튼 클릭됨:', stockName);
        toggleStockFavorite(stockCode, stockName);
    });
    
    console.log('즐겨찾기 버튼 설정 완료 - 최종 확인:', {
        display: finalBtn.style.display,
        visibility: finalBtn.style.visibility,
        opacity: finalBtn.style.opacity
    });
}

/**
 * Stock 페이지에서 즐겨찾기 아이콘 상태를 업데이트합니다.
 * @param {HTMLElement} iconElement - 즐겨찾기 아이콘 요소
 * @param {boolean} isFavorite - 즐겨찾기 여부
 */
function updateStockFavoriteIcon(iconElement, isFavorite) {
    console.log(`Stock 페이지 즐겨찾기 아이콘 업데이트: ${isFavorite ? '활성' : '비활성'}`);
    if (isFavorite) {
        iconElement.className = 'bi bi-star-fill';
        // CSS에서 색상을 관리하므로 인라인 스타일 제거
        iconElement.style.color = '';
        iconElement.style.fontSize = '1.1rem';
    } else {
        iconElement.className = 'bi bi-star';
        // CSS에서 색상을 관리하므로 인라인 스타일 제거
        iconElement.style.color = '';
        iconElement.style.fontSize = '1.1rem';
    }
    console.log('Stock 아이콘 클래스:', iconElement.className);
}

/**
 * Stock 페이지에서 즐겨찾기 버튼을 토글합니다.
 * @param {string} stockCode - 주식 코드
 * @param {string} stockName - 주식 이름
 */
async function toggleStockFavorite(stockCode, stockName) {
    console.log(`즐겨찾기 토글 시작: ${stockName} (${stockCode})`);
    try {
        // 현재 즐겨찾기 상태 확인
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
        if (!checkData.success) {
            console.error('즐겨찾기 상태 확인 실패:', checkData.error);
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
            const favoriteIcon = document.getElementById('stockFavoriteIcon');
            if (favoriteIcon) {
                updateStockFavoriteIcon(favoriteIcon, !isFavorite);
            }
            
            // 즐겨찾기 목록 새로고침
            await loadFavorites();
            
            console.log(`즐겨찾기 토글 완료: ${stockName} ${!isFavorite ? '추가됨' : '제거됨'}`);
        } else {
            console.error('즐겨찾기 토글 실패:', data.error);
        }
    } catch (error) {
        console.error('즐겨찾기 토글 오류:', error);
    }
}

/**
 * 즐겨찾기 목록에서 주식을 제거합니다.
 * @param {HTMLElement} favoriteBox - 즐겨찾기 항목 요소
 */
async function handleFavoriteRemove(favoriteBox) {
    const stockCode = favoriteBox.dataset.stockCode;
    const stockName = favoriteBox.dataset.stockName;
    
    console.log(`즐겨찾기 제거 시작: ${stockName} (${stockCode})`);
    
    try {
        const response = await fetch('/jembot/api/favorites/remove/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken()
            },
            credentials: 'same-origin',
            body: JSON.stringify({ code: stockCode })
        });
        
        const data = await response.json();
        console.log('즐겨찾기 제거 응답:', data);
        
        if (data.success) {
            // 즐겨찾기 목록에서 항목 제거
            favoriteBox.remove();
            
            // 즐겨찾기 수 업데이트 (제거된 항목의 카운트는 0이 되므로 업데이트 불필요)
            // 대신 즐겨찾기 목록이 비어있는지 확인
            const remainingFavorites = document.querySelectorAll('.favorite-list__box');
            if (remainingFavorites.length === 0) {
                showEmptyFavorites();
            }
            
            console.log(`즐겨찾기 제거 완료: ${stockName}`);
        } else {
            console.error('즐겨찾기 제거 실패:', data.error);
        }
    } catch (error) {
        console.error('즐겨찾기 제거 오류:', error);
    }
}

/**
 * 즐겨찾기에서 실제로 제거합니다 (DB 연동)
 * @param {HTMLElement} favoriteBox - 즐겨찾기 항목 요소
 */
async function handleFavoriteRemove(favoriteBox) {
    const stockCode = favoriteBox.dataset.stockCode;
    const stockName = favoriteBox.dataset.stockName;
    
    console.log(`즐겨찾기에서 제거 시도: ${stockName} (${stockCode})`);
    
    try {
        const response = await fetch('/jembot/api/favorites/remove/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken()
            },
            credentials: 'same-origin',
            body: JSON.stringify({ code: stockCode })
        });
        
        const data = await response.json();
        if (data.success) {
            // DB에서 삭제 성공 → 화면에서도 제거
            favoriteBox.style.transition = 'all 0.3s ease';
            favoriteBox.style.opacity = '0';
            favoriteBox.style.transform = 'translateX(-100%)';
            
            setTimeout(() => {
                favoriteBox.remove();
                
                // 즐겨찾기가 모두 제거되었는지 확인
                const remainingFavorites = document.querySelectorAll('#favorites-content .favorite-list__box');
                if (remainingFavorites.length === 0) {
                    showEmptyFavorites();
                }
            }, 300);
            
            console.log(`즐겨찾기에서 ${stockName} 제거 완료`);
        } else {
            alert(data.error || '즐겨찾기 제거에 실패했습니다.');
        }
    } catch (error) {
        console.error('즐겨찾기 제거 오류:', error);
        alert('서버와 통신 중 오류가 발생했습니다.');
    }
}

/**
 * 즐겨찾기 추가/제거 시 즐겨찾기 수를 업데이트합니다.
 * @param {string} stockCode - 주식 코드
 * @param {boolean} isAdd - 추가 여부 (true: 추가, false: 제거)
 */
async function updateFavoriteCount(stockCode, isAdd) {
    try {
        const response = await fetch('/jembot/api/favorites/count/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken()
            },
            credentials: 'same-origin',
            body: JSON.stringify({ code: stockCode })
        });
        
        const data = await response.json();
        if (data.success) {
            // 즐겨찾기 목록에서 해당 주식의 카운트 업데이트
            const favoriteBoxes = document.querySelectorAll('.favorite-list__box');
            favoriteBoxes.forEach(box => {
                if (box.dataset.stockCode === stockCode) {
                    const likeCount = box.querySelector('.like-count');
                    if (likeCount) {
                        likeCount.textContent = data.favorite_count;
                    }
                }
            });
            
            console.log(`즐겨찾기 수 업데이트: ${stockCode} -> ${data.favorite_count}`);
        }
    } catch (error) {
        console.error('즐겨찾기 수 업데이트 오류:', error);
    }
}

/**
 * CSRF 토큰을 가져오는 함수
 */
function getCsrfToken() {
    const csrfMeta = document.querySelector('meta[name="csrf-token"]');
    if (csrfMeta) {
        return csrfMeta.getAttribute('content') || csrfMeta.content;
    }
    // fallback: 쿠키에서 가져오기
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'csrftoken') {
            return value;
        }
    }
    return '';
}

// =================================================================================================
// 댓글 관련 함수들
// =================================================================================================

/**
 * 현재 주식의 댓글 목록을 로드합니다.
 */
async function loadReviews() {
    const currentCompanyName = getCurrentCompanyName();
    if (!currentCompanyName) {
        console.log('현재 주식 정보가 없어 댓글을 로드할 수 없습니다.');
        return;
    }
    
    // 주식 코드 가져오기 (회사명 대신 코드 사용)
    const stockSymbolElement = document.getElementById('stockSymbol');
    const stockCode = stockSymbolElement ? stockSymbolElement.textContent : null;
    
    if (!stockCode) {
        console.log('주식 코드를 찾을 수 없어 댓글을 로드할 수 없습니다.');
        return;
    }
    
    // Yahoo Finance 코드에서 KRX 코드 추출 (예: 066570.KS -> 066570)
    const krxCode = stockCode.replace('.KS', '').replace('.KQ', '');
    
    console.log(`댓글 로드 시작: ${currentCompanyName} (코드: ${krxCode})`);
    
    try {
        const response = await fetch('/jembot/api/reviews/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken()
            },
            credentials: 'same-origin',
            body: JSON.stringify({ code: krxCode })
        });
        
        const data = await response.json();
        console.log('댓글 데이터:', data);
        if (data.success) {
            if (data.reviews && data.reviews.length > 0) {
                displayReviews(data.reviews);
            } else {
                showEmptyReviews();
            }
            updateReviewCount(data.review_count || 0);
        } else {
            console.error('댓글 로드 실패:', data.error);
            showEmptyReviews();
            updateReviewCount(0);
        }
    } catch (error) {
        console.error('댓글 로드 오류:', error);
        showEmptyReviews();
    }
}

/**
 * 댓글 목록을 화면에 표시합니다.
 */
function displayReviews(reviews) {
    const reviewsContainer = document.getElementById('reviews-container');
    if (!reviewsContainer) return;
    
    if (reviews.length === 0) {
        showEmptyReviews();
        return;
    }
    
    // 리뷰가 있을 때는 empty-reviews 클래스 제거
    if (reviewsContainer) {
        reviewsContainer.classList.remove('empty-reviews');
    }
    
    let reviewsHtml = '';
    reviews.forEach(review => {
        console.log('댓글 정보:', review);
        const likeIconClass = review.is_liked ? 'bi-heart-fill' : 'bi-heart';
        const likeButtonClass = review.is_liked ? 'like-button active' : 'like-button';
        const deleteButtonStyle = review.can_delete ? '' : 'style="display: none;"';
        
        // 프로필 이미지 HTML 생성
        let profileImgHtml = '';
        let profileImgClass = 'profile-img';
        if (review.profile_picture_url) {
            console.log('프로필 이미지 URL:', review.profile_picture_url);
            profileImgHtml = `<img src="${review.profile_picture_url}" alt="Profile" onerror="this.style.display='none'; this.parentElement.classList.remove('has-image');">`;
            profileImgClass = 'profile-img has-image';
        } else {
            console.log('기본 프로필 이미지 사용');
            profileImgHtml = `<img src="/static/images/robot-icon.png" alt="Profile" onerror="this.style.display='none'; this.parentElement.classList.remove('has-image');">`;
            profileImgClass = 'profile-img has-image';
        }
        
        reviewsHtml += `
            <div class="review-box" data-review-id="${review.id}">
                <div class="review-header">
                    <div class="profile-box">
                        <div class="${profileImgClass}">
                            ${profileImgHtml}
                        </div>
                        <div class="user-info">
                            <div class="user-nikname">${review.user_nickname}</div>
                            <div>
                                <span class="upload-time">${review.created_at}</span>
                                <span class="review-delete-btn" ${deleteButtonStyle} onclick="deleteReview(${review.id})">
                                    <i class="bi bi-trash"></i>
                                </span>
                            </div>
                        </div>
                    </div>
                    <div class="${likeButtonClass}" onclick="toggleReviewLike(${review.id})">
                        <i class="bi ${likeIconClass}"></i>
                        <span class="like-count">${review.like_count}</span>
                    </div>
                </div>
                <div class="review-content">
                    ${review.content}
                </div>
            </div>
        `;
    });
    
    reviewsContainer.innerHTML = reviewsHtml;
    console.log(`${reviews.length}개의 댓글을 표시했습니다.`);
}

/**
 * 댓글 수를 업데이트합니다.
 */
function updateReviewCount(count) {
    const commentCountElement = document.querySelector('.comment-count');
    if (commentCountElement) {
        commentCountElement.textContent = `(${count})`;
        console.log(`댓글 수 업데이트: ${count}`);
    } else {
        console.error('댓글 수 요소를 찾을 수 없습니다.');
    }
}

/**
 * 댓글 로딩 상태를 표시합니다.
 */
function showReviewsLoading() {
    const reviewsContainer = document.getElementById('reviews-container');
    if (!reviewsContainer) return;
    
    // 로딩 상태에서도 중앙 정렬 클래스 추가
    reviewsContainer.classList.add('empty-reviews');
    
    reviewsContainer.innerHTML = `
        <div class="reviews-placeholder" style="text-align: center; padding: 20px; color: #666; font-size: 14px;">
            <i class="bi bi-chat-dots" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
            댓글을 불러오는 중...
        </div>
    `;
}

/**
 * 빈 댓글 상태를 표시합니다.
 */
function showEmptyReviews() {
    const reviewsContainer = document.getElementById('reviews-container');
    if (!reviewsContainer) return;
    
    // 리뷰가 없을 때 중앙 정렬을 위한 클래스 추가
    if (reviewsContainer) {
        reviewsContainer.classList.add('empty-reviews');
    }
    
    reviewsContainer.innerHTML = `
        <div class="reviews-placeholder" style="text-align: center; padding: 20px; color: #666; font-size: 14px;">
            <i class="bi bi-chat-dots" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
            아직 댓글이 없습니다.<br>
            첫 번째 댓글을 남겨보세요!
        </div>
    `;
}

/**
 * 댓글을 추가합니다.
 */
async function addReview() {
    const reviewInput = document.getElementById('reviewInput');
    const reviewSubmitBtn = document.getElementById('reviewSubmitBtn');
    
    if (!reviewInput || !reviewSubmitBtn) return;
    
    const content = reviewInput.value.trim();
    if (!content) {
        alert('댓글 내용을 입력해주세요.');
        return;
    }
    
    const currentCompanyName = getCurrentCompanyName();
    if (!currentCompanyName) {
        alert('주식 정보를 먼저 로드해주세요.');
        return;
    }
    
    // 주식 코드 가져오기 (회사명 대신 코드 사용)
    const stockSymbolElement = document.getElementById('stockSymbol');
    const stockCode = stockSymbolElement ? stockSymbolElement.textContent : null;
    
    if (!stockCode) {
        alert('주식 코드를 찾을 수 없습니다.');
        return;
    }
    
    // Yahoo Finance 코드에서 KRX 코드 추출 (예: 066570.KS -> 066570)
    const krxCode = stockCode.replace('.KS', '').replace('.KQ', '');
    
    // 버튼 비활성화
    reviewSubmitBtn.disabled = true;
    reviewSubmitBtn.innerHTML = '<i class="bi bi-hourglass-split"></i>';
    
    try {
        const response = await fetch('/jembot/api/reviews/add/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken()
            },
            credentials: 'same-origin',
            body: JSON.stringify({
                code: krxCode,
                content: content
            })
        });
        
        const data = await response.json();
        if (data.success) {
            // 입력 필드 초기화
            reviewInput.value = '';
            
            // 댓글 목록 새로고침
            await loadReviews();
            
            console.log('댓글이 성공적으로 추가되었습니다.');
        } else {
            alert(data.error || '댓글 등록에 실패했습니다.');
        }
    } catch (error) {
        console.error('댓글 추가 오류:', error);
        alert('서버와 통신 중 오류가 발생했습니다.');
    } finally {
        // 버튼 활성화
        reviewSubmitBtn.disabled = false;
        reviewSubmitBtn.innerHTML = '<i class="bi bi-send"></i>';
    }
}

/**
 * 댓글을 삭제합니다.
 */
async function deleteReview(reviewId) {
    if (!confirm('댓글을 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        const response = await fetch('/jembot/api/reviews/delete/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken()
            },
            credentials: 'same-origin',
            body: JSON.stringify({ review_id: reviewId })
        });
        
        const data = await response.json();
        if (data.success) {
            // 댓글 목록 새로고침
            await loadReviews();
            console.log('댓글이 성공적으로 삭제되었습니다.');
        } else {
            alert(data.error || '댓글 삭제에 실패했습니다.');
        }
    } catch (error) {
        console.error('댓글 삭제 오류:', error);
        alert('서버와 통신 중 오류가 발생했습니다.');
    }
}

/**
 * 댓글 좋아요를 토글합니다.
 */
async function toggleReviewLike(reviewId) {
    try {
        const response = await fetch('/jembot/api/reviews/like/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken()
            },
            credentials: 'same-origin',
            body: JSON.stringify({ review_id: reviewId })
        });
        
        const data = await response.json();
        if (data.success) {
            // 해당 댓글의 좋아요 버튼 업데이트
            const reviewBox = document.querySelector(`[data-review-id="${reviewId}"]`);
            if (reviewBox) {
                const likeButton = reviewBox.querySelector('.like-button');
                const likeIcon = likeButton.querySelector('i');
                const likeCount = likeButton.querySelector('.like-count');
                
                if (data.is_liked) {
                    likeButton.classList.add('active');
                    likeIcon.className = 'bi bi-heart-fill';
                } else {
                    likeButton.classList.remove('active');
                    likeIcon.className = 'bi bi-heart';
                }
                
                likeCount.textContent = data.like_count;
            }
            
            console.log(`댓글 좋아요 ${data.action}: ${reviewId}`);
        } else {
            alert(data.error || '좋아요 처리에 실패했습니다.');
        }
    } catch (error) {
        console.error('댓글 좋아요 토글 오류:', error);
        alert('서버와 통신 중 오류가 발생했습니다.');
    }
}

