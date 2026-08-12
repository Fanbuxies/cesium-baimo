package com.example.cesiumbaimo;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * 前端开发环境跨域配置。
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    /**
     * 只开放本地 Vite 页面访问建筑接口。
     *
     * @param registry CORS 注册器
     */
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(
                        "http://localhost:5173",
                        "http://127.0.0.1:5173",
                        // Windows 上 localhost 常优先解析到 IPv6，浏览器发出的
                        // Origin 会是 http://[::1]:5173，漏掉这条会被 CORS 拦掉
                        "http://[::1]:5173"
                )
                .allowedMethods("GET");
    }
}
