document.addEventListener('DOMContentLoaded', function() {
    console.log("stock.js: DOMContentLoaded - 스크립트 실행 시작");
    
    // --- URL 파라미터에서 검색어 확인 및 자동 검색 ---
    checkUrlParametersAndAutoSearch();

    // --- 즐겨찾기 하트 클릭 이벤트 ---
    const favoriteHearts = document.querySelectorAll('.favorite-heart');
    console.log(`stock.js: 즐겨찾기 하트 ${favoriteHearts.length}개를 찾았습니다.`);
    favoriteHearts.forEach((heart, index) => {
        heart.addEventListener('click', function() {
            console.log(`stock.js: 즐겨찾기 하트 #${index + 1} 클릭됨`);
            const heartIcon = this.querySelector('i');
            const likeCount = this.querySelector('.like-count');
            const currentCount = parseInt(likeCount.textContent);

            if (this.classList.contains('active')) {
                // 좋아요 취소 - 즐겨찾기에서 삭제
                console.log("stock.js: 즐겨찾기에서 항목을 삭제합니다.");
                const itemToRemove = this.closest('.favorite-list__box');
                if (itemToRemove) {
                    itemToRemove.remove();
                }
            } else {
                // 좋아요 추가 (즐겨찾기에 추가된 상태)
                this.classList.add('active');
                heartIcon.classList.remove('bi-heart');
                heartIcon.classList.add('bi-heart-fill');
                likeCount.textContent = currentCount + 1;
            }
        });
    });

    // --- 검색 기록 삭제 버튼 이벤트 ---
    const deleteButtons = document.querySelectorAll('.delete-btn');
    console.log(`stock.js: 삭제 버튼 ${deleteButtons.length}개를 찾았습니다.`);
    deleteButtons.forEach((button, index) => {
        button.addEventListener('click', function(event) {
            console.log(`stock.js: 삭제 버튼 #${index + 1} 클릭됨`);
            const itemToRemove = this.closest('.history-list__box');
            if (itemToRemove) {
                console.log("stock.js: 삭제할 항목을 찾았습니다. 제거합니다.", itemToRemove);
                itemToRemove.remove();
            } else {
                console.error("stock.js: 오류! 삭제할 '.history-list__box' 항목을 찾지 못했습니다.");
            }
        });
    });

    // --- 아코디언 기능 ---
    const accordionHeader = document.querySelector('.accordion-header');
    if (accordionHeader) {
        console.log("stock.js: 아코디언 헤더를 찾았습니다.");
        accordionHeader.addEventListener('click', function() {
            console.log("stock.js: 아코디언 헤더 클릭됨");
            const accordion = this.closest('.accordion');
            accordion.classList.toggle('collapsed');
        });

        // 초기에 닫힌 상태로 시작하려면
        accordionHeader.closest('.accordion').classList.add('collapsed');
    } else {
        console.log("stock.js: 아코디언 헤더를 찾지 못했습니다.");
    }

    // --- 댓글 좋아요 버튼 이벤트 ---
    const likeButtons = document.querySelectorAll('.like-button');
    console.log(`stock.js: 좋아요 버튼 ${likeButtons.length}개를 찾았습니다.`);
    likeButtons.forEach((button, index) => {
        button.addEventListener('click', function() {
            console.log(`stock.js: 좋아요 버튼 #${index + 1} 클릭됨`);
            const heartIcon = this.querySelector('i');
            const likeCount = this.querySelector('.like-count');
            const currentCount = parseInt(likeCount.textContent);

            if (this.classList.contains('active')) {
                // 좋아요 취소
                this.classList.remove('active');
                heartIcon.classList.remove('bi-heart-fill');
                heartIcon.classList.add('bi-heart');
                likeCount.textContent = currentCount - 1;
            } else {
                // 좋아요 추가
                this.classList.add('active');
                heartIcon.classList.remove('bi-heart');
                heartIcon.classList.add('bi-heart-fill');
                likeCount.textContent = currentCount + 1;
            }
        });
    });

    // --- 시간 계산 함수 ---
    function formatTimeAgo(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) {
            return '방금전';
        } else if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            return `${minutes}분전`;
        } else if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return `${hours}시간전`;
        } else {
            const days = Math.floor(diffInSeconds / 86400);
            return `${days}일전`;
        }
    }

    // --- 댓글 시간 업데이트 함수 ---
    function updateCommentTimes() {
        const timeElements = document.querySelectorAll('.upload-time');
        timeElements.forEach(element => {
            const timeText = element.textContent;
            if (timeText.includes('분전') || timeText.includes('시간전') || timeText.includes('일전')) {
                // 이미 포맷된 시간이면 건너뛰기
                return;
            }

            // 예시: "2024-01-15 14:30" 형태의 시간을 상대 시간으로 변환
            const date = new Date(timeText);
            if (!isNaN(date.getTime())) {
                element.textContent = formatTimeAgo(date);
            }
        });
    }

    // 페이지 로드 시 댓글 시간 업데이트
    updateCommentTimes();

    // --- 주가 차트 기간 선택 버튼 이벤트 ---
    const periodButtons = document.querySelectorAll('.period-button');
    console.log(`stock.js: 차트 기간 버튼 ${periodButtons.length}개를 찾았습니다.`);
    periodButtons.forEach((button, index) => {
        button.addEventListener('click', function() {
            console.log(`stock.js: 차트 기간 버튼 #${index + 1} 클릭됨`);
            console.log(`stock.js: 버튼 텍스트: "${this.textContent}"`);

            // 모든 버튼에서 'active' 클래스 제거
            periodButtons.forEach(btn => btn.classList.remove('active'));

            // 클릭된 버튼에 'active' 클래스 추가
            this.classList.add('active');

            // API에서 실제 데이터 가져오기
            const period = this.textContent;
            console.log(`stock.js: 선택된 기간: ${period}`);

            // 현재 검색된 회사명 가져오기
            const currentCompanyName = getCurrentCompanyName();
            console.log(`stock.js: 현재 회사명: ${currentCompanyName}`);

            // 실제 차트 데이터 업데이트
            if (currentCompanyName) {
                fetchStockData(currentCompanyName, period, loading=false);
            } else {
                console.log(`stock.js: 현재 검색된 회사가 없음`);
            }
        });
    });

    // --- 현재 검색된 회사명 가져오기 ---
    function getCurrentCompanyName() {
        // 마지막으로 검색된 회사명을 저장하는 전역 변수 사용
        if (window.lastSearchedCompany) {
            return window.lastSearchedCompany;
        }

        // fallback: companyName 요소에서 가져오기
        const companyNameElement = document.getElementById('companyName');
        if (companyNameElement && companyNameElement.textContent && companyNameElement.textContent !== '--') {
            return companyNameElement.textContent;
        }
        return null;
    }

    // --- 차트 업데이트 함수 ---
    function updateStockChart(period) {
        console.log(`stock.js: ${period} 기간 차트 업데이트 중...`);

        // 기존 차트가 있다면 제거
        if (window.stockChart) {
            window.stockChart.destroy();
        }

        // API에서 실제 데이터 가져오기
        const currentCompanyName = getCurrentCompanyName();
        if (currentCompanyName) {
            fetchStockData(currentCompanyName, period);
        }
    }

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

    function hideLoadingMessage() {
    document.getElementById("loadingMessage").style.display = "none";
}

    // --- API에서 주식 데이터 가져오기 ---
    function fetchStockData(companyName, period, loading=true) {
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

        if (loading){
        showLoadingMessage();}

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
                    showStockInfo(); // 검색 결과 표시
                    updateStockUI(data);
                    updateStockChart(data.chartData);
                } catch (error) {
                    console.error('UI/차트 업데이트 오류:', error);
                    showDefaultChart();
                }
            } else {
                console.error('API 오류:', data.error);
                // 최초 검색 시에만 검색 제안 표시 (기간 버튼 클릭 시에는 제외)
                if (period === '1일') {
                    if (data.suggestions && data.suggestions.length > 0) {
                        showSuggestions(data.suggestions);
                        showHeaderSuggestions(data.suggestions);
                    } else {
                        hideSuggestions();
                        hideHeaderSuggestions();
                    }
                } else {
                    // 기간 버튼 클릭 시에는 검색 제안을 표시하지 않음
                    hideSuggestions();
                    hideHeaderSuggestions();
                }
                showDefaultChart();
            }
        })
        .catch(error => {
            console.error('API 호출 오류:', error);
            // 오류 시 기본 차트 표시
            showDefaultChart();
        })
        .finally(()=>{
            hideLoadingMessage();
            });
    }



    // --- 주식 UI 업데이트 ---
    function updateStockUI(data) {
        console.log('stock.js: UI 업데이트 시작 - 데이터:', data);

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


    }

    // --- 실제 차트 데이터로 차트 업데이트 ---
    function updateStockChart(chartData) {
        console.log(`stock.js: 차트 업데이트 시작 - 데이터:`, chartData);

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

    // --- 기본 차트 표시 (API 오류 시) ---
    function showDefaultChart() {
        const sampleData = {
            labels: ['오전 10:00', '오전 11:00', '오후 12:00', '오후 1:00', '오후 2:00', '오후 3:00'],
            data: [72000, 72500, 73000, 72800, 73200, 73500]
        };
        updateStockChart(sampleData);
    }

    // --- CSRF 토큰 가져오기 ---
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

    // 페이지 로드 시 초기 상태 표시
    showEmptyState();

    // --- 헤더 검색 기능 ---
    const headerSearchInput = document.getElementById('headerStockSearchInput');
    const headerSearchBtn = document.getElementById('headerStockSearchBtn');
    const headerSearch = document.getElementById('headerSearch');

    // 주식 페이지에서 헤더 검색창 표시
    if (headerSearch) {
        headerSearch.style.display = 'block';
    }

    if (headerSearchInput && headerSearchBtn) {
        // 검색 버튼 클릭 이벤트
        headerSearchBtn.addEventListener('click', function() {
            const searchTerm = headerSearchInput.value.trim();
            if (searchTerm) {
                console.log(`stock.js: 헤더 검색어 "${searchTerm}"로 주식 검색 시작`);
                fetchStockData(searchTerm, '1일');
                rag(searchTerm)
            }
        });

        // Enter 키 이벤트
        headerSearchInput.addEventListener('keydown', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault(); // 기본 동작 방지
                const searchTerm = headerSearchInput.value.trim();
                if (searchTerm) {
                    console.log(`stock.js: 헤더 Enter 키로 검색어 "${searchTerm}" 검색`);
                    hideHeaderSuggestions(); // 제안 목록 숨기기
                    fetchStockData(searchTerm, '1일');
                    rag(searchTerm)
                }
            }
        });

        // 포커스 아웃 이벤트 (제안 숨기기)
        headerSearchInput.addEventListener('blur', function() {
            setTimeout(() => {
                hideHeaderSuggestions();
            }, 200); // 클릭 이벤트가 먼저 실행되도록 지연
        });
    }

    // 즐겨찾기 목록에서 선택하면 주식 정보 조회해서 로딩하도록 이벤트 리스너 등록
    document.addEventListener("click", function (e) {
        const box = e.target.closest(".favorite-list__box");
        // 하트 누르면 따로 작동 안하도록 처리
        if (!box || e.target.closest(".favorite-heart")) return;

        const title = box.querySelector(".favorite-list__title")?.textContent.trim();
        if (title) {
            fetchStockData(title, '1일');
            rag(title)
        }
    });

    function rag(title) {
        const rag_result = document.querySelector(".jembot-summary-item")
        rag_result.textContent = '분석중입니다...'
        fetch('/jembot/get-stock-rag/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({
                title: title
            })
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
    };

    // 마크다운을 HTML로 변환하는 함수
    function convertMarkdownToHtml(markdown) {
        if (!markdown) return '';
        
        let html = markdown
            // 제목 변환
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            
            // 강조 변환
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            
            // 리스트 변환
            .replace(/^\d+\.\s+(.*$)/gim, '<li>$1</li>')
            .replace(/^[-*]\s+(.*$)/gim, '<li>$1</li>')
            
            // 단락 변환
            .replace(/\n\n/g, '</p><p>')
            .replace(/^(?!<[h|u|o]|<li>)(.*$)/gim, '<p>$1</p>')
            
            // 리스트 래핑
            .replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>')
            
            // 정리
            .replace(/<p><\/p>/g, '')
            .replace(/<p>(<h[1-3]>.*<\/h[1-3]>)<\/p>/g, '$1')
            .replace(/<p>(<ul>.*<\/ul>)<\/p>/g, '$1');
        
        return html;
    }

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

                // 두 검색창 모두에 값 설정
                const headerSearchInput = document.getElementById('headerStockSearchInput');
                const stockSearchInput = document.getElementById('stockSearchInput');

                if (headerSearchInput) {
                    headerSearchInput.value = stock.name;
                    console.log(`headerSearchInput에 값 설정: ${stock.name}`);
                }
                if (stockSearchInput) {
                    stockSearchInput.value = stock.name;
                    console.log(`stockSearchInput에 값 설정: ${stock.name}`);
                }

                // 검색 제안들 숨기기
                hideSuggestions();
                hideHeaderSuggestions();

                console.log(`관련 종목 검색 실행: ${stock.name}`);
                fetchStockData(stock.name, '1일');
                rag(stock.name);
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

    showRelatedStocks()


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

    if (emptyState) emptyState.style.display = 'none';
    if (stockInfoDisplay) stockInfoDisplay.style.display = 'flex';
    if (stockChartContainer) stockChartContainer.style.display = 'block';
    if (periodSelector) periodSelector.style.display = 'flex';
    if (chartDetails) chartDetails.style.display = 'flex';
    if (jembotSummaryContainer) jembotSummaryContainer.style.display = 'block';
}

