from django.urls import path
from . import views

app_name = 'accounts'

urlpatterns = [
    # 홈(로그인) URL
    path('', views.home_view, name='home'),
    # 회원가입 URL
    path('signup/', views.signup_view, name='signup'),
    # 마이페이지 URL
    path('profile/', views.mypage_view, name='account_profile'),
] 