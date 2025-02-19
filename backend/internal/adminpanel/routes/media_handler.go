package routes

import (
	"backend/internal/adminpanel/models"
	"backend/internal/adminpanel/services/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"log"
	"net/http"
)

func DownloadMediaHandler(ctx *gin.Context) {
	// Отримуємо ID посту з параметрів запиту
	eventIdStr := ctx.Param("postId")

	if eventIdStr == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Event ID is required"})
		return
	}

	// Перевіряємо, чи ID посту є валідним UUID
	postId, err := uuid.Parse(eventIdStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Event ID format"})
		return
	}

	form, err := ctx.MultipartForm()
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse multipart form"})
		return
	}

	files := form.File["files"] // "files" — це ключ у формі, який містить файли
	if len(files) == 0 {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "No files uploaded"})
		return
	}
	var fileUrls []string
	// Завантажуємо кожен файл по черзі
	for _, fileHeader := range files {
		// Завантажуємо файл у Backblaze B2
		fileUrl, err := utils.UploadFile(ctx, fileHeader)
		if err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		fileUrls = append(fileUrls, fileUrl)

		// Створюємо об'єкт Media для збереження в базі даних
		media := models.Media{
			ContentId: postId,
			Url:       fileUrl,                               // URL завантаженого файлу
			Type:      fileHeader.Header.Get("Content-Type"), // Тип файлу
		}

		// Зберігаємо дані про файл в базі даних
		_, err = models.DownloadFiles(&media)
		if err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	}

	// Повертаємо успішну відповідь
	ctx.JSON(http.StatusCreated, fileUrls)
}

func GetAllMediaByBlogIdHandler(ctx *gin.Context) {
	// Отримуємо ID посту з параметрів запиту
	blogIdStr := ctx.Param("postId")

	if blogIdStr == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Blog ID is required"})
		return
	}

	// Перевіряємо, чи ID посту �� валідним UUID
	blogId, err := uuid.Parse(blogIdStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Blog ID format"})
		return
	}

	// Отримуємо всі медіафайли для даного блога
	media, err := models.GetAllMediaByBlogId(blogId)
	if err != nil {
		log.Println(err)
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	ctx.JSON(http.StatusCreated, media)
}

type DeleteMediaRequest struct {
	ImageUrl string `json:"imageUrl"`
}

func DeleteMediaHandler(ctx *gin.Context) {
	// Отримуємо ID посту з параметрів запиту
	mediaIdStr := ctx.Param("postId")
	var req DeleteMediaRequest

	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	if req.ImageUrl == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Image URL is required"})
		return
	}
	if mediaIdStr == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Media ID is required"})
		return
	}

	// Перевіряємо, чи ID посту �� валідним UUID
	mediaId, err := uuid.Parse(mediaIdStr)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Media ID format"})
		return
	}
	// Отримуємо список медіа за Blog ID
	mediaList, err := models.GetAllMediaByBlogId(mediaId)
	if err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "Media not found"})
		return
	}

	// Перевіряємо, чи існує зображення з таким URL
	var mediaToDelete *models.MediaPublic
	for _, item := range mediaList {
		if item.Url == req.ImageUrl {
			mediaToDelete = &item
			break
		}
	}

	if mediaToDelete == nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "Image not found"})
		return
	}

	// Видаляємо файл
	err = models.DeleteFiles(mediaToDelete.ID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{"message": "Media deleted successfully"})
}
