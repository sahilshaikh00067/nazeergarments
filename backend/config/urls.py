from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse

from django.conf import settings
from django.conf.urls.static import static


def home(request):
    return JsonResponse({
        "success": True,
        "message": "Zazeer Garments Backend is Running!",
        "status": "Active"
    })


urlpatterns = [
    path('', home, name='home'),
    path('admin/', admin.site.urls),
    path('api/', include('store.urls')),
]


# Serve uploaded product images during development
if settings.DEBUG:
    urlpatterns += static(
        settings.MEDIA_URL,
        document_root=settings.MEDIA_ROOT
    )