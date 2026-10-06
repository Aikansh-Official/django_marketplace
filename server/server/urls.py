"""
URL configuration for server project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.views.static import serve
from server.health import health_check, ping
from marketplace.media_security import secure_image_proxy_view

urlpatterns = [
    re_path(r'^$', ping, name='root-ping'),
    re_path(r'^ping/?$', ping, name='ping'),
    re_path(r'^api/ping/?$', ping, name='api-ping'),
    re_path(r'^health/?$', health_check, name='health-check'),
    re_path(r'^api/health/?$', health_check, name='api-health-check'),


    path('campxchange-admin/', admin.site.urls),
    path('api/auth/', include('users.urls')),
    path('api/marketplace/', include('marketplace.urls')),
    path('api/media/secure-image/', secure_image_proxy_view, name='secure-image-proxy'),
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
]


