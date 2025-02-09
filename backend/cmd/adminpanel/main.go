package main

import (
	"backend/internal/adminpanel/routes"
	"fmt"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"net/http"
	"os"
	"strings"
)

func main() {

	port := os.Getenv("APP_RUN_PORT")
	fmt.Println(port)
	gin.SetMode(gin.ReleaseMode)

	r := gin.New()
	r.Use(redirectFromWWW())
	r.Use(CustomCors())

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "Healthy",
		})
	})

	//Auth
	r.POST("/api/v1/login/access-token", routes.LoginHandler)

	//Users
	r.POST("/api/v1/users/", routes.CreateUser)

	r.Use(routes.AuthMiddleware())
	r.GET("/api/v1/users/me", routes.ReadUserMe)

	if err := r.Run(port); err != nil {
		fmt.Println("Failed to run server", err)
		os.Exit(1)
	}
	fmt.Printf("Server started on port %s\n", port)

}

func redirectFromWWW() gin.HandlerFunc {
	return func(c *gin.Context) {
		if strings.HasPrefix(c.Request.Host, "www.") {
			newHost := "https://" + c.Request.Host[len("www."):]
			c.Redirect(http.StatusMovedPermanently, newHost+c.Request.URL.String())
			return
		}
		c.Next()
	}
}

func CustomCors() gin.HandlerFunc {
	config := cors.New(
		cors.Config{
			AllowOrigins:     []string{"http://localhost:3000", "http://localhost:5173"},
			AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "PATCH"},
			AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
			ExposeHeaders:    []string{"Content-Length"},
			AllowCredentials: true,
			MaxAge:           12 * 60 * 60, // 12 hours
		})
	return config
}
