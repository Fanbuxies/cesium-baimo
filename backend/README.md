# 白模学习工程后端

## 启动

需要 Java 17 和 Maven。在 `backend/` 目录执行：

```bash
mvn spring-boot:run
```

服务端口为 `8080`。

## 接口验证

```bash
curl http://localhost:8080/api/building/WH420180003
curl "http://localhost:8080/api/buildings/theme?field=use"
curl "http://localhost:8080/api/buildings/theme?field=year"
curl -i "http://localhost:8080/api/buildings/theme?field=xxx"
```

最后一个请求应返回 HTTP 400。
