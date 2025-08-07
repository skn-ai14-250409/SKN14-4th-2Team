from django.urls import path
from . import views

app_name = 'app'

urlpatterns = [
    # 메인 페이지
    path('', views.chatbot, name='main'),  # name을 'main'으로 변경
    path('stock/', views.stock, name='stock'),
    
    # 챗봇 API
    path('api/chat/', views.chat_api, name='chat_api'),
    
    # 채팅 세션 관리
    path('api/sessions/', views.chat_sessions, name='chat_sessions'),
    path('api/sessions/create/', views.create_session, name='create_session'),
    path('api/sessions/<str:session_id>/history/', views.get_chat_history, name='get_chat_history'),
    path('api/sessions/<str:session_id>/delete/', views.delete_session, name='delete_session'),
    
    # 기존 주식 관련 API
    path('api/crawl-news/', views.crawl_naver_news, name='crawl_news'),
    path('api/get-stock-info/', views.get_stock_info, name='get_stock_info'),
    path('api/get-stock-info-by-code/', views.get_stock_info_by_code, name='get_stock_info_by_code'),
    path('get-stock-rag/', views.get_stock_rag, name='get_stock_rag'),
    
    # 즐겨찾기 관련 API
    path('api/favorites/add/', views.add_favorite, name='add_favorite'),
    path('api/favorites/remove/', views.remove_favorite, name='remove_favorite'),
    path('api/favorites/', views.get_favorites, name='get_favorites'),
    path('api/favorites/check/', views.check_favorite_status, name='check_favorite_status'),
    path('api/favorites/count/', views.get_stock_favorite_count, name='get_stock_favorite_count'),
    
    # 댓글 관련 API
    path('api/reviews/', views.get_stock_reviews, name='get_stock_reviews'),
    path('api/reviews/add/', views.add_stock_review, name='add_stock_review'),
    path('api/reviews/delete/', views.delete_stock_review, name='delete_stock_review'),
    path('api/reviews/like/', views.toggle_review_like, name='toggle_review_like'),
]
