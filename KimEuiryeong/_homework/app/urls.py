from django.urls import path
from . import views

app_name = 'app'

urlpatterns = [
    path('', views.chatbot, name='chatbot'),
    path('stock/', views.stock, name='stock'),
    path('favorites/', views.favorites, name='favorites'),
    
    path('api/crawl-news/', views.crawl_naver_news, name='crawl_news'),
    path('api/get-stock-info/', views.get_stock_info, name='get_stock_info'),
    path('api/chat/', views.chat_with_openai, name='chat_with_openai'),
    path('api/chat-sessions/', views.get_chat_sessions, name='get_chat_sessions'),
    path('api/chat-messages/<str:session_id>/', views.get_chat_messages, name='get_chat_messages'),
    path('api/chat-sessions/<str:session_id>/delete/', views.delete_chat_session, name='delete_chat_session'),
    path('get-stock-rag/', views.get_stock_rag, name='get_stock_rag'),
    # 주식 댓글 관련 URL
    path('api/stock-reviews/', views.add_stock_review, name='add_stock_review'),
    path('api/stock-reviews/<str:stock_code>/', views.get_stock_reviews, name='get_stock_reviews'),
    path('api/stock-reviews/delete/<int:review_id>/', views.delete_stock_review, name='delete_stock_review'),
    # 주식 좋아요 관련 URL
    path('api/stock-favorite/toggle/', views.toggle_stock_favorite, name='toggle_stock_favorite'),
    path('api/stock-favorite/<str:stock_code>/', views.get_stock_favorite_status, name='get_stock_favorite_status'),
    # 즐겨찾기 목록 관련 URL
    path('api/favorites/', views.get_user_favorites, name='get_user_favorites'),
]
