package com.example.cesiumbaimo;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 提供建筑详情和专题字段接口。
 */
@RestController
@RequestMapping("/api")
public class BuildingController {

    private static final String OWNER = "东湖高新管委会";
    private static final Map<String, Building> BUILDINGS = createBuildings();

    /**
     * 按业务编码查询建筑详情。
     *
     * @param code 建筑业务编码
     * @return 建筑详情或未找到提示
     */
    @GetMapping("/building/{code}")
    public ResponseEntity<?> getBuilding(@PathVariable String code) {
        Building building = BUILDINGS.get(code);
        if (building == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "未找到编码 " + code));
        }
        return ResponseEntity.ok(building);
    }

    /**
     * 查询用途或年份专题数据。
     *
     * @param field 专题字段，仅支持 use 和 year
     * @return code 到专题值的映射或参数错误提示
     */
    @GetMapping("/buildings/theme")
    public ResponseEntity<?> getTheme(@RequestParam String field) {
        if (!"use".equals(field) && !"year".equals(field)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "field 仅支持 use 或 year"));
        }

        Map<String, Object> result = new LinkedHashMap<>();
        BUILDINGS.forEach((code, building) -> result.put(
                code,
                "use".equals(field) ? building.use() : building.year()
        ));
        return ResponseEntity.ok(result);
    }

    private static Map<String, Building> createBuildings() {
        Map<String, Building> buildings = new LinkedHashMap<>();
        buildings.put("WH420180001", new Building("WH420180001", "光谷科创中心A座", OWNER, "办公", 2008, 12));
        buildings.put("WH420180002", new Building("WH420180002", "光谷公寓1栋", OWNER, "住宅", 2012, 86));
        buildings.put("WH420180003", new Building("WH420180003", "光谷商务中心", OWNER, "商业", 2015, 24));
        buildings.put("WH420180004", new Building("WH420180004", "关山产业园1号楼", OWNER, "办公", 2020, 18));
        buildings.put("WH420180005", new Building("WH420180005", "光谷社区服务中心", OWNER, "公共服务", 2010, 7));
        buildings.put("WH420180006", new Building("WH420180006", "关山学校教学楼", OWNER, "教育", 2006, 9));
        buildings.put("WH420180007", new Building("WH420180007", "光谷医疗中心", OWNER, "医疗", 2018, 16));
        buildings.put("WH420180008", new Building("WH420180008", "未来城办公楼", OWNER, "办公", 2016, 22));
        buildings.put("WH420180009", new Building("WH420180009", "光谷公寓2栋", OWNER, "住宅", 2022, 132));
        buildings.put("WH420180010", new Building("WH420180010", "软件园商业楼", OWNER, "商业", 2014, 31));
        buildings.put("WH420180011", new Building("WH420180011", "公共服务中心", OWNER, "公共服务", 2009, 5));
        buildings.put("WH420180012", new Building("WH420180012", "光谷研发中心", OWNER, "办公", 2019, 20));
        return Collections.unmodifiableMap(buildings);
    }

    /**
     * 建筑业务属性。
     *
     * @param code 建筑业务编码
     * @param name 建筑名称
     * @param owner 权属单位
     * @param use 用途
     * @param year 竣工年份
     * @param unitCount 实有单位数
     */
    public record Building(
            String code,
            String name,
            String owner,
            String use,
            Integer year,
            Integer unitCount
    ) {
    }
}
