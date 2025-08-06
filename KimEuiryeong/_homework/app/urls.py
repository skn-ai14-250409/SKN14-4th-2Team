from django.urls import path
from . import views

app_name = 'app'

urlpatterns = [
    path('', views.chatbot, name='chatbot'),
    path('stock/', views.stock, name='stock'),
    path('api/crawl-news/', views.crawl_naver_news, name='crawl_news'),
    path('api/get-stock-info/', views.get_stock_info, name='get_stock_info'),
    path('api/chat/', views.chat_with_openai, name='chat_with_openai'),
    path('api/chat-sessions/', views.get_chat_sessions, name='get_chat_sessions'),
    path('api/chat-messages/<str:session_id>/', views.get_chat_messages, name='get_chat_messages'),
    path('api/chat-sessions/<str:session_id>/delete/', views.delete_chat_session, name='delete_chat_session'),
    path('get-stock-rag/', views.get_stock_rag, name='get_stock_rag'),
]