// --- 검색 제안 표시 ---
function showSuggestions(suggestions) {
    const suggestionsContainer = document.getElementById('searchSuggestions');
    const suggestionsList = document.getElementById('suggestionsList');

    console.log(`검색 제안 표시: ${suggestions.length}개`);
    console.log(`검색 제안 목록:`, suggestions);

    if (suggestionsContainer && suggestionsList && suggestions && suggestions.length > 0) {
        suggestionsList.innerHTML = '';

        suggestions.forEach(company => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.textContent = company;
            item.addEventListener('click', function() {
                console.log(`검색 제안 클릭: ${company}`);

                const stockSearchInput = document.getElementById('stockSearchInput');
                const headerSearchInput = document.getElementById('headerStockSearchInput');

                // 두 검색창 모두에 값 설정
                if (stockSearchInput) {
                    stockSearchInput.value = company;
                    console.log(`stockSearchInput에 값 설정: ${company}`);
                }
                if (headerSearchInput) {
                    headerSearchInput.value = company;
                    console.log(`headerSearchInput에 값 설정: ${company}`);
                }

                hideSuggestions();
                hideHeaderSuggestions();
                console.log(`검색 실행: ${company}`);
                fetchStockData(company, '1일');
            });
            suggestionsList.appendChild(item);
        });

        suggestionsContainer.style.display = 'block';
    }
}

// --- 검색 제안 숨기기 ---
function hideSuggestions() {
    const suggestionsContainer = document.getElementById('searchSuggestions');
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

                // 두 검색창 모두에 값 설정
                const headerSearchInput = document.getElementById('headerStockSearchInput');
                const stockSearchInput = document.getElementById('stockSearchInput');

                if (headerSearchInput) {
                    headerSearchInput.value = stock.name;
                    console.log(`headerSearchInput에 값 설정: ${stock.name}`);
                }
                if (stockSearchInput) {
                    stockSearchInput.value = stock.name;
                    console.log(`stockSearchInput에 값 설정: ${stock.name}`);
                }

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

