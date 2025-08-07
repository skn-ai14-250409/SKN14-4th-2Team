// 즐겨찾기 페이지 JavaScript

document.addEventListener('DOMContentLoaded', function() {
    loadUserFavorites();
    
    // 다른 페이지에서 즐겨찾기 변경 시 실시간 업데이트를 위한 이벤트 리스너
    window.addEventListener('storage', function(e) {
        if (e.key === 'favoriteUpdated') {
            loadUserFavorites();
            localStorage.removeItem('favoriteUpdated');
        }
    });
    
    // 같은 페이지 내에서 즐겨찾기 변경 시 업데이트를 위한 이벤트 리스너
    window.addEventListener('favoriteChanged', function() {
        loadUserFavorites();
    });
});

// 즐겨찾기 목록 로드
function loadUserFavorites() {
    showLoading();
    
    fetch('/jembot/api/favorites/')
    .then(response => response.json())
    .then(data => {
        hideLoading();
        
        if (data.success) {
            if (data.count === 0) {
                showEmptyState();
            } else {
                displayFavorites(data.favorites);
            }
        } else {
            console.error('즐겨찾기 로드 오류:', data.error);
            alert('즐겨찾기를 불러오는 중 오류가 발생했습니다.');
        }
    })
    .catch(error => {
        hideLoading();
        console.error('즐겨찾기 로드 오류:', error);
        alert('즐겨찾기를 불러오는 중 오류가 발생했습니다.');
    });
}

// 로딩 상태 표시
function showLoading() {
    document.getElementById('favoritesLoading').style.display = 'flex';
    document.getElementById('favoritesEmpty').style.display = 'none';
    document.getElementById('favoritesGrid').innerHTML = '';
}

// 로딩 상태 숨김
function hideLoading() {
    document.getElementById('favoritesLoading').style.display = 'none';
}

// 빈 상태 표시
function showEmptyState() {
    document.getElementById('favoritesEmpty').style.display = 'flex';
    document.getElementById('favoritesGrid').style.display = 'none';
}

// 즐겨찾기 목록 표시
function displayFavorites(favorites) {
    // 빈 상태 숨김
    document.getElementById('favoritesEmpty').style.display = 'none';
    
    const grid = document.getElementById('favoritesGrid');
    grid.style.display = 'grid';
    grid.innerHTML = '';
    
    favorites.forEach(favorite => {
        const card = createFavoriteCard(favorite);
        grid.appendChild(card);
    });
}

// 즐겨찾기 카드 생성
function createFavoriteCard(favorite) {
    const card = document.createElement('div');
    card.className = 'favorite-card';
    card.setAttribute('data-stock-code', favorite.stock_code);
    
    card.innerHTML = `
        <div class="favorite-card-header">
            <div class="favorite-stock-info">
                <h3>${favorite.stock_name}</h3>
                <div class="favorite-stock-code">${favorite.stock_code}</div>
            </div>
            <div class="favorite-heart" onclick="removeFavorite('${favorite.stock_code}', this)">
                <i class="bi bi-heart-fill"></i>
            </div>
        </div>
        
        <div class="favorite-stats">
            <div class="favorite-likes">
                <i class="bi bi-heart"></i>
                <span>${favorite.total_likes}</span>
            </div>
            <div class="favorite-date">${favorite.created_at}</div>
        </div>
        
        <div class="favorite-actions">
            <a href="/jembot/stock/" class="btn-sm btn-outline" onclick="searchStock('${favorite.stock_code}')">
                <i class="bi bi-search"></i>
                주식 정보 보기
            </a>
        </div>
    `;
    
    return card;
}

// 즐겨찾기 제거
function removeFavorite(stockCode, element) {
    if (!confirm('이 주식을 즐겨찾기에서 제거하시겠습니까?')) {
        return;
    }
    
    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
    
    fetch('/jembot/api/stock-favorite/toggle/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken
        },
        body: JSON.stringify({
            stock_code: stockCode
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // 카드 제거 애니메이션
            const card = element.closest('.favorite-card');
            card.style.transform = 'translateX(-100%)';
            card.style.opacity = '0';
            
            setTimeout(() => {
                card.remove();
                
                // 남은 카드가 없으면 빈 상태 표시
                const remainingCards = document.querySelectorAll('.favorite-card');
                if (remainingCards.length === 0) {
                    showEmptyState();
                }
                
                // 다른 탭에서 열린 즐겨찾기 페이지에 변경사항 알림
                localStorage.setItem('favoriteUpdated', Date.now());
                
                // 현재 페이지에 변경사항 알림
                window.dispatchEvent(new CustomEvent('favoriteChanged'));
            }, 300);
            
        } else {
            alert('즐겨찾기 제거 중 오류가 발생했습니다.');
        }
    })
    .catch(error => {
        console.error('즐겨찾기 제거 오류:', error);
        alert('즐겨찾기 제거 중 오류가 발생했습니다.');
    });
}

// 주식 검색 (주식 페이지로 이동하면서 검색)
function searchStock(stockCode) {
    // 세션에 검색할 주식 코드 저장
    sessionStorage.setItem('searchStockCode', stockCode);
}