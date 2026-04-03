UPDATE resources
SET
  title = CASE title
    WHEN 'SVG 鎵囧舰缁熻鍥?' THEN 'SVG 扇形统计图'
    WHEN '鍦嗙殑闈㈢Н鎺ㄥ' THEN '圆的面积推导'
    WHEN '闅忔満鐐瑰悕绁炲櫒' THEN '随机点名神器'
    WHEN '娌夋蹈寮忓€掕鏃?' THEN '沉浸式倒计时'
    WHEN '灏忕粍榫欒檸姒?' THEN '小组龙虎榜'
    ELSE title
  END,
  category = CASE category
    WHEN '缁熻涓庢鐜?' THEN '统计与概率'
    WHEN '鍥惧舰涓庡嚑浣?' THEN '图形与几何'
    WHEN '鏁颁笌浠ｆ暟' THEN '数与代数'
    WHEN '缁煎悎瀹炶返' THEN '综合实践'
    WHEN '寰' THEN '微课'
    WHEN '涔犻' THEN '习题'
    WHEN '鍏跺畠' THEN '其他'
    WHEN '璧嬭兘鏁欏' THEN '赋能教学'
    ELSE category
  END,
  grade = CASE grade
    WHEN '涓€骞寸骇' THEN '一年级'
    WHEN '浜屽勾绾?' THEN '二年级'
    WHEN '涓夊勾绾?' THEN '三年级'
    WHEN '鍥涘勾绾?' THEN '四年级'
    WHEN '浜斿勾绾?' THEN '五年级'
    WHEN '鍏勾绾?' THEN '六年级'
    WHEN '閫氱敤' THEN '通用'
    WHEN '鎷撳睍' THEN '拓展'
    ELSE grade
  END,
  description = CASE description
    WHEN '浜や簰寮忔墖褰㈢粺璁″浘鏁欏璧勬簮' THEN '交互式扇形统计图教学资源'
    WHEN '鍦嗙殑闈㈢Н鍏紡鎺ㄥ婕旂ず' THEN '圆的面积公式推导演示'
    WHEN '璇惧爞浜掑姩闅忔満鐐瑰悕宸ュ叿' THEN '课堂互动随机点名工具'
    WHEN '澶у睆娌夋蹈寮忚鍫傚€掕鏃跺伐鍏?' THEN '大屏沉浸式课堂倒计时工具'
    WHEN '灏忕粍绉垎姒滀笌璇惧爞绔炶禌宸ュ叿' THEN '小组积分榜与课堂竞赛工具'
    ELSE description
  END;

UPDATE teaching_resources
SET
  title = CASE title
    WHEN '鏁板璇剧▼鏍囧噯' THEN '数学课程标准'
    WHEN '璇剧▼瀹炴柦鏂规' THEN '课程实施方案'
    ELSE title
  END,
  description = CASE description
    WHEN '鏈湴闈欐€佺ず渚嬭祫婧愶紝鍙綔涓洪儴缃插墠鍗犱綅鍐呭銆?' THEN '本地静态示例资源，可作为部署前占位内容。'
    ELSE description
  END;
