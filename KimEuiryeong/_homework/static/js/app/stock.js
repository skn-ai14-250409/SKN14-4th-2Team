// 즐겨찾기 목록에 있는 하트 활성화 
document.addEventListener('DOMContentLoaded', function() {
    // 페이지에 있는 모든 '.favorite-heart' 요소를 선택합니다.
    const favoriteHearts = document.querySelectorAll('.favorite-heart');
    
    // 각 하트 요소에 대해 클릭 이벤트를 추가합니다.
    favoriteHearts.forEach(heart => {
        heart.addEventListener('click', function() {
            this.classList.toggle('active');
        });
    });

    // --- 검색 기록 삭제 버튼 이벤트 ---
    const deleteButtons = document.querySelectorAll('.delete-btn');
    deleteButtons.forEach(button => {
        button.addEventListener('click', function() {
            // 클릭된 버튼의 가장 가까운 .favorite-list__box 부모를 찾아 제거합니다.
            this.closest('.favorite-list__box').remove();
        });
    });

    // --- 아코디언 기능 ---
    const accordionHeader = document.querySelector('.accordion-header');
    if (accordionHeader) {
        accordionHeader.addEventListener('click', function() {
            const accordion = this.closest('.accordion');
            accordion.classList.toggle('collapsed');
        });

        // 초기에 닫힌 상태로 시작하려면
        accordionHeader.closest('.accordion').classList.add('collapsed');
    }
});



