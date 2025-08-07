from django.urls import path
from . import views

urlpatterns = [
    # 회원가입 URL
    path('signup/', views.signup_view, name='signup'),
    # 마이페이지 URL
    path('profile/', views.mypage_view, name='mypage'),
    # AJAX 업데이트 URL들
    path('update-email/', views.update_email, name='update_email'),
    path('update-password/', views.update_password, name='update_password'),
    path('update-nickname/', views.update_nickname, name='update_nickname'),
]
